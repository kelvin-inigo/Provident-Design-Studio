"""Copy everything in the Vercel share store (Upstash Redis) into the office server's store.

    set -a; source .env; set +a            # KV_REST_API_URL + KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_*)
    python3 tools/office-server/pull-vercel.py [~/pds-data] [--dry]

Reads every key — links (sh:*), ad sets (rs:*, rvt:*), access (acc:*), hub tasks, Roam threads,
shared photo parts (img:*) and previews (pv:*) — with its type and time to live, and writes it
into store_disk.Disk: photos into images/ folders, the rest into store.db. Safe to run again:
a key is overwritten with Vercel's copy, keys only the office store has are left alone. Nothing
on Vercel is changed. Afterwards it writes viewable picture copies under images/view/.

The values are read with the store's own credentials, which live in Vercel (Settings ›
Environment Variables, or `vercel env pull`); they are never printed.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from store_disk import Disk  # noqa: E402


def env_end(*names):
    for n in names:
        if os.environ.get(n):
            return os.environ[n]
    for k, v in sorted(os.environ.items()):
        if v and 'READ_ONLY' not in k and any(k.endswith('_' + n) for n in names):
            return v
    return None


class Up:
    def __init__(self, url, tok):
        self.url, self.tok = url.rstrip('/'), tok

    def pipe(self, cmds):
        req = urllib.request.Request(self.url + '/pipeline', data=json.dumps([[str(a) for a in c] for c in cmds]).encode(),
                                     method='POST', headers={'Authorization': 'Bearer ' + self.tok, 'Content-Type': 'application/json'})
        for attempt in range(4):
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    out = json.loads(r.read() or b'[]')
                break
            except urllib.error.HTTPError as e:
                raise SystemExit('Upstash refused the read (HTTP %d): %s' % (e.code, (e.read() or b'')[:200].decode('utf-8', 'replace')))
            except Exception as e:  # noqa: BLE001
                if attempt == 3:
                    raise SystemExit('Upstash did not answer: %s' % e.__class__.__name__)
                time.sleep(2 * (attempt + 1))
        res = []
        for o in out:
            if isinstance(o, dict) and o.get('error'):
                raise SystemExit('Upstash error: ' + str(o['error']))
            res.append(o.get('result') if isinstance(o, dict) else None)
        return res


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    dry = '--dry' in sys.argv
    url = env_end('KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL')
    tok = env_end('KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN')
    if not url or not tok:
        raise SystemExit('No Upstash address and token in the environment (KV_REST_API_URL / KV_REST_API_TOKEN). '
                         'Copy them from Vercel › Settings › Environment Variables into .env, then `set -a; source .env; set +a`.')
    up = Up(url, tok)
    keys, cur = [], '0'
    while True:
        cur, ks = up.pipe([['SCAN', cur, 'MATCH', '*', 'COUNT', 1000]])[0]
        keys += ks or []
        if str(cur) == '0':
            break
    keys = sorted(set(keys))
    meta = []
    for i in range(0, len(keys), 200):
        b = keys[i:i + 200]
        r = up.pipe([c for k in b for c in (['TYPE', k], ['PTTL', k])])
        typ = {k: r[j * 2] for j, k in enumerate(b)}
        strs = [k for k in b if typ[k] == 'string']
        lens = dict(zip(strs, up.pipe([['STRLEN', k] for k in strs]))) if strs else {}
        for j, k in enumerate(b):
            meta.append((k, typ[k], int(r[j * 2 + 1] if r[j * 2 + 1] is not None else -1), int(lens.get(k) or 0)))
    kinds = {}
    for k, t, _, n in meta:
        kinds.setdefault(t, [0, 0])
        kinds[t][0] += 1
        kinds[t][1] += n
    print('Vercel store: %d keys — %s' % (len(keys), ', '.join('%s %d (%.1f MB)' % (t, c, b / 1e6) for t, (c, b) in sorted(kinds.items()))))
    if dry:
        return
    d = Disk(args[0] if args else os.environ.get('PDS_DATA') or '~/pds-data')
    done, skipped, t0 = 0, [], time.time()
    # read in batches that stay well under a request's size: big photo parts a few at a time
    batch, size = [], 0

    def flush():
        nonlocal done, batch, size
        if not batch:
            return
        cmds = []
        for k, t, _, _ in batch:
            cmds.append(['GET', k] if t == 'string' else ['HGETALL', k] if t == 'hash' else ['LRANGE', k, 0, -1])
        vals = up.pipe(cmds)
        now_cmds = []
        for (k, t, pttl, _), v in zip(batch, vals):
            if v is None:
                continue  # expired between the scan and the read
            ttl = pttl / 1000.0 if pttl and pttl > 0 else None
            d.cmd('DEL', k)
            if t == 'string':
                d.set_raw(k, v, 0)
            elif t == 'hash':
                if v:
                    d.cmd('HSET', k, *v)
            else:
                if v:
                    d.cmd('RPUSH', k, *v)
            if ttl:
                now_cmds.append(['EXPIRE', k, max(1, int(ttl))])
            done += 1
        if now_cmds:
            d.pipe(now_cmds)
        batch, size = [], 0
        sys.stdout.write('\r  copied %d / %d keys' % (done, len(meta)))
        sys.stdout.flush()

    for m in meta:
        k, t = m[0], m[1]
        if t not in ('string', 'hash', 'list'):
            skipped.append('%s (%s)' % (k, t))
            continue
        if batch and (size + m[3] > 3_000_000 or len(batch) >= 100):
            flush()
        batch.append(m)
        size += m[3]
    flush()
    print('\nCopied %d keys in %ds into %s' % (done, time.time() - t0, d.root))
    if skipped:
        print('Not copied (a kind of key the studios never write): ' + ', '.join(skipped[:20]))
    for k, (n, b) in sorted(d.stats().items()):
        print('  %-12s %6d keys  %8.1f MB' % (k, n, b / 1e6))
    print('Picture files for browsing written under images/view/: %d' % d.write_view())


if __name__ == '__main__':
    main()
