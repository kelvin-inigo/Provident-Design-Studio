"""Capture the Help page's walkthrough frames (help/frames/*.webp + help/frames.json).

The frames are the real studios, driven in a private headless Chrome over the LOCAL test server
and its demo data, so they show demo names and never touch anyone's real work. Run it again
whenever the chrome changes enough that a guide's screens look stale.

  1. python3 tools/share-dev/serve.py 8796        (a fresh server: it starts empty)
  2. python3 tools/video-dev/serve.py             (CASV, from the video-studio worktree; optional)
  3. python3 tools/help-capture/capture.py --seed [--photo still.jpg] [frame,frame…]

--seed fills the server with /dev-seed's demo data once, in the capture browser's own profile
(the saved projects live in that browser). Run it once per server start; a second run doubles
the demo data. --photo is a picture dropped into the CAS and OPS editors so their canvases are
not black (any landscape photo; the 2026-11-18 frames used a still of CASV's Palm Springs test
clip). Frames named on the command line are the only ones captured; the rest are kept.

Each frame records, beside the picture, the box of every part a guide's step rings ("spots", in
% of the 1440 × 900 viewport). help-content.js names a frame and a spot per step; a renamed
class in the chrome shows here as "missing", and the step then plays without its ring.
Standard library only, like tools/studio-mcp (whose chrome.py it drives Chrome with).
"""
import argparse, base64, json, os, sys, tempfile, time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'studio-mcp'))
import chrome as _ch  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('only', nargs='?', default='')
ap.add_argument('--base', default='http://localhost:8796')
ap.add_argument('--casv', default='http://localhost:8794')
ap.add_argument('--seed', action='store_true')
ap.add_argument('--photo', default='')
ap.add_argument('--profile', default=os.path.join(tempfile.gettempdir(), 'provident-help-capture'))
ARGS = ap.parse_args()
ONLY = set(x for x in ARGS.only.split(',') if x)
OUT = os.path.join(ROOT, 'help', 'frames')
FJ = os.path.join(ROOT, 'help', 'frames.json')
W, H, DPR = 1440, 900, 2   # 2x: the player zooms up to 1.8x on a desktop stage and must stay sharp
B = ARGS.base
TEAM = {'designer': 'exec4.graphics@providentestate.com', 'smm': 'exec10.media@providentestate.com', 'cten': 'exec1.content@providentestate.com',
        'pm': 'digitalmarketing.lead1@providentestate.com', 'admin': 'kelvin.inigo@providentestate.com'}

# one profile kept between runs: the demo's saved projects live in this browser's storage
os.makedirs(ARGS.profile, exist_ok=True)
_ch.tempfile.mkdtemp = lambda prefix='': ARGS.profile
_ch.shutil.rmtree = lambda *a, **k: None
try: os.remove(os.path.join(ARGS.profile, 'DevToolsActivePort'))
except OSError: pass
c = _ch.Chrome(W, H)
c.call('Emulation.setDeviceMetricsOverride', {'width': W, 'height': H, 'deviceScaleFactor': DPR, 'mobile': False})
# the studio-mcp page helpers (__ps.eng() and friends), and a hold on the studios' "nothing open,
# go to the home's Projects" move while a project is put on screen; light theme throughout
c.call('Page.addScriptToEvaluateOnNewDocument', {'source': open(os.path.join(ROOT, 'tools', 'studio-mcp', 'page.js')).read()})
c.call('Page.addScriptToEvaluateOnNewDocument', {'source': "try{localStorage.setItem('provident-theme','light')}catch(e){};"
    "document.addEventListener('DOMContentLoaded',()=>{ if(/dc\\.html/.test(location.pathname) && !/share=/.test(location.hash)) {"
    " document.documentElement.classList.add('rs-on'); window.__guard=setInterval(()=>{ if(window.__keep!==false) document.documentElement.classList.add('rs-on'); },200);} });"})


def go(u, w=6): c.call('Page.navigate', {'url': u}); time.sleep(w)


def ev(js, t=90):
    try: return c.evaluate('(async()=>{' + js + '})()', t)
    except Exception as e: return 'ERR ' + str(e)


def sleep(ms): return 'await new Promise(r=>setTimeout(r,%d));' % ms


FIND = """function F(q){ if(q.startsWith('parent:')) { const e=F(q.slice(7)); return e&&e.parentElement; }
  if(q.startsWith('text:')){ const t=q.slice(5); return [...document.querySelectorAll('button,a,[role=tab],label,summary')].find(e=>e.offsetParent&&e.innerText.trim()===t)||[...document.querySelectorAll('button,a')].find(e=>e.offsetParent&&e.innerText.trim().indexOf(t)===0)||null; }
  return document.querySelector(q); }"""


def click(q, wait=1.2):
    r = ev(FIND + "const e=F(%s); if(!e) return 'no '+%s; e.click(); return 'ok';" % (json.dumps(q), json.dumps(q)))
    time.sleep(wait); return r


def scroll(q):
    ev(FIND + "const e=F(%s); if(e) e.scrollIntoView({block:'center'});" % json.dumps(q)); time.sleep(0.8)


def signin(who, route='#/'):
    go(B + '/dev-signin?as=' + TEAM.get(who, who) + '&go=' + route.replace('#', '%23'), 4)
    ev("if(location.hash!==%s) location.hash=%s; %s" % (json.dumps(route), json.dumps(route), sleep(2500)))


def hash_to(route, ms=3000): ev("location.hash=%s; %s window.scrollTo(0,0);" % (json.dumps(route), sleep(ms)))


def card(name):
    """a campaign's or post's page on Status, found by its name"""
    hash_to('#/status', 3000)
    return ev("const a=[...document.querySelectorAll('a.cd')].find(a=>a.innerText.indexOf(%s)>=0); return a?a.getAttribute('href'):null;" % json.dumps(name))


def drop(sel):
    if not ARGS.photo: return 'no photo'
    data = base64.b64encode(open(ARGS.photo, 'rb').read()).decode()
    return ev("""const b=atob('%s'); const u=new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i);
      const f=new File([u],'photo.jpg',{type:'image/jpeg'}); const el=document.querySelector(%s); if(!el) return 'no target';
      const dt=new DataTransfer(); dt.items.add(f);
      for (const t of ['dragenter','dragover','drop']) el.dispatchEvent(new DragEvent(t,{bubbles:true,cancelable:true,dataTransfer:dt}));
      %s return 'dropped';""" % (data, json.dumps(sel), sleep(2500)), 60)


def openproj(text):
    """from the home's Projects, open the saved project whose card names it, into its editor"""
    go(B + '/index.html#/projects', 4)
    href = ev("for(let n=0;n<20&&!document.querySelector('a.rc');n++) " + sleep(300) + " const a=[...document.querySelectorAll('a.rc')].find(a=>a.innerText.indexOf(%s)>=0); return a?a.href:null;" % json.dumps(text))
    if not href: return 'no card for ' + text
    c.call('Page.navigate', {'url': href}); time.sleep(2)
    r = ''
    for _ in range(6):   # opening a saved project reloads the page once
        r = ev("""for(let n=0;n<80;n++){ const E=window.__ps&&__ps.eng(); if(E&&E.state&&(E.state.slides||E.state.variants)&&!/recent=/.test(location.hash)&&n>8) break; """ + sleep(250) + """ }
          const E=__ps.eng(); if(!E) return 'no engine';
          if(E.state.screen==='splash'){ E.upd(x=>{x.screen=E.constructor.workScreen?E.constructor.workScreen():'editor';return x}); """ + sleep(1500) + """ }
          window.__keep=false; clearInterval(window.__guard); document.documentElement.classList.remove('rs-on'); """ + sleep(1000) + """
          return 'screen '+__ps.eng().state.screen;""", 90)
        if not str(r).startswith('ERR'): return r
        time.sleep(2)
    return r


frames = json.load(open(FJ)) if os.path.exists(FJ) else {}
os.makedirs(OUT, exist_ok=True)


def want(*ids): return not ONLY or any(i in ONLY for i in ids)


def cap(fid, spots):
    if ONLY and fid not in ONLY: return
    ev("document.getAnimations && document.getAnimations().forEach(a=>{try{a.finish()}catch(e){}});"); time.sleep(0.5)
    sp = {}
    for k, q in spots.items():
        r = ev(FIND + "const e=F(%s); if(!e) return null; const b=e.getBoundingClientRect(); return [b.x,b.y,b.width,b.height];" % json.dumps(q))
        if isinstance(r, list) and r[2] > 2 and r[3] > 2:
            x, y = max(0, r[0]), max(0, r[1]); w, h = min(r[2], W - x), min(r[3], H - y)
            if h > 2: sp[k] = [round(x / W * 1000) / 10, round(y / H * 1000) / 10, round(w / W * 1000) / 10, round(h / H * 1000) / 10]
        else: print('   missing', fid, k, q)
    img = c.call('Page.captureScreenshot', {'format': 'webp', 'quality': 70})
    open(os.path.join(OUT, fid + '.webp'), 'wb').write(base64.b64decode(img['data']))
    frames[fid] = {'w': W, 'h': H, 'spots': sp}
    print(fid, sorted(sp))


try:
    if ARGS.seed:
        go(B + '/dev-seed', 3)
        print('seed:', str(ev("document.querySelector('button').click(); for(let i=0;i<120;i++){ " + sleep(500) + " if(/Post ·/.test(document.body.innerText)) break; } " + sleep(3000) + " return 'done';", 120)))
    if want('gate'):
        signin('designer'); click('.uh-me', .6); click('#mn-x', 3); go(B + '/index.html#/', 5)
        cap('gate', {'signin': 'text:Sign in with Google'})
    if want('home', 'home-list', 'home-desk', 'status', 'status-filter', 'status-list', 'item-cas', 'item-ticket', 'new', 'new-cas', 'projects', 'menu'):
        signin('designer'); time.sleep(2)
        cap('home', {'next': 'article.nx', 'flip': 'span.pgr', 'where': 'aside.hm-side section.pan', 'new': '#newbtn', 'nav': 'nav.uh-nav'})
        scroll('section.ib'); cap('home-list', {'also': 'section.ib'})
        scroll('section.desk'); cap('home-desk', {'desk': 'section.desk'})
        hash_to('#/status'); cap('status', {'board': '#bd', 'tools': '.sx-bar'})
        click('.pp .pb'); cap('status-filter', {'menu': '.pp > :not(button)'})
        click('.pp .pb', .5); click('text:List'); cap('status-list', {'list': '#bd'}); click('text:Board', .8)
        h = card('Palm Springs by Nakheel')
        if h: hash_to(h, 5000); cap('item-cas', {'head': 'header.rvd-h', 'phases': 'section.rvd-phc', 'aud': 'ul.rvd-auds > li'})
        h = card('Emaar Beachfront')
        if h: hash_to(h, 4500); cap('item-ticket', {'pick': 'text:Pick up'})
        hash_to('#/new', 2500); cap('new', {'ops': '.doors > a.door:last-child'})
        hash_to('#/new/cas'); cap('new-cas', {'form': '.rsp-body', 'aud': '.rsp-plan'})
        hash_to('#/projects'); cap('projects', {'grid': 'section.pj-s'})
        hash_to('#/', 2500); click('.uh-me', .8); cap('menu', {'menu': '#me-menu', 'theme': 'header.p-top button.p-ghost'})
    if want('access', 'access-roles', 'engine'):
        signin('admin', '#/access'); time.sleep(1.5)
        cap('access', {'req': 'ul.ac-reqs > li', 'pv': '.ac-pv'})
        click('[data-ac=tab][data-v=roles]', 1.5); cap('access-roles', {'table': '.ac-rl-wrap'})
        hash_to('#/engine', 6000); cap('engine', {'prod': '#eg-now'})
    if want('home-ct', 'ct-link', 'pm-link'):
        signin('designer')
        h = card('Palm Springs by Nakheel'); hash_to(h, 5000)
        links = ev("return [...document.querySelectorAll('.rvd-lks li')].map(li=>{const a=li.querySelector('a[href*=\"share=\"]'); return a?a.getAttribute('href'):null;});") or []
        ct, pm = (links + [None, None, None])[1:3]
        signin('cten'); time.sleep(1.5); cap('home-ct', {'next': 'article.nx'})
        if ct and want('ct-link'): go(ct if ct.startswith('http') else B + '/' + ct, 14); cap('ct-link', {'words': '.as-nav'})
        if pm and want('pm-link'): signin('pm'); go(pm if pm.startswith('http') else B + '/' + pm, 14); cap('pm-link', {'bar': '.as-bar', 'dl': '.rvh'})
    if want('home-smm'):
        signin('smm'); time.sleep(1.5); cap('home-smm', {'next': 'article.nx'})
    if want('cas-design', 'cas-allvar', 'cas-share'):
        signin('designer'); print(openproj('Samana Collecta')); print(drop('.p-droprow image-slot'))
        ev("const r=[...document.querySelectorAll('button.ol-b')]; if(r[1]) r[1].click();"); time.sleep(1.2)
        cap('cas-design', {'rail': 'section.ol', 'add': 'section.lt', 'comp': '.p-sec', 'layout': 'div.lw', 'pct': '.p-meta', 'plates': '.p-plate', 'step': '.p-flow', 'brand': 'parent:text:Unbranded'})
        click('text:All variants', 1.5); cap('cas-allvar', {'panel': 'parent:text:Single'})
        ev("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));"); time.sleep(.6)
        click('.p-share button', 1.5); cap('cas-share', {'panel': 'parent:text:JPEG'})
    if want('ops-start'):
        signin('designer'); go(B + '/Provident%20Organic%20Studio.dc.html#view=new', 7)
        ev("window.__keep=false; clearInterval(window.__guard); document.documentElement.classList.remove('rs-on');"); time.sleep(.8)
        cap('ops-start', {'name': '.pp3-namew', 'who': '.pp3-flow', 'tpl': '.pp3-th'})
    if want('ops-guided', 'ops-all', 'ops-share'):
        signin('designer'); print(openproj('Top Agents of October')); print(drop('image-slot[id^="smp-bg"]'))
        click('text:Guided', 2); cap('ops-guided', {'form': '.gd-askwrap', 'next': 'text:Next', 'step': '.p-flow', 'pages': '.p-cvbar'})
        click('text:All controls', 2); cap('ops-all', {'switch': '.p-seg', 'pages': '.sn-list', 'form': '.gd-askwrap'})
        click('.p-share button', 1.5); cap('ops-share', {'panel': 'parent:text:JPEG'})
    if want('casv'):
        go(ARGS.casv + '/Provident%20Video%20Studio.html', 6)
        if not ev("return document.querySelectorAll('#libList .vs-t').length"): print(drop('#cvw')); time.sleep(3)
        click('text:Text', 1.2); cap('casv', {'top': 'header.p-top', 'lib': 'aside.vs-rail', 'tl': '#tl', 'insp': '#insp'})
finally:
    json.dump(frames, open(FJ, 'w'), indent=1, sort_keys=True)
    c.close()
