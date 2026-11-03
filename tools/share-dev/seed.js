/* seed.js — demo data for the LOCAL test server (tools/share-dev/serve.py, page /dev-seed).
 *
 * Fills the Drive stand-in and the in-memory access store with campaigns and posts at every
 * stage, so each page of the home (Home, Status, an item's page, Projects, Access) has something
 * on it to look at and annotate. It writes through share-link.js's own Drive kit
 * (window.providentDsKit), so the files are exactly what the studios would have made.
 *
 * Runs only on localhost: on any other host it does nothing.
 */
(function () {
  'use strict';
  if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) { document.body.textContent = 'The demo data is for the local test server only.'; return; }

  const O = location.origin, ROOT = window.SEED_ROOT, ADMIN = window.SEED_ADMIN;
  const say = t => { const p = document.createElement('li'); p.textContent = t; document.getElementById('log').appendChild(p); };
  const H = 3600e3, D = 24 * H, now = Date.now(), ago = ms => now - ms;
  const K = () => window.providentDsKit;

  // the team, with names (the access store learns a name at each person's first sign-in)
  const TEAM = {
    admin: { email: ADMIN, name: 'Kelvin Inigo' },
    d1: { email: 'exec4.graphics@providentestate.com', name: 'Aisha Rahman' },
    d2: { email: 'exec5.graphics@providentestate.com', name: 'Marco Santos' },
    smm: { email: 'exec10.media@providentestate.com', name: 'Layla Haddad' },
    cten: { email: 'exec1.content@providentestate.com', name: 'Priya Nair' },
    ctar: { email: 'exec2.content@providentestate.com', name: 'Omar Khalil' },
    pm: { email: 'digitalmarketing.lead1@providentestate.com', name: 'Dennis Bugos' }
  };
  const tok = p => ({ at: 'dev:' + p.email + ':' + p.name, exp: now + 365 * D });
  const signAs = p => { localStorage.setItem('provident-drive-tok', JSON.stringify(tok(p))); localStorage.setItem('provident-drive-who', JSON.stringify({ email: p.email, name: p.name })); };
  async function acc(op, p, body) {
    const r = await fetch(O + '/api/share?op=' + op, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ tok: tok(p).at }, body || {})) });
    return r.ok ? r.json() : null;
  }

  // ── pictures: the studios' own template previews, cut to each format ──────────────────────
  const IMG = {};
  const load = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  async function thumb(src, ratio, tint) {
    const im = IMG[src] || (IMG[src] = await load('/preview/' + src + '.webp'));
    const h = 400, w = Math.round(h * ratio), c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    if (im) { const s = Math.max(w / im.width, h / im.height), dw = im.width * s, dh = im.height * s; x.drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh); }
    if (tint) { x.fillStyle = tint; x.globalAlpha = .22; x.fillRect(0, 0, w, h); x.globalAlpha = 1; }
    return c.toDataURL('image/jpeg', .82);
  }

  // ── a project file: what dsProject / addProject write, with a summary and a preview ───────
  async function project(folder, app, name, rid, by, at, th, sum) {
    const k = K(), pid = 'p' + k.dsRand(14).toLowerCase();
    const ext = app === 'provident-ad-studio' ? '.adstudio.json' : '.smpstudio.json';
    const doc = { app, state: { pid }, images: {}, review: { meta: { app, name, by: by.name, created: at }, rev: 3, imgs: {}, rid,
      sum: Object.assign({ updated: at + 2 * H, pid }, sum || {}), thumb: th, thumbAt: at + 2 * H,
      log: [{ by: by.name, at, burst: '', changes: [{ kind: 'note', text: 'Shared the project' }], rev: 1 },
            { by: by.name, at: at + 2 * H, burst: '', changes: [{ kind: 'note', text: 'Changed the headline' }], rev: 3 }] } };
    const f = await k.dsCreate(folder, k.dsSafe(name) + ext, k.dsJson(doc));
    return { sid: 'D' + f.id, pid };
  }
  const step = (p, at) => p ? { by: p.name, at, em: p.email } : null;
  const to = (p, by, at) => p ? { email: p.email, name: p.name, by: by.name, at } : null;
  const entry = (p, at, text, page) => ({ by: p.name, at, burst: '', changes: [Object.assign({ kind: 'step', text }, page ? { page } : {})], rev: 0 });

  // ── campaigns ─────────────────────────────────────────────────────────────────────────────
  // stage per audience: 'plan' (no project yet), 'design', 'copy' (with the content team),
  // 'arb' (English approved, Arabic being made), 'arbcopy' (Arabic with the content team), 'done'
  const CAMPAIGNS = [
    { name: 'Rockefeller Tower', product: 'commercial', img: 'campaign-h', filed: 6 * H, by: 'pm', for: 'admin', deadline: 5,
      brief: 'Office floors in the first Rockefeller-branded tower outside the US. Lead with the name and the address on Sheikh Zayed Road; prices from AED 4,000 per sq ft. Two audiences: business owners buying to occupy, and investors.',
      cells: [['Local', 'Investor', true], ['International', 'Investor', false]] },
    { name: 'Emaar Beachfront · Sea Haven', product: 'residential', img: 'campaign-g', filed: 26 * H, by: 'pm', for: null, deadline: 9,
      brief: 'Sea Haven tower 3 launch. Private beach, 15 minutes to Dubai Marina. 1–3 bedrooms from AED 2.1M, 60/40 payment plan.',
      cells: [['Local', 'Family', true], ['Local', 'Investor', false]] },
    { name: 'Samana Collecta · The World', product: 'residential', img: 'campaign-d', filed: 4 * D, by: 'pm', deadline: 3, ph: 'launch',
      auds: [['Local', 'Family', 'ENG', 'design', 'admin'], ['Local', 'Investor', 'ENG', 'plan']], cells: [['Local', 'Family', true], ['Local', 'Investor', false]] },
    { name: 'Beyond · Beachfront Living', product: 'residential', img: 'campaign-f', filed: 5 * D, by: 'pm', deadline: 4,
      auds: [['Local', 'Family', 'ENG', 'copy', 'cten'], ['Local', 'Investor', 'ENG', 'design', 'd1']], cells: [['Local', 'Family', true], ['Local', 'Investor', false]] },
    { name: 'Sobha Hartland II', product: 'residential', img: 'campaign-g', filed: 8 * D, by: 'pm', deadline: 1,
      auds: [['International', 'Family', 'ENG', 'arb'], ['International', 'Family', 'ARB', 'arbcopy', 'ctar'], ['International', 'Investor', 'ENG', 'done']],
      cells: [['International', 'Family', true], ['International', 'Investor', false]] },
    { name: 'Damac Lagoons · Morocco', product: 'residential', img: 'campaign-h', filed: 12 * D, by: 'pm', deadline: -2,
      auds: [['Local', 'Family', 'ENG', 'done'], ['Local', 'Family', 'ARB', 'done'], ['Local', 'Investor', 'ENG', 'done']],
      cells: [['Local', 'Family', true], ['Local', 'Investor', false]] },
    { name: 'Ellington Belgrove Residences', product: 'residential', img: 'campaign-d', filed: 15 * D, by: 'pm', deadline: -6, unbranded: true,
      auds: [['International EUR', 'Investor', 'ENG', 'done'], ['International', 'Investor', 'ENG', 'done']],
      cells: [['International', 'Investor', false], ['International EUR', 'Investor', false]] }
  ];
  const SIZES = ['Feed 1:1', 'Portrait 4:5', 'Story 9:16', 'Horizontal 1.91:1'];
  const ymd = days => { const d = new Date(now + days * D); return d.toISOString().slice(0, 10); };

  async function campaign(c, i) {
    const k = K(), by = TEAM[c.by], at = ago(c.filed);
    const folder = await k.dsFolder(ROOT, c.name);
    const rs = { app: 'provident-ad-set', name: c.name, product: c.product, created: at, by: by.name, drive: 'https://drive.google.com/drive/folders/' + folder,
      folder, eng_only: {}, items: [], hist: [{ act: 'ticket', by: by.name, at }], log: [],
      plan: c.cells.map(x => ({ market: x[0], aud: x[1], arb: x[2] })),
      ticket: { brief: c.brief || 'Launch campaign. Brief in the Drive folder.', deadline: ymd(c.deadline), by: by.name, at, files: [], to: c.for ? { email: TEAM[c.for].email, name: TEAM[c.for].name } : null },
      phase0: 'launch', phases: ['launch'], brand: c.unbranded ? 'unbranded' : 'provident' };
    c.cells.forEach(x => { if (!x[2]) rs.eng_only[x[0] + '|' + x[1]] = true; });
    rs.log.push(entry(by, at, 'Filed the ticket' + (rs.ticket.to ? ' for ' + rs.ticket.to.name : '')));
    const f = await k.dsCreate(folder, k.dsSafe(c.name) + '_Adset.json', k.dsJson(rs)), rid = f.id, t = () => 'R' + k.dsRand(10) + '.' + rid;
    rs.rid = rid; rs.tok = { dd: t(), ct: t(), pm: t() };
    const designer = i % 2 ? TEAM.d1 : TEAM.admin;
    let tcur = at + 3 * H, lastThumb = '';
    for (const a of (c.auds || [])) {
      const [market, aud, lang, st, who] = a;
      if (st === 'plan') continue;
      if (!rs.picked) { rs.picked = { by: designer.name, at: tcur }; rs.log.push(entry(designer, tcur, 'Picked up the ticket')); }
      const label = market + ' · ' + aud + (lang === 'ARB' ? ' · Arabic' : '');
      const th = await thumb(c.img, [1, .8, .5625][(i + (lang === 'ARB' ? 1 : 0)) % 3] || 1, lang === 'ARB' ? '#c58b3a' : null);
      const p = await project(folder, 'provident-ad-studio', c.name + ' - ' + aud + (lang === 'ARB' ? ' (Arabic)' : ''), rid, designer, tcur, th,
        { campaign: c.name, mode: 'single', variants: 2, sizes: SIZES.slice(0, 3 + (i % 2)), comps: 5, brand: rs.brand });
      lastThumb = th;
      const designDone = st !== 'design', copyDone = st === 'done' || st === 'arb' || (lang === 'ENG' && st === 'arbcopy');
      const it = { sid: p.sid, market, aud, lang, phase: 'launch', added: tcur, by: designer.name,
        design: designDone ? step(designer, tcur + 20 * H) : null,
        copy: copyDone ? step(lang === 'ARB' ? TEAM.ctar : TEAM.cten, tcur + 30 * H) : null,
        to: !designDone ? to(TEAM[who || 'admin'], designer, tcur) : (!copyDone ? to(TEAM[who || (lang === 'ARB' ? 'ctar' : 'cten')], designer, tcur + 20 * H) : null) };
      rs.items.push(it);
      rs.hist.push({ act: 'add', by: designer.name, at: tcur, sid: p.sid });
      rs.log.push(entry(designer, tcur, 'Added ' + label));
      if (designDone) rs.log.push(entry(designer, tcur + 20 * H, lang === 'ARB' ? 'Arabic laid out, ready for the translation check' : 'Marked the design done', label));
      if (copyDone) rs.log.push(entry(lang === 'ARB' ? TEAM.ctar : TEAM.cten, tcur + 30 * H, lang === 'ARB' ? 'Approved the translation' : 'Approved the English copy', label));
      tcur += 9 * H;
    }
    if (lastThumb) rs.thumb = lastThumb;
    await k.dsWrite(rid, rs);
    say('Campaign · ' + c.name + (c.auds ? ' (' + c.auds.length + ' audiences)' : ' (ticket)'));
    return { rs, folder };
  }

  // ── posts ─────────────────────────────────────────────────────────────────────────────────
  // k: 0 draft, 1 design, 2 copy check, 3 ready
  const POSTS = [
    { name: 'Just Listed · Palm Jumeirah villa', tpl: 'listed', img: 'organic-listed', k: 0, made: 3 * H, deadline: 2, brief: 'Signature villa on Frond G, 6 bedrooms, AED 38M. Hero the sea view.' },
    { name: 'Top Agents of October', tpl: 'agents', img: 'organic-agents', k: 1, made: 20 * H, deadline: 1, brief: 'Monthly ranking. Primary and secondary teams, top three each.' },
    { name: 'Reel thumbnail · The Golden Rule', tpl: 'rcover', img: 'organic-weekly', k: 1, made: 2 * D, deadline: 3, brief: 'Cover for the Golden Rule reel with Khalid.' },
    { name: 'Golden Visa success story', tpl: 'carousel', img: 'organic-review', k: 2, made: 3 * D, deadline: 0, brief: 'Five visas, five days: the Prism family story. Carousel, four pages.' },
    { name: 'Weekly new listings', tpl: 'weekly', img: 'organic-weekly', k: 2, made: 4 * D, deadline: 1, brief: 'Six new listings this week, Downtown and Marina.' },
    { name: 'Award · Emaar top broker 2026', tpl: 'award', img: 'organic-award', k: 3, made: 6 * D, deadline: -1, brief: 'Emaar named Provident a top broker for 2026.' },
    { name: 'Market update · Q3 rents', tpl: 'carousel', img: 'organic-review', k: 3, made: 9 * D, deadline: -4, brief: 'Rents up 11% year on year; three charts.' }
  ];
  async function post(p, i) {
    const k = K(), by = TEAM.smm, at = ago(p.made);
    const folder = await k.dsFolder(ROOT, k.dsSafe(p.name));   // as makePost: one folder per post in the posts root
    const rs = { app: 'provident-post', kind: 'post', name: p.name, created: at, by: by.name, folder, drive: 'https://drive.google.com/drive/folders/' + folder,
      tpl: p.tpl, items: [], hist: [{ act: 'ticket', by: by.name, at }], log: [entry(by, at, 'Started the post', 'Post')],
      ticket: { brief: p.brief, deadline: ymd(p.deadline), by: by.name, at, files: [] } };
    const f = await k.dsCreate(folder, k.dsSafe(p.name) + '_Post.json', k.dsJson(rs));
    rs.rid = f.id; rs.tok = { dd: 'R' + k.dsRand(10) + '.' + f.id };
    const th = await thumb(p.img, p.tpl === 'rcover' ? .5625 : .75);
    const pr = await project(folder, 'provident-smp-studio', p.name, f.id, by, at + H, th, { pages: p.tpl === 'carousel' ? 4 : 1, tpl: p.tpl });
    const designer = i % 2 ? TEAM.d1 : TEAM.admin;
    const it = { sid: pr.sid, added: at + H, by: by.name,
      draft: p.k > 0 ? step(by, at + 2 * H) : null,
      design: p.k > 1 ? step(designer, at + 10 * H) : null,
      copy: p.k > 2 ? step(TEAM.cten, at + 20 * H) : null,
      to: p.k === 1 ? to(designer, by, at + 2 * H) : p.k === 2 ? to(TEAM.cten, designer, at + 10 * H) : null };
    rs.items.push(it);
    rs.log.push(entry(by, at + H, 'Started the design', 'Post'));
    if (p.k > 0) rs.log.push(entry(by, at + 2 * H, 'Sent the draft to the designer → ' + designer.name, 'Post'));
    if (p.k > 1) rs.log.push(entry(designer, at + 10 * H, 'Sent it to the copy check → ' + TEAM.cten.name, 'Post'));
    if (p.k > 2) rs.log.push(entry(TEAM.cten, at + 20 * H, 'Approved the copy', 'Post'));
    await k.dsWrite(f.id, rs);
    say('Post · ' + p.name + ' (' + ['Draft', 'Design', 'Copy check', 'Ready'][p.k] + ')');
    return { rs, th, pid: pr.pid };
  }

  // ── this computer's saved projects (the home's Projects page and Pick up) ────────────────
  function idb() {
    return new Promise((res, rej) => {
      const q = indexedDB.open('provident-design-studio');
      q.onupgradeneeded = () => { if (!q.result.objectStoreNames.contains('files')) q.result.createObjectStore('files'); };
      q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
    });
  }
  async function idbPut(key, fn) {
    const d = await idb();
    if (!d.objectStoreNames.contains('files')) { d.close(); return; }
    const cur = await new Promise(res => { const g = d.transaction('files').objectStore('files').get(key); g.onsuccess = () => res(g.result); g.onerror = () => res(null); });
    let list = cur; if (typeof cur === 'string') { try { list = JSON.parse(cur); } catch (e) { list = []; } }
    const next = fn(Array.isArray(list) ? list : []);
    await new Promise(res => { const t = d.transaction('files', 'readwrite'); t.objectStore('files').put(typeof cur === 'string' ? JSON.stringify(next) : next, key); t.oncomplete = res; t.onerror = res; });
    d.close();
  }
  const recent = (name, th, ts, pages) => { const pid = 'pseed' + Math.random().toString(36).slice(2, 12); return { pid, name, ts, saved: true, seed: true, thumbs: pages ? Array(pages).fill(th) : [th], state: { pid } }; };

  async function run() {
    const btn = document.getElementById('go'); btn.disabled = true; btn.textContent = 'Filling…';
    try {
      // 1. the team signs in once each, so the pickers and the logs carry real-looking names
      for (const p of Object.values(TEAM)) await acc('accme', p);
      say('Team named: ' + Object.values(TEAM).map(p => p.name).join(', '));
      // 2. people asking to get in, and one account from outside
      const asks = [{ email: 'sara.mendes@providentestate.com', name: 'Sara Mendes', want: 'designer', note: 'New motion designer, starting Monday on the Emaar account.' },
                    { email: 'james.okafor@providentestate.com', name: 'James Okafor', want: 'pm', note: 'Performance marketing, Q4 launches.' },
                    { email: 'nadia.farouk@providentestate.com', name: 'Nadia Farouk', want: 'cten', note: '' }];
      for (const a of asks) { await acc('accme', a); if (a.note || a.want) await acc('accreq', a, { note: a.note, want: a.want }); }
      await acc('accme', { email: 'mark.lee@gmail.com', name: 'Mark Lee' });
      say('Access: 3 requests waiting, 1 outside account turned away');
      // 3. Drive, as the admin
      signAs(TEAM.admin);
      localStorage.setItem('provident-share-base', O); localStorage.setItem('provident-drive-base', O);
      localStorage.setItem('provident-status-root', ROOT); localStorage.setItem('provident-posts-root', ROOT);
      const cs = []; for (let i = 0; i < CAMPAIGNS.length; i++) cs.push(await campaign(CAMPAIGNS[i], i));
      const ps = []; for (let i = 0; i < POSTS.length; i++) ps.push(await post(POSTS[i], i));
      // 4. saved projects on this computer, for Projects and Pick up where you left off
      const t = n => now - n * H;
      const camp = [
        recent('Samana Collecta · The World - Family (English)', await thumb('campaign-d', 1), t(1)),
        recent('Beyond · Beachfront Living - Investor (English)', await thumb('campaign-f', 1), t(5)),
        recent('Beyond · Beachfront Living - Family (English)', await thumb('campaign-f', 1, '#20304f'), t(26)),
        recent('Sobha Hartland II - Family (Arabic)', await thumb('campaign-g', 1, '#c58b3a'), t(30)),
        recent('Damac Lagoons · Morocco - Investor (English)', await thumb('campaign-h', 1), t(80)),
        recent('Ellington Belgrove Residences - Investor (English)', await thumb('campaign-d', 1, '#2b2b2b'), t(150))
      ];
      const org = [
        recent('Carousel_Golden Visa success story', ps[3].th, t(2), 4),
        recent('Reel Thumbnail_The Golden Rule', ps[2].th, t(7)),
        recent('Top Agents of October', ps[1].th, t(20)),
        recent('Carousel_Weekly new listings', ps[4].th, t(28), 6),
        recent('Award_Emaar top broker 2026', ps[5].th, t(100)),
        recent('Carousel_Market update Q3 rents', ps[6].th, t(200), 3)
      ];
      await idbPut('recents:campaign', l => camp.concat(l.filter(r => !r.seed)));
      await idbPut('recents:organic', l => org.concat(l.filter(r => !r.seed)));
      say('Saved projects on this computer: ' + camp.length + ' campaign, ' + org.length + ' organic');
      // the Content Hub stand-in (serve.py, the hub's own paths): OPS's Import hub, which Status reads
      localStorage.setItem('provident-ops-endpoint', JSON.stringify({ url: O + '/api/imports', key: 'dev-hub-token' }));
      ['provident-ep-office:', 'provident-ep-ngrok:'].forEach(f => localStorage.setItem(f + 'provident-ops-endpoint', '1'));   // OPS keeps this address
      say('Content Hub stand-in: 5 design jobs, one in each state');
      // the home reads these afresh
      ['provident-inbox-cas', 'provident-inbox-ops', 'provident-inbox-hub', 'provident-status-sum', 'provident-acc-me', 'provident-rv-arch', 'provident-posts'].forEach(x => localStorage.removeItem(x));
      sessionStorage.clear();
      btn.textContent = 'Done — open the home';
      btn.disabled = false; btn.onclick = () => { location.href = '/index.html#/'; };
      if (/[?&]auto\b/.test(location.search)) location.href = '/index.html#/';
      say('Done. Signed in as the admin; /dev-signin switches person.');
    } catch (e) {
      say('Stopped: ' + (e && e.message || e)); btn.disabled = false; btn.textContent = 'Try again';
      console.error(e);
    }
  }
  document.getElementById('go').addEventListener('click', run, { once: true });
  // ?auto runs it on load, for a browser that cannot be clicked from a script (Safari)
  if (/[?&]auto\b/.test(location.search)) run();
})();
