#!/usr/bin/env python3
"""The animate queue, for the animate-photos skill. Python 3 standard library only.

    animate.py list                      queued jobs, one JSON object per line
    animate.py start <id> <job_id>       mark a job as generating (remember Higgsfield's job id)
    animate.py done  <id> <video_url>    download the finished MP4 and mark the job done
    animate.py fail  <id> <reason...>    mark a job failed, with the reason the studio will show
    animate.py where                     print the queue folder

The queue is the `_animate/` folder beside the Video Studio page. The studio writes <id>.json and
<id>.jpg there; this script adds <id>.mp4. The studio watches the folder through its local server
and swaps the photo clip for the video when a job turns `done`.
"""
import json
import os
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(os.path.realpath(__file__)))


def queue():
    env = os.environ.get('VIDEO_STUDIO_QUEUE')
    if env:
        return env
    root = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))      # the checkout this skill sits in
    for c in (root, os.path.join(root, '.claude', 'worktrees', 'video-studio')):
        if os.path.exists(os.path.join(c, 'Provident Video Studio.html')):
            return os.path.join(c, '_animate')
    sys.exit('Cannot find the Video Studio checkout. Set VIDEO_STUDIO_QUEUE to its _animate folder.')


def load(q, jid):
    p = os.path.join(q, jid + '.json')
    if not os.path.exists(p):
        sys.exit('No job %s in %s' % (jid, q))
    return p, json.load(open(p))


def main():
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    q = queue()
    os.makedirs(q, exist_ok=True)
    cmd = a[0]
    if cmd == 'where':
        print(q)
    elif cmd == 'list':
        n = 0
        for f in sorted(os.listdir(q)):
            if not f.endswith('.json'):
                continue
            j = json.load(open(os.path.join(q, f)))
            if j.get('status') == 'queued':
                j['photo_path'] = os.path.join(q, j['photo'])
                print(json.dumps(j))
                n += 1
        if not n:
            print('No queued jobs. In the Video Studio, select a photo clip, pick a camera move and press "Send to the animate queue".')
    elif cmd == 'start' and len(a) == 3:
        p, j = load(q, a[1])
        j.update(status='working', job_id=a[2])
        json.dump(j, open(p, 'w'), indent=1)
        print('working', a[1])
    elif cmd == 'done' and len(a) == 3:
        p, j = load(q, a[1])
        if not a[2].startswith('https://'):
            sys.exit('The video URL must be https://')
        out = os.path.join(q, a[1] + '.mp4')
        req = urllib.request.Request(a[2], headers={'User-Agent': 'video-studio-animate'})
        with urllib.request.urlopen(req, timeout=180) as r, open(out + '.part', 'wb') as f:
            while True:
                b = r.read(1 << 16)
                if not b:
                    break
                f.write(b)
        if os.path.getsize(out + '.part') < 10000:
            os.remove(out + '.part')
            sys.exit('The download is too small to be a video; check the URL.')
        os.replace(out + '.part', out)
        j.update(status='done', video=a[1] + '.mp4')
        json.dump(j, open(p, 'w'), indent=1)
        print('done', a[1], os.path.getsize(out), 'bytes')
    elif cmd == 'fail' and len(a) >= 3:
        p, j = load(q, a[1])
        j.update(status='failed', error=' '.join(a[2:])[:200])
        json.dump(j, open(p, 'w'), indent=1)
        print('failed', a[1])
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main()
