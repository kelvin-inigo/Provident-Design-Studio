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
  pv:<hash>        a small preview of that photo (~640px), kept for good

ONLY THE PHOTO PARTS EXPIRE (2026-10-27): meta, state, rev, imgs, log and every preview are
stored with no expiry; each `img:` part lasts TTL after the link was last opened. When the
parts are gone the link still opens on the previews, and `get` / `sync` flag that photo
(`gone`) so the studio can put the full photo back from a copy it holds (op=part again).

AD SET REVIEWS (CAS, 2026-10-26): every project of one campaign — each market x audience x
language — under one record (`rs:<rid>`) and three role links (`rvt:<token>`). See the
"ad set reviews" section below for the keys and the rules.

Every request is /api/share?op=...  (create, part, save, get, rev, sync, chunk; for ad sets
rsmake, rsadd, rsget, rsstep, rsset, rsinfo; pvput and pv for photo previews; adminlist and admindel for share-admin.html,
which need SHARE_ADMIN_KEY set in the deployment).
"""
import fnmatch
import hashlib
import hmac
import json
import os
import random
import string
import threading
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler

TTL = 60 * 86400           # a FULL-SIZE PHOTO nobody's link has opened for this long expires.
                           # The link itself — project, changelog, previews — never does (2026-10-27).
PV_MAX = 400_000           # one photo's preview record, in characters
LOG_MAX = 500
PART_MAX = 1_000_000       # one photo part, in characters
STATE_MAX = 3_500_000      # the project state, photos left out
APPS = ('provident-ad-studio', 'provident-smp-studio', 'provident-ad-sets')  # the last is CAS's shared Ad sets view
ID_CHARS = string.ascii_letters + string.digits


class Fail(Exception):
    def __init__(self, code, msg):
        super().__init__(msg)
        self.code, self.msg = code, msg


def up_fail(why):
    """Upstash's plan limits, in plain words. A full store is 507, which route() answers by
    freeing space and trying once more."""
    low = (why or '').lower()
    if 'limit' in low and ('request' in low or 'command' in low):
        raise Fail(503, 'The share store has used up its monthly request allowance (Upstash free plan). Links will work again when it resets, or move the store to pay-as-you-go. Upstash said: ' + why)
    if 'capacity' in low or 'quota' in low or 'oom' in low or ('max' in low and ('size' in low or 'memory' in low or 'storage' in low)):
        raise Fail(507, 'The share store is full. Old full-size photos were cleared but it is still full: delete old links in share-admin.html, or move the store to pay-as-you-go. Upstash said: ' + why)


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
            # Upstash says why in the body (a plan limit, a bad command): pass that on.
            why = ''
            try:
                b = json.loads(e.read() or b'null')
                why = str(b.get('error') if isinstance(b, dict) else b or '')[:240]
            except Exception:  # noqa: BLE001
                pass
            up_fail(why)
            raise Fail(502, 'The share store refused the request (HTTP %d)%s.' % (e.code, ': ' + why if why else ''))
        except Exception as e:  # noqa: BLE001
            raise Fail(502, 'The share store did not answer (%s).' % e.__class__.__name__)

    def cmd(self, *args):
        out = self._post('', [str(a) for a in args])
        if isinstance(out, dict) and out.get('error'):
            up_fail(str(out['error']))
            raise Fail(502, 'Share store error: ' + str(out['error']))
        return out.get('result') if isinstance(out, dict) else None

    def pipe(self, cmds):
        out = self._post('/pipeline', [[str(a) for a in c] for c in cmds]) or []
        res = []
        for o in out:
            if isinstance(o, dict) and o.get('error'):
                up_fail(str(o['error']))
                raise Fail(502, 'Share store error: ' + str(o['error']))
            res.append(o.get('result') if isinstance(o, dict) else None)
        return res

    def set_raw(self, key, value, ttl):
        # POST /set/<key>?EX= with the value as the raw body: no JSON escaping on a big part
        path = '/set/' + urllib.parse.quote(key, safe='') + '?EX=' + str(ttl)
        out = self._post(path, value.encode(), raw=True)
        if isinstance(out, dict) and out.get('error'):
            up_fail(str(out['error']))
            raise Fail(502, 'Share store error: ' + str(out['error']))


class Memory:
    """SHARE_DEV only — the same commands, held in this process."""
    def __init__(self):
        self.d, self.lock, self.ttl = {}, threading.RLock(), {}

    def cmd(self, op, *a):
        with self.lock:
            op = op.upper()
            if op == 'GET':
                v = self.d.get(a[0]); return v if isinstance(v, str) else None
            if op == 'SET':
                self._room(len(str(a[1])) - (len(self.d[a[0]]) if isinstance(self.d.get(a[0]), str) else 0))
                self.d[a[0]] = str(a[1]); return 'OK'
            if op == 'EXPIRE':
                if a[0] in self.d: self.ttl[a[0]] = int(a[1])
                return 1
            if op == 'PERSIST':
                return 1
            if op == 'DEL':
                return 1 if self.d.pop(a[0], None) is not None else 0
            if op == 'SCAN':
                pat = a[a.index('MATCH') + 1] if 'MATCH' in a else '*'
                return ['0', [k for k in self.d if fnmatch.fnmatchcase(k, pat)]]
            if op == 'STRLEN':
                v = self.d.get(a[0]); return len(v) if isinstance(v, str) else 0
            if op == 'TTL':
                return (self.ttl.get(a[0], -1)) if a[0] in self.d else -2
            if op == 'EXISTS':
                return 1 if a[0] in self.d else 0
            if op == 'PING':
                return 'PONG'
            if op == 'DBSIZE':
                return len(self.d)
            if op == 'INFO':
                n = sum(len(v) if isinstance(v, str) else len(json.dumps(v)) for v in self.d.values())
                return '# Memory\r\nused_memory:%d\r\n' % n
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

    def used(self):
        return sum(len(v) if isinstance(v, str) else len(json.dumps(v)) for v in self.d.values())

    def _room(self, add):
        # SHARE_DEV_QUOTA (bytes): behave like a full Upstash database, to test reclaim()
        q = int(os.environ.get('SHARE_DEV_QUOTA') or 0)
        if q and add > 0 and self.used() + add > q:
            up_fail('ERR DB capacity quota exceeded. Threshold: %d bytes, Usage: %d bytes' % (q, self.used()))

    def set_raw(self, key, value, ttl):
        self.cmd('SET', key, value)
        if ttl:
            self.ttl[key] = ttl

    def save(self, k, base, state, entry, burst, slots, ttl):
        with self.lock:
            self._room(len(state or '') + len(entry or ''))
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
redis.call('SET', KEYS[1], rev)
if ARGV[2] ~= '' then redis.call('SET', KEYS[2], ARGV[2]) else redis.call('PERSIST', KEYS[2]) end
local i = 7
while i < #ARGV do
  if ARGV[i + 1] == '' then redis.call('HDEL', KEYS[3], ARGV[i]) else redis.call('HSET', KEYS[3], ARGV[i], ARGV[i + 1]) end
  i = i + 2
end
redis.call('PERSIST', KEYS[3])
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
redis.call('PERSIST', KEYS[4])
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
    # the designer's bypass: an ad already signed off outside the review goes straight to approved
    'approved': (('dd',), 'copy', True, None),
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
    # The old record goes once it is converted. Left in place, removing the project from this ad
    # set (or deleting the ad set) only lasted until the project was next opened, when it was
    # converted again into a fresh ad set of one: "I delete it and it keeps coming back".
    cmds += [['SET', 'rs:' + rid, json.dumps(rs, separators=(',', ':'))], ['SET', 'sh:' + sid + ':rid', rid], ['DEL', 'sh:' + sid + ':rv']]
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
    if act == 'approved' and not it.get('design'):
        it['design'] = {'by': by, 'at': now}
    rs['hist'] = (rs.get('hist') or [])[-HIST_MAX + 1:] + [{'act': act, 'by': by, 'at': now, 'sid': sid}]
    put_rs(rs)
    arb = it.get('lang') == 'ARB'
    text = ('Marked the Arabic approved — signed off before the review' if arb else 'Marked it approved — signed off before the review') if act == 'approved' else {('design', True): 'Arabic laid out, ready for the translation check' if arb else 'Marked the design done',
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
    if str(d.get('product') or '') in PRODUCTS:
        rs['product'] = str(d['product'])
    if isinstance(d.get('eng_only'), dict):
        eo = rs.setdefault('eng_only', {})
        for k, v in list(d['eng_only'].items())[:40]:
            k = str(k)[:80]
            if v:
                eo[k] = True
            else:
                eo.pop(k, None)
    by = who(d.get('by'))
    if isinstance(d.get('relabel'), dict):
        r = d['relabel']
        sid = clean_id(r.get('sid'))
        it = next((x for x in rs['items'] if x['sid'] == sid), None)
        if not it:
            raise Fail(404, 'That project is not in this ad set.')
        market, aud, lang = clean_labels(r, rs)
        if any(x['sid'] != sid and x.get('market') == market and x.get('aud') == aud and x.get('lang') == lang for x in rs['items']):
            raise Fail(409, 'Another project in this ad set is already ' + item_label({'market': market, 'aud': aud, 'lang': lang}) + '.')
        was = item_label(it)
        it['market'], it['aud'], it['lang'] = market, aud, lang
        rs_log(rs['rid'], by, [{'kind': 'step', 'text': 'Changed ' + was + ' to ' + item_label(it)}])
    if d.get('remove'):
        sid = clean_id(d['remove'])
        gone = next((x for x in rs['items'] if x['sid'] == sid), None)
        rs['items'] = [x for x in rs['items'] if x['sid'] != sid]
        store().pipe([['DEL', 'sh:' + sid + ':rid'], ['DEL', 'sh:' + sid + ':rv']])
        if gone:
            rs_log(rs['rid'], by, [{'kind': 'step', 'text': 'Removed ' + item_label(gone) + ' from the ad set'}])
    put_rs(rs)
    return ok({'rs': rs_pub(rs, role)})


def rs_del(role, rs):
    """The designer deletes the whole ad set: its record, log, picture and three links. Its
    projects stay as ordinary shared edit links."""
    if role != 'dd':
        raise Fail(403, 'Only the designer deletes an ad set.')
    s, rid = store(), rs['rid']
    cmds = [['DEL', 'rs:' + rid], ['DEL', 'rs:' + rid + ':log'], ['DEL', 'rs:' + rid + ':thumb']]
    cmds += [['DEL', 'rvt:' + t] for t in (rs.get('tok') or {}).values()]
    cmds += [['DEL', 'sh:' + it['sid'] + ':' + x] for it in rs.get('items') or [] for x in ('rid', 'rv')]
    s.pipe(cmds)
    return ok({'deleted': True})


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
            s.pipe([['PERSIST', 'sh:' + it['sid'] + ':' + x] for it in items if e['live'][it['sid']] for x in ('state', 'rev', 'imgs')] or [['GET', 'x']])
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


# ---------- photos that expired ----------

def part_key(k, p, i):
    # ONE PHOTO, STORED ONCE (2026-10-27): an entry carrying `c` (the hash of the stored text) has
    # its parts under img:<c>:<i>, shared by every link holding the same photo. An entry without
    # it is from before, with its parts under the link: sh:<id>:img:<h>:<i>.
    return ('img:' + p['c'] if p.get('c') else k + 'img:' + p['h']) + ':' + str(i)


def refresh(k, raw):
    return [['EXPIRE', part_key(k, p, i), TTL] for p in parts_of(raw) for i in range(p['n'])]


def flagged(k, raw):
    """The photo map, each entry marked `gone` when its full-size parts have expired (the
    studio then shows its preview) and `nopv` when no preview is stored yet (a photo uploaded
    before previews existed — the studio adds one if it holds the photo)."""
    out = imgs_of(raw)
    sl, cmds = [], []
    for x in out:
        e = out[x]
        if not isinstance(e, dict) or not e.get('h'):
            continue
        try:
            p = {'h': clean_hash(e.get('h')), 'n': max(1, int(e.get('n') or 1)), 'c': clean_hash(e['c']) if e.get('c') else ''}
        except (Fail, ValueError, TypeError):
            continue
        sl.append(x)
        cmds += [['EXISTS', part_key(k, p, 0)], ['EXISTS', part_key(k, p, p['n'] - 1)],
                 ['EXISTS', 'pv:' + p['h']], ['EXISTS', k + 'pv:' + p['h']]]
    r = store().pipe(cmds) if cmds else []
    for j, x in enumerate(sl[:len(r) // 4]):
        a, b, pv, pv0 = r[j * 4:j * 4 + 4]
        if not (int(a or 0) and int(b or 0)):
            out[x]['gone'] = 1
        if not (int(pv or 0) or int(pv0 or 0)):
            out[x]['nopv'] = 1
    return out


# ---------- admin: what takes the space, and deleting a link ----------
# share-admin.html. One key, SHARE_ADMIN_KEY, set in the deployment's environment — never in
# this public repo. Without it both requests answer 503.

def parts_of(raw):
    out = []
    for v in (imgs_of(raw) or {}).values():
        try:
            h, n = clean_hash(v.get('h')), int(v.get('n') or 0)
            if 0 < n <= 400:
                out.append({'h': h, 'n': n, 'c': clean_hash(v['c']) if v.get('c') else ''})
        except (Fail, ValueError, TypeError, AttributeError):
            pass
    return out


def admin_ok(key):
    want = os.environ.get('SHARE_ADMIN_KEY') or ''
    if not want:
        raise Fail(503, 'Set SHARE_ADMIN_KEY in the deployment to use this page. See docs/share-links-setup.md.')
    if not isinstance(key, str) or not hmac.compare_digest(key.encode(), want.encode()):
        raise Fail(403, 'That admin key is not right.')


def scan(pat):
    s, cur, keys = store(), '0', []
    while True:
        r = s.cmd('SCAN', cur, 'MATCH', pat, 'COUNT', 1000)
        cur, ks = str(r[0]), r[1] or []
        keys += ks
        if cur == '0' or len(keys) > 200_000:
            return keys


STR_TAILS = ('meta', 'state', 'rev', 'sum', 'thumb', 'rid')  # plus img: and pv: keys


def admin_list():
    s = store()
    by = {}
    for key in scan('sh:*'):
        p = key.split(':')
        if len(p) >= 3:
            by.setdefault(p[1], []).append(key)
    sids = list(by)
    sized = [k for sid in sids for k in by[sid] if k.split(':', 2)[2] in STR_TAILS or ':img:' in k or ':pv:' in k]
    lens = {}
    for i in range(0, len(sized), 500):
        b = sized[i:i + 500]
        for k, n in zip(b, s.pipe([['STRLEN', k] for k in b])):
            lens[k] = int(n or 0)
    info = {}
    for i in range(0, len(sids), 150):
        b = sids[i:i + 150]
        out = s.pipe([c for sid in b for c in (['GET', 'sh:' + sid + ':meta'], ['GET', 'sh:' + sid + ':rid'],
                                                ['TTL', next((x for x in by[sid] if ':img:' in x), 'sh:' + sid + ':state')])])
        for j, sid in enumerate(b):
            info[sid] = out[j * 3:j * 3 + 3]
    # photos in the shared store (img:<c>:<i>) count for every link that holds them
    gk, gh = {}, {}
    gpv = {x.split(':')[1] for x in scan('pv:*')}
    for i in range(0, len(sids), 150):
        b = sids[i:i + 150]
        for sid, raw in zip(b, s.pipe([['HGETALL', 'sh:' + sid + ':imgs'] for sid in b])):
            gk[sid] = ['img:' + p['c'] + ':' + str(j) for p in parts_of(raw) if p.get('c') for j in range(p['n'])]
            gh[sid] = [p['h'] for p in parts_of(raw)]
    allg = sorted({x for v in gk.values() for x in v})
    glen, gttl = {}, {}
    for i in range(0, len(allg), 250):
        b = allg[i:i + 250]
        r = s.pipe([c for x in b for c in (['STRLEN', x], ['TTL', x])])
        for j, x in enumerate(b):
            glen[x], gttl[x] = int(r[j * 2] or 0), int(r[j * 2 + 1] if r[j * 2 + 1] is not None else -2)
    shared_total = sum(glen.values())
    rsn = {}
    rows, total = [], 0
    for sid in sids:
        meta, rid, ttl = info[sid]
        try:
            meta = json.loads(meta) if meta else {}
        except Exception:  # noqa: BLE001
            meta = {}
        if rid and rid not in rsn:
            rsn[rid] = (read_json('rs:' + rid) or {}).get('name') or ''
        own = sum(lens.get(k, 0) for k in by[sid])
        total += own
        g = [x for x in gk.get(sid, []) if glen.get(x)]
        size = own + sum(glen[x] for x in g)
        ttl = int(ttl if ttl is not None else -2)
        if ttl < 0 and g:
            ttl = max(gttl.get(x, -2) for x in g)
        has_photo = any(':img:' in x for x in by[sid]) or bool(g)
        npv = sum(1 for k in by[sid] if ':pv:' in k) + sum(1 for h in gh.get(sid, ()) if h in gpv)
        rows.append({'sid': sid, 'name': meta.get('name') or '', 'app': meta.get('app') or '', 'by': meta.get('by') or '',
                     'created': meta.get('created') or 0, 'bytes': size,
                     'photos': sum(1 for k in by[sid] if ':img:' in k) + len(g), 'previews': npv,
                     'live': any(x.endswith(':state') for x in by[sid]),
                     'days': round(ttl / 86400, 1) if has_photo and ttl >= 0 else None, 'rid': rid or '', 'set': rsn.get(rid, '') if rid else ''})
    rows.sort(key=lambda r: -r['bytes'])
    # a link's size includes the shared photos it holds, so rows can add up to more than the total
    return ok({'rows': rows, 'bytes': total + shared_total, 'ttl_days': TTL // 86400})


def admin_del(sid):
    s = store()
    rid = s.cmd('GET', 'sh:' + sid + ':rid')
    keys = scan('sh:' + sid + ':*')
    for i in range(0, len(keys), 500):
        s.pipe([['DEL', k] for k in keys[i:i + 500]])
    if rid:
        rs = read_json('rs:' + rid)
        if rs:
            rs['items'] = [x for x in rs.get('items') or [] if x.get('sid') != sid]
            put_rs(rs)
    try:
        reclaim(1)  # photos only this link used
    except Fail:
        pass
    return ok({'deleted': len(keys)})


# ---------- a full store frees itself ----------
# Nearly all of the store is full-size photo parts (`img:`). Three kinds can go without losing
# anything anyone sees: parts of a photo the link no longer uses (it was replaced, or removed),
# parts left behind by a project that no longer exists, and (level 2 only) the full-size parts
# of a link nobody has opened for RECLAIM_DAYS — those links keep their preview and put the
# full photo back from the designer's computer, exactly as after the 60-day expiry. A photo
# with no preview stored is never touched, so nothing is lost outright.

RECLAIM_DAYS = 14


def hash_of(key):
    p = key.split(':')  # sh:<id>:img:<hash>:<i>  or  sh:<id>:pv:<hash>
    return p[3] if len(p) > 3 else ''


def reclaim(level=1):
    s = store()
    by = {}
    for key in scan('sh:*'):
        p = key.split(':')
        if len(p) >= 3:
            by.setdefault(p[1], []).append(key)
    gc, gh = set(), set()  # stored texts (c) and photos (h) some live link still uses
    drop, keep_pv = [], set()
    for sid, keys in by.items():
        live = any(x.endswith(':state') for x in keys)
        parts = [x for x in keys if ':img:' in x or ':pv:' in x]
        if not live:
            drop += parts  # the project is gone
            continue
        ents = [e for e in imgs_of(s.cmd('HGETALL', 'sh:' + sid + ':imgs')).values() if isinstance(e, dict)]
        gc |= {e.get('c') for e in ents if e.get('c')}
        gh |= {e.get('h') for e in ents if e.get('h')}
        legacy = {e.get('h') for e in ents if e.get('h') and not e.get('c')}
        if not parts:
            continue
        img = [x for x in parts if ':img:' in x]
        pv = {hash_of(x) for x in parts if ':pv:' in x}
        ttl = s.pipe([['TTL', x] for x in img]) if img else []
        for x, t in zip(img, ttl):
            t = int(t if t is not None else -1)
            if hash_of(x) not in legacy:
                # not in the link's photo map (or moved to the shared store); a part written in
                # the last ten minutes may be an upload whose save has not landed yet, so it stays
                if t < TTL - 600:
                    drop.append(x)
            elif level >= 2 and (hash_of(x) in pv or s.cmd('EXISTS', 'pv:' + hash_of(x))) and 0 <= t < TTL - RECLAIM_DAYS * 86400:
                drop.append(x)
        drop += [x for x in parts if ':pv:' in x and hash_of(x) not in gh]
    # the shared store: img:<c>:<i> and pv:<h>
    gimg = scan('img:*')
    ttl = []
    for i in range(0, len(gimg), 400):
        ttl += s.pipe([['TTL', x] for x in gimg[i:i + 400]])
    for x, t in zip(gimg, ttl):
        c = x.split(':')[1]
        t = int(t if t is not None else -1)
        if c not in gc:
            if t < TTL - 600:
                drop.append(x)
        elif level >= 2 and 0 <= t < TTL - RECLAIM_DAYS * 86400:
            drop.append(x)  # every link that holds it keeps its preview (pv:<h>)
    drop += [x for x in scan('pv:*') if x.split(':')[1] not in gh]
    freed = 0
    for i in range(0, len(drop), 400):
        b = drop[i:i + 400]
        freed += sum(int(n or 0) for n in s.pipe([['STRLEN', x] for x in b]))
        s.pipe([['DEL', x] for x in b])
    return {'deleted': len(drop), 'freed': freed}

STORE_MB = int(os.environ.get('SHARE_STORE_MB') or 250)  # Upstash free plan: 250,000,000 bytes (its own threshold)


def health():
    """Public and cheap (three commands): is the store answering, how fast, how full."""
    t = time.time()
    try:
        s = store()
        pong, keys = s.pipe([['PING'], ['DBSIZE']])
        ms = round((time.time() - t) * 1000)
    except Fail as e:
        return ok({'ok': False, 'error': e.msg, 'limit': STORE_MB * 1000000})
    # INFO's used_memory is not what Upstash's size limit counts (it read 1.8 MB on a store
    # Upstash called full at 250 MB). The stored values are: add them up, at most every 20
    # minutes, and keep the answer in sys:size so the strip costs three commands otherwise.
    used, size_err = None, ''
    try:
        c = json.loads(s.cmd('GET', 'sys:size') or 'null')
        if isinstance(c, dict) and time.time() - c.get('at', 0) < 1200:
            used = c.get('bytes')
        else:
            ks = [k for k in scan('*') if ':img:' in k or ':pv:' in k or k.startswith(('img:', 'pv:')) or k.split(':')[-1] in STR_TAILS or k.startswith('rs:') and k.count(':') == 1]
            used = 0
            for i in range(0, len(ks), 100):
                b = ks[i:i + 100]
                try:
                    used += sum(int(n or 0) for n in s.pipe([['STRLEN', k] for k in b]))
                except Fail:
                    for k in b:  # one key of another type fails the whole batch: go one by one
                        try:
                            used += int(s.cmd('STRLEN', k) or 0)
                        except Fail:
                            pass
            if not ks:
                size_err = 'no stored values found (%d keys scanned)' % len(scan('*'))
            try:
                s.cmd('SET', 'sys:size', json.dumps({'bytes': used, 'at': time.time()}))
            except Fail:
                pass  # a full store refuses the write; the number is still right
    except Exception as e:  # noqa: BLE001
        size_err = getattr(e, 'msg', '') or e.__class__.__name__
    return ok({'ok': pong in ('PONG', True), 'ms': ms, 'keys': int(keys or 0), 'bytes': used,
               'limit': STORE_MB * 1000000, 'dev': isinstance(s, Memory), **({'size_error': size_err} if size_err else {})})


# ---------- who may use the studio (CAS sign-in, 2026-10-30) ----------
#
# ONE admin, named by ACCESS_ADMIN in the deployment (never in this public repo). Everyone else
# signs in with their Provident Google account and is either a designer (the whole studio) or
# performance marketing (Home's campaign setup and Status). Somebody nobody has granted lands
# as a request the admin approves or declines. Off unless ACCESS_ADMIN is set, so a deployment
# without it behaves exactly as before.
#
# Identity is checked HERE, never taken from the page: the page sends its Google access token
# and this asks Google whose it is (Drive's `about`, the scope the studio already holds). A
# token is remembered for five minutes so a poll is not a Google round trip.
#
# Keys: acc:users  one JSON map, email -> {email, name, role, status, first, last, n, note, want, by, at}
#       acc:log    sign-in attempts and decisions, newest last, capped at ACC_LOG

ACC_LOG = 400
ACC_ROLES = ('designer', 'pm')
_acc_seen = {}


def acc_admin():
    return (os.environ.get('ACCESS_ADMIN') or '').strip().lower()


def acc_domain():
    return (os.environ.get('ACCESS_DOMAIN') or 'providentestate.com').strip().lower().lstrip('@')


def acc_who(tok):
    """A Google access token -> (email, name). Asks Google; the page's word is never taken."""
    tok = str(tok or '').strip()
    if not tok or len(tok) > 4096:
        raise Fail(401, 'Sign in with Google first.')
    key = hashlib.sha256(tok.encode()).hexdigest()
    hit = _acc_seen.get(key)
    if hit and hit[2] > time.time():
        return hit[0], hit[1]
    base = (os.environ.get('ACCESS_GOOGLE_BASE') or 'https://www.googleapis.com').rstrip('/')
    req = urllib.request.Request(base + '/drive/v3/about?fields=user(displayName,emailAddress)',
                                 headers={'Authorization': 'Bearer ' + tok})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            u = (json.loads(r.read() or b'{}') or {}).get('user') or {}
    except urllib.error.HTTPError as e:
        raise Fail(401, 'Your Google sign-in has run out. Sign in again.' if e.code in (401, 403) else 'Google did not confirm who you are (HTTP %d).' % e.code)
    except Exception as e:  # noqa: BLE001
        raise Fail(502, 'Could not reach Google to check your sign-in (%s).' % e.__class__.__name__)
    email = str(u.get('emailAddress') or '').strip().lower()
    if not email or '@' not in email:
        raise Fail(401, 'Google did not say which account this is.')
    name = str(u.get('displayName') or '').strip()[:80]
    if len(_acc_seen) > 500:
        _acc_seen.clear()
    _acc_seen[key] = (email, name, time.time() + 300)
    return email, name


def acc_users():
    try:
        d = json.loads(store().cmd('GET', 'acc:users') or '{}')
        return d if isinstance(d, dict) else {}
    except ValueError:
        return {}


def acc_put(users):
    store().cmd('SET', 'acc:users', json.dumps(users, separators=(',', ':')))


def acc_log(entry):
    entry['at'] = int(time.time() * 1000)
    store().pipe([['RPUSH', 'acc:log', json.dumps(entry, separators=(',', ':'))], ['LTRIM', 'acc:log', -ACC_LOG, -1]])


def acc_pub(u, admin=False):
    keys = ('email', 'name', 'role', 'status', 'first', 'last', 'n', 'note', 'want', 'by', 'at')
    out = {k: u.get(k) for k in keys if u.get(k) is not None}
    out['admin'] = admin
    return out


def acc_me(d):
    email, name = acc_who(d.get('tok'))
    now = int(time.time() * 1000)
    adm = acc_admin()
    if email == adm:
        return ok(acc_pub({'email': email, 'name': name, 'role': 'admin', 'status': 'active'}, True))
    if not email.endswith('@' + acc_domain()):
        acc_log({'email': email, 'name': name, 'what': 'outside'})
        raise Fail(403, 'Sign in with your @%s Google account. %s is not one.' % (acc_domain(), email))
    users = acc_users()
    u = users.get(email)
    dirty = False
    if not u:
        u = users[email] = {'email': email, 'name': name, 'role': None, 'status': 'pending', 'first': now, 'n': 0}
        acc_log({'email': email, 'name': name, 'what': 'request'})
        dirty = True
    elif u.get('status') != 'active' and now - int(u.get('last') or 0) > 600000:
        acc_log({'email': email, 'name': name, 'what': 'retry', 'status': u.get('status')})
    if name and u.get('name') != name:
        u['name'] = name
        dirty = True
    # a sign-in counts once per ten minutes, and only then is the record written, so the
    # studio's own polling costs one store read rather than a write every time
    if now - int(u.get('last') or 0) > 600000:
        u['n'] = int(u.get('n') or 0) + 1
        u['last'] = now
        dirty = True
    if dirty:
        acc_put(users)
    return ok(acc_pub(u))


def acc_req(d):
    email, name = acc_who(d.get('tok'))
    users = acc_users()
    u = users.get(email)
    if not u or u.get('status') == 'active':
        raise Fail(409, 'There is nothing to request for this account.')
    if u.get('status') == 'declined' and not d.get('again'):
        raise Fail(409, 'The admin declined this request.')
    u['note'] = str(d.get('note') or '').strip()[:400]
    want = d.get('want')
    u['want'] = want if want in ACC_ROLES else None
    u['status'] = 'pending'
    u['asked'] = int(time.time() * 1000)
    acc_put(users)
    acc_log({'email': email, 'name': u.get('name') or name, 'what': 'note', 'want': u['want']})
    return ok(acc_pub(u))


def acc_need_admin(d):
    email, name = acc_who(d.get('tok'))
    if not acc_admin() or email != acc_admin():
        raise Fail(403, 'Only the studio admin can see this.')
    return email, name


def acc_list(d):
    acc_need_admin(d)
    users = sorted(acc_users().values(), key=lambda u: -int(u.get('last') or u.get('at') or 0))
    raw = store().cmd('LRANGE', 'acc:log', -200, -1) or []
    log = []
    for r in raw:
        try:
            log.append(json.loads(r))
        except ValueError:
            pass
    return ok({'users': [acc_pub(u) for u in users], 'log': log[::-1], 'admin': acc_admin(), 'domain': acc_domain()})


def acc_set(d):
    me, _ = acc_need_admin(d)
    email = str(d.get('email') or '').strip().lower()
    act = d.get('action')
    role = d.get('role')
    if not email or '@' not in email or len(email) > 120:
        raise Fail(400, 'That is not an email address.')
    if email == acc_admin():
        raise Fail(409, 'The admin always has access.')
    if not email.endswith('@' + acc_domain()):
        raise Fail(400, 'Only @%s accounts can be given access.' % acc_domain())
    users = acc_users()
    now = int(time.time() * 1000)
    u = users.get(email)
    if act == 'add':
        if role not in ACC_ROLES:
            raise Fail(400, 'Pick a role.')
        u = users.setdefault(email, {'email': email, 'name': '', 'first': None, 'n': 0})
        u.update(role=role, status='active', by=me, at=now)
    else:
        if not u:
            raise Fail(404, 'Nobody with that email has signed in or been added.')
        if act == 'grant':
            if role not in ACC_ROLES:
                raise Fail(400, 'Pick a role.')
            u.update(role=role, status='active', by=me, at=now)
        elif act == 'role':
            if role not in ACC_ROLES:
                raise Fail(400, 'Pick a role.')
            u.update(role=role, by=me, at=now)
        elif act in ('decline', 'revoke'):
            u.update(status='declined' if act == 'decline' else 'revoked', by=me, at=now)
        elif act == 'remove':
            users.pop(email, None)
        else:
            raise Fail(400, 'Unknown change.')
    acc_put(users)
    acc_log({'email': email, 'name': (u or {}).get('name') or '', 'what': act, 'role': role, 'by': me})
    return ok({'ok': True, 'user': acc_pub(users[email]) if email in users else None})


ACC_OPS = {'accme': acc_me, 'accreq': acc_req, 'acclist': acc_list, 'accset': acc_set}


# Named route, not app: Vercel's Python runtime treats a module-level `app` as a WSGI/ASGI app.
def route(method, query, body):
    """(method, {query}, bytes) -> (status, content-type, bytes). A write refused because the
    store is full frees space (reclaim) and is tried again: unused photos first, then the
    full-size photos of links nobody has opened for a while."""
    r = _route(method, query, body)
    if r[0] == 507 and method == 'POST':
        for level in (1, 2):
            try:
                if not reclaim(level)['deleted']:
                    continue
            except Fail:
                break
            r = _route(method, query, body)
            if r[0] != 507:
                break
    return r


def _route(method, query, body):
    """(method, {query}, bytes) -> (status, content-type, bytes)"""
    q = {k: v[0] for k, v in urllib.parse.parse_qs(query).items()}
    op = q.get('op', '')
    try:
        if method == 'OPTIONS':
            return 204, 'text/plain', b''
        if method == 'GET' and op == 'health':
            return health()
        if method == 'GET' and op == 'accstatus':
            return ok({'on': bool(acc_admin()), 'domain': acc_domain()})
        if method == 'POST' and op in ACC_OPS:
            return ACC_OPS[op](json.loads(body or b'{}'))
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
            s.pipe([['SET', k + 'meta', meta], ['SET', k + 'state', state], ['SET', k + 'rev', 1]])
            if isinstance(s, Memory):
                s.d.setdefault(k + 'log', []).append(ent)
            else:
                s.cmd('RPUSH', k + 'log', ent)
            return ok({'id': sid, 'rev': 1})
        if method == 'POST' and op in ('adminlist', 'admindel', 'adminreclaim'):
            d = json.loads(body or b'{}')
            admin_ok(d.get('key'))
            if op == 'adminreclaim':
                return ok(reclaim(2 if d.get('old') else 1))
            return admin_list() if op == 'adminlist' else admin_del(clean_id(d.get('sid')))
        if method == 'GET' and op == 'rsinfo':
            return rs_info(q)
        sid, role, rs = resolve(q.get('id'), q.get('p'))
        if method == 'POST' and op == 'rsmake':
            if role is not None or not sid:
                raise Fail(403, 'Start an ad set from the project itself.')
            return rs_make(sid, json.loads(body or b'{}'))
        if op in ('rsget', 'rsadd', 'rsstep', 'rsset', 'rsdel'):
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
            if method == 'POST' and op == 'rsdel':
                return rs_del(role, rs)
        if not sid:
            raise Fail(400, 'Name the project (p=) — this is an ad set link.')
        k = 'sh:' + sid + ':'
        if method == 'POST' and op in ('part', 'save', 'pvput', 'thumb') and role == 'pm':
            raise Fail(403, 'This link is for viewing the ad sets — it cannot change the project.')
        pub = rs_pub(rs, role)
        if method == 'POST' and op == 'part':
            h, i, n = clean_hash(q.get('c') or q.get('h')), int(q.get('i', '-1')), int(q.get('n', '0'))
            if not (0 <= i < n <= 400):
                raise Fail(400, 'Bad picture part.')
            txt = (body or b'').decode('utf-8', 'strict')
            if not txt or len(txt) > PART_MAX:
                raise Fail(413, 'That picture part is too large.')
            need(k)
            # c: the hash of the stored text, so the part is shared by every link with this photo
            s.set_raw(('img:' if q.get('c') else k + 'img:') + h + ':' + str(i), txt, TTL)
            return ok({'ok': True})
        if method == 'GET' and op == 'have':
            # is this photo already stored (by any link)? Then there is nothing to upload, and
            # its 60 days start again
            c, n = clean_hash(q.get('c')), int(q.get('n', '0'))
            if not (0 < n <= 400):
                raise Fail(400, 'Bad picture part.')
            have = all(int(x or 0) for x in s.pipe([['EXISTS', 'img:' + c + ':' + str(i)] for i in range(n)]))
            if have:
                s.pipe([['EXPIRE', 'img:' + c + ':' + str(i), TTL] for i in range(n)])
            return ok({'have': have})
        if method == 'POST' and op == 'pvput':
            h = clean_hash(q.get('h'))
            txt = (body or b'').decode('utf-8', 'strict')
            if not txt or len(txt) > PV_MAX:
                raise Fail(413, 'That preview is too large.')
            need(k)
            s.cmd('SET', 'pv:' + h, txt)  # one preview per photo, shared by every link
            return ok({'ok': True})
        if method == 'POST' and op == 'devexpire' and isinstance(s, Memory):
            # SHARE_DEV only: what 60 days without opening does to a link's photos
            mine = {part_key(k, p, i) for p in parts_of(s.cmd('HGETALL', k + 'imgs')) for i in range(p['n'])}
            gone = [x for x in list(s.d) if x.startswith(k + 'img:') or x in mine]
            for x in gone: s.d.pop(x, None)
            return ok({'expired': len(gone)})
        if method == 'GET' and op == 'pv':
            h = clean_hash(q.get('h'))
            v = s.cmd('GET', 'pv:' + h)
            if v is None:
                v = s.cmd('GET', k + 'pv:' + h)
            if v is None:
                raise Fail(404, 'No preview of that picture is stored.')
            return 200, 'text/plain; charset=utf-8', v.encode()
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
                    e = {'h': clean_hash(v.get('h')), 'n': int(v.get('n') or 0)}
                    if v.get('c'):
                        e['c'] = clean_hash(v.get('c'))
                    slots.append((sl, json.dumps(e, separators=(',', ':'))))
                else:
                    slots.append((sl, ''))
            need(k)
            before = parts_of(s.cmd('HGETALL', k + 'imgs')) if slots else []
            r = do_save(k, int(d.get('base') or 0), state, entry_json(d.get('by'), d.get('changes'), d.get('burst')),
                        str(d.get('burst') or '')[:24], slots)
            if not r or int(r[0]) != 1:
                return 409, 'application/json', json.dumps({'error': 'stale', 'rev': int(r[1]) if r else 0}).encode()
            # a photo this link stored on its own (before the shared store) that it no longer uses
            # — replaced, removed, or moved to the shared store — goes now rather than in 60 days
            if before:
                still = {p['h'] for p in parts_of(s.cmd('HGETALL', k + 'imgs')) if not p.get('c')}
                old = [k + 'img:' + p['h'] + ':' + str(i) for p in before if not p.get('c') and p['h'] not in still for i in range(p['n'])]
                if old:
                    s.pipe([['DEL', x] for x in old])
            # an ad set's project keeps a small summary for the archive
            if rs and isinstance(d.get('sum'), dict):
                s.cmd('SET', k + 'sum', json.dumps(clean_sum(d['sum']), separators=(',', ':')))
            return ok({'rev': int(r[1])})
        if method == 'POST' and op == 'thumb':
            # the project's preview for Review links, redrawn after edits settle: no new revision
            d = json.loads(body or b'{}')
            th = thumb_of(d)
            if not th:
                raise Fail(400, 'No preview.')
            need(k)
            cmds = [['SET', k + 'thumb', th]]
            if rs and rs.get('rid'):
                cmds.append(['SET', 'rs:' + rs['rid'] + ':thumb', th])
            if rs and isinstance(d.get('sum'), dict):
                cmds.append(['SET', k + 'sum', json.dumps(clean_sum(d['sum']), separators=(',', ':'))])
            s.pipe(cmds)
            return ok({'ok': True})
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
            # The link never expires (PERSIST also turns a link made before that rule into one
            # that does not); opening it keeps its full-size photos for another TTL.
            s.pipe([['PERSIST', k + x] for x in ('meta', 'state', 'rev', 'imgs', 'log')] + refresh(k, imgs))
            return ok({'meta': json.loads(meta or '{}'), 'state': json.loads(state), 'rev': int(rev),
                       'imgs': flagged(k, imgs), 'log': logs_of(log), 'from': max(0, n - 200), 'n': n, 'role': role, 'rs': pub})
        if method == 'GET' and op == 'sync':
            # what the client needs after another tab saved: state, photo map, log from `from`
            state, rev, imgs, n = s.pipe([['GET', k + 'state'], ['GET', k + 'rev'], ['HGETALL', k + 'imgs'], ['LLEN', k + 'log']])
            if rev is None or state is None:
                raise Fail(404, 'This shared link has expired or was never made.')
            n, frm = int(n or 0), max(0, int(q.get('from', '0')))
            frm = min(frm, n)
            log = s.cmd('LRANGE', k + 'log', frm, -1) if frm < n else []
            return ok({'state': json.loads(state), 'rev': int(rev), 'imgs': flagged(k, imgs), 'log': logs_of(log), 'from': frm, 'n': n,
                       'role': role, 'rs': pub})
        if method == 'GET' and op == 'chunk':
            c, i = q.get('c'), int(q.get('i', '-1'))
            v = s.cmd('GET', ('img:' + clean_hash(c) if c else k + 'img:' + clean_hash(q.get('h'))) + ':' + str(i))
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
