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
  // What a project looks like once this studio has loaded it: its migration (normState) and its
  // defaults for any missing key. The state a link hands over is compared in THIS shape, or
  // merely opening a link reads as an edit ("Sara changed the design") because loading filled
  // in a default nobody chose.
  SP.shNorm = function (st) {
    const C = this.constructor;
    try {
      const p = JSON.parse(JSON.stringify(st || {}));
      if (C.normState) C.normState(p);
      return this.shPub(Object.assign(C.defaults ? C.defaults() : {}, p));
    } catch (e) { return JSON.parse(JSON.stringify(st || {})); }
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
      const SZ = { st: ' (9:16)', ls: ' (1.91:1)', bn: ' (banner)', pt: ' (3:4)' };
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
    const role = d.role || 'edit', rv = d.rv || null;
    const nm = '<b>' + esc((rv && rv.name) || meta.name || 'Untitled project') + '</b>';
    dlg.ready({
      title: role === 'ct' ? 'Check the copy' : role === 'pm' ? 'Ad set package' : role === 'dd' ? 'Open your review' : '',
      lead: role === 'ct' ? nm + ' · copy check, from ' + esc(meta.by || 'the designer') + '. You see the words beside every image of the ad. Change them as needed — the images update as you type — then press <b>Copy approved</b>.'
        : role === 'pm' ? nm + ' · ad set package, from ' + esc(meta.by || 'the designer') + '. You see every variant and size, rendered from the latest project, and can download them. You cannot change the project from this link.'
        : role === 'dd' ? nm + ' · the designer’s review link. You have the full Campaign Studio, and mark the design done when it is ready.'
        : nm + ' · shared by ' + esc(meta.by || 'someone') + ' in ' + esc(spec.label) + '. Anyone with this link can change it, and the Changes panel shows who changed what.',
      note: role === 'pm' ? 'Your name shows who looked at the package.' : 'Your name is shown beside every change you make.'
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
    if (role === 'ct' || role === 'pm') st.screen = 'editor';
    if (role === 'dd') Arch.add(id, (rv && rv.name) || meta.name || '');
    const imgs = {}; slots.forEach(s => { if (images[s]) imgs[s] = d.imgs[s].h; });
    const key = 'provident-share:' + meta.app;
    ssSet(key, { id, rev: d.rev, n: d.n, pid: st.pid, imgs, name: meta.name || '', role, rv });
    ssSet('provident-share-base:' + meta.app, meta.app === this.shApp() ? this.shNorm(d.state) : d.state);
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
    try {
      const id = await this.shCreateRaw(dlg, name);
      const link = this.shLink(id), copied = await copyText(link);
      dlg.done(link, copied);
      this.shareStart(true);
    } catch (e) { dlg.fail(e.message, 'Close'); }
  };
  // Puts the open project on the store and binds this tab to it; returns the new id.
  SP.shCreateRaw = async function (dlg, name) {
    dlg.busy('Uploading the project…');
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
    return r.id;
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
    this.rvApply(null);
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
      seen: +lsGet('provident-share-seen:' + b.id) || Date.now(), err: '',
      role: b.role || 'edit', rv: b.rv || null
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
    this.rvApply(S.role);
    if (S.role === 'dd') Arch.add(S.id, (S.rv && S.rv.name) || S.name);
    // the copy team works beside the review panel: its Copy approved button is there
    if (open || S.role === 'ct' || (S.role !== 'pm' && lsGet('provident-share-open') === '1')) this.shPanel(true);
    this.shRender();
    this.shPoll(true);
    this.forceUpdate();
  };
  SP.shTick = function () {
    const S = this._sh; if (!S || S.busy || StudioBase.loadingSession) return;
    if (!this.shBind()) { this.shareStop(true); return; }   // this tab has opened another project
    // the project browser and the template picker are not the project: no panel over them
    // (performance marketing and the content team work in the Ad sets window over everything)
    const away = S.role !== 'pm' && S.role !== 'ct' && /^(splash|pick)$/.test(this.state.screen || '');
    if (S.ui && S.ui.root.hidden !== away) {
      S.ui.root.hidden = away;
      document.documentElement.classList.toggle('shl-open', !away && S.ui.root.classList.contains('open'));
      document.documentElement.classList.toggle('shl-on', !away);
    }
    this.rvGuard();
    const cur = canon(this.shPub());
    if (cur !== S.lastS) { S.lastS = cur; S.lastT = Date.now(); }
    if (S.role === 'pm') { S.dirty.clear(); S.pending = false; if (S.ui) S.ui.status(S.err ? 'error' : 'view'); return; }
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
          const r = await api('save', { id: S.id }, { base: S.rev, state: cur, by, burst: burst.id, changes: burst.list, imgs: map, sum: S.rv ? this.rvSum(cur) : undefined });
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
    ssSet(this.shKey(), { id: S.id, rev: S.rev, n: S.n, pid: this.state.pid, imgs: S.imgs, name: S.name, role: S.role, rv: S.rv });
    if (!ssSet(this.shKey('-base'), S.base)) ssSet(this.shKey('-base'), null);
    ssSet(this.shKey('-log'), { from: S.from, log: S.log.slice(-200) });
  };
  SP.shPoll = async function (force) {
    const S = this._sh; if (!S || S.polling) return;
    if (!force && (document.hidden || S.busy)) return;
    S.polling = true;
    try {
      const r = await api('rev', { id: S.id });
      this.rvSet(r.rv);
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
    this.rvNotify(d.log || [], S.n - d.from);
    S.log = keep.concat(d.log || []); S.n = d.n;
    if (S.log.length > 300) { S.from += S.log.length - 300; S.log = S.log.slice(-300); }
    this.rvSet(d.rv);
    if (!logOnly && d.rev !== S.rev) {
      const theirs = this.shNorm(d.state), mine = this.shPub(), merged = merge3(S.base, mine, theirs);
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
      S.base = theirs; S.baseS = canon(theirs); S.rev = d.rev;
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
    this.rvRender();
  };
  // render keys for the Share panel's button, merged by both shells
  SP.shareVals = function () {
    const b = this.shBind(), S = this._sh, cas = this.shApp() === 'provident-ad-studio', role = S ? S.role : (b && b.role) || '';
    // the designer's Review links archive mounts into its empty host once React has drawn it
    if (cas) setTimeout(() => Arch.mount(this), 0);
    const rv = S && S.rv;
    return {
      rvShareOn: cas && role !== 'ct' && role !== 'pm' ? '1' : undefined,
      rvGo: () => this.reviewCreate(),
      rvLabel: rv ? 'Review links' : 'Start a review',
      rvTip: rv ? 'This project is under review. Opens the review panel with the three links.'
        : 'Makes three links: the full studio for you, the words beside every image for the content team, and the ad set overview for performance marketing — with the process Initial design · Copy check · Deploy campaign.',
      rvOn: rv ? '1' : undefined,
      shLinkGo: () => this.shareCreate(),
      shLinkLabel: b ? 'Copy edit link' : 'Share an edit link',
      shLinkTip: b ? 'This project is shared. Copies the link and opens the Changes panel.'
        : 'Makes a link anyone can open to view and edit this project, with a panel of who changed what.',
      shLinkOn: b ? '1' : undefined,
    };
  };

  // ---------- REVIEWS (CAS, 2026-10-26) ----------
  // A review is a shared project with three links, one per team:
  //   dd  the designer — the full studio; marks the design done or puts it back in progress
  //   ct  the content team — the Copy view only; approves the copy
  //   pm  performance marketing — the Ad sets overview only, rendered from the live project,
  //       with the package to download; view-only (the server refuses its saves)
  // The process is INITIAL DESIGN > COPY CHECK > DEPLOY CAMPAIGN. Design and copy are signed
  // off on their own; when both are, the package is ready. A role's link is a 16-character
  // token the server resolves, so the project's own id (the designer's link) never reaches
  // the other two. Each lock is the chrome's (html[data-rv-role]); the server only enforces
  // what pm may not do and who may move which step.
  const ROLE_NAME = { dd: 'Designer', ct: 'Content team', pm: 'Performance marketing', edit: 'Editor' };
  const RV_SIZES = ['sq', 'pt', 'st', 'ls'];   // what Meta takes — the banners are Eventbrite's
  const SIZE_LAB = { sq: 'Feed 1:1', pt: 'Portrait 3:4', st: 'Story 9:16', ls: 'Horizontal 1.91:1', bn: 'Eventbrite 1880', bs: 'Eventbrite 758' };
  const day = ms => ms ? new Date(ms).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const dayS = ms => ms ? new Date(ms).toLocaleDateString([], { day: 'numeric', month: 'short' }) : '';
  function rvSteps(rv) {
    const d = rv && rv.design, c = rv && rv.copy, r = rv && rv.ready;
    return [
      { label: 'Initial design', s: d ? 'done' : 'cur', sub: d ? 'Done · ' + d.by + ' · ' + dayS(d.at) : 'In progress' },
      { label: 'Copy check', s: c ? 'done' : 'cur', sub: c ? 'Approved · ' + c.by + ' · ' + dayS(c.at) : 'In progress' },
      { label: 'Deploy campaign', s: r ? 'done' : 'pend', sub: r ? 'Package ready · ' + dayS(r) : (d ? 'Waiting for the copy' : c ? 'Waiting for the design' : 'Waiting for design and copy') }
    ];
  }
  // dates above, the line, the steps under it — the shape of a delivery tracker
  function stepperHtml(rv, compact) {
    const st = rvSteps(rv), seg = on => '<span class="rv-seg"' + (on ? ' data-on="1"' : '') + '></span>';
    const dot = x => '<i class="rv-dot" data-s="' + x.s + '">' + (x.s === 'done' ? '<svg viewBox="0 -960 960 960"><path d="M382-354 734-706q12-12 28-12t28 12q12 12 12 28t-12 28L410-270q-12 12-28 12t-28-12L170-454q-12-12-11.5-28t12.5-28q12-12 28-12t28 12l155 156Z"/></svg>' : '') + '</i>';
    return '<div class="rv-st' + (compact ? ' rv-st-c' : '') + '" role="list" aria-label="Review progress">' +
      '<div class="rv-st-line" aria-hidden="true">' + dot(st[0]) + seg(st[0].s === 'done') + dot(st[1]) + seg(!!(rv && rv.ready)) + dot(st[2]) + '</div>' +
      '<div class="rv-st-lab">' + st.map(x => '<div role="listitem" data-s="' + x.s + '"><b>' + esc(x.label) + '</b><s>' + esc(x.sub) + '</s></div>').join('') + '</div></div>';
  }
  const pillHtml = rv => '<span class="rv-pill" data-s="' + (rv && rv.ready ? 'ready' : 'prog') + '">' + (rv && rv.ready ? 'Package ready' : 'In progress') + '</span>';
  // changes to the project itself (not step moves) after the package was ready
  const rvSince = (log, rv) => rv && rv.ready ? (log || []).filter(e => e.at > rv.ready && (e.changes || []).some(c => c.kind !== 'step')).length : 0;
  const LINK_ROWS = [
    ['dd', 'Designer', 'The full Campaign Studio. Change anything, and mark the design done.'],
    ['ct', 'Content team', 'The words beside every image of the ad. Change them, and approve the copy.'],
    ['pm', 'Performance marketing', 'The ad set overview only, always the latest images, and the package to download.']
  ];
  function linkRows(eng, id, tok) {
    return LINK_ROWS.map(([r, who, what]) => {
      const link = eng.shLink(r === 'dd' ? id : (tok || {})[r] || '');
      return '<div class="rv-lk"><div class="rv-lk-t"><b>' + who + '</b><s>' + what + '</s></div><div class="rv-lk-r"><input class="p-in" readonly value="' + esc(link) + '" aria-label="' + who + ' link"><button type="button" class="p-ghost" data-copy="' + esc(link) + '">Copy</button></div></div>';
    }).join('');
  }

  SP.rvSum = function (st) {
    if (this.shApp() !== 'provident-ad-studio') return undefined;
    const C = this.constructor; st = st || this.state;
    try {
      const sz = []; (st.variants || []).forEach(v => C.sizesFor(st, v).forEach(k => { if (sz.indexOf(k) < 0) sz.push(k); }));
      return { campaign: String(st.campaign || ''), mode: C.isCarousel(st) ? 'carousel' : 'single', variants: (st.variants || []).length,
        sizes: sz.map(k => SIZE_LAB[k] || k), comps: C.allMods(st).length, updated: Date.now(), pid: st.pid || '' };
    } catch (e) { return undefined; }
  };
  // a small picture of the first design, for the archive
  SP.rvThumb = async function () {
    if (this.shApp() !== 'provident-ad-studio') return undefined;
    try {
      const st = this.state, a = await this.loadAssets(st);
      const cv = this.renderOpsToCanvas(this.buildOps(st, 0, 'sq', a), .2);
      StudioBase.applyFont(this.state);
      const u = cv.toDataURL('image/webp', .8);
      return /^data:image\/webp/.test(u) && u.length < 110000 ? u : undefined;
    } catch (e) { return undefined; }
  };
  SP.rvLinks = function (id, tok) { return LINK_ROWS.map(([r, who, what]) => ({ who, what, link: this.shLink(r === 'dd' ? id : tok[r]) })); };

  // Share › Start a review: the project is shared first if it is not yet, then made a review.
  SP.reviewCreate = async function () {
    const S = this._sh, b = this.shBind();
    if (b && b.role && b.role !== 'dd' && b.role !== 'edit') return;
    if (S && S.rv) { this.shPanel(true); const d = S.ui.root.querySelector('.rv-dd'); if (d) d.open = true; return; }
    const dlg = nameDialog({ title: 'Start a review', btn: 'Make the review links',
      lead: 'Makes three links for this campaign. <b>Designer</b> (you) keeps the full studio; the <b>Content team</b> sees only the words beside every image, to edit; ' +
        '<b>Performance marketing</b> sees only the ad set overview, always the latest images, with the package to download. ' +
        'The process runs Initial design · Copy check · Deploy campaign: when you mark the design done and the content team approves the copy, the package is ready.',
      note: 'There is no sign-in — whoever holds a link has its role. Your name is shown beside every change you make.' });
    const name = await dlg.name();
    if (!name) return;
    lsSet(NAME_KEY, name);
    try {
      const id = b ? b.id : await this.shCreateRaw(dlg, name);
      dlg.busy('Making the review links…');
      const r = await api('rvmake', { id }, { by: name, sum: this.rvSum(this.shPub()), thumb: await this.rvThumb() });
      const bb = ssGet(this.shKey()) || {}; bb.role = 'dd'; bb.rv = r.rv; ssSet(this.shKey(), bb);
      Arch.add(id, (r.rv && r.rv.name) || this.shName());
      dlg.links(this.rvLinks(id, r.rv.tok));
      if (this._sh) { this._sh.role = 'dd'; this._sh.rv = r.rv; this.rvApply('dd'); this.shPanel(true); this.shPoll(true); }
      else this.shareStart(true);
    } catch (e) { dlg.fail(e.message || String(e), 'Close'); }
  };
  SP.rvSet = function (rv, role) {
    const S = this._sh; if (!S || rv === undefined) return;
    if (role && role !== S.role && (S.role === 'edit' || S.role === 'dd') && (role === 'edit' || role === 'dd')) { S.role = role; this.rvApply(role); }
    if (canon(rv) === canon(S.rv)) return;
    S.rv = rv;
    this.shPersist(); this.rvRender(); this.forceUpdate();
  };
  // a step someone else took, while this tab is in the background
  SP.rvNotify = function (log, skip) {
    const S = this._sh; if (!S || !S.rv || !window.Notification || Notification.permission !== 'granted' || !document.hidden) return;
    const me = StudioBase.shareName();
    (log || []).slice(Math.max(0, skip)).forEach(e => {
      if (e.by === me) return;
      (e.changes || []).filter(c => c.kind === 'step').forEach(c => {
        try { new Notification((S.rv.name || S.name || 'Campaign') + ' · review', { body: e.by + ' — ' + c.text, tag: 'rv-' + S.id + '-' + e.at }); } catch (er) {}
      });
    });
  };
  SP.rvStep = async function (act) {
    const S = this._sh; if (!S || this._rvBusy) return;
    this._rvBusy = act; this.rvRender();
    try {
      // the sign-off covers the latest words: whatever is waiting to save goes first
      const pend = () => S.busy || canon(this.shPub()) !== S.baseS || S.dirty.size > 0;
      for (let i = 0; i < 40 && pend(); i++) { if (!S.busy) await this.shSave(); else await new Promise(r => setTimeout(r, 250)); if (pend()) await new Promise(r => setTimeout(r, 250)); }
      const body = { act, by: StudioBase.shareName() || 'Someone' };
      if (act === 'design-done' || act === 'copy-done') body.thumb = await this.rvThumb();
      const r = await api('step', { id: S.id }, body);
      this.rvSet(r.rv);
      S.ui.flash(r.rv && r.rv.ready ? 'The package is ready for performance marketing' : act === 'design-done' ? 'Design marked done' : act === 'copy-done' ? 'Copy approved' : 'Back in progress');
      this.shPoll(true);
    } catch (e) { S.ui.flash(e.message || String(e)); }
    finally { this._rvBusy = null; this.rvRender(); }
  };
  SP.rvDrive = async function (v) {
    const S = this._sh; if (!S || S.role !== 'dd') return;
    try { const r = await api('rvset', { id: S.id }, { drive: v }); this.rvSet(r.rv); S.ui.flash('Drive location saved'); }
    catch (e) { S.ui.flash(e.message || String(e)); }
  };
  // the role's lock on the chrome
  SP.rvApply = function (role) {
    const h = document.documentElement, on = role && role !== 'edit' ? role : '';
    if (on) h.dataset.rvRole = on; else delete h.dataset.rvRole;
    h.classList.toggle('rv-pm', on === 'pm');
    h.classList.toggle('rv-as', on === 'pm' || on === 'ct');
    if (on !== 'pm' && this._rvBar) { if (this._rvRo) this._rvRo.disconnect(); this._rvBar.remove(); this._rvBar = null; }
    if (on === 'pm') this.rvBarMake();
    if (this._sh && this._sh.ui) this._sh.ui.root.dataset.role = on;
  };
  SP.rvGuard = function () {
    const S = this._sh; if (!S) return;
    if (S.role !== 'pm' && S.role !== 'ct') return;
    const h = this.host;
    if (!h || !h.asView) return;
    const mode = S.role === 'ct' ? 'text' : 'images';
    if (!h.state.adSetsOpen || !h._asSrc || h._asSrc.kind !== 'review') { this.rvPmOpen(); return; }
    if ((h._asMode || 'images') !== mode && h.asSetMode) h.asSetMode(mode);
    // someone else's change: read the project again — never while this person is mid-edit
    if (this._rvDir && this._rvDir.stale() && !(h._as && h._as.busy)) {
      const ae = h._ae, a = document.activeElement;
      const editing = (ae && (ae.dirty || ae.saving)) || (a && a.closest && a.closest('.as-ov') && /^(INPUT|TEXTAREA)$/.test(a.tagName));
      if (!editing) { h._ae = null; h.asScan(); }
    }
    if (S.role === 'pm') this.rvBarRender();
  };
  // performance marketing and the content team: the Ad sets window on a stand-in folder rendered
  // from the live project — Images for performance marketing, Edit text for the content team,
  // whose words are written back into the project itself
  SP.rvPmOpen = function () {
    const h = this.host, S = this._sh;
    if (!this._rvDir) this._rvDir = liveDir(this, S && S.role === 'ct');
    h._asMode = S && S.role === 'ct' ? 'text' : 'images'; h._asAll = false;
    if (!h.state.adSetsOpen) h.setState({ adSetsOpen: true });
    h.asView({ kind: 'review', handle: this._rvDir, name: this._rvDir.name });
  };
  function liveDir(eng, write) {
    const C = eng.constructor;
    let key = '', scanned = null, lm = Date.now(), cache = {}, assets = null, base = null;
    const keyNow = () => canon(eng.shPub()) + '|' + JSON.stringify(eng._filled || {});
    const sync = () => { const k = keyNow(); if (k !== key) { key = k; lm = Date.now(); cache = {}; assets = null; } };
    const fonts = async () => {
      const L = f => { try { return document.fonts.load(f).catch(() => null); } catch (e) { return null; } };
      await Promise.all(['100 103px "Google Sans Flex"', '300 41px "Google Sans Flex"', '400 59px "Google Sans Flex"', '500 28px "Google Sans Flex"'].map(L));
      try { await document.fonts.ready; } catch (e) {}
    };
    // one render per variant and size for a given project state, at the export's own size
    const render = (vi, sk) => {
      const id = vi + ':' + sk;
      if (!cache[id]) cache[id] = (async () => {
        const st = eng.state;
        if (!assets) assets = (async () => { await fonts(); return eng.loadAssets(st); })();
        const r = await eng.rasterFile(eng.buildOps(st, vi, sk, await assets), 'jpg', C.exportScale(sk, st));
        StudioBase.applyFont(eng.state);
        return r.data;
      })();
      return cache[id];
    };
    const nameOf = st => (st.campaign || 'Campaign').replace(/[^\w\-. ]/g, '').trim() || 'Campaign';
    const file = (nm, type, data) => ({ kind: 'file', name: nm, modified: lm, live: true,
      getFile: async () => new File([await data()], nm, { type, lastModified: lm }),
      // Edit text never re-exports over a live image (CAS checks the source's kind); a write
      // reaching one anyway is dropped
      createWritable: async () => ({ write: async () => {}, close: async () => {} }) });
    // The project file. Edit text reads it with getFull (the photos come from the studio's own
    // store, so its previews show them) and writes the words back: the edit is merged onto the
    // project as it is NOW, against the state it was read from, so a design change the designer
    // made meanwhile is kept.
    const json = nm => {
      const pub = () => { base = eng.shNorm(eng.shPub()); return { app: 'provident-ad-studio', state: eng.shPub() }; };
      const h = file(nm, 'application/json', async () => JSON.stringify(pub()));
      h.getFull = async () => {
        const sc = await StudioBase.sidecar(), images = {};
        Object.keys(sc || {}).forEach(k => { if (/^adstudio-/.test(k) && sc[k] && sc[k].u) images[k] = sc[k]; });
        return new File([JSON.stringify(Object.assign(pub(), { images }))], nm, { type: 'application/json', lastModified: lm });
      };
      if (write) h.createWritable = async () => {
        const parts = [];
        return { write: async x => { parts.push(x && x.data !== undefined ? x.data : x); },
          close: async () => {
            const doc = JSON.parse(await new Blob(parts.map(p => p instanceof Blob ? p : new Blob([p]))).text());
            const mine = eng.shNorm(doc.state), now = eng.shPub(), merged = merge3(base || now, mine, now);
            base = mine;
            if (!jsonEq(merged, now)) eng.upd(x => { Object.keys(merged).forEach(k => { x[k] = merged[k]; }); return x; });
            // its own edit is not a reason to read the project again — marked once React has it
            setTimeout(() => { sync(); scanned = key; }, 60);
          } };
      };
      return h;
    };
    const dirH = (nm, items) => ({ kind: 'directory', name: nm, queryPermission: async () => 'granted', requestPermission: async () => 'granted',
      async *entries() { for (const it of items) yield [it.name, it]; },
      async getDirectoryHandle(x) { const e = new Error('Not found'); e.name = 'NotFoundError'; throw e; } });
    // Variant A, B, C… holding <name>_Variant X_<job>.jpg — the names an export writes, so the
    // package downloads under the names Ads Manager will see. A carousel's pages are its letters.
    const tree = () => {
      sync(); scanned = key;
      const st = eng.state, name = nameOf(st), out = [];
      // the folder is the campaign and the project in it "Meta ads", so the window reads
      // Campaign › Meta ads and Download all names its zip after the campaign
      out.push(json('Meta ads.adstudio.json'));
      (st.variants || []).slice(0, 26).forEach((v, vi) => {
        const L = 'Variant ' + String.fromCharCode(65 + vi);
        const files = C.sizesFor(st, v).filter(k => RV_SIZES.indexOf(k) >= 0)
          .map(sk => file(name + '_' + L + '_' + (C.EXPORT_NAME[sk] || sk) + '.jpg', 'image/jpeg', () => render(vi, sk)));
        if (files.length) out.push(dirH(L, files));
      });
      return out;
    };
    return { kind: 'directory', get name() { return nameOf(eng.state); }, queryPermission: async () => 'granted', requestPermission: async () => 'granted',
      async *entries() { for (const it of tree()) yield [it.name, it]; },
      async getDirectoryHandle(x) { const it = tree().find(i => i.kind === 'directory' && i.name === x); if (it) return it; const e = new Error('Not found'); e.name = 'NotFoundError'; throw e; },
      stale() { return scanned !== null && keyNow() !== scanned; } };
  }
  // performance marketing's header over the Ad sets window
  SP.rvBarMake = function () {
    if (this._rvBar) return;
    injectCss();
    const el = document.createElement('div');
    el.className = 'rvh'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'Ad set package');
    document.body.appendChild(el);
    this._rvBar = el; this._rvBarHtml = '';
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-rv]'); if (!b) return;
      if (b.dataset.rv === 'dl' && this.host.asDownload) this.host.asDownload('*');
      if (b.dataset.rv === 'log') this.shPanel(true);
    });
    if (window.ResizeObserver) { this._rvRo = new ResizeObserver(() => document.documentElement.style.setProperty('--rvh', el.offsetHeight + 'px')); this._rvRo.observe(el); }
    this.rvBarRender();
  };
  SP.rvBarRender = function () {
    const S = this._sh, el = this._rvBar; if (!S || !el) return;
    const rv = S.rv || {}, ready = !!rv.ready, since = rvSince(S.log, rv), h = this.host;
    const n = h && h.asAllImgs ? h.asAllImgs() : 0, busy = !!(h && h._as && h._as.busy), dl = h && h._asDl;
    const dlLab = dl === 'busy' ? 'Zipping…' : dl === 'done' ? 'Downloaded' : (ready ? 'Download package' : 'Download current images') + (n ? ' · ' + n : '');
    const note = busy ? 'Rendering the latest images from the project…'
      : ready ? (since ? since + (since === 1 ? ' change' : ' changes') + ' since the package was ready — the images below include ' + (since === 1 ? 'it' : 'them') + '. <button type="button" data-rv="log">See what changed</button>'
        : 'Design and copy are signed off. The images below are what to run.')
      : 'Not ready to run yet. The images below are the latest from the project and update as the designer and the content team work.';
    const html = '<div class="rvh-in"><div class="rvh-top">' +
      '<div class="rvh-t"><span class="rvh-k">Ad set package</span><b>' + esc(rv.name || S.name || 'Campaign') + '</b></div>' + pillHtml(rv) +
      '<dl class="rvh-d"><div><dt>Created</dt><dd>' + esc(day(rv.created)) + (rv.by ? ' <s>by ' + esc(rv.by) + '</s>' : '') + '</dd></div>' +
      '<div><dt>Ready</dt><dd>' + (ready ? esc(day(rv.ready)) : '<s>Not yet</s>') + '</dd></div></dl>' +
      '<button type="button" class="' + (ready ? 'p-btn' : 'p-ghost') + ' rvh-dl" data-rv="dl"' + (n && dl !== 'busy' ? '' : ' disabled') + '>' + esc(dlLab) + '</button></div>' +
      stepperHtml(rv) + '<p class="rvh-note">' + note + '</p></div>';
    if (html === this._rvBarHtml) return;
    this._rvBarHtml = html; el.innerHTML = html;
    document.documentElement.style.setProperty('--rvh', el.offsetHeight + 'px');
  };
  // the review section of the Changes panel
  SP.rvRender = function () {
    const S = this._sh; if (!S || !S.ui) return;
    const sec = S.ui.root.querySelector('.rv');
    S.ui.root.querySelector('.shl-panel h2').textContent = S.rv ? 'Review' : 'Changes';
    if (!S.rv) { sec.hidden = true; return; }
    sec.hidden = false;
    const rv = S.rv, role = S.role, busy = this._rvBusy, since = rvSince(S.log, rv), acts = [];
    if (role === 'dd') {
      acts.push(rv.design ? ['design-open', 'Back to in process', 'p-ghost', 'Reopens the design. The package is not ready again until you mark the design done.']
        : ['design-done', 'Mark design done', 'p-btn', 'Says the design is finished. When the copy is approved too, the package is ready for performance marketing.']);
      if (rv.copy) acts.push(['copy-open', 'Reopen copy check', 'p-ghost', 'Sends the copy back to the content team to check again.']);
    }
    if (role === 'ct') acts.push(rv.copy ? ['copy-open', 'Reopen copy check', 'p-ghost', 'Takes your approval back while you change the words again.']
      : ['copy-done', 'Copy approved', 'p-btn', 'Says the words are final. When the design is done too, the package is ready for performance marketing.']);
    const lead = role === 'ct' ? (rv.copy ? 'You approved the copy. A change you make now reaches performance marketing too — reopen the check first if it needs another look.' : 'Change the words on the left; every image updates as you type, and the designer sees it within a few seconds. Approve the copy when it is ready to run.')
      : role === 'pm' ? (rv.ready ? 'The package is ready. Download it from the bar above.' : 'You will see the package turn ready here when the design is done and the copy is approved.')
      : role === 'dd' ? (rv.design ? 'You marked the design done.' : 'Mark the design done when it is ready for the content team’s final copy and for performance marketing.') : '';
    const main = '<div class="rv-h"><div><span class="rv-k">' + esc(ROLE_NAME[role] || 'Viewer') + '</span><b>' + esc(rv.name || S.name || 'Campaign') + '</b></div>' + pillHtml(rv) + '</div>' +
      stepperHtml(rv, true) +
      (since && role !== 'pm' ? '<p class="rv-since">' + since + (since === 1 ? ' change' : ' changes') + ' since the package was ready. Performance marketing sees the latest.</p>' : '') +
      '<p class="rv-lead">' + esc(lead) + '</p>' +
      (acts.length ? '<div class="rv-acts">' + acts.map(a => '<button type="button" class="' + a[2] + '" data-act="' + a[0] + '" title="' + esc(a[3]) + '"' + (busy ? ' disabled' : '') + '>' + (busy === a[0] ? 'Saving…' : esc(a[1])) + '</button>').join('') + '</div>' : '') +
      (window.Notification && Notification.permission === 'default' ? '<button type="button" class="rv-ntf" data-ntf="1">Notify me in this browser when a step changes</button>' : '');
    const m = sec.querySelector('.rv-main');
    if (m._h !== main) { m._h = main; m.innerHTML = main; }
    const dd = sec.querySelector('.rv-dd');
    dd.hidden = role !== 'dd' || !rv.tok;
    if (!dd.hidden) {
      const lk = linkRows(this, S.id, rv.tok);
      const box = dd.querySelector('.rv-lks');
      if (box._h !== lk) { box._h = lk; box.innerHTML = lk; }
      const inp = dd.querySelector('.rv-drv input');
      if (document.activeElement !== inp) inp.value = rv.drive || '';
    }
  };

  // ---------- the designer's archive: Review links on CAS's home page ----------
  // The reviews this computer started, or opened as the designer, are kept by id in
  // localStorage; their records (status, dates, summary, log) are read from the store, where a
  // review's record never expires. The view is plain DOM mounted into an empty host element in
  // the home page's markup, so React never reconciles it.
  const ARCH_KEY = 'provident-reviews';
  const Arch = {
    list() { try { const a = JSON.parse(localStorage.getItem(ARCH_KEY) || '[]'); return Array.isArray(a) ? a.filter(x => x && /^[A-Za-z0-9]{8,15}$/.test(x.id || '')) : []; } catch (e) { return []; } },
    save(a) { lsSet(ARCH_KEY, JSON.stringify(a.slice(0, 200))); },
    add(id, name) {
      if (!id || id.length === 16) return;
      const a = this.list(), o = a.find(x => x.id === id);
      if (o) { if (name) o.name = name; } else a.unshift({ id, name: name || '', at: Date.now() });
      this.save(a);
    },
    drop(id) { this.save(this.list().filter(x => x.id !== id)); },
    mount(eng) { document.querySelectorAll('[data-rv-arch]').forEach(el => { if (!el._rva) el._rva = new ArchView(el, eng); }); }
  };
  window.providentReviews = Arch;
  function ArchView(el, eng) {
    injectCss();
    this.el = el; this.eng = eng; this.items = null; this.sel = null; this.det = null; this.err = '';
    el.innerHTML = '<div class="rva"><div class="rva-bar"><p>Every review this computer has started, or opened as the designer. Open one for its status, its details and everything that changed.</p>' +
      '<form class="rva-add"><input class="p-in" placeholder="Paste a designer’s review link to add it here" aria-label="Designer review link"><button class="p-ghost" type="submit">Add</button></form></div>' +
      '<div class="rva-body" aria-live="polite"></div></div>';
    el.addEventListener('click', e => this.click(e));
    el.querySelector('.rva-add').addEventListener('submit', e => {
      e.preventDefault();
      const inp = el.querySelector('.rva-add input'), m = /#share=([A-Za-z0-9]{8,16})/.exec(inp.value || '') || /^([A-Za-z0-9]{8,15})$/.exec((inp.value || '').trim());
      if (!m || m[1].length === 16) { this.err = 'That is not a designer’s review link — it is the link that opens the full studio.'; this.draw(); return; }
      Arch.add(m[1], ''); inp.value = ''; this.err = ''; this.load();
    });
    this.load();
  }
  const AV = ArchView.prototype;
  AV.load = async function () {
    const ids = Arch.list().map(x => x.id);
    this.items = ids.length ? null : [];
    this.draw();
    if (!ids.length) return;
    try {
      const out = [];
      for (let i = 0; i < ids.length; i += 50) out.push(...((await api('rvinfo', { ids: ids.slice(i, i + 50).join(',') })).items || []));
      this.items = out; this.err = '';
    } catch (e) { this.items = []; this.err = e.message || String(e); }
    this.draw();
  };
  AV.open = async function (id) {
    this.sel = id; this.det = null; this.draw();
    try { const r = await api('rvinfo', { ids: id, full: '1' }); this.det = (r.items || [])[0] || { id, gone: true }; }
    catch (e) { this.det = { id, error: e.message || String(e) }; }
    if (this.sel === id) this.draw();
  };
  AV.click = async function (e) {
    let t = e.target.closest('button,[data-id]'); if (!t || !this.el.contains(t)) return;
    if (t.dataset.copy) { const ok = await copyText(t.dataset.copy), sp = t.querySelector('span') || t, was = sp.textContent; sp.textContent = ok ? 'Copied' : 'Select it'; t.dataset.done = ok ? '1' : ''; setTimeout(() => { sp.textContent = was; t.dataset.done = ''; }, 1600); return; }
    if (t.dataset.id) { this.open(t.dataset.id); return; }
    const a = t.dataset.a;
    if (a === 'back') { this.sel = null; this.det = null; this.load(); }
    if (a === 'open') window.open(this.eng.shLink(this.sel), '_blank', 'noopener');
    if (a === 'refresh') this.load();
    if (a === 'rm' && window.confirm('Remove this review from the list on this computer? The links keep working, and the record stays on the share store — paste the designer’s link to add it back.')) { Arch.drop(this.sel); this.sel = null; this.det = null; this.load(); }
    if (a === 'drive') {
      const v = this.el.querySelector('.rva-drv input').value.trim();
      t.disabled = true;
      try {
        const r = await api('rvset', { id: this.sel }, { drive: v }); if (this.det && this.det.rv) this.det.rv.drive = r.rv.drive;
        this.draw(); t = this.el.querySelector('[data-a="drive"]') || t; t.disabled = true; t.textContent = 'Saved';   // the header gains its Drive button
      } catch (er) { t.textContent = 'Not saved'; window.alert(er.message || String(er)); }
      setTimeout(() => { t.disabled = false; t.textContent = 'Save'; }, 1600);
    }
  };
  AV.draw = function () {
    const body = this.el.querySelector('.rva-body'), errHtml = this.err ? '<p class="rva-err" role="alert">' + esc(this.err) + '</p>' : '';
    this.el.querySelector('.rva-bar').hidden = !!this.sel;
    if (this.sel) { body.innerHTML = this.detHtml(); return; }
    if (this.items === null) { body.innerHTML = errHtml + '<p class="rva-wait">Reading the reviews…</p>'; return; }
    if (!this.items.length) { body.innerHTML = errHtml + '<div class="p-empty2">No reviews yet. In a project, Share › Start a review makes the three links, and the review is kept here.</div>'; return; }
    const names = {}; Arch.list().forEach(x => { names[x.id] = x.name; });
    const card = it => {
      if (it.gone) return '<button class="rva-c" data-id="' + esc(it.id) + '" data-gone="1"><span class="rva-th"></span><span class="rva-ct"><span class="rva-n"><b>' + esc(names[it.id] || 'Unknown review') + '</b></span><span class="rva-m">No record on the share store</span></span></button>';
      const rv = it.rv || {}, sm = it.sum || {}, st = rvSteps(rv);
      return '<button class="rva-c" data-id="' + esc(it.id) + '"><span class="rva-th">' + (it.thumb ? '<img src="' + esc(it.thumb) + '" alt="">' : '') + '</span>' +
        '<span class="rva-ct"><span class="rva-n"><b>' + esc(sm.campaign || rv.name || names[it.id] || 'Campaign') + '</b>' + pillHtml(rv) + '</span>' +
        '<span class="rva-mini">' + st.map(x => '<span data-s="' + x.s + '"><i></i>' + esc(x.label) + '</span>').join('') + '</span>' +
        '<span class="rva-m">' + (rv.ready ? 'Ready ' + esc(day(rv.ready)) + ' · ' : '') + 'Created ' + esc(day(rv.created)) + (rv.by ? ' by ' + esc(rv.by) : '') + '</span></span></button>';
    };
    const sorted = this.items.slice().sort((a, b) => ((b.rv || {}).created || 0) - ((a.rv || {}).created || 0));
    const prog = sorted.filter(x => !x.gone && !(x.rv || {}).ready), done = sorted.filter(x => !x.gone && (x.rv || {}).ready), gone = sorted.filter(x => x.gone);
    const grp = (t, l) => l.length ? '<section class="rva-g"><h3>' + t + ' <s>' + l.length + '</s></h3><div class="rva-grid">' + l.map(card).join('') + '</div></section>' : '';
    body.innerHTML = errHtml + grp('In progress', prog) + grp('Package ready', done) + grp('Missing', gone);
  };
  // Material Rounded, wght 300 — the studio's icon family
  const ICO = {
    back: 'm294.92-450 206.77 206.77q8.92 8.92 8.81 20.88-.12 11.96-9.42 21.27-9.31 8.69-21.08 9-11.77.31-21.08-9L205.31-454.69q-5.62-5.62-7.92-11.85-2.31-6.23-2.31-13.46t2.31-13.46q2.3-6.23 7.92-11.85l253.61-253.61q8.31-8.31 20.58-8.5 12.27-.19 21.58 8.5 9.3 9.31 9.3 21.38 0 12.08-9.3 21.39L294.92-510H750q12.77 0 21.38 8.62Q780-492.77 780-480t-8.62 21.38Q762.77-450 750-450H294.92Z',
    dd: 'M247.69-147.69q-34.33 0-67.89-15.08-33.57-15.08-55.95-40.31 22.92-6.54 43.38-27.81 20.46-21.26 20.46-56.8 0-41.93 29.04-70.96 29.04-29.04 70.96-29.04 41.93 0 70.96 29.04 29.04 29.03 29.04 70.96 0 57.75-41.12 98.87-41.13 41.13-98.88 41.13Zm0-60q33 0 56.5-23.5t23.5-56.5q0-17-11.5-28.5t-28.5-11.5q-17 0-28.5 11.5t-11.5 28.5q0 23-5.5 42t-14.5 36q5 2 10 2h10ZM460-370l-89.23-89.23 342.61-342.61q11-11 27.5-11.5t28.5 11.5l33.23 33.23q12 12 12 28t-12 28L460-370Zm-172.31 82.31Z',
    ct: 'M210-400q-12.75 0-21.37-8.63-8.63-8.63-8.63-21.38 0-12.76 8.63-21.37Q197.25-460 210-460h220q12.75 0 21.38 8.63 8.62 8.63 8.62 21.38 0 12.76-8.62 21.37Q442.75-400 430-400H210Zm0-160q-12.75 0-21.37-8.63-8.63-8.63-8.63-21.38 0-12.76 8.63-21.37Q197.25-620 210-620h380q12.75 0 21.38 8.63 8.62 8.63 8.62 21.38 0 12.76-8.62 21.37Q602.75-560 590-560H210Zm0-160q-12.75 0-21.37-8.63-8.63-8.63-8.63-21.38 0-12.76 8.63-21.37Q197.25-780 210-780h380q12.75 0 21.38 8.63 8.62 8.63 8.62 21.38 0 12.76-8.62 21.37Q602.75-720 590-720H210Zm314.62 503.84v-54.46q0-7.06 2.61-13.68 2.62-6.62 8.23-12.24l206.31-205.31q7.46-7.46 16.11-10.5 8.65-3.03 17.3-3.03 9.43 0 18.25 3.53 8.82 3.54 16.03 10.62l37 37.38q6.46 7.47 10 16.16Q860-439 860-430.31t-3.23 17.69q-3.23 9-10.31 16.46L641.15-190.85q-5.61 5.62-12.23 8.23-6.63 2.62-13.69 2.62h-54.46q-15.37 0-25.76-10.4-10.39-10.39-10.39-25.76Zm287.69-214.15-37-37.38 37 37.38Zm-240 202.62h38l129.84-130.47-18.38-19-18.62-18.76-130.84 130.23v38Zm149.46-149.47-18.62-18.76 37 37.76-18.38-19Z',
    pm: 'M138.62-138.63Q130-147.25 130-160v-35.77q0-12.75 8.63-21.37 8.63-8.63 21.38-8.63 12.76 0 21.37 8.63 8.62 8.62 8.62 21.37V-160q0 12.75-8.63 21.37-8.63 8.63-21.38 8.63-12.76 0-21.37-8.63Zm160 0Q290-147.25 290-160v-215.77q0-12.75 8.63-21.37 8.63-8.63 21.38-8.63 12.76 0 21.37 8.63 8.62 8.62 8.62 21.37V-160q0 12.75-8.63 21.37-8.63 8.63-21.38 8.63-12.76 0-21.37-8.63Zm160 0Q450-147.25 450-160v-135.77q0-12.75 8.63-21.37 8.63-8.63 21.38-8.63 12.76 0 21.37 8.63 8.62 8.62 8.62 21.37V-160q0 12.75-8.63 21.37-8.63 8.63-21.38 8.63-12.76 0-21.37-8.63Zm160 0Q610-147.25 610-160v-195.77q0-12.75 8.63-21.37 8.63-8.63 21.38-8.63 12.76 0 21.37 8.63 8.62 8.62 8.62 21.37V-160q0 12.75-8.63 21.37-8.63 8.63-21.38 8.63-12.76 0-21.37-8.63Zm160 0Q770-147.25 770-160v-355.77q0-12.75 8.63-21.37 8.63-8.63 21.38-8.63 12.76 0 21.37 8.63 8.62 8.62 8.62 21.37V-160q0 12.75-8.63 21.37-8.63 8.63-21.38 8.63-12.76 0-21.37-8.63ZM560-491.77q-14.08 0-27.22-5.4-13.14-5.4-24.01-15.29l-99.92-99.93q-3.46-3.46-8.85-3.46t-8.85 3.46L181.08-402.31q-8.93 8.92-21.39 8.81-12.46-.12-21.38-9.42-8.31-8.93-7.94-21.24.37-12.32 8.55-20.53l209.85-209.85q10.87-10.79 24.01-15.74 13.14-4.95 27.22-4.95 14.08 0 27.67 4.95 13.59 4.95 23.56 15.74l99.92 99.93q3.46 3.46 8.85 3.46t8.85-3.46l210.07-210.08q8.93-8.92 21.39-8.81 12.46.12 21.38 9.42 8.31 8.93 7.94 21.24-.37 12.32-8.55 20.53L611.23-512.46q-9.97 9.89-23.56 15.29-13.59 5.4-27.67 5.4Z',
    copy: 'M362.31-260Q332-260 311-281q-21-21-21-51.31v-455.38Q290-818 311-839q21-21 51.31-21h335.38Q728-860 749-839q21 21 21 51.31v455.38Q770-302 749-281q-21 21-51.31 21H362.31Zm0-60h335.38q4.62 0 8.46-3.85 3.85-3.84 3.85-8.46v-455.38q0-4.62-3.85-8.46-3.84-3.85-8.46-3.85H362.31q-4.62 0-8.46 3.85-3.85 3.84-3.85 8.46v455.38q0 4.62 3.85 8.46 3.84 3.85 8.46 3.85Zm-140 200Q192-120 171-141q-21-21-21-51.31v-485.38q0-12.77 8.62-21.39 8.61-8.61 21.38-8.61t21.39 8.61q8.61 8.62 8.61 21.39v485.38q0 4.62 3.85 8.46 3.84 3.85 8.46 3.85h365.38q12.77 0 21.39 8.61 8.61 8.62 8.61 21.39 0 12.77-8.61 21.38-8.62 8.62-21.39 8.62H222.31ZM350-320v-480 480Z',
    ext: 'M212.31-140Q182-140 161-161q-21-21-21-51.31v-535.38Q140-778 161-799q21-21 51.31-21h222.3q12.77 0 21.39 8.62 8.61 8.61 8.61 21.38T456-768.62q-8.62 8.62-21.39 8.62h-222.3q-4.62 0-8.46 3.85-3.85 3.84-3.85 8.46v535.38q0 4.62 3.85 8.46 3.84 3.85 8.46 3.85h535.38q4.62 0 8.46-3.85 3.85-3.84 3.85-8.46v-222.3q0-12.77 8.62-21.39 8.61-8.61 21.38-8.61t21.38 8.61q8.62 8.62 8.62 21.39v222.3Q820-182 799-161q-21 21-51.31 21H212.31ZM760-717.85 409.85-367.69q-8.31 8.3-20.89 8.5-12.57.19-21.27-8.5-8.69-8.7-8.69-21.08 0-12.38 8.69-21.08L717.85-760H590q-12.77 0-21.38-8.62Q560-777.23 560-790t8.62-21.38Q577.23-820 590-820h193.84q15.47 0 25.81 10.35Q820-799.31 820-783.84V-590q0 12.77-8.62 21.38Q802.77-560 790-560t-21.38-8.62Q760-577.23 760-590v-127.85Z',
    del: 'M292.31-140q-29.83 0-51.07-21.24Q220-182.48 220-212.31V-720h-10q-12.75 0-21.37-8.63-8.63-8.63-8.63-21.38 0-12.76 8.63-21.37Q197.25-780 210-780h150q0-14.69 10.35-25.04 10.34-10.34 25.03-10.34h169.24q14.69 0 25.03 10.34Q600-794.69 600-780h150q12.75 0 21.37 8.63 8.63 8.63 8.63 21.38 0 12.76-8.63 21.37Q762.75-720 750-720h-10v507.69q0 29.83-21.24 51.07Q697.52-140 667.69-140H292.31ZM680-720H280v507.69q0 5.39 3.46 8.85t8.85 3.46h375.38q5.39 0 8.85-3.46t3.46-8.85V-720ZM427.54-288.62q8.61-8.63 8.61-21.38v-300q0-12.75-8.63-21.38-8.62-8.62-21.38-8.62-12.75 0-21.37 8.62-8.61 8.63-8.61 21.38v300q0 12.75 8.62 21.38 8.63 8.62 21.39 8.62 12.75 0 21.37-8.62Zm147.69 0q8.61-8.63 8.61-21.38v-300q0-12.75-8.62-21.38-8.63-8.62-21.39-8.62-12.75 0-21.37 8.62-8.61 8.63-8.61 21.38v300q0 12.75 8.63 21.38 8.62 8.62 21.38 8.62 12.75 0 21.37-8.62ZM280-720v520-520Z'
  };
  const ico = (k, c) => '<svg class="' + (c || 'rva-i') + '" viewBox="0 -960 960 960" aria-hidden="true"><path d="' + ICO[k] + '"/></svg>';
  // what has to happen before the package is ready, in plain words
  function rvNext(rv) {
    if (rv.ready) return 'Ready since ' + day(rv.ready) + '. Performance marketing sees the latest images and can download the package.';
    if (rv.design) return 'Next: the content team approves the copy.';
    if (rv.copy) return 'Next: the designer marks the design done.';
    return 'Next: the designer marks the design done and the content team approves the copy, in either order.';
  }
  AV.detHtml = function () {
    const d = this.det, back = '<button type="button" class="p-ghost rva-back" data-a="back">' + ico('back') + 'All reviews</button>';
    if (!d) return back + '<p class="rva-wait">Reading the review…</p>';
    if (d.error || d.gone) return back + '<p class="rva-err" role="alert">' + esc(d.error || 'This review has no record on the share store.') + '</p><button type="button" class="rva-rm" data-a="rm">' + ico('del') + 'Remove from this list</button>';
    const rv = d.rv || {}, sm = d.sum || {}, name = sm.campaign || rv.name || 'Campaign';
    const drv = rv.drive || '', url = /^https?:\/\//.test(drv);
    const row = (k, v) => '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>';
    const log = (d.log || []).slice().reverse(), since = rvSince(d.log, rv);
    const meta = ['Created ' + esc(day(rv.created)) + (rv.by ? ' by ' + esc(rv.by) : '')].concat(sm.updated ? ['changed ' + esc(ago(sm.updated))] : []).join(' · ');
    const links = LINK_ROWS.map(([r, who, what]) => {
      const link = this.eng.shLink(r === 'dd' ? d.id : (rv.tok || {})[r] || '');
      return '<li class="rva-lk"><span class="rva-lk-i">' + ico(r) + '</span><div class="rva-lk-t"><b>' + who + '</b><s>' + what + '</s><code title="' + esc(link) + '">' + esc(link.replace(/^https?:\/\//, '')) + '</code></div>' +
        '<button type="button" class="p-ghost rva-cp" data-copy="' + esc(link) + '" aria-label="Copy the ' + who.toLowerCase() + ' link">' + ico('copy') + '<span>Copy link</span></button></li>';
    }).join('');
    const sizes = sm.sizes && sm.sizes.length ? '<span class="rva-chips">' + sm.sizes.map(z => '<span>' + esc(z) + '</span>').join('') + '</span>' : '—';
    return back +
      '<header class="rva-dh"><span class="rva-th rva-th-l">' + (d.thumb ? '<img src="' + esc(d.thumb) + '" alt="">' : '') + '</span>' +
      '<div class="rva-dt"><span class="rv-k">Campaign review</span><h2>' + esc(name) + '</h2>' +
      '<div class="rva-st">' + pillHtml(rv) + '<span>' + meta + '</span></div></div>' +
      '<div class="rva-da">' + (url ? '<a class="p-ghost rva-a" href="' + esc(drv) + '" target="_blank" rel="noopener">' + ico('ext') + 'Drive folder</a>' : '') +
      '<button type="button" class="p-btn" data-a="open"' + (d.live ? '' : ' disabled title="The project on this link has expired; the record is kept"') + '>' + ico('ext') + 'Open in Campaign Studio</button></div></header>' +
      '<div class="rva-cols"><div class="rva-main">' +
      '<section class="rva-card"><h3>Progress</h3>' + stepperHtml(rv) +
      '<p class="rva-next" data-s="' + (rv.ready ? 'ready' : 'prog') + '">' + esc(rvNext(rv)) + '</p>' +
      (since ? '<p class="rva-since">' + since + (since === 1 ? ' change' : ' changes') + ' since the package was ready.</p>' : '') + '</section>' +
      '<section class="rva-card"><h3>Review links</h3><p class="rva-sub">Each person gets their own link. Only the designer’s link opens the full studio.</p><ul class="rva-lks">' + links + '</ul></section>' +
      '<section class="rva-card"><h3>Activity <s>' + log.length + '</s></h3><ol class="shl-list rva-log">' + (log.length ? log.map(e =>
        '<li><div class="shl-who"><span class="shl-av">' + esc((e.by || '?').trim().charAt(0).toUpperCase()) + '</span><b>' + esc(e.by || 'Someone') + '</b><time>' + esc(ago(e.at)) + '</time></div><ul>' +
        (e.changes || []).slice(0, 20).map(c => '<li>' + line(c) + '</li>').join('') + ((e.changes || []).length > 20 ? '<li class="shl-more">+ ' + (e.changes.length - 20) + ' more</li>' : '') + '</ul></li>').join('')
        : '<li class="shl-empty">Nothing yet.</li>') + '</ol></section>' +
      '</div><aside class="rva-side">' +
      '<section class="rva-card"><h3>Details</h3><dl class="rva-dl">' +
      row('Format', sm.mode ? (sm.mode === 'carousel' ? 'Carousel · ' + (sm.variants || 0) + ' pages' : 'Single ad · ' + (sm.variants || 0) + ((sm.variants || 0) === 1 ? ' variant' : ' variants')) : '—') +
      row('Components', sm.comps != null ? String(sm.comps) : '—') +
      row('Sizes', sizes) +
      row('Project', d.live ? '<span class="rva-live">Live on the share store</span>' : 'Expired — the record is kept, the project can no longer be opened') +
      '</dl></section>' +
      '<section class="rva-card"><h3>Google Drive</h3><p class="rva-sub">Where this campaign’s files are kept, for everyone who opens this list.</p>' +
      '<label class="rva-drv"><span class="rva-vh">Google Drive location</span><input class="p-in" value="' + esc(drv) + '" placeholder="Drive folder link or path"><button type="button" class="p-ghost" data-a="drive">Save</button></label></section>' +
      '<button type="button" class="rva-rm" data-a="rm">' + ico('del') + 'Remove from this list</button>' +
      '</aside></div>';
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
    const queued = Object.keys(this.pend).length || Object.keys(this.pimg).length;
    if (queued && !this.busy && Date.now() - this.lastW > 1500) this.save();
    this.ui.status(this.busy || queued ? 'saving' : (this.err ? 'error' : 'ok'), this.err || undefined);
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
        // a preview written here but not yet uploaded is the current one
        const r = me.pimg[fid] || await me.rec(fid);
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
  // An edit lands in the shared data AT ONCE. It used to wait in `pend` until the upload, so a
  // rescan in between (switching to Images, another audience, someone else's change) read the
  // old words back into Edit text, and the next keystroke saved over the edit.
  AP.onJson = function (pid, st) {
    const p = (this.data.projs || []).find(x => x.id === pid); if (!p) return;
    p.st = st; this.pend[pid] = true; this.lastW = Date.now();
  };
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
      // Nothing is taken off the queue until the store has it: a failed save used to drop the
      // edit for good. The words are read against the last state the store confirmed.
      const pids = Object.keys(this.pend), pimg = Object.assign({}, this.pimg);
      const ch = [];
      pids.forEach(pid => {
        const p = (this.data.projs || []).find(x => x.id === pid); if (!p) return;
        const bp = (this.base.projs || []).find(x => x.id === pid);
        const A = this.words(p, bp ? bp.st : {}), B = this.words(p, p.st), who = this.label(p);
        Object.keys(B).forEach(k => { const x = A[k], y = B[k]; if (!x || x.value !== y.value)
          ch.push({ kind: x && x.value ? (y.value ? 'changed' : 'removed') : 'added', page: who + (y.page ? ' · ' + y.page : ''), label: y.label, was: x ? x.value : '', now: y.value }); });
        Object.keys(A).forEach(k => { if (!B[k] && A[k].value) ch.push({ kind: 'removed', page: who, label: A[k].label, was: A[k].value, now: '' }); });
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
          const sent = JSON.parse(JSON.stringify(this.data));
          const r = await api('save', { id: this.id }, { base: this.rev, state: sent, by, burst: burst.id, changes: burst.list, imgs: map });
          this.rev = r.rev; this.base = sent;
          Object.keys(map).forEach(k => { this.imgs[k] = map[k]; if (this.pimg[k] === pimg[k]) delete this.pimg[k]; });
          // a project edited again while this one uploaded stays queued
          pids.forEach(pid => {
            const a = (this.data.projs || []).find(x => x.id === pid), b = (sent.projs || []).find(x => x.id === pid);
            if (!a || !b || canon(a.st) === canon(b.st)) delete this.pend[pid];
          });
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
      ready: r => { if (r.title) $('h2').textContent = r.title; $('.shl-lead').innerHTML = r.lead; $('.shl-note').textContent = r.note || ''; $('.shl-st').textContent = ''; go.disabled = false; inp.disabled = false; setTimeout(() => inp.focus(), 30); },
      fail: (t, btn) => { $('.shl-st').textContent = t; $('.shl-st').classList.add('bad'); go.textContent = btn || 'Close'; go.disabled = false; go.onclick = () => close(''); x.hidden = true; },
      done: (link, copied) => {
        $('.shl-fld').hidden = true; $('.shl-note').textContent = '';
        $('.shl-lead').innerHTML = 'The link is ready' + (copied ? ' and copied' : '') + '. Send it to the people who should edit — they will be asked their name when they open it.';
        $('.shl-st').textContent = ''; const L = $('.shl-link'); L.hidden = false; L.querySelector('input').value = link;
        L.querySelector('.shl-cp').onclick = async () => { L.querySelector('.shl-cp').textContent = (await copyText(link)) ? 'Copied' : 'Select it'; L.querySelector('input').select(); };
        x.hidden = true; go.textContent = 'Done'; go.disabled = false; go.onclick = () => el.remove();
      },
      links: list => {
        $('.shl-fld').hidden = true; $('.shl-note').textContent = ''; $('.shl-st').textContent = '';
        $('.shl-lead').innerHTML = 'The review is ready. Send each team its own link — each person is asked their name when they open it. All three are also kept in <b>Review links</b> on the home page.';
        const box = document.createElement('div'); box.className = 'rv-lks shl-lks';
        box.innerHTML = list.map(l => '<div class="rv-lk"><div class="rv-lk-t"><b>' + esc(l.who) + '</b><s>' + esc(l.what) + '</s></div><div class="rv-lk-r"><input class="p-in" readonly value="' + esc(l.link) + '" aria-label="' + esc(l.who) + ' link"><button type="button" class="p-ghost" data-copy="' + esc(l.link) + '">Copy</button></div></div>').join('');
        box.addEventListener('click', async e => { const b = e.target.closest('[data-copy]'); if (!b) return; const ok = await copyText(b.dataset.copy); b.textContent = ok ? 'Copied' : 'Select it'; });
        $('.shl-acts').before(box); el.querySelector('.shl-dlg-c').classList.add('shl-wide');
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
        '<section class="rv" hidden><div class="rv-main"></div><details class="rv-dd" hidden><summary>Review links and Drive location</summary><div class="rv-lks"></div>' +
          '<label class="rv-drv"><span>Google Drive location</span><span class="rv-drv-r"><input class="p-in" placeholder="Paste the project’s Drive folder link or path"><button type="button" class="p-ghost" data-drv="1">Save</button></span></label></details></section>' +
        '<div class="shl-share"><input class="p-in" readonly aria-label="Edit link"><button class="p-ghost" type="button">' + svg(ICON.link) + 'Copy</button></div>' +
        '<p class="shl-me"></p><p class="shl-state" aria-live="polite"></p>' +
        '<ol class="shl-list"></ol>' +
        '<footer><button class="shl-leave" type="button">Stop following this link on this tab</button></footer>' +
      '</aside><div class="shl-toast" aria-live="polite"></div>';
    document.body.appendChild(root);
    const $ = s => root.querySelector(s);
    $('.shl-pill').onclick = () => eng.shPanel();
    // the review section's buttons
    root.addEventListener('click', async e => {
      const b = e.target.closest && e.target.closest('button'); if (!b || !root.contains(b)) return;
      if (b.dataset.act && eng.rvStep) eng.rvStep(b.dataset.act);
      if (b.dataset.copy) { const ok = await copyText(b.dataset.copy); b.textContent = ok ? 'Copied' : 'Select it'; setTimeout(() => { b.textContent = 'Copy'; }, 1600); }
      if (b.dataset.ntf && window.Notification) { try { await Notification.requestPermission(); } catch (er) {} if (eng.rvRender) eng.rvRender(); }
      if (b.dataset.drv && eng.rvDrive) eng.rvDrive(root.querySelector('.rv-drv input').value.trim());
    });
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
        $('.shl-state').textContent = kind === 'saving' ? (msg || 'Saving your changes…') : kind === 'error' ? (msg || 'Not saved yet')
          : kind === 'view' ? 'View only — this link shows the latest and cannot change the project' : 'All changes saved to the link';
        $('.shl-state').className = 'shl-state ' + kind;
      },
      flash(t) { const el = $('.shl-toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 3200); },
      set(v) {
        $('.shl-share input').value = v.link;
        $('.shl-sub').textContent = v.people > 1 ? v.people + ' people have edited' : 'Shared edit link';
        $('.shl-me').innerHTML = (root.dataset.role === 'pm' ? 'Viewing as <b>' : 'Editing as <b>') + esc(v.me || 'Someone') + '</b> · <button type="button">change</button>';
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
    if (c.kind === 'step' && !plain) return '<span class="shl-step">' + esc(c.text || '') + '</span>';
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
/* ---- REVIEWS: the stepper, the review panel section, the roles' locks, performance
   marketing's header and the designer's archive. ---- */
.rv-st{display:flex;flex-direction:column;gap:10px}
.rv-st-line{display:flex;align-items:center;padding:0 2px}
.rv-dot{flex:none;width:18px;height:18px;box-sizing:border-box;border-radius:50%;display:grid;place-items:center}
.rv-dot[data-s="done"]{background:var(--ps-link);box-shadow:0 0 0 4px color-mix(in srgb,var(--ps-link) 18%,transparent)}
.rv-dot svg{width:12px;height:12px;fill:var(--ps-card)}
.rv-dot[data-s="cur"]{background:var(--ps-card);box-shadow:inset 0 0 0 2px var(--ps-link),0 0 0 4px color-mix(in srgb,var(--ps-link) 14%,transparent)}
.rv-dot[data-s="pend"]{width:14px;height:14px;margin:2px;background:var(--ps-card);box-shadow:inset 0 0 0 2px var(--ps-line)}
.rv-seg{flex:1;height:0;margin:0 8px;border-top:2px dashed var(--ps-line)}
.rv-seg[data-on]{border-top-style:solid;border-top-color:var(--ps-link)}
.rv-st-lab{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.rv-st-lab>div{display:flex;flex-direction:column;gap:2px;min-width:0}
.rv-st-lab>div:nth-child(2){align-items:center;text-align:center}
.rv-st-lab>div:nth-child(3){align-items:flex-end;text-align:right}
.rv-st-lab b{font:600 14px/1.3 var(--ps-font);color:var(--ps-ink)}
.rv-st-lab [data-s="pend"] b{color:var(--ps-ink-2)}
.rv-st-lab s{text-decoration:none;font:400 12.5px/1.35 var(--ps-font);color:var(--ps-dim)}
.rv-st-c .rv-st-lab{gap:8px}.rv-st-c .rv-st-lab b{font-size:12.5px}.rv-st-c .rv-st-lab s{font-size:11.5px}
.rv-pill{flex:none;display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:9999px;background:var(--ps-fill);color:var(--ps-ink-2);font:600 12px/1 var(--ps-font);white-space:nowrap}
.rv-pill::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--ps-dim)}
.rv-pill[data-s="ready"]{background:var(--ps-good-q);color:var(--ps-good)}
.rv-pill[data-s="ready"]::before{background:var(--ps-good)}
.rv{display:flex;flex-direction:column;gap:12px;padding:2px 16px 16px;box-shadow:inset 0 -1px 0 var(--ps-hair)}
.rv[hidden],.rv-dd[hidden]{display:none}
.rv-main{display:flex;flex-direction:column;gap:14px}
.rv-h{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.rv-h>div{display:flex;flex-direction:column;gap:2px;min-width:0}
.rv-k{font:500 12px/1.3 var(--ps-font);color:var(--ps-dim)}
.rv-h b{font:600 15px/1.3 var(--ps-font);color:var(--ps-ink);overflow-wrap:anywhere}
.rv-lead,.rv-since{margin:0;font:400 12.5px/1.45 var(--ps-font);color:var(--ps-ink-2)}
.rv-since{color:var(--ps-ink)}
.rv-acts{display:flex;flex-wrap:wrap;gap:8px}
.rv-acts button{height:36px}
.rv-acts .p-btn{flex:1 1 auto}
.rv-ntf{align-self:flex-start;border:none;background:none;padding:0;color:var(--ps-link);font:500 12.5px/1.4 var(--ps-font);text-decoration:underline;cursor:pointer}
.rv-dd{border-radius:10px;box-shadow:inset 0 0 0 1px var(--ps-line)}
.rv-dd summary{padding:10px 12px;font:600 13px/1.3 var(--ps-font);color:var(--ps-ink);cursor:pointer}
.rv-dd[open] summary{box-shadow:inset 0 -1px 0 var(--ps-hair)}
.rv-dd .rv-lks{padding:12px}
.rv-lks{display:flex;flex-direction:column;gap:14px}
.rv-lk{display:flex;flex-direction:column;gap:6px;min-width:0}
.rv-lk-t{display:flex;flex-direction:column;gap:1px}
.rv-lk-t b{font:600 13px/1.3 var(--ps-font);color:var(--ps-ink)}
.rv-lk-t s{text-decoration:none;font:400 12px/1.4 var(--ps-font);color:var(--ps-dim)}
.rv-lk-r{display:flex;gap:8px}
.rv-lk-r .p-in{flex:1;min-width:0;height:36px;font-size:12.5px;color:var(--ps-ink-2)}
.rv-lk-r .p-ghost{flex:none;height:36px}
.rv-drv{display:flex;flex-direction:column;gap:6px;padding:0 12px 12px;font:500 12.5px/1.3 var(--ps-font);color:var(--ps-ink)}
.rv-drv-r{display:flex;gap:8px}.rv-drv .p-in{flex:1;min-width:0;height:36px;font-size:12.5px}.rv-drv .p-ghost{flex:none;height:36px}
.shl-step{font-weight:600;color:var(--ps-ink)}
.shl[data-role="ct"] .shl-leave,.shl[data-role="pm"] .shl-leave{display:none}
.shl-dlg-c.shl-wide{width:min(580px,100%)}
.shl-lks{margin:4px 0 0}
/* the content team: the Copy view and nothing else — no studio switcher, project, folder,
   save, Design, Preview or Share. Undo, Redo and the theme stay. */
html[data-rv-role="ct"] .p-top>.p-seg:not(.p-seg-mode),html[data-rv-role="ct"] .p-top>.p-vr,html[data-rv-role="ct"] .p-top>.p-tgrp:not(.p-tgrp-h),
html[data-rv-role="ct"] .p-seg-mode,html[data-rv-role="ct"] .p-prev,html[data-rv-role="ct"] .p-share{display:none!important}
/* performance marketing and the content team: the Ad sets window (Images for one, Edit text for
   the other) with nothing to choose, switch, share or close; the review panel over it */
html.rv-pm .as-ov{top:var(--rvh,150px)}
html.rv-as .as-mode,html.rv-as .as-srcgrp>.p-ghost:not(.as-ico),html.rv-as .as-share,html.rv-as .as-bar-sep,html.rv-as .as-x{display:none!important}
/* one project, so the audience list has nothing to choose — its width goes to the words and images */
html.rv-as .as-nav{display:none}html.rv-as .as-body{grid-template-columns:minmax(0,1fr)}
html.rv-as .shl-pill{z-index:210}html.rv-as .shl-panel{z-index:211;top:0}html.rv-as .shl-toast{z-index:212}
.rvh{position:fixed;top:0;left:0;right:0;z-index:205;background:var(--ps-card);color:var(--ps-ink);box-shadow:inset 0 -1px 0 var(--ps-line);font-family:var(--ps-font)}
.rvh-in{max-width:1180px;margin:0 auto;padding:16px 24px 14px;display:flex;flex-direction:column;gap:14px}
.rvh-top{display:flex;align-items:center;flex-wrap:wrap;gap:12px 20px}
.rvh-t{flex:1 1 220px;display:flex;flex-direction:column;gap:2px;min-width:0}
.rvh-k{font:500 12px/1.3 var(--ps-font);color:var(--ps-dim)}
.rvh-t b{font:600 20px/1.25 var(--ps-font);letter-spacing:-.01em;overflow-wrap:anywhere}
.rvh-d{display:flex;gap:24px;margin:0}
.rvh-d div{display:flex;flex-direction:column;gap:2px}
.rvh-d dt{font:500 12px/1.3 var(--ps-font);color:var(--ps-dim)}
.rvh-d dd{margin:0;font:600 14px/1.3 var(--ps-font);white-space:nowrap}
.rvh-d dd s{text-decoration:none;font-weight:400;color:var(--ps-ink-2)}
.rvh-dl{height:36px}
.rvh-note{margin:0;font:400 12.5px/1.45 var(--ps-font);color:var(--ps-ink-2)}
.rvh-note button{border:none;background:none;padding:0;color:var(--ps-link);font:inherit;text-decoration:underline;cursor:pointer}
@media (min-width:761px){html.rv-as.shl-open .as-ov,html.rv-pm.shl-open .rvh{right:340px}}
@media (max-width:760px){.rvh-in{padding:12px 16px}.rvh-d{gap:16px}.rvh-dl{flex:1 1 100%}}
/* the designer's archive */
.rva{max-width:1240px;margin-inline:auto;display:flex;flex-direction:column;gap:20px;font-family:var(--ps-font);color:var(--ps-ink)}
.rva-bar{display:flex;flex-wrap:wrap;align-items:center;gap:12px 24px}
.rva-bar[hidden]{display:none}
.rva-bar p{flex:1 1 300px;margin:0;font:400 13.5px/1.5 var(--ps-font);color:var(--ps-ink-2)}
.rva-add{flex:1 1 360px;display:flex;gap:8px}
.rva-add .p-in{flex:1;min-width:0;height:36px}
.rva-wait,.rva-err{margin:0;font:400 13.5px/1.5 var(--ps-font);color:var(--ps-ink-2)}
.rva-err{color:var(--ps-bad)}
.rva-g h3,.rva-sec h3{margin:0 0 12px;font:600 15px/1.3 var(--ps-font);color:var(--ps-ink)}
.rva-g h3 s,.rva-sec h3 s{margin-left:4px;text-decoration:none;font-weight:400;color:var(--ps-dim)}
.rva-g+.rva-g{margin-top:28px}
.rva-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
.rva-c{display:flex;align-items:center;gap:14px;padding:12px;border:none;border-radius:16px;background:var(--ps-card);box-shadow:0 0 0 1px var(--ps-line);color:var(--ps-ink);font:inherit;text-align:left;cursor:pointer}
.rva-c:hover{box-shadow:0 0 0 2px var(--ps-link)}
.rva-c:focus-visible,.rva button:focus-visible{outline:2px solid var(--ps-ink);outline-offset:2px}
.rva-th{flex:none;width:72px;height:72px;overflow:hidden;border-radius:10px;background:var(--ps-fill)}
.rva-th img{display:block;width:100%;height:100%;object-fit:cover}
.rva-ct{flex:1;display:flex;flex-direction:column;gap:6px;min-width:0}
.rva-n{display:flex;align-items:center;justify-content:space-between;gap:8px}
.rva-n b{overflow:hidden;font:600 14.5px/1.3 var(--ps-font);white-space:nowrap;text-overflow:ellipsis}
.rva-mini{display:flex;flex-wrap:wrap;gap:4px 12px;font:400 12px/1.3 var(--ps-font);color:var(--ps-ink-2)}
.rva-mini span{display:inline-flex;align-items:center;gap:5px}
.rva-mini i{width:8px;height:8px;border-radius:50%;box-shadow:inset 0 0 0 1.5px var(--ps-line)}
.rva-mini [data-s="done"] i{background:var(--ps-link);box-shadow:none}
.rva-mini [data-s="cur"] i{box-shadow:inset 0 0 0 1.5px var(--ps-link)}
.rva-m{font:400 12px/1.35 var(--ps-font);color:var(--ps-dim)}
.rva-i{width:18px;height:18px;flex:none;fill:currentColor}
.rva-back{display:inline-flex;align-items:center;gap:6px;height:32px;margin-bottom:20px;padding:0 14px 0 10px}
.rva-dh{display:flex;align-items:center;flex-wrap:wrap;gap:16px 20px;max-width:1240px;margin-bottom:24px}
.rva-th-l{width:88px;height:88px;border-radius:12px;box-shadow:0 0 0 1px var(--ps-hair)}
.rva-dt{flex:1 1 300px;display:flex;flex-direction:column;gap:6px;min-width:0}
.rva-dt h2{margin:0;font:600 26px/1.2 var(--ps-font);letter-spacing:-.01em;overflow-wrap:anywhere}
.rva-st{display:flex;align-items:center;flex-wrap:wrap;gap:6px 12px;font:400 13px/1.3 var(--ps-font);color:var(--ps-ink-2)}
.rva-da{display:flex;flex-wrap:wrap;gap:8px}
.rva-da .p-btn,.rva-da .rva-a{display:inline-flex;align-items:center;gap:8px;height:40px;text-decoration:none}
.rva-cols{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:20px;align-items:start;max-width:1240px}
.rva-main,.rva-side{display:flex;flex-direction:column;gap:20px;min-width:0}
.rva-card{padding:20px;border-radius:16px;background:var(--ps-card);box-shadow:0 0 0 1px var(--ps-line)}
.rva-card h3{margin:0 0 16px;font:600 15px/1.3 var(--ps-font);color:var(--ps-ink)}
.rva-card h3 s{margin-left:4px;text-decoration:none;font-weight:400;color:var(--ps-dim)}
.rva-sub{margin:-10px 0 14px;font:400 12.5px/1.45 var(--ps-font);color:var(--ps-dim)}
.rva-next{margin:20px 0 0;padding:12px 14px;border-radius:10px;background:var(--ps-fill);font:500 13px/1.45 var(--ps-font);color:var(--ps-ink)}
.rva-next[data-s="ready"]{background:var(--ps-good-q)}
.rva-since{margin:10px 0 0;font:400 12.5px/1.45 var(--ps-font);color:var(--ps-ink-2)}
.rva-lks{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.rva-lk{display:flex;align-items:center;gap:14px;padding:14px 0;box-shadow:inset 0 -1px 0 var(--ps-hair)}
.rva-lk:first-child{padding-top:0}.rva-lk:last-child{padding-bottom:0;box-shadow:none}
.rva-lk-i{flex:none;width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:var(--ps-fill);color:var(--ps-ink-2)}
.rva-lk-t{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}
.rva-lk-t b{font:600 13.5px/1.3 var(--ps-font);color:var(--ps-ink)}
.rva-lk-t s{text-decoration:none;font:400 12.5px/1.4 var(--ps-font);color:var(--ps-ink-2)}
.rva-lk-t code{margin-top:2px;overflow:hidden;font:400 11.5px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--ps-dim);white-space:nowrap;text-overflow:ellipsis}
.rva-cp{flex:none;display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 14px 0 12px}
.rva-cp .rva-i{width:16px;height:16px}
.rva-cp[data-done="1"]{color:var(--ps-good)}
.rva-log{flex:none;padding:0;overflow:visible;box-shadow:none}
.rva-log>li:first-child{padding-top:0}.rva-log>li:last-child{padding-bottom:0;box-shadow:none}
.rva-dl{display:flex;flex-direction:column;margin:0}
.rva-dl div{display:flex;flex-direction:column;gap:4px;padding:12px 0;box-shadow:inset 0 -1px 0 var(--ps-hair)}
.rva-dl div:first-child{padding-top:0}.rva-dl div:last-child{padding-bottom:0;box-shadow:none}
.rva-dl dt{font:500 12px/1.3 var(--ps-font);color:var(--ps-dim)}
.rva-dl dd{margin:0;font:400 13.5px/1.45 var(--ps-font);color:var(--ps-ink);overflow-wrap:anywhere}
.rva-chips{display:flex;flex-wrap:wrap;gap:6px}
.rva-chips span{padding:3px 9px;border-radius:9999px;background:var(--ps-fill);font:500 12px/1.4 var(--ps-font);color:var(--ps-ink)}
.rva-live{display:inline-flex;align-items:center;gap:7px}
.rva-live::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--ps-good)}
.rva-drv{display:flex;gap:8px}
.rva-drv .p-in{flex:1;min-width:0;height:36px}.rva-drv .p-ghost{flex:none;height:36px}
.rva-vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.rva-rm{align-self:flex-start;display:inline-flex;align-items:center;gap:6px;border:none;background:none;padding:4px 2px;color:var(--ps-dim);font:500 12.5px/1.4 var(--ps-font);cursor:pointer}
.rva-rm .rva-i{width:16px;height:16px}
.rva-rm:hover{color:var(--ps-bad)}
@media (max-width:1100px){.rva-cols{grid-template-columns:1fr}}
@media (max-width:760px){.rva-grid{grid-template-columns:1fr}.rva-dt h2{font-size:21px}.rva-th-l{width:64px;height:64px}.rva-da{width:100%;flex-direction:column-reverse}.rva-da .p-btn,.rva-da .rva-a{justify-content:center;white-space:nowrap}.rva-card{padding:16px}.rva-cp span{display:none}.rva-cp{padding:0 10px}}
`;
    document.head.appendChild(s);
  }
})();
