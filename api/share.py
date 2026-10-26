"""Shared edit links for CAS and OPS — a Vercel Python function.

One project per link. Anyone holding the link can open it, edit it and see who changed
what. There is no login: the link IS the key, so treat it like a document shared with
"anyone with the link can edit". Setup: docs/share-links-setup.md.

Storage is Upstash Redis over its REST API (Vercel Marketplace). The function reads the
store's address and token from the environment — KV_REST_API_URL / KV_REST_API_TOKEN, or
UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN. Nothing secret lives in this file.
SHARE_DEV=1 swaps in an in-memory store for tools/share-dev/serve.py.

Keys, all under sh:<id>:
  meta   {app, name, by, created}
  state  the project state, photos left out
  rev    a number that goes up by one on every save
  imgs   hash: photo slot id -> {"h": hash, "n": parts}
  img:<hash>:<i>   one ~0.9 MB part of a photo's stored record (photos are split because
                   a Vercel function takes about 4.5 MB per request)
  log    list of change entries, newest last, capped at LOG_MAX

AD SET REVIEWS (CAS, 2026-10-26): every project of one campaign — each market x audience x
language — under one record (`rs:<rid>`) and three role links (`rvt:<token>`). See the
"ad set reviews" section below for the keys and the rules.

Every request is /api/share?op=...  (create, part, save, get, rev, sync, chunk; for ad sets
rsmake, rsadd, rsget, rsstep, rsset, rsinfo).
"""
import json
import os
import random
import string
import threading
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler

TTL = 180 * 86400          # a link nobody opens or edits for this long expires
LOG_MAX = 500
PART_MAX = 1_000_000       # one photo part, in characters
STATE_MAX = 3_500_000      # the project state, photos left out
APPS = ('provident-ad-studio', 'provident-smp-studio', 'provident-ad-sets')  # the last is CAS's shared Ad sets view
ID_CHARS = string.ascii_letters + string.digits


class Fail(Exception):
    def __init__(self, code, msg):
        super().__init__(msg)
        self.code, self.msg = code, msg


# ---------- the store ----------

class Upstash:
    def __init__(self, url, token):
        self.url, self.token = url.rstrip('/'), token

    def _post(self, path, body, raw=False):
        data = body if raw else json.dumps(body).encode()
        req = urllib.request.Request(self.url + path, data=data, method='POST',
                                     headers={'Authorization': 'Bearer ' + self.token,
                                              'Content-Type': 'text/plain' if raw else 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=25) as r:
                return json.loads(r.read() or b'null')
        except urllib.error.HTTPError as e:
            raise Fail(502, 'The share store refused the request (HTTP %d).' % e.code)
        except Exception as e:  # noqa: BLE001
            raise Fail(502, 'The share store did not answer (%s).' % e.__class__.__name__)

    def cmd(self, *args):
        out = self._post('', [str(a) for a in args])
        if isinstance(out, dict) and out.get('error'):
            raise Fail(502, 'Share store error: ' + str(out['error']))
        return out.get('result') if isinstance(out, dict) else None

    def pipe(self, cmds):
        out = self._post('/pipeline', [[str(a) for a in c] for c in cmds]) or []
        res = []
        for o in out:
            if isinstance(o, dict) and o.get('error'):
                raise Fail(502, 'Share store error: ' + str(o['error']))
            res.append(o.get('result') if isinstance(o, dict) else None)
        return res

    def set_raw(self, key, value, ttl):
        # POST /set/<key>?EX= with the value as the raw body: no JSON escaping on a big part
        path = '/set/' + urllib.parse.quote(key, safe='') + '?EX=' + str(ttl)
        out = self._post(path, value.encode(), raw=True)
        if isinstance(out, dict) and out.get('error'):
            raise Fail(502, 'Share store error: ' + str(out['error']))


class Memory:
    """SHARE_DEV only — the same commands, held in this process."""
    def __init__(self):
        self.d, self.lock = {}, threading.RLock()

    def cmd(self, op, *a):
        with self.lock:
            op = op.upper()
            if op == 'GET':
                v = self.d.get(a[0]); return v if isinstance(v, str) else None
            if op == 'SET':
                self.d[a[0]] = str(a[1]); return 'OK'
            if op in ('EXPIRE', 'PERSIST'):
                return 1
            if op == 'DEL':
                return 1 if self.d.pop(a[0], None) is not None else 0
            if op == 'EXISTS':
                return 1 if a[0] in self.d else 0
            if op == 'HGETALL':
                h = self.d.get(a[0]) or {}; out = []
                for k, v in h.items(): out += [k, v]
                return out
            if op == 'HSET':
                h = self.d.setdefault(a[0], {})
                for i in range(1, len(a), 2): h[a[i]] = str(a[i + 1])
                return 1
            if op == 'HDEL':
                h = self.d.get(a[0]) or {}
                for k in a[1:]: h.pop(k, None)
                return 1
            if op == 'LRANGE':
                l = self.d.get(a[0]) or []; s, e = int(a[1]), int(a[2])
                n = len(l); s = max(0, n + s if s < 0 else s); e = n + e if e < 0 else e
                return l[s:e + 1]
            if op == 'LLEN':
                return len(self.d.get(a[0]) or [])
            if op == 'RPUSH':
                l = self.d.setdefault(a[0], []); l.extend(str(x) for x in a[1:]); return len(l)
            if op == 'LTRIM':
                l = self.d.get(a[0]) or []; s = int(a[1]); n = len(l); s = max(0, n + s if s < 0 else s)
                self.d[a[0]] = l[s:]; return 'OK'
            raise Fail(500, 'dev store: ' + op)

    def pipe(self, cmds):
        return [self.cmd(*c) for c in cmds]

    def set_raw(self, key, value, ttl):
        self.cmd('SET', key, value)

    def save(self, k, base, state, entry, burst, slots, ttl):
        with self.lock:
            rev = int(self.d.get(k + 'rev') or 0)
            if base != rev:
                return [0, rev]
            rev += 1
            self.d[k + 'rev'] = str(rev)
            if state:
                self.d[k + 'state'] = state
            h = self.d.setdefault(k + 'imgs', {})
            for s, v in slots:
                if v: h[s] = v
                else: h.pop(s, None)
            if entry:
                e = entry[:-1] + ',"rev":' + str(rev) + '}'
                log = self.d.setdefault(k + 'log', [])
                if burst and log and ('"burst":"' + burst + '"') in log[-1]:
                    log[-1] = e
                else:
                    log.append(e)
                del log[:-LOG_MAX]
            return [1, rev]


# A save is one atomic step: check the client saw the latest revision, write the state,
# bump the revision, apply the photo map, and add (or, in the same burst of edits, replace)
# the log entry. KEYS: rev state imgs log rid. ARGV: base state entry burst ttl logmax, then
# slot/value pairs where an empty value removes the slot. A project in an ad set keeps its log.
SAVE_LUA = r"""
local rev = tonumber(redis.call('GET', KEYS[1]) or '0')
if tonumber(ARGV[1]) ~= rev then return {0, rev} end
rev = rev + 1
local ttl = tonumber(ARGV[5])
redis.call('SET', KEYS[1], rev, 'EX', ttl)
if ARGV[2] ~= '' then redis.call('SET', KEYS[2], ARGV[2], 'EX', ttl) else redis.call('EXPIRE', KEYS[2], ttl) end
local i = 7
while i < #ARGV do
  if ARGV[i + 1] == '' then redis.call('HDEL', KEYS[3], ARGV[i]) else redis.call('HSET', KEYS[3], ARGV[i], ARGV[i + 1]) end
  i = i + 2
end
redis.call('EXPIRE', KEYS[3], ttl)
if ARGV[3] ~= '' then
  local e = string.sub(ARGV[3], 1, -2) .. ',"rev":' .. rev .. '}'
  local last = redis.call('LINDEX', KEYS[4], -1)
  if ARGV[4] ~= '' and last and string.find(last, '"burst":"' .. ARGV[4] .. '"', 1, true) then
    redis.call('LSET', KEYS[4], -1, e)
  else
    redis.call('RPUSH', KEYS[4], e)
    redis.call('LTRIM', KEYS[4], -tonumber(ARGV[6]), -1)
  end
end
if redis.call('EXISTS', KEYS[5]) == 0 then redis.call('EXPIRE', KEYS[4], ttl) end
return {1, rev}
"""

_store = None


def env_end(*names):
    # Exact names first, then any variable ENDING in one: Vercel's Storage tab often adds a
    # prefix (STORAGE_KV_REST_API_URL, …). A read-only token is never picked.
    for n in names:
        if os.environ.get(n):
            return os.environ[n]
    for k, v in sorted(os.environ.items()):
        if v and 'READ_ONLY' not in k and any(k.endswith('_' + n) for n in names):
            return v
    return None


def store():
    global _store
    if _store is None:
        if os.environ.get('SHARE_DEV') == '1':
            _store = Memory()
        else:
            url = env_end('KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL')
            tok = env_end('KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN')
            if not url or not tok:
                # Names only, never values, so whoever sets it up can see what the deployment has.
                seen = sorted(k for k in os.environ if any(w in k for w in ('KV', 'REDIS', 'UPSTASH')))
                raise Fail(503, 'Shared links are not switched on for this site yet — the share store is not connected. See docs/share-links-setup.md.'
                           + (' Variables seen: ' + ', '.join(seen) + '.' if seen else ' No store variables reach this deployment.'))
            _store = Upstash(url, tok)
    return _store


def do_save(k, base, state, entry, burst, slots):
    s = store()
    if isinstance(s, Memory):
        return s.save(k, base, state, entry, burst, slots, TTL)
    args = ['EVAL', SAVE_LUA, 5, k + 'rev', k + 'state', k + 'imgs', k + 'log', k + 'rid',
            base, state or '', entry or '', burst or '', TTL, LOG_MAX]
    for sl, v in slots:
        args += [sl, v or '']
    return s.cmd(*args)


# ---------- the API ----------

def clean_id(v):
    v = str(v or '')
    if not (8 <= len(v) <= 16) or any(c not in ID_CHARS for c in v):
        raise Fail(400, 'That share link is not valid.')
    return v


def clean_slot(v):
    v = str(v or '')
    if not v or len(v) > 120 or any(c not in ID_CHARS + '-_' for c in v):
        raise Fail(400, 'Bad picture slot.')
    return v


def clean_hash(v):
    v = str(v or '')
    if not v or len(v) > 40 or any(c not in ID_CHARS for c in v):
        raise Fail(400, 'Bad picture hash.')
    return v


def who(v):
    v = ' '.join(str(v or '').split())[:60]
    return v or 'Someone'


def entry_json(by, changes, burst):
    if not isinstance(changes, list) or not changes:
        return ''
    out = []
    for c in changes[:60]:
        if not isinstance(c, dict):
            continue
        e = {}
        for f in ('kind', 'page', 'label', 'was', 'now', 'text'):
            if c.get(f) not in (None, ''):
                e[f] = str(c[f])[:400]
        if e:
            out.append(e)
    if not out:
        return ''
    return json.dumps({'by': who(by), 'at': int(time.time() * 1000), 'burst': str(burst or '')[:24], 'changes': out},
                      separators=(',', ':'))


def need(k):
    if not store().cmd('EXISTS', k + 'rev'):
        raise Fail(404, 'This shared link has expired or was never made.')


def imgs_of(raw):
    out = {}
    raw = raw or []
    for i in range(0, len(raw) - 1, 2):
        try:
            out[raw[i]] = json.loads(raw[i + 1])
        except Exception:  # noqa: BLE001
            pass
    return out


def logs_of(raw):
    out = []
    for e in raw or []:
        try:
            out.append(json.loads(e))
        except Exception:  # noqa: BLE001
            pass
    return out


# ---------- ad set reviews ----------
#
# A REVIEW is an AD SET: every project of one campaign (each market x audience x language) under
# one record and three links. `rs:<rid>` holds it and never expires — it is the record the
# designer's Review links archive keeps:
#   {rid, name, product, created, by, tok:{dd, ct, pm}, drive, eng_only:{"<market>|<aud>": true},
#    items:[{sid, market, aud, lang, added, by, design, copy}], hist}
# `rs:<rid>:log` (no expiry) is the ad set's own log: steps and projects added. Each project keeps
# its own share record and log (`sh:<sid>:*`); `sh:<sid>:rid` says which ad set it belongs to.
# `rvt:<token>` -> {rid, role} for the designer (dd), the content team (ct) and performance
# marketing (pm). A token's holder reaches a project's data only by naming it (`p=<sid>`) and only
# when it is in that ad set. A project's own id is still a full edit link: in an ad set it is the
# designer's link to that one project.
#
# Per item the designer marks the design done (on an ARB item: the Arabic laid out) and the
# content team approves the copy (on ARB: the translation). The studio derives each audience's
# Design > ENG copy check > Translation > Done from those; the server only stores them.

TOK_LEN = 16               # a role token; a project's own id and an ad set's id are 12
ROLES = ('dd', 'ct', 'pm')
HIST_MAX = 400
ITEMS_MAX = 40
PRODUCTS = {'residential': ('Family', 'Investor'), 'commercial': ('Investor', 'Hybrid')}
MARKETS = ('Local', 'International', 'International EUR')
LANGS = ('ENG', 'ARB')
STEP = {   # act -> (who may, field, done?, what the log says)
    'design-done': (('dd',), 'design', True, None),
    'design-open': (('dd',), 'design', False, None),
    'copy-done': (('ct',), 'copy', True, None),
    'copy-open': (('ct', 'dd'), 'copy', False, None),
}


def new_tok(n):
    return ''.join(random.SystemRandom().choice(ID_CHARS) for _ in range(n))


def read_json(key):
    v = store().cmd('GET', key)
    try:
        return json.loads(v) if v else None
    except Exception:  # noqa: BLE001
        return None


def put_rs(rs):
    store().cmd('SET', 'rs:' + rs['rid'], json.dumps(rs, separators=(',', ':')))


def item_label(it):
    parts = [it.get('market') or '', it.get('aud') or '', it.get('lang') or '']
    return ' · '.join(p for p in parts if p) or 'Project'


def rs_log(rid, by, changes):
    s = store()
    ent = entry_json(by, changes, '')
    if ent:
        s.pipe([['RPUSH', 'rs:' + rid + ':log', ent[:-1] + ',"rev":0}'], ['LTRIM', 'rs:' + rid + ':log', -LOG_MAX, -1]])


def migrate_old(sid):
    """A review made before ad sets (2026-10-26 morning) lived on one project as `sh:<sid>:rv`
    with tokens pointing at that project. It becomes an ad set of one, unlabelled; its two
    tokens keep working."""
    s = store()
    rid = s.cmd('GET', 'sh:' + sid + ':rid')
    if rid:
        return rid
    old = read_json('sh:' + sid + ':rv')
    if not old:
        return None
    rid = new_tok(12)
    tok = dict(old.get('tok') or {})
    tok['dd'] = new_tok(TOK_LEN)
    rs = {'rid': rid, 'name': old.get('name') or '', 'product': '', 'created': old.get('created') or int(time.time() * 1000),
          'by': old.get('by') or '', 'tok': tok, 'drive': old.get('drive') or '', 'eng_only': {},
          'items': [{'sid': sid, 'market': '', 'aud': '', 'lang': 'ENG', 'added': old.get('created'), 'by': old.get('by') or '',
                     'design': old.get('design'), 'copy': old.get('copy')}],
          'hist': old.get('hist') or []}
    cmds = [['SET', 'rvt:' + t, json.dumps({'rid': rid, 'role': r})] for r, t in tok.items() if t]
    cmds += [['SET', 'rs:' + rid, json.dumps(rs, separators=(',', ':'))], ['SET', 'sh:' + sid + ':rid', rid]]
    th = s.cmd('GET', 'sh:' + sid + ':thumb')
    if th:
        cmds.append(['SET', 'rs:' + rid + ':thumb', th])
    s.pipe(cmds)
    return rid


def resolve(raw, p=None):
    """(id, p) -> (project id or None, role, ad set or None).
    A token is an ad set link: the project is the one named by `p`, which must be in it. A
    project's own id is an edit link: 'dd' when the project is in an ad set, else None."""
    t = clean_id(raw)
    s = store()
    if len(t) == TOK_LEN:
        v = s.cmd('GET', 'rvt:' + t)
        if not v:
            raise Fail(404, 'This review link has expired or was never made.')
        d = json.loads(v)
        if d.get('sid') and not d.get('rid'):          # a token from before ad sets
            d = {'rid': migrate_old(clean_id(d['sid'])), 'role': d.get('role')}
        rs = read_json('rs:' + str(d.get('rid') or ''))
        if not rs or d.get('role') not in ROLES:
            raise Fail(404, 'This review link is not valid.')
        sid = None
        if p:
            sid = clean_id(p)
            if not any(it['sid'] == sid for it in rs['items']):
                raise Fail(404, 'That project is not in this ad set.')
        return sid, d['role'], rs
    rid = s.cmd('GET', 'sh:' + t + ':rid') or (migrate_old(t) if s.cmd('EXISTS', 'sh:' + t + ':rv') else None)
    rs = read_json('rs:' + rid) if rid else None
    return t, ('dd' if rs else None), rs


def rs_pub(rs, role):
    if not rs:
        return None
    out = {x: rs.get(x) for x in ('rid', 'name', 'product', 'created', 'by', 'drive', 'eng_only', 'items')}
    out['hist'] = (rs.get('hist') or [])[-60:]
    if role == 'dd':
        out['tok'] = rs.get('tok')
    return out


def clean_sum(d):
    out = {}
    for f in ('campaign', 'mode', 'updated', 'variants', 'sizes', 'comps', 'pid'):
        v = d.get(f)
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            out[f] = v
        elif isinstance(v, str):
            out[f] = v[:160]
        elif isinstance(v, list):
            out[f] = [str(x)[:40] for x in v[:12]]
    return out


def clean_labels(d, rs):
    product = str(rs.get('product') or d.get('product') or '').lower()
    market = str(d.get('market') or '')
    aud = str(d.get('aud') or '')
    lang = str(d.get('lang') or '')
    if market not in MARKETS:
        raise Fail(400, 'Choose a market.')
    if product in PRODUCTS and aud not in PRODUCTS[product]:
        raise Fail(400, 'Choose an audience.')
    if lang not in LANGS:
        raise Fail(400, 'Choose a language.')
    return market, aud, lang


def thumb_of(d):
    t = d.get('thumb')
    return t if isinstance(t, str) and t.startswith('data:image/') and len(t) < 120000 else None


def new_item(s, sid, market, aud, lang, by, rs):
    if any(it['sid'] == sid for it in rs['items']):
        raise Fail(400, 'This project is already in the ad set.')
    if any(it['market'] == market and it['aud'] == aud and it['lang'] == lang for it in rs['items']):
        raise Fail(400, market + ' · ' + aud + ' · ' + lang + ' is already in the ad set.')
    if len(rs['items']) >= ITEMS_MAX:
        raise Fail(400, 'An ad set holds up to %d projects.' % ITEMS_MAX)
    return {'sid': sid, 'market': market, 'aud': aud, 'lang': lang, 'added': int(time.time() * 1000), 'by': by, 'design': None, 'copy': None}


def project_ok(s, sid):
    k = 'sh:' + sid + ':'
    meta = read_json(k + 'meta')
    if not meta:
        raise Fail(404, 'This project is not shared yet.')
    if meta.get('app') != 'provident-ad-studio':
        raise Fail(400, 'Ad set reviews are for Campaign projects.')
    if s.cmd('GET', k + 'rid') or s.cmd('EXISTS', k + 'rv'):
        raise Fail(400, 'This project is already in an ad set review.')
    return meta


def rs_make(sid, d):
    """Start an ad set from a shared project: its labels, the ad set's name and product."""
    s = store()
    by = who(d.get('by'))
    product = str(d.get('product') or '').lower()
    if product not in PRODUCTS:
        raise Fail(400, 'Choose Residential or Commercial.')
    meta = project_ok(s, sid)
    rid = new_tok(12)
    rs = {'rid': rid, 'name': str(d.get('name') or meta.get('name') or 'Ad set')[:120], 'product': product,
          'created': int(time.time() * 1000), 'by': by, 'tok': {r: new_tok(TOK_LEN) for r in ROLES}, 'drive': '', 'eng_only': {},
          'items': [], 'hist': []}
    market, aud, lang = clean_labels(d, rs)
    it = new_item(s, sid, market, aud, lang, by, rs)
    rs['items'].append(it)
    rs['hist'].append({'act': 'start', 'by': by, 'at': it['added'], 'sid': sid})
    cmds = [['SET', 'rvt:' + t, json.dumps({'rid': rid, 'role': r})] for r, t in rs['tok'].items()]
    cmds += [['SET', 'rs:' + rid, json.dumps(rs, separators=(',', ':'))], ['SET', 'sh:' + sid + ':rid', rid],
             ['PERSIST', 'sh:' + sid + ':meta'], ['PERSIST', 'sh:' + sid + ':log']]
    if isinstance(d.get('sum'), dict):
        cmds.append(['SET', 'sh:' + sid + ':sum', json.dumps(clean_sum(d['sum']), separators=(',', ':'))])
    th = thumb_of(d)
    if th:
        cmds += [['SET', 'rs:' + rid + ':thumb', th], ['SET', 'sh:' + sid + ':thumb', th]]
    s.pipe(cmds)
    rs_log(rid, by, [{'kind': 'step', 'text': 'Started the ad set with ' + item_label(it)}])
    return ok({'rs': rs_pub(rs, 'dd')})


def rs_add(role, rs, d):
    """The designer adds a shared project to the ad set (a new audience, or the Arabic version)."""
    if role != 'dd':
        raise Fail(403, 'Only the designer adds projects to an ad set.')
    s = store()
    sid = clean_id(d.get('sid'))
    project_ok(s, sid)
    by = who(d.get('by'))
    market, aud, lang = clean_labels(d, rs)
    it = new_item(s, sid, market, aud, lang, by, rs)
    rs['items'].append(it)
    rs['hist'] = (rs.get('hist') or [])[-HIST_MAX + 1:] + [{'act': 'add', 'by': by, 'at': it['added'], 'sid': sid}]
    put_rs(rs)
    cmds = [['SET', 'sh:' + sid + ':rid', rs['rid']], ['PERSIST', 'sh:' + sid + ':meta'], ['PERSIST', 'sh:' + sid + ':log']]
    if isinstance(d.get('sum'), dict):
        cmds.append(['SET', 'sh:' + sid + ':sum', json.dumps(clean_sum(d['sum']), separators=(',', ':'))])
    th = thumb_of(d)
    if th:
        cmds.append(['SET', 'sh:' + sid + ':thumb', th])
    s.pipe(cmds)
    rs_log(rs['rid'], by, [{'kind': 'step', 'text': 'Added ' + item_label(it)}])
    return ok({'rs': rs_pub(rs, 'dd')})


def rs_step(sid, role, rs, d):
    act = str(d.get('act') or '')
    if act not in STEP:
        raise Fail(400, 'Unknown step.')
    if not rs:
        raise Fail(404, 'This project is not in an ad set review.')
    sid = clean_id(d.get('p')) if d.get('p') else sid
    it = next((x for x in rs['items'] if x['sid'] == sid), None)
    if not it:
        raise Fail(404, 'That project is not in this ad set.')
    may, field, done, _ = STEP[act]
    if role not in may:
        raise Fail(403, 'Your link cannot change that step.')
    by, now = who(d.get('by')), int(time.time() * 1000)
    it[field] = {'by': by, 'at': now} if done else None
    rs['hist'] = (rs.get('hist') or [])[-HIST_MAX + 1:] + [{'act': act, 'by': by, 'at': now, 'sid': sid}]
    put_rs(rs)
    arb = it.get('lang') == 'ARB'
    text = {('design', True): 'Arabic laid out, ready for the translation check' if arb else 'Marked the design done',
            ('design', False): 'Put the Arabic back in progress' if arb else 'Put the design back in progress',
            ('copy', True): 'Approved the translation' if arb else 'Approved the English copy',
            ('copy', False): 'Reopened the translation check' if arb else 'Reopened the copy check'}[(field, done)]
    rs_log(rs['rid'], by, [{'kind': 'step', 'page': item_label(it), 'text': text}])
    th = thumb_of(d)
    if th:
        store().pipe([['SET', 'sh:' + sid + ':thumb', th], ['SET', 'rs:' + rs['rid'] + ':thumb', th]])
    return ok({'rs': rs_pub(rs, role)})


def rs_set(role, rs, d):
    if not rs:
        raise Fail(404, 'This project is not in an ad set review.')
    if role != 'dd':
        raise Fail(403, 'Only the designer changes the ad set.')
    if 'drive' in d:
        rs['drive'] = str(d.get('drive') or '')[:400]
    if 'name' in d and str(d.get('name') or '').strip():
        rs['name'] = str(d['name']).strip()[:120]
    if isinstance(d.get('eng_only'), dict):
        eo = rs.setdefault('eng_only', {})
        for k, v in list(d['eng_only'].items())[:40]:
            k = str(k)[:80]
            if v:
                eo[k] = True
            else:
                eo.pop(k, None)
    if d.get('remove'):
        sid = clean_id(d['remove'])
        rs['items'] = [x for x in rs['items'] if x['sid'] != sid]
        store().cmd('DEL', 'sh:' + sid + ':rid')
    put_rs(rs)
    return ok({'rs': rs_pub(rs, role)})


def rs_get(role, rs, q):
    """An ad set and where each of its projects is: its revision and log count, so a client
    polls ONE request for all of them. full=1 adds the ad set's log and each project's summary."""
    s = store()
    items = rs['items']
    res = s.pipe([['GET', 'sh:' + it['sid'] + ':rev'] for it in items] + [['LLEN', 'sh:' + it['sid'] + ':log'] for it in items]) if items else []
    n = len(items)
    proj = {it['sid']: {'rev': int(res[i]) if res[i] is not None else None, 'n': int(res[n + i] or 0)} for i, it in enumerate(items)}
    out = {'role': role, 'rs': rs_pub(rs, role), 'proj': proj, 'ln': int(s.cmd('LLEN', 'rs:' + rs['rid'] + ':log') or 0)}
    if q.get('full') == '1':
        ln = out['ln']
        out['log'] = logs_of(s.cmd('LRANGE', 'rs:' + rs['rid'] + ':log', max(0, ln - 300), -1)) if ln else []
        if items:
            sums = s.pipe([['GET', 'sh:' + it['sid'] + ':sum'] for it in items] + [['GET', 'sh:' + it['sid'] + ':thumb'] for it in items])
            for i, it in enumerate(items):
                proj[it['sid']]['sum'] = json.loads(sums[i]) if sums[i] else {}
                proj[it['sid']]['thumb'] = sums[n + i] or ''
    return ok(out)


def rs_info(q):
    """The designer's archive: one summary per ad set, by its designer token or by any of its
    projects' own ids (which is how a review made before ad sets is found). Looking keeps every
    project alive for another TTL. One id with full=1 also returns the logs."""
    s = store()
    ids = [x for x in str(q.get('ids') or '').split(',') if x][:60]
    full = q.get('full') == '1' and len(ids) == 1
    out = []
    for raw in ids:
        try:
            sid, role, rs = resolve(raw)
        except Fail:
            out.append({'id': raw, 'gone': True})
            continue
        if role != 'dd' or not rs:
            out.append({'id': raw, 'gone': True})
            continue
        items = rs['items']
        e = {'id': raw, 'dd': rs['tok'].get('dd'), 'rs': rs_pub(rs, 'dd'), 'thumb': s.cmd('GET', 'rs:' + rs['rid'] + ':thumb') or ''}
        if items:
            live = s.pipe([['EXISTS', 'sh:' + it['sid'] + ':rev'] for it in items])
            e['live'] = {it['sid']: bool(live[i]) for i, it in enumerate(items)}
            s.pipe([['EXPIRE', 'sh:' + it['sid'] + ':' + x, TTL] for it in items if e['live'][it['sid']] for x in ('state', 'rev', 'imgs')] or [['GET', 'x']])
        if full:
            ln = int(s.cmd('LLEN', 'rs:' + rs['rid'] + ':log') or 0)
            e['log'] = logs_of(s.cmd('LRANGE', 'rs:' + rs['rid'] + ':log', max(0, ln - 300), -1)) if ln else []
            e['rs']['hist'] = rs.get('hist') or []
            plog, sums = [], {}
            for it in items:
                k = 'sh:' + it['sid'] + ':'
                n = int(s.cmd('LLEN', k + 'log') or 0)
                for x in logs_of(s.cmd('LRANGE', k + 'log', max(0, n - 100), -1) if n else []):
                    x['page'] = item_label(it)
                    plog.append(x)
                sm, th = s.pipe([['GET', k + 'sum'], ['GET', k + 'thumb']])
                sums[it['sid']] = {'sum': json.loads(sm) if sm else {}, 'thumb': th or ''}
            e['plog'] = plog
            e['proj'] = sums
        out.append(e)
    return ok({'items': out})


# Named route, not app: Vercel's Python runtime treats a module-level `app` as a WSGI/ASGI app.
def route(method, query, body):
    """(method, {query}, bytes) -> (status, content-type, bytes)"""
    q = {k: v[0] for k, v in urllib.parse.parse_qs(query).items()}
    op = q.get('op', '')
    try:
        if method == 'OPTIONS':
            return 204, 'text/plain', b''
        s = store()
        if method == 'POST' and op == 'create':
            d = json.loads(body or b'{}')
            if d.get('app') not in APPS:
                raise Fail(400, 'Unknown studio.')
            state = json.dumps(d.get('state') or {}, separators=(',', ':'))
            if len(state) > STATE_MAX:
                raise Fail(413, 'The project is too large to share.')
            sid = ''.join(random.SystemRandom().choice(ID_CHARS) for _ in range(12))
            k = 'sh:' + sid + ':'
            meta = json.dumps({'app': d['app'], 'name': str(d.get('name') or '')[:120], 'by': who(d.get('by')),
                               'created': int(time.time() * 1000)}, separators=(',', ':'))
            ent = entry_json(d.get('by'), [{'kind': 'note', 'text': 'Shared the project'}], '')
            ent = ent[:-1] + ',"rev":1}'
            s.pipe([['SET', k + 'meta', meta, 'EX', TTL], ['SET', k + 'state', state, 'EX', TTL],
                    ['SET', k + 'rev', 1, 'EX', TTL]])
            if isinstance(s, Memory):
                s.d.setdefault(k + 'log', []).append(ent)
            else:
                s.pipe([['RPUSH', k + 'log', ent], ['EXPIRE', k + 'log', TTL]])
            return ok({'id': sid, 'rev': 1})
        if method == 'GET' and op == 'rsinfo':
            return rs_info(q)
        sid, role, rs = resolve(q.get('id'), q.get('p'))
        if method == 'POST' and op == 'rsmake':
            if role is not None or not sid:
                raise Fail(403, 'Start an ad set from the project itself.')
            return rs_make(sid, json.loads(body or b'{}'))
        if op in ('rsget', 'rsadd', 'rsstep', 'rsset'):
            if not rs:
                raise Fail(404, 'This project is not in an ad set review.')
            if method == 'GET' and op == 'rsget':
                return rs_get(role, rs, q)
            d = json.loads(body or b'{}')
            if method == 'POST' and op == 'rsadd':
                return rs_add(role, rs, d)
            if method == 'POST' and op == 'rsstep':
                return rs_step(sid, role, rs, d)
            if method == 'POST' and op == 'rsset':
                return rs_set(role, rs, d)
        if not sid:
            raise Fail(400, 'Name the project (p=) — this is an ad set link.')
        k = 'sh:' + sid + ':'
        if method == 'POST' and op in ('part', 'save') and role == 'pm':
            raise Fail(403, 'This link is for viewing the ad sets — it cannot change the project.')
        pub = rs_pub(rs, role)
        if method == 'POST' and op == 'part':
            h, i, n = clean_hash(q.get('h')), int(q.get('i', '-1')), int(q.get('n', '0'))
            if not (0 <= i < n <= 400):
                raise Fail(400, 'Bad picture part.')
            txt = (body or b'').decode('utf-8', 'strict')
            if not txt or len(txt) > PART_MAX:
                raise Fail(413, 'That picture part is too large.')
            need(k)
            s.set_raw(k + 'img:' + h + ':' + str(i), txt, TTL)
            return ok({'ok': True})
        if method == 'POST' and op == 'save':
            d = json.loads(body or b'{}')
            state = ''
            if d.get('state') is not None:
                state = json.dumps(d['state'], separators=(',', ':'))
                if len(state) > STATE_MAX:
                    raise Fail(413, 'The project is too large to share.')
            slots = []
            for sl, v in (d.get('imgs') or {}).items():
                sl = clean_slot(sl)
                if v:
                    slots.append((sl, json.dumps({'h': clean_hash(v.get('h')), 'n': int(v.get('n') or 0)}, separators=(',', ':'))))
                else:
                    slots.append((sl, ''))
            need(k)
            r = do_save(k, int(d.get('base') or 0), state, entry_json(d.get('by'), d.get('changes'), d.get('burst')),
                        str(d.get('burst') or '')[:24], slots)
            if not r or int(r[0]) != 1:
                return 409, 'application/json', json.dumps({'error': 'stale', 'rev': int(r[1]) if r else 0}).encode()
            # an ad set's project keeps a small summary for the archive
            if rs and isinstance(d.get('sum'), dict):
                s.cmd('SET', k + 'sum', json.dumps(clean_sum(d['sum']), separators=(',', ':')))
            return ok({'rev': int(r[1])})
        if method == 'GET' and op == 'rev':
            rev, n = s.pipe([['GET', k + 'rev'], ['LLEN', k + 'log']])
            if rev is None:
                raise Fail(404, 'This shared link has expired or was never made.')
            return ok({'rev': int(rev), 'n': int(n or 0), 'role': role, 'rs': pub})
        if method == 'GET' and op == 'get':
            meta, state, rev, imgs, n = s.pipe([['GET', k + 'meta'], ['GET', k + 'state'], ['GET', k + 'rev'],
                                                 ['HGETALL', k + 'imgs'], ['LLEN', k + 'log']])
            if rev is None or state is None:
                raise Fail(404, 'This shared link has expired or was never made.')
            n = int(n or 0)
            log = s.cmd('LRANGE', k + 'log', max(0, n - 200), -1)
            # Opening the link counts as use: keep it alive for another TTL.
            s.pipe([['EXPIRE', k + x, TTL] for x in (('state', 'rev', 'imgs') if rs else ('meta', 'state', 'rev', 'imgs', 'log'))])
            return ok({'meta': json.loads(meta or '{}'), 'state': json.loads(state), 'rev': int(rev),
                       'imgs': imgs_of(imgs), 'log': logs_of(log), 'from': max(0, n - 200), 'n': n, 'role': role, 'rs': pub})
        if method == 'GET' and op == 'sync':
            # what the client needs after another tab saved: state, photo map, log from `from`
            state, rev, imgs, n = s.pipe([['GET', k + 'state'], ['GET', k + 'rev'], ['HGETALL', k + 'imgs'], ['LLEN', k + 'log']])
            if rev is None or state is None:
                raise Fail(404, 'This shared link has expired or was never made.')
            n, frm = int(n or 0), max(0, int(q.get('from', '0')))
            frm = min(frm, n)
            log = s.cmd('LRANGE', k + 'log', frm, -1) if frm < n else []
            return ok({'state': json.loads(state), 'rev': int(rev), 'imgs': imgs_of(imgs), 'log': logs_of(log), 'from': frm, 'n': n,
                       'role': role, 'rs': pub})
        if method == 'GET' and op == 'chunk':
            h, i = clean_hash(q.get('h')), int(q.get('i', '-1'))
            v = s.cmd('GET', k + 'img:' + h + ':' + str(i))
            if v is None:
                raise Fail(404, 'That picture is no longer stored.')
            return 200, 'text/plain; charset=utf-8', v.encode()
        raise Fail(404, 'Unknown request.')
    except Fail as e:
        return e.code, 'application/json', json.dumps({'error': e.msg}).encode()
    except (ValueError, TypeError) as e:
        return 400, 'application/json', json.dumps({'error': 'Bad request (%s).' % e.__class__.__name__}).encode()


def ok(d):
    return 200, 'application/json', json.dumps(d, separators=(',', ':')).encode()


CORS = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400'}


class handler(BaseHTTPRequestHandler):
    def _go(self, method):
        n = int(self.headers.get('Content-Length') or 0)
        body = self.rfile.read(n) if n else b''
        code, ctype, out = route(method, urllib.parse.urlsplit(self.path).query, body)
        self.send_response(code)
        for k2, v in CORS.items():
            self.send_header(k2, v)
        self.send_header('Content-Type', ctype)
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(out)))
        self.end_headers()
        self.wfile.write(out)

    def do_GET(self): self._go('GET')
    def do_POST(self): self._go('POST')
    def do_OPTIONS(self): self._go('OPTIONS')
    def log_message(self, *a): pass
