// SHARED EDIT LINKS — one copy for both studios, loaded after studio-base.js.
//
// Share › "Copy edit link" puts the open project on the site's share store (api/share.py)
// and hands back a link. Whoever opens it is asked their name, gets the project with its
// photos, and can change it; every change goes back to the store and reaches everyone else
// on the link within a few seconds. The Changes panel on the right says who changed what.
//
// THE PROJECT IS STILL THE STATE. A save sends the state with the per-tab keys left out
// (which slide is selected, which screen is open), and the photos one at a time, split
// into parts. Two people editing at once are merged field by field against the last state
// both saw (merge3); only an edit to the very same field is decided by whoever saved last.
// Undo stays local and is cleared when someone else's change lands.
//
// WHICH PROJECT A TAB IS SHARING lives in sessionStorage (per tab, survives the reloads the
// studios do on purpose) with the project's pid. A tab that opens another project — a new
// one, a recent, a template — has a different pid, so the link simply stops there. That is
// what makes it impossible for a new project to be saved over a shared one.
(function () {
  'use strict';
  const PUBLIC = 'https://provident-design-studio.vercel.app';
  const PART = 900000;              // characters per photo part — well under a request's 4.5 MB
  const POLL = 12000, DEBOUNCE = 2500, BURST = 90000;
  const NAME_KEY = 'provident-share-name';
  // Per-tab keys: never sent, never overwritten by someone else's save.
  const LOCAL = ['sel', 'focusSz', 'screen', 'exportStatus', 'activeVi', 'activeSi', 'exportMenuOpen', 'exportKind',
    'storyOn', 'rcvGuide', 'gdStep', 'gdAsk', 'hubPost', 'mockMode'];
  const SP = StudioBase.prototype;

  // ---------- small helpers ----------
  // Key order is not a change: the studios' load and normalise steps rebuild objects, so the
  // same project can come back with its keys in another order. Every comparison is canonical.
  function canon(v) {
    if (Array.isArray(v)) return '[' + v.map(x => x === undefined ? 'null' : canon(x)).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
    return v === undefined ? 'null' : JSON.stringify(v);
  }
  const jsonEq = (a, b) => a === b || canon(a) === canon(b);
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  const idArr = a => Array.isArray(a) && a.length > 0 && a.every(x => isObj(x) && x.id != null) && new Set(a.map(x => String(x.id))).size === a.length;
  // THREE-WAY MERGE: what I changed since `b` wins where I changed it, what they changed wins
  // everywhere else. Lists of things with ids (slides, components, variants' mods) merge by
  // id, so one person adding a page while another retypes a headline keeps both.
  function merge3(b, m, t) {
    if (jsonEq(m, b)) return t;
    if (jsonEq(t, b) || jsonEq(m, t)) return m;
    if (isObj(b) && isObj(m) && isObj(t)) {
      const out = {};
      new Set(Object.keys(m).concat(Object.keys(t))).forEach(k => {
        const r = merge3(b[k], m[k], t[k]);
        if (r !== undefined) out[k] = r;
      });
      return out;
    }
    if ((Array.isArray(b) || b === undefined) && idArr(m) && idArr(t) && (b === undefined || b.length === 0 || idArr(b))) {
      const B = {}, M = {}, T = {};
      (b || []).forEach(x => { B[x.id] = x; }); m.forEach(x => { M[x.id] = x; }); t.forEach(x => { T[x.id] = x; });
      const bo = (b || []).map(x => String(x.id)), mo = m.map(x => String(x.id)), to = t.map(x => String(x.id));
      const order = !jsonEq(mo, bo) ? mo.slice() : to.slice();
      mo.concat(to).forEach(id => { if (order.indexOf(id) < 0) order.push(id); });
      const out = [];
      order.forEach(id => {
        const inB = id in B, inM = id in M, inT = id in T;
        if (inB && (!inM || !inT)) return;              // deleted on one side
        const r = merge3(B[id], M[id], T[id]);
        if (r !== undefined) out.push(r);
      });
      return out;
    }
    if (Array.isArray(b) && Array.isArray(m) && Array.isArray(t) && b.length === m.length && m.length === t.length) {
      return m.map((x, i) => merge3(b[i], x, t[i]));
    }
    return m;
  }
  StudioBase.merge3 = merge3;
  function fnv(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(36) + s.length.toString(36);
  }
  const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const clip = (t, n) => { t = String(t == null ? '' : t).replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
  function ago(ms) {
    const s = Math.max(0, (Date.now() - ms) / 1000);
    if (s < 45) return 'just now';
    if (s < 3600) return Math.round(s / 60) + ' min ago';
    const d = new Date(ms), t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (s < 86400 && new Date().getDate() === d.getDate()) return 'today ' + t;
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + t;
  }
  const IS = () => customElements.get('image-slot');
  function lsGet(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function ssGet(k) { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function ssSet(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) {}
    try {
      const a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(a); a.select(); const ok = document.execCommand('copy'); a.remove(); return ok;
    } catch (e) { return false; }
  }

  // Where the share store answers. The Vercel site uses its own origin; a studio opened
  // anywhere else (a local server, the iOS shell) talks to the public site, so the link it
  // makes opens for everyone. localStorage['provident-share-base'] overrides both, which is
  // how tools/share-dev/serve.py is tested.
  StudioBase.shareBase = function () {
    const o = lsGet('provident-share-base');
    if (/^https?:\/\/[^/]+$/.test(o)) return o;
    if (/\.vercel\.app$/.test(location.hostname)) return location.origin;
    return PUBLIC;
  };
  StudioBase.shareName = () => lsGet(NAME_KEY) || lsGet('adstudio-author') || '';

  SP.shApp = function () { return this.sessionApp(); };
  SP.shKey = function (s) { return 'provident-share' + (s || '') + ':' + this.shApp(); };
  SP.shSpec = function () { return StudioBase.SESSIONS[this.shApp()]; };
  SP.shLink = function (id) {
    const sp = this.shSpec();
    return StudioBase.shareBase() + '/' + encodeURIComponent(sp ? sp.file : '') + '#share=' + id;
  };
  async function api(op, q, body, raw) {
    let u = StudioBase.shareBase() + '/api/share?op=' + op;
    Object.keys(q || {}).forEach(k => { u += '&' + k + '=' + encodeURIComponent(q[k]); });
    const opt = { cache: 'no-store' };
    if (body !== undefined) { opt.method = 'POST'; opt.headers = { 'Content-Type': raw ? 'text/plain' : 'application/json' }; opt.body = raw ? body : JSON.stringify(body); }
    let r;
    try { r = await fetch(u, opt); }
    catch (e) { const er = new Error('The share store could not be reached — check the connection and try again.'); er.net = true; throw er; }
    if (op === 'chunk' && r.ok) return r.text();
    let d = null; try { d = await r.json(); } catch (e) {}
    if (r.status === 409) { const er = new Error('stale'); er.stale = true; er.rev = d && d.rev; throw er; }
    if (!r.ok) throw new Error((d && d.error) || ('The share store answered HTTP ' + r.status + '.'));
    return d;
  }

  // ---------- what is shared ----------
  SP.shPub = function (st) {
    const o = Object.assign({}, st || this.state);
    LOCAL.forEach(k => { delete o[k]; });
    delete o.share;
    return JSON.parse(JSON.stringify(o));
  };
  SP.shLocal = function () {
    const st = this.state, out = {};
    LOCAL.forEach(k => { if (k in st) out[k] = st[k]; });
    return out;
  };
  SP.shSlots = function () {
    const sp = this.shSpec(), C = IS();
    if (!sp || !C || !C.slotIds) return [];
    return C.slotIds().filter(id => sp.prefix.test(id));
  };

  // A project's WORDS (field by field, named the way the studio names them) and its other
  // PARTS (each page's design, the project's settings), so a save can say what it changed.
  SP.shShape = function (s) {
    const C = this.constructor, words = {}, parts = {};
    s = s || {};
    if (this.shApp() === 'provident-ad-studio') {
      try {
        const flat = C.copyFlat(C.copySnap(s, 'draft'));
        Object.keys(flat).forEach(k => { words[k] = flat[k]; });
      } catch (e) {}
      words['name'] = { page: '', label: 'Campaign name', value: String(s.campaign || '') };
      const blank = list => (list || []).map(m => { const c = Object.assign({}, m); delete c.text; delete c.sub; delete c.chips; delete c.cols; return c; });
      const car = s.adMode === 'carousel';
      (s.variants || []).forEach((v, i) => {
        const c = Object.assign({}, v); if (c.mods) c.mods = blank(c.mods);
        parts['v' + i] = { label: car ? 'Page ' + (i + 1) : (i ? 'Variant ' + (i + 1) : 'Master'), j: canon(c) };
      });
      parts['mods'] = { label: 'Components', j: canon(blank(s.modules)) };
      const rest = Object.assign({}, s); ['variants', 'modules', 'campaign', 'copyLog', 'pid'].forEach(k => { delete rest[k]; });
      parts['proj'] = { label: 'Project settings', j: canon(rest) };
    } else {
      const lab = this.shSlideLabels();
      (s.slides || []).forEach((sl, si) => {
        const page = lab[sl.id] || ('Page ' + (si + 1)), f = sl.f || {}, rowDef = (C.FIELDS && C.FIELDS[sl.kind]) || [];
        const keys = [];
        rowDef.forEach(r => {
          const k = r[0], v = f[k]; keys.push(k);
          words[sl.id + ':' + k] = { page, label: r[2], value: Array.isArray(v) ? v.join(' · ') : (v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v))) };
        });
        if (Array.isArray(f.rows)) {
          keys.push('rows');
          words[sl.id + ':rows'] = { page, label: 'Rows', value: f.rows.map(r => Object.keys(r || {}).map(x => r[x]).filter(Boolean).join(' ')).filter(Boolean).join(' / ') };
        }
        const ff = Object.assign({}, f); keys.forEach(k => { delete ff[k]; });
        parts['s' + sl.id] = { label: page, j: canon(Object.assign({}, sl, { f: ff })), kind: sl.kind };
      });
      const rest = Object.assign({}, s); ['slides', 'pid'].forEach(k => { delete rest[k]; });
      parts['proj'] = { label: 'Post settings', j: canon(rest) };
    }
    return { words, parts };
  };
  SP.shSlideLabels = function () {
    const out = {};
    (this.state.slides || []).forEach((sl, si) => { try { out[sl.id] = this.sLabel(si); } catch (e) { out[sl.id] = 'Page ' + (si + 1); } });
    return out;
  };
  SP.shSlotLabel = function (id) {
    let m;
    if (this.shApp() === 'provident-ad-studio') {
      const car = this.state.adMode === 'carousel', vl = i => car ? 'Page ' + (i + 1) : (i ? 'Variant ' + (i + 1) : 'Master');
      const SZ = { st: ' (9:16)', ls: ' (1.91:1)', bn: ' (banner)', pt: ' (3:4)', pf: ' (Portrait Fix)' };
      if ((m = /^adstudio-bg-(\d+)(?:-(\w+))?$/.exec(id))) return { page: vl(+m[1]), label: 'Photo' + (SZ[m[2]] || '') };
      if ((m = /^adstudio-fg-(\d+)/.exec(id))) return { page: vl(+m[1]), label: 'Cut-out' };
      if (id === 'adstudio-colog') return { page: '', label: 'Partner logo' };
      if (/^adstudio-qr/.test(id)) return { page: '', label: 'QR code' };
      if (/^adstudio-ic-/.test(id)) return { page: '', label: 'Icon' };
      return { page: '', label: 'Graphic' };
    }
    const lab = this.shSlideLabels();
    if ((m = /^smp-bg-(.+)$/.exec(id))) return { page: lab[m[1]] || '', label: 'Photo' };
    if ((m = /^smp-fg-(.+)$/.exec(id))) return { page: lab[m[1]] || '', label: 'Cut-out' };
    if ((m = /^smp-qr-?(.*)$/.exec(id))) return { page: lab[m[1]] || '', label: 'QR code' };
    if (/^smp-agent/.test(id)) return { page: '', label: 'Agent photo' };
    if (/^smp-ic-/.test(id)) return { page: '', label: 'Icon' };
    return { page: '', label: 'Picture' };
  };
  SP.shDiff = function (a, b) {
    const A = this.shShape(a), B = this.shShape(b), out = [];
    // a word on a page that was itself added or removed is said by that page's own line
    const pageOf = k => { const i = k.indexOf(':'); return i > 0 ? 's' + k.slice(0, i) : ''; };
    const gone = (P, k) => { const p = pageOf(k); return p && /^s/.test(p) && !P[p] && (A.parts[p] || B.parts[p]); };
    Object.keys(B.words).forEach(k => {
      const x = A.words[k], y = B.words[k];
      if (!x) { if (y.value && !gone(A.parts, k)) out.push({ kind: 'added', page: y.page, label: y.label, was: '', now: y.value }); }
      else if (x.value !== y.value) out.push({ kind: x.value ? (y.value ? 'changed' : 'removed') : 'added', page: y.page, label: y.label, was: x.value, now: y.value });
    });
    Object.keys(A.words).forEach(k => {
      const x = A.words[k];
      if (!B.words[k] && x.value && !gone(B.parts, k)) out.push({ kind: 'removed', page: x.page, label: x.label, was: x.value, now: '' });
    });
    Object.keys(B.parts).forEach(k => {
      const x = A.parts[k], y = B.parts[k];
      if (!x) out.push({ kind: 'note', page: '', text: 'Added ' + y.label });
      else if (x.j !== y.j) out.push({ kind: 'design', page: y.label,
        text: x.kind && y.kind && x.kind !== y.kind ? 'Changed the layout' : (k === 'proj' ? 'Changed a setting' : (k === 'mods' ? 'Changed the components' : 'Changed the design')) });
    });
    Object.keys(A.parts).forEach(k => { if (!B.parts[k]) out.push({ kind: 'note', page: '', text: 'Removed ' + A.parts[k].label }); });
    return out;
  };

  // ---------- opening a link ----------
  // Called from both shells' componentDidMount.
  SP.shareInit = function () {
    injectCss();
    const m = /^#share=([A-Za-z0-9]{8,16})$/.exec(location.hash || '');
    if (m) {
      history.replaceState(null, '', location.pathname + location.search);
      const b = ssGet(this.shKey());
      if (b && b.id === m[1] && b.pid && b.pid === this.state.pid) { this.shareStart(); return true; }
      this.shareOpenLink(m[1]);
      return true;
    }
    const b = ssGet(this.shKey());
    if (b && b.id && b.pid && b.pid === this.state.pid) this.shareStart();
    const ab = ssGet(AS_KEY);
    if (ab && ab.id && this.shApp() === 'provident-ad-studio') setTimeout(() => AdSets.resume(this.host, ab.id), 0);
    return false;
  };
  SP.shareOpenLink = async function (id) {
    const dlg = nameDialog({ title: 'Open a shared project', lead: 'Loading the project…', btn: 'Open', busy: true });
    let d;
    try { d = await api('get', { id }); }
    catch (e) { dlg.fail(e.message, 'Close'); return; }
    const meta = d.meta || {};
    if (meta.app === ADSETS) {
      if (this.shApp() !== 'provident-ad-studio') { dlg.close(); goCas(id); return; }
      dlg.close(); AdSets.join(this.host, id, d); return;
    }
    const T = StudioBase.SESSIONS, spec = T[meta.app];
    if (!spec || !d.state) { dlg.fail('This link does not hold a studio project.', 'Close'); return; }
    dlg.ready({
      lead: '<b>' + esc(meta.name || 'Untitled project') + '</b> · shared by ' + esc(meta.by || 'someone') + ' in ' + esc(spec.label) +
        '. Anyone with this link can change it, and the Changes panel shows who changed what.',
      note: 'Your name is shown beside every change you make.'
    });
    const name = await dlg.name();
    if (!name) return;
    lsSet(NAME_KEY, name);
    const slots = Object.keys(d.imgs || {});
    const images = {};
    let done = 0;
    dlg.busy('Loading pictures' + (slots.length ? ' · 0 of ' + slots.length : '') + '…');
    try {
      await pool(slots, 3, async sl => {
        const rec = await fetchRec(id, d.imgs[sl]);
        if (rec) images[sl] = rec;
        done++; dlg.busy('Loading pictures · ' + done + ' of ' + slots.length + '…');
      });
    } catch (e) { dlg.fail(e.message, 'Close'); return; }
    const st = d.state;
    if (!st.pid) st.pid = StudioBase.newPid();
    if (meta.app === 'provident-smp-studio' && st.screen == null) st.screen = 'editor';
    const imgs = {}; slots.forEach(s => { if (images[s]) imgs[s] = d.imgs[s].h; });
    const key = 'provident-share:' + meta.app;
    ssSet(key, { id, rev: d.rev, n: d.n, pid: st.pid, imgs, name: meta.name || '' });
    ssSet('provident-share-base:' + meta.app, d.state);
    ssSet('provident-share-log:' + meta.app, { from: d.from, log: d.log || [] });
    dlg.close();
    const fname = String(meta.name || 'Shared project').replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 80) + '.json';
    this.loadSessionFile(new File([JSON.stringify({ app: meta.app, state: st, images })], fname, { type: 'application/json' }), { clean: true });
  };
  async function pool(items, n, fn) {
    let i = 0;
    const run = async () => { while (i < items.length) { const x = items[i++]; await fn(x); } };
    await Promise.all(Array.from({ length: Math.min(n, items.length) }, run));
  }
  async function fetchRec(id, e) {
    if (!e || !e.h || !e.n) return null;
    const parts = new Array(e.n);
    await pool(Array.from({ length: e.n }, (_, i) => i), 4, async i => { parts[i] = await api('chunk', { id, h: e.h, i }); });
    try { return JSON.parse(parts.join('')); } catch (e2) { return null; }
  }
  async function putRec(id, slot, rec, onPart) {
    const txt = JSON.stringify(rec), h = fnv(txt), n = Math.max(1, Math.ceil(txt.length / PART));
    for (let i = 0; i < n; i++) {
      await api('part', { id, h, i, n }, txt.slice(i * PART, (i + 1) * PART), true);
      if (onPart) onPart(i + 1, n);
    }
    return { h, n };
  }

  // ---------- making a link ----------
  SP.shareCreate = async function () {
    const b = this.shBind();
    if (b) { this.shareCopy(); return; }
    const dlg = nameDialog({ title: 'Share an edit link', btn: 'Make the link',
      lead: 'Anyone with the link can open this project, change it and see who changed what. There is no sign-in — share it only with people who should edit.',
      note: 'Your name is shown beside every change you make.' });
    const name = await dlg.name();
    if (!name) return;
    lsSet(NAME_KEY, name);
    dlg.busy('Uploading the project…');
    try {
      await this.ensurePid();
      const st = this.shPub();
      const r = await api('create', {}, { app: this.shApp(), name: this.shName(st), by: name, state: st });
      const slots = this.shSlots(), C = IS(), imgs = {}, map = {};
      let k = 0;
      for (const sl of slots) {
        const rec = C.getRec(sl);
        if (!rec || !rec.u) continue;
        k++;
        dlg.busy('Uploading pictures · ' + k + ' of ' + slots.length + '…');
        const e = await putRec(r.id, sl, rec);
        imgs[sl] = e.h; map[sl] = e;
      }
      let rev = r.rev;
      if (Object.keys(map).length) rev = (await api('save', { id: r.id }, { base: rev, state: st, by: name, imgs: map })).rev;
      ssSet(this.shKey(), { id: r.id, rev, n: 0, pid: this.state.pid, imgs, name: this.shName(st) });
      ssSet(this.shKey('-base'), st);
      ssSet(this.shKey('-log'), null);
      const link = this.shLink(r.id), copied = await copyText(link);
      dlg.done(link, copied);
      this.shareStart(true);
    } catch (e) { dlg.fail(e.message, 'Close'); }
  };
  SP.shName = function (st) {
    st = st || this.state;
    let n = '';
    try { n = this.projName(); } catch (e) {}
    if (!n || n === 'session') n = st.campaign || st.customName || '';
    return String(n || 'Untitled project').slice(0, 120);
  };
  SP.shBind = function () {
    const b = ssGet(this.shKey());
    return b && b.id && b.pid && b.pid === this.state.pid ? b : null;
  };
  SP.shareCopy = async function () {
    const b = this.shBind(); if (!b) return;
    const ok = await copyText(this.shLink(b.id));
    this.shFlash(ok ? 'Link copied' : 'Copy failed — the link is in the panel');
    this.shPanel(true);
  };
  SP.shareStop = function (keepBinding) {
    const S = this._sh; if (!S) return;
    clearInterval(S.tick); clearInterval(S.poll); clearInterval(S.clock);
    window.removeEventListener('image-slots-change', S.onSlot);
    document.removeEventListener('visibilitychange', S.onVis);
    if (S.ui) S.ui.root.remove();
    document.documentElement.classList.remove('shl-on', 'shl-open');
    this._sh = null;
    if (!keepBinding) { ssSet(this.shKey(), null); ssSet(this.shKey('-base'), null); ssSet(this.shKey('-log'), null); }
    this.forceUpdate();
  };

  // ---------- following the link ----------
  SP.shareStart = function (open) {
    if (this._sh) return;
    const b = ssGet(this.shKey()); if (!b) return;
    const lg = ssGet(this.shKey('-log')) || { from: 0, log: [] };
    const S = this._sh = {
      id: b.id, rev: b.rev || 0, n: b.n || 0, imgs: b.imgs || {}, name: b.name || '',
      base: ssGet(this.shKey('-base')) || this.shPub(), dirty: new Set(), applying: false,
      busy: false, lastS: '', lastT: 0, burst: null, from: lg.from || 0, log: lg.log || [],
      seen: +lsGet('provident-share-seen:' + b.id) || Date.now(), err: ''
    };
    S.baseS = canon(S.base);
    S.onSlot = e => { const id = e && e.detail && e.detail.id; if (!S.applying && id) { S.dirty.add(id); S.lastT = Date.now(); } };
    window.addEventListener('image-slots-change', S.onSlot);
    S.onVis = () => { if (!document.hidden) this.shPoll(); };
    document.addEventListener('visibilitychange', S.onVis);
    S.tick = setInterval(() => this.shTick(), 1000);
    S.poll = setInterval(() => this.shPoll(), POLL);
    S.clock = setInterval(() => this.shRender(), 30000);
    S.ui = buildUi(this);
    document.documentElement.classList.add('shl-on');
    if (open || lsGet('provident-share-open') === '1') this.shPanel(true);
    this.shRender();
    this.shPoll(true);
    this.forceUpdate();
  };
  SP.shTick = function () {
    const S = this._sh; if (!S || S.busy || StudioBase.loadingSession) return;
    if (!this.shBind()) { this.shareStop(true); return; }   // this tab has opened another project
    // the project browser and the template picker are not the project: no panel over them
    const away = /^(splash|pick)$/.test(this.state.screen || '');
    if (S.ui && S.ui.root.hidden !== away) {
      S.ui.root.hidden = away;
      document.documentElement.classList.toggle('shl-open', !away && S.ui.root.classList.contains('open'));
      document.documentElement.classList.toggle('shl-on', !away);
    }
    const cur = canon(this.shPub());
    if (cur !== S.lastS) { S.lastS = cur; S.lastT = Date.now(); }
    const pend = cur !== S.baseS || S.dirty.size > 0;
    S.pending = pend;
    if (S.ui) S.ui.status(pend ? 'saving' : (S.err ? 'error' : 'ok'));
    if (pend && Date.now() - S.lastT > DEBOUNCE) this.shSave();
  };
  SP.shSave = async function () {
    const S = this._sh; if (!S || S.busy) return;
    S.busy = true;
    try {
      const by = StudioBase.shareName() || 'Someone';
      // photos first, so the state never names a picture the store does not hold yet
      const C = IS(), map = {}, photoCh = [];
      const ids = Array.from(S.dirty); S.dirty.clear();
      const sp = this.shSpec();
      for (const sl of ids) {
        if (!sp || !sp.prefix.test(sl)) continue;
        const rec = C && C.getRec ? C.getRec(sl) : null;
        if (rec && rec.u) {
          const txt = JSON.stringify(rec);
          if (fnv(txt) === S.imgs[sl]) continue;
          if (S.ui) S.ui.status('saving', 'Uploading a picture…');
          map[sl] = await putRec(S.id, sl, rec);
          const l = this.shSlotLabel(sl);
          photoCh.push({ kind: 'photo', page: l.page, label: l.label, text: S.imgs[sl] ? 'Replaced' : 'Added' });
        } else if (S.imgs[sl]) {
          map[sl] = null;
          const l = this.shSlotLabel(sl);
          photoCh.push({ kind: 'photo', page: l.page, label: l.label, text: 'Removed' });
        }
      }
      let cur = this.shPub();
      const ch = this.shDiff(S.base, cur).concat(photoCh);
      if (!ch.length && !Object.keys(map).length && canon(cur) === S.baseS) return;
      const burst = this.shBurst(ch);
      for (let tries = 0; tries < 4; tries++) {
        try {
          const r = await api('save', { id: S.id }, { base: S.rev, state: cur, by, burst: burst.id, changes: burst.list, imgs: map });
          S.rev = r.rev; S.base = cur; S.baseS = canon(cur);
          Object.keys(map).forEach(k => { if (map[k]) S.imgs[k] = map[k].h; else delete S.imgs[k]; });
          S.err = '';
          this.shPersist();
          this.shPoll(true);
          return;
        } catch (e) {
          if (!e.stale) throw e;
          // Someone saved in between: take their state, put my changes on top, try again.
          await this.shPull();
          cur = this.shPub();
        }
      }
      throw new Error('Could not save — others kept saving at the same moment. It will try again.');
    } catch (e) {
      S.err = e.message || String(e);
      if (S.ui) S.ui.status('error', S.err);
      S.lastT = Date.now() + 8000;      // back off before the next try
    } finally { S.busy = false; }
  };
  // Edits made within BURST of each other are one entry in the log, so typing a headline is
  // one line ("Headline: was → now"), not twenty.
  SP.shBurst = function (ch) {
    const S = this._sh, now = Date.now();
    if (!S.burst || now - S.burst.t > BURST) S.burst = { id: Math.random().toString(36).slice(2, 12), t: now, map: {}, order: [] };
    const B = S.burst; B.t = now;
    ch.forEach(c => {
      const k = [c.kind === 'design' || c.kind === 'note' ? 'd' : c.kind === 'photo' ? 'p' : 'w', c.page || '', c.label || '', c.kind === 'design' ? '' : (c.text || '')].join('|');
      const o = B.map[k];
      if (!o) { B.map[k] = Object.assign({}, c); B.order.push(k); }
      else if ('now' in c) { o.now = c.now; o.kind = o.was ? (c.now ? 'changed' : 'removed') : 'added'; }
      else Object.assign(o, c);
    });
    const list = B.order.map(k => B.map[k]).filter(c => !(('was' in c) && c.was === c.now));
    return { id: B.id, list };
  };
  SP.shPersist = function () {
    const S = this._sh; if (!S) return;
    ssSet(this.shKey(), { id: S.id, rev: S.rev, n: S.n, pid: this.state.pid, imgs: S.imgs, name: S.name });
    if (!ssSet(this.shKey('-base'), S.base)) ssSet(this.shKey('-base'), null);
    ssSet(this.shKey('-log'), { from: S.from, log: S.log.slice(-200) });
  };
  SP.shPoll = async function (force) {
    const S = this._sh; if (!S || S.polling) return;
    if (!force && (document.hidden || S.busy)) return;
    S.polling = true;
    try {
      const r = await api('rev', { id: S.id });
      if (r.rev !== S.rev) await this.shPull();
      else if (r.n !== S.n) await this.shPull(true);
    } catch (e) {
      if (/expired|never made/.test(e.message || '')) { S.err = e.message; if (S.ui) S.ui.status('error', e.message); }
    } finally { if (this._sh) this._sh.polling = false; }
  };
  SP.shPull = async function (logOnly) {
    const S = this._sh; if (!S) return;
    const d = await api('sync', { id: S.id, from: Math.max(0, S.n - 1) });
    // the log: the tail from `from`, the last entry possibly rewritten by its burst
    const keep = S.log.slice(0, Math.max(0, d.from - S.from));
    S.log = keep.concat(d.log || []); S.n = d.n;
    if (S.log.length > 300) { S.from += S.log.length - 300; S.log = S.log.slice(-300); }
    if (!logOnly && d.rev !== S.rev) {
      const mine = this.shPub(), merged = merge3(S.base, mine, d.state);
      S.applying = true;
      try {
        if (!jsonEq(merged, mine)) this.shApply(merged);
        // pictures that moved on the store
        const C = IS();
        const want = d.imgs || {};
        for (const sl of Object.keys(want)) {
          if (S.imgs[sl] === want[sl].h) continue;
          const rec = await fetchRec(S.id, want[sl]);
          if (rec && C && C.putRec) { S.applying = true; C.putRec(sl, rec); S.imgs[sl] = want[sl].h; }
        }
        Object.keys(S.imgs).forEach(sl => { if (!want[sl]) { if (C && C.putRec) C.putRec(sl, null); delete S.imgs[sl]; } });
      } finally { S.applying = false; }
      S.base = d.state; S.baseS = canon(d.state); S.rev = d.rev;
      S.lastS = canon(this.shPub());
    }
    this.shPersist();
    this.shRender();
  };
  SP.shApply = function (st) {
    const n = Object.assign({}, st, this.shLocal());
    this.host.setState({ [this.key]: n });
    this._undoStack = []; this._redoStack = [];
    const sp = this.shSpec();
    if (sp && !StudioBase.loadingSession) { try { localStorage.setItem(sp.key, JSON.stringify(n)); } catch (e) {} }
  };

  // ---------- the panel ----------
  SP.shPanel = function (open) {
    const S = this._sh; if (!S || !S.ui) return;
    open = open == null ? !S.ui.root.classList.contains('open') : !!open;
    S.ui.root.classList.toggle('open', open);
    document.documentElement.classList.toggle('shl-open', open && !S.ui.root.hidden);
    lsSet('provident-share-open', open ? '1' : '0');
    if (open) { S.seen = Date.now(); lsSet('provident-share-seen:' + S.id, String(S.seen)); }
    this.shRender();
    this.forceUpdate();
  };
  SP.shFlash = function (t) { const S = this._sh; if (S && S.ui) S.ui.flash(t); };
  SP.shRender = function () {
    const S = this._sh; if (!S || !S.ui) return;
    const me = StudioBase.shareName(), open = S.ui.root.classList.contains('open');
    const people = new Set(S.log.map(e => e.by).filter(Boolean));
    const unseen = S.log.filter(e => e.at > S.seen && e.by !== me).length;
    S.ui.set({
      link: this.shLink(S.id), me, people: people.size, unseen: open ? 0 : unseen,
      log: S.log.slice().reverse()
    });
  };
  // render keys for the Share panel's button, merged by both shells
  SP.shareVals = function () {
    const b = this.shBind();
    return {
      shLinkGo: () => this.shareCreate(),
      shLinkLabel: b ? 'Copy edit link' : 'Share an edit link',
      shLinkTip: b ? 'This project is shared. Copies the link and opens the Changes panel.'
        : 'Makes a link anyone can open to view and edit this project, with a panel of who changed what.',
      shLinkOn: b ? '1' : undefined,
    };
  };

  // ---------- shared AD SETS (CAS) ----------
  // CAS shares the Ad sets VIEW rather than one project: every project in the folder (its words
  // and its photos, so Edit text can re-render) and a ~1600px JPEG preview of each exported
  // image. Whoever opens the link gets the same viewer, built on a stand-in folder (the shape
  // Drive and dropped folders already use), so the scan, Edit text and Download all run as
  // they do on any folder. An edit writes the project and the re-rendered previews back to the
  // link; the Changes panel says who changed what. The link never touches anyone's own folder.
  //
  // The shared state is { kind:'adsets', root, projs:[{id, path, fname, app, v, st, photos:[slot],
  // files:[{id, path}]}] }; the store's picture map holds 'p<n>-<slot>' (a photo's record) and
  // 'f<n>' (a preview, {u: jpeg data URL}).
  const ADSETS = 'provident-ad-sets', AS_KEY = 'provident-share:adsets', PREV = 1600, PHOTO = 2000;
  function goCas(id) {
    const ws = window.providentWorkspace;
    StudioBase.reloading = true;
    location.href = encodeURIComponent(StudioBase.SESSIONS['provident-ad-studio'].file) + (ws ? '?ws=' + encodeURIComponent(ws) : '') + '#share=' + id;
  }
  const toBlob = d => d instanceof Blob ? d : new Blob([d && d.buffer ? d : new Uint8Array(d || [])]);
  const readUrl = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
  async function shrink(blob) {
    const bmp = await createImageBitmap(blob);
    const k = Math.min(1, PREV / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    x.imageSmoothingQuality = 'high'; x.drawImage(bmp, 0, 0, c.width, c.height); bmp.close && bmp.close();
    const out = await new Promise(r => c.toBlob(r, 'image/jpeg', .86));
    return { u: await readUrl(out) };
  }
  // SPEED: a project's photos are stored at export grade (up to 3840px, 3-5 MB each), which is
  // nearly all of what a link uploads. The shared view only ever draws them into 1600px previews,
  // so a raster photo goes up at PHOTO px as WebP (alpha kept, so a cut-out stays a cut-out).
  // Its crop is relative, so the smaller copy frames the same way. An SVG and a photo already
  // small enough go as they are.
  async function slim(rec) {
    if (!rec || !rec.u || !/^data:image\/(png|jpe?g|webp)/i.test(rec.u)) return rec;
    let bmp;
    try { bmp = await createImageBitmap(await (await fetch(rec.u)).blob()); } catch (e) { return rec; }
    const k = Math.min(1, PHOTO / Math.max(bmp.width, bmp.height));
    if (k === 1 && rec.u.length < 700000) { bmp.close && bmp.close(); return rec; }
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(bmp, 0, 0, c.width, c.height); bmp.close && bmp.close();
    const b = await new Promise(r => c.toBlob(r, 'image/webp', .82));
    if (!b) return rec;
    const u = await readUrl(b);
    return u.length < rec.u.length ? Object.assign({}, rec, { u }) : rec;
  }
  const jpgName = n => n.replace(/\.(png|jpe?g|webp)$/i, '') + '.jpg';
  const AdSets = {
    cur: null,
    // ---- making a link, from the Ad sets bar ----
    async create(shell) {
      if (this.cur && shell._asSrc && shell._asSrc.share === this.cur) { this.cur.copy(); return; }
      const a = shell._as;
      const projs = [], seen = new Set();
      (a && a.mains || []).forEach(m => m.auds.forEach(au => (au.projs || []).forEach(p => { if (!seen.has(p)) { seen.add(p); projs.push(p); } })));
      if (!projs.length) { window.alert('There are no ad sets in this folder to share yet.'); return; }
      const dlg = nameDialog({ title: 'Share these ad sets', btn: 'Make the link',
        lead: 'Anyone with the link can see every audience and variant here and change the words in Edit text, and the Changes panel shows who changed what. ' +
          'The link carries previews of the images (about 1600px), not the full-size files. There is no sign-in — share it only with people who should edit.',
        note: 'Your name is shown beside every change you make.' });
      const name = await dlg.name();
      if (!name) return;
      lsSet(NAME_KEY, name);
      try {
        dlg.busy('Reading the projects…');
        const data = { kind: 'adsets', root: a.root || 'Ad sets', projs: [] }, recs = {}, hs = {};
        let fi = 0;
        for (let i = 0; i < projs.length; i++) {
          const p = projs[i], full = p.jsonH.getFull ? await p.jsonH.getFull() : await p.jsonH.getFile();
          const doc = JSON.parse(await full.text());
          const pid = 'p' + i, photos = [];
          Object.keys(doc.images || {}).forEach(sl => { if (doc.images[sl] && doc.images[sl].u) { photos.push(sl); recs[pid + '-' + sl] = doc.images[sl]; } });
          const files = [];
          for (const o of (p.outs || [])) {
            if (/eventbrite/.test(o.job)) continue;
            const id = 'f' + (fi++);
            files.push({ id, path: o.name.replace(/[^/]+$/, jpgName) }); hs[id] = o.h;
          }
          data.projs.push({ id: pid, path: p.path, fname: p.fname, app: doc.app || 'provident-ad-studio', v: doc.v, st: doc.state || {}, photos, files });
        }
        const pub = JSON.parse(JSON.stringify(data));
        const r = await api('create', {}, { app: ADSETS, name: data.root, by: name, state: pub });
        // Every picture is slimmed first and keyed by its content, so a photo several projects
        // share (the same background, QR or icon) goes up ONCE even while uploads run in parallel.
        const map = {}, ups = {}, jobs = [];
        Object.keys(recs).forEach(sl => jobs.push({ sl, rec: recs[sl] }));
        data.projs.forEach(pp => pp.files.forEach(f => jobs.push({ sl: f.id, h: hs[f.id] })));
        let k = 0, sent = 0;
        const say = () => dlg.busy('Uploading · ' + k + ' of ' + jobs.length + (sent ? ' · ' + (sent / 1048576).toFixed(1) + ' MB' : '') + '…');
        await pool(jobs, 6, async j => {
          const rec = j.rec ? await slim(j.rec) : await shrink(await j.h.getFile());
          const txt = JSON.stringify(rec), h = fnv(txt);
          if (!ups[h]) { ups[h] = putRec(r.id, j.sl, rec); sent += txt.length; }
          map[j.sl] = await ups[h];
          k++; say();
        });
        await api('save', { id: r.id }, { base: r.rev, state: pub, by: name, imgs: map });
        const link = StudioBase.shareBase() + '/' + encodeURIComponent(StudioBase.SESSIONS['provident-ad-studio'].file) + '#share=' + r.id;
        const copied = await copyText(link);
        dlg.done(link, copied);
        const d = await api('get', { id: r.id });
        this.start(shell, r.id, d, true);
      } catch (e) { dlg.fail(e.message || String(e), 'Close'); }
    },
    // ---- opening one ----
    async join(shell, id, d) {
      const meta = d.meta || {}, n = ((d.state || {}).projs || []).length;
      const dlg = nameDialog({ title: 'Open shared ad sets', btn: 'Open',
        lead: '<b>' + esc(meta.name || 'Ad sets') + '</b> · shared by ' + esc(meta.by || 'someone') + ' · ' + n + (n === 1 ? ' project' : ' projects') +
          '. You can look through every audience and variant and change the words in Edit text; the Changes panel shows who changed what.',
        note: 'Your name is shown beside every change you make.' });
      const name = await dlg.name();
      if (!name) return;
      lsSet(NAME_KEY, name);
      dlg.close();
      this.start(shell, id, d, false);
    },
    async resume(shell, id) {
      try { this.start(shell, id, await api('get', { id }), false); }
      catch (e) { ssSet(AS_KEY, null); }
    },
    start(shell, id, d, open) {
      if (this.cur) this.cur.stop(true);
      const c = this.cur = new AsShare(shell, id, d);
      ssSet(AS_KEY, { id });
      c.view();
      if (open || lsGet('provident-share-open') === '1') c.shPanel(true);
    }
  };
  window.providentAdSetsShare = AdSets;

  function AsShare(shell, id, d) {
    this.shell = shell; this.id = id;
    this.data = d.state; this.base = JSON.parse(JSON.stringify(d.state)); this.rev = d.rev;
    this.imgs = d.imgs || {}; this.n = d.n || 0; this.from = d.from || 0; this.log = d.log || [];
    this.cache = {}; this.pend = {}; this.pimg = {}; this.busy = false; this.err = ''; this.burst = null;
    this.seen = +lsGet('provident-share-seen:' + id) || Date.now();
    this.dir = this.build();
    injectCss();
    this.ui = buildUi(this);
    this.ui.root.querySelector('.shl-pill span').textContent = 'Changes';
    document.documentElement.classList.add('shl-on', 'shl-as');
    this.tick = setInterval(() => this.onTick(), 1000);
    this.poll = setInterval(() => this.shPoll(), POLL);
    this.clock = setInterval(() => this.shRender(), 30000);
    this.onVis = () => { if (!document.hidden) this.shPoll(); };
    document.addEventListener('visibilitychange', this.onVis);
    this.ui.status('ok');
    this.shRender();
  }
  const AP = AsShare.prototype;
  AP.link = function () { return StudioBase.shareBase() + '/' + encodeURIComponent(StudioBase.SESSIONS['provident-ad-studio'].file) + '#share=' + this.id; };
  AP.view = function () { this.shell.asView({ kind: 'share', handle: this.dir, name: this.data.root, share: this }); };
  AP.here = function () { const sh = this.shell; return !!(sh.state.adSetsOpen && sh._asSrc && sh._asSrc.share === this); };
  AP.onTick = function () {
    const here = this.here(), r = this.ui.root;
    r.classList.toggle('away', !here);
    document.documentElement.classList.toggle('shl-open', here && r.classList.contains('open'));
    if (Object.keys(this.pend).length && !this.busy && Date.now() - this.lastW > 1500) this.save();
    this.ui.status(this.busy || Object.keys(this.pend).length ? 'saving' : (this.err ? 'error' : 'ok'), this.err || undefined);
  };
  // the stand-in folder: reads this.data live, so a pull is seen by the next scan
  AP.build = function () {
    const me = this, dirs = { name: this.data.root, kids: {} };
    const node = path => { let n = dirs; (path ? path.split('/') : []).forEach(seg => { n = n.kids[seg] || (n.kids[seg] = { name: seg, kids: {} }); }); return n; };
    const findP = pid => (me.data.projs || []).find(p => p.id === pid);
    (this.data.projs || []).forEach(p => {
      const pn = node(p.path);
      pn.json = p.id;
      p.files.forEach(f => { const parts = f.path.split('/'), nm = parts.pop(); const n2 = node((p.path ? p.path + '/' : '') + parts.join('/')); (n2.files || (n2.files = {}))[nm] = [p.id, f.id]; });
    });
    const writer = done => {
      const parts = [];
      return { write: async x => { parts.push(x && x.data !== undefined ? x.data : x); }, close: async () => done(new Blob(parts.map(toBlob))) };
    };
    const jsonH = (pid, nm) => ({ kind: 'file', name: nm, modified: 1,
      getFile: async () => { const p = findP(pid); return new File([JSON.stringify({ app: p.app, v: p.v, state: p.st })], nm, { type: 'application/json' }); },
      getFull: async () => {
        const p = findP(pid), images = {};
        await pool(p.photos, 3, async sl => { const r = await me.rec(p.id + '-' + sl); if (r) images[sl] = r; });
        return new File([JSON.stringify({ app: p.app, v: p.v, state: p.st, images })], nm, { type: 'application/json' });
      },
      createWritable: async () => writer(async b => { const doc = JSON.parse(await b.text()); me.onJson(pid, doc.state); }) });
    const imgH = (pid, fid, nm) => ({ kind: 'file', name: nm, modified: 1,
      getFile: async () => {
        const r = await me.rec(fid);
        const b = r && r.u ? await (await fetch(r.u)).blob() : new Blob([], { type: 'image/jpeg' });
        return new File([b], nm, { type: 'image/jpeg' });
      },
      createWritable: async () => writer(async b => me.onImage(fid, await shrink(b))) });
    const dh = n => ({ kind: 'directory', name: n.name,
      queryPermission: async () => 'granted', requestPermission: async () => 'granted',
      async *entries() {
        for (const k of Object.keys(n.kids)) yield [k, dh(n.kids[k])];
        if (n.json) { const p = findP(n.json); yield [p.fname, jsonH(p.id, p.fname)]; }
        for (const k of Object.keys(n.files || {})) yield [k, imgH(n.files[k][0], n.files[k][1], k)];
      },
      async getDirectoryHandle(x) { if (!n.kids[x]) { const e = new Error('Not found'); e.name = 'NotFoundError'; throw e; } return dh(n.kids[x]); } });
    return dh(dirs);
  };
  AP.rec = async function (sl) {
    const e = this.imgs[sl]; if (!e) return null;
    if (this.cache[e.h]) return this.cache[e.h];
    const r = await fetchRec(this.id, e);
    if (r) this.cache[e.h] = r;
    return r;
  };
  AP.onJson = function (pid, st) { this.pend[pid] = st; this.lastW = Date.now(); };
  AP.onImage = function (fid, rec) { this.pimg[fid] = rec; this.lastW = Date.now(); };
  AP.words = function (p, st) {
    const out = {}, C = window.CampaignStudio || (this.shell.eng && this.shell.eng.constructor);
    try {
      const flat = C.copyFlat(C.copySnap(st, 'draft'));
      Object.keys(flat).forEach(k => { out[k] = flat[k]; });
    } catch (e) {}
    return out;
  };
  // edits within BURST of each other are one log entry, as on a project link
  AP.burstOf = function (ch) {
    const now = Date.now();
    if (!this.burst || now - this.burst.t > BURST) this.burst = { id: Math.random().toString(36).slice(2, 12), t: now, map: {}, order: [] };
    const B = this.burst; B.t = now;
    ch.forEach(c => {
      const k = [c.kind === 'note' ? 'd' : 'w', c.page || '', c.label || '', c.kind === 'note' ? c.text : ''].join('|');
      const o = B.map[k];
      if (!o) { B.map[k] = Object.assign({}, c); B.order.push(k); }
      else if ('now' in c) { o.now = c.now; o.kind = o.was ? (c.now ? 'changed' : 'removed') : 'added'; }
    });
    return { id: B.id, list: B.order.map(k => B.map[k]).filter(c => !(('was' in c) && c.was === c.now)) };
  };
  AP.label = function (p) { const segs = p.path ? p.path.split('/') : []; return segs.length >= 2 ? segs.slice(1).join(' / ') : p.fname.replace(/\.adstudio\.json$/i, ''); };
  AP.save = async function () {
    if (this.busy) return;
    this.busy = true;
    const by = StudioBase.shareName() || 'Someone';
    try {
      const pend = this.pend, pimg = this.pimg; this.pend = {}; this.pimg = {};
      const ch = [];
      Object.keys(pend).forEach(pid => {
        const p = (this.data.projs || []).find(x => x.id === pid); if (!p) return;
        const A = this.words(p, p.st), B = this.words(p, pend[pid]), who = this.label(p);
        Object.keys(B).forEach(k => { const x = A[k], y = B[k]; if (!x || x.value !== y.value)
          ch.push({ kind: x && x.value ? (y.value ? 'changed' : 'removed') : 'added', page: who + (y.page ? ' · ' + y.page : ''), label: y.label, was: x ? x.value : '', now: y.value }); });
        Object.keys(A).forEach(k => { if (!B[k] && A[k].value) ch.push({ kind: 'removed', page: who, label: A[k].label, was: A[k].value, now: '' }); });
        p.st = pend[pid];
      });
      const map = {};
      for (const fid of Object.keys(pimg)) {
        this.ui.status('saving', 'Uploading the new previews…');
        map[fid] = await putRec(this.id, fid, pimg[fid]);
        this.cache[map[fid].h] = pimg[fid];
      }
      const burst = this.burstOf(ch.length ? ch : [{ kind: 'note', page: '', text: 'Updated the images' }]);
      for (let tries = 0; tries < 4; tries++) {
        try {
          const r = await api('save', { id: this.id }, { base: this.rev, state: this.data, by, burst: burst.id, changes: burst.list, imgs: map });
          this.rev = r.rev; this.base = JSON.parse(JSON.stringify(this.data));
          Object.keys(map).forEach(k => { this.imgs[k] = map[k]; });
          this.err = '';
          await this.shPull(true);
          return;
        } catch (e) {
          if (!e.stale) throw e;
          const d = await api('sync', { id: this.id, from: Math.max(0, this.n - 1) });
          this.data = merge3(this.base, this.data, d.state); this.base = d.state; this.rev = d.rev;
          Object.assign(this.imgs, d.imgs || {});
        }
      }
      throw new Error('Could not save — others kept saving at the same moment. It will try again.');
    } catch (e) {
      this.err = e.message || String(e);
      this.lastW = Date.now() + 8000;
    } finally { this.busy = false; }
  };
  AP.shPoll = async function (force) {
    if (this.polling || this.busy || (!force && document.hidden)) return;
    this.polling = true;
    try {
      const r = await api('rev', { id: this.id });
      if (r.rev !== this.rev) await this.shPull();
      else if (r.n !== this.n) await this.shPull(true);
    } catch (e) { if (/expired|never made/.test(e.message || '')) this.err = e.message; }
    finally { this.polling = false; }
  };
  AP.shPull = async function (logOnly) {
    const d = await api('sync', { id: this.id, from: Math.max(0, this.n - 1) });
    const keep = this.log.slice(0, Math.max(0, d.from - this.from));
    this.log = keep.concat(d.log || []); this.n = d.n;
    if (this.log.length > 300) { this.from += this.log.length - 300; this.log = this.log.slice(-300); }
    if (!logOnly && d.rev !== this.rev) {
      this.data = merge3(this.base, this.data, d.state); this.base = d.state; this.rev = d.rev;
      this.imgs = d.imgs || {};
      this.rescan();
    }
    this.shRender();
  };
  // someone else's change: the viewer reads the folder again, unless this person is mid-edit
  AP.rescan = function () {
    const sh = this.shell, ae = sh._ae, a = document.activeElement;
    if (!this.here()) return;
    if ((ae && (ae.dirty || ae.saving)) || (a && a.closest && a.closest('.as-ov') && /^(INPUT|TEXTAREA)$/.test(a.tagName))) { this.again = true; setTimeout(() => { if (this.again) { this.again = false; this.rescan(); } }, 4000); return; }
    sh.asScan();
  };
  // the panel's three hooks (buildUi calls them)
  AP.shPanel = function (open) {
    if (!this.here()) { this.view(); open = true; }
    open = open == null ? !this.ui.root.classList.contains('open') : !!open;
    this.ui.root.classList.toggle('open', open);
    document.documentElement.classList.toggle('shl-open', open && this.here());
    lsSet('provident-share-open', open ? '1' : '0');
    if (open) { this.seen = Date.now(); lsSet('provident-share-seen:' + this.id, String(this.seen)); }
    this.shRender();
  };
  AP.shRender = function () {
    const me = StudioBase.shareName(), open = this.ui.root.classList.contains('open');
    const unseen = this.log.filter(e => e.at > this.seen && e.by !== me).length;
    this.ui.set({ link: this.link(), me, people: new Set(this.log.map(e => e.by).filter(Boolean)).size, unseen: open ? 0 : unseen, log: this.log.slice().reverse() });
    this.ui.root.querySelector('.shl-sub').textContent = 'Shared ad sets · ' + this.data.root;
  };
  AP.copy = async function () { const ok = await copyText(this.link()); this.ui.flash(ok ? 'Link copied' : 'Select the link in the panel and copy it'); this.shPanel(true); };
  AP.shareStop = function () { this.stop(); if (this.here()) this.shell.asUseSource(); };
  AP.stop = function (keep) {
    clearInterval(this.tick); clearInterval(this.poll); clearInterval(this.clock);
    document.removeEventListener('visibilitychange', this.onVis);
    this.ui.root.remove();
    document.documentElement.classList.remove('shl-on', 'shl-open', 'shl-as');
    if (AdSets.cur === this) AdSets.cur = null;
    if (!keep) ssSet(AS_KEY, null);
  };

  // ---------- the DOM: name dialog and the Changes panel ----------
  // Plain DOM outside the studio's React tree, so one copy serves both documents and React
  // never reconciles it. Styled with the chrome's own tokens.
  function nameDialog(o) {
    const el = document.createElement('div');
    el.className = 'shl-dlg';
    el.innerHTML = '<div class="shl-dlg-c" role="dialog" aria-modal="true" aria-labelledby="shl-dlg-t">' +
      '<h2 id="shl-dlg-t">' + esc(o.title) + '</h2><p class="shl-lead"></p>' +
      '<label class="shl-fld"><span>Your name</span><input class="p-in" maxlength="60" autocomplete="name" placeholder="e.g. Sara"></label>' +
      '<p class="shl-note"></p><p class="shl-st" aria-live="polite"></p>' +
      '<div class="shl-link" hidden><input class="p-in" readonly><button class="p-ghost shl-cp">Copy</button></div>' +
      '<div class="shl-acts"><button class="p-ghost shl-x">Cancel</button><button class="p-btn shl-go"></button></div></div>';
    document.body.appendChild(el);
    const $ = s => el.querySelector(s), inp = $('.shl-fld input'), go = $('.shl-go'), x = $('.shl-x');
    $('.shl-lead').innerHTML = o.lead || ''; $('.shl-note').textContent = o.note || ''; go.textContent = o.btn;
    inp.value = StudioBase.shareName();
    let res;
    const p = new Promise(r => { res = r; });
    const close = v => { el.remove(); res(v); };
    const submit = () => { const v = inp.value.replace(/\s+/g, ' ').trim(); if (!v) { inp.focus(); $('.shl-st').textContent = 'Add your name so others know who made a change.'; return; } res(v); };
    go.onclick = submit; x.onclick = () => close('');
    inp.onkeydown = e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') close(''); };
    el.onkeydown = e => { if (e.key === 'Escape') close(''); };
    const api2 = {
      name: () => p,
      busy: t => { $('.shl-st').textContent = t; go.disabled = true; inp.disabled = true; },
      ready: r => { $('.shl-lead').innerHTML = r.lead; $('.shl-note').textContent = r.note || ''; $('.shl-st').textContent = ''; go.disabled = false; inp.disabled = false; setTimeout(() => inp.focus(), 30); },
      fail: (t, btn) => { $('.shl-st').textContent = t; $('.shl-st').classList.add('bad'); go.textContent = btn || 'Close'; go.disabled = false; go.onclick = () => close(''); x.hidden = true; },
      done: (link, copied) => {
        $('.shl-fld').hidden = true; $('.shl-note').textContent = '';
        $('.shl-lead').innerHTML = 'The link is ready' + (copied ? ' and copied' : '') + '. Send it to the people who should edit — they will be asked their name when they open it.';
        $('.shl-st').textContent = ''; const L = $('.shl-link'); L.hidden = false; L.querySelector('input').value = link;
        L.querySelector('.shl-cp').onclick = async () => { L.querySelector('.shl-cp').textContent = (await copyText(link)) ? 'Copied' : 'Select it'; L.querySelector('input').select(); };
        x.hidden = true; go.textContent = 'Done'; go.disabled = false; go.onclick = () => el.remove();
      },
      close: () => el.remove(),
    };
    if (o.busy) api2.busy(o.lead); else setTimeout(() => inp.focus(), 30);
    return api2;
  }
  const ICON = {
    hist: 'M480-120q-138 0-240.5-91.5T122-440h82q14 104 92.5 172T480-200q117 0 198.5-81.5T760-480q0-117-81.5-198.5T480-760q-69 0-129 32t-101 88h110v80H120v-240h80v94q51-64 124.5-99T480-840q75 0 140.5 28.5t114 77q48.5 48.5 77 114T840-480q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T480-120Zm112-192L440-464v-216h80v184l128 128-56 56Z',
    x: 'M256-200 200-256l224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z',
    link: 'M440-280H280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680h160v80H280q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h320v80H320Zm200 160v-80h160q50 0 85-35t35-85q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280H520Z'
  };
  const svg = d => '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="' + d + '"/></svg>';
  function buildUi(eng) {
    const root = document.createElement('div');
    root.className = 'shl';
    root.innerHTML =
      '<button class="shl-pill" type="button" aria-label="Changes on the shared link">' + svg(ICON.hist) + '<span>Changes</span><b class="shl-n" hidden></b><i class="shl-dot"></i></button>' +
      '<aside class="shl-panel" aria-label="Changes">' +
        '<header><div><h2>Changes</h2><p class="shl-sub"></p></div><button class="shl-close" type="button" aria-label="Close">' + svg(ICON.x) + '</button></header>' +
        '<div class="shl-share"><input class="p-in" readonly aria-label="Edit link"><button class="p-ghost" type="button">' + svg(ICON.link) + 'Copy</button></div>' +
        '<p class="shl-me"></p><p class="shl-state" aria-live="polite"></p>' +
        '<ol class="shl-list"></ol>' +
        '<footer><button class="shl-leave" type="button">Stop following this link on this tab</button></footer>' +
      '</aside><div class="shl-toast" aria-live="polite"></div>';
    document.body.appendChild(root);
    const $ = s => root.querySelector(s);
    $('.shl-pill').onclick = () => eng.shPanel();
    $('.shl-close').onclick = () => eng.shPanel(false);
    $('.shl-share button').onclick = async () => { const ok = await copyText($('.shl-share input').value); ui.flash(ok ? 'Link copied' : 'Select the link and copy it'); };
    $('.shl-me').onclick = e => {
      if (!e.target.closest('button')) return;
      const v = (window.prompt('Your name, shown beside your changes:', StudioBase.shareName()) || '').replace(/\s+/g, ' ').trim();
      if (v) { lsSet(NAME_KEY, v); eng.shRender(); }
    };
    $('.shl-leave').onclick = () => {
      if (window.confirm('Stop following the link on this tab? The project stays open here, but your changes will no longer reach the link, and theirs will not reach you. Open the link again to rejoin.')) eng.shareStop();
    };
    let lastTop = '', toastT = 0;
    const ui = {
      root,
      status(kind, msg) {
        root.dataset.st = kind;
        $('.shl-state').textContent = kind === 'saving' ? (msg || 'Saving your changes…') : kind === 'error' ? (msg || 'Not saved yet') : 'All changes saved to the link';
        $('.shl-state').className = 'shl-state ' + kind;
      },
      flash(t) { const el = $('.shl-toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 3200); },
      set(v) {
        $('.shl-share input').value = v.link;
        $('.shl-sub').textContent = v.people > 1 ? v.people + ' people have edited' : 'Shared edit link';
        $('.shl-me').innerHTML = 'Editing as <b>' + esc(v.me || 'Someone') + '</b> · <button type="button">change</button>';
        const n = $('.shl-n'); n.hidden = !v.unseen; n.textContent = v.unseen > 9 ? '9+' : String(v.unseen);
        const top = v.log[0];
        const key = top ? top.rev + ':' + top.at + ':' + (top.changes || []).length : '';
        if (key && lastTop && key !== lastTop && top.by !== v.me) {
          const c = (top.changes || [])[0];
          ui.flash(top.by + ' ' + (c ? line(c, true) : 'made a change'));
        }
        lastTop = key;
        $('.shl-list').innerHTML = v.log.length ? v.log.map(e => {
          const mine = e.by === v.me;
          const ch = (e.changes || []).slice(0, 12);
          return '<li><div class="shl-who"><span class="shl-av">' + esc((e.by || '?').trim().charAt(0).toUpperCase()) + '</span><b>' + esc(e.by || 'Someone') + (mine ? ' <s>· you</s>' : '') +
            '</b><time>' + esc(ago(e.at)) + '</time></div><ul>' + ch.map(c => '<li>' + line(c) + '</li>').join('') +
            ((e.changes || []).length > 12 ? '<li class="shl-more">+ ' + ((e.changes || []).length - 12) + ' more</li>' : '') + '</ul></li>';
        }).join('') : '<li class="shl-empty">No changes yet. Edits made by anyone on the link show up here.</li>';
      }
    };
    return ui;
  }
  function line(c, plain) {
    const where = [c.page, c.label].filter(Boolean).join(' · ');
    if (plain) {
      if (c.kind === 'changed' || c.kind === 'added' || c.kind === 'removed') return (c.kind === 'removed' ? 'cleared ' : 'changed ') + (c.label || 'a field');
      return (c.text || 'changed').toLowerCase() + (where ? ' ' + where : '');
    }
    const w = where ? '<b>' + esc(where) + '</b>' : '';
    if (c.kind === 'changed') return w + '<q class="was">' + esc(clip(c.was, 90)) + '</q><q>' + esc(clip(c.now, 90)) + '</q>';
    if (c.kind === 'added') return w + ' <em>added</em><q>' + esc(clip(c.now, 90)) + '</q>';
    if (c.kind === 'removed') return w + ' <em>cleared</em><q class="was">' + esc(clip(c.was, 90)) + '</q>';
    if (c.kind === 'photo') return w + ' <em>' + esc((c.text || 'changed').toLowerCase()) + '</em>';
    return (c.page ? '<b>' + esc(c.page) + '</b> ' : '') + '<em>' + esc(c.text || 'changed') + '</em>';
  }

  let cssDone = false;
  function injectCss() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style');
    s.id = 'shl-css';
    s.textContent = `
.shl-pill{position:fixed;right:16px;bottom:16px;z-index:157;display:flex;align-items:center;gap:8px;height:40px;padding:0 16px 0 13px;border:none;border-radius:9999px;
  background:var(--ps-card);color:var(--ps-ink);box-shadow:inset 0 0 0 1px var(--ps-line);font:600 14px/1 var(--ps-font);letter-spacing:.16px;cursor:pointer}
.shl-pill:hover{background:var(--ps-fill-h)}
.shl-pill:focus-visible,.shl button:focus-visible{outline:2px solid var(--ps-ink);outline-offset:2px}
.shl-pill svg{width:18px;height:18px;fill:currentColor}
.shl-n{min-width:20px;height:20px;padding:0 6px;box-sizing:border-box;border-radius:9999px;background:var(--ps-primary);color:var(--ps-primary-i);font:600 11px/20px var(--ps-font);text-align:center}
.shl-dot{width:8px;height:8px;border-radius:50%;background:var(--ps-good)}
.shl[data-st="saving"] .shl-dot{background:var(--ps-dim)}
.shl[data-st="error"] .shl-dot{background:var(--ps-bad)}
.shl.open .shl-pill{display:none}
.shl-panel{position:fixed;top:56px;right:0;bottom:0;z-index:158;width:340px;max-width:100vw;box-sizing:border-box;display:none;flex-direction:column;
  background:var(--ps-card);color:var(--ps-ink);box-shadow:inset 1px 0 0 var(--ps-line);font-family:var(--ps-font)}
.shl.open .shl-panel{display:flex}
.shl-panel header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px 16px 10px}
.shl-panel h2{margin:0;font:600 18px/1.33 var(--ps-font);letter-spacing:-.01em}
.shl-sub{margin:2px 0 0;font:400 12.5px/1.4 var(--ps-font);color:var(--ps-dim)}
.shl-close{width:36px;height:36px;display:grid;place-items:center;border:none;border-radius:9999px;background:transparent;color:var(--ps-ink-2);cursor:pointer;flex:none}
.shl-close:hover{background:var(--ps-fill)}
.shl-close svg{width:20px;height:20px;fill:currentColor}
.shl-share{display:flex;gap:8px;padding:0 16px}
.shl-share .p-in{flex:1;min-width:0;height:36px;font-size:12.5px;color:var(--ps-ink-2)}
.shl-share .p-ghost{display:flex;align-items:center;gap:6px;flex:none;height:36px}
.shl-share svg{width:16px;height:16px;fill:currentColor}
.shl-me{margin:10px 16px 0;font:400 12.5px/1.4 var(--ps-font);color:var(--ps-ink-2)}
.shl-me b{font-weight:600;color:var(--ps-ink)}
.shl-me button{border:none;background:none;padding:0;color:var(--ps-link);font:inherit;text-decoration:underline;cursor:pointer}
.shl-state{margin:4px 16px 12px;font:400 12px/1.4 var(--ps-font);color:var(--ps-dim)}
.shl-state.error{color:var(--ps-bad)}
.shl-list{list-style:none;margin:0;padding:4px 16px 16px;overflow:auto;flex:1;box-shadow:inset 0 1px 0 var(--ps-hair)}
.shl-list>li{padding:14px 0;box-shadow:inset 0 -1px 0 var(--ps-hair)}
.shl-who{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.shl-av{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:var(--ps-fill-h);color:var(--ps-ink);font:600 11.5px/1 var(--ps-font);flex:none}
.shl-who b{font:600 13.5px/1.3 var(--ps-font)}
.shl-who b s{text-decoration:none;font-weight:400;color:var(--ps-dim)}
.shl-who time{margin-left:auto;font:400 11.5px/1.3 var(--ps-font);color:var(--ps-dim);white-space:nowrap}
.shl-list ul{list-style:none;margin:0;padding:0 0 0 32px;display:flex;flex-direction:column;gap:6px}
.shl-list ul li{font:400 12.5px/1.45 var(--ps-font);color:var(--ps-ink-2)}
.shl-list ul li b{font-weight:600;color:var(--ps-ink)}
.shl-list em{font-style:normal;color:var(--ps-ink-2)}
.shl-list q{display:block;quotes:none;margin-top:2px;color:var(--ps-ink);overflow-wrap:anywhere}
.shl-list q::before,.shl-list q::after{content:none}
.shl-list q.was{color:var(--ps-dim);text-decoration:line-through}
.shl-more,.shl-empty{color:var(--ps-dim)}
.shl-empty{padding:18px 0;font:400 12.5px/1.5 var(--ps-font)}
.shl-panel footer{padding:10px 16px 14px;box-shadow:inset 0 1px 0 var(--ps-hair)}
.shl-leave{border:none;background:none;padding:0;color:var(--ps-dim);font:400 12px/1.4 var(--ps-font);text-decoration:underline;cursor:pointer}
.shl-toast{position:fixed;right:16px;bottom:68px;z-index:159;max-width:320px;padding:10px 14px;border-radius:12px;background:var(--ps-ink);color:var(--ps-app);
  font:500 12.5px/1.4 var(--ps-font);opacity:0;transform:translateY(4px);pointer-events:none;transition:opacity .15s,transform .15s}
.shl-toast.on{opacity:1;transform:none}
.shl.open .shl-toast{right:356px}
html.shl-on .p-rail,html.shl-on .gd-askwrap{padding-bottom:72px}
.shl[hidden]{display:none}
/* Shared ad sets: the panel sits over the Ad sets window and the window makes room for it.
   Away from that view (the window closed, another folder open) only the pill stays, and
   pressing it goes back to the shared ad sets. */
html.shl-as .shl-pill{z-index:210}html.shl-as .shl-panel{z-index:211;top:0}html.shl-as .shl-toast{z-index:212}
.shl.away .shl-panel{display:none}.shl.away .shl-pill{display:flex}
@media (min-width:761px){html.shl-as.shl-open .as-ov{right:340px}}
/* An open panel takes its width from the workspace instead of covering the rail beside it. */
@media (min-width:761px){html.shl-open .p-body{margin-right:340px}html.shl-open .gd:not([data-mode="editor"]),html.shl-open .cw{right:340px}
  html.shl-open .p-panelbar{right:340px}html.shl-open .p-rail-c[data-open],html.shl-open .p-rail-r[data-open],html.shl-open .gd[data-mode="editor"] .gd-in-zone[data-open]{right:340px}}
.shl-dlg{position:fixed;inset:0;z-index:400;display:grid;place-items:center;padding:16px;background:rgba(10,11,13,.55)}
.shl-dlg-c{width:min(460px,100%);box-sizing:border-box;padding:24px;border-radius:16px;background:var(--ps-card);color:var(--ps-ink);box-shadow:0 0 0 1px var(--ps-line);font-family:var(--ps-font)}
.shl-dlg h2{margin:0 0 8px;font:600 20px/1.3 var(--ps-font);letter-spacing:-.01em}
.shl-lead{margin:0 0 16px;font:400 14px/1.5 var(--ps-font);color:var(--ps-ink-2)}
.shl-lead b{color:var(--ps-ink);font-weight:600}
.shl-fld{display:flex;flex-direction:column;gap:6px;font:500 13px/1.3 var(--ps-font)}
.shl-fld[hidden],.shl-link[hidden]{display:none}
.shl-fld .p-in,.shl-link .p-in{width:100%;box-sizing:border-box;height:42px;font-size:15px}
.shl-note{margin:8px 0 0;font:400 12px/1.4 var(--ps-font);color:var(--ps-dim)}
.shl-st{margin:10px 0 0;min-height:1.4em;font:400 13px/1.4 var(--ps-font);color:var(--ps-ink-2)}
.shl-st.bad{color:var(--ps-bad)}
.shl-link{display:flex;gap:8px;margin-top:4px}
.shl-link .p-in{font-size:13px;color:var(--ps-ink-2)}
.shl-link .p-ghost{flex:none;height:42px}
.shl-acts{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}
.shl-acts button[hidden]{display:none}
@media (max-width:760px){.shl-panel{width:100vw;top:92px}.shl.open .shl-toast{right:16px}}
@media (prefers-reduced-motion:reduce){.shl-toast{transition:none}}
`;
    document.head.appendChild(s);
  }
})();
