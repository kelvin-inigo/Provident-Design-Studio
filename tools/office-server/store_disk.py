"""The share store on the office server's own disk (2026-11-25, by request: "transfer all data
from Vercel so the ngrok portal holds it all").

api/share.py talks to its store with a handful of Redis commands (Upstash over REST on Vercel).
`Disk` answers the same commands from a folder, so share.py runs unchanged behind ngrok:

  <dir>/store.db                 SQLite: every key that is not a photo — links (sh:<id>:meta,
                                 state, rev, imgs, log …), ad sets (rs:, rvt:), access (acc:*),
                                 hub tasks, Roam threads, sys:size
  <dir>/images/photos/<c>/<i>.part          full-size photo parts shared by every link (img:<c>:<i>)
  <dir>/images/previews/<h>.txt             a photo's ~640px preview record (pv:<h>)
  <dir>/images/links/<id>/photos/<h>/<i>.part   an older link's own photo parts (sh:<id>:img:…)
  <dir>/images/links/<id>/previews/<h>.txt      an older link's own preview (sh:<id>:pv:<h>)
  <dir>/images/view/…            viewable .jpg/.png copies, written by `python3 store_disk.py
                                 <dir> view` (for people browsing the folder; never read back)

A photo part is the studio's JSON record text, split at 900,000 characters; it is stored as
received. Expiry (a full-size photo nobody opened for 60 days) works as on Upstash: the row
keeps the deadline and a key past it reads as missing and is removed with its file.
"""
import base64
import json
import os
import re
import sqlite3
import sys
import threading
import time

ID = r'[A-Za-z0-9_-]+'
_FILE_KEYS = (
    (re.compile(r'^img:(%s):(\d+)$' % ID), lambda m: ('photos', m.group(1), m.group(2) + '.part')),
    (re.compile(r'^pv:(%s)$' % ID), lambda m: ('previews', m.group(1) + '.txt')),
    (re.compile(r'^sh:(%s):img:(%s):(\d+)$' % (ID, ID)), lambda m: ('links', m.group(1), 'photos', m.group(2), m.group(3) + '.part')),
    (re.compile(r'^sh:(%s):pv:(%s)$' % (ID, ID)), lambda m: ('links', m.group(1), 'previews', m.group(2) + '.txt')),
)


class StoreError(Exception):
    pass


class Disk:
    def __init__(self, root):
        self.root = os.path.abspath(os.path.expanduser(root))
        self.img = os.path.join(self.root, 'images')
        os.makedirs(self.img, exist_ok=True)
        for d in ('photos', 'previews', 'links', 'view'):
            os.makedirs(os.path.join(self.img, d), exist_ok=True)
        self.lock = threading.RLock()
        self.db = sqlite3.connect(os.path.join(self.root, 'store.db'), check_same_thread=False, isolation_level=None)
        self.db.execute('PRAGMA journal_mode=WAL')
        self.db.execute('PRAGMA synchronous=NORMAL')
        # t: s string, h hash (JSON object), l list (JSON array). f: a photo's file, relative to images/
        self.db.execute('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, t TEXT NOT NULL, v TEXT, f TEXT, n INTEGER NOT NULL DEFAULT 0, exp REAL)')

    # ---------- rows and files ----------
    def _file_of(self, k):
        for rx, fn in _FILE_KEYS:
            m = rx.match(k)
            if m:
                return os.path.join(*fn(m))
        return None

    def _row(self, k):
        r = self.db.execute('SELECT t, v, f, n, exp FROM kv WHERE k=?', (k,)).fetchone()
        if r and r[4] is not None and r[4] <= time.time():
            self._del(k, r)
            return None
        return r

    def _del(self, k, r=None):
        r = r or self.db.execute('SELECT t, v, f, n, exp FROM kv WHERE k=?', (k,)).fetchone()
        if not r:
            return 0
        self.db.execute('DELETE FROM kv WHERE k=?', (k,))
        if r[2]:
            p = os.path.join(self.img, r[2])
            try:
                os.remove(p)
            except FileNotFoundError:
                pass
            # leave no empty photo folders behind
            d = os.path.dirname(p)
            while d.startswith(self.img + os.sep) and d != self.img and os.path.basename(d) not in ('photos', 'previews', 'links', 'view'):
                try:
                    os.rmdir(d)
                except OSError:
                    break
                d = os.path.dirname(d)
        return 1

    def _str(self, r):
        if not r or r[0] != 's':
            return None
        if r[2]:
            try:
                with open(os.path.join(self.img, r[2]), encoding='utf-8') as fh:
                    return fh.read()
            except FileNotFoundError:
                return None
        return r[1]

    def _put_str(self, k, v, exp):
        v = str(v)
        old = self.db.execute('SELECT f FROM kv WHERE k=?', (k,)).fetchone()
        f = self._file_of(k)
        if old and old[0] and old[0] != f:
            self._del(k)
        if f:
            p = os.path.join(self.img, f)
            os.makedirs(os.path.dirname(p), exist_ok=True)
            tmp = p + '.tmp'
            with open(tmp, 'w', encoding='utf-8') as fh:
                fh.write(v)
            os.replace(tmp, p)
            self.db.execute('INSERT OR REPLACE INTO kv (k, t, v, f, n, exp) VALUES (?, ?, NULL, ?, ?, ?)', (k, 's', f, len(v), exp))
        else:
            self.db.execute('INSERT OR REPLACE INTO kv (k, t, v, f, n, exp) VALUES (?, ?, ?, NULL, ?, ?)', (k, 's', v, len(v), exp))

    def _coll(self, k, t):
        r = self._row(k)
        if not r:
            return ({} if t == 'h' else []), None
        if r[0] != t:
            raise StoreError('WRONGTYPE Operation against a key holding the wrong kind of value')
        return json.loads(r[1] or ('{}' if t == 'h' else '[]')), r[4]

    def _put_coll(self, k, t, v, exp):
        if not v:
            self._del(k)
            return
        s = json.dumps(v, separators=(',', ':'))
        self.db.execute('INSERT OR REPLACE INTO kv (k, t, v, f, n, exp) VALUES (?, ?, ?, NULL, ?, ?)', (k, t, s, len(s), exp))

    # ---------- the commands share.py sends ----------
    def _one(self, op, *a):
        op = op.upper()
        now = time.time()
        if op == 'PING':
            return 'PONG'
        if op == 'GET':
            return self._str(self._row(a[0]))
        if op == 'SET':
            exp = None
            rest = [str(x).upper() for x in a[2:]]
            if 'EX' in rest:
                exp = now + int(a[2 + rest.index('EX') + 1])
            self._put_str(a[0], a[1], exp)
            return 'OK'
        if op == 'EXPIRE':
            if not self._row(a[0]):
                return 0
            self.db.execute('UPDATE kv SET exp=? WHERE k=?', (now + int(a[1]), a[0]))
            return 1
        if op == 'PERSIST':
            r = self._row(a[0])
            if not r or r[4] is None:
                return 0
            self.db.execute('UPDATE kv SET exp=NULL WHERE k=?', (a[0],))
            return 1
        if op == 'DEL':
            return sum(self._del(k) for k in a if self._row(k))
        if op == 'EXISTS':
            return sum(1 for k in a if self._row(k))
        if op == 'STRLEN':
            r = self._row(a[0])
            return int(r[3]) if r and r[0] == 's' else 0
        if op == 'TTL':
            r = self._row(a[0])
            if not r:
                return -2
            return -1 if r[4] is None else max(0, int(r[4] - now))
        if op == 'SCAN':
            pat = str(a[a.index('MATCH') + 1]) if 'MATCH' in a else '*'
            self._sweep()
            # Redis glob and SQLite GLOB read *, ? and [..] the same way
            keys = [r[0] for r in self.db.execute('SELECT k FROM kv WHERE k GLOB ?', (pat,))]
            return ['0', keys]
        if op == 'DBSIZE':
            self._sweep()
            return self.db.execute('SELECT COUNT(*) FROM kv').fetchone()[0]
        if op == 'INFO':
            n = self.db.execute('SELECT COALESCE(SUM(n), 0) FROM kv').fetchone()[0]
            return '# Memory\r\nused_memory:%d\r\n' % n
        if op == 'HGETALL':
            h, _ = self._coll(a[0], 'h')
            out = []
            for k, v in h.items():
                out += [k, v]
            return out
        if op == 'HSET':
            h, exp = self._coll(a[0], 'h')
            added = 0
            for i in range(1, len(a) - 1, 2):
                added += 0 if a[i] in h else 1
                h[str(a[i])] = str(a[i + 1])
            self._put_coll(a[0], 'h', h, exp)
            return added
        if op == 'HDEL':
            h, exp = self._coll(a[0], 'h')
            n = sum(1 for f in a[1:] if h.pop(f, None) is not None)
            self._put_coll(a[0], 'h', h, exp)
            return n
        if op in ('LRANGE', 'LLEN', 'LINDEX'):
            l, _ = self._coll(a[0], 'l')
            if op == 'LLEN':
                return len(l)
            if op == 'LINDEX':
                i = int(a[1])
                return l[i] if -len(l) <= i < len(l) else None
            s, e = int(a[1]), int(a[2])
            n = len(l)
            s = max(0, n + s if s < 0 else s)
            e = n + e if e < 0 else e
            return l[s:e + 1]
        if op == 'RPUSH':
            l, exp = self._coll(a[0], 'l')
            l.extend(str(x) for x in a[1:])
            self._put_coll(a[0], 'l', l, exp)
            return len(l)
        if op == 'LSET':
            l, exp = self._coll(a[0], 'l')
            l[int(a[1])] = str(a[2])
            self._put_coll(a[0], 'l', l, exp)
            return 'OK'
        if op == 'LTRIM':
            l, exp = self._coll(a[0], 'l')
            n = len(l)
            s, e = int(a[1]), int(a[2])
            s = max(0, n + s if s < 0 else s)
            e = n + e if e < 0 else min(e, n - 1)
            self._put_coll(a[0], 'l', l[s:e + 1] if s <= e else [], exp)
            return 'OK'
        raise StoreError('The office store does not know the command ' + op)

    def _sweep(self):
        for (k,) in self.db.execute('SELECT k FROM kv WHERE exp IS NOT NULL AND exp <= ?', (time.time(),)).fetchall():
            self._del(k)

    def cmd(self, *args):
        with self.lock:
            self.db.execute('BEGIN')
            try:
                r = self._one(*args)
                self.db.execute('COMMIT')
                return r
            except Exception:
                self.db.execute('ROLLBACK')
                raise

    def pipe(self, cmds):
        with self.lock:
            self.db.execute('BEGIN')
            try:
                r = [self._one(*c) for c in cmds]
                self.db.execute('COMMIT')
                return r
            except Exception:
                self.db.execute('ROLLBACK')
                raise

    def set_raw(self, key, value, ttl):
        with self.lock:
            self.db.execute('BEGIN')
            self._put_str(key, value, time.time() + ttl if ttl else None)
            self.db.execute('COMMIT')

    def save(self, k, base, state, entry, burst, slots, ttl, logmax=500):
        """The SAVE_LUA step of api/share.py, in one transaction: check the revision, write the
        state, apply the photo map, add (or in the same burst replace) the log entry."""
        with self.lock:
            self.db.execute('BEGIN')
            try:
                rev = int(self._str(self._row(k + 'rev')) or 0)
                if int(base) != rev:
                    self.db.execute('COMMIT')
                    return [0, rev]
                rev += 1
                self._put_str(k + 'rev', rev, None)
                if state:
                    self._put_str(k + 'state', state, None)
                else:
                    self._one('PERSIST', k + 'state')
                h, _ = self._coll(k + 'imgs', 'h')
                for s, v in slots:
                    if v:
                        h[s] = v
                    else:
                        h.pop(s, None)
                self._put_coll(k + 'imgs', 'h', h, None)
                if entry:
                    e = entry[:-1] + ',"rev":' + str(rev) + '}'
                    log, _ = self._coll(k + 'log', 'l')
                    if burst and log and ('"burst":"' + burst + '"') in log[-1]:
                        log[-1] = e
                    else:
                        log.append(e)
                        del log[:-logmax]
                    self._put_coll(k + 'log', 'l', log, None)
                self.db.execute('COMMIT')
                return [1, rev]
            except Exception:
                self.db.execute('ROLLBACK')
                raise

    # ---------- for people looking at the folder ----------
    def write_view(self):
        """Viewable picture files under images/view/: one per full-size photo (photos/<c>.jpg)
        and per preview (previews/<h>.jpg), decoded from the stored records. Never read back."""
        made = 0
        parts = {}
        for k, f in self.db.execute("SELECT k, f FROM kv WHERE f LIKE 'photos/%'"):
            c, i = k.split(':')[1], int(k.split(':')[2])
            parts.setdefault(c, {})[i] = f
        jobs = []
        for c, ps in parts.items():
            if sorted(ps) != list(range(len(ps))):
                continue  # a part is missing (expired, or an upload in progress)
            jobs.append(('photos', c, [ps[i] for i in range(len(ps))]))
        for k, f in self.db.execute("SELECT k, f FROM kv WHERE f LIKE 'previews/%'"):
            jobs.append(('previews', k.split(':')[1], [f]))
        for kind, name, files in jobs:
            try:
                txt = ''.join(open(os.path.join(self.img, f), encoding='utf-8').read() for f in files)
            except FileNotFoundError:
                continue
            m = re.search(r'data:image/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)', txt)
            if not m:
                continue
            ext = 'jpg' if m.group(1) in ('jpeg', 'jpg') else m.group(1)
            out = os.path.join(self.img, 'view', kind, name + '.' + ext)
            if os.path.exists(out):
                continue
            os.makedirs(os.path.dirname(out), exist_ok=True)
            with open(out, 'wb') as fh:
                fh.write(base64.b64decode(m.group(2)))
            made += 1
        return made

    def stats(self):
        t = {}
        for typ, f, n in self.db.execute('SELECT t, f IS NOT NULL, n FROM kv'):
            key = 'photo files' if f else {'s': 'values', 'h': 'hashes', 'l': 'lists'}[typ]
            c = t.setdefault(key, [0, 0])
            c[0] += 1
            c[1] += n
        return t


if __name__ == '__main__':
    # python3 store_disk.py <dir> [view|stats]
    d = Disk(sys.argv[1] if len(sys.argv) > 1 else '~/pds-data')
    what = sys.argv[2] if len(sys.argv) > 2 else 'stats'
    if what == 'view':
        print('picture files written:', d.write_view())
    else:
        for k, (n, b) in sorted(d.stats().items()):
            print('%-12s %6d keys  %8.1f MB' % (k, n, b / 1e6))
