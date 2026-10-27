"""A stand-in for the part of the Google Drive v3 REST API the studios use, held in memory.

serve.py routes /drive/v3/... and /upload/drive/v3/... here, so review links stored on Drive
can be tested on this computer with no Google account: in the studio's console,
localStorage.setItem('provident-drive-base', location.origin) and
sessionStorage.setItem('provident-drive-tok', JSON.stringify({at: 'dev', exp: Date.now() + 3e6})).

Covers: listing a folder (q = "'<id>' in parents and trashed=false [and name='<n>']"), a file's
metadata and content (Range too), creating a folder or a file (metadata POST, or a multipart
upload), replacing a file's content (PATCH media), renaming or moving (PATCH with addParents /
removeParents), and deleting. Every change bumps the file's `version`, as Drive does.
"""
import json
import random
import re
import string
import threading
import time
import urllib.parse

FOLDER = 'application/vnd.google-apps.folder'
LOCK = threading.RLock()
FILES = {}
# the folder the user handed over for testing, so links and paths look the same as for real
SEED = {'id': '11Rk2HnQXzIXpphUvdTFw_UkRFCRKof87', 'name': 'Ad set test (stand-in)'}


def _now():
    return time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())


def _new_id():
    return '1' + ''.join(random.SystemRandom().choice(string.ascii_letters + string.digits + '-_') for _ in range(32))


def _add(name, mime, parents, content=b''):
    f = {'id': _new_id(), 'name': name, 'mimeType': mime, 'parents': list(parents), 'content': content,
         'version': 1, 'modifiedTime': _now(), 'trashed': False}
    FILES[f['id']] = f
    return f


def reset():
    with LOCK:
        FILES.clear()
        FILES[SEED['id']] = {'id': SEED['id'], 'name': SEED['name'], 'mimeType': FOLDER, 'parents': ['root'], 'content': b'',
                             'version': 1, 'modifiedTime': _now(), 'trashed': False}


reset()


def _meta(f):
    return {'id': f['id'], 'name': f['name'], 'mimeType': f['mimeType'], 'parents': f['parents'],
            'version': str(f['version']), 'modifiedTime': f['modifiedTime'], 'size': str(len(f['content'])),
            'webViewLink': 'https://drive.google.com/drive/folders/' + f['id'] if f['mimeType'] == FOLDER else
            'https://drive.google.com/file/d/' + f['id'] + '/view'}


def _json(code, d):
    return code, 'application/json', json.dumps(d).encode()


def _err(code, msg):
    return _json(code, {'error': {'code': code, 'message': msg}})


def _bump(f):
    f['version'] += 1
    f['modifiedTime'] = _now()


def _multipart(ctype, body):
    m = re.search(r'boundary="?([^";]+)"?', ctype or '')
    if not m:
        raise ValueError('no boundary')
    b = ('--' + m.group(1)).encode()
    parts = [p for p in body.split(b) if p.strip() not in (b'', b'--')]
    out = []
    for p in parts:
        p = p.lstrip(b'\r\n')
        head, _, data = p.partition(b'\r\n\r\n')
        if data.endswith(b'\r\n'):
            data = data[:-2]
        out.append((head.decode('latin-1'), data))
    meta = json.loads(out[0][1] or b'{}')
    return meta, (out[1][1] if len(out) > 1 else b'')


def route(method, path, query, headers, body):
    """(method, path, query, headers, body) -> (status, content-type, bytes)"""
    if not (headers.get('Authorization') or '').startswith('Bearer '):
        return _err(401, 'Request had invalid authentication credentials.')
    q = {k: v[0] for k, v in urllib.parse.parse_qs(query).items()}
    up = path.startswith('/upload/')
    rest = path.split('/files', 1)[1] if '/files' in path else ''
    fid = rest.strip('/') or None
    with LOCK:
        if method == 'GET' and not fid:
            m = re.search(r"'([\w-]+)' in parents", q.get('q', ''))
            nm = re.search(r"name\s*=\s*'((?:\\'|[^'])*)'", q.get('q', ''))
            if not m:
                return _err(400, 'q needs a parent')
            pid = m.group(1)
            name = nm.group(1).replace("\\'", "'") if nm else None
            fl = [_meta(f) for f in FILES.values() if pid in f['parents'] and not f['trashed'] and (name is None or f['name'] == name)]
            return _json(200, {'files': fl})
        if fid and fid not in FILES:
            return _err(404, 'File not found: ' + fid)
        f = FILES.get(fid) if fid else None
        if method == 'GET':
            if q.get('alt') == 'media':
                data = f['content']
                rg = re.match(r'bytes=(\d+)-(\d*)', headers.get('Range') or '')
                if rg:
                    a = int(rg.group(1)); z = int(rg.group(2)) + 1 if rg.group(2) else len(data)
                    data = data[a:z]
                ext = f['name'].rsplit('.', 1)[-1].lower()
                ct = {'json': 'application/json', 'webp': 'image/webp', 'png': 'image/png', 'jpg': 'image/jpeg', 'svg': 'image/svg+xml'}.get(ext, 'application/octet-stream')
                return 200, ct, data
            return _json(200, _meta(f))
        if method == 'POST' and not fid:
            if up:
                meta, data = _multipart(headers.get('Content-Type'), body)
            else:
                meta, data = json.loads(body or b'{}'), b''
            nf = _add(meta.get('name') or 'Untitled', meta.get('mimeType') or 'application/octet-stream', meta.get('parents') or ['root'], data)
            return _json(200, _meta(nf))
        if method == 'PATCH' and f:
            if up:
                f['content'] = body or b''
            else:
                meta = json.loads(body or b'{}')
                if meta.get('name'):
                    f['name'] = meta['name']
                if q.get('addParents'):
                    f['parents'] = [p for p in f['parents'] if p not in (q.get('removeParents') or '').split(',')] + q['addParents'].split(',')
                if meta.get('trashed') is not None:
                    f['trashed'] = bool(meta['trashed'])
            _bump(f)
            return _json(200, _meta(f))
        if method == 'DELETE' and f:
            FILES.pop(fid, None)
            return 204, 'application/json', b''
    return _err(400, 'Not covered by the stand-in.')


def snapshot():
    """The tree, for checking a test: path -> size."""
    with LOCK:
        def path(f):
            out = [f['name']]
            p = f['parents'][0] if f['parents'] else 'root'
            while p in FILES:
                out.insert(0, FILES[p]['name'])
                p = FILES[p]['parents'][0] if FILES[p]['parents'] else 'root'
            return '/'.join(out)
        return sorted((path(f) + ('/' if f['mimeType'] == FOLDER else ''), len(f['content'])) for f in FILES.values() if not f['trashed'])
