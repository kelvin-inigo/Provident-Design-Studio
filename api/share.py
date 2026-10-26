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

A REVIEW (CAS, 2026-10-26) is a shared project with three roles. `rvmake` turns a link into
one and hands back two more tokens; the project's own id stays the designer's (DD) link.
  rv     {created, by, name, tok:{ct, pm}, design, copy, ready, drive, hist}  — no expiry:
         it is the record the designer's Review links archive keeps
  sum    a small summary the studio writes on save (campaign, variants, sizes) — no expiry
  thumb  a small picture of the design — no expiry
  rvt:<token>  {sid, role}: a 16-character token for the copy team (ct) or performance
         marketing (pm). Every op takes a token wherever it takes an id; the token is
         resolved here and the project's id is never sent back to a token's holder.
A pm link is view-only: save and part are refused. Only dd marks the design done or reopens
it; only ct (or dd, to reopen) marks the copy approved. While a review exists the log keeps
too, so the archive can still show who did what after the project itself has expired.

Every request is /api/share?op=...  (create, part, save, get, rev, sync, chunk, rvmake,
step, rvset, rvinfo).
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
# the log entry. KEYS: rev state imgs log rv. ARGV: base state entry burst ttl logmax, then
# slot/value pairs where an empty value removes the slot. A review's log never expires.
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
    args = ['EVAL', SAVE_LUA, 5, k + 'rev', k + 'state', k + 'imgs', k + 'log', k + 'rv',
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


# ---------- reviews ----------

TOK_LEN = 16               # a role token; a project's own id is 12 characters
ROLES = ('dd', 'ct', 'pm')
HIST_MAX = 200
STEP = {   # act -> (who may, field, done?, what the log says)
    'design-done': (('dd',), 'design', True, 'Marked the design done'),
    'design-open': (('dd',), 'design', False, 'Put the design back in progress'),
    'copy-done': (('ct',), 'copy', True, 'Approved the copy'),
    'copy-open': (('ct', 'dd'), 'copy', False, 'Put the copy check back in progress'),
}


def new_tok(n):
    return ''.join(random.SystemRandom().choice(ID_CHARS) for _ in range(n))


def resolve(raw):
    """A link's id or a role token -> (project id, role or None). None means 'the project's own
    id': dd when the project is under review, an ordinary edit link when it is not."""
    t = clean_id(raw)
    if len(t) != TOK_LEN:
        return t, None
    v = store().cmd('GET', 'rvt:' + t)
    if not v:
        raise Fail(404, 'This review link has expired or was never made.')
    d = json.loads(v)
    if d.get('role') not in ROLES or not d.get('sid'):
        raise Fail(404, 'This review link is not valid.')
    return clean_id(d['sid']), d['role']


def role_of(role, rv):
    return role or ('dd' if rv else 'edit')


def rv_pub(rv, role):
    """What a link's holder may see: the tokens only reach the designer."""
    if not rv:
        return None
    out = {x: rv.get(x) for x in ('created', 'by', 'name', 'design', 'copy', 'ready', 'drive')}
    out['hist'] = (rv.get('hist') or [])[-40:]
    if role == 'dd':
        out['tok'] = rv.get('tok')
    return out


def add_log(k, by, changes):
    """Append one entry outside a save (a step change), numbered with the current revision."""
    s = store()
    ent = entry_json(by, changes, '')
    if not ent:
        return
    rev = int(s.cmd('GET', k + 'rev') or 0)
    ent = ent[:-1] + ',"rev":' + str(rev) + '}'
    s.pipe([['RPUSH', k + 'log', ent], ['LTRIM', k + 'log', -LOG_MAX, -1]])


def read_rv(k):
    v = store().cmd('GET', k + 'rv')
    try:
        return json.loads(v) if v else None
    except Exception:  # noqa: BLE001
        return None


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


def rv_make(sid, role, k, d):
    """Turn a shared project into a review. Only the project's own id can do this (never a
    token), and doing it again hands back the same tokens."""
    s = store()
    if role is not None:
        raise Fail(403, 'Only the designer’s link can start a review.')
    need(k)
    rv = read_rv(k)
    by = who(d.get('by'))
    if not rv:
        meta = json.loads(s.cmd('GET', k + 'meta') or '{}')
        if meta.get('app') != 'provident-ad-studio':
            raise Fail(400, 'Reviews are for Campaign projects.')
        tok = {r: new_tok(TOK_LEN) for r in ('ct', 'pm')}
        now = int(time.time() * 1000)
        rv = {'created': now, 'by': by, 'name': meta.get('name') or '', 'tok': tok,
              'design': None, 'copy': None, 'ready': None, 'drive': '',
              'hist': [{'act': 'start', 'by': by, 'at': now}]}
        cmds = [['SET', 'rvt:' + tok[r], json.dumps({'sid': sid, 'role': r})] for r in tok]
        cmds += [['SET', k + 'rv', json.dumps(rv, separators=(',', ':'))], ['PERSIST', k + 'meta'], ['PERSIST', k + 'log']]
        s.pipe(cmds)
        add_log(k, by, [{'kind': 'step', 'text': 'Started a review'}])
    if isinstance(d.get('sum'), dict):
        s.cmd('SET', k + 'sum', json.dumps(clean_sum(d['sum']), separators=(',', ':')))
    if isinstance(d.get('thumb'), str) and d['thumb'].startswith('data:image/') and len(d['thumb']) < 120000:
        s.cmd('SET', k + 'thumb', d['thumb'])
    return ok({'rv': rv_pub(rv, 'dd')})


def rv_step(role, k, d):
    act = str(d.get('act') or '')
    if act not in STEP:
        raise Fail(400, 'Unknown step.')
    rv = read_rv(k)
    if not rv:
        raise Fail(404, 'This project is not under review.')
    ro = role_of(role, rv)
    may, field, done, text = STEP[act]
    if ro not in may:
        raise Fail(403, 'Your link cannot change that step.')
    by, now = who(d.get('by')), int(time.time() * 1000)
    rv[field] = {'by': by, 'at': now} if done else None
    if rv.get('design') and rv.get('copy'):
        rv['ready'] = rv.get('ready') or now
        text2 = 'The ad set package is ready'
    else:
        text2 = '' if not rv.get('ready') else 'The package is back in progress'
        rv['ready'] = None
    rv['hist'] = ((rv.get('hist') or []) + [{'act': act, 'by': by, 'at': now}])[-HIST_MAX:]
    store().cmd('SET', k + 'rv', json.dumps(rv, separators=(',', ':')))
    add_log(k, by, [{'kind': 'step', 'text': text}] + ([{'kind': 'step', 'text': text2}] if text2 else []))
    if isinstance(d.get('thumb'), str) and d['thumb'].startswith('data:image/') and len(d['thumb']) < 120000:
        store().cmd('SET', k + 'thumb', d['thumb'])
    return ok({'rv': rv_pub(rv, ro)})


def rv_set(role, k, d):
    rv = read_rv(k)
    if not rv:
        raise Fail(404, 'This project is not under review.')
    ro = role_of(role, rv)
    if ro == 'pm':
        raise Fail(403, 'Your link cannot change the review.')
    if 'drive' in d:
        if ro != 'dd':
            raise Fail(403, 'Only the designer sets where the project is kept.')
        rv['drive'] = str(d.get('drive') or '')[:400]
        store().cmd('SET', k + 'rv', json.dumps(rv, separators=(',', ':')))
    if isinstance(d.get('sum'), dict):
        store().cmd('SET', k + 'sum', json.dumps(clean_sum(d['sum']), separators=(',', ':')))
    if isinstance(d.get('thumb'), str) and d['thumb'].startswith('data:image/') and len(d['thumb']) < 120000:
        store().cmd('SET', k + 'thumb', d['thumb'])
    return ok({'rv': rv_pub(rv, ro)})


def rv_info(q):
    """The designer's archive: a summary per review, by the projects' own ids (never tokens).
    Looking at a review keeps its project alive for another TTL. One id with full=1 also
    returns the log."""
    s = store()
    ids = [x for x in str(q.get('ids') or '').split(',') if x][:60]
    full = q.get('full') == '1' and len(ids) == 1
    out = []
    for raw in ids:
        try:
            sid = clean_id(raw)
        except Fail:
            continue
        if len(sid) == TOK_LEN:
            continue
        k = 'sh:' + sid + ':'
        meta, rv, sm, th, rev, n = s.pipe([['GET', k + 'meta'], ['GET', k + 'rv'], ['GET', k + 'sum'], ['GET', k + 'thumb'],
                                            ['GET', k + 'rev'], ['LLEN', k + 'log']])
        if not rv:
            out.append({'id': sid, 'gone': True})
            continue
        e = {'id': sid, 'meta': json.loads(meta or '{}'), 'rv': rv_pub(json.loads(rv), 'dd'), 'sum': json.loads(sm) if sm else {},
             'thumb': th or '', 'live': rev is not None, 'n': int(n or 0)}
        if rev is not None:
            s.pipe([['EXPIRE', k + x, TTL] for x in ('state', 'rev', 'imgs')])
        if full:
            n = int(n or 0)
            e['log'] = logs_of(s.cmd('LRANGE', k + 'log', max(0, n - 300), -1))
            e['rv']['hist'] = json.loads(rv).get('hist') or []
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
        if method == 'GET' and op == 'rvinfo':
            return rv_info(q)
        sid, role = resolve(q.get('id'))
        k = 'sh:' + sid + ':'
        if method == 'POST' and op in ('part', 'save') and role == 'pm':
            raise Fail(403, 'This link is for viewing the ad sets — it cannot change the project.')
        if method == 'POST' and op == 'rvmake':
            return rv_make(sid, role, k, json.loads(body or b'{}'))
        if method == 'POST' and op == 'step':
            return rv_step(role, k, json.loads(body or b'{}'))
        if method == 'POST' and op == 'rvset':
            return rv_set(role, k, json.loads(body or b'{}'))
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
            # a review's summary follows the project, for the archive
            if isinstance(d.get('sum'), dict) and s.cmd('EXISTS', k + 'rv'):
                s.cmd('SET', k + 'sum', json.dumps(clean_sum(d['sum']), separators=(',', ':')))
            return ok({'rev': int(r[1])})
        if method == 'GET' and op == 'rev':
            rev, n, rv = s.pipe([['GET', k + 'rev'], ['LLEN', k + 'log'], ['GET', k + 'rv']])
            if rev is None:
                raise Fail(404, 'This shared link has expired or was never made.')
            rv = json.loads(rv) if rv else None
            return ok({'rev': int(rev), 'n': int(n or 0), 'role': role_of(role, rv), 'rv': rv_pub(rv, role_of(role, rv))})
        if method == 'GET' and op == 'get':
            meta, state, rev, imgs, n, rv = s.pipe([['GET', k + 'meta'], ['GET', k + 'state'], ['GET', k + 'rev'],
                                                     ['HGETALL', k + 'imgs'], ['LLEN', k + 'log'], ['GET', k + 'rv']])
            rv = json.loads(rv) if rv else None
            ro = role_of(role, rv)
            if rev is None or state is None:
                raise Fail(404, 'This shared link has expired or was never made.')
            n = int(n or 0)
            log = s.cmd('LRANGE', k + 'log', max(0, n - 200), -1)
            # Opening the link counts as use: keep it alive for another TTL.
            s.pipe([['EXPIRE', k + x, TTL] for x in (('state', 'rev', 'imgs') if rv else ('meta', 'state', 'rev', 'imgs', 'log'))])
            return ok({'meta': json.loads(meta or '{}'), 'state': json.loads(state), 'rev': int(rev),
                       'imgs': imgs_of(imgs), 'log': logs_of(log), 'from': max(0, n - 200), 'n': n,
                       'role': ro, 'rv': rv_pub(rv, ro)})
        if method == 'GET' and op == 'sync':
            # what the client needs after another tab saved: state, photo map, log from `from`
            state, rev, imgs, n, rv = s.pipe([['GET', k + 'state'], ['GET', k + 'rev'], ['HGETALL', k + 'imgs'], ['LLEN', k + 'log'], ['GET', k + 'rv']])
            rv = json.loads(rv) if rv else None
            if rev is None or state is None:
                raise Fail(404, 'This shared link has expired or was never made.')
            n, frm = int(n or 0), max(0, int(q.get('from', '0')))
            frm = min(frm, n)
            log = s.cmd('LRANGE', k + 'log', frm, -1) if frm < n else []
            return ok({'state': json.loads(state), 'rev': int(rev), 'imgs': imgs_of(imgs), 'log': logs_of(log), 'from': frm, 'n': n,
                       'role': role_of(role, rv), 'rv': rv_pub(rv, role_of(role, rv))})
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
