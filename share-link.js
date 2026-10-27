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
  // a name typed once wins; otherwise the Google account this computer signed in with
  StudioBase.shareName = () => lsGet(NAME_KEY) || lsGet('adstudio-author') || (window.providentDrive && window.providentDrive.alias ? window.providentDrive.alias() : '') || '';

  SP.shApp = function () { return this.sessionApp(); };
  SP.shKey = function (s) { return 'provident-share' + (s || '') + ':' + this.shApp(); };
  SP.shSpec = function () { return StudioBase.SESSIONS[this.shApp()]; };
  SP.shLink = function (id) {
    const sp = this.shSpec();
    return StudioBase.shareBase() + '/' + encodeURIComponent(sp ? sp.file : '') + '#share=' + id;
  };
  async function api(op, q, body, raw) {
    if (q && isDs(q.id)) return dsApi(op, q, body);
    if (op === 'rsinfo' && q && q.ids && String(q.ids).split(',').some(isDs)) {
      // an archive holding both kinds: Drive ad sets from Drive, the rest from the share store
      const all = String(q.ids).split(','), dsIds = all.filter(isDs), up = all.filter(x => !isDs(x));
      // not signed in to Google: the share store's ad sets still list, and the archive asks for a sign-in
      const [a, b] = await Promise.all([dsInfo(dsIds, q.full === '1').catch(e => { if (e.gdAuth) return { items: [], sign: dsIds.length }; throw e; }), up.length ? api('rsinfo', Object.assign({}, q, { ids: up.join(',') })) : { items: [] }]);
      const by = {}; a.items.concat(b.items || []).forEach(x => { by[x.id] = x; });
      return { items: all.map(x => by[x]).filter(Boolean), sign: a.sign || 0 };
    }
    let u = StudioBase.shareBase() + '/api/share?op=' + op;
    Object.keys(q || {}).forEach(k => { if (q[k] != null && q[k] !== '') u += '&' + k + '=' + encodeURIComponent(q[k]); });
    const opt = { cache: 'no-store' };
    if (body !== undefined) { opt.method = 'POST'; opt.headers = { 'Content-Type': raw ? 'text/plain' : 'application/json' }; opt.body = raw ? body : JSON.stringify(body); }
    let r;
    try { r = await fetch(u, opt); }
    catch (e) { const er = new Error('The share store could not be reached — check the connection and try again.'); er.net = true; throw er; }
    if ((op === 'chunk' || op === 'pv') && r.ok) return r.text();
    let d = null; try { d = await r.json(); } catch (e) {}
    if (r.status === 409) { const er = new Error('stale'); er.stale = true; er.rev = d && d.rev; throw er; }
    if (!r.ok) throw new Error((d && d.error) || ('The share store answered HTTP ' + r.status + '.'));
    return d;
  }

  // ══ REVIEW LINKS ON GOOGLE DRIVE (2026-10-27) ══════════════════════════════════════════════
  // An ad set made from now on lives in the Drive folder the designer names when starting it,
  // not in the share store:
  //   <Main folder>/
  //     Ad set review/Ad set.json          the ad set: labels, steps, the three links, its log
  //     <Market>/<Audience>/<English|Arabic>/
  //       <name>.adstudio.json             the project, with its review data (revision, photo
  //                                        map, changelog) under `review`; a session file too
  //       Assets/background-variant-a.webp  …its pictures, one file per picture
  //       <name>_Variant A_feed.jpg …      the exports, flat, when the designer exports there
  // A project's id is 'D' + its .adstudio.json's Drive file id; an ad set link is
  // 'R' + a random token + '.' + Ad set.json's file id. dsApi answers the share store's own
  // requests (get, sync, rev, save, rsget, rsstep, rsset, rsdel, rsinfo) in the same shapes, so
  // every screen of the review links works unchanged. Drive's sharing is the access control:
  // whoever opens a link signs in with their Google account and needs access to the folder; the
  // role in the link (designer, content team, performance marketing) is a workflow, as before.
  // the ad set's record is one file in the Main folder, named after the ad set; ad sets started
  // before it moved there keep theirs in 'Ad set review/Ad set.json' (links reach it by file id)
  const DS_SET = 'Ad set review', DS_FILE = 'Ad set.json', DS_ASSETS = 'Assets', DS_TAIL = '_Adset.json';
  const dsSetName = name => dsSafe(name || 'Ad set') + DS_TAIL;
  const DS_LANG = { ENG: 'English', ARB: 'Arabic' }, DS_FOLDER = 'application/vnd.google-apps.folder';
  const isDs = id => /^[DR][\w.-]{20,}$/.test(String(id || ''));
  const isRsId = id => { id = String(id || ''); return /^[A-Za-z0-9]{16}$/.test(id) || /^R[\w-]+\.[\w-]{20,}$/.test(id); };
  const SHARE_ID = /^(?:[A-Za-z0-9]{8,16}|[DR][\w.-]{20,})$/;
  const dsOn = () => !!(window.providentDrive && window.providentDrive.clientId && window.providentDrive.clientId());
  function dsFail(code, msg) { const e = new Error(msg); e.code = code; return e; }
  function dsAuth() { const e = new Error('Sign in with Google to open this review — it is stored in the ad set’s Drive folder.'); e.gdAuth = true; return e; }
  async function dsFetch(path, opt) {
    const D = window.providentDrive;
    if (!D || !D.valid()) { dsSignBar(); throw dsAuth(); }
    try { return await D.fetch(D.base() + path, opt); }
    catch (e) { if (e && e.gdAuth) dsSignBar(); throw e; }
  }
  const DS_F = 'id,name,mimeType,version,modifiedTime,size,parents';
  async function dsList(parent, name) {
    let q = "'" + parent + "' in parents and trashed=false";
    if (name != null) q += " and name='" + String(name).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
    const out = []; let tok = '';
    do {
      const r = await dsFetch('/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=nextPageToken,files(' + DS_F + ')&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true' + (tok ? '&pageToken=' + tok : ''));
      const d = await r.json(); out.push(...(d.files || [])); tok = d.nextPageToken || '';
    } while (tok);
    return out;
  }
  const dsMeta = async id => (await dsFetch('/drive/v3/files/' + id + '?fields=' + DS_F + '&supportsAllDrives=true')).json();
  async function dsFolder(parent, name) {
    const f = (await dsList(parent, name)).find(x => x.mimeType === DS_FOLDER);
    if (f) return f.id;
    const r = await dsFetch('/drive/v3/files?supportsAllDrives=true&fields=' + DS_F, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, mimeType: DS_FOLDER, parents: [parent] }) });
    return (await r.json()).id;
  }
  async function dsCreate(parent, name, blob) {
    const b = 'pds' + Math.random().toString(36).slice(2), type = blob.type || 'application/octet-stream';
    const body = new Blob(['--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify({ name, parents: [parent] }) +
      '\r\n--' + b + '\r\nContent-Type: ' + type + '\r\n\r\n', blob, '\r\n--' + b + '--'], { type: 'multipart/related; boundary=' + b });
    return (await dsFetch('/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=' + DS_F, { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body })).json();
  }
  const dsPut = async (id, blob) => (await dsFetch('/upload/drive/v3/files/' + id + '?uploadType=media&supportsAllDrives=true&fields=' + DS_F, { method: 'PATCH', headers: { 'Content-Type': blob.type || 'application/octet-stream' }, body: blob })).json();
  async function dsUpsert(parent, name, blob) { const f = (await dsList(parent, name)).find(x => x.mimeType !== DS_FOLDER); return f ? dsPut(f.id, blob) : dsCreate(parent, name, blob); }
  const dsJson = o => new Blob([JSON.stringify(o)], { type: 'application/json' });
  // A file's JSON, held by its Drive `version`: a poll costs one metadata request, and the
  // content is fetched again only when someone changed it.
  const DSC = {}, DSP = {};
  async function dsRead(id, fresh) {
    const c = DSC[id];
    if (c && !fresh && Date.now() - c.at < 1500) return c.d;
    const m = await dsMeta(id);
    if (c && c.v === m.version) { c.at = Date.now(); c.meta = m; return c.d; }
    const d = await (await dsFetch('/drive/v3/files/' + id + '?alt=media&supportsAllDrives=true')).json();
    DSC[id] = { v: m.version, d, at: Date.now(), meta: m };
    return d;
  }
  async function dsWrite(id, d) { const m = await dsPut(id, dsJson(d)); DSC[id] = { v: m.version, d, at: Date.now(), meta: m }; return m; }
  const dsNow = () => Date.now();
  const dsWho = v => String(v || '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Someone';
  function dsEntry(by, changes, burst) {
    if (!Array.isArray(changes) || !changes.length) return null;
    const out = [];
    changes.slice(0, 60).forEach(c => {
      if (!c || typeof c !== 'object') return;
      const e = {}; ['kind', 'page', 'label', 'was', 'now', 'text'].forEach(f => { if (c[f] != null && c[f] !== '') e[f] = String(c[f]).slice(0, 400); });
      if (Object.keys(e).length) out.push(e);
    });
    return out.length ? { by: dsWho(by), at: dsNow(), burst: String(burst || '').slice(0, 24), changes: out } : null;
  }
  const dsItemLabel = it => [it.market, it.aud, it.lang].filter(Boolean).join(' · ') || 'Project';
  function dsPub(rs, role) {
    if (!rs) return null;
    const o = {}; ['rid', 'name', 'product', 'created', 'by', 'drive', 'eng_only', 'items', 'plan'].forEach(k => { o[k] = rs[k]; });
    o.hist = (rs.hist || []).slice(-60);
    if (role === 'dd') o.tok = rs.tok;
    return o;
  }
  function dsLog(rs, by, changes) { const e = dsEntry(by, changes, ''); if (e) { e.rev = 0; rs.log = (rs.log || []).concat(e).slice(-500); } }
  async function dsResolve(id, p, fresh) {
    if (id[0] === 'R') {
      const fid = id.slice(id.indexOf('.') + 1), rs = await dsRead(fid, fresh);
      const role = Object.keys(rs.tok || {}).find(r => rs.tok[r] === id);
      if (!role || rs.deleted) throw dsFail(404, 'This review link is not valid.');
      if (p && !(rs.items || []).some(x => x.sid === p)) throw dsFail(404, 'That project is not in this ad set.');
      return { sid: p || null, role, rs, rid: fid };
    }
    const d = await dsRead(id.slice(1), fresh), rv = d.review || {};
    let rs = null;
    if (rv.rid) { try { rs = await dsRead(rv.rid, fresh); if (rs.deleted || !(rs.items || []).some(x => x.sid === id)) rs = null; } catch (e) { if (e.gdAuth) throw e; rs = null; } }
    return { sid: id, role: rs ? 'dd' : null, rs, rid: rs ? rv.rid : null };
  }
  const DS_STEP = { 'design-done': [['dd'], 'design', true], 'design-open': [['dd'], 'design', false], 'copy-done': [['ct'], 'copy', true], 'copy-open': [['ct', 'dd'], 'copy', false] };
  async function dsApi(op, q, body) {
    q = q || {}; body = body || {};
    if (op === 'rsinfo') return dsInfo(String(q.ids || '').split(',').filter(Boolean), q.full === '1');
    const writes = { save: 1, rsstep: 1, rsset: 1, rsdel: 1 };
    const R = await dsResolve(q.id, q.p, !!writes[op]);
    const pub = () => dsPub(R.rs, R.role);
    if (op === 'rsget') {
      if (!R.rs) throw dsFail(404, 'This project is not in an ad set review.');
      const proj = {};
      await Promise.all((R.rs.items || []).map(async it => {
        try {
          const d = await dsRead(it.sid.slice(1)), rv = d.review || {};
          proj[it.sid] = { rev: rv.rev || 0, n: (rv.log || []).length };
          if (q.full === '1') { proj[it.sid].sum = rv.sum || {}; proj[it.sid].thumb = rv.thumb || ''; }
        } catch (e) { if (e.gdAuth) throw e; proj[it.sid] = { rev: null, n: 0 }; }
      }));
      const out = { role: R.role, rs: pub(), proj, ln: (R.rs.log || []).length };
      if (q.full === '1') out.log = (R.rs.log || []).slice(-300);
      return out;
    }
    if (op === 'rsstep') {
      if (!R.rs) throw dsFail(404, 'This project is not in an ad set review.');
      const st = DS_STEP[body.act]; if (!st) throw dsFail(400, 'Unknown step.');
      const sid = body.p || R.sid, it = (R.rs.items || []).find(x => x.sid === sid);
      if (!it) throw dsFail(404, 'That project is not in this ad set.');
      if (st[0].indexOf(R.role) < 0) throw dsFail(403, 'Your link cannot change that step.');
      const by = dsWho(body.by), now = dsNow(), field = st[1], done = st[2], arb = it.lang === 'ARB';
      it[field] = done ? { by, at: now } : null;
      R.rs.hist = (R.rs.hist || []).concat({ act: body.act, by, at: now, sid }).slice(-400);
      const text = field === 'design' ? (done ? (arb ? 'Arabic laid out, ready for the translation check' : 'Marked the design done') : (arb ? 'Put the Arabic back in progress' : 'Put the design back in progress'))
        : (done ? (arb ? 'Approved the translation' : 'Approved the English copy') : (arb ? 'Reopened the translation check' : 'Reopened the copy check'));
      dsLog(R.rs, by, [{ kind: 'step', page: dsItemLabel(it), text }]);
      if (typeof body.thumb === 'string' && body.thumb.indexOf('data:image/') === 0 && body.thumb.length < 120000) R.rs.thumb = body.thumb;
      await dsWrite(R.rid, R.rs);
      return { rs: pub() };
    }
    if (op === 'rsset') {
      if (!R.rs) throw dsFail(404, 'This project is not in an ad set review.');
      if (R.role !== 'dd') throw dsFail(403, 'Only the designer changes the ad set.');
      const rs = R.rs, by = dsWho(body.by);
      if ('name' in body && String(body.name || '').trim()) {
        rs.name = String(body.name).trim().slice(0, 120);
        // the file in the Main folder follows the ad set's name (an older one in its subfolder keeps 'Ad set.json')
        try { const m = await dsMeta(R.rid); if (m.name.endsWith(DS_TAIL) && m.name !== dsSetName(rs.name)) await dsFetch('/drive/v3/files/' + R.rid + '?supportsAllDrives=true&fields=' + DS_F, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: dsSetName(rs.name) }) }); } catch (e) {}
      }
      if (body.eng_only && typeof body.eng_only === 'object') { rs.eng_only = rs.eng_only || {}; Object.keys(body.eng_only).slice(0, 40).forEach(k => { if (body.eng_only[k]) rs.eng_only[k] = true; else delete rs.eng_only[k]; }); }
      if (body.relabel) {
        const r = body.relabel, it = (rs.items || []).find(x => x.sid === r.sid);
        if (!it) throw dsFail(404, 'That project is not in this ad set.');
        if ((rs.items || []).some(x => x.sid !== r.sid && x.market === r.market && x.aud === r.aud && x.lang === r.lang)) throw dsFail(409, 'Another project in this ad set is already ' + dsItemLabel(r) + '.');
        const was = dsItemLabel(it);
        await dsMove(rs, it.sid, r);
        it.market = r.market; it.aud = r.aud; it.lang = r.lang;
        dsLog(rs, by, [{ kind: 'step', text: 'Changed ' + was + ' to ' + dsItemLabel(it) }]);
      }
      if (body.remove) {
        const gone = (rs.items || []).find(x => x.sid === body.remove);
        rs.items = (rs.items || []).filter(x => x.sid !== body.remove);
        try { const d = await dsRead(body.remove.slice(1), true); if (d.review) { delete d.review.rid; await dsWrite(body.remove.slice(1), d); } } catch (e) { if (e.gdAuth) throw e; }
        if (gone) dsLog(rs, by, [{ kind: 'step', text: 'Removed ' + dsItemLabel(gone) + ' from the ad set' }]);
      }
      await dsWrite(R.rid, rs);
      return { rs: pub() };
    }
    if (op === 'rsdel') {
      if (!R.rs || R.role !== 'dd') throw dsFail(403, 'Only the designer deletes an ad set.');
      for (const it of R.rs.items || []) { try { const d = await dsRead(it.sid.slice(1), true); if (d.review) { delete d.review.rid; await dsWrite(it.sid.slice(1), d); } } catch (e) { if (e.gdAuth) throw e; } }
      R.rs.deleted = dsNow(); R.rs.items = []; R.rs.tok = {};
      await dsWrite(R.rid, R.rs);
      return { deleted: true };
    }
    // ---- one project ----
    if (!R.sid) throw dsFail(400, 'Name the project (p=) — this is an ad set link.');
    const fid = R.sid.slice(1);
    if (op === 'get' || op === 'sync' || op === 'rev') {
      const d = await dsRead(fid, op !== 'rev'), rv = d.review || {}, log = rv.log || [], n = log.length;
      if (op === 'rev') return { rev: rv.rev || 0, n, role: R.role, rs: pub() };
      const from = op === 'get' ? Math.max(0, n - 200) : Math.min(n, Math.max(0, Number(q.from) || 0));
      const out = { state: d.state, rev: rv.rev || 0, imgs: rv.imgs || {}, log: log.slice(from), from, n, role: R.role, rs: pub() };
      if (op === 'get') out.meta = rv.meta || { app: d.app, name: '' };
      return out;
    }
    if (op === 'save') {
      if (R.role === 'pm') throw dsFail(403, 'This link is for viewing the ad sets — it cannot change the project.');
      const d = await dsRead(fid, true), rv = d.review || (d.review = {});
      if ((rv.rev || 0) !== Number(body.base || 0)) { const e = new Error('stale'); e.stale = true; e.rev = rv.rev || 0; throw e; }
      if (body.state != null) d.state = body.state;
      rv.rev = (rv.rev || 0) + 1;
      rv.imgs = rv.imgs || {};
      Object.keys(body.imgs || {}).forEach(sl => { if (body.imgs[sl]) rv.imgs[sl] = body.imgs[sl]; else delete rv.imgs[sl]; });
      const e = dsEntry(body.by, body.changes, body.burst);
      if (e) {
        e.rev = rv.rev;
        const log = rv.log || (rv.log = []), last = log[log.length - 1];
        if (e.burst && last && last.burst === e.burst) log[log.length - 1] = e; else log.push(e);
        rv.log = log.slice(-500);
      }
      if (R.rs && body.sum && typeof body.sum === 'object') rv.sum = body.sum;
      await dsWrite(fid, d);
      return { rev: rv.rev };
    }
    throw dsFail(404, 'Unknown request.');
  }
  // the designer's archive: one summary per ad set, by its designer link
  async function dsInfo(ids, full) {
    const items = [];
    for (const id of ids.slice(0, 60)) {
      try {
        const R = await dsResolve(id);
        if (R.role !== 'dd' || !R.rs) { items.push({ id, gone: true }); continue; }
        const e = { id, dd: R.rs.tok.dd, rs: dsPub(R.rs, 'dd'), thumb: R.rs.thumb || '', live: {} };
        const plog = [], proj = {};
        await Promise.all((R.rs.items || []).map(async it => {
          try {
            const d = await dsRead(it.sid.slice(1)), rv = d.review || {};
            e.live[it.sid] = true;
            proj[it.sid] = { sum: rv.sum || {}, thumb: rv.thumb || '' };
            if (full) (rv.log || []).slice(-100).forEach(x => plog.push(Object.assign({}, x, { page: dsItemLabel(it) })));
          } catch (er) { if (er.gdAuth) throw er; e.live[it.sid] = false; }
        }));
        if (full) { e.log = (R.rs.log || []).slice(-300); e.rs.hist = R.rs.hist || []; e.plog = plog; e.proj = proj; }
        items.push(e);
      } catch (er) { if (er.gdAuth) throw er; items.push({ id, gone: true }); }
    }
    return { items };
  }
  const dsRand = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 56]).join('');
  const dsSafe = t => String(t || 'Project').replace(/[\\/:*?"<>|#%]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Project';
  // where a project lives: <Main>/<Market>/<Audience>/<English|Arabic>
  async function dsPath(main, it) {
    const m = await dsFolder(main, it.market || 'Market');
    const a = await dsFolder(m, it.aud || 'Audience');
    return dsFolder(a, DS_LANG[it.lang] || it.lang || 'English');
  }
  // relabelling moves the project's folder to its new place
  async function dsMove(rs, sid, to) {
    const m = await dsMeta(sid.slice(1)), lang = (m.parents || [])[0];
    if (!lang || !rs.folder) return;
    const lm = await dsMeta(lang), m2 = await dsFolder(rs.folder, to.market), a2 = await dsFolder(m2, to.aud);
    await dsFetch('/drive/v3/files/' + lang + '?addParents=' + a2 + '&removeParents=' + ((lm.parents || [])[0] || '') + '&supportsAllDrives=true&fields=' + DS_F,
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: DS_LANG[to.lang] || to.lang }) });
    delete DSP[sid];
  }
  // A picture's file name in Assets/: what it is, then which variant.
  function dsAssetName(sl) {
    let m;
    const L = i => 'variant-' + String.fromCharCode(97 + (Number(i) || 0));
    if ((m = /^adstudio-bg-(\d+)(?:-(\w+))?$/.exec(sl))) return 'background-' + L(m[1]) + (m[2] ? '-' + ({ st: 'story', ls: 'landscape', pt: 'portrait', bn: 'banner' }[m[2]] || m[2]) : '');
    if ((m = /^adstudio-fg-(\d+)$/.exec(sl))) return 'cutout-' + L(m[1]);
    if (sl === 'adstudio-qr') return 'qr';
    if (sl === 'adstudio-colog') return 'logo-partner';
    if ((m = /^adstudio-mod-(.+)$/.exec(sl))) return 'graphic-' + m[1];
    if ((m = /^adstudio-ic-(.+)-(\d+)$/.exec(sl))) return 'icon-' + m[1] + '-' + (Number(m[2]) + 1);
    return sl.replace(/[^\w-]+/g, '-');
  }
  async function dsAssets(sid) {
    const P = DSP[sid] || (DSP[sid] = {});
    if (!P.assets) { const m = await dsMeta(sid.slice(1)); P.assets = await dsFolder((m.parents || [])[0], DS_ASSETS); }
    return P.assets;
  }
  // A picture goes up as its own file (at the sharing size, see slimFull); the link's photo map
  // names the file (f) and keeps the crop (m) — the bytes are never in a JSON.
  async function dsPutRec(id, slot, rec) {
    const txt = JSON.stringify(rec), h = fnv(txt), sl = await slimFull(rec);
    const blob = await (await fetch(sl.u)).blob();
    const ext = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg', 'image/gif': 'gif' }[blob.type] || 'bin';
    const f = await dsUpsert(await dsAssets(id), dsAssetName(slot) + '.' + ext, blob);
    const m = Object.assign({}, rec); delete m.u;
    return { h, n: 1, f: f.id, m };
  }
  async function dsFetchRec(e) {
    const b = await (await dsFetch('/drive/v3/files/' + e.f + '?alt=media&supportsAllDrives=true')).blob();
    const u = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
    return Object.assign({}, e.m || {}, { u });
  }
  // A new project in an ad set's folder: the folders on its path, its file, its pictures.
  async function dsProject(main, rid, it, st, by, name, app) {
    const lang = await dsPath(main, it);
    const fname = dsSafe(name) + '.adstudio.json';
    if ((await dsList(lang, fname)).length) throw dsFail(409, 'This folder already holds ' + fname + ' for ' + dsItemLabel(it) + '.');
    const now = dsNow();
    const doc = { app, state: st, images: {}, review: { meta: { app, name, by, created: now }, rev: 1, imgs: {}, rid,
      log: [{ by, at: now, burst: '', changes: [{ kind: 'note', text: 'Shared the project' }], rev: 1 }] } };
    const f = await dsCreate(lang, fname, dsJson(doc));
    DSC[f.id] = { v: f.version, d: doc, at: now, meta: f };
    return 'D' + f.id;
  }
  // Start an ad set in a folder, or add a project to one: the setup dialog's two paths.
  SP.dsReview = async function (dlg, ans) {
    const D = window.providentDrive, by = dsWho(ans.by);
    const st = this.shPub(), name = this.shName(st), app = this.shApp();
    let rs, rid;
    if (ans.mode === 'new') {
      const folder = await D.folderOf(ans.folder);
      dlg.busy('Setting up the ad set in “' + folder.name + '”…', .04);
      const files = (await dsList(folder.id)).filter(x => x.mimeType !== DS_FOLDER && x.name.endsWith(DS_TAIL));
      const oldDir = (await dsList(folder.id, DS_SET)).find(x => x.mimeType === DS_FOLDER);
      if (oldDir) files.push(...(await dsList(oldDir.id, DS_FILE)));
      let had = null;
      for (const x of files) { const old = await dsRead(x.id, true); if (!old.deleted) { had = x; break; } }
      if (had) { const old = await dsRead(had.id, true); throw dsFail(409, '“' + folder.name + '” already holds an ad set (' + (old.name || 'unnamed') + '). Choose “Add to an ad set”, or another folder.'); }
      const tokOf = () => dsRand(10);
      rs = { app: 'provident-ad-set', name: ans.name, product: ans.product, created: dsNow(), by, drive: 'https://drive.google.com/drive/folders/' + folder.id,
        folder: folder.id, eng_only: {}, items: [], hist: [], log: [] };
      // set up from the home page's widget: the plan says which audiences and languages the
      // ad set will hold, and an audience planned without Arabic has nothing to translate
      if (ans.plan) { rs.plan = planCells(ans.plan); rs.plan.forEach(c => { if (!c.arb) rs.eng_only[c.market + '|' + c.aud] = true; }); }
      const same = files.find(x => x.name === dsSetName(ans.name));
      const f = same ? { id: same.id } : await dsCreate(folder.id, dsSetName(ans.name), dsJson(rs));
      rid = f.id; rs.rid = rid;
      rs.tok = { dd: 'R' + tokOf() + '.' + rid, ct: 'R' + tokOf() + '.' + rid, pm: 'R' + tokOf() + '.' + rid };
    } else {
      const R = await dsResolve(ans.dd, null, true);
      if (R.role !== 'dd') throw dsFail(403, 'Only the designer adds projects to an ad set.');
      rs = R.rs; rid = R.rid;
    }
    const it = { market: ans.market, aud: ans.aud, lang: ans.lang };
    if ((rs.items || []).some(x => x.market === it.market && x.aud === it.aud && x.lang === it.lang)) throw dsFail(400, dsItemLabel(it) + ' is already in the ad set.');
    dlg.busy('Saving the project into ' + [it.market, it.aud, DS_LANG[it.lang]].join(' / ') + '…', .1);
    const sid = await dsProject(rs.folder, rid, it, st, by, name, app);
    // the pictures, one file each, then the project's photo map
    const C = IS(), map = {}, imgs = {}, pics = this.shSlots().filter(sl => { const r = C.getRec(sl); return r && r.u; });
    let k = 0;
    for (const sl of pics) {
      dlg.busy('Saving pictures · ' + (k + 1) + ' of ' + pics.length + '…', .12 + .78 * k / pics.length);
      const e = await dsPutRec(sid, sl, C.getRec(sl)); map[sl] = e; imgs[sl] = e.h; k++;
    }
    dlg.busy('Finishing the ad set…', .94);
    let rev = 1;
    if (Object.keys(map).length) rev = (await dsApi('save', { id: sid }, { base: 1, by, imgs: map })).rev;
    const now = dsNow(), item = Object.assign({ sid, added: now, by, design: null, copy: null }, it);
    rs.items = (rs.items || []).concat(item);
    rs.hist = (rs.hist || []).concat({ act: ans.mode === 'new' ? 'start' : 'add', by, at: now, sid }).slice(-400);
    dsLog(rs, by, [{ kind: 'step', text: (ans.mode === 'new' ? 'Started the ad set with ' : 'Added ') + dsItemLabel(item) }]);
    try { const th = await this.rvThumb(); if (th && th.length < 120000) rs.thumb = th; } catch (e) {}
    await dsWrite(rid, rs);
    // the project's summary and picture for the archive
    try { const d = await dsRead(sid.slice(1), true); d.review.sum = this.rvSum(st); if (rs.thumb) d.review.thumb = rs.thumb; await dsWrite(sid.slice(1), d); } catch (e) {}
    ssSet(this.shKey(), { id: sid, rev: (DSC[sid.slice(1)] && DSC[sid.slice(1)].d.review.rev) || rev, n: 0, pid: this.state.pid, imgs, name, role: 'dd', rs: dsPub(rs, 'dd') });
    ssSet(this.shKey('-base'), st);
    ssSet(this.shKey('-log'), null);
    return dsPub(rs, 'dd');
  };
  // Signing in needs a click (Google opens a popup). One small bar asks for it whenever a review
  // stored on Drive needs it; the polls carry on by themselves once it is done.
  function dsSignBar() {
    injectCss();
    if (document.querySelector('.ds-sign')) return;
    const el = document.createElement('div');
    el.className = 'ds-sign'; el.setAttribute('role', 'status');
    const w = window.providentDrive.who && window.providentDrive.who();
    el.innerHTML = w ? '<span>Your Google session has expired — continue as ' + esc(w.email) + ' to keep the review in step.</span><button class="p-btn" type="button">Continue</button>'
      : '<span>This review is saved in Google Drive. Sign in once to keep it in step.</span><button class="p-btn" type="button">Sign in with Google</button>';
    el.querySelector('button').onclick = async () => {
      try { await window.providentDrive.signIn(); el.remove(); window.dispatchEvent(new Event('provident-drive-signed')); }
      catch (e) { el.querySelector('span').textContent = e.message || String(e); }
    };
    document.body.appendChild(el);
  }
  // Before a Drive review opens: a click to sign in, unless this tab already has.
  function dsGate(title) {
    const D = window.providentDrive;
    if (D && D.valid()) return Promise.resolve(true);
    injectCss();
    return new Promise(res => {
      const el = document.createElement('div');
      el.className = 'shl-dlg';
      // a computer that signed in before says WHO and continues as them in one click; the
      // first time, it explains why Google is asking
      const w = D.who && D.who();
      el.innerHTML = '<div class="shl-dlg-c" role="dialog" aria-modal="true"><h2>' + esc(title) + '</h2>' +
        (w ? '<p class="shl-lead">Your Google session has expired. Continue as <b>' + esc(w.email) + '</b> to open it.</p>'
          : '<p class="shl-lead">This review is saved in Google Drive. Sign in once with your Provident Google account — this computer remembers it.</p>') +
        '<p class="shl-st" aria-live="polite"></p><div class="shl-acts">' +
        (w ? '<button class="shl-other" type="button">Use another account</button>' : '') +
        '<button class="p-ghost shl-x">Cancel</button><button class="p-btn shl-go">' + (w ? 'Continue' : 'Sign in with Google') + '</button></div></div>';
      document.body.appendChild(el);
      el.querySelector('.shl-x').onclick = () => { el.remove(); res(false); };
      const oth = el.querySelector('.shl-other');
      if (oth) oth.onclick = async () => {
        D.signOut();
        try { await D.signIn(); el.remove(); res(true); }
        catch (e) { const s = el.querySelector('.shl-st'); s.textContent = e.message || String(e); s.classList.add('bad'); }
      };
      el.querySelector('.shl-go').onclick = async () => {
        try { await D.signIn(); el.remove(); res(true); }
        catch (e) { const s = el.querySelector('.shl-st'); s.textContent = e.message || String(e); s.classList.add('bad'); }
      };
    });
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
    const m = /^#share=([\w.-]{8,140})$/.exec(location.hash || '');
    if (m && SHARE_ID.test(m[1])) {
      history.replaceState(null, '', location.pathname + location.search);
      if (isRsId(m[1])) { this.shareOpenLink(m[1]); return true; }
      const b = ssGet(this.shKey());
      if (b && b.id === m[1] && b.pid && b.pid === this.state.pid) { this.shareStart(); return true; }
      this.shareOpenLink(m[1]);
      return true;
    }
    const b = ssGet(this.shKey());
    if (b && b.id && b.pid && b.pid === this.state.pid) this.shareStart();
    // An ad set link resumes only on a REFRESH: the binding records the project the tab had open
    // when the link was opened, and any other project (one opened from Recent, a template, a
    // session file) means the tab moved on, so the binding is dropped instead of reopening the
    // review window over the designer's project. A binding written before it carried a pid is
    // dropped too — that is the stale case this exists for.
    const here = b2 => b2 && b2.id && ('pid' in b2) && (b2.pid || '') === (this.state.pid || '');
    const ab = ssGet(AS_KEY);
    if (ab && !here(ab)) ssSet(AS_KEY, null);
    else if (ab && this.shApp() === 'provident-ad-studio') setTimeout(() => AdSets.resume(this.host, ab.id), 0);
    const rb = ssGet(RS_KEY);
    if (rb && !here(rb)) ssSet(RS_KEY, null);
    else if (rb && this.shApp() === 'provident-ad-studio') setTimeout(() => RS.resume(this.host, rb.id), 0);
    if (this.shApp() === 'provident-ad-studio') { this.rsJoinCheck(); this.rsPlanCheck(); }
    return false;
  };
  // The ad set page's "Add to this ad set" opens this studio in a new tab with the project and
  // the ad set in JOIN_KEY: open that project (from Recent), then ask for its labels.
  const JOIN_KEY = 'provident-rsjoin';
  SP.rsJoinCheck = async function () {
    let j = null; try { j = JSON.parse(localStorage.getItem(JOIN_KEY) || 'null'); } catch (e) {}
    if (!j || !j.dd || !j.pid || Date.now() - (j.at || 0) > 180000) return;
    if (this.state.pid === j.pid) {
      try { localStorage.removeItem(JOIN_KEY); } catch (e) {}
      setTimeout(() => this.reviewCreate({ dd: j.dd }), 700);
      return;
    }
    // the recents list loads after mount
    for (let i = 0; i < 40 && !(this.savedRecents() || []).length; i++) await new Promise(r => setTimeout(r, 150));
    const k = (this.savedRecents() || []).findIndex(r => r && r.pid === j.pid);
    if (k < 0) { try { localStorage.removeItem(JOIN_KEY); } catch (e) {} return; }
    StudioBase.reloading = true;
    this.markSaved && this.markSaved();
    this.openRecent(k);
  };
  SP.shareOpenLink = async function (id) {
    if (isDs(id) && !(await dsGate(isRsId(id) ? 'Open the ad set' : 'Open a shared project'))) return;
    // an ad set link: the content team, performance marketing or the designer's overview
    if (isRsId(id)) {
      if (this.shApp() !== 'provident-ad-studio') { goCas(id); return; }
      const dl = nameDialog({ title: 'Open the ad set', lead: 'Loading the ad set…', btn: 'Open', busy: true });
      try { const d = await api('rsget', { id, full: '1' }); dl.close(); RS.open(this.host, id, d); }
      catch (e) { dl.fail(e.message, 'Close'); }
      return;
    }
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
    const role = d.role || 'edit', rs = d.rs || null;
    const nm = '<b>' + esc(meta.name || 'Untitled project') + '</b>';
    dlg.ready({
      title: rs ? 'Open a project of ' + (rs.name || 'the ad set') : '',
      lead: rs ? nm + ' · ' + esc(itemLabel((rs.items || []).find(x => x.sid === id) || {})) + ' in the ad set <b>' + esc(rs.name || '') + '</b>. You have the full Campaign Studio, and mark each step done from the Ad set review panel.'
        : nm + ' · shared by ' + esc(meta.by || 'someone') + ' in ' + esc(spec.label) + '. Anyone with this link can change it, and the Changes panel shows who changed what.',
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
        done++; dlg.busy('Loading pictures · ' + done + ' of ' + slots.length + '…', done / slots.length);
      });
    } catch (e) { dlg.fail(e.message, 'Close'); return; }
    // An expired photo this computer still holds in full — its photo store, or the project's
    // Recent card — opens as itself rather than as the preview (and shHeal then puts it back on
    // the link), so opening a link never swaps a good local photo for a 640px one.
    {
      const C = IS(); let recent = null;
      for (const sl of slots) {
        if (images[sl] && !PV_RECS.has(images[sl])) continue;
        const cands = [C && C.getRec ? C.getRec(sl) : null];
        if (recent === null) {
          recent = {};
          try { const r = (this.readRecents() || []).find(x => x && x.pid && x.pid === d.state.pid); if (r && this.recentImages) recent = (await this.recentImages(r)) || {}; } catch (e) {}
        }
        cands.push(recent[sl]);
        const hit = cands.find(r => r && r.u && fnv(JSON.stringify(r)) === d.imgs[sl].h);
        if (hit) images[sl] = hit;
      }
    }
    const st = d.state;
    if (!st.pid) st.pid = StudioBase.newPid();
    if (meta.app === 'provident-smp-studio' && st.screen == null) st.screen = 'editor';
    if (rs && rs.tok) Arch.add(rs.tok.dd, rs.name, rs.product);
    const imgs = {}, pv = {}; slots.forEach(s => { if (images[s]) { imgs[s] = d.imgs[s].h; if (PV_RECS.has(images[s])) pv[s] = fnv(JSON.stringify(images[s])); } });
    const key = 'provident-share:' + meta.app;
    ssSet(key, { id, rev: d.rev, n: d.n, pid: st.pid, imgs, pv, name: meta.name || '', role, rs });
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
  // FULL-SIZE PHOTOS EXPIRE, PREVIEWS DO NOT (2026-10-27). A link keeps its project and its
  // changelog for good; each photo's full record lasts 60 days after the link was last opened,
  // and a ~640px preview of it is kept with no expiry. fetchRec falls back to the preview, and
  // a record that came back as one is in PV_RECS so the studio knows not to send it up again
  // as if it were the photo. Putting the full photo back is putRec again: the store keys parts
  // by the record's hash, so the same photo lands exactly where it was.
  const PV_RECS = new WeakSet(), PV_PX = 640, PV_SMALL = 250000, PV_MAX = 390000;
  async function fetchRec(id, e, p) {
    if (e && e.f) return dsFetchRec(e);   // a picture stored as its own file on Drive
    if (!e || !e.h || !e.n) return null;
    if (!e.gone) {
      try {
        const parts = new Array(e.n);
        await pool(Array.from({ length: e.n }, (_, i) => i), 4, async i => { parts[i] = await api('chunk', e.c ? { id, p, c: e.c, i } : { id, p, h: e.h, i }); });
        return JSON.parse(parts.join(''));
      } catch (er) { if (er && er.net) throw er; }
    }
    try {
      const rec = JSON.parse(await api('pv', { id, p, h: e.h }));
      if (rec && rec.u) { PV_RECS.add(rec); return rec; }
    } catch (er) { if (er && er.net) throw er; }
    return null;
  }
  // A small copy of a photo record: the same crop fields, the picture at PV_PX on its long side.
  // A record already small enough (an SVG, a QR) is its own preview.
  async function pvText(rec, txt) {
    if (txt.length <= PV_SMALL) return txt;
    try {
      const blob = await (await fetch(rec.u)).blob();
      const bmp = await createImageBitmap(blob);
      const k = Math.min(1, PV_PX / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      if (bmp.close) bmp.close();
      let u = c.toDataURL('image/webp', 0.72);
      if (!/^data:image\/webp/.test(u)) u = c.toDataURL('image/png');
      const t = JSON.stringify(Object.assign({}, rec, { u }));
      return t.length <= PV_MAX ? t : null;
    } catch (e) { return null; }
  }
  async function putPv(id, h, rec, txt) {
    if (isDs(id)) return true;            // Drive keeps the picture itself, for good
    const t = await pvText(rec, txt || JSON.stringify(rec));
    if (!t) return false;
    try { await api('pvput', { id, h }, t, true); return true; } catch (e) { return false; }
  }
  // ONE PHOTO, STORED ONCE, AT A SHARING SIZE (2026-10-27). A link stores a photo at FULL_PX on
  // its long side (WebP, alpha kept), not at the studio's export grade (up to 3840px, 3-5 MB),
  // and the parts are keyed by the hash of that stored text (c), so the same photo in an English
  // and an Arabic project, or in two links, is stored once. Its identity on the link (h) is still
  // the hash of the photo as this computer holds it: that is what tells an edit apart from a
  // pull, and how the designer's computer recognises its own photo to put it back.
  const FULL_PX = 2560, FULL_SMALL = 1200000;
  async function slimFull(rec) {
    if (!rec || !rec.u || !/^data:image\/(png|jpe?g|webp)/i.test(rec.u)) return rec;
    let bmp;
    try { bmp = await createImageBitmap(await (await fetch(rec.u)).blob()); } catch (e) { return rec; }
    const k = Math.min(1, FULL_PX / Math.max(bmp.width, bmp.height));
    if (k === 1 && rec.u.length < FULL_SMALL) { bmp.close && bmp.close(); return rec; }
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(bmp, 0, 0, c.width, c.height); bmp.close && bmp.close();
    const u = c.toDataURL('image/webp', 0.86);
    return /^data:image\/webp/.test(u) && u.length < rec.u.length ? Object.assign({}, rec, { u }) : rec;
  }
  async function putRec(id, slot, rec, onPart) {
    if (isDs(id)) return dsPutRec(id, slot, rec);
    const txt = JSON.stringify(rec), h = fnv(txt);
    const stx = JSON.stringify(await slimFull(rec)), c = fnv(stx), n = Math.max(1, Math.ceil(stx.length / PART));
    let have = false;
    try { have = (await api('have', { id, c, n })).have; } catch (e) { if (e && e.net) throw e; }
    if (!have) {
      for (let i = 0; i < n; i++) {
        await api('part', { id, c, i, n }, stx.slice(i * PART, (i + 1) * PART), true);
        if (onPart) onPart(i + 1, n);
      }
    }
    await putPv(id, h, rec, txt);
    return { h, n, c };
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
    dlg.busy('Uploading the project…', .04);
    await this.ensurePid();
    const st = this.shPub();
    const r = await api('create', {}, { app: this.shApp(), name: this.shName(st), by: name, state: st });
    const slots = this.shSlots(), C = IS(), imgs = {}, map = {};
    let k = 0;
    for (const sl of slots) {
      const rec = C.getRec(sl);
      if (!rec || !rec.u) continue;
      k++;
      dlg.busy('Uploading pictures · ' + k + ' of ' + slots.length + '…', .1 + .85 * (k - 1) / slots.length);
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
    this.shGuard(false);
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
      id: b.id, rev: b.rev || 0, n: b.n || 0, imgs: b.imgs || {}, pv: b.pv || {}, name: b.name || '',
      base: ssGet(this.shKey('-base')) || this.shPub(), dirty: new Set(), applying: false,
      busy: false, lastS: '', lastT: 0, burst: null, from: lg.from || 0, log: lg.log || [],
      seen: +lsGet('provident-share-seen:' + b.id) || Date.now(), err: '',
      role: b.role || 'edit', rs: b.rs || null
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
    if (S.rs && S.rs.tok) Arch.add(S.rs.tok.dd, S.rs.name, S.rs.product);
    if (open || lsGet('provident-share-open') === '1') this.shPanel(true);
    this.shGuard(true);
    this.shRender();
    this.shPoll(true);
    S.healT = Date.now(); setTimeout(() => this.shHeal(), 1500);
    if (Object.keys(S.pv).length) setTimeout(() => this.shFlash(Object.keys(S.pv).length + ' full-size photo' + (Object.keys(S.pv).length > 1 ? 's have' : ' has') + ' expired — showing previews. Restore them from the Changes panel.'), 800);
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
    // while a photo is still a preview, look again now and then: someone may have restored it
    if (!pend && Object.keys(S.pv).length && Date.now() - (S.healT || 0) > 60000) { S.healT = Date.now(); this.shHeal(); }
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
          if (S.pv[sl] && fnv(txt) === S.pv[sl]) continue;      // still the preview of an expired photo
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
          const r = await api('save', { id: S.id }, { base: S.rev, state: cur, by, burst: burst.id, changes: burst.list, imgs: map, sum: S.rs ? this.rvSum(cur) : undefined });
          S.rev = r.rev; S.base = cur; S.baseS = canon(cur);
          Object.keys(map).forEach(k => { delete S.pv[k]; if (map[k]) S.imgs[k] = map[k].h; else delete S.imgs[k]; });
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
    ssSet(this.shKey(), { id: S.id, rev: S.rev, n: S.n, pid: this.state.pid, imgs: S.imgs, pv: S.pv, name: S.name, role: S.role, rs: S.rs });
    if (!ssSet(this.shKey('-base'), S.base)) ssSet(this.shKey('-base'), null);
    ssSet(this.shKey('-log'), { from: S.from, log: S.log.slice(-200) });
  };
  SP.shPoll = async function (force) {
    const S = this._sh; if (!S || S.polling) return;
    if (!force && (document.hidden || S.busy)) return;
    S.polling = true;
    try {
      const r = await api('rev', { id: S.id });
      this.rsSet(r.rs, r.role);
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
    this.rsSet(d.rs, d.role);
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
          if (rec && C && C.putRec) {
            S.applying = true; C.putRec(sl, rec); S.imgs[sl] = want[sl].h;
            if (PV_RECS.has(rec)) S.pv[sl] = fnv(JSON.stringify(rec)); else delete S.pv[sl];
          }
        }
        Object.keys(S.imgs).forEach(sl => { if (!want[sl]) { if (C && C.putRec) C.putRec(sl, null); delete S.imgs[sl]; delete S.pv[sl]; } });
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

  // ---------- putting expired photos back ----------
  // A photo on the link has three states: here in full, expired with its preview showing
  // (S.pv[slot] = the preview's hash), or expired with no copy here. shHeal runs once a tab
  // starts following a link: any photo whose exact full record this computer still holds — in
  // its photo store, or in the project's Recent card — goes back up, and a photo uploaded before
  // previews existed gets one. Nothing here ever replaces a photo with a different one.
  SP.shHeal = async function (extra) {
    const S = this._sh; if (!S || S.healing || S.role === 'pm' || isDs(S.id)) return 0;  // nothing on Drive expires
    S.healing = true;
    let back = 0;
    const restored = new Set(), moved = {};
    try {
      const d = await api('sync', { id: S.id, from: S.n });
      const want = d.imgs || {}, C = IS();
      let recent = null;
      const findRec = async (sl, h) => {
        const cands = [];
        if (extra && extra[sl]) cands.push(extra[sl]);
        const own = C && C.getRec ? C.getRec(sl) : null; if (own) cands.push(own);
        if (recent === null) {
          recent = {};
          try { const r = (this.readRecents() || []).find(x => x && x.pid && x.pid === this.state.pid); if (r && this.recentImages) recent = (await this.recentImages(r)) || {}; } catch (e) {}
        }
        if (recent[sl]) cands.push(recent[sl]);
        if (extra) Object.keys(extra).forEach(k => { if (k !== sl) cands.push(extra[k]); });
        return cands.find(r => r && r.u && fnv(JSON.stringify(r)) === h) || null;
      };
      // An expired photo whose copy here is not the photo is the preview (unless it is a
      // replacement still waiting to be saved) — worked out from the store, not remembered, so
      // a tab that lost its binding still never sends a preview up as the photo.
      for (const sl of Object.keys(want)) {
        const e = want[sl], own = C && C.getRec ? C.getRec(sl) : null;
        if (e && e.gone && own && own.u && !S.dirty.has(sl) && !S.pv[sl] && JSON.stringify(own).length <= PV_MAX) {
          const f = fnv(JSON.stringify(own));
          if (f !== e.h && S.imgs[sl] === e.h) S.pv[sl] = f;
        }
      }
      for (const sl of Object.keys(want)) {
        const e = want[sl];
        // someone else put this photo back: swap the preview here for the real one
        if (e && e.h && !e.gone && S.pv[sl] && S.imgs[sl] === e.h) {
          const full = await fetchRec(S.id, e);
          if (full && !PV_RECS.has(full) && C && C.putRec) { S.applying = true; try { C.putRec(sl, full); } finally { S.applying = false; } delete S.pv[sl]; }
          continue;
        }
        // a photo stored before the shared, sharing-size store (no c) moves there too, which is
        // what frees the old full-size copy
        if (!e || !e.h || (!e.gone && !e.nopv && e.c)) continue;
        const rec = await findRec(sl, e.h);
        if (!rec) continue;
        if (e.gone || !e.c) {
          if (e.gone && S.ui) S.ui.status('saving', 'Restoring a full-size photo…');
          moved[sl] = await putRec(S.id, sl, rec);
          if (e.gone) {
            back++; restored.add(sl);
            if (S.pv[sl] && C && C.putRec) { S.applying = true; try { C.putRec(sl, rec); } finally { S.applying = false; } }
            delete S.pv[sl];
          }
        } else await putPv(S.id, e.h, rec);
      }
      // the photo map now names where each moved photo lives (same photo, same h)
      if (Object.keys(moved).length) {
        try { const r = await api('save', { id: S.id }, { base: S.rev, by: StudioBase.shareName() || 'Someone', imgs: moved }); if (r && r.rev) S.rev = r.rev; }
        catch (er) { if (!er.stale) throw er; }  // someone saved meanwhile: the next pass tries again
      }
      // photos still missing on the link, for the panel's notice
      S.gone = Object.keys(want).filter(sl => want[sl] && want[sl].gone && !restored.has(sl)).length;
      if (back) this.shFlash(back === 1 ? 'Restored 1 full-size photo' : 'Restored ' + back + ' full-size photos');
      this.shPersist();
    } catch (e) {
      if (S.ui) S.ui.status('error', e.message || 'Could not restore the photos.');
    } finally { if (this._sh) this._sh.healing = false; this.shRender(); }
    return back;
  };
  // Restore from a saved session file (.adstudio.json / .smpstudio.json — it carries every
  // photo). An exact match goes back as itself; a photo the file holds for an expired slot but
  // in another version (reframed since, say) is put into the project here and saves as a
  // replacement, which the changelog shows.
  SP.shRestoreFile = function () {
    const S = this._sh; if (!S) return;
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = async () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      let doc;
      try { doc = JSON.parse(await f.text()); } catch (e) { this.shFlash('That file is not a saved project.'); return; }
      const imgs = (doc && doc.images) || {};
      if (!Object.keys(imgs).length) { this.shFlash('That file holds no photos.'); return; }
      const before = Object.keys(S.pv).length;
      const back = await this.shHeal(imgs);
      // what is still a preview: take the file's own photo for that slot, as a replacement
      const C = IS(); let swapped = 0;
      Object.keys(S.pv).forEach(sl => {
        const r = imgs[sl];
        if (r && r.u && C && C.putRec) { C.putRec(sl, r); delete S.pv[sl]; swapped++; }
      });
      this.shPersist(); this.shRender();
      if (!back && !swapped) this.shFlash(before ? 'None of the expired photos are in that file.' : 'Nothing to restore — every photo is here.');
      else if (swapped) this.shFlash('Restored ' + (back + swapped) + ' photo' + (back + swapped > 1 ? 's' : '') + ' from ' + f.name);
    };
    inp.click();
  };
  // Saving or exporting while a photo is only its preview would ship (or write over a good
  // session file with) a 640px picture, so both ask first.
  SP.shGuard = function (on) {
    const self = this;
    ['doExport', 'saveSessionFile'].forEach(fn => {
      const mark = '_shGuard_' + fn;
      if (!on) { if (self[mark]) { delete self[fn]; delete self[mark]; } return; }
      if (self[mark] || typeof self[fn] !== 'function') return;
      const orig = self[fn];
      self[mark] = true;
      self[fn] = function () {
        const S = self._sh, n = S ? Object.keys(S.pv || {}).length : 0;
        if (n && !window.confirm(n + ' full-size photo' + (n > 1 ? 's have' : ' has') + ' expired on this shared link, so ' + (n > 1 ? 'they show' : 'it shows') + ' as a low-resolution preview. '
          + (fn === 'doExport' ? 'Exporting now puts the preview in the files.' : 'Saving now writes the preview into the project file.')
          + '\n\nRestore the photos first from the Changes panel (Restore from a saved file). Press OK to ' + (fn === 'doExport' ? 'export' : 'save') + ' anyway.')) return;
        return orig.apply(self, arguments);
      };
    });
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
      log: S.log.slice().reverse(), pv: Object.keys(S.pv || {}).length, gone: S.gone || 0
    });
    this.rvRender();
  };
  // render keys for the Share panel's button, merged by both shells
  SP.shareVals = function () {
    const b = this.shBind(), S = this._sh, cas = this.shApp() === 'provident-ad-studio', role = S ? S.role : (b && b.role) || '';
    // the designer's Review links archive mounts into its empty host once React has drawn it
    if (cas) setTimeout(() => { Arch.mount(this); Plan.mount(this); }, 0);
    const rs = S && S.rs;
    return {
      rvShareOn: cas ? '1' : undefined,
      rvGo: () => this.reviewCreate(),
      rvLabel: rs ? 'Ad set review' : 'Ad set review',
      rvTip: rs ? 'This project is in the ad set ' + (rs.name || '') + '. Opens the review panel with its status and links.'
        : 'Puts this project in an ad set review: start a new ad set, or add it to one as another audience or the Arabic version. One link for the content team and one for performance marketing cover every project — Design · ENG copy check · Translation · Done.',
      rvOn: rs ? '1' : undefined,
      shLinkGo: () => this.shareCreate(),
      shLinkLabel: b ? 'Copy edit link' : 'Share an edit link',
      shLinkTip: b ? 'This project is shared. Copies the link and opens the Changes panel.'
        : 'Makes a link anyone can open to view and edit this project, with a panel of who changed what.',
      shLinkOn: b ? '1' : undefined,
      ...(cas ? this.rsCopyVals() : {}),
    };
  };
  // THE REVIEW FLOW IN THE DESIGNER'S STUDIO (2026-10-26): the Copy view's head and foot bar and
  // the canvas bar's chip read this project's place in its ad set — its audience's four steps
  // and the designer's own buttons — where they used to read Draft › With design › Final.
  SP.rsCopyVals = function () {
    const S = this._sh, rs = S && S.rs, it = rs ? this.rsItem() : null, busy = this._rvBusy;
    if (!it) {
      return {
        rsInOn: undefined, rsOutOn: '1', rsBriefOn: true,
        rsCwSteps: [], rsCwWhere: 'Not in an ad set yet',
        rsCwNote: 'Write the words below, or start from a brief and let Claude draft them. When the design is ready, put it in an ad set review: the content team checks the copy from their own link.',
        rsCwStatus: 'Not in an ad set review yet',
        cvAdLabel: 'Ad sets', cvAdState: 'none', cvAdGo: () => this.host && this.host.asOpen(),
        cvAdTip: 'Not in an ad set review yet. Opens the Ad sets viewer, to look through an exported campaign folder.',
      };
    }
    const auds = rsAuds(rs), mine = auds.find(a => a.items.indexOf(it) >= 0), arb = it.lang === 'ARB';
    const steps = (mine ? mine.steps : []).map((x, i) => ({ label: x.label, n: i + 1, sub: x.sub, state: x.s === 'pend' ? 'todo' : x.s }));
    const now = mine && mine.now, lang = arb ? 'Arabic' : 'English';
    const where = itemLabel({ market: it.market, aud: it.aud }) + ' · ' + lang;
    // the designer's two buttons on this project: the forward one and the one that takes it back
    let fwd = null, back = null;
    if (!it.design) fwd = { act: 'design-done', label: arb ? 'Arabic laid out' : 'Mark design done',
      tip: arb ? 'Hands the Arabic version to the content team to check the translation.' : 'Hands the design to the content team to check the English copy.' };
    else if (!it.copy) back = { act: 'design-open', label: arb ? 'Arabic back in progress' : 'Back to design', tip: 'Takes the project back from the content team while you change it.' };
    else back = { act: 'copy-open', label: arb ? 'Reopen translation check' : 'Reopen copy check', tip: 'Sends the words back to the content team to check again.' };
    const st = !it.design ? (arb ? 'Arabic being laid out' : 'Design in progress')
      : !it.copy ? (arb ? 'Translation with the content team' : 'English copy with the content team')
        : mine && mine.done ? 'Done — ready to run' : (now ? now.label + ' · ' + now.sub : 'Approved');
    const note = !it.design ? (arb ? 'Lay out the Arabic words, then mark it laid out — the content team checks the translation from their link.'
      : 'Design the ad, then mark the design done — the content team checks the English copy from their link.')
      : !it.copy ? 'With the content team. Their changes to the words arrive here as they make them.'
        : 'Approved by the content team. Any change from here shows in the ad set’s activity.';
    const go = a => () => this.rvStep(a + ':' + it.sid);
    const lab = a => busy === a.act + ':' + it.sid ? 'Saving…' : a.label;
    return {
      rsInOn: '1', rsOutOn: undefined, rsBriefOn: !it.design,
      rsCwSteps: steps, rsCwWhere: (rs.name ? rs.name + ' · ' : '') + where, rsCwNote: note, rsCwStatus: st,
      rsFwdOn: !!fwd, rsFwd: fwd ? go(fwd.act) : () => {}, rsFwdLabel: fwd ? lab(fwd) : '', rsFwdTip: fwd ? fwd.tip : '',
      rsBackOn: !!back, rsBack: back ? go(back.act) : () => {}, rsBackLabel: back ? lab(back) : '', rsBackTip: back ? back.tip : '',
      rsBusy: busy ? '1' : undefined,
      rsView: () => this.rsOverview(),
      cvAdLabel: (it.aud || 'Ad set') + (arb ? ' · ARB' : '') + ' · ' + (mine && mine.done ? 'Done' : now ? now.label : 'Design'),
      cvAdState: mine && mine.done ? 'final' : it.design ? 'design' : 'draft', cvAdGo: () => this.rsOverview(),
      cvAdTip: 'In the ad set ' + (rs.name || '') + ' as ' + where + '. Opens the ad set overview: every audience and language, rendered from the latest work.',
    };
  };

  // ---------- AD SET REVIEWS (CAS, 2026-10-26) ----------
  // A review is an AD SET: every project of one campaign — each market x audience x language,
  // ENG and ARB — under one record and three links (api/share.py, `rs:<rid>`):
  //   dd  the designer — the ad set's overview, each project one click from the full studio
  //   ct  the content team — Ad sets › Edit text over every project: the words beside every image
  //   pm  performance marketing — Ad sets › Images over every project, downloads per audience
  // Each AUDIENCE (market + audience) goes Design › ENG copy check › Translation › Done: the
  // designer marks the ENG design done, the content team approves the ENG copy, the designer adds
  // the ARB project and marks it laid out, the content team approves the translation. An audience
  // marked "no Arabic" skips Translation. The ad set is Package ready when every audience is Done.
  // The designer starts an ad set from a shared project (Share › Ad set review) and adds the
  // others the same way. A project's own link stays the designer's edit link for that project.
  const ROLE_NAME = { dd: 'Designer', ct: 'Content team', pm: 'Performance marketing', edit: 'Editor' };
  const RV_SIZES = ['sq', 'pt', 'st', 'ls'];   // what Meta takes — the banners are Eventbrite's
  const SIZE_LAB = { sq: 'Feed 1:1', pt: 'Portrait 3:4', st: 'Story 9:16', ls: 'Horizontal 1.91:1', bn: 'Eventbrite 1880', bs: 'Eventbrite 758' };
  const MARKETS = ['Local', 'International', 'International EUR'];
  const AUDS = { residential: ['Family', 'Investor'], commercial: ['Investor', 'Hybrid'] };
  const PRODUCT_NAME = { residential: 'Residential', commercial: 'Commercial' };

  // ---- THE CAMPAIGN PLAN: the ad set, set up on the home page before any design ----
  // A plan is { name, product, folder, by, markets[], auds[], arb: {"<market>|<aud>": true} }.
  // Its CELLS are every chosen market × audience, in the review's own order, each saying
  // whether it gets an Arabic version. Stored on the ad set (Drive) or, on the share store
  // that keeps no plan, on this computer under PLAN_LOCAL + the designer's token.
  const PLAN_KEY = 'provident-rsplan', PLAN_GO = 'provident-rsplan-go', PLAN_LOCAL = 'provident-rsplan:';
  function planCells(plan) {
    if (Array.isArray(plan)) return plan.filter(c => c && c.market && c.aud);
    if (!plan) return [];
    const auds = AUDS[plan.product] || AUDS.residential;
    const ms = MARKETS.filter(m => (plan.markets || []).indexOf(m) >= 0), as = auds.filter(a => (plan.auds || []).indexOf(a) >= 0);
    const out = [];
    ms.forEach(m => as.forEach(a => out.push({ market: m, aud: a, arb: !!(plan.arb || {})[m + '|' + a] })));
    return out;
  }
  function planOf(rs) {
    if (rs && Array.isArray(rs.plan)) return rs.plan;
    try { return JSON.parse(lsGet(PLAN_LOCAL + ((rs && rs.tok) || {}).dd) || 'null') || []; } catch (e) { return []; }
  }
  // what the plan still wants: an English project per cell, an Arabic one where planned
  function planTodo(rs) {
    const items = (rs && rs.items) || [], has = (c, l) => items.some(x => x.market === c.market && x.aud === c.aud && (x.lang || 'ENG') === l);
    // every English version first, then the Arabic ones — the order the review runs in
    const cells = planCells(planOf(rs));
    return cells.filter(c => !has(c, 'ENG')).map(c => ({ market: c.market, aud: c.aud, lang: 'ENG' }))
      .concat(cells.filter(c => c.arb && !has(c, 'ARB')).map(c => ({ market: c.market, aud: c.aud, lang: 'ARB' })));
  }
  function planTodoHtml(rs, busy) {
    const todo = planTodo(rs); if (!todo.length) return '';
    return '<div class="rv-todo"><span class="rv-k">Still to make · ' + todo.length + '</span><p>Each one starts as a copy of this design, saved into its own folder. The English versions first, then the Arabic.</p><ul>' +
      todo.map(t => { const k = [t.market, t.aud, t.lang].join('|');
        return '<li><span><b>' + esc(t.market + ' · ' + t.aud) + '</b><s>' + (t.lang === 'ARB' ? 'Arabic' : 'English') + '</s></span><button type="button" class="p-ghost" data-next="' + esc(k) + '"' + (busy ? ' disabled' : '') + '>' + (busy === k ? 'Making…' : 'Make from this design') + '</button></li>'; }).join('') + '</ul></div>';
  }
  // A busy dialog for work that needs no answer (dsReview reports into it).
  function busyDlg(title, lead) {
    injectCss();
    const el = document.createElement('div');
    el.className = 'shl-dlg';
    el.innerHTML = '<div class="shl-dlg-c" role="dialog" aria-modal="true"><h2>' + esc(title) + '</h2><p class="shl-lead">' + esc(lead) + '</p><p class="shl-st" aria-live="polite"></p><div class="shl-acts"><button class="p-btn shl-go" disabled>Working…</button></div></div>';
    document.body.appendChild(el);
    const $ = q => el.querySelector(q);
    return {
      busy: (t, pr) => { $('.shl-st').textContent = t; stBar(el, pr); },
      done: t => { stBar(el, null); $('.shl-st').textContent = t; const g = $('.shl-go'); g.disabled = false; g.textContent = 'Done'; g.onclick = () => el.remove(); g.focus(); },
      fail: t => { stBar(el, null); $('.shl-st').textContent = t; $('.shl-st').classList.add('bad'); const g = $('.shl-go'); g.disabled = false; g.textContent = 'Close'; g.onclick = () => el.remove(); }
    };
  }
  // Make the next planned audience FROM THIS DESIGN: this project (already in the ad set, and
  // saved there by the link's own sync) stays where it is; the tab becomes a new project — a
  // new pid, the same design and pictures — saved into the next audience's folder.
  SP.rsNext = async function (key) {
    const S = this._sh; if (!S || !S.rs || !S.rs.tok || this._rsNextBusy) return;
    const [market, aud, lang] = key.split('|'), dd = S.rs.tok.dd, label = market + ' · ' + aud + ' · ' + (lang === 'ARB' ? 'Arabic' : 'English');
    if (!window.confirm('Make ' + label + ' from this design?\n\nThis project stays in the ad set as it is. The tab carries on as the new project, saved into its own folder.')) return;
    this._rsNextBusy = key; this.rvRender();
    try { await this.shSave(); } catch (e) {}
    const dlg = busyDlg('Making ' + label, 'A copy of this design is being saved into the ad set as ' + label + '.');
    try {
      if (isDs(dd)) await window.providentDrive.signIn();
      try { this.recordSaved && await this.recordSaved(); } catch (e) {}
      this.shareStop(false);
      const pid = StudioBase.newPid();
      this.upd(x => { x.pid = pid; if (lang === 'ARB') x.font = 'arabic'; return x; });
      await new Promise(res => setTimeout(res, 60));
      if (this.bindFolder) this.bindFolder();
      if (lang === 'ARB' && StudioBase.ensureFont) StudioBase.ensureFont('arabic').then(() => { try { this.forceUpdate(); } catch (e) {} });
      const by = StudioBase.shareName() || 'Someone', ans = { mode: 'add', by, dd, market, aud, lang };
      if (isDs(dd)) {
        const rs = await this.dsReview(dlg, ans);
        Arch.add(rs.tok.dd, rs.name, rs.product);
      } else {
        const id = await this.shCreateRaw(dlg, by);
        const r = await api('rsadd', { id: dd }, { by, market, aud, lang, sid: id, sum: this.rvSum(this.shPub()), thumb: await this.rvThumb() });
        const bb = ssGet(this.shKey()) || {}; bb.role = 'dd'; bb.rs = r.rs; ssSet(this.shKey(), bb);
      }
      this.shareStart(true);
      dlg.done('This tab is now ' + label + (lang === 'ARB' ? ' — the typeface is switched to Arabic; translate the words in place.' : '. Adapt the design for this audience.'));
    } catch (e) { dlg.fail(e.message || String(e)); }
    this._rsNextBusy = null; try { this.rvRender(); } catch (e) {}
  };
  // After the home page's "Start the campaign": the new project names itself and opens the ad
  // set dialog with everything filled in — one click, which Google's sign-in needs anyway.
  SP.rsPlanCheck = function () {
    let g = null; try { g = JSON.parse(localStorage.getItem(PLAN_GO) || 'null'); } catch (e) {}
    if (!g || !g.plan || Date.now() - (g.at || 0) > 180000) return;
    if (this.state.screen !== 'editor') return;   // the new project opens in the editor; anywhere else, wait for it
    try { localStorage.removeItem(PLAN_GO); } catch (e) {}
    if (g.pid && g.pid !== this.state.pid) return;
    if (g.plan.name && !this.state.campaign) this.upd(x => { x.campaign = g.plan.name; return x; });
    setTimeout(() => this.reviewCreate({ plan: g.plan }), 600);
  };
  const STEP_LABELS = ['Design', 'ENG copy check', 'Translation', 'Done'];
  const day = ms => ms ? new Date(ms).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const dayS = ms => ms ? new Date(ms).toLocaleDateString([], { day: 'numeric', month: 'short' }) : '';
  const itemLabel = it => [it.market, it.aud, it.lang].filter(Boolean).join(' · ') || 'Project';
  const casFile = () => encodeURIComponent(StudioBase.SESSIONS['provident-ad-studio'].file);
  const rsLink = id => StudioBase.shareBase() + '/' + casFile() + '#share=' + id;

  // Each audience, its ENG and ARB projects and its four steps — the one derivation every
  // surface reads, so the panel, the header and the archive cannot disagree.
  function rsAuds(rs) {
    const map = new Map();
    ((rs && rs.items) || []).forEach(it => {
      const k = it.market || it.aud ? it.market + '|' + it.aud : 'p:' + it.sid;
      if (!map.has(k)) map.set(k, { key: k, market: it.market || '', aud: it.aud || '', label: [it.market, it.aud].filter(Boolean).join(' · ') || 'Project', eng: null, arb: null, items: [] });
      const a = map.get(k); a.items.push(it);
      if (it.lang === 'ARB') a.arb = a.arb || it; else a.eng = a.eng || it;
    });
    const mo = m => { const i = MARKETS.indexOf(m); return i < 0 ? 9 : i; };
    const out = [...map.values()].sort((x, y) => mo(x.market) - mo(y.market) || x.aud.localeCompare(y.aud));
    out.forEach(a => {
      a.engOnly = !!((rs && rs.eng_only) || {})[a.market + '|' + a.aud];
      const e = a.eng, r = a.arb;
      const d1 = !!(e && e.design), d2 = !!(e && e.copy), d3 = a.engOnly || !!(r && r.design && r.copy);
      a.done = d1 && d2 && d3;
      a.steps = [
        { label: STEP_LABELS[0], s: d1 ? 'done' : 'cur', sub: !e ? 'No English project yet' : d1 ? 'Done · ' + e.design.by + ' · ' + dayS(e.design.at) : 'In progress' },
        { label: STEP_LABELS[1], s: d2 ? 'done' : d1 ? 'cur' : 'pend', sub: d2 ? 'Approved · ' + e.copy.by + ' · ' + dayS(e.copy.at) : d1 ? 'With the content team' : 'After the design' },
        { label: STEP_LABELS[2], s: d3 ? 'done' : d2 ? 'cur' : 'pend',
          sub: a.engOnly ? 'Not needed' : d3 ? 'Approved · ' + r.copy.by + ' · ' + dayS(r.copy.at) : !r ? 'Waiting for the Arabic version' : !r.design ? 'Arabic being laid out' : 'Arabic with the content team' },
        { label: STEP_LABELS[3], s: a.done ? 'done' : 'pend', sub: a.done ? 'Ready to run' : 'Not yet' }
      ];
      a.at = a.done ? Math.max(e.design.at, e.copy.at, r && r.design ? r.design.at : 0, r && r.copy ? r.copy.at : 0) : 0;
      a.now = !a.done ? a.steps.find(x => x.s !== 'done') : null;
    });
    return out;
  }
  function rsOverall(auds) {
    const n = auds.length, cnt = i => auds.filter(a => a.steps[i].s === 'done').length;
    const steps = STEP_LABELS.map((l, i) => {
      const k = cnt(i);
      return { label: l, s: n && k === n ? 'done' : (i === 0 || cnt(i - 1) > 0 || k > 0) && n ? 'cur' : 'pend', sub: n ? k + ' of ' + n + (n === 1 ? ' audience' : ' audiences') : 'No audiences yet' };
    });
    const ready = n > 0 && cnt(3) === n;
    if (ready) steps[3].sub = 'Package ready';
    return { steps, ready, done: cnt(3), n, at: ready ? Math.max(...auds.map(a => a.at)) : 0 };
  }
  // A row of steps, each centred over its own label (compact: a vertical list for the panel).
  function stepperHtml(steps, compact) {
    const tick = '<svg viewBox="0 -960 960 960"><path d="M382-354 734-706q12-12 28-12t28 12q12 12 12 28t-12 28L410-270q-12 12-28 12t-28-12L170-454q-12-12-11.5-28t12.5-28q12-12 28-12t28 12l155 156Z"/></svg>';
    return '<ol class="rv-st' + (compact ? ' rv-st-c' : '') + '" style="--n:' + steps.length + '" aria-label="Review progress">' + steps.map(x =>
      '<li data-s="' + x.s + '"><i class="rv-dot">' + (x.s === 'done' ? tick : '') + '</i><b>' + esc(x.label) + '</b><s>' + esc(x.sub || '') + '</s></li>').join('') + '</ol>';
  }
  const pillHtml = (ready, label) => '<span class="rv-pill" data-s="' + (ready ? 'ready' : 'prog') + '">' + esc(label || (ready ? 'Package ready' : 'In progress')) + '</span>';
  const LINK_ROWS = [
    ['dd', 'Designer', 'The ad set’s overview. Every project opens in the full studio from here.'],
    ['ct', 'Content team', 'The words of every project beside its images. Approve the English copy and the translation.'],
    ['pm', 'Performance marketing', 'Every project’s images, always the latest. Download each audience when it is done.']
  ];
  function linkRows(tok) {
    return LINK_ROWS.map(([r, who, what]) => {
      const link = rsLink((tok || {})[r] || '');
      return '<div class="rv-lk"><div class="rv-lk-t"><b>' + who + '</b><s>' + what + '</s></div><div class="rv-lk-r"><input class="p-in" readonly value="' + esc(link) + '" aria-label="' + who + ' link"><button type="button" class="p-ghost" data-copy="' + esc(link) + '">Copy</button></div></div>';
    }).join('');
  }
  // the buttons a role has on one project
  function itemActs(it, role, busy) {
    const arb = it.lang === 'ARB', out = [];
    if (role === 'dd') out.push(it.design ? ['design-open', arb ? 'Arabic back in progress' : 'Back to in process', 'p-ghost']
      : ['design-done', arb ? 'Arabic laid out' : 'Mark design done', 'p-btn']);
    if (role === 'ct' && (it.design || it.copy)) out.push(it.copy ? ['copy-open', arb ? 'Reopen translation check' : 'Reopen copy check', 'p-ghost']
      : ['copy-done', arb ? 'Approve translation' : 'Approve English copy', 'p-btn']);
    if (role === 'dd' && it.copy) out.push(['copy-open', arb ? 'Reopen translation check' : 'Reopen copy check', 'p-ghost']);
    if (!out.length) return '<s class="rs-wait">' + (it.design ? 'With the content team' : arb ? 'Arabic being laid out' : 'Design in progress') + '</s>';
    return out.map(a => '<button type="button" class="' + a[2] + '" data-act="' + a[0] + ':' + esc(it.sid) + '"' + (busy ? ' disabled' : '') + '>' + (busy === a[0] + ':' + it.sid ? 'Saving…' : esc(a[1])) + '</button>').join('');
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
  // a small picture of a project's first design, for the archive
  SP.rvThumb = async function (st, own) {
    if (this.shApp() !== 'provident-ad-studio') return undefined;
    try {
      st = st || this.state;
      const a = await this.loadAssets(st, own);
      const cv = this.renderOpsToCanvas(this.buildOps(st, 0, 'sq', a), .2);
      StudioBase.applyFont(this.state);
      const u = cv.toDataURL('image/webp', .8);
      return /^data:image\/webp/.test(u) && u.length < 110000 ? u : undefined;
    } catch (e) { return undefined; }
  };

  // ---- the studio: a project that is in an ad set ----
  SP.rsItem = function () { const S = this._sh; return S && S.rs ? (S.rs.items || []).find(x => x.sid === S.id) || null : null; };
  SP.rsSet = function (rs, role) {
    const S = this._sh; if (!S || rs === undefined) return;
    if (role !== undefined && role !== S.role) S.role = role || 'edit';
    if (canon(rs) === canon(S.rs)) return;
    const was = S.rs;
    S.rs = rs;
    if (rs && rs.tok && rs.tok.dd) Arch.add(rs.tok.dd, rs.name, rs.product);
    if (was && rs) this.rsNotify(was, rs);
    this.shPersist(); this.rvRender(); this.forceUpdate();
  };
  // a step someone else took: a pop-up here, a system notification while the tab is in the back
  SP.rsNotify = function (was, now) { notifySteps(was, now, this._sh && this._sh.ui); };
  function notifySteps(was, now, ui) {
    const me = StudioBase.shareName(), seen = new Set((was.hist || []).map(h => h.at + h.act + h.sid));
    (now.hist || []).filter(h => !seen.has(h.at + h.act + h.sid) && h.by !== me).forEach(h => {
      const it = (now.items || []).find(x => x.sid === h.sid), lab = it ? itemLabel(it) : '';
      const what = { 'design-done': it && it.lang === 'ARB' ? 'laid out the Arabic' : 'marked the design done', 'design-open': 'put the design back in progress',
        'copy-done': it && it.lang === 'ARB' ? 'approved the translation' : 'approved the English copy', 'copy-open': 'reopened the copy check', add: 'added a project', start: 'started the ad set' }[h.act] || 'changed a step';
      const t = h.by + ' ' + what + (lab ? ' · ' + lab : '');
      if (ui) ui.flash(t);
      try { if (document.hidden && window.Notification && Notification.permission === 'granted') new Notification((now.name || 'Ad set') + ' · review', { body: t, tag: 'rs-' + h.at }); } catch (e) {}
    });
  }
  SP.rvStep = async function (act) {
    const S = this._sh; if (!S || this._rvBusy) return;
    const [a, sid] = String(act).split(':');
    this._rvBusy = act; this.rvRender(); this.forceUpdate();
    try {
      // the sign-off covers the latest work: whatever is waiting to save goes first
      const pend = () => S.busy || canon(this.shPub()) !== S.baseS || S.dirty.size > 0;
      for (let i = 0; i < 40 && pend(); i++) { if (!S.busy) await this.shSave(); else await new Promise(r => setTimeout(r, 250)); if (pend()) await new Promise(r => setTimeout(r, 250)); }
      const body = { act: a, p: sid || S.id, by: StudioBase.shareName() || 'Someone' };
      if (a === 'design-done') body.thumb = await this.rvThumb();
      const r = await api('rsstep', { id: S.id }, body);
      this.rsSet(r.rs);
      S.ui.flash(a === 'design-done' ? 'Marked done' : a === 'copy-done' ? 'Approved' : 'Back in progress');
    } catch (e) { S.ui.flash(e.message || String(e)); }
    finally { this._rvBusy = null; this.rvRender(); this.forceUpdate(); }
  };
  SP.rvDrive = async function (v) {
    const S = this._sh; if (!S || !S.rs) return;
    try { const r = await api('rsset', { id: S.id }, { drive: v }); this.rsSet(r.rs); S.ui.flash('Drive location saved'); }
    catch (e) { S.ui.flash(e.message || String(e)); }
  };
  // ---- the designer's own project: the AD SET OVERVIEW over the editor (2026-10-26) ----
  // The Ad sets window over every project in this project's ad set — the same stand-in folder
  // the designer's ad set link builds (RV.build), read through the dd token, but embedded: no
  // panel, no timers, no html classes, Images only, closed with × or Escape like any folder.
  // This project is taken from the editor as it is now (state and the local photo store), so
  // what is on the canvas is what the overview shows; the others are read from the share store.
  SP.rsOverview = async function () {
    const S = this._sh, sh = this.host, rs = S && S.rs, tok = rs && rs.tok && rs.tok.dd;
    if (!sh || !rs) return;
    if (!tok) { if (S.ui) S.ui.flash('Only the designer’s link can open the ad set overview.'); return; }
    const v = Object.create(RV);
    Object.assign(v, { shell: sh, eng: this, tok, role: 'view', rs, proj: {}, ver: 1, embed: true });
    sh._asMode = 'images'; sh._asAll = false; sh._ae = null; sh._asErr = '';
    sh._asSrc = { kind: 'review', embed: true, name: rs.name || 'Ad set', share: v, handle: null };
    sh._as = { busy: true, has: true, root: rs.name || 'Ad set' };
    sh.setState({ adSetsOpen: true });
    try {
      // this project from the editor; the rest from the store
      const me = this.shNorm(this.shPub());
      v.rs = Object.assign({}, rs, { items: (rs.items || []).filter(it => it.sid !== S.id) });
      await v.load();
      v.rs = rs;
      v.proj[S.id] = { st: me, base: me, rb: me, cache: {}, log: [], imgs: {}, assets: (async () => { await warmFonts(); return this.loadAssets(me); })() };
    } catch (e) { sh._as = { err: e.message || String(e), has: true, root: rs.name || 'Ad set' }; sh.forceUpdate(); return; }
    if (!sh.state.adSetsOpen || !sh._asSrc || sh._asSrc.share !== v) return;   // closed meanwhile
    const it = this.rsItem();
    if (it) { const pa = v.pathOf(it); sh._asSel = pa[0] + '\u0001' + pa[1]; }
    v.dir = v.build();
    sh.asView({ kind: 'review', embed: true, handle: v.dir, name: rs.name || 'Ad set', share: v });
  };
  // the review section of the Changes panel, for the designer working on one of the ad set's projects
  SP.rvRender = function () {
    const S = this._sh; if (!S || !S.ui) return;
    const sec = S.ui.root.querySelector('.rv');
    S.ui.root.querySelector('.shl-panel h2').textContent = S.rs ? 'Ad set review' : 'Changes';
    if (!S.rs) { sec.hidden = true; return; }
    sec.hidden = false;
    const rs = S.rs, it = this.rsItem(), auds = rsAuds(rs), all = rsOverall(auds);
    const mine = it ? auds.find(a => a.items.indexOf(it) >= 0) : null;
    const main = '<div class="rv-h"><div><span class="rv-k">' + esc(rs.name || 'Ad set') + '</span><b>' + esc(it ? itemLabel(it) : 'This project') + '</b></div>' + pillHtml(mine && mine.done, mine && mine.done ? 'Done' : mine && mine.now ? mine.now.label : '') + '</div>' +
      (mine ? stepperHtml(mine.steps, true) : '') +
      (it ? '<div class="rv-acts">' + itemActs(it, 'dd', this._rvBusy) + '</div>' : '') +
      '<p class="rv-lead">' + (all.ready ? 'Every audience is done — the package is ready for performance marketing.' : all.done + ' of ' + all.n + (all.n === 1 ? ' audience' : ' audiences') + ' done in this ad set.') +
      ' <a href="' + esc(rsLink((rs.tok || {}).dd || '')) + '" target="_blank" rel="noopener">Open the ad set</a></p>' +
      (rs.tok ? planTodoHtml(rs, this._rsNextBusy) : '') +
      (window.Notification && Notification.permission === 'default' ? '<button type="button" class="rv-ntf" data-ntf="1">Notify me in this browser when a step changes</button>' : '');
    const m = sec.querySelector('.rv-main');
    if (m._h !== main) { m._h = main; m.innerHTML = main; }
    const dd = sec.querySelector('.rv-dd');
    dd.hidden = !rs.tok;
    if (!dd.hidden) {
      const lk = linkRows(rs.tok), box = dd.querySelector('.rv-lks');
      if (box._h !== lk) { box._h = lk; box.innerHTML = lk; }
      const inp = dd.querySelector('.rv-drv input');
      if (document.activeElement !== inp) inp.value = rs.drive || '';
    }
  };

  // Share › Ad set review: start an ad set from this project, or add it to one this computer knows.
  SP.reviewCreate = async function (preset) {
    const S = this._sh, b = this.shBind();
    if (S && S.rs) {
      if (preset && preset.dd && (S.rs.tok || {}).dd !== preset.dd) this.shFlash('This project is already in the ad set ' + (S.rs.name || '') + '. Remove it there first to move it.');
      else if (preset) this.shFlash('This project is already in this ad set.');
      this.shPanel(true); const d = S.ui.root.querySelector('.rv-dd'); if (d) d.open = true; return;
    }
    let known = Arch.list().filter(x => isRsId(x.id));
    if (preset && preset.dd && !known.some(k => k.id === preset.dd)) {
      try { const r = await api('rsinfo', { ids: preset.dd }); const x = (r.items || [])[0]; if (x && x.rs) { Arch.add(preset.dd, x.rs.name, x.rs.product, true); known = Arch.list().filter(k => isRsId(k.id)); } } catch (e) {}
    }
    const st = this.shPub(), C = this.constructor;
    const drive = dsOn();
    const plan = preset && preset.plan;
    const dlg = rsDialog({ known, name: (plan && plan.name) || st.campaign || this.shName(st), preset: preset && preset.dd, drive, folder: (plan && plan.folder) || lsGet('provident-rs-folder'), plan });
    const ans = await dlg.answer();
    if (!ans) return;
    if (plan && ans.mode === 'new') ans.plan = Object.assign({}, plan, { product: ans.product });
    lsSet(NAME_KEY, ans.by);
    // A new ad set, or one that lives on Drive: its folder holds everything (see dsApi).
    if (drive && (ans.mode === 'new' || isDs(ans.dd))) {
      try {
        dlg.busy('Signing in to Google…');
        await window.providentDrive.signIn();   // first: the popup needs the click
        if (ans.folder) lsSet('provident-rs-folder', ans.folder);
        if (this._sh) this.shareStop(true);
        const rs = await this.dsReview(dlg, ans);
        Arch.add(rs.tok.dd, rs.name, rs.product);
        dlg.links(rs, ans.mode === 'new' ? 'The ad set is ready in its Drive folder, with this project in ' + [ans.market, ans.aud, DS_LANG[ans.lang]].join(' / ') + '. ' + (ans.plan ? 'When this design is done, make each other audience from it in the Ad set review panel. ' : 'Add each other audience and language from its own project, the same way. ') + 'Send each team its link once:'
          : 'Added as ' + itemLabel({ market: ans.market, aud: ans.aud, lang: ans.lang }) + ' to ' + rs.name + ', in its own folder. The links are the same for the whole ad set:');
        this.shareStart(true);
      } catch (e) { dlg.fail(e.message || String(e), 'Close'); }
      return;
    }
    try {
      const id = b ? b.id : await this.shCreateRaw(dlg, ans.by);
      dlg.busy(ans.mode === 'new' ? 'Making the ad set…' : 'Adding the project…');
      const body = { by: ans.by, market: ans.market, aud: ans.aud, lang: ans.lang, sum: this.rvSum(this.shPub()), thumb: await this.rvThumb() };
      let r;
      if (ans.mode === 'new') r = await api('rsmake', { id }, Object.assign(body, { name: ans.name, product: ans.product }));
      else r = await api('rsadd', { id: ans.dd }, Object.assign(body, { sid: id }));
      if (ans.plan && r.rs && r.rs.tok) {
        // the share store keeps no plan: it is remembered on this computer, and the audiences
        // planned without Arabic are marked so on the ad set itself
        const cells = planCells(ans.plan), eo = {};
        lsSet(PLAN_LOCAL + r.rs.tok.dd, JSON.stringify(cells));
        cells.forEach(c => { if (!c.arb) eo[c.market + '|' + c.aud] = true; });
        if (Object.keys(eo).length) try { r = { rs: (await api('rsset', { id: r.rs.tok.dd }, { by: ans.by, eng_only: eo })).rs || r.rs }; } catch (e) {}
      }
      const bb = ssGet(this.shKey()) || {}; bb.role = 'dd'; bb.rs = r.rs; ssSet(this.shKey(), bb);
      Arch.add(r.rs.tok.dd, r.rs.name, r.rs.product);
      dlg.links(r.rs, ans.mode === 'new' ? 'The ad set is ready, with this project as ' + itemLabel({ market: ans.market, aud: ans.aud, lang: ans.lang }) + '. Add each other audience and language from its own project, the same way. Send each team its link once:'
        : 'Added as ' + itemLabel({ market: ans.market, aud: ans.aud, lang: ans.lang }) + ' to ' + r.rs.name + '. The links are the same for the whole ad set:');
      if (this._sh) { this._sh.role = 'dd'; this._sh.rs = r.rs; this.shPanel(true); this.shPoll(true); }
      else this.shareStart(true);
    } catch (e) { dlg.fail(e.message || String(e), 'Close'); }
  };
  // the dialog: a new ad set (name, product) or one this computer knows; then this project's
  // market, audience and language
  // A progress bar under a dialog's status line: p 0..1 fills it, no p runs it, null removes it.
  function stBar(box, p) {
    const st = box.querySelector('.shl-st'); if (!st) return;
    let b = box.querySelector('.shl-pg');
    if (p === null) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.className = 'shl-pg'; b.setAttribute('role', 'progressbar'); b.setAttribute('aria-label', 'Saving'); b.innerHTML = '<i></i>'; st.after(b); }
    if (typeof p === 'number') { b.removeAttribute('data-run'); b.setAttribute('aria-valuenow', Math.round(p * 100)); b.firstChild.style.width = Math.max(4, Math.min(100, p * 100)).toFixed(1) + '%'; }
    else { b.setAttribute('data-run', ''); b.removeAttribute('aria-valuenow'); b.firstChild.style.width = ''; }
  }
  function rsDialog(o) {
    injectCss();
    const el = document.createElement('div');
    el.className = 'shl-dlg';
    const opt = (v, l, on) => '<option value="' + esc(v) + '"' + (on ? ' selected' : '') + '>' + esc(l) + '</option>';
    el.innerHTML = '<div class="shl-dlg-c shl-wide" role="dialog" aria-modal="true" aria-labelledby="rsd-t"><h2 id="rsd-t">Ad set review</h2>' +
      '<p class="shl-lead">An ad set holds every project of a campaign — each market, audience and language — under one set of links for the content team and performance marketing.</p>' +
      '<div class="rsd">' +
      (o.known.length ? '<div class="rsd-mode p-tabs" role="radiogroup"><button type="button" data-mode="new" data-on="1">Start a new ad set</button><button type="button" data-mode="add">Add to an ad set</button></div>' : '') +
      '<div class="rsd-new"><label class="shl-fld"><span>Ad set name</span><input class="p-in" data-f="name" maxlength="120" value="' + esc(o.name || '') + '"></label>' +
      '<div class="shl-fld"><span>Product</span><div class="p-tabs rsd-prod"><button type="button" data-prod="residential" data-on="1">Residential</button><button type="button" data-prod="commercial">Commercial</button></div></div>' +
      (o.drive ? '<label class="shl-fld"><span>Main folder · Google Drive</span><input class="p-in" data-f="folder" placeholder="Paste the Drive folder link" autocomplete="off" value="' + esc(o.folder || '') + '">' +
        '<small class="rsd-hint">Every project of the ad set is saved in it, one folder per market, audience and language, with its pictures in Assets. Everyone who opens a link signs in with their Provident Google account and needs access to this folder.</small></label>' : '') +
      '</div>' +
      (o.known.length ? '<label class="shl-fld rsd-add" hidden><span>Ad set</span><select class="p-in" data-f="dd">' + o.known.map(k => opt(k.id, (k.name || 'Ad set') + (k.product ? ' · ' + (PRODUCT_NAME[k.product] || k.product) : ''))).join('') + '</select></label>' : '') +
      '<p class="rsd-cap">This project is</p><div class="rsd-row">' +
      '<label class="shl-fld"><span>Market</span><select class="p-in" data-f="market">' + MARKETS.map((m, i) => opt(m, m, !i)).join('') + '</select></label>' +
      '<label class="shl-fld"><span>Audience</span><select class="p-in" data-f="aud"></select></label>' +
      '<label class="shl-fld"><span>Language</span><select class="p-in" data-f="lang">' + opt('ENG', 'English', true) + opt('ARB', 'Arabic') + '</select></label></div>' +
      '<label class="shl-fld"><span>Your name</span><input class="p-in" data-f="by" maxlength="60" autocomplete="name" placeholder="e.g. Sara"></label></div>' +
      '<p class="shl-note">' + (o.drive ? 'Whoever holds a link has its role. Your name is shown beside every change you make.' : 'No sign-in — whoever holds a link has its role. Your name is shown beside every change you make.') + '</p><p class="shl-st" aria-live="polite"></p>' +
      '<div class="shl-lks-h" hidden></div><div class="shl-acts"><button class="p-ghost shl-x">Cancel</button><button class="p-btn shl-go">Make the ad set</button></div></div>';
    document.body.appendChild(el);
    const $ = s => el.querySelector(s), go = $('.shl-go'), x = $('.shl-x');
    let mode = 'new', prod = 'residential', res;
    const known = id => o.known.find(k => k.id === id) || {};
    const fillAud = () => {
      const p = mode === 'new' ? prod : (known($('[data-f="dd"]').value).product || '');
      const list = AUDS[p] || ['Family', 'Investor', 'Hybrid'], cur = $('[data-f="aud"]').value;
      $('[data-f="aud"]').innerHTML = list.map(a => opt(a, a, a === cur)).join('');
    };
    const setMode = m => {
      mode = m;
      el.querySelectorAll('[data-mode]').forEach(b => { if (b.dataset.mode === m) b.dataset.on = '1'; else delete b.dataset.on; });
      $('.rsd-new').hidden = m !== 'new'; if ($('.rsd-add')) $('.rsd-add').hidden = m !== 'add';
      go.textContent = m === 'new' ? 'Make the ad set' : 'Add to the ad set';
      fillAud();
    };
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.mode) setMode(b.dataset.mode);
      if (b.dataset.prod) { prod = b.dataset.prod; el.querySelectorAll('[data-prod]').forEach(y => { if (y === b) y.dataset.on = '1'; else delete y.dataset.on; }); fillAud(); }
    });
    if ($('[data-f="dd"]')) $('[data-f="dd"]').addEventListener('change', fillAud);
    $('[data-f="by"]').value = StudioBase.shareName();
    if (o.preset && $('[data-f="dd"]')) { $('[data-f="dd"]').value = o.preset; setMode('add'); }
    if (o.plan) {
      // set up on the home page: everything is already chosen — this project is the plan's first
      // audience in English, and the dialog is only the click Google's sign-in needs
      const c0 = planCells(o.plan)[0] || {};
      if ($('.rsd-mode')) $('.rsd-mode').style.display = 'none';   // .p-tabs' display beats [hidden]
      prod = o.plan.product === 'commercial' ? 'commercial' : 'residential';
      el.querySelectorAll('[data-prod]').forEach(y => { if (y.dataset.prod === prod) y.dataset.on = '1'; else delete y.dataset.on; });
      fillAud();
      if (c0.market) $('[data-f="market"]').value = c0.market;
      if (c0.aud) $('[data-f="aud"]').value = c0.aud;
      $('.shl-lead').textContent = 'Your campaign’s ad set, as set up on the home page. This project is its first audience. Check the details, then make it.';
      if (o.plan.by) $('[data-f="by"]').value = o.plan.by;
    }
    fillAud();
    const p = new Promise(r => { res = r; });
    const close = v => { el.remove(); res(v); };
    go.onclick = () => {
      const v = f => ($('[data-f="' + f + '"]') || {}).value || '';
      const by = v('by').replace(/\s+/g, ' ').trim();
      if (!by) { $('.shl-st').textContent = 'Add your name so others know who made a change.'; $('[data-f="by"]').focus(); return; }
      if (mode === 'new' && !v('name').trim()) { $('.shl-st').textContent = 'Name the ad set.'; $('[data-f="name"]').focus(); return; }
      if (mode === 'new' && o.drive && !window.providentDrive.id(v('folder'))) { $('.shl-st').textContent = 'Paste the link of the Google Drive folder the ad set goes in — open the folder in Drive and copy the address; it contains /folders/.'; $('[data-f="folder"]').focus(); return; }
      res({ mode, by, name: v('name').trim(), product: prod, dd: v('dd'), market: v('market'), aud: v('aud'), lang: v('lang'), folder: v('folder').trim() });
    };
    x.onclick = () => close(null);
    el.onkeydown = e => { if (e.key === 'Escape') close(null); };
    setTimeout(() => ($('[data-f="name"]') || $('[data-f="by"]')).focus(), 30);
    return {
      answer: () => p,
      busy: (t, pr) => { $('.shl-st').textContent = t; stBar(el, pr); go.disabled = true; go.textContent = 'Saving…'; el.querySelectorAll('input,select,.rsd button').forEach(i => { i.disabled = true; }); },
      fail: (t, btn) => { stBar(el, null); $('.shl-st').textContent = t; $('.shl-st').classList.add('bad'); go.textContent = btn || 'Close'; go.disabled = false; go.onclick = () => el.remove(); x.hidden = true; },
      links: (rs, lead) => {
        stBar(el, null); $('.rsd').hidden = true; $('.shl-note').textContent = ''; $('.shl-st').textContent = '';
        $('.shl-lead').textContent = lead;
        const box = $('.shl-lks-h'); box.hidden = false; box.className = 'rv-lks shl-lks'; box.innerHTML = linkRows(rs.tok);
        box.addEventListener('click', async e => { const b = e.target.closest('[data-copy]'); if (!b) return; const ok = await copyText(b.dataset.copy); b.textContent = ok ? 'Copied' : 'Select it'; });
        x.hidden = true; go.textContent = 'Done'; go.disabled = false; go.onclick = () => el.remove();
      }
    };
  }

  // ---- an AD SET LINK: the Ad sets window over every project in the ad set ----
  // The window reads a stand-in folder (the shape Drive and dropped folders use): one folder per
  // market, one per audience and language inside it, each holding the project's file and its
  // Variant folders. Every image is rendered on demand from that project's state with its own
  // photos (fetched from the share store), so it is always the latest. Edit text writes the
  // words back into that project on the share store, merged over anything saved meanwhile.
  const RS_KEY = 'provident-share:rs';
  const RS = {
    cur: null,
    async open(shell, tok, d) {
      const role = d.role, rs = d.rs || {};
      const dlg = nameDialog({ title: role === 'ct' ? 'Check the copy' : role === 'pm' ? 'Ad set package' : 'Your ad set', btn: 'Open',
        lead: '<b>' + esc(rs.name || 'Ad set') + '</b> · ' + (rs.items || []).length + ((rs.items || []).length === 1 ? ' project' : ' projects') + '. ' +
          (role === 'ct' ? 'You see the words of every project beside its images. Change them as needed — the images update as you type — then approve the English copy, and later the translation, for each audience.'
            : role === 'pm' ? 'You see every project’s images, rendered from the latest work. Each audience can be downloaded when it is done; the whole set is Package ready when every audience is. You cannot change the projects from this link.'
              : 'The designer’s overview: every project, its status, and a link to open each in the full studio.'),
        note: role === 'pm' ? 'Your name shows who looked at the package.' : 'Your name is shown beside every change you make.' });
      const name = await dlg.name();
      if (!name) return;
      lsSet(NAME_KEY, name);
      dlg.busy('Loading the projects…');
      try { await this.start(shell, tok, d); dlg.close(); }
      catch (e) { dlg.fail(e.message || String(e), 'Close'); }
    },
    async resume(shell, tok) {
      try { await this.start(shell, tok, await api('rsget', { id: tok, full: '1' })); }
      catch (e) { ssSet(RS_KEY, null); }
    },
    async start(shell, tok, d) {
      if (this.cur) this.cur.stop(true);
      if (d.role === 'dd' && d.rs && d.rs.tok) Arch.add(tok, d.rs.name, d.rs.product);
      const v = this.cur = new RsView(shell, tok, d);
      ssSet(RS_KEY, { id: tok, pid: (shell.eng && shell.eng.state && shell.eng.state.pid) || '' });
      await v.load();
      v.view();
      // Performance marketing has the bar and its See details window: no side panel at all.
      if (v.role !== 'pm' && (v.role === 'ct' || lsGet('provident-share-open') === '1')) v.shPanel(true);
    }
  };
  function RsView(shell, tok, d) {
    this.shell = shell; this.eng = shell.eng; this.tok = tok; this.role = d.role; this.rs = d.rs;
    this.proj = {}; this.ln = d.ln || 0; this.rlog = d.log || []; this.ver = 1; this.scanned = 0;
    this.busy = false; this.err = ''; this.burst = null; this.lastW = 0;
    this.seen = +lsGet('provident-share-seen:' + tok) || Date.now();
    injectCss();
    this.ui = buildUi(this);
    this.ui.root.dataset.role = this.role;
    this.ui.root.querySelector('.shl-share').hidden = true;
    const h = document.documentElement;
    h.classList.add('shl-on', 'rs-on');
    h.classList.toggle('rv-as', this.role !== 'dd');
    h.classList.toggle('rv-pm', this.role === 'pm');
    h.dataset.rvRole = this.role;
    if (this.role === 'pm') this.barMake();
    this.tick = setInterval(() => this.onTick(), 1000);
    this.poll = setInterval(() => this.shPoll(), POLL);
    this.clock = setInterval(() => this.shRender(), 30000);
    this.onVis = () => { if (!document.hidden) this.shPoll(); };
    document.addEventListener('visibilitychange', this.onVis);
    this.ui.status(this.role === 'pm' ? 'view' : 'ok');
  }
  const RV = RsView.prototype;
  // the project a folder of the overview holds: its own designer link, or this one
  RV.projOf = function (key) {
    const it = (this.rs.items || []).find(x => { const pa = this.pathOf(x); return pa[0] + '\u0001' + pa[1] === key; });
    if (!it) return null;
    return { sid: it.sid, label: itemLabel(it), here: !!(this.embed && this.eng._sh && this.eng._sh.id === it.sid), href: this.eng.shLink(it.sid) };
  };

  RV.link = function () { return rsLink(this.tok); };
  RV.here = function () { const sh = this.shell; return !!(sh.state.adSetsOpen && sh._asSrc && sh._asSrc.share === this); };
  // every project's state, its revision and its photo map
  RV.load = async function () {
    const items = (this.rs.items || []).filter(it => !this.proj[it.sid]);
    await pool(items, 3, async it => {
      try {
        const d = await api('get', { id: this.tok, p: it.sid });
        const st = this.eng.shNorm(d.state);
        this.proj[it.sid] = { st, base: st, rb: st, rev: d.rev, n: d.n, from: d.from, log: d.log || [], imgs: d.imgs || {}, cache: {}, photos: null, assets: null, pend: false };
      } catch (e) { this.proj[it.sid] = { gone: e.message || String(e), st: null, cache: {}, log: [] }; }
    });
    Object.keys(this.proj).forEach(sid => { if (!(this.rs.items || []).some(it => it.sid === sid)) delete this.proj[sid]; });
    this.ver++;
  };
  RV.photos = function (sid) {
    const p = this.proj[sid];
    if (!p.photos) p.photos = (async () => {
      const out = {};
      await pool(Object.keys(p.imgs || {}), 3, async sl => { const r = await fetchRec(this.tok, p.imgs[sl], sid); if (r) out[sl] = r; });
      return out;
    })();
    return p.photos;
  };
  RV.render = function (sid, vi, sk) {
    const p = this.proj[sid], k = vi + ':' + sk;
    if (!p.cache[k]) p.cache[k] = (async () => {
      const st = p.st, C = this.eng.constructor;
      if (!p.assets) p.assets = (async () => { await warmFonts(); return this.eng.loadAssets(st, await this.photos(sid)); })();
      const r = await this.eng.rasterFile(this.eng.buildOps(st, vi, sk, await p.assets), 'jpg', C.exportScale(sk, st));
      StudioBase.applyFont(this.eng.state);
      return r.data;
    })();
    return p.cache[k];
  };
  // English first: "Family" sorts before "Family · Arabic" in the window's list
  RV.pathOf = function (it) { return it.market && it.aud ? [it.market, it.aud + (it.lang === 'ARB' ? ' · Arabic' : '')] : ['Ad set', ((this.proj[it.sid] || {}).st || {}).campaign || 'Project']; };
  RV.build = function () {
    const me = this, C = this.eng.constructor, lm = Date.now();
    const file = (nm, type, data, extra) => Object.assign({ kind: 'file', name: nm, modified: lm, live: true,
      getFile: async () => new File([await data()], nm, { type, lastModified: lm }),
      createWritable: async () => ({ write: async () => {}, close: async () => {} }) }, extra || {});
    const dirH = (nm, kids) => ({ kind: 'directory', name: nm, queryPermission: async () => 'granted', requestPermission: async () => 'granted',
      async *entries() { for (const k of kids) yield [k.name, k]; },
      async getDirectoryHandle(x) { const f = kids.find(k => k.kind === 'directory' && k.name === x); if (f) return f; const e = new Error('Not found'); e.name = 'NotFoundError'; throw e; } });
    const tree = {};
    (this.rs.items || []).forEach(it => {
      const p = this.proj[it.sid]; if (!p || !p.st) return;
      const [m, a] = this.pathOf(it), sid = it.sid, st = p.st;
      const nm = (st.campaign || 'Campaign').replace(/[^\w\-. ]/g, '').trim() || 'Campaign';
      const pub = () => { p.rb = p.st; return { app: 'provident-ad-studio', state: p.st }; };
      const json = file(itemLabel(it) + '.adstudio.json', 'application/json', async () => JSON.stringify(pub()), {
        getFull: async () => new File([JSON.stringify(Object.assign(pub(), { images: await me.photos(sid) }))], itemLabel(it) + '.adstudio.json', { type: 'application/json' })
      });
      if (this.role !== 'pm' && !this.embed) json.createWritable = async () => {
        const parts = [];
        return { write: async x => { parts.push(x && x.data !== undefined ? x.data : x); },
          close: async () => { const doc = JSON.parse(await new Blob(parts.map(q => q instanceof Blob ? q : new Blob([q]))).text()); me.onJson(sid, doc.state); } };
      };
      const kids = [json];
      (st.variants || []).slice(0, 26).forEach((v, vi) => {
        const L = 'Variant ' + String.fromCharCode(65 + vi);
        const files = C.sizesFor(st, v).filter(k => RV_SIZES.indexOf(k) >= 0)
          .map(sk => file(nm + '_' + L + '_' + (C.EXPORT_NAME[sk] || sk) + '.jpg', 'image/jpeg', () => me.render(sid, vi, sk)));
        if (files.length) kids.push(dirH(L, files));
      });
      (tree[m] || (tree[m] = [])).push(dirH(a, kids));
    });
    return dirH(this.rs.name || 'Ad set', Object.keys(tree).map(m => dirH(m, tree[m])));
  };
  RV.view = function () {
    const sh = this.shell;
    this.dir = this.build(); this.scanned = this.ver;
    sh._asMode = this.role === 'ct' ? 'text' : 'images'; sh._asAll = false; sh._ae = null;
    if (!sh.state.adSetsOpen) sh.setState({ adSetsOpen: true });
    sh.asView({ kind: 'review', handle: this.dir, name: this.rs.name || 'Ad set', share: this, lock: this.role !== 'dd' });
  };
  RV.editing = function () {
    const ae = this.shell._ae, a = document.activeElement;
    return !!((ae && (ae.dirty || ae.saving)) || (a && a.closest && a.closest('.as-ov') && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)));
  };
  RV.onTick = function () {
    const sh = this.shell, here = this.here();
    if (!here && this.role !== 'dd' && !StudioBase.loadingSession) { this.view(); return; }
    this.ui.root.classList.toggle('away', !here);
    document.documentElement.classList.toggle('shl-open', here && this.ui.root.classList.contains('open'));
    document.documentElement.classList.toggle('rs-on', here);
    if (here) {
      const mode = this.role === 'ct' ? 'text' : this.role === 'pm' ? 'images' : null;
      if (mode && (sh._asMode || 'images') !== mode && sh.asSetMode) sh.asSetMode(mode);
      if (this.ver !== this.scanned && !(sh._as && sh._as.busy) && !this.editing()) {
        const sel = sh._asSel;
        this.dir = this.build(); this.scanned = this.ver;
        sh._asSrc = Object.assign({}, sh._asSrc, { handle: this.dir });
        sh._ae = null; sh._asSel = sel; sh.asScan();
      }
    }
    const queued = Object.keys(this.proj).filter(s => this.proj[s].pend);
    if (queued.length && !this.busy && Date.now() - this.lastW > 1500) this.save(queued[0]);
    if (this.role !== 'pm') this.ui.status(this.busy || queued.length ? 'saving' : (this.err ? 'error' : 'ok'), this.err || undefined);
    this.panelRender();
    if (this.role === 'pm') this.barRender();
  };
  // Edit text saved a project: merge it onto that project as it is now, against what was read
  RV.onJson = function (sid, st) {
    const p = this.proj[sid]; if (!p) return;
    const mine = this.eng.shNorm(st);
    p.st = merge3(p.rb || p.st, mine, p.st); p.rb = mine;
    p.cache = {}; p.pend = true; this.lastW = Date.now();
  };
  RV.words = function (it, st) {
    const out = {}, C = this.eng.constructor;
    try { const flat = C.copyFlat(C.copySnap(st, 'draft')); Object.keys(flat).forEach(k => { out[k] = flat[k]; }); } catch (e) {}
    return out;
  };
  RV.save = async function (sid) {
    if (this.busy) return;
    this.busy = true;
    const p = this.proj[sid], it = (this.rs.items || []).find(x => x.sid === sid), by = StudioBase.shareName() || 'Someone';
    try {
      for (let tries = 0; tries < 4; tries++) {
        const sent = JSON.parse(JSON.stringify(p.st));
        const A = this.words(it, p.base), B = this.words(it, sent), ch = [], lab = itemLabel(it);
        Object.keys(B).forEach(k => { const x = A[k], y = B[k]; if (!x || x.value !== y.value) ch.push({ kind: x && x.value ? (y.value ? 'changed' : 'removed') : 'added', page: lab + (y.page ? ' · ' + y.page : ''), label: y.label, was: x ? x.value : '', now: y.value }); });
        Object.keys(A).forEach(k => { if (!B[k] && A[k].value) ch.push({ kind: 'removed', page: lab, label: A[k].label, was: A[k].value, now: '' }); });
        const burst = this.burstOf(ch);
        try {
          const r = await api('save', { id: this.tok, p: sid }, { base: p.rev, state: sent, by, burst: burst.id, changes: burst.list, sum: this.eng.rvSum(sent) });
          p.rev = r.rev; p.base = sent;
          if (canon(p.st) === canon(sent)) p.pend = false;
          this.err = '';
          await this.pull(sid, true);
          return;
        } catch (e) {
          if (!e.stale) throw e;
          await this.pull(sid);
        }
      }
      throw new Error('Could not save — others kept saving at the same moment. It will try again.');
    } catch (e) { this.err = e.message || String(e); this.lastW = Date.now() + 8000; }
    finally { this.busy = false; }
  };
  RV.burstOf = function (ch) {
    const now = Date.now();
    if (!this.burst || now - this.burst.t > BURST) this.burst = { id: Math.random().toString(36).slice(2, 12), t: now, map: {}, order: [] };
    const B = this.burst; B.t = now;
    ch.forEach(c => {
      const k = [c.page || '', c.label || ''].join('|'), o = B.map[k];
      if (!o) { B.map[k] = Object.assign({}, c); B.order.push(k); }
      else { o.now = c.now; o.kind = o.was ? (c.now ? 'changed' : 'removed') : 'added'; }
    });
    return { id: B.id, list: B.order.map(k => B.map[k]).filter(c => c.was !== c.now) };
  };
  // someone else's save on one project: their state, with this person's unsaved words on top
  RV.pull = async function (sid, logOnly) {
    const p = this.proj[sid];
    const d = await api('sync', { id: this.tok, p: sid, from: Math.max(0, (p.n || 0) - 1) });
    p.log = p.log.slice(0, Math.max(0, d.from - (p.from || 0))).concat(d.log || []).slice(-150); p.from = Math.max(0, d.n - p.log.length); p.n = d.n;
    if (!logOnly && d.rev !== p.rev) {
      const theirs = this.eng.shNorm(d.state);
      p.st = merge3(p.base, p.st, theirs); p.base = theirs; p.rev = d.rev;
      if (canon(d.imgs || {}) !== canon(p.imgs || {})) { p.imgs = d.imgs || {}; p.photos = null; p.assets = null; }
      p.cache = {}; this.ver++;
    }
  };
  RV.shPoll = async function (force) {
    if (this.polling || this.busy || (!force && document.hidden)) return;
    this.polling = true;
    try {
      const d = await api('rsget', { id: this.tok });
      if (d.ln !== this.ln) { const f = await api('rsget', { id: this.tok, full: '1' }); this.rlog = f.log || []; this.ln = f.ln; }
      if (canon(d.rs) !== canon(this.rs)) {
        notifySteps(this.rs, d.rs, this.ui);
        const items = canon((d.rs.items || []).map(x => [x.sid, x.market, x.aud, x.lang])) !== canon((this.rs.items || []).map(x => [x.sid, x.market, x.aud, x.lang]));
        this.rs = d.rs;
        if (items) await this.load();
      }
      for (const sid of Object.keys(d.proj || {})) {
        const p = this.proj[sid]; if (!p || p.gone) continue;
        if (d.proj[sid].rev !== p.rev) await this.pull(sid);
        else if (d.proj[sid].n !== p.n) await this.pull(sid, true);
      }
      this.err = '';
    } catch (e) { if (/expired|never made|not valid/.test(e.message || '')) this.err = e.message; }
    finally { this.polling = false; }
    this.shRender();
  };
  RV.rvStep = async function (act) {
    if (this.stepBusy) return;
    const [a, sid] = String(act).split(':');
    this.stepBusy = act; this.panelRender(true);
    try {
      // the approval covers the words just typed: a pending save goes first
      for (let i = 0; i < 40 && (this.busy || (this.proj[sid] && this.proj[sid].pend)); i++) { if (!this.busy) await this.save(sid); else await new Promise(r => setTimeout(r, 250)); }
      const r = await api('rsstep', { id: this.tok }, { p: sid, act: a, by: StudioBase.shareName() || 'Someone' });
      this.rs = r.rs;
      this.ui.flash(a === 'copy-done' ? 'Approved' : a === 'design-done' ? 'Marked done' : 'Back in progress');
      this.shPoll(true);
    } catch (e) { this.ui.flash(e.message || String(e)); }
    finally { this.stepBusy = null; this.panelRender(true); }
  };
  RV.rvDrive = async function (v) {
    try { const r = await api('rsset', { id: this.tok }, { drive: v }); this.rs = r.rs; this.ui.flash('Drive location saved'); }
    catch (e) { this.ui.flash(e.message || String(e)); }
  };
  RV.selItem = function () {
    const sel = this.shell._asSel;
    return (this.rs.items || []).find(it => this.pathOf(it).join('\u0001') === sel) || null;
  };
  // the panel's review section: the whole ad set, the audience on screen, every audience below
  RV.panelRender = function (force) {
    const sec = this.ui.root.querySelector('.rv');
    this.ui.root.querySelector('.shl-panel h2').textContent = 'Ad set review';
    sec.hidden = false;
    const rs = this.rs, auds = rsAuds(rs), all = rsOverall(auds), role = this.role, busy = this.stepBusy, cur = this.selItem();
    const audRow = a => '<li class="rs-a' + (cur && a.items.indexOf(cur) >= 0 ? ' rs-on' : '') + '"><div class="rs-ah"><b>' + esc(a.label) + '</b>' + pillHtml(a.done, a.done ? 'Done' : a.now ? a.now.label : '') + '</div>' +
      '<span class="rs-mini">' + a.steps.map(x => '<i data-s="' + x.s + '" title="' + esc(x.label + ' — ' + x.sub) + '"></i>').join('') + '<s>' + esc(a.done ? 'Ready to run' : a.now ? a.now.sub : '') + '</s></span>' +
      (role !== 'pm' ? '<div class="rs-its">' + a.items.map(it => '<div class="rs-it"><span>' + esc(it.lang || 'ENG') + '</span>' + itemActs(it, role, busy) +
        (role === 'dd' ? '<a class="p-ghost" href="' + esc(rsLink(it.sid)) + '" target="_blank" rel="noopener">Open</a>' : '') + '</div>').join('') +
        (role === 'dd' && !a.arb ? '<label class="rs-eo"><input type="checkbox" data-eo="' + esc(a.market + '|' + a.aud) + '"' + (a.engOnly ? ' checked' : '') + '> No Arabic for this audience</label>' : '') + '</div>' : '') + '</li>';
    const lead = role === 'ct' ? 'Pick a project on the left, change its words, then approve it here. The English copy comes first; the Arabic version is checked once the designer has laid it out.'
      : role === 'pm' ? 'Each audience can be downloaded from the bar above as soon as it is done.'
        : 'Open a project to design it. Add each other audience and language from its own project: Share › Ad set review › Add to an ad set.';
    const html = '<div class="rv-h"><div><span class="rv-k">' + esc(ROLE_NAME[role] || '') + (rs.product ? ' · ' + esc(PRODUCT_NAME[rs.product] || rs.product) : '') + '</span><b>' + esc(rs.name || 'Ad set') + '</b></div>' + pillHtml(all.ready) + '</div>' +
      stepperHtml(all.steps, true) + '<p class="rv-lead">' + esc(lead) + '</p>' +
      (cur && role === 'ct' ? '<div class="rs-cur"><span class="rv-k">On screen</span><b>' + esc(itemLabel(cur)) + '</b><div class="rv-acts">' + itemActs(cur, role, busy) + '</div>' +
        (cur.lang === 'ARB' && !cur.design ? '<p class="rv-lead">The designer is still laying out the Arabic. You can edit it; approve it once it is marked laid out.</p>' : '') + '</div>' : '') +
      '<ul class="rs-auds">' + (auds.length ? auds.map(audRow).join('') : '<li class="shl-empty">No projects yet.</li>') + '</ul>' +
      (window.Notification && Notification.permission === 'default' ? '<button type="button" class="rv-ntf" data-ntf="1">Notify me in this browser when a step changes</button>' : '');
    const m = sec.querySelector('.rv-main');
    if (force || m._h !== html) { m._h = html; m.innerHTML = html; }
    const dd = sec.querySelector('.rv-dd');
    dd.hidden = role !== 'dd' || !rs.tok;
    if (!dd.hidden) {
      const lk = linkRows(rs.tok), box = dd.querySelector('.rv-lks');
      if (box._h !== lk) { box._h = lk; box.innerHTML = lk; }
      const inp = dd.querySelector('.rv-drv input');
      if (document.activeElement !== inp) inp.value = rs.drive || '';
    }
    if (!sec._eo) { sec._eo = true; sec.addEventListener('change', async e => {
      const c = e.target.closest('[data-eo]'); if (!c) return;
      try { const r = await api('rsset', { id: this.tok }, { eng_only: { [c.dataset.eo]: c.checked } }); this.rs = r.rs; this.panelRender(true); }
      catch (er) { this.ui.flash(er.message || String(er)); }
    }); }
  };
  RV.shPanel = function (open) {
    if (this.role === 'pm') return;
    if (!this.here()) { this.view(); open = true; }
    open = open == null ? !this.ui.root.classList.contains('open') : !!open;
    this.ui.root.classList.toggle('open', open);
    document.documentElement.classList.toggle('shl-open', open && this.here());
    lsSet('provident-share-open', open ? '1' : '0');
    if (open) { this.seen = Date.now(); lsSet('provident-share-seen:' + this.tok, String(this.seen)); }
    this.shRender();
  };
  // the log: the ad set's own (steps, projects added) and every project's words, newest first
  RV.shRender = function () {
    const me = StudioBase.shareName(), open = this.ui.root.classList.contains('open');
    const log = this.rlog.slice();
    (this.rs.items || []).forEach(it => { const p = this.proj[it.sid]; (p && p.log || []).forEach(e => { if ((e.changes || []).some(c => c.kind !== 'note')) log.push(e); }); });
    log.sort((a, b) => b.at - a.at);
    const unseen = log.filter(e => e.at > this.seen && e.by !== me).length;
    this.ui.set({ link: this.link(), me, people: new Set(log.map(e => e.by).filter(Boolean)).size, unseen: open ? 0 : unseen, log: log.slice(0, 200) });
    this.ui.root.querySelector('.shl-sub').textContent = (this.rs.items || []).length + ' projects · ' + (this.rs.name || 'Ad set');
    this.panelRender();
  };
  RV.shareStop = function () { this.stop(); if (this.here()) this.shell.asClose(); };
  RV.stop = function (keep) {
    clearInterval(this.tick); clearInterval(this.poll); clearInterval(this.clock);
    document.removeEventListener('visibilitychange', this.onVis);
    this.ui.root.remove(); if (this.bar) this.bar.remove(); if (this.dlg) this.dlg.remove();
    const h = document.documentElement;
    h.classList.remove('shl-on', 'shl-open', 'rs-on', 'rv-as', 'rv-pm'); delete h.dataset.rvRole;
    if (RS.cur === this) RS.cur = null;
    if (!keep) ssSet(RS_KEY, null);
  };
  // performance marketing's header: ONE row — the ad set, the four steps (labels only) spread
  // across the bar, See details and Download. Dates, counts and the audiences live in the
  // details window, so the bar stays a status line.
  RV.barMake = function () {
    const el = this.bar = document.createElement('div');
    el.className = 'rvh'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'Ad set package');
    document.body.appendChild(el);
    const dlg = this.dlg = document.createElement('dialog');
    dlg.className = 'rvh-dlg'; dlg.setAttribute('aria-label', 'Ad set details');
    document.body.appendChild(dlg);
    const click = e => {
      const b = e.target.closest('[data-dl],[data-det],[data-x]');
      if (e.target === dlg) { dlg.close(); return; }          // a click on the backdrop
      if (!b) return;
      if (b.dataset.dl) this.download(b.dataset.dl);
      if (b.dataset.det) { this.barRender(); dlg.showModal(); }
      if (b.dataset.x) dlg.close();
    };
    el.addEventListener('click', click); dlg.addEventListener('click', click);
    if (window.ResizeObserver) new ResizeObserver(() => document.documentElement.style.setProperty('--rvh', el.offsetHeight + 'px')).observe(el);
  };
  RV.barRender = function () {
    const el = this.bar; if (!el) return;
    const rs = this.rs, auds = rsAuds(rs), all = rsOverall(auds), busy = this.dl;
    const dlBtn = '<button type="button" class="' + (all.done ? 'p-btn' : 'p-ghost') + ' rvh-dl" data-dl="*"' + (all.done && !busy ? '' : ' disabled') + ' title="' + (all.ready ? 'Every audience, in one zip' : all.done ? 'The audiences that are done, in one zip' : 'Nothing is done yet') + '">' +
      (busy === '*' ? 'Zipping…' : all.ready ? 'Download package' : 'Download' + (all.done ? ' ' + all.done + ' of ' + all.n : '')) + '</button>';
    const tick = '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M382-354 734-706q12-12 28-12t28 12q12 12 12 28t-12 28L410-270q-12 12-28 12t-28-12L170-454q-12-12-11.5-28t12.5-28q12-12 28-12t28 12l155 156Z"/></svg>';
    const mini = '<ol class="rvh-st" aria-label="Progress">' + all.steps.map(x => '<li data-s="' + x.s + '" title="' + esc(x.label + ' — ' + x.sub) + '"><i>' + (x.s === 'done' ? tick : '') + '</i><b>' + esc(x.label) + '</b></li>').join('') + '</ol>';
    const html = '<div class="rvh-in"><div class="rvh-t"><span class="rvh-k">Ad set package' + (rs.product ? ' · ' + esc(PRODUCT_NAME[rs.product] || '') : '') + '</span><b>' + esc(rs.name || 'Ad set') + '</b></div>' +
      mini + '<div class="rvh-a"><button type="button" class="p-ghost rvh-det" data-det="1">See details</button>' + dlBtn + '</div></div>';
    if (html !== this._barH) { this._barH = html; el.innerHTML = html; document.documentElement.style.setProperty('--rvh', el.offsetHeight + 'px'); }
    // the details window: everything the bar leaves out
    const dlg = this.dlg; if (!dlg) return;
    const det = '<header class="rvh-dh"><div><span class="rvh-k">Ad set package' + (rs.product ? ' · ' + esc(PRODUCT_NAME[rs.product] || '') : '') + '</span><h2>' + esc(rs.name || 'Ad set') + '</h2></div>' +
      '<button type="button" class="p-ghost rvh-x" data-x="1" aria-label="Close">×</button></header>' +
      '<div class="rvh-db"><div class="rvh-dm">' + pillHtml(all.ready) + '<span>Created ' + esc(day(rs.created)) + (rs.by ? ' by ' + esc(rs.by) : '') + '</span><span>' +
      (all.ready ? 'Ready ' + esc(day(all.at)) : all.done + ' of ' + all.n + (all.n === 1 ? ' audience' : ' audiences') + ' done') + '</span></div>' +
      '<section><h3>Progress</h3>' + stepperHtml(all.steps) + '</section>' +
      '<section><h3>Audiences <s>' + auds.length + '</s></h3>' + (auds.length ? '<ul class="rvh-al">' + auds.map(a => '<li data-s="' + (a.done ? 'done' : 'prog') + '"><div class="rvh-ah"><b>' + esc(a.label) + '</b>' +
        (a.done ? '<button type="button" class="p-ghost" data-dl="' + esc(a.key) + '"' + (busy ? ' disabled' : '') + '>' + (busy === a.key ? 'Zipping…' : 'Download') + '</button>' : '<span class="rvh-now">' + esc(a.now ? a.now.label : '') + '</span>') + '</div>' +
        stepperHtml(a.steps) + '</li>').join('') + '</ul>' : '<p class="rvh-none">No audiences yet.</p>') + '</section></div>' +
      '<footer class="rvh-df">' + dlBtn + '</footer>';
    if (det !== this._dlgH) { this._dlgH = det; dlg.innerHTML = det; }
  };
  // one flat zip of a finished audience (both languages), or of every finished audience
  RV.download = async function (key) {
    if (this.dl) return;
    const auds = rsAuds(this.rs).filter(a => a.done && (key === '*' || a.key === key));
    const want = new Set(); auds.forEach(a => a.items.forEach(it => want.add(this.pathOf(it).join('\u0001'))));
    const a = this.shell._as || {}, items = [];
    for (const m of a.mains || []) for (const au of m.auds) if (want.has(au.key)) for (const c of au.cols) for (const pl of c.plats) for (const t of pl.tiles) if (t.file) items.push({ file: t.file, name: String(t.name || t.file.name).split('/').pop(), pre: au.key.replace('\u0001', ' ') });
    if (!items.length) return;
    this.dl = key; this.barRender();
    try {
      const clean = v => String(v || '').replace(/[\\/:*?"<>|]+/g, '-').trim(), used = new Set(), files = [];
      for (const it of items) {
        let n = clean(it.name); if (used.has(n)) n = clean(it.pre) + ' ' + n;
        used.add(n); files.push({ name: n, data: new Uint8Array(await it.file.arrayBuffer()) });
      }
      const nm = clean(this.rs.name) + (key === '*' ? '' : ' - ' + clean(auds[0].label));
      await this.eng.saveAs(this.eng.zip(files), nm + '.zip', 'Zip archive', 'application/zip', '.zip');
    } catch (e) { this.ui.flash('Could not zip — ' + (e.message || e)); }
    this.dl = null; this.barRender();
  };
  async function warmFonts() {
    const L = f => { try { return document.fonts.load(f).catch(() => null); } catch (e) { return null; } };
    await Promise.all(['100 103px "Google Sans Flex"', '300 41px "Google Sans Flex"', '400 59px "Google Sans Flex"', '500 28px "Google Sans Flex"'].map(L));
    try { await document.fonts.ready; } catch (e) {}
  }

  // ---------- the designer's archive: Review links on CAS's home page ----------
  // Every ad set this computer started, added to, or opened as the designer, kept by its
  // designer token in localStorage; the records come from the share store, where an ad set never
  // expires. Plain DOM mounted into an empty host in the home page's markup — React never
  // reconciles it.
  const ARCH_KEY = 'provident-reviews', ARCH_HIDE = 'provident-reviews-hidden';
  const hidden = () => { try { const a = JSON.parse(localStorage.getItem(ARCH_HIDE) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const Arch = {
    list() { try { const a = JSON.parse(localStorage.getItem(ARCH_KEY) || '[]'); return Array.isArray(a) ? a.filter(x => x && SHARE_ID.test(x.id || '')) : []; } catch (e) { return []; } },
    save(a) { lsSet(ARCH_KEY, JSON.stringify(a.slice(0, 200))); },
    // An ad set removed from this computer's list stays removed: opening one of its projects
    // used to put it straight back. Only pasting its link (force) brings it back.
    add(id, name, product, force) {
      if (!id || !isRsId(id)) return;
      if (force) lsSet(ARCH_HIDE, JSON.stringify(hidden().filter(x => x !== id)));
      else if (hidden().indexOf(id) >= 0) return;
      const a = this.list(), o = a.find(x => x.id === id);
      if (o) { if (name) o.name = name; if (product) o.product = product; } else a.unshift({ id, name: name || '', product: product || '', at: Date.now() });
      this.save(a);
    },
    swap(old, id) { if (old === id) return; const a = this.list(), o = a.find(x => x.id === old); if (!o) return; if (a.some(x => x.id === id)) this.save(a.filter(x => x.id !== old)); else { o.id = id; this.save(a); } },
    drop(id) { this.save(this.list().filter(x => x.id !== id)); lsSet(ARCH_HIDE, JSON.stringify([id].concat(hidden().filter(x => x !== id)).slice(0, 400))); },
    mount(eng) { document.querySelectorAll('[data-rv-arch]').forEach(el => { if (!el._rva) el._rva = new ArchView(el, eng); }); }
  };
  window.providentReviews = Arch;

  // ---- THE HOME PAGE'S CAMPAIGN SETUP: the ad set, defined before the first design ----
  // Quick: a name, the product and the Drive folder. More settings: the markets, the
  // audiences and which of them get an Arabic version — not every campaign runs abroad or
  // in Arabic, so the defaults are Local, both audiences, English only. The draft is kept on
  // this computer, so a half-set-up campaign survives a reload. "Start the campaign" opens a
  // new project which then makes the ad set from the plan (rsPlanCheck).
  const Plan = {
    mount(eng) { document.querySelectorAll('[data-rs-plan]').forEach(el => { if (!el._rsp) el._rsp = new PlanView(el, eng); }); }
  };
  function planDraft() {
    let d = null; try { d = JSON.parse(lsGet(PLAN_KEY) || 'null'); } catch (e) {}
    d = Object.assign({ name: '', product: 'residential', folder: lsGet('provident-rs-folder'), markets: ['Local'], auds: null, arb: {}, by: StudioBase.shareName(), open: false }, d || {});
    if (!AUDS[d.product]) d.product = 'residential';
    d.markets = MARKETS.filter(m => (d.markets || []).indexOf(m) >= 0); if (!d.markets.length) d.markets = ['Local'];
    const as = AUDS[d.product]; d.auds = as.filter(a => (d.auds || as).indexOf(a) >= 0); if (!d.auds.length) d.auds = as.slice();
    return d;
  }
  const PICO = {
    tune: '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M450-130v-220h60v80h320v60H510v80h-60Zm-320-80v-60h220v60H130Zm160-160v-80H130v-60h160v-80h60v220h-60Zm160-80v-60h380v60H450Zm160-160v-220h60v80h160v60H670v80h-60Zm-480-80v-60h380v60H130Z"/></svg>',
    go: '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M647.85-450H190q-12.75 0-21.37-8.63-8.63-8.63-8.63-21.38 0-12.76 8.63-21.37Q177.25-510 190-510h457.85L516.31-641.54q-8.92-8.92-8.81-20.88.12-11.96 9.42-21.27 9.31-8.69 21.08-8.89 11.77-.19 21.08 9.12l179.77 179.77q5.61 5.61 7.92 11.92 2.31 6.31 2.31 13.46t-2.31 13.46q-2.31 6.31-7.92 11.92L558.08-275.15q-8.31 8.3-20.58 8.5-12.27.19-21.58-8.5-9.3-9.31-9.3-21.38 0-12.08 9.3-21.39L647.85-450Z"/></svg>',
    more: '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M480-357.85q-6.46 0-11.92-2.11-5.46-2.12-10.7-7.35L281.85-543.85q-8.31-8.3-8.5-20.88-.19-12.58 8.5-21.27t21.08-8.69q12.38 0 21.07 8.69L480-430.15 635.85-586q8.3-8.31 20.88-8.5 12.58-.19 21.27 8.5t8.69 21.08q0 12.38-8.69 21.07L502.62-367.31q-5.24 5.23-10.7 7.35-5.46 2.11-11.92 2.11Z"/></svg>',
    tick: '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M382-354 734-706q12-12 28-12t28 12q12 12 12 28t-12 28L410-270q-12 12-28 12t-28-12L170-454q-12-12-11.5-28t12.5-28q12-12 28-12t28 12l155 156Z"/></svg>',
    set: '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M212.31-140Q182-140 161-161q-21-21-21-51.31v-535.38Q140-778 161-799q21-21 51.31-21h535.38Q778-820 799-799q21 21 21 51.31v535.38Q820-182 799-161q-21 21-51.31 21H212.31Zm0-60h535.38q4.62 0 8.46-3.85 3.85-3.84 3.85-8.46V-620H200v407.69q0 4.62 3.85 8.46 3.84 3.85 8.46 3.85ZM200-680h560v-67.69q0-4.62-3.85-8.46-3.84-3.85-8.46-3.85H212.31q-4.62 0-8.46 3.85-3.85 3.84-3.85 8.46V-680Zm0 0v-80 80Z"/></svg>'
  };
  function PlanView(el, eng) {
    injectCss();
    this.el = el; this.eng = eng; this.d = planDraft(); this.drive = dsOn();
    const d = this.d;
    // Hierarchy, top to bottom: the figure and one line say what this is; three fields hold
    // what every campaign needs; the plan is drawn as tiles — one per audience, its Arabic
    // switch on the tile — so the setup reads at a glance instead of as sentences.
    el.innerHTML = '<section class="rsp" aria-labelledby="rsp-t">' +
      '<header class="rsp-h">' +
        '<span class="rsp-fig" data-hl="riffle" aria-hidden="true"></span>' +
        '<div class="rsp-ht"><span class="rsp-k">New campaign</span><h2 id="rsp-t">Set up the ad set</h2>' +
        '<p>Every market, audience and language under one review.</p></div>' +
      '</header>' +
      '<div class="rsp-body">' +
        '<div class="rsp-q">' +
          '<label class="rsp-f"><span>Name</span><input class="p-in" data-f="name" maxlength="120" placeholder="Campaign name" autocomplete="off"></label>' +
          '<div class="rsp-f"><span id="rsp-prod-l">Product</span><div class="p-tabs rsp-prod" role="radiogroup" aria-labelledby="rsp-prod-l"></div></div>' +
          (this.drive ? '<label class="rsp-f"><span>Drive folder</span><input class="p-in" data-f="folder" placeholder="Paste the folder link" autocomplete="off" title="The Google Drive folder the ad set is saved in, one subfolder per market, audience and language"></label>' : '') +
        '</div>' +
        '<div class="rsp-plan">' +
          '<div class="rsp-ph"><b>Audiences</b><span class="rsp-n"></span>' +
            '<button type="button" class="rsp-mt" aria-expanded="false" aria-controls="rsp-more">' + PICO.tune + '<span>Markets & audiences</span>' + PICO.more + '</button></div>' +
          '<div class="rsp-more" id="rsp-more" hidden>' +
            '<div class="rsp-g"><span>Markets</span><div class="rsp-tg" data-g="markets"></div></div>' +
            '<div class="rsp-g"><span>Audiences</span><div class="rsp-tg" data-g="auds"></div></div>' +
          '</div>' +
          '<div class="rsp-tiles" role="list"></div>' +
        '</div>' +
      '</div>' +
      '<footer class="rsp-ft"><p class="rsp-st" aria-live="polite"></p>' +
        '<button type="button" class="rsp-blank">Blank project</button>' +
        '<button type="button" class="p-btn rsp-go">Start campaign' + PICO.go + '</button></footer>' +
    '</section>';
    const $ = q => el.querySelector(q);
    ['name', 'folder'].forEach(f => { const i = $('[data-f="' + f + '"]'); if (i) { i.value = d[f] || ''; i.addEventListener('input', () => { d[f] = i.value; this.save(); this.st(''); }); } });
    $('.rsp-mt').onclick = () => { d.open = !d.open; this.save(); this.draw(); };
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || !el.contains(b)) return;
      if (b.dataset.prod) this.setProd(b.dataset.prod);
      if (b.dataset.tg) this.toggle(b.dataset.tg, b.dataset.v);
      if (b.dataset.arb) { d.arb[b.dataset.arb] = !d.arb[b.dataset.arb]; this.save(); this.draw(); }
    });
    $('.rsp-go').onclick = () => this.go();
    $('.rsp-blank').onclick = () => { if (eng.newProject) eng.newProject(); };
    this.draw();
    // the figure mounts through the shell's own Hairline binding, which also destroys it
    // when the splash leaves the page
    setTimeout(() => { const h = eng.host; if (h && h.hlBind) h.hlBind(); }, 0);
  }
  const PV = PlanView.prototype;
  PV.save = function () { lsSet(PLAN_KEY, JSON.stringify(this.d)); };
  PV.st = function (t) { const p = this.el.querySelector('.rsp-st'); p.textContent = t; p.classList.toggle('bad', !!t); };
  PV.cells = function () { return planCells(this.d); };
  PV.setProd = function (p) {
    const d = this.d; if (d.product === p) return;
    d.product = p; const as = AUDS[p]; d.auds = as.filter(a => d.auds.indexOf(a) >= 0); if (!d.auds.length) d.auds = as.slice();
    this.save(); this.draw();
  };
  PV.toggle = function (g, v) {
    const d = this.d, a = d[g], i = a.indexOf(v);
    if (i >= 0) { if (a.length === 1) { this.st(g === 'markets' ? 'Keep at least one market.' : 'Keep at least one audience.'); return; } a.splice(i, 1); }
    else a.push(v);
    this.st(''); this.save(); this.draw();
  };
  const AUD_TIP = { Family: 'Buys to live in', Investor: 'Buys for returns', Hybrid: 'Rents, may convert to buying' };
  const MKT_TIP = { Local: 'AED', International: 'USD', 'International EUR': 'EUR' };
  PV.draw = function () {
    const d = this.d, el = this.el, $ = q => el.querySelector(q), cells = this.cells();
    const tab = (k, l, on) => '<button type="button" role="radio" aria-checked="' + (on ? 'true' : 'false') + '" data-prod="' + k + '"' + (on ? ' data-on="1"' : '') + '>' + esc(l) + '</button>';
    $('.rsp-prod').innerHTML = tab('residential', 'Residential', d.product === 'residential') + tab('commercial', 'Commercial', d.product === 'commercial');
    const arbN = cells.filter(c => c.arb).length, n = cells.length + arbN;
    $('.rsp-n').textContent = n + (n === 1 ? ' project' : ' projects');
    const mt = $('.rsp-mt'); mt.setAttribute('aria-expanded', d.open ? 'true' : 'false');
    $('.rsp-more').hidden = !d.open;
    if (d.open) {
      const tg = (g, v, tip) => { const on = d[g].indexOf(v) >= 0; return '<button type="button" class="rsp-t" aria-pressed="' + on + '" data-tg="' + g + '" data-v="' + esc(v) + '" title="' + esc(tip || '') + '">' + (on ? PICO.tick : '') + esc(v) + '</button>'; };
      el.querySelector('[data-g="markets"]').innerHTML = MARKETS.map(m => tg('markets', m, MKT_TIP[m])).join('');
      el.querySelector('[data-g="auds"]').innerHTML = AUDS[d.product].map(a => tg('auds', a, AUD_TIP[a])).join('');
    }
    // one tile per audience: market above, audience below, then its two languages
    $('.rsp-tiles').innerHTML = cells.map(c => {
      const k = c.market + '|' + c.aud, ar = !!d.arb[k];
      return '<div class="rsp-tile" role="listitem"' + (ar ? ' data-ar="1"' : '') + '><div class="rsp-tt"><s>' + esc(c.market) + '</s><b>' + esc(c.aud) + '</b></div>' +
        '<div class="rsp-lg"><span class="rsp-l" title="English — always made">EN</span>' +
        '<button type="button" class="rsp-l rsp-ar" aria-pressed="' + ar + '" data-arb="' + esc(k) + '" title="' + (ar ? 'Arabic version on — click for English only' : 'English only — click to add an Arabic version') + '" aria-label="Arabic version for ' + esc(c.market + ' ' + c.aud) + '">AR</button></div></div>';
    }).join('');
    const first = cells[0];
    $('.rsp-go').title = first ? 'Opens ' + first.market + ' · ' + first.aud + ' in English and makes the ad set' : '';
  };
  PV.go = function () {
    const d = this.d, $ = q => this.el.querySelector(q);
    d.name = (d.name || '').replace(/\s+/g, ' ').trim();
    if (!d.name) { this.st('Name the campaign first.'); $('[data-f="name"]').focus(); return; }
    if (this.drive && !window.providentDrive.id(d.folder || '')) { this.st('Paste a Drive folder link — it contains /folders/.'); $('[data-f="folder"]').focus(); return; }
    const eng = this.eng;
    if (eng.confirmDiscard && !eng.confirmDiscard()) return;
    if (eng.markSaved) eng.markSaved();
    const by = (d.by || StudioBase.shareName() || '').replace(/\s+/g, ' ').trim();
    const plan = { name: d.name, product: d.product, folder: (d.folder || '').trim(), by, markets: d.markets.slice(), auds: d.auds.slice(), arb: Object.assign({}, d.arb) };
    if (plan.folder) lsSet('provident-rs-folder', plan.folder);
    lsSet(PLAN_GO, JSON.stringify({ plan, at: Date.now() }));
    // the draft is spent: the next campaign starts from the defaults, keeping the folder
    lsSet(PLAN_KEY, JSON.stringify({ product: d.product, folder: d.folder }));
    const g = $('.rsp-go'); g.disabled = true; g.firstChild.textContent = 'Opening…';
    if (eng.newProject) eng.newProject();
  };
  window.providentPlan = Plan;
  function ArchView(el, eng) {
    injectCss();
    this.el = el; this.eng = eng; this.items = null; this.sel = null; this.det = null; this.err = '';
    el.innerHTML = '<div class="rva"><div class="rva-bar"><p>Every ad set this computer has started or worked on as the designer. Open one for each audience’s status, the links, and everything that changed.</p>' +
      '<form class="rva-add"><input class="p-in" placeholder="Paste a designer’s ad set link to add it here" aria-label="Designer ad set link"><button class="p-ghost" type="submit">Add</button></form></div>' +
      '<div class="rva-hl" data-s="wait"></div><div class="rva-body" aria-live="polite"></div></div>';
    el.addEventListener('click', e => this.click(e));
    // It refreshes itself: on a timer while on screen, and the moment the window comes back,
    // so a step someone took in another tab or on another computer shows without a reload.
    const tick = () => {
      if (!el.isConnected) { clearInterval(this.timer); document.removeEventListener('visibilitychange', tick); window.removeEventListener('focus', tick); return; }
      if (document.hidden || Date.now() - (this.at || 0) < 15000) return;
      this.refresh();
    };
    this.timer = setInterval(tick, 60000);
    document.addEventListener('visibilitychange', tick); window.addEventListener('focus', tick);
    window.addEventListener('provident-drive-signed', () => { if (el.isConnected) this.refresh(); });
    el.querySelector('.rva-add').addEventListener('submit', e => {
      e.preventDefault();
      const inp = el.querySelector('.rva-add input'), m = /#share=([\w.-]{8,140})/.exec(inp.value || '') || /^([\w.-]{8,140})$/.exec((inp.value || '').trim());
      if (!m || !SHARE_ID.test(m[1])) { this.err = 'That is not an ad set link.'; this.draw(); return; }
      if (isRsId(m[1])) Arch.add(m[1], '', '', true);
      else { const a = Arch.list(); if (!a.some(x => x.id === m[1])) { a.unshift({ id: m[1], name: '', at: Date.now() }); Arch.save(a); } }
      inp.value = ''; this.err = ''; this.load();
    });
    this.load();
  }
  const AV = ArchView.prototype;
  AV.refresh = function () {
    if (!this.sel) return this.load(true);
    // the detail page is redrawn whole, so not while someone is typing in it
    const f = document.activeElement, drv = this.el.querySelector('.rva-drv input');
    if (this.edit || (f && this.el.contains(f) && /INPUT|SELECT|TEXTAREA/.test(f.tagName))) return;
    if (drv && this.det && this.det.rs && drv.value.trim() !== (this.det.rs.drive || '')) return;
    return this.open(this.sel, true);
  };
  // The strip above the list: where every ad set and audience on this computer stands.
  AV.drawHealth = function () {
    const box = this.el.querySelector('.rva-hl'); if (!box) return;
    box.hidden = !!this.sel;
    const at = this.at ? 'Updated ' + new Date(this.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Updating…';
    const head = '<div class="rva-sx-h"><b>Overview</b><span class="rva-hl-up">' + at + '<button type="button" class="p-ghost p-sm" data-a="refresh">Refresh</button></span></div>';
    if (this.items === null) { box.dataset.s = 'wait'; box.innerHTML = head + '<p class="rva-sx-w">Reading the ad sets…</p>'; return; }
    const sets = (this.items || []).filter(x => !x.gone), miss = (this.items || []).length - sets.length;
    const all = sets.map(x => ({ x, auds: rsAuds(x.rs || {}) })), done = all.filter(o => rsOverall(o.auds).ready);
    const auds = [].concat(...all.map(o => o.auds.map(a => Object.assign({ set: (o.x.rs || {}).name || 'Ad set' }, a))));
    const projs = sets.reduce((n, x) => n + ((x.rs || {}).items || []).length, 0);
    const at3 = auds.filter(a => a.done).length;
    // each audience sits at its first unfinished step; a finished one counts as Done
    const by = STEP_LABELS.map((l, i) => ({ l, i, n: auds.filter(a => (a.done ? 3 : a.steps.findIndex(s => s.s !== 'done')) === i).length }));
    const tile = (n, l, s) => '<div class="rva-sx-t"><b>' + n + '</b><span>' + l + '</span>' + (s ? '<s>' + s + '</s>' : '') + '</div>';
    const pc = n => auds.length ? (n / auds.length * 100).toFixed(2) + '%' : '0';
    const wait = auds.filter(a => !a.done).sort((a, b) => ((a.now && a.now.label) || '').localeCompare((b.now && b.now.label) || ''));
    const waitTxt = wait.length ? wait.slice(0, 4).map(a => '<li><b>' + esc(a.set) + '</b> · ' + esc(a.label) + ' <s>' + esc(a.now ? a.now.label + ' · ' + a.now.sub : '') + '</s></li>').join('') +
      (wait.length > 4 ? '<li class="rva-sx-more">and ' + (wait.length - 4) + ' more</li>' : '') : '';
    box.dataset.s = 'ok';
    box.innerHTML = head +
      '<div class="rva-sx-ts">' +
        tile(sets.length, sets.length === 1 ? 'Ad set' : 'Ad sets', projs + (projs === 1 ? ' project' : ' projects')) +
        tile(sets.length - done.length, 'In progress', wait.length + (wait.length === 1 ? ' audience waiting' : ' audiences waiting')) +
        tile(done.length, 'Package ready', done.length ? 'ready to run' : 'none yet') +
        tile(at3 + '<i>/' + auds.length + '</i>', 'Audiences done', auds.length ? Math.round(at3 / auds.length * 100) + '% of every audience' : 'no audiences yet') +
      '</div>' +
      (auds.length ? '<div class="rva-sx-bar" role="img" aria-label="' + esc(by.map(b => b.n + ' at ' + b.l).join(', ')) + '">' + by.map(b => b.n ? '<i data-i="' + b.i + '" style="width:' + pc(b.n) + '"></i>' : '').join('') + '</div>' +
        '<ul class="rva-sx-lg">' + by.map(b => '<li data-i="' + b.i + '"><i></i>' + esc(b.l) + ' <b>' + b.n + '</b></li>').join('') + '</ul>' : '') +
      (waitTxt ? '<div class="rva-sx-wt"><span>Waiting on</span><ul>' + waitTxt + '</ul></div>' : '') +
      (miss || this.sign ? '<p class="rva-sx-w">' + [this.sign ? this.sign + ' on Google Drive not counted until you sign in' : '', miss ? miss + ' missing' : ''].filter(Boolean).join(' · ') + '.</p>' : '');
  };
  AV.load = async function (quiet) {
    const ids = Arch.list().map(x => x.id);
    if (!ids.length) this.sign = 0;
    if (!quiet || !this.items) this.items = ids.length ? null : [];
    if (!quiet) this.draw();
    if (!ids.length) { this.at = Date.now(); this.draw(); return; }
    try {
      const out = []; let sign = 0;
      for (let i = 0; i < ids.length; i += 50) { const r = await api('rsinfo', { ids: ids.slice(i, i + 50).join(',') }); out.push(...(r.items || [])); sign += r.sign || 0; }
      this.sign = sign;
      // a review from before ad sets was kept by its project's id: from now on, by its designer link
      out.forEach(x => { if (x.dd && x.dd !== x.id) { Arch.swap(x.id, x.dd); x.id = x.dd; } if (x.rs) Arch.add(x.id, x.rs.name, x.rs.product); });
      const seen = new Set(); this.items = out.filter(x => !seen.has(x.id) && seen.add(x.id)); this.err = ''; this.at = Date.now();
    } catch (e) { if (!quiet || !this.items) this.items = []; this.err = e.message || String(e); }
    if (!this.sel) this.draw();
  };
  AV.open = async function (id, quiet) {
    this.sel = id; if (!quiet) { this.det = null; this.draw(); }
    try { const r = await api('rsinfo', { ids: id, full: '1' }); this.det = (r.items || [])[0] || { id, gone: true }; this.at = Date.now(); }
    catch (e) { if (!quiet) this.det = { id, error: e.message || String(e), auth: !!e.gdAuth }; }
    if (this.sel === id) this.draw();
  };
  AV.click = async function (e) {
    let t = e.target.closest('button,[data-id]'); if (!t || !this.el.contains(t)) return;
    if (t.dataset.copy) { const ok = await copyText(t.dataset.copy), sp = t.querySelector('span') || t, was = sp.textContent; sp.textContent = ok ? 'Copied' : 'Select it'; t.dataset.done = ok ? '1' : ''; setTimeout(() => { sp.textContent = was; t.dataset.done = ''; }, 1600); return; }
    if (t.dataset.id) { this.edit = null; this.open(t.dataset.id); return; }
    const a = t.dataset.a;
    if (a === 'back') { this.sel = null; this.det = null; this.load(); }
    if (a === 'open') window.open(rsLink(this.sel), '_blank', 'noopener');
    if (a === 'proj') window.open(rsLink(t.dataset.sid), '_blank', 'noopener');
    if (a === 'refresh') { this.at = 0; this.refresh(); }
    if (a === 'gsign') {
      t.disabled = true;
      try { await window.providentDrive.signIn(); window.dispatchEvent(new Event('provident-drive-signed')); }
      catch (er) { t.disabled = false; window.alert(er.message || String(er)); }
      return;
    }
    const by = StudioBase.shareName() || 'Designer', again = () => this.open(this.sel);
    if (a === 'relab') { this.edit = t.dataset.sid; this.draw(); }
    if (a === 'relabx') { this.edit = null; this.draw(); }
    if (a === 'relabsave') {
      const f = t.closest('.rva-rl'), v = k => f.querySelector('[data-f="' + k + '"]').value;
      t.disabled = true; t.textContent = 'Saving…';
      try { await api('rsset', { id: this.sel }, { by, relabel: { sid: t.dataset.sid, market: v('market'), aud: v('aud'), lang: v('lang') } }); this.edit = null; again(); }
      catch (er) { t.disabled = false; t.textContent = 'Save'; window.alert(er.message || String(er)); }
    }
    if (a === 'rmproj' && window.confirm('Remove ' + (t.dataset.lab || 'this project') + ' from the ad set? The project itself is not deleted and its own edit link keeps working; it just leaves the ad set and its review.')) {
      try { await api('rsset', { id: this.sel }, { by, remove: t.dataset.sid }); again(); } catch (er) { window.alert(er.message || String(er)); }
    }
    if (a === 'delset' && window.confirm('Delete this whole ad set for everyone? Its three links stop working and its review history goes. The projects themselves stay, each on its own edit link.')) {
      try { await api('rsdel', { id: this.sel }, {}); Arch.drop(this.sel); this.sel = null; this.det = null; this.load(); }
      catch (er) { window.alert(er.message || String(er)); }
    }
    if (a === 'addproj') {
      lsSet(JOIN_KEY, JSON.stringify({ dd: this.sel, pid: t.dataset.pid, at: Date.now() }));
      window.open(location.pathname, '_blank', 'noopener');
      t.textContent = 'Opened in a new tab';
    }
    if (a === 'rm' && window.confirm('Remove this ad set from the list on this computer? The links keep working, and the record stays on the share store — paste the designer’s link to add it back.')) { Arch.drop(this.sel); this.sel = null; this.det = null; this.load(); }
    if (a === 'drive') {
      const v = this.el.querySelector('.rva-drv input').value.trim();
      t.disabled = true;
      try {
        const r = await api('rsset', { id: this.sel }, { drive: v }); if (this.det && this.det.rs) this.det.rs.drive = r.rs.drive;
        this.draw(); t = this.el.querySelector('[data-a="drive"]') || t; t.disabled = true; t.textContent = 'Saved';
      } catch (er) { t.textContent = 'Not saved'; window.alert(er.message || String(er)); }
      setTimeout(() => { t.disabled = false; t.textContent = 'Save'; }, 1600);
    }
  };
  AV.draw = function () {
    const body = this.el.querySelector('.rva-body'), errHtml = this.err ? '<p class="rva-err" role="alert">' + esc(this.err) + '</p>' : '';
    this.el.querySelector('.rva-bar').hidden = !!this.sel;
    this.drawHealth();
    if (this.sel) { body.innerHTML = this.detHtml(); return; }
    if (this.items === null) { body.innerHTML = errHtml + '<p class="rva-wait">Reading the ad sets…</p>'; return; }
    const signHtml = this.sign ? '<div class="rva-sign"><span><b>' + (this.sign === 1 ? 'One ad set is' : this.sign + ' ad sets are') + ' stored on Google Drive.</b><s>Sign in with your Provident Google account to list ' + (this.sign === 1 ? 'it' : 'them') + ' here. Your account needs access to the ad set’s folder.</s></span><button type="button" class="p-btn" data-a="gsign">Sign in with Google</button></div>' : '';
    if (!this.items.length && this.sign) { body.innerHTML = errHtml + signHtml; return; }
    if (!this.items.length) { body.innerHTML = errHtml + '<div class="p-empty2">No ad sets yet. In a project, Share › Ad set review starts one, and it is kept here.</div>'; return; }
    const names = {}; Arch.list().forEach(x => { names[x.id] = x.name; });
    const card = it => {
      if (it.gone) return '<button class="rva-c" data-id="' + esc(it.id) + '" data-gone="1"><span class="rva-th"></span><span class="rva-ct"><span class="rva-n"><b>' + esc(names[it.id] || 'Unknown ad set') + '</b></span><span class="rva-m">' + (isDs(it.id) ? 'Not found in Google Drive, or your account has no access' : 'No record on the share store') + '</span></span></button>';
      const rs = it.rs || {}, auds = rsAuds(rs), all = rsOverall(auds);
      return '<button class="rva-c" data-id="' + esc(it.id) + '"><span class="rva-th">' + (it.thumb ? '<img src="' + esc(it.thumb) + '" alt="">' : '') + '</span>' +
        '<span class="rva-ct"><span class="rva-n"><b>' + esc(rs.name || names[it.id] || 'Ad set') + '</b>' + pillHtml(all.ready) + '</span>' +
        '<span class="rva-mini">' + all.steps.map(x => '<span data-s="' + x.s + '"><i></i>' + esc(x.label) + '</span>').join('') + '</span>' +
        '<span class="rva-m">' + (rs.product ? esc(PRODUCT_NAME[rs.product] || '') + ' · ' : '') + all.done + ' of ' + all.n + ' audiences done · ' + (rs.items || []).length + ' projects · created ' + esc(day(rs.created)) + '</span></span></button>';
    };
    const sorted = this.items.slice().sort((a, b) => ((b.rs || {}).created || 0) - ((a.rs || {}).created || 0));
    const ready = x => rsOverall(rsAuds(x.rs || {})).ready;
    const prog = sorted.filter(x => !x.gone && !ready(x)), done = sorted.filter(x => !x.gone && ready(x)), gone = sorted.filter(x => x.gone);
    const grp = (t, l) => l.length ? '<section class="rva-g"><h3>' + t + ' <s>' + l.length + '</s></h3><div class="rva-grid">' + l.map(card).join('') + '</div></section>' : '';
    body.innerHTML = errHtml + signHtml + grp('In progress', prog) + grp('Package ready', done) + grp('Missing', gone);
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
  AV.detHtml = function () {
    const d = this.det, back = '<button type="button" class="p-ghost rva-back" data-a="back">' + ico('back') + 'All ad sets</button>';
    if (!d) return back + '<p class="rva-wait">Reading the ad set…</p>';
    if (d.auth) return back + '<div class="rva-sign"><span><b>This ad set is stored on Google Drive.</b><s>Sign in with your Provident Google account to open it. Your account needs access to the ad set’s folder.</s></span><button type="button" class="p-btn" data-a="gsign">Sign in with Google</button></div>';
    if (d.error || d.gone) return back + '<p class="rva-err" role="alert">' + esc(d.error || (isDs(d.id) ? 'This ad set’s Ad set.json was not found in Google Drive, or your account has no access to its folder.' : 'This ad set has no record on the share store.')) + '</p><button type="button" class="rva-rm" data-a="rm">' + ico('del') + 'Remove from this list</button>';
    const rs = d.rs || {}, auds = rsAuds(rs), all = rsOverall(auds), name = rs.name || 'Ad set';
    const drv = rs.drive || '', url = /^https?:\/\//.test(drv), proj = d.proj || {}, live = d.live || {};
    const row = (k, v) => '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>';
    const log = (d.log || []).concat((d.plog || []).filter(e => (e.changes || []).some(c => c.kind !== 'note')).map(e => Object.assign({}, e, { changes: (e.changes || []).map(c => Object.assign({}, c, { page: e.page + (c.page ? ' · ' + c.page : '') })) })))
      .sort((a, b) => b.at - a.at);
    const sizes = []; Object.keys(proj).forEach(s => ((proj[s].sum || {}).sizes || []).forEach(z => { if (sizes.indexOf(z) < 0) sizes.push(z); }));
    const next = all.ready ? 'Every audience is done since ' + day(all.at) + '. Performance marketing can download the whole package.'
      : auds.length ? 'Waiting on: ' + auds.filter(a => !a.done).map(a => a.label + ' (' + (a.now ? a.now.sub.toLowerCase() : '') + ')').join(', ') + '.' : 'No projects yet.';
    const links = LINK_ROWS.map(([r, who, what]) => {
      const link = rsLink((rs.tok || {})[r] || '');
      return '<li class="rva-lk"><div class="rva-lk-t"><b>' + who + '</b><s>' + what + '</s><code title="' + esc(link) + '">' + esc(link.replace(/^https?:\/\//, '')) + '</code></div>' +
        '<button type="button" class="p-ghost rva-cp" data-copy="' + esc(link) + '" aria-label="Copy the ' + who.toLowerCase() + ' link">' + ico('copy') + '<span>Copy link</span></button></li>';
    }).join('');
    const audRows = auds.map(a => '<li class="rva-au"><div class="rva-au-h"><b>' + esc(a.label) + '</b>' + pillHtml(a.done, a.done ? 'Done' : a.now ? a.now.label : '') + '</div>' + stepperHtml(a.steps) +
      '<div class="rva-au-p">' + a.items.map(it => {
        const pj = proj[it.sid] || {};
        return '<div class="rva-pjw"><button type="button" class="rva-pj" data-a="proj" data-sid="' + esc(it.sid) + '"' + (live[it.sid] === false ? ' disabled title="This project has expired; the record is kept"' : '') + '><span class="rva-th">' + (pj.thumb ? '<img src="' + esc(pj.thumb) + '" alt="">' : '') + '</span><span><b>' + esc(it.lang || 'ENG') + '</b><s>' + esc((pj.sum || {}).campaign || '') + '</s></span>' + ico('ext') + '</button>' +
          (this.edit === it.sid ? this.relabHtml(it, rs)
            : '<span class="rva-pja"><button type="button" class="p-ghost p-sm" data-a="relab" data-sid="' + esc(it.sid) + '">' + (it.market && it.aud ? 'Change audience' : 'Set its audience') + '</button>' +
              '<button type="button" class="p-ghost p-sm rva-dng" data-a="rmproj" data-sid="' + esc(it.sid) + '" data-lab="' + esc(itemLabel(it)) + '">Remove</button></span>') + '</div>';
      }).join('') + (a.engOnly ? '<span class="rva-m">No Arabic for this audience</span>' : !a.arb ? '<span class="rva-m">No Arabic project yet</span>' : '') + '</div></li>').join('');
    return back +
      '<header class="rva-dh"><span class="rva-th rva-th-l">' + (d.thumb ? '<img src="' + esc(d.thumb) + '" alt="">' : '') + '</span>' +
      '<div class="rva-dt"><span class="rv-k">Ad set review' + (rs.product ? ' · ' + esc(PRODUCT_NAME[rs.product] || '') : '') + '</span><h2>' + esc(name) + '</h2>' +
      '<div class="rva-st">' + pillHtml(all.ready) + '<span>' + (all.ready ? 'Finished ' + esc(day(all.at)) : all.done + ' of ' + all.n + ' audiences done') + ' · created ' + esc(day(rs.created)) + (rs.by ? ' by ' + esc(rs.by) : '') + '</span></div></div>' +
      '<div class="rva-da">' + (url ? '<a class="p-ghost rva-a" href="' + esc(drv) + '" target="_blank" rel="noopener">' + ico('ext') + 'Drive folder</a>' : '') +
      '<button type="button" class="p-btn" data-a="open">' + ico('ext') + 'Open the ad set</button></div></header>' +
      '<div class="rva-cols"><div class="rva-main">' +
      '<section class="rva-card"><h3>Progress</h3>' + stepperHtml(all.steps) + '<p class="rva-next" data-s="' + (all.ready ? 'ready' : 'prog') + '">' + esc(next) + '</p></section>' +
      '<section class="rva-card"><h3>Audiences <s>' + auds.length + '</s></h3><ul class="rva-aus">' + (audRows || '<li class="shl-empty">No projects yet.</li>') + '</ul></section>' +
      this.addHtml(proj) +
      '<section class="rva-card"><h3>Ad set links</h3><p class="rva-sub">One link per team for the whole ad set. Each project’s button above opens it in the full studio.</p><ul class="rva-lks">' + links + '</ul></section>' +
      '<section class="rva-card"><h3>Activity <s>' + log.length + '</s></h3><ol class="shl-list rva-log">' + (log.length ? log.slice(0, 300).map((e, i, l) => logEntryHtml(e, { max: 20, cont: logCont(l[i - 1], e) })).join('')
        : '<li class="shl-empty">Nothing yet.</li>') + '</ol></section>' +
      '</div><aside class="rva-side">' +
      '<section class="rva-card"><h3>Details</h3><dl class="rva-dl">' +
      row('Product', esc(PRODUCT_NAME[rs.product] || '—')) +
      row('Audiences', auds.length + ' · ' + (rs.items || []).length + ' projects') +
      row('Markets', esc([...new Set((rs.items || []).map(x => x.market).filter(Boolean))].join(', ') || '—')) +
      row('Sizes', sizes.length ? '<span class="rva-chips">' + sizes.map(z => '<span>' + esc(z) + '</span>').join('') + '</span>' : '—') +
      '</dl></section>' +
      '<section class="rva-card"><h3>Google Drive</h3><p class="rva-sub">Where this ad set’s files are kept, for everyone who opens this list.</p>' +
      '<label class="rva-drv"><span class="rva-vh">Google Drive location</span><input class="p-in" value="' + esc(drv) + '" placeholder="Drive folder link or path"><button type="button" class="p-ghost" data-a="drive">Save</button></label></section>' +
      '<button type="button" class="rva-rm" data-a="rm">' + ico('del') + 'Remove from this list</button>' +
      '<button type="button" class="rva-rm rva-dng" data-a="delset">' + ico('del') + 'Delete this ad set for everyone</button>' +
      '</aside></div>';
  };
  // a project's market, audience and language, edited in place
  AV.relabHtml = function (it, rs) {
    const opt = (v, l, on) => '<option value="' + esc(v) + '"' + (on ? ' selected' : '') + '>' + esc(l) + '</option>';
    const auds = AUDS[rs.product] || ['Family', 'Investor', 'Hybrid'];
    return '<span class="rva-rl" data-sid="' + esc(it.sid) + '">' +
      '<select class="p-in" data-f="market" aria-label="Market">' + MARKETS.map(m => opt(m, m, m === (it.market || MARKETS[0]))).join('') + '</select>' +
      '<select class="p-in" data-f="aud" aria-label="Audience">' + auds.map(a => opt(a, a, a === it.aud)).join('') + '</select>' +
      '<select class="p-in" data-f="lang" aria-label="Language">' + opt('ENG', 'English', it.lang !== 'ARB') + opt('ARB', 'Arabic', it.lang === 'ARB') + '</select>' +
      '<button type="button" class="p-btn p-sm" data-a="relabsave" data-sid="' + esc(it.sid) + '">Save</button><button type="button" class="p-ghost p-sm" data-a="relabx">Cancel</button></span>';
  };
  // Add a project: this computer's saved Campaign projects that are not in the ad set yet. The
  // one picked opens in a new tab, which asks for its market, audience and language.
  AV.addHtml = function (proj) {
    const have = new Set(Object.keys(proj || {}).map(k => ((proj[k] || {}).sum || {}).pid).filter(Boolean));
    let rec = [];
    try { rec = (this.eng && this.eng.savedRecents ? this.eng.savedRecents() : []).filter(r => r && r.pid && !have.has(r.pid)); } catch (e) {}
    const when = t => t ? new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
    return '<section class="rva-card"><h3>Add a project</h3><p class="rva-sub">Another audience, market or the Arabic version — from the projects saved on this computer. It opens in a new tab, where you choose its market, audience and language.</p>' +
      (rec.length ? '<ul class="rva-addl">' + rec.slice(0, 12).map(r => '<li><span class="rva-th">' + (r.thumbs && r.thumbs[0] ? '<img src="' + esc(r.thumbs[0]) + '" alt="">' : '') + '</span>' +
        '<span class="rva-addn"><b>' + esc(r.name || 'Untitled') + '</b><s>Saved ' + esc(when(r.ts)) + '</s></span>' +
        '<button type="button" class="p-ghost p-sm" data-a="addproj" data-pid="' + esc(r.pid) + '">Add to this ad set</button></li>').join('') + '</ul>'
        : '<p class="rva-m">No other saved Campaign projects on this computer. Save the project first — or open it and use Share › Ad set review.</p>') +
      '</section>';
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
        const say = () => dlg.busy('Uploading · ' + k + ' of ' + jobs.length + (sent ? ' · ' + (sent / 1048576).toFixed(1) + ' MB' : '') + '…', jobs.length ? k / jobs.length : undefined);
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
      ssSet(AS_KEY, { id, pid: (shell.eng && shell.eng.state && shell.eng.state.pid) || '' });
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
      busy: (t, pr) => { $('.shl-st').textContent = t; stBar(el, pr); go.disabled = true; inp.disabled = true; },
      ready: r => { stBar(el, null); if (r.title) $('h2').textContent = r.title; $('.shl-lead').innerHTML = r.lead; $('.shl-note').textContent = r.note || ''; $('.shl-st').textContent = ''; go.disabled = false; inp.disabled = false; setTimeout(() => inp.focus(), 30); },
      fail: (t, btn) => { stBar(el, null); $('.shl-st').textContent = t; $('.shl-st').classList.add('bad'); go.textContent = btn || 'Close'; go.disabled = false; go.onclick = () => close(''); x.hidden = true; },
      done: (link, copied) => {
        stBar(el, null);
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
        '<section class="rv" hidden><div class="rv-main"></div><details class="rv-dd" hidden><summary>Ad set links and Drive location</summary><div class="rv-lks"></div>' +
          '<label class="rv-drv"><span>Google Drive location</span><span class="rv-drv-r"><input class="p-in" placeholder="Paste the project’s Drive folder link or path"><button type="button" class="p-ghost" data-drv="1">Save</button></span></label></details></section>' +
        '<div class="shl-share"><input class="p-in" readonly aria-label="Edit link"><button class="p-ghost" type="button">' + svg(ICON.link) + 'Copy</button></div>' +
        '<div class="shl-ph" hidden><p></p><button class="p-ghost" type="button">Restore from a saved file…</button></div>' +
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
      if (b.dataset.next && eng.rsNext) eng.rsNext(b.dataset.next);
      if (b.dataset.copy) { const ok = await copyText(b.dataset.copy); b.textContent = ok ? 'Copied' : 'Select it'; setTimeout(() => { b.textContent = 'Copy'; }, 1600); }
      if (b.dataset.ntf && window.Notification) { try { await Notification.requestPermission(); } catch (er) {} if (eng.rvRender) eng.rvRender(); else if (eng.panelRender) eng.panelRender(true); }
      if (b.dataset.drv && eng.rvDrive) eng.rvDrive(root.querySelector('.rv-drv input').value.trim());
    });
    $('.shl-close').onclick = () => eng.shPanel(false);
    $('.shl-ph button').onclick = () => { if (eng.shRestoreFile) eng.shRestoreFile(); };
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
        const ph = $('.shl-ph'), pn = Math.max(v.pv || 0, v.gone || 0);
        ph.hidden = !pn;
        if (pn) ph.querySelector('p').innerHTML = '<b>' + pn + ' full-size photo' + (pn > 1 ? 's have' : ' has') + ' expired.</b> '
          + ((v.pv || 0) ? 'The canvas shows ' + (pn > 1 ? 'previews' : 'a preview') + '. ' : '')
          + 'Photos are kept 60 days after the link was last opened. Pick the project’s saved .json (in its Source folder) to put them back for everyone.';
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
        $('.shl-list').innerHTML = v.log.length ? v.log.map((e, i, l) => logEntryHtml(e, { mine: e.by === v.me, cont: logCont(l[i - 1], e) })).join('') : '<li class="shl-empty">No changes yet. Edits made by anyone on the link show up here.</li>';
      }
    };
    return ui;
  }
  // ONE renderer for an activity entry, read by the Changes panel and the ad set page. Lines are
  // grouped under the place they happened (the page or audience, named once instead of on every
  // line); a field edit is the field's name over its old and new words; a step is a marked line;
  // design, photo and housekeeping notes are italic footnotes, because they say THAT something
  // changed rather than what it says now.
  const logCont = (prev, e) => !!prev && prev.by === e.by && Math.abs(prev.at - e.at) < 6 * 3600e3;
  function logEntryHtml(e, opt) {
    opt = opt || {};
    const max = opt.max || 12, all = e.changes || [], ch = all.slice(0, max);
    const groups = [];
    ch.forEach(c => {
      let page = String(c.page || ''), label = String(c.label || '');
      if (page && (label === page || label.indexOf(page + ' · ') === 0)) label = label.slice(page.length).replace(/^ · /, '');
      let parts = label ? label.split(' · ') : [];
      if (c.kind === 'design' && !label && page) { parts = page.split(' · '); page = ''; }   // the variant is the subject, its project the place
      const field = parts.length ? parts.pop() : '';
      const where = [page].concat(parts).filter(Boolean).join(' · ');
      let g = groups[groups.length - 1];
      if (!g || g.where !== where) groups.push(g = { where, items: [] });
      g.items.push({ c, field });
    });
    const item = ({ c, field }) => {
      if (c.kind === 'step') {
        const back = /back|reopen|in progress/i.test(c.text || '');
        return '<li class="lg-s" data-back="' + (back ? '1' : '') + '"><i aria-hidden="true"></i>' + esc(c.text || '') + '</li>';
      }
      if (c.kind === 'changed' || c.kind === 'added' || c.kind === 'removed') {
        const verb = c.kind === 'changed' ? 'edited' : c.kind === 'added' ? 'added' : 'cleared';
        return '<li class="lg-c"><span class="lg-f">' + esc(field || 'Text') + ' <em>' + verb + '</em></span><span class="lg-v">' +
          (c.was ? '<del>' + esc(clip(c.was, 120)) + '</del>' : '') + (c.now ? '<ins>' + esc(clip(c.now, 120)) + '</ins>' : '') + '</span></li>';
      }
      const what = c.kind === 'photo' ? (field || 'Photo') + ' ' + String(c.text || 'changed').toLowerCase()
        : c.kind === 'design' ? (field ? field + ' · design changed' : (c.text || 'Changed the design')) : (c.text || 'Changed');
      return '<li class="lg-n">' + esc(what) + '</li>';
    };
    const who = esc(e.by || 'Someone');
    return '<li class="lg"' + (opt.cont ? ' data-cont="1"' : '') + '><div class="lg-h"><span class="shl-av">' + esc((e.by || '?').trim().charAt(0).toUpperCase()) + '</span>' +
      '<span class="lg-who">' + who + (opt.mine ? '<s> · you</s>' : '') + '</span><time>' + esc(ago(e.at)) + '</time></div>' +
      groups.map(g => '<div class="lg-g">' + (g.where ? '<div class="lg-p">' + esc(g.where) + '</div>' : '') + '<ul>' + g.items.map(item).join('') + '</ul></div>').join('') +
      (all.length > max ? '<p class="lg-more">and ' + (all.length - max) + ' more</p>' : '') + '</li>';
  }
  function line(c, plain) {
    const where = [c.page, c.label].filter(Boolean).join(' · ');
    if (c.kind === 'step' && !plain) return (c.page ? '<b>' + esc(c.page) + '</b> ' : '') + '<span class="shl-step">' + esc(c.text || '') + '</span>';
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
html.rv-pm .shl-pill,html.rv-pm .shl-panel{display:none!important}
.rva-pjw{display:flex;flex-direction:column;gap:6px;min-width:0}
.rva-pja{display:flex;gap:6px;flex-wrap:wrap}
.rva-dng{color:var(--ps-bad)!important}
.rva-rl{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.rva-rl .p-in{height:32px;width:auto;min-width:0;flex:1 1 90px;font-size:13px;padding:0 8px}
.rva-addl{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}
.rva-addl li{display:flex;align-items:center;gap:12px;padding:8px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--ps-hair)}
.rva-addl .rva-th{width:44px;height:44px;flex:none}
.rva-addn{flex:1;min-width:0;display:flex;flex-direction:column}
.rva-addn b{font:500 14px/1.3 var(--ps-font);color:var(--ps-ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rva-addn s{text-decoration:none;font:400 12.5px/1.3 var(--ps-font);color:var(--ps-ink-2)}
.shl-ph{margin:12px 16px 0;padding:12px 14px;border-radius:12px;background:var(--ps-fill);box-shadow:inset 0 0 0 1px var(--ps-hair)}
.shl-ph p{margin:0 0 10px;font:400 12.5px/1.45 var(--ps-font);color:var(--ps-ink-2)}
.shl-ph p b{font-weight:600;color:var(--ps-ink)}
.shl-ph button{white-space:nowrap}
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
.ds-sign{position:fixed;left:16px;bottom:16px;z-index:240;display:flex;align-items:center;gap:12px;max-width:min(560px,calc(100% - 32px));box-sizing:border-box;padding:12px 12px 12px 16px;border-radius:16px;background:var(--ps-card);color:var(--ps-ink);box-shadow:0 0 0 1px var(--ps-line);font:400 13px/1.45 var(--ps-font)}
.ds-sign .p-btn{flex:0 0 auto;white-space:nowrap}
.rsd-hint{display:block;margin-top:6px;color:var(--ps-ink-2);font:italic 400 12px/1.45 var(--ps-font)}
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
.shl-pg{position:relative;height:6px;margin:8px 0 0;border-radius:9999px;background:var(--ps-fill);overflow:hidden}
.shl-pg i{position:absolute;inset:0 auto 0 0;overflow:hidden;width:4%;border-radius:inherit;background:var(--ps-link);transition:width .4s var(--ps-ease,ease)}
.shl-pg[data-run] i{width:30%;animation:shl-pg 1.2s ease-in-out infinite}
.shl-pg:not([data-run]) i::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent);transform:translateX(-100%);animation:shl-sh 1.4s ease-in-out infinite}
@keyframes shl-sh{to{transform:translateX(100%)}}
@keyframes shl-pg{from{left:-30%}to{left:100%}}
@media (prefers-reduced-motion:reduce){.shl-pg i{transition:none}.shl-pg i::after{display:none}.shl-pg[data-run] i{animation:none;width:100%;opacity:.45}}
.shl-link{display:flex;gap:8px;margin-top:4px}
.shl-link .p-in{font-size:13px;color:var(--ps-ink-2)}
.shl-link .p-ghost{flex:none;height:42px}
.shl-acts{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}
.shl-acts button[hidden]{display:none}
@media (max-width:760px){.shl-panel{width:100vw;top:92px}.shl.open .shl-toast{right:16px}}
@media (prefers-reduced-motion:reduce){.shl-toast{transition:none}}
/* ---- REVIEWS: the stepper, the review panel section, the roles' locks, performance
   marketing's header and the designer's archive. ---- */
.rv-st{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr))}
.rv-st li{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:0 6px;text-align:center;min-width:0}
.rv-st li+li::before{content:'';position:absolute;top:8px;right:calc(50% + 15px);left:calc(-50% + 15px);border-top:2px dashed var(--ps-line)}
.rv-st li[data-s="done"]+li::before{border-top-style:solid;border-top-color:var(--ps-link)}
.rv-dot{flex:none;width:18px;height:18px;margin-bottom:6px;box-sizing:border-box;border-radius:50%;display:grid;place-items:center;background:var(--ps-card);box-shadow:inset 0 0 0 2px var(--ps-line)}
.rv-st [data-s="done"] .rv-dot{background:var(--ps-link);box-shadow:0 0 0 4px color-mix(in srgb,var(--ps-link) 18%,transparent)}
.rv-dot svg{width:12px;height:12px;fill:var(--ps-card)}
.rv-st [data-s="cur"] .rv-dot{box-shadow:inset 0 0 0 2px var(--ps-link),0 0 0 4px color-mix(in srgb,var(--ps-link) 14%,transparent)}
.rv-st b{font:600 13.5px/1.3 var(--ps-font);color:var(--ps-ink)}
.rv-st [data-s="pend"] b{color:var(--ps-ink-2)}
.rv-st s{text-decoration:none;font:400 12px/1.35 var(--ps-font);color:var(--ps-dim)}
.rv-st-c{grid-template-columns:1fr;gap:0}
.rv-st-c li{display:grid;grid-template-columns:18px minmax(0,1fr);column-gap:10px;align-items:start;padding:0 0 12px;text-align:left}
.rv-st-c li:last-child{padding-bottom:0}
.rv-st-c li+li::before{display:none}
.rv-st-c li:not(:last-child)::after{content:'';position:absolute;left:8px;top:22px;bottom:2px;border-left:2px dashed var(--ps-line)}
.rv-st-c li[data-s="done"]:not(:last-child)::after{border-left-style:solid;border-left-color:var(--ps-link)}
.rv-st-c .rv-dot{grid-row:span 2;margin:0}
.rv-st-c b{font-size:12.5px}.rv-st-c s{font-size:11.5px}
.rv-pill{flex:none;display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:9999px;background:var(--ps-fill);color:var(--ps-ink-2);font:600 12px/1 var(--ps-font);white-space:nowrap}
.rv-pill::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--ps-dim)}
.rv-pill[data-s="ready"]{background:var(--ps-good-q);color:var(--ps-good)}
.rv-pill[data-s="ready"]::before{background:var(--ps-good)}
.rv{display:flex;flex-direction:column;gap:12px;padding:2px 16px 16px;box-shadow:inset 0 -1px 0 var(--ps-hair)}
.rv[hidden],.rv-dd[hidden]{display:none}
.rv-main{display:flex;flex-direction:column;gap:14px}
.shl-other{margin-right:auto;padding:0;border:none;background:none;color:var(--ps-ink-2);font:500 13px/1 var(--ps-font);cursor:pointer;text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--ps-line)}
.shl-other:hover{color:var(--ps-ink)}
.rv-todo{display:flex;flex-direction:column;gap:8px;padding:14px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--ps-line)}
.rv-todo p{margin:0;font:400 12.5px/1.5 var(--ps-font);color:var(--ps-ink-2)}
.rv-todo ul{list-style:none;margin:2px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}
.rv-todo li{display:flex;align-items:center;justify-content:space-between;gap:10px}
.rv-todo li>span{display:flex;flex-direction:column;min-width:0}
.rv-todo li b{font:500 13px/1.35 var(--ps-font);color:var(--ps-ink)}
.rv-todo li s{text-decoration:none;font:400 12px/1.35 var(--ps-font);color:var(--ps-dim)}
.rv-todo li .p-ghost{height:30px;padding:0 12px;font-size:12.5px;white-space:nowrap;flex:none}
/* the home page's campaign setup — hierarchy: figure + title, three fields, the plan as tiles */
.rsp{display:flex;flex-direction:column;margin:0 0 40px;border-radius:16px;background:var(--ps-card);box-shadow:inset 0 0 0 1px var(--ps-line);font-family:var(--ps-font);color:var(--ps-ink);max-width:1240px;overflow:hidden}
.rsp-h{display:flex;align-items:center;gap:28px;padding:24px 28px;background:var(--ps-card-h);border-bottom:1px solid var(--ps-hair)}
.rsp-fig{flex:none;display:block;width:150px;aspect-ratio:400/320;
  --hairline-plate:var(--ps-fill);--hairline-hi:var(--ps-ink);--hairline-edge:var(--ps-ink-2);--hairline-mid:var(--ps-ink-2);--hairline-lo:var(--ps-dim);--hairline-stroke:1}
.rsp:hover .rsp-fig{--hairline-hi:var(--ps-link)}
.rsp-fig svg{display:block;width:100%;height:100%}
.rsp-ht{min-width:0}
.rsp-k{display:block;font:500 12px/1.3 var(--ps-font);color:var(--ps-dim)}
.rsp-h h2{margin:4px 0 6px;font:500 26px/1.15 var(--ps-font);letter-spacing:-.015em;color:var(--ps-ink)}
.rsp-h p{margin:0;font:400 14px/1.45 var(--ps-font);color:var(--ps-ink-2)}
.rsp-body{display:flex;flex-direction:column;gap:24px;padding:24px 28px}
.rsp-q{display:grid;grid-template-columns:minmax(200px,1.2fr) auto minmax(200px,1.2fr);gap:16px;align-items:end}
.rsp-f{display:flex;flex-direction:column;gap:8px;min-width:0}
.rsp-f>span,.rsp-ph b,.rsp-g>span{font:500 13px/1.2 var(--ps-font);color:var(--ps-ink-2)}
.rsp-f .p-in{width:100%;box-sizing:border-box;height:42px;font-size:15px}
.rsp-prod{display:flex;height:42px;box-sizing:border-box}
.rsp-prod button{white-space:nowrap;padding:0 16px}
.rsp-plan{display:flex;flex-direction:column;gap:12px}
.rsp-ph{display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px}
.rsp-ph b,.rsp-n,.rsp-mt{white-space:nowrap}
.rsp-n{font:400 13px/1.2 var(--ps-font);color:var(--ps-dim)}
.rsp-mt{display:inline-flex;align-items:center;gap:6px;height:32px;margin-left:auto;padding:0 8px 0 10px;border:none;border-radius:9999px;background:none;color:var(--ps-ink);font:500 13px/1 var(--ps-font);cursor:pointer}
.rsp-mt:hover{background:var(--ps-fill)}
.rsp-mt svg{width:18px;height:18px;fill:currentColor;flex:none}
.rsp-mt svg:last-child{transition:transform var(--ps-motion,.15s) var(--ps-ease,ease)}
.rsp-mt[aria-expanded="true"] svg:last-child{transform:rotate(180deg)}
.rsp-more{display:flex;flex-wrap:wrap;gap:16px 32px;padding:16px;border-radius:12px;background:var(--ps-fill)}
.rsp-more[hidden]{display:none}
.rsp-g{display:flex;flex-direction:column;gap:8px}
.rsp-tg{display:flex;gap:8px;flex-wrap:wrap}
.rsp-t{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px;border:none;border-radius:9999px;background:var(--ps-card);box-shadow:inset 0 0 0 1px var(--ps-line);color:var(--ps-ink-2);font:500 13px/1 var(--ps-font);cursor:pointer}
.rsp-t:hover{color:var(--ps-ink)}
.rsp-t[aria-pressed="true"]{background:var(--ps-accent);color:var(--ps-accent-i);box-shadow:none;padding-left:10px}
.rsp-t svg{width:16px;height:16px;fill:currentColor}
.rsp-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(176px,1fr));gap:10px}
.rsp-tile{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 14px 14px 16px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--ps-line)}
.rsp-tt{display:flex;flex-direction:column;gap:3px;min-width:0}
.rsp-tt s{text-decoration:none;font:400 12px/1.2 var(--ps-font);color:var(--ps-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rsp-tt b{font:500 16px/1.2 var(--ps-font);color:var(--ps-ink)}
.rsp-lg{display:flex;gap:4px;flex:none}
.rsp-l{display:inline-grid;place-items:center;width:32px;height:26px;padding:0;border:none;border-radius:7px;background:var(--ps-fill);color:var(--ps-ink-2);font:600 11px/1 var(--ps-font);letter-spacing:.04em}
.rsp-ar{background:none;box-shadow:inset 0 0 0 1px var(--ps-line);color:var(--ps-dim);cursor:pointer}
.rsp-ar:hover{color:var(--ps-ink);box-shadow:inset 0 0 0 1px var(--ps-ink-2)}
/* AR on is a MARK, so it takes the link ink: the resting navy tint all but vanishes on a dark card */
.rsp-ar[aria-pressed="true"]{background:var(--ps-link);color:var(--ps-app);box-shadow:none}
.rsp-ft{display:flex;align-items:center;gap:16px;padding:16px 28px;border-top:1px solid var(--ps-hair)}
.rsp-st{flex:1;margin:0;font:400 13px/1.4 var(--ps-font);color:var(--ps-ink-2);min-width:0}
.rsp-st.bad{color:var(--ps-bad)}
.rsp-blank{height:42px;padding:0 6px;border:none;background:none;color:var(--ps-ink-2);font:500 14px/1 var(--ps-font);cursor:pointer;text-decoration:underline;text-decoration-color:var(--ps-line);text-underline-offset:4px}
.rsp-blank:hover{color:var(--ps-ink);text-decoration-color:currentColor}
.rsp-go{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 18px 0 22px;white-space:nowrap}
.rsp-go svg{width:18px;height:18px;fill:currentColor}
.rsp button:focus-visible{outline:2px solid var(--ps-ink);outline-offset:2px}
@media (max-width:900px){.rsp-q{grid-template-columns:1fr 1fr}.rsp-q .rsp-f:first-child{grid-column:1/-1}}
@media (max-width:600px){.rsp-h{padding:20px;gap:18px}.rsp-fig{width:96px}.rsp-h h2{font-size:21px}.rsp-body{padding:20px}.rsp-q{grid-template-columns:1fr}.rsp-ft{padding:14px 20px;flex-wrap:wrap}.rsp-st{flex-basis:100%;order:3}.rsp-go{flex:1;justify-content:center}.rsp-tiles{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){.rsp-mt svg:last-child{transition:none}}
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
html.rv-pm .as-dl{display:none!important}
html.rs-on .as-srcgrp>.p-ghost:not(.as-ico),html.rs-on .as-share,html.rs-on .as-bar-sep{display:none!important}
html.rs-on .shl-pill{z-index:210}html.rs-on .shl-panel{z-index:211;top:0}html.rs-on .shl-toast{z-index:212}
.rvh{position:fixed;top:0;left:0;right:0;z-index:205;background:var(--ps-card);color:var(--ps-ink);box-shadow:inset 0 -1px 0 var(--ps-line);font-family:var(--ps-font)}
.rvh-in{padding:12px 24px;display:flex;align-items:center;gap:16px 32px}

.rvh-t{flex:0 1 auto;display:flex;flex-direction:column;gap:2px;min-width:0;max-width:340px}
.rvh-k{font:500 12px/1.3 var(--ps-font);color:var(--ps-dim)}
.rvh-t b{overflow:hidden;font:600 17px/1.25 var(--ps-font);letter-spacing:-.01em;white-space:nowrap;text-overflow:ellipsis}
.rvh-d{display:flex;gap:24px;margin:0}
.rvh-d div{display:flex;flex-direction:column;gap:2px}
.rvh-d dt{font:500 12px/1.3 var(--ps-font);color:var(--ps-dim)}
.rvh-d dd{margin:0;font:600 14px/1.3 var(--ps-font);white-space:nowrap}
.rvh-d dd s{text-decoration:none;font-weight:400;color:var(--ps-ink-2)}
.rvh-dl{height:36px}
.rvh-note{margin:0;font:400 12.5px/1.45 var(--ps-font);color:var(--ps-ink-2)}
.rvh-note button{border:none;background:none;padding:0;color:var(--ps-link);font:inherit;text-decoration:underline;cursor:pointer}
@media (min-width:761px){html.rs-on.shl-open .as-ov,html.rv-pm.shl-open .rvh{right:340px}}
.rvh-st{flex:1 1 auto;min-width:0;list-style:none;margin:0;padding:0;display:flex;align-items:center}
.rvh-st li{flex:1 1 0;min-width:0;display:flex;align-items:center;gap:8px}
.rvh-st li:last-child{flex:0 0 auto}
.rvh-st li:not(:last-child)::after{content:'';flex:1;min-width:16px;margin:0 6px 0 4px;border-top:2px dashed var(--ps-line)}
.rvh-st li[data-s="done"]:not(:last-child)::after{border-top-style:solid;border-top-color:var(--ps-link)}
.rvh-st i{flex:none;width:16px;height:16px;box-sizing:border-box;border-radius:50%;display:grid;place-items:center;background:var(--ps-card);box-shadow:inset 0 0 0 2px var(--ps-line)}
.rvh-st [data-s="done"] i{background:var(--ps-link);box-shadow:none}
.rvh-st [data-s="cur"] i{box-shadow:inset 0 0 0 2px var(--ps-link),0 0 0 3px color-mix(in srgb,var(--ps-link) 16%,transparent)}
.rvh-st i svg{width:11px;height:11px;fill:var(--ps-card)}
.rvh-st b{flex:none;font:500 13px/1.3 var(--ps-font);color:var(--ps-ink-2);white-space:nowrap}
.rvh-st [data-s="cur"] b{font-weight:600;color:var(--ps-ink)}
.rvh-a{flex:none;display:flex;gap:8px}
.rvh-a button,.rvh-df button{height:36px;white-space:nowrap}
.rvh-dlg{width:min(720px,calc(100vw - 32px));max-height:calc(100vh - 64px);padding:0;border:none;border-radius:16px;background:var(--ps-card);color:var(--ps-ink);box-shadow:0 0 0 1px var(--ps-line);font-family:var(--ps-font)}
.rvh-dlg[open]{display:flex;flex-direction:column}
.rvh-dlg::backdrop{background:rgba(0,0,0,.45)}
.rvh-dh{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 20px 0 24px}
.rvh-dh h2{margin:2px 0 0;font:600 20px/1.25 var(--ps-font);letter-spacing:-.01em;overflow-wrap:anywhere}
.rvh-x{flex:none;width:36px;height:36px;padding:0;font-size:20px;line-height:1}
.rvh-db{flex:1;overflow:auto;padding:16px 24px 8px;display:flex;flex-direction:column;gap:28px}
.rvh-dm{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;font:400 13px/1.3 var(--ps-font);color:var(--ps-ink-2)}
.rvh-db h3{margin:0 0 16px;font:600 15px/1.3 var(--ps-font)}
.rvh-db h3 s{margin-left:4px;text-decoration:none;font-weight:400;color:var(--ps-dim)}
.rvh-al{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
.rvh-al>li{padding:16px;border-radius:12px;background:var(--ps-fill)}
.rvh-al>li[data-s="done"]{background:var(--ps-good-q)}
.rvh-ah{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
.rvh-ah b{font:600 14px/1.3 var(--ps-font)}
.rvh-ah button{height:32px}
.rvh-now{font:500 12px/1.3 var(--ps-font);color:var(--ps-ink-2)}
.rvh-al .rv-dot{background:var(--ps-fill)}
.rvh-none{margin:0;font:400 13px/1.5 var(--ps-font);color:var(--ps-dim)}
.rvh-df{display:flex;justify-content:flex-end;padding:16px 24px 20px;box-shadow:inset 0 1px 0 var(--ps-hair)}
@media (max-width:1000px){.rvh-st li{flex:1 1 auto}.rvh-st b{display:none}.rvh-st [data-s="cur"] b{display:block}}
@media (max-width:760px){.rvh-in{flex-wrap:wrap;padding:12px 16px}.rvh-t{flex:1 1 100%;max-width:none}.rvh-st{flex:1 1 100%;order:3}.rvh-a{flex:1 1 100%}.rvh-a button{flex:1}}
/* the ad set review in the panel */
.rs-cur{display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:10px;background:var(--ps-fill)}
.rs-cur b{font:600 14px/1.3 var(--ps-font);color:var(--ps-ink)}
.rs-auds{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.rs-a{display:flex;flex-direction:column;gap:6px;padding:12px 0;box-shadow:inset 0 -1px 0 var(--ps-hair)}
.rs-a:first-child{padding-top:0}.rs-a:last-child{padding-bottom:0;box-shadow:none}
.rs-a.rs-on .rs-ah b{color:var(--ps-link)}
.rs-ah{display:flex;align-items:center;justify-content:space-between;gap:8px}
.rs-ah b{font:600 13.5px/1.3 var(--ps-font);color:var(--ps-ink);overflow-wrap:anywhere}
.rs-mini{display:flex;align-items:center;gap:4px}
.rs-mini i{width:22px;height:4px;border-radius:2px;background:var(--ps-line)}
.rs-mini i[data-s="done"]{background:var(--ps-link)}
.rs-mini i[data-s="cur"]{background:color-mix(in srgb,var(--ps-link) 45%,var(--ps-line))}
.rs-mini s{margin-left:6px;text-decoration:none;font:400 12px/1.35 var(--ps-font);color:var(--ps-dim);min-width:0}
.rs-its{display:flex;flex-direction:column;gap:6px}
.rs-it{display:flex;align-items:center;flex-wrap:wrap;gap:6px}
.rs-it>span{flex:none;width:34px;font:600 11.5px/1 var(--ps-font);color:var(--ps-ink-2)}
.rs-it button,.rs-it a{height:30px;padding:0 12px;font-size:12.5px;text-decoration:none;display:inline-flex;align-items:center}
.rs-wait{text-decoration:none;font:400 12px/1.35 var(--ps-font);color:var(--ps-dim)}
.rs-eo{display:flex;align-items:center;gap:6px;font:400 12px/1.35 var(--ps-font);color:var(--ps-ink-2)}
.rvh-auds{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.rvh-auds li{display:flex;align-items:center;gap:10px;padding:6px 6px 6px 12px;border-radius:10px;background:var(--ps-fill)}
.rvh-auds li[data-s="done"]{background:var(--ps-good-q)}
.rvh-auds b{font:600 13px/1.3 var(--ps-font);color:var(--ps-ink)}
.rvh-auds s{text-decoration:none;font:400 12px/1.3 var(--ps-font);color:var(--ps-ink-2)}
.rvh-auds button{height:30px;padding:0 12px;font-size:12.5px}
.rvh-auds li:not([data-s="done"]){padding-right:12px}
.rsd{display:flex;flex-direction:column;gap:12px}
.rsd[hidden],.rsd-new[hidden],.rsd-add[hidden]{display:none}
.rsd-new{display:flex;flex-direction:column;gap:12px}
.rsd-mode{display:flex}.rsd-mode button{flex:1}
.rsd-prod{display:flex;width:100%}.rsd-prod button{flex:1}
.rsd-cap{margin:4px 0 -4px;font:600 13px/1.3 var(--ps-font);color:var(--ps-ink)}
.rsd-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.rsd select.p-in{height:36px}
.rva-aus{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.rva-au{display:flex;flex-direction:column;gap:14px;padding:18px 0;box-shadow:inset 0 -1px 0 var(--ps-hair)}
.rva-au:first-child{padding-top:0}.rva-au:last-child{padding-bottom:0;box-shadow:none}
.rva-au-h{display:flex;align-items:center;justify-content:space-between;gap:10px}
.rva-au-h b{font:600 14.5px/1.3 var(--ps-font)}
.rva-au-p{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.rva-pj{display:inline-flex;align-items:center;gap:10px;padding:6px 10px 6px 6px;border:none;border-radius:12px;background:var(--ps-fill);color:var(--ps-ink);font:inherit;text-align:left;cursor:pointer}
.rva-pj:hover{box-shadow:0 0 0 2px var(--ps-link)}
.rva-pj:disabled{opacity:.5;cursor:default;box-shadow:none}
.rva-pj .rva-th{width:40px;height:40px;border-radius:8px}
.rva-pj>span:nth-child(2){display:flex;flex-direction:column;gap:1px;min-width:0}
.rva-pj b{font:600 12.5px/1.3 var(--ps-font)}.rva-pj s{max-width:160px;overflow:hidden;text-decoration:none;font:400 12px/1.3 var(--ps-font);color:var(--ps-ink-2);white-space:nowrap;text-overflow:ellipsis}
.rva-pj .rva-i{width:16px;height:16px;color:var(--ps-dim)}
/* the designer's archive */
.rva{max-width:1240px;margin-inline:auto;display:flex;flex-direction:column;gap:20px;font-family:var(--ps-font);color:var(--ps-ink)}
.rva-bar{display:flex;flex-wrap:wrap;align-items:center;gap:12px 24px}
.rva-bar[hidden]{display:none}
.rva-hl{display:flex;flex-direction:column;gap:14px;padding:18px 20px;border-radius:16px;background:var(--ps-card);box-shadow:inset 0 0 0 1px var(--ps-hair)}
.rva-hl[hidden]{display:none}
.rva-sx-h{display:flex;align-items:center;justify-content:space-between;gap:12px}
.rva-sx-h>b{font:500 14px/1.3 var(--ps-font);color:var(--ps-ink)}
.rva-sx-ts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.rva-sx-t{display:flex;flex-direction:column;gap:2px;padding:12px 14px;border-radius:12px;background:var(--ps-fill)}
.rva-sx-t b{font:400 28px/1.1 var(--ps-font);color:var(--ps-ink);font-variant-numeric:tabular-nums}
.rva-sx-t b i{font-style:normal;font-size:16px;color:var(--ps-dim)}
.rva-sx-t span{font:500 13px/1.3 var(--ps-font);color:var(--ps-ink)}
.rva-sx-t s{text-decoration:none;font:400 12px/1.4 var(--ps-font);color:var(--ps-ink-2)}
.rva-sx-bar{display:flex;gap:2px;height:8px;border-radius:9999px;overflow:hidden;background:var(--ps-fill)}
.rva-sx-bar i{display:block;height:100%}
.rva-sx-bar i[data-i="0"],.rva-sx-lg li[data-i="0"] i{background:var(--ps-dim)}
.rva-sx-bar i[data-i="1"],.rva-sx-lg li[data-i="1"] i{background:var(--ps-warn)}
.rva-sx-bar i[data-i="2"],.rva-sx-lg li[data-i="2"] i{background:var(--ps-link)}
.rva-sx-bar i[data-i="3"],.rva-sx-lg li[data-i="3"] i{background:var(--ps-good)}
.rva-sx-lg{display:flex;flex-wrap:wrap;gap:6px 18px;margin:-6px 0 0;padding:0;list-style:none;font:400 12.5px/1.4 var(--ps-font);color:var(--ps-ink-2)}
.rva-sx-lg li{display:flex;align-items:center;gap:6px}
.rva-sx-lg i{width:8px;height:8px;border-radius:50%}
.rva-sx-lg b{font-weight:500;color:var(--ps-ink);font-variant-numeric:tabular-nums}
.rva-sx-wt{display:flex;gap:12px;flex-wrap:wrap;font:400 12.5px/1.5 var(--ps-font);color:var(--ps-ink-2)}
.rva-sx-wt>span{flex:none;color:var(--ps-dim);padding-top:1px}
.rva-sx-wt ul{flex:1 1 300px;margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:2px}
.rva-sx-wt b{font-weight:500;color:var(--ps-ink)}
.rva-sx-wt s{text-decoration:none;color:var(--ps-ink-2);margin-left:6px}
.rva-sx-more{color:var(--ps-dim)}
.rva-sx-w{margin:0;font:400 12.5px/1.4 var(--ps-font);color:var(--ps-dim);font-style:italic}
.rva-hl-up{display:flex;align-items:center;gap:8px;font:400 12.5px/1.3 var(--ps-font);color:var(--ps-ink-2);white-space:nowrap}
.rva-bar p{flex:1 1 300px;margin:0;font:400 13.5px/1.5 var(--ps-font);color:var(--ps-ink-2)}
.rva-add{flex:1 1 360px;display:flex;gap:8px}
.rva-add .p-in{flex:1;min-width:0;height:36px}
.rva-wait,.rva-err{margin:0;font:400 13.5px/1.5 var(--ps-font);color:var(--ps-ink-2)}
.rva-sign{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:16px 20px;margin:0 0 20px;border-radius:16px;background:var(--ps-card);box-shadow:inset 0 0 0 1px var(--ps-hair)}
body:has(.rva-sign) .ds-sign{display:none}
.rva-sign>span{flex:1 1 280px;display:flex;flex-direction:column;gap:2px}
.rva-sign b{font:500 14px/1.4 var(--ps-font);color:var(--ps-ink)}
.rva-sign s{text-decoration:none;font:400 13px/1.5 var(--ps-font);color:var(--ps-ink-2)}
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
/* TYPE HIERARCHY for the review surfaces (2026-10-27, by request: "too text heavy… too many
   bold… introduce muted colours… don't use bold"). One layer over everything above, so it wins
   by order: nothing here is 600 any more. Titles and names are Medium 500 in ink; everything
   else is Regular 400, and the colour carries the rank — ink for what you read, ink-2 for what
   explains it, dim for dates, counts and metadata. Size steps down with importance. */
.shl-panel h2,.shl-dlg h2,.rvh-dh h2,.rva-dt h2{font-weight:500}
.rvh-t b{font-weight:500}
.rva-g h3,.rva-sec h3,.rva-card h3,.rvh-db h3,.rsd-cap{font:500 14px/1.3 var(--ps-font);color:var(--ps-ink-2)}
.rva-card h3 s,.rvh-db h3 s,.rva-g h3 s{color:var(--ps-dim)}
.shl-who b,.shl-av,.rv-h b,.rv-lk-t b,.rva-lk-t b,.rvh-ah b,.rva-au-h b,.rva-n b,.rs-ah b,.rs-cur b,.rvh-auds b,.rv-dd summary{font-weight:500}
.shl-who b{font-size:13px;color:var(--ps-ink)}
.shl-who b s{color:var(--ps-dim)}
.shl-av{color:var(--ps-ink-2)}
.shl-who time{color:var(--ps-dim)}
.shl-list ul li{color:var(--ps-ink-2)}
.shl-list ul li b{font-weight:400;color:var(--ps-ink)}
.shl-list em{color:var(--ps-dim)}
.shl-step{font-weight:400;color:var(--ps-ink)}
.shl-list ul li b:has(+ .shl-step){color:var(--ps-dim)}
.shl-ph p b,.shl-me b,.shl-lead b{font-weight:500}
.rv-st b{font:500 13px/1.3 var(--ps-font);color:var(--ps-ink)}
.rv-st [data-s="pend"] b{color:var(--ps-ink-2);font-weight:400}
.rv-st s{color:var(--ps-dim)}
.rvh-st [data-s="cur"] b{font-weight:500}
.rvh-d dd{font-weight:400}
.rv-pill{font-weight:500}
.rs-it>span,.rva-pj b{font-weight:500}
.rva-pj b{color:var(--ps-ink)}
.rva-pj s,.rvh-now,.rva-lk-t s,.rv-lk-t s{color:var(--ps-dim)}
.rvh-ah{margin-bottom:12px}
.rva-dl dt{font-weight:400}
.rva-chips span{font-weight:400;color:var(--ps-ink-2)}
.rva .p-btn,.rva .p-ghost,.rvh button,.rvh-dlg button,.shl-panel button,.shl-dlg button,.rva-rm{font-weight:500}
.rv-st b,.rvh-st [data-s="cur"] b{font-weight:400}
.rv-st [data-s="done"] b{color:var(--ps-ink-2)}
.rv-st [data-s="pend"] b{color:var(--ps-dim)}
.rva-next,.rvh-now{font-weight:400;color:var(--ps-ink-2)}
.rv-k,.rvh-k{font-weight:400;color:var(--ps-dim)}
.shl-av,.rv-pill{font-weight:400}
.rva-au-h b,.rvh-ah b,.rs-ah b{color:var(--ps-ink)}

/* ACTIVITY (2026-10-27): designed rather than listed. An entry is a person and a time, then
   one group per place. Medium 500 is the person only; the place is a small dim kicker; a field
   is ink with its verb in italic; the old words are italic, dim and struck, the new words sit
   under them on a hairline rule; design and photo notes are italic footnotes. The bundled face
   has no italic, so the browser slants it. */
.shl-list>li.lg{padding:16px 0}
.shl-list .lg-h{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.shl-list .lg-h .shl-av{width:26px;height:26px;font:500 11.5px/1 var(--ps-font);color:var(--ps-ink-2);background:var(--ps-fill)}
.shl-list .lg-who{font:500 13.5px/1.3 var(--ps-font);color:var(--ps-ink)}
.shl-list .lg-who s{text-decoration:none;font-weight:400;font-style:italic;color:var(--ps-dim)}
.shl-list .lg-h time{margin-left:auto;font:400 12px/1.3 var(--ps-font);color:var(--ps-dim);white-space:nowrap;font-variant-numeric:tabular-nums}
.shl-list .lg-g{margin-left:36px}
.shl-list .lg-g+.lg-g{margin-top:12px}
.shl-list .lg-p{margin-bottom:6px;font:400 11.5px/1.35 var(--ps-font);color:var(--ps-dim);letter-spacing:.01em}
.shl-list .lg-g ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.shl-list .lg-c{display:flex;flex-direction:column;gap:6px}
.shl-list .lg-f{font:400 13px/1.35 var(--ps-font);color:var(--ps-ink)}
.shl-list .lg-f em,.shl-list .lg-n{font-style:italic;color:var(--ps-dim)}
.shl-list .lg-v{display:flex;flex-direction:column;gap:3px;padding:2px 0 2px 12px;box-shadow:inset 2px 0 0 var(--ps-line);overflow-wrap:anywhere}
.shl-list .lg-v del{font:italic 400 12.5px/1.45 var(--ps-font);color:var(--ps-dim);text-decoration:line-through;text-decoration-color:color-mix(in srgb,var(--ps-dim) 60%,transparent)}
.shl-list .lg-v ins{font:400 13px/1.45 var(--ps-font);color:var(--ps-ink);text-decoration:none}
.shl-list .lg-n{font:italic 400 12.5px/1.45 var(--ps-font)}
.shl-list .lg-s{display:flex;align-items:center;gap:8px;font:400 13px/1.35 var(--ps-font);color:var(--ps-ink)}
.shl-list .lg-s i{flex:none;width:8px;height:8px;border-radius:50%;background:var(--ps-good)}
.shl-list .lg-s[data-back="1"] i{background:none;box-shadow:inset 0 0 0 1.5px var(--ps-dim)}
.shl-list .lg-s[data-back="1"]{color:var(--ps-ink-2)}
.shl-list .lg-more{margin:10px 0 0 36px;font:italic 400 12px/1.4 var(--ps-font);color:var(--ps-dim)}
.shl-empty{font-style:italic}

/* the same person again, within six hours: one name for the run, each entry keeps its time */
.shl-list>li.lg[data-cont]{padding-top:4px}
.shl-list>li.lg:has(+ li.lg[data-cont]){box-shadow:none;padding-bottom:6px}
.shl-list .lg[data-cont] .lg-h{margin-bottom:6px}
.shl-list .lg[data-cont] .shl-av,.shl-list .lg[data-cont] .lg-who{visibility:hidden}
.shl-list .lg[data-cont] .lg-h{height:16px}

/* footnotes in the panel: italic and quiet, their one action stays upright in the link colour */
.rv-lead{font-style:italic;color:var(--ps-dim)}
.rv-lead a{font-style:normal;font-weight:500;color:var(--ps-link);text-decoration:none;white-space:nowrap}
.rv-lead a:hover{text-decoration:underline;text-underline-offset:2px}
.rv-ntf{font-style:italic;font-weight:400;text-decoration:none}
.shl-me{font-style:italic;color:var(--ps-dim)}
.shl-me b{font-style:normal;font-weight:500;color:var(--ps-ink)}
.shl-me button{font-style:normal}
.shl-state{font-style:italic}
`;
    document.head.appendChild(s);
  }
})();
