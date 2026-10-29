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
  // WHO IS EDITING: the Google account signed in on this computer when there is one (every
  // review link stored on Drive needs that sign-in anyway), so nobody is asked their name; a
  // typed name only where no account is known. The account's full display name, so two people
  // with one first name stay apart in the logs.
  StudioBase.shareWho = () => {
    const D = window.providentDrive, w = D && D.who ? D.who() : null;
    if (!w) return null;
    return { name: String(w.name || '').replace(/\s+/g, ' ').trim() || (D.alias ? D.alias(w) : '') || w.email, email: w.email };
  };
  StudioBase.shareName = () => { const w = StudioBase.shareWho(); return (w && w.name) || lsGet(NAME_KEY) || lsGet('adstudio-author') || ''; };

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
    if (!D || !(await D.ensure())) { dsSignBar(); throw dsAuth(); }
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
  // Forget every Drive read this page has cached, so the next read goes back to Drive.
  function dsFlush() { Object.keys(DSC).forEach(k => delete DSC[k]); Object.keys(DSP).forEach(k => delete DSP[k]); }
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
    const o = {}; ['rid', 'name', 'product', 'created', 'by', 'drive', 'eng_only', 'items', 'plan', 'ticket', 'picked', 'reply'].forEach(k => { o[k] = rs[k]; });
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
  const DS_STEP = { 'design-done': [['dd'], 'design', true], 'design-open': [['dd'], 'design', false], 'copy-done': [['ct'], 'copy', true], 'copy-open': [['ct', 'dd'], 'copy', false],
    // the designer's bypass: an ad already signed off outside the review goes straight to approved
    approved: [['dd'], 'copy', true] };
  async function dsApi(op, q, body) {
    q = q || {}; body = body || {};
    if (op === 'rsinfo') return dsInfo(String(q.ids || '').split(',').filter(Boolean), q.full === '1');
    const writes = { save: 1, rsstep: 1, rsset: 1, rsdel: 1, thumb: 1 };
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
      if (body.act === 'approved' && !it.design) it.design = { by, at: now };
      R.rs.hist = (R.rs.hist || []).concat({ act: body.act, by, at: now, sid }).slice(-400);
      const text = body.act === 'approved' ? (arb ? 'Marked the Arabic approved — signed off before the review' : 'Marked it approved — signed off before the review') : field === 'design' ? (done ? (arb ? 'Arabic laid out, ready for the translation check' : 'Marked the design done') : (arb ? 'Put the Arabic back in progress' : 'Put the design back in progress'))
        : (done ? (arb ? 'Approved the translation' : 'Approved the English copy') : (arb ? 'Reopened the translation check' : 'Reopened the copy check'));
      dsLog(R.rs, by, [{ kind: 'step', page: dsItemLabel(it), text }]);
      if (typeof body.thumb === 'string' && body.thumb.indexOf('data:image/') === 0 && body.thumb.length < 120000) R.rs.thumb = body.thumb;
      await dsWrite(R.rid, R.rs);
      return { rs: pub() };
    }
    if (op === 'rsset') {
      if (!R.rs) throw dsFail(404, 'This project is not in an ad set review.');
      if (R.role !== 'dd') throw dsFail(403, 'Only the designer changes the ad set.');
      const rs = R.rs, by = dsWho(body.by), chg = [];
      const cellsWas = planCells(planOf(rs)).map(c => ({ market: c.market, aud: c.aud, arb: !!c.arb }));
      if ('name' in body && String(body.name || '').trim()) {
        const nm = String(body.name).trim().slice(0, 120);
        if (rs.name && nm !== rs.name) chg.push('Renamed the campaign to “' + nm + '”');
        rs.name = nm;
        // the file in the Main folder follows the ad set's name (an older one in its subfolder keeps 'Ad set.json')
        try { const m = await dsMeta(R.rid); if (m.name.endsWith(DS_TAIL) && m.name !== dsSetName(rs.name)) await dsFetch('/drive/v3/files/' + R.rid + '?supportsAllDrives=true&fields=' + DS_F, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: dsSetName(rs.name) }) }); } catch (e) {}
      }
      if (body.eng_only && typeof body.eng_only === 'object') { rs.eng_only = rs.eng_only || {}; Object.keys(body.eng_only).slice(0, 40).forEach(k => { if (body.eng_only[k]) rs.eng_only[k] = true; else delete rs.eng_only[k]; }); }
      // the designer's settings, from the Ad set tab: the planned audiences and their Arabic
      if (Array.isArray(body.plan)) {
        rs.plan = planCells(body.plan).slice(0, 40).map(c => ({ market: String(c.market), aud: String(c.aud), arb: !!c.arb }));
        rs.eng_only = rs.eng_only || {};
        rs.plan.forEach(c => { const k = c.market + '|' + c.aud; if (c.arb) delete rs.eng_only[k]; else rs.eng_only[k] = true; });
        // the settings say what moved, in the ad set's own log
        const key = c => c.market + ' · ' + c.aud, old = {}; cellsWas.forEach(c => { old[key(c)] = c; });
        rs.plan.forEach(c => { const o = old[key(c)]; if (!o) chg.push('Added ' + key(c) + (c.arb ? ', with Arabic' : '')); else if (o.arb !== c.arb) chg.push(c.arb ? 'Planned an Arabic version of ' + key(c) : key(c) + ' is English only'); delete old[key(c)]; });
        Object.keys(old).forEach(k => chg.push('Dropped ' + k));
      }
      // the ticket's brief and deadline, from the settings
      if (body.ticket && typeof body.ticket === 'object') {
        const bt = body.ticket, t = rs.ticket || {};
        const dl = 'deadline' in bt ? String(bt.deadline || '').slice(0, 10) : t.deadline || '', br = 'brief' in bt ? String(bt.brief || '').slice(0, 20000) : t.brief || '';
        if (dl !== (t.deadline || '') || br !== (t.brief || '')) {
          if (dl !== (t.deadline || '')) chg.push(dl ? 'Set the deadline to ' + new Date(dl + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Cleared the deadline');
          if (br !== (t.brief || '')) chg.push(t.brief ? 'Edited the brief' : 'Added a brief');
          rs.ticket = Object.assign({ by, at: dsNow(), files: [] }, t, { deadline: dl, brief: br });
        }
      }
      // Claude's reply, kept on the ad set so every audience (and every designer) fills from it
      if (typeof body.reply === 'string') rs.reply = body.reply.slice(0, 200000);
      if ('product' in body && AUDS[body.product] && body.product !== rs.product) { if (rs.product) chg.push('Set the product to ' + PRODUCT_NAME[body.product]); rs.product = body.product; }
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
      if (chg.length) dsLog(rs, by, chg.map(text => ({ kind: 'step', text })));
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
    if (op === 'thumb') {
      if (R.role === 'pm') throw dsFail(403, 'This link is for viewing the ad sets — it cannot change the project.');
      if (!(typeof body.thumb === 'string' && body.thumb.indexOf('data:image/') === 0 && body.thumb.length < 120000)) throw dsFail(400, 'No preview.');
      const d = await dsRead(fid, true), rv = d.review || (d.review = {});
      rv.thumb = body.thumb; rv.thumbAt = dsNow();
      if (body.sum && typeof body.sum === 'object') rv.sum = body.sum;
      await dsWrite(fid, d);
      return { ok: true };
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
        let thAt = 0;
        const plog = [], proj = {};
        await Promise.all((R.rs.items || []).map(async it => {
          try {
            const d = await dsRead(it.sid.slice(1)), rv = d.review || {};
            e.live[it.sid] = true;
            proj[it.sid] = { sum: rv.sum || {}, thumb: rv.thumb || '' };
            const br = d.state && d.state.look && d.state.look.on ? 'unbranded' : 'provident';
            (e.brands = e.brands || {})[br] = (e.brands[br] || 0) + 1;
            if (rv.thumb && (rv.thumbAt || 0) > thAt) { thAt = rv.thumbAt; e.thumb = rv.thumb; }
            const lg = rv.log || [];
            const pm = Math.max((rv.sum && rv.sum.updated) || 0, lg.length ? lg[lg.length - 1].at || 0 : 0);
            e.mod = Math.max(e.mod || 0, pm);
            // a preview older than the project's last change is redrawn by Review links itself
            // (AV.heal) — the designer's tab may never have sent one
            if (!rv.thumb || (rv.thumbAt || 0) < pm - 2000) (e.stale = e.stale || []).push({ sid: it.sid, rev: rv.rev || 0, mod: pm });
            if (pm >= (e.leadMod || 0)) { e.leadMod = pm; e.lead = it.sid; }
            if (full) (rv.log || []).slice(-100).forEach(x => plog.push(Object.assign({}, x, { page: dsItemLabel(it) })));
          } catch (er) { if (er.gdAuth) throw er; e.live[it.sid] = false; }
        }));
        if (full) { e.log = (R.rs.log || []).slice(-300); e.rs.hist = R.rs.hist || []; e.plog = plog; e.proj = proj; }
        // the card shows the project changed last, so its preview is the one that must be current
        if (e.lead && proj[e.lead] && proj[e.lead].thumb) e.thumb = proj[e.lead].thumb;
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
      if (had) {
        // the folder's ad set IS the campaign's: add this project to it rather than refuse
        const old = await dsRead(had.id, true);
        rs = old; rid = had.id; ans.mode = 'add';
      }
      const tokOf = () => dsRand(10);
      if (!rs) rs = { app: 'provident-ad-set', name: ans.name, product: ans.product, created: dsNow(), by, drive: 'https://drive.google.com/drive/folders/' + folder.id,
        folder: folder.id, eng_only: {}, items: [], hist: [], log: [] };
      // set up from the home page's widget: the plan says which audiences and languages the
      // ad set will hold, and an audience planned without Arabic has nothing to translate
      if (ans.mode === 'new') {
        if (ans.plan) { rs.plan = planCells(ans.plan); rs.plan.forEach(c => { if (!c.arb) rs.eng_only[c.market + '|' + c.aud] = true; }); }
        const same = files.find(x => x.name === dsSetName(ans.name));
        const f = same ? { id: same.id } : await dsCreate(folder.id, dsSetName(ans.name), dsJson(rs));
        rid = f.id; rs.rid = rid;
        rs.tok = { dd: 'R' + tokOf() + '.' + rid, ct: 'R' + tokOf() + '.' + rid, pm: 'R' + tokOf() + '.' + rid };
      }
    } else {
      const R = await dsResolve(ans.dd, null, true);
      if (R.role !== 'dd') throw dsFail(403, 'Only the designer adds projects to an ad set.');
      rs = R.rs; rid = R.rid;
    }
    const it = { market: ans.market, aud: ans.aud, lang: ans.lang };
    const taken = (rs.items || []).find(x => x.market === it.market && x.aud === it.aud && x.lang === it.lang);
    if (taken) {
      // the same project, opened apart from its link: reconnect it, nothing to add
      let pid = '';
      try { pid = ((await dsRead(taken.sid.slice(1), true)).state || {}).pid || ''; } catch (e) {}
      if (pid && pid === this.state.pid) return Object.assign(dsPub(rs, 'dd'), { rejoin: taken.sid });
      throw dsFail(409, dsItemLabel(it) + ' is already in the ad set as another project. Pick another audience or language, or open that project from Review links.');
    }
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
    // the first project of a ticket is the designer picking it up
    if (!(rs.items || []).length && rs.ticket && !rs.picked) { rs.picked = { by, at: now }; dsLog(rs, by, [{ kind: 'step', text: 'Picked up the ticket' }]); }
    rs.items = (rs.items || []).concat(item);
    rs.hist = (rs.hist || []).concat({ act: ans.mode === 'new' ? 'start' : 'add', by, at: now, sid }).slice(-400);
    dsLog(rs, by, [{ kind: 'step', text: (ans.mode === 'new' ? 'Started the ad set with ' : 'Added ') + dsItemLabel(item) }]);
    try { const th = await this.rvThumb(); if (th && th.length < 120000) rs.thumb = th; } catch (e) {}
    await dsWrite(rid, rs);
    // the project's summary and picture for the archive
    try { const d = await dsRead(sid.slice(1), true); d.review.sum = this.rvSum(st); if (rs.thumb) { d.review.thumb = rs.thumb; d.review.thumbAt = dsNow(); } await dsWrite(sid.slice(1), d); } catch (e) {}
    ssSet(this.shKey(), { id: sid, rev: (DSC[sid.slice(1)] && DSC[sid.slice(1)].d.review.rev) || rev, n: 0, pid: this.state.pid, imgs, name, role: 'dd', rs: dsPub(rs, 'dd') });
    ssSet(this.shKey('-base'), st);
    ssSet(this.shKey('-log'), null);
    return dsPub(rs, 'dd');
  };
  // ══ TICKETS (2026-10-28) ══════════════════════════════════════════════════════════════════
  // A campaign starts as a TICKET: an ad set with no project yet, filed by performance marketing
  // (or by the designer, who then picks it up at once) in the Drive folder they choose. It holds
  // the raw material — the brief text, the files (renders, logos, brochures, saved into the
  // folder's Brief/), the deadline — and the suggested markets and audiences. It is OPEN until a
  // designer picks it up: the first project added to it (dsReview) marks it picked.
  const DS_BRIEF = 'Brief';
  async function dsMakeSet(plan, by, ticket, files, busy) {
    const D = window.providentDrive, folder = await D.folderOf(plan.folder);
    busy('Opening “' + folder.name + '”…', .05);
    const had = (await dsList(folder.id)).filter(x => x.mimeType !== DS_FOLDER && x.name.endsWith(DS_TAIL));
    for (const x of had) { const old = await dsRead(x.id, true); if (!old.deleted) throw dsFail(409, '“' + folder.name + '” already holds the campaign ' + (old.name || '') + '. Pick an empty folder for a new one.'); }
    const now = dsNow(), cells = planCells(plan), name = String(plan.name || 'Campaign').trim().slice(0, 120);
    const rs = { app: 'provident-ad-set', name, product: plan.product, created: now, by, drive: 'https://drive.google.com/drive/folders/' + folder.id,
      folder: folder.id, eng_only: {}, items: [], hist: [{ act: 'ticket', by, at: now }], log: [], plan: cells,
      ticket: { brief: String((ticket && ticket.brief) || '').slice(0, 60000), deadline: (ticket && ticket.deadline) || '', by, at: now, files: [] } };
    cells.forEach(c => { if (!c.arb) rs.eng_only[c.market + '|' + c.aud] = true; });
    busy('Filing the ticket…', .12);
    const f = await dsCreate(folder.id, dsSetName(name), dsJson(rs)), rid = f.id, tok = () => 'R' + dsRand(10) + '.' + rid;
    rs.rid = rid; rs.tok = { dd: tok(), ct: tok(), pm: tok() };
    const list = Array.from(files || []);
    if (list.length) {
      const bf = await dsFolder(folder.id, DS_BRIEF);
      for (let i = 0; i < list.length; i++) {
        busy('Saving files · ' + (i + 1) + ' of ' + list.length + '…', .15 + .78 * i / list.length);
        const x = await dsCreate(bf, list[i].name, list[i]);
        rs.ticket.files.push({ id: x.id, name: list[i].name, type: list[i].type || '', size: list[i].size || 0 });
      }
    }
    dsLog(rs, by, [{ kind: 'step', text: 'Filed the ticket' }]);
    await dsWrite(rid, rs);
    return dsPub(rs, 'dd');
  }
  // PICK UP: a new project opens and joins the ticket as its first planned audience, in English.
  // The tab reloads into the new project, so the request waits in localStorage (rsPickCheck).
  const PICK_KEY = 'provident-rspick';
  function pickUp(eng, dd) {
    if (eng.confirmDiscard && !eng.confirmDiscard()) return false;
    if (eng.markSaved) eng.markSaved();
    lsSet(PICK_KEY, JSON.stringify({ dd, at: Date.now() }));
    if (eng.newProject) eng.newProject();
    return true;
  }
  SP.rsPickCheck = async function () {
    let g = null; try { g = JSON.parse(localStorage.getItem(PICK_KEY) || 'null'); } catch (e) {}
    if (!g || !g.dd || Date.now() - (g.at || 0) > 300000) return;
    if (this.state.screen === 'splash' || this.state.screen === 'pick') { setTimeout(() => this.rsPickCheck(), 400); return; }
    try { localStorage.removeItem(PICK_KEY); } catch (e) {}
    if (this._sh) return;
    const D = window.providentDrive;
    if (!(D && (await D.ensure())) && !(await dsGate('Pick up the ticket'))) return;
    let rs;
    try { rs = (await api('rsget', { id: g.dd })).rs; }
    catch (e) { const d = busyDlg('Pick up the ticket', ''); d.fail(e.message || String(e)); return; }
    const next = planTodo(rs).find(t => t.lang === 'ENG') || planTodo(rs)[0] || { market: 'Local', aud: (AUDS[rs.product] || AUDS.residential)[0], lang: 'ENG' };
    const label = next.market + ' · ' + next.aud;
    const dlg = busyDlg('Setting up ' + label, 'This project becomes the first audience of ' + (rs.name || 'the campaign') + '.');
    try {
      this.upd(x => { x.campaign = rs.name || x.campaign; x.screen = 'copy'; return x; });
      await new Promise(r => setTimeout(r, 60));
      const out = await this.dsReview(dlg, { mode: 'add', by: StudioBase.shareName() || 'Someone', dd: g.dd, market: next.market, aud: next.aud, lang: 'ENG' });
      Arch.add(out.tok.dd, out.name, out.product, true);
      // the Claude reply filed on the ticket, if any, is ready in the Ad set tab
      if (out.reply && this.brRead && !this.brRead().reply) this.brSet('reply', out.reply);
      this.shareStart(false);
      dlg.close();
    } catch (e) { dlg.fail(e.message || String(e)); }
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
  async function dsGate(title) {
    const D = window.providentDrive;
    if (D && (await D.ensure())) return true;   // signed in, or renewed by the server with no click
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
    else {
      // not followed in this tab, but this project has a link on this computer: reconnect
      const k = pidGet(this.state.pid);
      if (k && k.id && k.app === this.shApp()) setTimeout(() => { if (!this._sh) this.shRejoin(k.id); }, 900);
    }
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
    if (this.shApp() === 'provident-ad-studio') { this.rsJoinCheck(); this.rsPickCheck(); }
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
    const dlg = nameDialog({ title: 'Open a shared project', lead: 'Loading the project…', btn: 'Open', busy: true, auto: true });
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
    if (!StudioBase.shareWho()) lsSet(NAME_KEY, name);
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
      lead: 'Anyone with the link can open this project, change it and see who changed what. Anyone who has it can edit — share it only with people who should.',
      note: 'Your name is shown beside every change you make.' });
    const name = await dlg.name();
    if (!name) return;
    if (!StudioBase.shareWho()) lsSet(NAME_KEY, name);
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
    if (!keepBinding) { ssSet(this.shKey(), null); ssSet(this.shKey('-base'), null); ssSet(this.shKey('-log'), null); if (this._shLeave) pidForget(this.state.pid); }
    this._shLeave = false;
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
    S.onSlot = e => {
      const id = e && e.detail && e.detail.id; if (!id) return;
      // a new picture, here or pulled from someone else, is what a preview most needs to show
      if (S.rs) S.thumbDue = true;
      if (!S.applying) { S.dirty.add(id); S.lastT = Date.now(); }
    };
    window.addEventListener('image-slots-change', S.onSlot);
    S.onVis = () => { if (!document.hidden) this.shPoll(); };
    document.addEventListener('visibilitychange', S.onVis);
    S.tick = setInterval(() => this.shTick(), 1000);
    S.poll = setInterval(() => this.shPoll(), POLL);
    S.clock = setInterval(() => this.shRender(), 30000);
    S.ui = buildUi(this);
    pidRemember(this.state.pid, { id: S.id, app: this.shApp(), rev: S.rev, base: S.base, imgs: S.imgs });
    document.documentElement.classList.add('shl-on');
    if (S.rs && S.rs.tok) Arch.add(S.rs.tok.dd, S.rs.name, S.rs.product);
    if (open || (lsGet('provident-share-open') === '1' && !(S.rs && this.shApp() === 'provident-ad-studio'))) this.shPanel(true);
    this.shGuard(true);
    this.shRender();
    this.shPoll(true);
    S.healT = Date.now(); setTimeout(() => this.shHeal(), 1500);
    if (Object.keys(S.pv).length) setTimeout(() => this.shFlash(Object.keys(S.pv).length + ' full-size photo' + (Object.keys(S.pv).length > 1 ? 's have' : ' has') + ' expired — showing previews. Restore them from the Changes panel.'), 800);
    this.forceUpdate();
  };
  // THE PREVIEW REVIEW LINKS SHOWS. It was drawn once, when the project joined the ad set, so the
  // cards never showed the work. Now it is redrawn after EVERY save — 1.5s after it lands, at
  // most every 5s — and sent on its own (op 'thumb'), so it is no new revision
  // and nobody pulls for it. The ad set's card shows its most recently changed project.
  SP.shThumb = async function (force) {
    const S = this._sh;
    if (!S || !S.rs || S.thumbBusy || S.busy || this.shApp() !== 'provident-ad-studio') return;
    if (!force && (!S.thumbDue || Date.now() - (S.savedAt || 0) < 1500 || Date.now() - (S.thumbAt || 0) < 5000)) return;
    S.thumbBusy = true; S.thumbDue = false; S.thumbAt = Date.now();
    try {
      const th = await this.rvThumb();
      if (th && this._sh === S) await api('thumb', { id: S.id }, { thumb: th, sum: this.rvSum(this.shPub()) });
    } catch (e) { S.thumbDue = true; }
    S.thumbBusy = false;
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
    if (!pend) this.shThumb();
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
          if (S.rs) { S.thumbDue = true; S.savedAt = Date.now(); }
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
    pidRemember(this.state.pid, { id: S.id, app: this.shApp(), rev: S.rev, base: S.base, imgs: S.imgs });
  };
  // A PROJECT KNOWS ITS LINK, NOT ONLY THE TAB. The binding above is per tab (sessionStorage),
  // so the same project opened in another window, from Recent, or from its saved file used to
  // read as a new, unshared project — and putting it in its ad set again then hit "already
  // there". `provident-share-pid:<pid>` (localStorage, every tab and workspace on this
  // computer) keeps the link id and the last state synced with it, so any window that opens
  // the project reconnects by itself, merging what was done while it was apart.
  const PID_KEY = 'provident-share-pid:', PID_IDX = 'provident-share-pids', PID_MAX = 12;
  function pidGet(pid) { try { return pid ? JSON.parse(localStorage.getItem(PID_KEY + pid) || 'null') : null; } catch (e) { return null; } }
  function pidRemember(pid, v) {
    if (!pid || !v || !v.id) return;
    let idx = []; try { idx = JSON.parse(localStorage.getItem(PID_IDX) || '[]') || []; } catch (e) {}
    idx = idx.filter(p => p !== pid); idx.unshift(pid);
    idx.slice(PID_MAX).forEach(p => { try { localStorage.removeItem(PID_KEY + p); } catch (e) {} });
    idx = idx.slice(0, PID_MAX);
    const rec = Object.assign({ at: Date.now() }, v);
    try { localStorage.setItem(PID_KEY + pid, JSON.stringify(rec)); }
    catch (e) { try { delete rec.base; localStorage.setItem(PID_KEY + pid, JSON.stringify(rec)); } catch (e2) {} }   // too big: keep the id
    try { localStorage.setItem(PID_IDX, JSON.stringify(idx)); } catch (e) {}
  }
  function pidForget(pid) { if (pid) try { localStorage.removeItem(PID_KEY + pid); } catch (e) {} }
  // Reconnect THIS tab's project to its link `id` (its own link — a 12-char store id or a
  // Drive 'D' id), with no dialog. The link must hold this same project (same pid). Words: a
  // three-way merge over the last state this computer synced with it, so edits made here while
  // apart and edits made by others both survive (with no known base, this computer's edits win
  // where the two differ). Pictures: a photo that changed only here goes up, one that changed
  // only there comes down.
  SP.shRejoin = async function (id, quiet) {
    if (this._sh || this._shRejoin || !id) return false;
    this._shRejoin = true;
    try {
      if (isDs(id)) {
        const D = window.providentDrive;
        if (!(D && (await D.ensure())) && !(await dsGate('Reconnect to the ad set review'))) return false;
      }
      const d = await api('get', { id });
      if (!d || !d.state || (d.state.pid || '') !== (this.state.pid || '')) return false;
      if (this._sh) return false;
      const was = pidGet(this.state.pid) || {}, known = was.id === id;
      const theirs = this.shNorm(d.state), mine = this.shPub();
      const base = known && was.base ? was.base : theirs;
      const merged = merge3(base, mine, theirs);
      const C = IS(), want = d.imgs || {}, baseImgs = known ? (was.imgs || {}) : {}, imgs = {}, up = [];
      for (const sl of Object.keys(want)) {
        const loc = C && C.getRec ? C.getRec(sl) : null, lh = loc && loc.u ? fnv(JSON.stringify(loc)) : '';
        if (lh === want[sl].h) { imgs[sl] = lh; continue; }
        if (lh && baseImgs[sl] === want[sl].h) { imgs[sl] = want[sl].h; up.push(sl); continue; }   // changed here only
        const rec = await fetchRec(id, want[sl]);
        if (rec && C && C.putRec) { C.putRec(sl, rec); imgs[sl] = want[sl].h; }
      }
      // a photo here the link has never had goes up too
      (this.shSlots ? this.shSlots() : []).forEach(sl => { if (!want[sl] && C && C.getRec) { const r = C.getRec(sl); if (r && r.u) up.push(sl); } });
      if (!jsonEq(merged, mine)) this.shApply(merged);
      const meta = d.meta || {};
      ssSet(this.shKey(), { id, rev: d.rev || 0, n: d.n || 0, pid: this.state.pid, imgs, pv: {}, name: meta.name || this.shName(), role: d.role || 'edit', rs: d.rs || null });
      ssSet(this.shKey('-base'), theirs);
      ssSet(this.shKey('-log'), null);
      this.shareStart(false);
      const S = this._sh;
      if (S) { up.forEach(sl => S.dirty.add(sl)); if (up.length) S.lastT = Date.now(); if (S.rs) { S.thumbDue = true; S.savedAt = 0; } }
      if (!quiet) setTimeout(() => this.shFlash(d.rs ? 'Reconnected to the ad set ' + (d.rs.name || '') + ' — your changes reach the review link again.' : 'Reconnected to its shared link.'), 400);
      return true;
    } catch (e) { return false; }
    finally { this._shRejoin = false; }
  };
  SP.shPoll = async function (force) {
    const S = this._sh; if (!S || S.polling) return;
    if (!force && S.busy) return;
    // a tab in the background still looks, every 45s, so a step someone takes can notify here
    if (!force && document.hidden) { if (!S.rs || Date.now() - (S.hidPoll || 0) < 45000) return; S.hidPoll = Date.now(); }
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
      if (S.rs) { S.thumbDue = true; S.savedAt = Date.now(); }
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
    if (open !== false && this.shApp() === 'provident-ad-studio' && S.rs && S.role === 'dd') {
      // the Ad set tab is where a campaign project's activity and links live
      this.adtPill();
      if (this.state.screen !== 'copy') this.upd(x => { x.screen = 'copy'; x.sel = null; return x; });
      return;
    }
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
    if (cas) setTimeout(() => { Arch.mount(this); Plan.mount(this); this.adtMount(); this.adtPill(); }, 0);
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
        // THE MAIN SCREEN'S ONE ACTION: what this project needs next (here: a campaign)
        rsFlowOn: true, rsFlowLabel: 'Set up ad set', rsFlowTip: 'This project is not in a campaign yet. Opens the Ad set tab to set one up.',
        rsFlow: () => this.upd(x => { x.screen = 'copy'; x.sel = null; return x; }),
      };
    }
    const auds = rsAuds(rs), mine = auds.find(a => a.items.indexOf(it) >= 0), arb = it.lang === 'ARB';
    const steps = (mine ? mine.steps : []).map((x, i) => ({ label: x.label, n: i + 1, sub: x.sub, state: x.s === 'pend' ? 'todo' : x.s }));
    const now = mine && mine.now, lang = arb ? 'Arabic' : 'English';
    const where = itemLabel({ market: it.market, aud: it.aud }) + ' · ' + lang;
    // the designer's two buttons on this project: the forward one and the one that takes it back
    let fwd = null, back = null;
    if (!it.design) fwd = { act: 'design-done', label: arb ? 'Send for translation check' : 'Send to copy check',
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
      // THE MAIN SCREEN'S ONE ACTION: Design done, then Create next audience — the Ad set tab's own
      ...(() => { const nx = this.adtNext(), b = this._rvBusy || this._rsNextBusy;
        return { rsFlowOn: !!nx, rsFlowLabel: nx ? (b && (b === nx.act || b === nx.next) ? 'Saving…' : nx.label) : '', rsFlowTip: nx ? nx.tip : '',
          rsFlow: nx ? () => (nx.act ? this.rvStep(nx.act) : this.rsNext(nx.next)) : () => {} }; })(),
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
      fail: t => { stBar(el, null); $('.shl-st').textContent = t; $('.shl-st').classList.add('bad'); const g = $('.shl-go'); g.disabled = false; g.textContent = 'Close'; g.onclick = () => el.remove(); },
      close: () => el.remove()
    };
  }
  // ---- AD SET SETTINGS (2026-10-29): the setup form again, for a campaign that already exists ----
  // Name, product, deadline, brief, the markets and audiences and which get an Arabic version —
  // saved on the ad set for everyone's links. It never orphans work: an audience that already
  // has a project stays (move the project with Change audience, or remove it, first), and its
  // Arabic stays on while it has an Arabic project. Opened from Status (an ad set's page and an
  // open ticket) and from the Ad set tab. Resolves to the saved ad set, or null on Cancel.
  function rsSettings(rs, save, o) {
    injectCss();
    o = o || {};
    const items = (rs.items || []).filter(x => x.market && x.aud), tk = rs.ticket || {}, ticket = o.ticket !== false;
    const has = (m, a, l) => items.some(x => x.market === m && x.aud === a && (!l || (x.lang || 'ENG') === l));
    let cells = planCells(planOf(rs)).map(c => ({ market: c.market, aud: c.aud, arb: !!c.arb }));
    items.forEach(x => { if (!cells.some(c => c.market === x.market && c.aud === x.aud)) cells.push({ market: x.market, aud: x.aud, arb: !(rs.eng_only || {})[x.market + '|' + x.aud] }); });
    items.forEach(x => { if (x.lang === 'ARB') { const c = cells.find(y => y.market === x.market && y.aud === x.aud); if (c) c.arb = true; } });
    const d = { name: rs.name || '', product: AUDS[rs.product] ? rs.product : 'residential', deadline: tk.deadline || '', brief: tk.brief || '' };
    const sig = () => JSON.stringify([d.name.trim(), d.product, d.deadline, d.brief, cells.map(c => [c.market, c.aud, c.arb])]);
    const ord = () => { const as = AUDS[d.product].concat(['Family', 'Investor', 'Hybrid']); cells.sort((x, y) => (MARKETS.indexOf(x.market) - MARKETS.indexOf(y.market)) || (as.indexOf(x.aud) - as.indexOf(y.aud))); };
    ord();
    const was = sig();
    const el = document.createElement('div');
    el.className = 'shl-dlg';
    el.innerHTML = '<div class="shl-dlg-c rss" role="dialog" aria-modal="true" aria-labelledby="rss-t">' +
      '<h2 id="rss-t">Ad set settings</h2><p class="shl-lead">Saved on the ad set, for everyone who has its links.</p>' +
      '<div class="rss-q"><label class="rsp-f"><span>Name</span><input class="p-in" data-f="name" maxlength="120" autocomplete="off"></label>' +
      '<div class="rsp-f"><span id="rss-prod-l">Product</span><div class="p-tabs rsp-prod" role="radiogroup" aria-labelledby="rss-prod-l"></div></div>' +
      (ticket ? '<label class="rsp-f"><span>Deadline</span><input class="p-in" type="date" data-f="deadline"></label>' : '') + '</div>' +
      (ticket ? '<label class="rsp-f"><span>Brief</span><textarea class="p-in" data-f="brief" rows="3" placeholder="The script, fact sheet or brief"></textarea></label>' : '') +
      '<div class="rss-plan"><div class="rss-ph"><b>Audiences</b><span class="rsp-n"></span></div>' +
      '<div class="rsp-more"><div class="rsp-g"><span>Markets</span><div class="rsp-tg" data-g="m"></div></div><div class="rsp-g"><span>Audiences</span><div class="rsp-tg" data-g="a"></div></div></div>' +
      '<div class="rsp-tiles" role="list"></div></div>' +
      '<p class="shl-st" aria-live="polite"></p>' +
      '<div class="shl-acts"><button type="button" class="p-ghost" data-x="1">Cancel</button><button type="button" class="p-btn" data-go="1">Save changes</button></div></div>';
    document.body.appendChild(el);
    const $ = q => el.querySelector(q), st = (t, bad) => { const p = $('.shl-st'); p.textContent = t || ''; p.classList.toggle('bad', !!t && bad !== false); };
    ['name', 'deadline', 'brief'].forEach(f => { const i = $('[data-f="' + f + '"]'); if (i) { i.value = d[f] || ''; i.addEventListener('input', () => { d[f] = i.value; st(''); }); } });
    const draw = () => {
      const tab = (k, l) => '<button type="button" role="radio" aria-checked="' + (d.product === k) + '" data-prod="' + k + '"' + (d.product === k ? ' data-on="1"' : '') + '>' + l + '</button>';
      $('.rsp-prod').innerHTML = tab('residential', 'Residential') + tab('commercial', 'Commercial');
      const ms = new Set(cells.map(c => c.market)), as = new Set(cells.map(c => c.aud));
      const tg = (g, v, on, tip) => '<button type="button" class="rsp-t" aria-pressed="' + on + '" data-tg="' + g + '" data-v="' + esc(v) + '" title="' + esc(tip || '') + '">' + (on ? PICO.tick : '') + esc(v) + '</button>';
      $('[data-g="m"]').innerHTML = MARKETS.map(m => tg('m', m, ms.has(m), MKT_TIP[m])).join('');
      $('[data-g="a"]').innerHTML = AUDS[d.product].concat([...as].filter(a => AUDS[d.product].indexOf(a) < 0)).map(a => tg('a', a, as.has(a), AUD_TIP[a])).join('');
      const n = cells.length + cells.filter(c => c.arb).length;
      $('.rsp-n').textContent = n + (n === 1 ? ' project' : ' projects');
      $('.rsp-tiles').innerHTML = cells.map(c => {
        const k = c.market + '|' + c.aud, busy = has(c.market, c.aud), arLock = has(c.market, c.aud, 'ARB');
        return '<div class="rsp-tile" role="listitem"' + (c.arb ? ' data-ar="1"' : '') + '><div class="rsp-tt"><s>' + esc(c.market) + '</s><b>' + esc(c.aud) + '</b>' + (busy ? '<i class="rss-has">Has a project</i>' : '') + '</div>' +
          '<div class="rsp-lg"><span class="rsp-l" title="English — always made">EN</span>' +
          '<button type="button" class="rsp-l rsp-ar" aria-pressed="' + c.arb + '" data-arb="' + esc(k) + '" title="' + (arLock ? 'Has an Arabic project — remove it first to make this English only' : c.arb ? 'Arabic version on — click for English only' : 'English only — click to add an Arabic version') + '" aria-label="Arabic version for ' + esc(c.market + ' ' + c.aud) + '">AR</button></div></div>';
      }).join('');
    };
    const busyMsg = c => c.market + ' · ' + c.aud + ' already has a project. Move it with Change audience, or remove it, first.';
    const toggle = (g, v) => {
      const ms = [...new Set(cells.map(c => c.market))], as = [...new Set(cells.map(c => c.aud))], list = g === 'm' ? ms : as, on = list.indexOf(v) >= 0;
      if (on) {
        if (list.length === 1) return st(g === 'm' ? 'Keep at least one market.' : 'Keep at least one audience.');
        const drop = cells.filter(c => (g === 'm' ? c.market : c.aud) === v), busy = drop.find(c => has(c.market, c.aud));
        if (busy) return st(busyMsg(busy));
        cells = cells.filter(c => drop.indexOf(c) < 0);
      } else {
        const nm = g === 'm' ? [v] : ms, na = g === 'a' ? [v] : as;
        nm.forEach(m => na.forEach(a => { if (!cells.some(c => c.market === m && c.aud === a)) cells.push({ market: m, aud: a, arb: false }); }));
      }
      st(''); ord(); draw();
    };
    const setProd = p => {
      if (p === d.product) return;
      const na = AUDS[p], busy = cells.find(c => na.indexOf(c.aud) < 0 && has(c.market, c.aud));
      if (busy) return st(busyMsg(busy) + ' ' + (PRODUCT_NAME[p] || p) + ' has no ' + busy.aud + ' audience.');
      const ms = [...new Set(cells.map(c => c.market))];
      cells = cells.filter(c => na.indexOf(c.aud) >= 0);
      if (!cells.length) ms.forEach(m => na.forEach(a => cells.push({ market: m, aud: a, arb: false })));
      d.product = p; st(''); ord(); draw();
    };
    return new Promise(res => {
      const close = v => { document.removeEventListener('keydown', key, true); el.remove(); res(v); };
      const key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(null); } };
      document.addEventListener('keydown', key, true);
      el.addEventListener('click', async e => {
        if (e.target === el) return close(null);
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.x) return close(null);
        if (b.dataset.prod) return setProd(b.dataset.prod);
        if (b.dataset.tg) return toggle(b.dataset.tg, b.dataset.v);
        if (b.dataset.arb) {
          const c = cells.find(x => x.market + '|' + x.aud === b.dataset.arb); if (!c) return;
          if (c.arb && has(c.market, c.aud, 'ARB')) return st(c.market + ' · ' + c.aud + ' has an Arabic project. Remove it first to make this audience English only.');
          c.arb = !c.arb; st(''); draw(); return;
        }
        if (b.dataset.go) {
          d.name = d.name.replace(/\s+/g, ' ').trim();
          if (!d.name) { st('Name the campaign.'); $('[data-f="name"]').focus(); return; }
          if (sig() === was) return close(null);
          const btns = el.querySelectorAll('.shl-acts button'); btns.forEach(x => { x.disabled = true; }); b.textContent = 'Saving…'; st('');
          try {
            const p = { name: d.name, product: d.product, plan: cells.map(c => ({ market: c.market, aud: c.aud, arb: c.arb })) };
            if (ticket) p.ticket = { deadline: d.deadline || '', brief: d.brief || '' };
            close(await save(p));
          } catch (er) { btns.forEach(x => { x.disabled = false; }); b.textContent = 'Save changes'; st(er.message || String(er)); }
        }
      });
      draw();
      setTimeout(() => { const i = $('[data-f="name"]'); if (i) i.focus(); }, 0);
    });
  }
  // Drive keeps the whole plan on the ad set; the old share store keeps the name and product, the
  // Arabic as eng_only, and the plan on this computer (PLAN_LOCAL), as it did when it was made
  async function rsSettingsSave(id, rs, p, by) {
    if (isDs(id) || isDs((rs.tok || {}).dd) || Array.isArray(rs.plan)) return (await api('rsset', { id }, Object.assign({ by }, p))).rs;
    const eo = {}; p.plan.forEach(c => { eo[c.market + '|' + c.aud] = !c.arb; });
    const r = await api('rsset', { id }, { by, name: p.name, product: p.product, eng_only: eo });
    if (rs.tok && rs.tok.dd) lsSet(PLAN_LOCAL + rs.tok.dd, JSON.stringify(p.plan));
    return r.rs;
  }
  // Make the next planned audience FROM THIS DESIGN: this project (already in the ad set, and
  // saved there by the link's own sync) stays where it is; the tab becomes a new project — a
  // new pid, the same design and pictures — saved into the next audience's folder.
  SP.rsNext = async function (key) {
    const S = this._sh; if (!S || !S.rs || !S.rs.tok || this._rsNextBusy) return;
    const [market, aud, lang] = key.split('|'), dd = S.rs.tok.dd, label = market + ' · ' + aud + ' · ' + (lang === 'ARB' ? 'Arabic' : 'English');
    // A NEW AUDIENCE STARTS ON A BLANK CANVAS and takes its words from Claude's reply in the Ad
    // set tab; the ARABIC version is a copy of this design, since it is the same ad translated.
    const arbCopy = lang === 'ARB';
    if (!window.confirm(arbCopy ? 'Make the Arabic version of this design?\n\nThis project stays in the ad set as it is. The tab carries on as a copy of it, in Arabic.'
      : 'Create ' + label + '?\n\nThis project stays in the ad set as it is. The tab carries on as a new, blank project — fill its words from Claude’s reply in the Ad set tab.')) return;
    this._rsNextBusy = key; this.rvRender(); this.forceUpdate();
    try { await this.shSave(); } catch (e) {}
    const dlg = busyDlg('Making ' + label, arbCopy ? 'A copy of this design is being saved into the ad set as ' + label + '.' : 'A blank project is being saved into the ad set as ' + label + '.');
    try {
      if (isDs(dd)) await window.providentDrive.signIn();
      try { this.recordSaved && await this.recordSaved(); } catch (e) {}
      this.shareStop(false);
      const pid = StudioBase.newPid(), C = this.constructor;
      if (!arbCopy) {
        // blank: the pictures leave the store (the project left behind keeps its own on Drive and
        // in Recent) and the state goes back to the studio's defaults, keeping the campaign name
        const IS = customElements.get('image-slot');
        this.shSlots().forEach(sl => { try { if (IS && IS.clearSlot) IS.clearSlot(sl); } catch (e) {} });
        if (this.brRead) { const b = this.brRead(); b.audSet = false; b.filled = ''; b.page = 0; b.head = 0; b.done = {}; }
        this.upd(x => Object.assign(C.defaults(), { pid, campaign: x.campaign || '', screen: 'copy' }));
      } else this.upd(x => { x.pid = pid; x.font = 'arabic'; return x; });
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
      if (arbCopy) dlg.done('This tab is now ' + label + ' — the typeface is switched to Arabic; translate the words in place.');
      else { dlg.close(); this.shFlash('This tab is now ' + label + ' — fill its words from Claude’s reply'); }
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
  function stepperHtml(steps, compact, bare) {
    const tick = '<svg viewBox="0 -960 960 960"><path d="M382-354 734-706q12-12 28-12t28 12q12 12 12 28t-12 28L410-270q-12 12-28 12t-28-12L170-454q-12-12-11.5-28t12.5-28q12-12 28-12t28 12l155 156Z"/></svg>';
    return '<ol class="rv-st' + (compact ? ' rv-st-c' : '') + (bare ? ' rv-st-b' : '') + '" style="--n:' + steps.length + '" aria-label="Review progress">' + steps.map(x =>
      '<li data-s="' + x.s + '"' + (bare && x.sub ? ' title="' + esc(x.label + ' — ' + x.sub) + '"' : '') + '><i class="rv-dot">' + (x.s === 'done' ? tick : '') + '</i><b>' + esc(x.label) + '</b>' + (bare ? '' : '<s>' + esc(x.sub || '') + '</s>') + '</li>').join('') + '</ol>';
  }
  // an "i" that carries the explanation a surface would otherwise print
  const infoHtml = t => t ? '<span class="rv-i" tabindex="0" role="img" title="' + esc(t) + '" aria-label="' + esc(t) + '">i</span>' : '';
  // four short segments, one per step; each says what it is in its tooltip
  const segHtml = steps => '<span class="rv-seg" role="img" aria-label="' + esc(steps.map(x => x.label + ': ' + (x.s === 'done' ? 'done' : x.s === 'cur' ? 'now' : 'not yet')).join(', ')) + '">' +
    steps.map(x => '<i data-s="' + x.s + '" title="' + esc(x.label + (x.sub ? ' — ' + x.sub : '')) + '"></i>').join('') + '</span>';
  // where a review is now, as one line you can read at a glance: step n of 4, its name, the bar
  function nowHtml(steps, done, info) {
    const i = done ? steps.length - 1 : Math.max(0, steps.findIndex(x => x.s !== 'done'));
    return '<div class="rv-now" data-s="' + (done ? 'done' : 'prog') + '"><span class="rv-k">' + (done ? 'Ready to run' : 'Step ' + (i + 1) + ' of ' + steps.length) + '</span>' +
      '<div class="rv-now-t"><b>' + esc(done ? 'Done' : steps[i].label) + '</b>' + infoHtml(info) + '</div>' + segHtml(steps) + '</div>';
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
  // the designer's bypass, asked once: it skips the content team, so it says so
  const APPROVE_Q = l => 'Mark ' + (l || 'this project') + ' approved without the content team?\n\nUse this for an ad that was already signed off outside the review. It goes straight to approved, and the log says you marked it.';
  // the buttons a role has on one project
  function itemActs(it, role, busy) {
    const arb = it.lang === 'ARB', out = [];
    if (role === 'dd') out.push(it.design ? ['design-open', arb ? 'Arabic back in progress' : 'Back to in process', 'p-ghost']
      : ['design-done', arb ? 'Send for translation check' : 'Send to copy check', 'p-btn']);
    if (role === 'ct' && (it.design || it.copy)) out.push(it.copy ? ['copy-open', arb ? 'Reopen translation check' : 'Reopen copy check', 'p-ghost']
      : ['copy-done', arb ? 'Approve translation' : 'Approve English copy', 'p-btn']);
    if (role === 'dd' && it.copy) out.push(['copy-open', arb ? 'Reopen translation check' : 'Reopen copy check', 'p-ghost']);
    // the bypass: an ad already signed off outside the review
    if (role === 'dd' && !it.copy) out.push(['approved', 'Already approved', 'p-ghost rs-byp']);
    if (!out.length) return '<s class="rs-wait">' + (it.design ? 'With the content team' : arb ? 'Arabic being laid out' : 'Design in progress') + '</s>';
    return out.map(a => '<button type="button" class="' + a[2] + '" data-act="' + a[0] + ':' + esc(it.sid) + '"' + (busy ? ' disabled' : '') + '>' + (busy === a[0] + ':' + it.sid ? 'Saving…' : esc(a[1])) + '</button>').join('');
  }

  SP.rvSum = function (st) {
    if (this.shApp() !== 'provident-ad-studio') return undefined;
    const C = this.constructor; st = st || this.state;
    try {
      const sz = []; (st.variants || []).forEach(v => C.sizesFor(st, v).forEach(k => { if (sz.indexOf(k) < 0) sz.push(k); }));
      return { campaign: String(st.campaign || ''), mode: C.isCarousel(st) ? 'carousel' : 'single', variants: (st.variants || []).length,
        sizes: sz.map(k => SIZE_LAB[k] || k), comps: C.allMods(st).length, updated: Date.now(), pid: st.pid || '',
        brand: st.look && st.look.on ? 'unbranded' : 'provident' };
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
    this.shPersist(); this.rvRender(); this.adtRender(); this.forceUpdate();
  };
  // A CAS project in a campaign carries its activity and hand-offs in the Ad set tab: the
  // floating Changes pill and panel would say the same thing twice, so they step aside.
  SP.adtPill = function () {
    const S = this._sh; if (!S || !S.ui) return;
    const on = this.shApp() === 'provident-ad-studio' && !!S.rs && S.role === 'dd';
    if (on !== (S.ui.root.dataset.camp === '1')) {
      if (on) { S.ui.root.dataset.camp = '1'; S.ui.root.classList.remove('open'); document.documentElement.classList.remove('shl-open'); }
      else delete S.ui.root.dataset.camp;
    }
  };
  // a step someone else took: a pop-up here, a system notification while the tab is in the back
  SP.rsNotify = function (was, now) { notifySteps(was, now, this._sh && this._sh.ui); };
  function notifySteps(was, now, ui) {
    const me = StudioBase.shareName(), seen = new Set((was.hist || []).map(h => h.at + h.act + h.sid));
    (now.hist || []).filter(h => !seen.has(h.at + h.act + h.sid) && h.by !== me).forEach(h => {
      const it = (now.items || []).find(x => x.sid === h.sid), lab = it ? itemLabel(it) : '';
      const what = { 'design-done': it && it.lang === 'ARB' ? 'laid out the Arabic' : 'marked the design done', 'design-open': 'put the design back in progress',
        'copy-done': it && it.lang === 'ARB' ? 'approved the translation' : 'approved the English copy', 'copy-open': 'reopened the copy check', approved: 'marked it approved (signed off before the review)', add: 'added a project', start: 'started the ad set' }[h.act] || 'changed a step';
      const t = h.by + ' ' + what + (lab ? ' · ' + lab : '');
      if (ui) ui.flash(t);
      sysNotify((now.name || 'Ad set') + ' · review', t, 'rs-' + h.at);
    });
  }
  // A CHROME NOTIFICATION, whether or not the tab is in front: a hand-off is the moment the next
  // person has to act. It only reaches a browser that has this ad set open in some tab (the tab
  // polls; there is no push server), and only once that browser has said yes (askNotify).
  function sysNotify(title, body, tag) {
    try {
      if (!window.Notification || Notification.permission !== 'granted') return;
      const n = new Notification(title, { body, tag, icon: 'favicon.ico' });
      n.onclick = () => { try { window.focus(); } catch (e) {} n.close(); };
    } catch (e) {}
  }
  // Asked from a click (a step button, or the Notify button), never on load: Chrome refuses a
  // prompt without a user gesture and remembers a refusal for good.
  function askNotify() {
    try { if (window.Notification && Notification.permission === 'default') return Notification.requestPermission().catch(() => {}); } catch (e) {}
    return Promise.resolve();
  }
  window.providentNotifyAsk = askNotify;
  // What a project still lacks before the content team checks it: empty words on any page, a
  // page or variant with no background photo, a QR code switched on with none dropped in, and
  // copy covering more of a canvas than the brand ceiling. Campaign only (reads its engine).
  SP.rsPrecheck = function () {
    const C = this.constructor, s = this.state, out = [];
    if (!C || !C.copySnap || !s || !Array.isArray(s.variants)) return out;
    const IS = customElements.get('image-slot'), has = id => !!(IS && IS.getRec && IS.getRec(id));
    const lab = vi => (this.vLabel ? this.vLabel(vi) : 'Page ' + (vi + 1));
    try {
      const snap = C.copySnap(s, 'draft', ''), pages = C.copyPages(s), multi = snap.pages.length > 1;
      snap.pages.forEach((pg, k) => {
        const v = s.variants[(pages[k] || {}).vi || 0] || {}, hid = v.hidden || {};
        const empty = pg.fields.filter(f => !hid[f.id] && !String(C.copyValue(f) || '').trim()).map(f => f.label);
        if (empty.length) out.push((multi ? pg.label + ': ' : '') + 'no words in ' + empty.join(', '));
      });
    } catch (e) {}
    const noPic = s.variants.map((v, vi) => vi).filter(vi => !has('adstudio-bg-' + vi));
    if (noPic.length) out.push(noPic.length === s.variants.length && s.variants.length === 1 ? 'no background photo' : 'no background photo on ' + noPic.map(lab).join(', '));
    if (s.qr && s.qr.show && !has('adstudio-qr')) out.push('the QR code is switched on but none has been added');
    try {
      const max = C.COVER_MAX || 40, over = [], names = { sq: '1:1', pt: '3:4', st: '9:16' };
      (this.renderVals().variantViews || []).forEach((vv, vi) => ['sq', 'pt', 'st'].forEach(k => {
        const c = vv && vv[k]; if (c && c.coverPct > max) over.push(lab(vi) + ' ' + names[k] + ' ' + c.coverPct + '%');
      }));
      if (over.length) out.push('copy covers more than ' + max + '% of the canvas: ' + over.join(', '));
    } catch (e) {}
    return out;
  };
  SP.rvStep = async function (act) {
    const S = this._sh; if (!S || this._rvBusy) return;
    const [a, sid] = String(act).split(':');
    if (a === 'approved') { const it = ((S.rs || {}).items || []).find(x => x.sid === (sid || S.id)); if (!window.confirm(APPROVE_Q(it && itemLabel(it)))) return; }
    // A HAND-OFF CHECKS FIRST: what would make the content team send it straight back. It never
    // blocks — the designer can send anyway — it only says what is missing before it goes.
    if (a === 'design-done' && (!sid || sid === S.id) && this.rsPrecheck) {
      const miss = this.rsPrecheck();
      if (miss.length && !window.confirm('Before it goes to the content team:\n\n' + miss.map(m => '•  ' + m).join('\n') + '\n\nSend anyway?')) return;
    }
    askNotify();
    this._rvBusy = act; this.rvRender(); this.forceUpdate();
    try {
      // the sign-off covers the latest work: whatever is waiting to save goes first
      const pend = () => S.busy || canon(this.shPub()) !== S.baseS || S.dirty.size > 0;
      for (let i = 0; i < 40 && pend(); i++) { if (!S.busy) await this.shSave(); else await new Promise(r => setTimeout(r, 250)); if (pend()) await new Promise(r => setTimeout(r, 250)); }
      const body = { act: a, p: sid || S.id, by: StudioBase.shareName() || 'Someone' };
      if (a === 'design-done') body.thumb = await this.rvThumb();
      const r = await api('rsstep', { id: S.id }, body);
      this.rsSet(r.rs);
      S.ui.flash(a === 'design-done' ? 'Sent to the content team' : a === 'copy-done' ? 'Approved' : a === 'approved' ? 'Marked approved' : 'Back in progress');
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
    S.ui.root.querySelector('.shl-panel h2').textContent = S.rs ? (S.rs.name || 'Ad set') : 'Changes';
    if (!S.rs) { sec.hidden = true; return; }
    sec.hidden = false;
    const rs = S.rs, it = this.rsItem(), auds = rsAuds(rs), all = rsOverall(auds);
    const mine = it ? auds.find(a => a.items.indexOf(it) >= 0) : null;
    S.ui.root.querySelector('.shl-sub').textContent = 'This project · ' + (it ? itemLabel(it) : 'not in the ad set');
    const main = (mine ? nowHtml(mine.steps, mine.done, mine.done ? '' : mine.now ? mine.now.sub : '') : '') +
      (it ? '<div class="rv-acts">' + itemActs(it, 'dd', this._rvBusy) + '</div>' : '') +
      '<p class="rv-sum"><span title="' + esc(all.ready ? 'Every audience is done — the package is ready for performance marketing.' : 'Audiences in this ad set that have finished every step') + '">' + (all.ready ? 'Package ready' : all.done + ' of ' + all.n + (all.n === 1 ? ' audience' : ' audiences') + ' done') + '</span>' +
      '<a href="' + esc(rsLink((rs.tok || {}).dd || '')) + '" target="_blank" rel="noopener">Open the ad set</a></p>' +
      (rs.tok ? planTodoHtml(rs, this._rsNextBusy) : '') +
      (window.Notification && Notification.permission === 'default' ? '<button type="button" class="rv-ntf" data-ntf="1" title="A Chrome notification when a step changes">Notify me of changes</button>' : '');
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

  // ══ THE AD SET TAB (CAS, 2026-10-28) ════════════════════════════════════════════════════════
  // The Copy window is gone; its place in the top bar (Ad set | Design) is this project's place in
  // its campaign. Three moves run the whole flow, and the header always offers the next one:
  //   initial setup (the ticket picked up, the words filled from Claude's reply) ·
  //   Design done (the content team checks the copy) · Create next audience (a blank canvas,
  //   filled from the same reply). Plain DOM in two empty hosts around the reply section, which
  //   stays CAS markup; React never reconciles these hosts.
  SP.adtMount = function () {
    const hosts = document.querySelectorAll('.adt-host[data-adt]');
    if (!hosts.length) return;
    hosts.forEach(el => {
      if (el._adt) return;
      el._adt = 1;
      el.addEventListener('click', e => this.adtClick(e));
    });
    this.adtRender();
    const S = this._sh;
    if (S && S.rs && (!this._adtLog || Date.now() - this._adtLog.at > 20000) && !this._adtLogBusy) this.adtLoadLog();
  };
  SP.adtLoadLog = async function () {
    const S = this._sh; if (!S || !S.rs) return;
    this._adtLogBusy = true;
    try { const r = await api('rsget', { id: S.id, full: '1' }); this._adtLog = { at: Date.now(), log: r.log || [] }; if (r.rs) this.rsSet(r.rs); }
    catch (e) { this._adtLog = { at: Date.now(), log: (this._adtLog || {}).log || [] }; }
    this._adtLogBusy = false; this.adtRender();
  };
  // the stage's action: what the designer does next on this project
  SP.adtNext = function () {
    const S = this._sh, rs = S && S.rs, it = rs ? this.rsItem() : null;
    if (!it) return null;
    const arb = it.lang === 'ARB', todo = rs.tok ? planTodo(rs) : [];
    if (!it.design) return { act: 'design-done:' + it.sid, label: arb ? 'Arabic done' : 'Design done', tip: arb ? 'Sends the Arabic to the content team to check the translation' : 'Sends this audience to the content team to check the English copy' };
    const eng = todo.find(t => t.lang === 'ENG'), ar = todo.find(t => t.lang === 'ARB' && t.market === it.market && t.aud === it.aud);
    if (!arb && ar && it.copy) return { next: [ar.market, ar.aud, 'ARB'].join('|'), label: 'Make the Arabic', tip: 'A copy of this design for ' + ar.market + ' · ' + ar.aud + ', in Arabic, to translate' };
    if (eng) return { next: [eng.market, eng.aud, 'ENG'].join('|'), label: 'Create next audience', tip: 'A blank project for ' + eng.market + ' · ' + eng.aud + ', filled from Claude’s reply' };
    if (ar) return { next: [ar.market, ar.aud, 'ARB'].join('|'), label: 'Make the Arabic', tip: 'A copy of this design for ' + ar.market + ' · ' + ar.aud + ', in Arabic, to translate' };
    return null;
  };
  SP.adtRender = function () {
    const hosts = document.querySelectorAll('.adt-host[data-adt]'); if (!hosts.length) return;
    const S = this._sh, rs = S && S.rs, it = rs ? this.rsItem() : null, busy = this._rvBusy || this._rsNextBusy;
    let top = '', bot = '';
    if (!it) {
      top = '<section class="adt adt-none"><div class="adt-h"><div class="adt-ht"><span class="adt-k">Not in a campaign</span><h2>Set up this project’s ad set</h2></div>' +
        '<div class="adt-acts"><button type="button" class="p-btn" data-a="setup" title="Names its campaign, market, audience and language, and makes the links for the content team and performance marketing">' + PICO.go.replace('<svg', '<svg class="adt-gi"') + '<span>Set up</span></button></div></div>' +
        '<p class="adt-lead">Campaigns start from New campaign on the home page. A project opened on its own joins one here.</p></section>';
    } else {
      // Claude's reply lives on the ad set: an empty tab (a new audience, another computer) takes it
      if (rs.reply && this.brRead && !this.brRead().reply && this._adtReplied !== rs.reply) { this._adtReplied = rs.reply; setTimeout(() => this.brSet('reply', rs.reply), 0); }
      const auds = rsAuds(rs), mine = auds.find(a => a.items.indexOf(it) >= 0), arb = it.lang === 'ARB';
      const nx = this.adtNext(), done = mine && mine.done;
      const back = !it.design ? null : !it.copy ? { act: 'design-open', label: 'Back to design' } : { act: 'copy-open', label: arb ? 'Reopen translation check' : 'Reopen copy check' };
      const btn = nx ? '<button type="button" class="p-btn adt-go" ' + (nx.act ? 'data-act="' + esc(nx.act) + '"' : 'data-next="' + esc(nx.next) + '"') + ' title="' + esc(nx.tip) + '"' + (busy ? ' disabled' : '') + '>' +
        '<span>' + esc(busy && (busy === nx.act || busy === nx.next) ? 'Saving…' : nx.label) + '</span>' + PICO.go + '</button>' : '';
      const now = done ? 'Done — ready to run' : mine && mine.now ? mine.now.sub : '';
      top = '<section class="adt"><div class="adt-h"><div class="adt-ht">' +
        '<span class="adt-k">' + esc([rs.name, PRODUCT_NAME[rs.product]].filter(Boolean).join(' · ')) + '</span>' +
        '<h2>' + esc([it.market, it.aud].filter(Boolean).join(' · ') || 'This project') + ' <s>' + (arb ? 'Arabic' : 'English') + '</s></h2>' +
        '<p class="adt-now" data-s="' + (done ? 'done' : 'prog') + '"><i></i>' + esc(now) + '</p></div>' +
        '<div class="adt-acts">' + (rs.tok && rs.tok.dd && !it.copy ? '<button type="button" class="adt-q" data-act="approved:' + esc(it.sid) + '" title="For an ad already signed off outside the review: marks it approved without the content team"' + (busy ? ' disabled' : '') + '>Already approved</button>' : '') +
        (back ? '<button type="button" class="adt-q" data-act="' + back.act + ':' + esc(it.sid) + '"' + (busy ? ' disabled' : '') + '>' + esc(back.label) + '</button>' : '') +
        '<button type="button" class="p-ghost adt-ov" data-a="overview" title="Every audience and language of the campaign, rendered from the latest work">' + PICO.img.replace('<svg', '<svg class="adt-gi"') + '<span>Overview</span></button>' + btn + '</div></div>' +
        (mine ? stepperHtml(mine.steps, false, true) : '') + '</section>';
      // the campaign's audiences: each planned cell, with its progress; the designer sets them here
      const cells = planCells(planOf(rs)), byK = {};
      auds.forEach(a => { byK[a.market + '|' + a.aud] = a; });
      const keys = cells.map(c => c.market + '|' + c.aud);
      auds.forEach(a => { if (keys.indexOf(a.key) < 0 && a.market) { keys.push(a.key); cells.push({ market: a.market, aud: a.aud, arb: !a.engOnly }); } });
      const dd = !!(rs.tok && rs.tok.dd);
      const tiles = cells.map(c => {
        const k = c.market + '|' + c.aud, a = byK[k], me = mine && mine.key === k, st = a ? (a.done ? 'Done' : a.now ? a.now.label : '') : 'To make';
        return '<li class="adt-au"' + (me ? ' data-me="1"' : '') + (a && a.done ? ' data-done="1"' : '') + '><div class="adt-au-t"><s>' + esc(c.market) + '</s><b>' + esc(c.aud) + '</b></div>' +
          '<span class="adt-au-s">' + (me ? 'This project' : esc(st)) + '</span>' + (a ? segHtml(a.steps) : '<span class="rv-seg rv-seg-e"></span>') +
          (dd ? '<button type="button" class="rsp-l rsp-ar" aria-pressed="' + !!c.arb + '" data-arb="' + esc(k) + '" title="' + (c.arb ? 'Arabic version planned — click for English only' : 'English only — click to plan an Arabic version') + '">AR</button>' : '') + '</li>';
      }).join('');
      const tg = (g, v) => { const cur = g === 'markets' ? [...new Set(cells.map(c => c.market))] : [...new Set(cells.map(c => c.aud))], on = cur.indexOf(v) >= 0;
        return '<button type="button" class="rsp-t" aria-pressed="' + on + '" data-tg="' + g + '" data-v="' + esc(v) + '">' + (on ? PICO.tick : '') + esc(v) + '</button>'; };
      const audCard = '<section class="adt-card"><div class="adt-ch"><h3>Audiences <s>' + cells.length + '</s></h3>' +
        (dd ? '<button type="button" class="adt-ed adt-set" data-a="settings" title="The campaign’s name, product, deadline, brief, markets, audiences and Arabic">' + PICO.tune + '<span>Ad set settings</span></button>' : '') +
        '</div><ul class="adt-aus">' + (tiles || '<li class="shl-empty">No audiences planned.</li>') + '</ul></section>';
      const log = ((this._adtLog || {}).log || []).concat((S.log || []).filter(e => (e.changes || []).some(c => c.kind !== 'note'))).sort((a, b) => b.at - a.at);
      const act = '<section class="adt-card"><div class="adt-ch"><h3>Activity <s>' + log.length + '</s></h3></div><ol class="shl-list adt-log">' +
        (log.length ? log.slice(0, 60).map((e, i, l) => logEntryHtml(e, { max: 8, cont: logCont(l[i - 1], e), mine: e.by === StudioBase.shareName() })).join('') : '<li class="shl-empty">Nothing yet.</li>') + '</ol></section>';
      const links = dd ? '<details class="adt-card adt-lk"><summary class="adt-ch"><h3>Links for the teams</h3>' + PICO.more + '</summary><div class="rv-lks">' + linkRows(rs.tok) + '</div>' +
        (/^https?:\/\//.test(rs.drive || '') ? '<a class="adt-drv" href="' + esc(rs.drive) + '" target="_blank" rel="noopener">' + PICO.folder + '<span>Drive folder</span></a>' : '') + '</details>' : '';
      bot = audCard + briefHtml(rs.ticket) + act + links;
    }
    hosts.forEach(el => {
      const html = el.dataset.adt === 'top' ? top : bot;
      if (el._h === html) return;
      const open = [...el.querySelectorAll('details')].map(x => x.open);
      el._h = html; el.innerHTML = html;
      el.querySelectorAll('details').forEach((x, i) => { if (open[i]) x.open = true; });
    });
  };
  SP.adtClick = async function (e) {
    const b = e.target.closest('button'); if (!b) return;
    const S = this._sh, rs = S && S.rs;
    if (b.dataset.copy) { const ok = await copyText(b.dataset.copy); b.textContent = ok ? 'Copied' : 'Select it'; setTimeout(() => { b.textContent = 'Copy'; }, 1600); return; }
    if (b.dataset.a === 'setup') return this.reviewCreate();
    if (b.dataset.a === 'overview') return this.rsOverview();
    if (b.dataset.a === 'settings' && rs && rs.tok) {
      const by = StudioBase.shareName() || 'Designer';
      const r = await rsSettings(rs, p => rsSettingsSave(S.id, rs, p, by));
      if (r) { this.rsSet(r); this.adtRender(); S.ui.flash('Ad set settings saved'); }
      return;
    }
    if (b.dataset.act) return this.rvStep(b.dataset.act);
    if (b.dataset.next) return this.rsNext(b.dataset.next);
    if (!rs || !rs.tok) return;
    // the designer's settings: the planned audiences and their Arabic
    let cells = planCells(planOf(rs)).map(c => Object.assign({}, c));
    rsAuds(rs).forEach(a => { if (a.market && !cells.some(c => c.market === a.market && c.aud === a.aud)) cells.push({ market: a.market, aud: a.aud, arb: !a.engOnly }); });
    if (b.dataset.arb) { const c = cells.find(x => x.market + '|' + x.aud === b.dataset.arb); if (c) c.arb = !c.arb; }
    else if (b.dataset.tg) {
      const g = b.dataset.tg, v = b.dataset.v, ms = [...new Set(cells.map(c => c.market))], as = [...new Set(cells.map(c => c.aud))];
      const list = g === 'markets' ? ms : as, on = list.indexOf(v) >= 0;
      if (on && list.length === 1) { S.ui.flash(g === 'markets' ? 'Keep at least one market.' : 'Keep at least one audience.'); return; }
      const has = c => rsAuds(rs).some(a => a.market === c.market && a.aud === c.aud);
      if (on) {
        const drop = cells.filter(c => (g === 'markets' ? c.market : c.aud) === v);
        if (drop.some(has)) { S.ui.flash('That audience already has a project — remove the project first.'); return; }
        cells = cells.filter(c => drop.indexOf(c) < 0);
      } else {
        const nm = g === 'markets' ? MARKETS.filter(m => m === v || ms.indexOf(m) >= 0) : ms, na = g === 'auds' ? (AUDS[rs.product] || []).filter(a => a === v || as.indexOf(a) >= 0) : as;
        const out = []; nm.forEach(m => na.forEach(a => out.push(cells.find(c => c.market === m && c.aud === a) || { market: m, aud: a, arb: false })));
        cells = out;
      }
    } else return;
    b.disabled = true;
    try { const r = await api('rsset', { id: S.id }, { by: StudioBase.shareName() || 'Designer', plan: cells }); this.rsSet(r.rs); }
    catch (er) { S.ui.flash(er.message || String(er)); }
    this.adtRender();
  };
  // Claude's reply is kept on the ad set, so the next audience — or another designer — fills from it
  SP.rsReplySave = function (v) {
    const S = this._sh; if (!S || !S.rs || !(S.rs.tok && S.rs.tok.dd)) return;
    clearTimeout(this._rsReplyT);
    this._rsReplyT = setTimeout(async () => {
      try { const r = await api('rsset', { id: S.id }, { by: StudioBase.shareName() || 'Designer', reply: String(v || '') }); this._adtReplied = r.rs && r.rs.reply; this.rsSet(r.rs); } catch (e) {}
    }, 1500);
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
    if (!StudioBase.shareWho()) lsSet(NAME_KEY, ans.by);
    const label = itemLabel({ market: ans.market, aud: ans.aud, lang: ans.lang });
    const rejoined = async (rs, sid) => {
      dlg.busy('Reconnecting…');
      if (this._sh) this.shareStop(true);
      if (!(await this.shRejoin(sid, true))) { dlg.fail('This project is already ' + label + ' in ' + (rs.name || 'the ad set') + ', but it could not reconnect — open it from Review links.', 'Close'); return; }
      if (rs.tok && rs.tok.dd) Arch.add(rs.tok.dd, rs.name, rs.product);
      dlg.links(rs, 'This project is already ' + label + ' in ' + (rs.name || 'the ad set') + ' — it is reconnected, so your changes reach the review link again. The links are the same:');
    };
    if (ans.mode === 'add' && ans.dd) {
      try {
        const g = await api('rsget', { id: ans.dd });
        const rsx = g.rs || {}, taken = (rsx.items || []).find(x => x.market === ans.market && x.aud === ans.aud && x.lang === ans.lang);
        if (taken) {
          let pid = '';
          try { pid = (((await api('get', { id: ans.dd, p: taken.sid })) || {}).state || {}).pid || ''; } catch (e) {}
          if (pid && pid === this.state.pid) { await rejoined(rsx, taken.sid); return; }
          dlg.fail(label + ' is already in ' + (rsx.name || 'the ad set') + ' as another project. Pick another audience or language, or open that project from Review links.', 'Close');
          return;
        }
      } catch (e) { if (e && e.gdAuth) { /* signed out: the path below signs in and checks again */ } }
    }
    // A new ad set, or one that lives on Drive: its folder holds everything (see dsApi).
    if (drive && (ans.mode === 'new' || isDs(ans.dd))) {
      try {
        dlg.busy('Signing in to Google…');
        await window.providentDrive.signIn();   // first: the popup needs the click
        if (ans.folder) lsSet('provident-rs-folder', ans.folder);
        if (this._sh) this.shareStop(true);
        const rs = await this.dsReview(dlg, ans);
        if (rs.rejoin) { await rejoined(rs, rs.rejoin); return; }
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
      const dlg = nameDialog({ title: role === 'ct' ? 'Check the copy' : role === 'pm' ? 'Ad set package' : 'Your ad set', btn: 'Open', auto: true,
        lead: '<b>' + esc(rs.name || 'Ad set') + '</b> · ' + (rs.items || []).length + ((rs.items || []).length === 1 ? ' project' : ' projects') + '. ' +
          (role === 'ct' ? 'You see the words of every project beside its images. Change them as needed — the images update as you type — then approve the English copy, and later the translation, for each audience.'
            : role === 'pm' ? 'You see every project’s images, rendered from the latest work. Each audience can be downloaded when it is done; the whole set is Package ready when every audience is. You cannot change the projects from this link.'
              : 'The designer’s overview: every project, its status, and a link to open each in the full studio.'),
        note: role === 'pm' ? 'Your name shows who looked at the package.' : 'Your name is shown beside every change you make.' });
      const name = await dlg.name();
      if (!name) return;
      if (!StudioBase.shareWho()) lsSet(NAME_KEY, name);
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
          this.thumbFor(sid);
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
  // A save from the ad set link changes a project the designer may not have open, so the
  // preview on Review links is redrawn here too: that project's own state and photos.
  RV.thumbFor = async function (sid) {
    const p = this.proj[sid]; if (!p || this.embed || this.role === 'pm') return;
    const now = Date.now(); if (now - (p.thumbAt || 0) < 5000) { p.thumbDue = true; return; }
    p.thumbAt = now; p.thumbDue = false;
    try {
      const th = await this.eng.rvThumb(p.st, await this.photos(sid));
      if (th) await api('thumb', { id: this.tok, p: sid }, { thumb: th, sum: this.eng.rvSum(p.st) });
    } catch (e) { p.thumbDue = true; }
    if (p.thumbDue) setTimeout(() => { if (this.proj[sid] && this.proj[sid].thumbDue) this.thumbFor(sid); }, 5200);
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
    if (this.polling || this.busy) return;
    // in the background: only the steps (for the notification), every 45s, no project pulls
    const bg = !force && document.hidden;
    if (bg && Date.now() - (this.hidPoll || 0) < 45000) return;
    if (bg) this.hidPoll = Date.now();
    this.polling = true;
    try {
      const d = await api('rsget', { id: this.tok });
      if (bg) { if (canon(d.rs) !== canon(this.rs)) { notifySteps(this.rs, d.rs, this.ui); this.rsBg = true; } return; }
      if (d.ln !== this.ln) { const f = await api('rsget', { id: this.tok, full: '1' }); this.rlog = f.log || []; this.ln = f.ln; }
      if (canon(d.rs) !== canon(this.rs)) {
        if (!this.rsBg) notifySteps(this.rs, d.rs, this.ui);
        this.rsBg = false;
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
    if (a === 'approved') { const it = ((this.rs || {}).items || []).find(x => x.sid === sid); if (!window.confirm(APPROVE_Q(it && itemLabel(it)))) return; }
    askNotify();
    this.stepBusy = act; this.panelRender(true);
    try {
      // the approval covers the words just typed: a pending save goes first
      for (let i = 0; i < 40 && (this.busy || (this.proj[sid] && this.proj[sid].pend)); i++) { if (!this.busy) await this.save(sid); else await new Promise(r => setTimeout(r, 250)); }
      const r = await api('rsstep', { id: this.tok }, { p: sid, act: a, by: StudioBase.shareName() || 'Someone' });
      this.rs = r.rs;
      this.ui.flash(a === 'copy-done' ? 'Approved' : a === 'approved' ? 'Marked approved' : a === 'design-done' ? 'Marked done' : 'Back in progress');
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
    sec.hidden = false;
    const rs = this.rs, auds = rsAuds(rs), all = rsOverall(auds), role = this.role, busy = this.stepBusy, cur = this.selItem();
    const np = (rs.items || []).length;
    this.ui.root.querySelector('.shl-panel h2').textContent = rs.name || 'Ad set';
    this.ui.root.querySelector('.shl-sub').textContent = [ROLE_NAME[role], PRODUCT_NAME[rs.product], np + (np === 1 ? ' project' : ' projects')].filter(Boolean).join(' · ');
    const lead = role === 'ct' ? 'Pick a project on the left, change its words, then approve it here. The English copy comes first; the Arabic version is checked once the designer has laid it out.'
      : role === 'pm' ? 'Each audience can be downloaded from the bar above as soon as it is done.'
        : 'Open a project to design it. Add each other audience and language from its own project: Share › Ad set review › Add to an ad set.';
    // one audience whose only project is the one on screen: the card already says it all
    const solo = role === 'ct' && cur && auds.length === 1 && auds[0].items.length === 1;
    const audRow = a => '<li class="rs-a' + (cur && a.items.indexOf(cur) >= 0 ? ' rs-on' : '') + '"><div class="rs-ah" title="' + esc(a.done ? 'Ready to run' : a.now ? a.now.sub : '') + '"><b>' + esc(a.label) + '</b>' +
      '<span class="rs-st" data-s="' + (a.done ? 'done' : 'prog') + '">' + esc(a.done ? 'Done' : a.now ? a.now.label : '') + '</span></div>' + segHtml(a.steps) +
      (role !== 'pm' ? '<div class="rs-its">' + a.items.map(it => '<div class="rs-it"><span>' + esc(it.lang || 'ENG') + '</span>' + itemActs(it, role, busy) +
        (role === 'dd' ? '<a class="p-ghost" href="' + esc(rsLink(it.sid)) + '" target="_blank" rel="noopener">Open</a>' : '') + '</div>').join('') +
        (role === 'dd' && !a.arb ? '<label class="rs-eo"><input type="checkbox" data-eo="' + esc(a.market + '|' + a.aud) + '"' + (a.engOnly ? ' checked' : '') + '> No Arabic for this audience</label>' : '') + '</div>' : '') + '</li>';
    const curNote = cur && cur.lang === 'ARB' && !cur.design ? 'The designer is still laying out the Arabic. You can edit it; approve it once it is marked laid out.' : '';
    const html = nowHtml(all.steps, all.ready, lead + (auds.length > 1 ? ' ' + all.done + ' of ' + all.n + ' audiences done.' : '')) +
      (cur && role === 'ct' ? '<div class="rs-cur"><span class="rv-k">On screen</span><div class="rs-cur-t"><b>' + esc(itemLabel(cur)) + '</b>' + infoHtml(curNote) + '</div><div class="rv-acts">' + itemActs(cur, role, busy) + '</div></div>' : '') +
      (solo ? '' : '<div class="rs-sec"><h3 class="rs-h">Audiences <s>' + auds.length + '</s></h3><ul class="rs-auds">' + (auds.length ? auds.map(audRow).join('') : '<li class="shl-empty">No projects yet.</li>') + '</ul></div>') +
      (window.Notification && Notification.permission === 'default' ? '<button type="button" class="rv-ntf" data-ntf="1" title="A Chrome notification when a step changes">Notify me of changes</button>' : '');
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
      const b = e.target.closest('[data-dl],[data-det],[data-x],[data-ntf]');
      if (e.target === dlg) { dlg.close(); return; }          // a click on the backdrop
      if (!b) return;
      if (b.dataset.dl) this.download(b.dataset.dl);
      if (b.dataset.det) { this.barRender(); dlg.showModal(); }
      if (b.dataset.ntf) askNotify().then(() => { this._barH = ''; this.barRender(); });
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
    // a widget under the audience's header in the Ad sets pane, the setup widget's shape:
    // a header band (the package and where it stands), the steps, then the actions
    const html = '<div class="rvh-in"><div class="rvh-wh"><div class="rvh-t"><span class="rvh-k">Ad set package' + (rs.product ? ' · ' + esc(PRODUCT_NAME[rs.product] || '') : '') + '</span><b>' + esc(rs.name || 'Ad set') + '</b>' +
      '<s>' + esc(all.ready ? 'Every audience is ready to run' : all.done + ' of ' + all.n + (all.n === 1 ? ' audience' : ' audiences') + ' ready to run') + '</s></div>' + pillHtml(all.ready) + '</div>' +
      '<div class="rvh-wb">' + mini + '</div><div class="rvh-a">' + (window.Notification && Notification.permission === 'default' ? '<button type="button" class="p-ghost rvh-ntf" data-ntf="1" title="A Chrome notification when an audience moves on">Notify me</button>' : '') +
      '<button type="button" class="p-ghost rvh-det" data-det="1">See details</button>' + dlBtn + '</div></div>';
    if (html !== this._barH) { this._barH = html; el.innerHTML = html; }
    // it lives in the pane's empty host (React gives that host no children); the pane can be
    // drawn again, so the widget is moved back in whenever its host changes
    const host = document.querySelector('[data-rvh-host]');
    if (host && el.parentNode !== host) host.appendChild(el);
    else if (!host && el.parentNode !== document.body) document.body.appendChild(el);
    // the details window: everything the bar leaves out
    const dlg = this.dlg; if (!dlg) return;
    const meta = [PRODUCT_NAME[rs.product], 'Created ' + day(rs.created) + (rs.by ? ' by ' + String(rs.by).split(' ')[0] : '')].filter(Boolean).join(' · ');
    const audCard = a => '<li data-s="' + (a.done ? 'done' : 'prog') + '"><div class="rvh-ah"><div><b>' + esc(a.label) + '</b><s>' + esc(a.done ? 'Ready to run' : a.now ? a.now.sub : '') + '</s></div>' +
      (a.done ? '<button type="button" class="p-ghost" data-dl="' + esc(a.key) + '"' + (busy ? ' disabled' : '') + '>' + (busy === a.key ? 'Zipping…' : 'Download') + '</button>' : '') + '</div>' +
      stepperHtml(a.steps, false, true) + '</li>';
    const det = '<header class="rvh-dh"><div><h2>' + esc(rs.name || 'Ad set') + '</h2><p class="rvh-sub">' + esc(meta) + '</p></div>' +
      '<div class="rvh-dhr">' + pillHtml(all.ready) + '<button type="button" class="p-ghost rvh-x" data-x="1" aria-label="Close">×</button></div></header>' +
      '<div class="rvh-db">' +
      (auds.length > 1 ? '<section class="rvh-ov">' + nowHtml(all.steps, all.ready, all.done + ' of ' + all.n + ' audiences done' + (all.ready ? ' · ready ' + day(all.at) : '')) + '</section>' : '') +
      '<section>' + (auds.length > 1 ? '<h3>Audiences <s>' + auds.length + '</s></h3>' : '') + (auds.length ? '<ul class="rvh-al">' + auds.map(audCard).join('') + '</ul>' : '<p class="rvh-none">No audiences yet.</p>') + '</section></div>' +
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
    mount(eng) { document.querySelectorAll('[data-rv-arch]').forEach(el => { if (!el._rva) el._rva = new ArchView(el, eng); }); },
    // the Home page's subtitle: how many campaigns are open tickets, in design, ready to run —
    // the counts Status last read, refreshed in the background (never with a sign-in prompt)
    summary() { try { return JSON.parse(localStorage.getItem(SUM_KEY) || 'null'); } catch (e) { return null; } },
    async refreshSum(eng) {
      const s = this.summary(), ids = this.list().map(x => x.id);
      if (!ids.length || this._sumBusy || (s && Date.now() - (s.at || 0) < 120000)) return;
      const D = window.providentDrive;
      if (ids.some(isDs) && !(D && D.valid && D.valid())) return;
      this._sumBusy = true;
      try { const out = []; for (let i = 0; i < ids.length; i += 50) out.push(...((await api('rsinfo', { ids: ids.slice(i, i + 50).join(',') })).items || [])); statusSave(out, eng); }
      catch (e) {}
      this._sumBusy = false;
    }
  };
  const SUM_KEY = 'provident-status-sum';
  function statusSave(items, eng) {
    const live = (items || []).filter(x => !x.gone && x.rs);
    const open = live.filter(x => isOpen(x.rs)).length, ready = live.filter(x => !isOpen(x.rs) && rsOverall(rsAuds(x.rs)).ready).length;
    lsSet(SUM_KEY, JSON.stringify({ open, design: live.length - open - ready, ready, at: Date.now() }));
    try { if (eng && eng.host) eng.host.forceUpdate(); } catch (e) {}
  }
  window.providentReviews = Arch;

  // ---- THE HOME PAGE'S CAMPAIGN SETUP: the ad set, defined before the first design ----
  // Quick: a name, the product and the Drive folder. More settings: the markets, the
  // audiences and which of them get an Arabic version — not every campaign runs abroad or
  // in Arabic, so the defaults are Local, both audiences, English only. The draft is kept on
  // this computer, so a half-set-up campaign survives a reload. "Start the campaign" opens a
  // new project which then makes the ad set from the plan (rsPlanCheck).
  const Plan = {
    mount(eng) { document.querySelectorAll('[data-rs-plan]').forEach(el => { if (!el._rsp) el._rsp = new PlanView(el, eng); Arch.refreshSum(eng); }); }
  };
  function planDraft() {
    let d = null; try { d = JSON.parse(lsGet(PLAN_KEY) || 'null'); } catch (e) {}
    d = Object.assign({ name: '', product: 'residential', folder: '', deadline: '', brief: '', markets: ['Local'], auds: null, arb: {}, open: false }, d || {});
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
    set: '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M212.31-140Q182-140 161-161q-21-21-21-51.31v-535.38Q140-778 161-799q21-21 51.31-21h535.38Q778-820 799-799q21 21 21 51.31v535.38Q820-182 799-161q-21 21-51.31 21H212.31Zm0-60h535.38q4.62 0 8.46-3.85 3.85-3.84 3.85-8.46V-620H200v407.69q0 4.62 3.85 8.46 3.84 3.85 8.46 3.85ZM200-680h560v-67.69q0-4.62-3.85-8.46-3.84-3.85-8.46-3.85H212.31q-4.62 0-8.46 3.85-3.85 3.84-3.85 8.46V-680Zm0 0v-80 80Z"/></svg>',
    attach: '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M706.92-334.23q0 97.44-67.81 165.83-67.8 68.4-165.07 68.4t-165.27-68.4q-68-68.39-68-165.83v-359.62q0-69.23 48.08-117.69Q336.92-860 406.15-860q69.23 0 117.31 48.46t48.08 117.69v340.39q0 40.61-28.29 69.34-28.3 28.73-68.96 28.73-40.67 0-69.4-28.53-28.73-28.53-28.73-69.54v-321.15q0-12.75 8.62-21.38 8.63-8.62 21.39-8.62 12.75 0 21.37 8.62 8.61 8.63 8.61 21.38v321.15q0 16.08 10.81 27.08t26.89 11q16.07 0 26.88-11 10.81-11 10.81-27.08v-340.77q-.62-44.31-30.85-75.04Q450.46-800 406.19-800q-44.28 0-74.85 30.92-30.57 30.93-30.57 75.23v359.62q-.62 72.54 50.15 123.38Q401.69-160 474.18-160q71.46 0 121.49-50.85 50.02-50.84 51.25-123.38v-340.38q0-12.75 8.63-21.38 8.63-8.62 21.39-8.62 12.75 0 21.37 8.62 8.61 8.63 8.61 21.38v340.38Z"/></svg>',
    ticket: '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M172.31-180q-29.83 0-51.07-21.24Q100-222.48 100-252.31v-109.61q0-9.85 5.66-17.46 5.65-7.62 15.11-10.39 26.31-12.23 42.77-36.32Q180-450.19 180-480.02t-16.46-53.9q-16.46-24.08-42.77-36.31-9.46-2.77-15.11-10.39-5.66-7.61-5.66-17.46v-109.61q0-29.83 21.24-51.07Q142.48-780 172.31-780h615.38q29.83 0 51.07 21.24Q860-737.52 860-707.69v109.61q0 9.85-5.66 17.46-5.65 7.62-15.11 10.39-26.31 12.23-42.77 36.32Q780-509.81 780-479.98t16.46 53.9q16.46 24.08 42.77 36.31 9.46 2.77 15.11 10.39 5.66 7.61 5.66 17.46v109.61q0 29.83-21.24 51.07Q817.52-180 787.69-180H172.31Zm0-60h615.38q5.39 0 8.85-3.46t3.46-8.85V-342q-37-22-58.5-58.5T720-480q0-43 21.5-79.5T800-618v-89.69q0-5.39-3.46-8.85t-8.85-3.46H172.31q-5.39 0-8.85 3.46t-3.46 8.85V-618q37 22 58.5 58.5T240-480q0 43-21.5 79.5T160-342v89.69q0 5.39 3.46 8.85t8.85 3.46Zm307.7-53.85q12.76 0 21.37-8.63 8.62-8.62 8.62-21.38t-8.63-21.37q-8.63-8.62-21.38-8.62-12.76 0-21.37 8.63-8.62 8.63-8.62 21.39 0 12.75 8.63 21.37 8.63 8.61 21.38 8.61Zm0-156.15q12.76 0 21.37-8.63 8.62-8.63 8.62-21.38 0-12.76-8.63-21.37-8.63-8.62-21.38-8.62-12.76 0-21.37 8.63-8.62 8.63-8.62 21.38 0 12.76 8.63 21.37 8.63 8.62 21.38 8.62Zm0-156.15q12.76 0 21.37-8.63 8.62-8.63 8.62-21.39 0-12.75-8.63-21.37-8.63-8.61-21.38-8.61-12.76 0-21.37 8.63-8.62 8.62-8.62 21.38t8.63 21.37q8.63 8.62 21.38 8.62ZM480-480Z"/></svg>',
    img: '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M212.31-140Q182-140 161-161q-21-21-21-51.31v-535.38Q140-778 161-799q21-21 51.31-21h535.38Q778-820 799-799q21 21 21 51.31v535.38Q820-182 799-161q-21 21-51.31 21H212.31Zm0-60h535.38q4.62 0 8.46-3.85 3.85-3.84 3.85-8.46v-535.38q0-4.62-3.85-8.46-3.84-3.85-8.46-3.85H212.31q-4.62 0-8.46 3.85-3.85 3.84-3.85 8.46v535.38q0 4.62 3.85 8.46 3.84 3.85 8.46 3.85ZM200-200v-560 560Zm106.16-90h350.76q10.85 0 16.08-9.85 5.23-9.84-1.62-19.07L576-446.69q-5.62-7.23-14.46-7.23-8.85 0-14.46 7.23l-97.85 127.46-65.54-84q-5.61-6.85-14.27-6.85-8.65 0-14.27 7.24l-63.07 83.92q-7.23 9.23-2 19.07 5.23 9.85 16.08 9.85Z"/></svg>',
    doc: '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M360-250h240q12.77 0 21.38-8.62Q630-267.23 630-280t-8.62-21.38Q612.77-310 600-310H360q-12.77 0-21.38 8.62Q330-292.77 330-280t8.62 21.38Q347.23-250 360-250Zm0-160h240q12.77 0 21.38-8.62Q630-427.23 630-440t-8.62-21.38Q612.77-470 600-470H360q-12.77 0-21.38 8.62Q330-452.77 330-440t8.62 21.38Q347.23-410 360-410ZM252.31-100Q222-100 201-121q-21-21-21-51.31v-615.38Q180-818 201-839q21-21 51.31-21h287.77q14.46 0 27.81 5.62 13.34 5.61 23.19 15.46l167.84 167.84q9.85 9.85 15.46 23.19 5.62 13.35 5.62 27.81v447.77Q780-142 759-121q-21 21-51.31 21H252.31ZM540-656.16V-800H252.31q-4.62 0-8.46 3.85-3.85 3.84-3.85 8.46v615.38q0 4.62 3.85 8.46 3.84 3.85 8.46 3.85h455.38q4.62 0 8.46-3.85 3.85-3.84 3.85-8.46V-620H576.16q-15.47 0-25.81-10.35Q540-640.69 540-656.16ZM240-800v180-180V-160v-640Z"/></svg>',
    x: '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M480-437.85 277.08-234.92q-8.31 8.3-20.89 8.5-12.57.19-21.27-8.5-8.69-8.7-8.69-21.08 0-12.38 8.69-21.08L437.85-480 234.92-682.92q-8.3-8.31-8.5-20.89-.19-12.57 8.5-21.27 8.7-8.69 21.08-8.69 12.38 0 21.08 8.69L480-522.15l202.92-202.93q8.31-8.3 20.89-8.5 12.57-.19 21.27 8.5 8.69 8.7 8.69 21.08 0 12.38-8.69 21.08L522.15-480l202.93 202.92q8.3 8.31 8.5 20.89.19 12.57-8.5 21.27-8.7 8.69-21.08 8.69-12.38 0-21.08-8.69L480-437.85Z"/></svg>',
    link: '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M281.54-298.46q-75.34 0-128.44-53.1Q100-404.65 100-479.98q0-75.33 53.1-128.44 53.1-53.12 128.44-53.12h120.77q12.75 0 21.37 8.63 8.63 8.63 8.63 21.39 0 12.75-8.63 21.37-8.62 8.61-21.37 8.61H281.49q-50.34 0-85.91 35.58Q160-530.38 160-480q0 50.38 35.58 85.96 35.57 35.58 85.91 35.58h120.82q12.75 0 21.37 8.63 8.63 8.63 8.63 21.38 0 12.76-8.63 21.37-8.62 8.62-21.37 8.62H281.54ZM360-450q-12.75 0-21.37-8.63-8.63-8.63-8.63-21.38 0-12.76 8.63-21.37Q347.25-510 360-510h240q12.75 0 21.37 8.63 8.63 8.63 8.63 21.38 0 12.76-8.63 21.37Q612.75-450 600-450H360Zm197.69 151.54q-12.75 0-21.37-8.63-8.63-8.63-8.63-21.39 0-12.75 8.63-21.37 8.62-8.61 21.37-8.61h120.82q50.34 0 85.91-35.58Q800-429.62 800-480q0-50.38-35.58-85.96-35.57-35.58-85.91-35.58H557.69q-12.75 0-21.37-8.63-8.63-8.63-8.63-21.38 0-12.76 8.63-21.37 8.62-8.62 21.37-8.62h120.77q75.34 0 128.44 53.1Q860-555.35 860-480.02q0 75.33-53.1 128.44-53.1 53.12-128.44 53.12H557.69Z"/></svg>',
    send: '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="m748.92-446.46-558.3 235.38q-18.08 7.23-34.35-3.11Q140-224.54 140-244.23v-471.54q0-19.69 16.27-30.04 16.27-10.34 34.35-3.11l558.3 235.38q22.31 9.85 22.31 33.54 0 23.69-22.31 33.54ZM200-280l474-200-474-200v147.69L416.92-480 200-427.69V-280Zm0 0v-400 400Z"/></svg>',
    event: '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M522.27-266.88q-26.88-26.89-26.88-65.43 0-38.54 26.88-65.42 26.88-26.88 65.42-26.88 38.54 0 65.43 26.88Q680-370.85 680-332.31q0 38.54-26.88 65.43Q626.23-240 587.69-240q-38.54 0-65.42-26.88ZM212.31-100Q182-100 161-121q-21-21-21-51.31v-535.38Q140-738 161-759q21-21 51.31-21h55.38v-53.85q0-13.15 8.81-21.96 8.81-8.8 21.96-8.8 13.16 0 21.96 8.8 8.81 8.81 8.81 21.96V-780h303.08v-54.61q0-12.77 8.61-21.39 8.62-8.61 21.39-8.61 12.77 0 21.38 8.61 8.62 8.62 8.62 21.39V-780h55.38Q778-780 799-759q21 21 21 51.31v535.38Q820-142 799-121q-21 21-51.31 21H212.31Zm0-60h535.38q4.62 0 8.46-3.85 3.85-3.84 3.85-8.46v-375.38H200v375.38q0 4.62 3.85 8.46 3.84 3.85 8.46 3.85ZM200-607.69h560v-100q0-4.62-3.85-8.46-3.84-3.85-8.46-3.85H212.31q-4.62 0-8.46 3.85-3.85 3.84-3.85 8.46v100Zm0 0V-720v112.31Z"/></svg>',
    folder: '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M170-180q-29.15 0-49.58-20.42Q100-220.85 100-250v-457.69q0-29.15 21.58-50.73T172.31-780H362q14.46 0 27.81 5.62 13.34 5.61 23.19 15.46L471.92-700h354.62q12.77 0 21.38 8.62 8.62 8.61 8.62 21.38t-8.62 21.38q-8.61 8.62-21.38 8.62H447.38l-80-80H172.31q-5.39 0-8.85 3.46t-3.46 8.85V-240q0-5.39 2.12-4.04 2.11 1.35 5.57 3.27l77.85-259.92q7.23-23.31 26.61-37.46 19.39-14.16 43.08-14.16h514.46q36.77 0 58.35 29.23 21.57 29.23 11.34 63.77l-68.92 229.62q-6.85 22.53-25.65 36.11Q786-180 763.08-180H170Zm60.54-60h531q4.23 0 7.5-2.31 3.27-2.31 4.42-6.54l68.16-227.69q1.92-6.15-1.93-10.96-3.84-4.81-10-4.81H315.23q-4.23 0-7.5 2.31-3.27 2.31-4.42 6.54L230.54-240ZM160-500.08V-720-500.08ZM230.54-240l72.77-243.46q1.15-4.23 1.92-6.54l.77-2.31-1.35 4.81q-1.34 4.81-3.27 10.96l-68.15 227.69q-1.15 4.23-1.92 6.54l-.77 2.31Z"/></svg>'
  };
  function PlanView(el, eng) {
    injectCss();
    this.el = el; this.eng = eng; this.d = planDraft(); this.drive = dsOn(); this.files = [];
    const d = this.d;
    // NEW CAMPAIGN (2026-10-28). One form for both ways a campaign starts: performance marketing
    // FILES IT AS A TICKET (the raw material, for a designer to pick up from Status), or the
    // designer STARTS DESIGNING at once (the same ticket, picked up in the same click).
    // Hierarchy: what this is, then the three facts every campaign needs, then the raw material,
    // then who it is for. Explanations live in tooltips.
    el.innerHTML = '<section class="rsp" aria-labelledby="rsp-t">' +
      '<header class="rsp-h">' +
        '<span class="rsp-fig" data-hl="riffle" aria-hidden="true"></span>' +
        '<div class="rsp-ht"><span class="rsp-k">New campaign</span><h2 id="rsp-t">Set up the campaign</h2>' +
        '<p>File it as a ticket, or start designing now.</p></div>' +
      '</header>' +
      '<div class="rsp-body">' +
        '<div class="rsp-q">' +
          '<label class="rsp-f"><span>Name</span><input class="p-in" data-f="name" maxlength="120" placeholder="Campaign or project name" autocomplete="off"></label>' +
          '<div class="rsp-f"><span id="rsp-prod-l">Product</span><div class="p-tabs rsp-prod" role="radiogroup" aria-labelledby="rsp-prod-l"></div></div>' +
          '<label class="rsp-f"><span>Deadline</span><input class="p-in" type="date" data-f="deadline"></label>' +
        '</div>' +
        '<label class="rsp-f rsp-fw"><span>Drive folder <i class="rsp-i" title="The Google Drive folder the campaign lives in: the ticket, the files, then one folder per market, audience and language. Everyone who opens it signs in with their Provident Google account.">i</i></span>' +
          '<input class="p-in" data-f="folder" placeholder="Paste the folder link" autocomplete="off"></label>' +
        '<div class="rsp-raw">' +
          '<label class="rsp-f"><span>Brief</span><textarea class="p-in" data-f="brief" rows="4" placeholder="Paste the script, fact sheet or WhatsApp brief"></textarea></label>' +
          '<div class="rsp-f"><span>Files <i class="rsp-i" title="Renders, logos, brochures (PDF). Saved into the folder’s Brief/ for the designer.">i</i></span>' +
            '<div class="rsp-files"><label class="rsp-add">' + PICO.attach + '<span>Add files</span><input type="file" multiple accept="image/*,application/pdf,.pdf,.doc,.docx,.txt" hidden></label></div></div>' +
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
        '<button type="button" class="p-ghost rsp-tk" title="Saves the campaign in its Drive folder as an open ticket. A designer picks it up from Status.">' + PICO.ticket + 'File as ticket</button>' +
        '<button type="button" class="p-btn rsp-go" title="Files the ticket and opens its first audience to design">Start designing' + PICO.go + '</button></footer>' +
    '</section>';
    const $ = q => el.querySelector(q);
    ['name', 'folder', 'deadline', 'brief'].forEach(f => { const i = $('[data-f="' + f + '"]'); if (i) { i.value = d[f] || ''; i.addEventListener('input', () => { d[f] = i.value; this.save(); this.st(''); }); } });
    $('.rsp-mt').onclick = () => { d.open = !d.open; this.save(); this.draw(); };
    $('.rsp-add input').addEventListener('change', e => { Array.from(e.target.files || []).forEach(f => { if (!this.files.some(x => x.name === f.name && x.size === f.size)) this.files.push(f); }); e.target.value = ''; this.drawFiles(); });
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || !el.contains(b)) return;
      if (b.dataset.prod) this.setProd(b.dataset.prod);
      if (b.dataset.tg) this.toggle(b.dataset.tg, b.dataset.v);
      if (b.dataset.arb) { d.arb[b.dataset.arb] = !d.arb[b.dataset.arb]; this.save(); this.draw(); }
      if (b.dataset.rmf) { this.files.splice(+b.dataset.rmf, 1); this.drawFiles(); }
      if (b.dataset.a === 'again') this.reset();
      if (b.dataset.a === 'status') { const h = eng.host; if (h) h.setState({ splashView: 'rev' }); }
      if (b.dataset.copy) copyText(b.dataset.copy).then(ok => { b.lastChild.textContent = ok ? 'Copied' : 'Select it'; });
    });
    $('.rsp-tk').onclick = () => this.go(false);
    $('.rsp-go').onclick = () => this.go(true);
    this.draw(); this.drawFiles();
    // the figure mounts through the shell's own Hairline binding, which also destroys it
    // when the splash leaves the page
    setTimeout(() => { const h = eng.host; if (h && h.hlBind) h.hlBind(); }, 0);
  }
  const PV = PlanView.prototype;
  PV.save = function () { lsSet(PLAN_KEY, JSON.stringify(this.d)); };
  PV.st = function (t, bad) { const p = this.el.querySelector('.rsp-st'); if (!p) return; p.textContent = t; p.classList.toggle('bad', !!t && bad !== false); };
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
  const fsize = n => n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB';
  PV.drawFiles = function () {
    const box = this.el.querySelector('.rsp-files'); if (!box) return;
    box.querySelectorAll('.rsp-fc').forEach(x => x.remove());
    const add = box.querySelector('.rsp-add');
    this.files.forEach((f, i) => {
      const c = document.createElement('span'); c.className = 'rsp-fc'; c.title = f.name + ' · ' + fsize(f.size);
      c.innerHTML = (/^image\//.test(f.type) ? PICO.img : PICO.doc) + '<b>' + esc(f.name) + '</b><button type="button" data-rmf="' + i + '" aria-label="Remove ' + esc(f.name) + '">' + PICO.x + '</button>';
      box.insertBefore(c, add);
    });
  };
  PV.draw = function () {
    const d = this.d, el = this.el, $ = q => el.querySelector(q), cells = this.cells();
    if (!$('.rsp-prod')) return;
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
    $('.rsp-tiles').innerHTML = cells.map(c => {
      const k = c.market + '|' + c.aud, ar = !!d.arb[k];
      return '<div class="rsp-tile" role="listitem"' + (ar ? ' data-ar="1"' : '') + '><div class="rsp-tt"><s>' + esc(c.market) + '</s><b>' + esc(c.aud) + '</b></div>' +
        '<div class="rsp-lg"><span class="rsp-l" title="English — always made">EN</span>' +
        '<button type="button" class="rsp-l rsp-ar" aria-pressed="' + ar + '" data-arb="' + esc(k) + '" title="' + (ar ? 'Arabic version on — click for English only' : 'English only — click to add an Arabic version') + '" aria-label="Arabic version for ' + esc(c.market + ' ' + c.aud) + '">AR</button></div></div>';
    }).join('');
    if (!this.drive) this.st('Google Drive is not set up on this site, so a campaign cannot be filed here.');
  };
  PV.busy = function (t, p) {
    this.st(t, false);
    const box = this.el.querySelector('.rsp-ft');
    let b = box.querySelector('.shl-pg');
    if (p == null) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.className = 'shl-pg rsp-pg'; b.innerHTML = '<i></i>'; box.appendChild(b); }
    b.firstChild.style.width = Math.max(4, Math.min(100, p * 100)).toFixed(1) + '%';
  };
  PV.go = async function (design) {
    const d = this.d, $ = q => this.el.querySelector(q);
    if (!this.drive) return;
    d.name = (d.name || '').replace(/\s+/g, ' ').trim();
    if (!d.name) { this.st('Name the campaign first.'); $('[data-f="name"]').focus(); return; }
    if (!window.providentDrive.id(d.folder || '')) { this.st('Paste a Drive folder link — it contains /folders/.'); $('[data-f="folder"]').focus(); return; }
    if (design && this.eng.confirmDiscard && !this.eng.confirmDiscard()) return;
    const btns = this.el.querySelectorAll('.rsp-ft button'); btns.forEach(b => { b.disabled = true; });
    const plan = { name: d.name, product: d.product, folder: (d.folder || '').trim(), markets: d.markets.slice(), auds: d.auds.slice(), arb: Object.assign({}, d.arb) };
    try {
      this.busy('Signing in to Google…', .02);
      await window.providentDrive.signIn();   // first: the popup needs the click
      const by = StudioBase.shareName() || 'Someone';
      const rs = await dsMakeSet(plan, by, { brief: d.brief || '', deadline: d.deadline || '' }, this.files, (t, p) => this.busy(t, p));
      lsSet('provident-rs-folder', plan.folder);
      Arch.add(rs.tok.dd, rs.name, rs.product, true);
      // the draft is spent: the next campaign starts from the defaults, keeping the product
      this.d = Object.assign(planDraft(), { name: '', brief: '', deadline: '', folder: '', arb: {} }); this.files = []; this.save();
      if (design) { this.busy('Opening the first audience…', 1); pickUp(this.eng, rs.tok.dd); return; }
      this.busy('', null);
      this.done(rs);
    } catch (e) { this.busy('', null); this.st(e.message || String(e)); btns.forEach(b => { b.disabled = false; }); }
  };
  // filed: what it is, the link a designer opens, and the way on
  PV.done = function (rs) {
    const link = rsLink(rs.tok.dd), body = this.el.querySelector('.rsp-body'), ft = this.el.querySelector('.rsp-ft');
    body.innerHTML = '<div class="rsp-done"><span class="rsp-ok">' + PICO.tick + '</span><div><span class="rsp-k">Open ticket</span><b>' + esc(rs.name) + '</b>' +
      '<s>Listed in Status on this computer. Send a designer the link, or they pick it up from Status.</s></div></div>' +
      '<div class="rsp-lnk"><code title="' + esc(link) + '">' + esc(link.replace(/^https?:\/\//, '')) + '</code><button type="button" class="p-ghost" data-copy="' + esc(link) + '">' + PICO.link + '<span>Copy designer link</span></button></div>';
    ft.innerHTML = '<p class="rsp-st"></p><button type="button" class="p-ghost" data-a="again">File another</button><button type="button" class="p-btn rsp-go" data-a="status">Open Status' + PICO.go + '</button>';
  };
  PV.reset = function () { const el = this.el, eng = this.eng; el._rsp = null; el.innerHTML = ''; el._rsp = new PlanView(el, eng); };
  window.providentPlan = Plan;
  function ArchView(el, eng) {
    injectCss();
    this.el = el; this.eng = eng; this.items = null; this.sel = null; this.det = null; this.err = '';
    el.innerHTML = '<div class="rva"><div class="rva-gd" hidden></div><div class="rva-bar">' +
      '<button type="button" class="p-btn rva-new" data-a="newt" title="File a new campaign as an open ticket: the brief, the files and the audiences">' + ico('add') + 'New ticket</button>' +
      '<form class="rva-add" title="Paste a campaign’s designer link to list it on this computer">' + ico('link', 'rva-add-i') + '<input class="p-in" placeholder="Add a campaign link" aria-label="Campaign designer link"><button class="p-ghost" type="submit">Add</button></form></div>' +
      '<div class="rva-hl" data-s="wait"><div class="rvo-h"><span class="rvo-fig" data-hl="stack" aria-hidden="true"></span><div class="rvo-ht"></div></div><div class="rvo-in"></div></div><div class="rva-body" aria-live="polite"></div></div>';
    // the Stack figure mounts through the shell's own Hairline binding, which also destroys it
    // when the view leaves the page; it sits outside the part the overview redraws
    setTimeout(() => { const h = eng.host; if (h && h.hlBind) h.hlBind(); }, 0);
    el.addEventListener('click', e => this.click(e));
    el.addEventListener('keydown', e => { if (e.key === 'Escape' && this.addOpen) { this.addOpen = false; this.draw(); } });
    // It refreshes itself: on a timer while on screen, and the moment the window comes back,
    // so a step someone took in another tab or on another computer shows without a reload.
    const tick = () => {
      if (!el.isConnected) { clearInterval(this.timer); document.removeEventListener('visibilitychange', tick); window.removeEventListener('focus', tick); return; }
      if (document.hidden || Date.now() - (this.at || 0) < 10000) return;
      this.refresh();
    };
    this.timer = setInterval(tick, 20000);
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
  // A TICKET is an ad set nobody has picked up yet: it holds the brief and no project.
  const isOpen = rs => !!(rs && rs.ticket && !(rs.items || []).length);
  const dueLabel = v => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); if (!m) return String(v || ''); const t = new Date(+m[1], m[2] - 1, +m[3]);
    return t.toLocaleDateString([], t.getFullYear() === new Date().getFullYear() ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }); };
  const fileUrl = f => 'https://drive.google.com/file/d/' + encodeURIComponent(f.id) + '/view';
  // The ticket's raw material, read by the Status page and the Ad set tab alike.
  function briefHtml(tk, open) {
    if (!tk || !(tk.brief || (tk.files || []).length)) return '';
    const files = (tk.files || []).map(f => '<a class="rva-fl" href="' + esc(fileUrl(f)) + '" target="_blank" rel="noopener" title="' + esc(f.name) + '">' +
      ico(/^image\//.test(f.type) ? 'img' : 'doc', 'rva-fi') + '<span>' + esc(f.name) + '</span></a>').join('');
    return '<section class="rva-card rva-brief"><h3>Brief' + (tk.by ? ' <s>from ' + esc(tk.by) + '</s>' : '') + '</h3>' +
      (tk.brief ? '<details class="rva-bt"' + (open ? ' open' : '') + '><summary>' + esc(tk.brief.split(/\n/)[0].slice(0, 140)) + '</summary><p>' + esc(tk.brief) + '</p></details>' : '') +
      (files ? '<div class="rva-fls">' + files + '</div>' : '') + '</section>';
  }
  // When an ad set last changed: its own steps and log, each project's last save (on Drive),
  // and when it was made — whichever is newest.
  function modOf(it) {
    const rs = (it && it.rs) || {}, at = x => (x && x.at) || 0;
    let m = Math.max(it.mod || 0, rs.created || 0);
    (rs.hist || []).forEach(h => { m = Math.max(m, at(h)); });
    (rs.items || []).forEach(x => { m = Math.max(m, x.added || 0, at(x.design), at(x.copy)); });
    return m;
  }
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
    const hl = this.el.querySelector('.rva-hl'), head = this.el.querySelector('.rvo-ht'), box = this.el.querySelector('.rvo-in'); if (!box) return;
    hl.hidden = !!this.sel;
    const at = this.at ? 'Updated ' + new Date(this.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Updating…';
    const up = '<span class="rvo-up">' + at + '<button type="button" class="rvo-re" data-a="refresh" aria-label="Refresh" title="Refresh">' + ico('ref', 'rvo-re-i') + '</button></span>';
    if (this.items === null) { hl.dataset.s = 'wait'; head.innerHTML = '<div class="rvo-t"><span class="rvo-k">Overview</span><h2>Reading the ad sets…</h2></div>' + up; box.innerHTML = ''; box.hidden = true; return; }
    // nothing to count yet: the sign-in card or the empty note below says all there is to say
    if (!(this.items || []).length) { hl.hidden = true; return; }
    const sets = (this.items || []).filter(x => !x.gone), miss = (this.items || []).length - sets.length;
    const all = sets.map(x => ({ x, auds: rsAuds(x.rs || {}) })), done = all.filter(o => rsOverall(o.auds).ready);
    const auds = [].concat(...all.map(o => o.auds));
    const projs = sets.reduce((n, x) => n + ((x.rs || {}).items || []).length, 0);
    const at3 = auds.filter(a => a.done).length;
    // each audience sits at its first unfinished step; a finished one counts as Done
    const by = STEP_LABELS.map((l, i) => ({ l, i, n: auds.filter(a => (a.done ? 3 : a.steps.findIndex(x => x.s !== 'done')) === i).length }));
    const n = (c, w) => c + ' ' + w + (c === 1 ? '' : 's');
    hl.dataset.s = 'ok';
    // The setup widget's shape: a header band (figure, a small label, the one number as the
    // title, the counts as one line), then the body — where every audience is, as four
    // columns: the step, how many sit there, and a bar for its share.
    head.innerHTML = '<div class="rvo-t"><span class="rvo-k">Overview</span>' +
        '<h2>' + at3 + ' of ' + n(auds.length, 'audience') + ' done</h2>' +
        '<p>' + [n(sets.length, 'ad set'), n(projs, 'project'), done.length + ' ready to run'].join(' · ') + '</p></div>' + up;
    box.hidden = !auds.length && !miss && !this.sign;
    box.innerHTML = (auds.length ? '<ol class="rvo-steps">' + by.map(x => '<li data-i="' + x.i + '"' + (x.n ? '' : ' data-zero="1"') + '><span><i></i>' + esc(x.l) + '</span><b>' + x.n + '</b><em><s style="width:' + (auds.length ? Math.round(x.n / auds.length * 100) : 0) + '%"></s></em></li>').join('') + '</ol>' : '') +
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
      statusSave(this.items, this.eng);
    } catch (e) { if (!quiet || !this.items) this.items = []; this.err = e.message || String(e); }
    this.healPaint(this.items);
    if (!this.sel) this.draw();
    this.heal(this.items);
  };
  // PREVIEWS ARE DRAWN HERE WHEN NOBODY ELSE DID. A project's preview was only ever sent by the
  // designer's own tab after a save, and on the live Drive no project had one at all, so every
  // card showed the ad set's first, photo-less picture. Review links runs the studio, so it
  // renders any preview that is missing or older than its project's last change — from the
  // project's state and its Drive photos — shows it, and writes it back (op 'thumb') for the
  // next reader. One at a time; a render is kept per project revision for this page's life.
  const HEAL = {};
  // Branded or not: Provident's own look, or the Unbranded look (no wordmark, no QR). An ad set
  // whose projects differ says Mixed, with the counts in the tooltip.
  function brandHtml(b) {
    if (!b) return '';
    const p = b.provident || 0, u = b.unbranded || 0;
    if (!p && !u) return '';
    const k = p && u ? 'mixed' : u ? 'unbranded' : 'provident';
    const lab = { provident: 'Provident', unbranded: 'Unbranded', mixed: 'Mixed' }[k];
    const tip = k === 'mixed' ? p + ' Provident, ' + u + ' Unbranded' : k === 'provident' ? 'Branded: Provident wordmark and QR' : 'Unbranded: no Provident wordmark or QR';
    return '<span class="rva-br" data-k="' + k + '" title="' + tip + '">' + lab + '</span>';
  }
  AV.healPaint = function (list) {
    (list || []).forEach(it => {
      if (!it || !it.lead) return;
      const h = HEAL[it.lead]; if (h && h.th) it.thumb = h.th;
      else (it.stale || []).forEach(x => { if (HEAL[x.sid] && HEAL[x.sid].th) it.thumb = HEAL[x.sid].th; });
      if (it.proj) Object.keys(it.proj).forEach(sid => { if (HEAL[sid] && HEAL[sid].th) it.proj[sid].thumb = HEAL[sid].th; });
    });
  };
  AV.heal = async function (list) {
    if (!dsOn() || !this.eng || !this.eng.rvThumb) return;
    const jobs = [];
    (list || []).forEach(it => (it && it.stale || []).forEach(x => {
      if (!isDs(it.id)) return;
      const h = HEAL[x.sid]; if (h && (h.busy || h.rev === x.rev)) return;
      jobs.push({ id: it.id, sid: x.sid, rev: x.rev });
    }));
    if (!jobs.length || this.healing) return;
    this.healing = true;
    try {
      for (const j of jobs) {
        if (!this.el || !document.body.contains(this.el)) break;
        HEAL[j.sid] = { busy: true, rev: j.rev };
        try {
          const d = await dsRead(j.sid.slice(1), true), rv = d.review || {}, imgs = rv.imgs || {};
          const st = this.eng.shNorm(d.state || {}), own = {};
          // only the pictures the first variant's square can show
          const want = Object.keys(imgs).filter(sl => /^adstudio-(bg-0|fg-0|qr|colog|ic-.+|mod-.+)$/.test(sl));
          await pool(want, 3, async sl => { try { const r = await fetchRec(j.id, imgs[sl], j.sid); if (r) own[sl] = r; } catch (e) {} });
          const th = await this.eng.rvThumb(st, own);
          HEAL[j.sid] = { rev: j.rev, th: th || '' };
          if (th) {
            this.healPaint(this.items); if (this.det) this.healPaint([this.det]);
            this.draw();
            try { await api('thumb', { id: j.id, p: j.sid }, { thumb: th }); } catch (e) {}
          }
        } catch (e) { HEAL[j.sid] = { rev: j.rev, th: '' }; if (e && e.gdAuth) break; }
      }
    } finally { this.healing = false; }
    // the previews are on Drive now: read the list again so every card shows its own
    if (this.el && document.body.contains(this.el)) { if (this.sel) this.open(this.sel, true); else this.load(true); }
  };
  AV.open = async function (id, quiet) {
    this.sel = id; if (!quiet) { this.det = null; this.draw(); }
    try { const r = await api('rsinfo', { ids: id, full: '1' }); this.det = (r.items || [])[0] || { id, gone: true }; this.at = Date.now(); this.healPaint([this.det]); }
    catch (e) { if (!quiet) this.det = { id, error: e.message || String(e), auth: !!e.gdAuth }; }
    if (this.sel === id) this.draw();
    if (this.det && this.det.stale) this.heal([this.det]);
  };
  AV.click = async function (e) {
    let t = e.target.closest('button,[data-id],.rva-mod'); if (!t || !this.el.contains(t)) return;
    if (t.dataset.copy) { const ok = await copyText(t.dataset.copy), sp = t.querySelector('span') || t, was = sp.textContent; sp.textContent = ok ? 'Copied' : 'Select it'; t.dataset.done = ok ? '1' : ''; setTimeout(() => { sp.textContent = was; t.dataset.done = ''; }, 1600); return; }
    if (t.dataset.id) { this.edit = null; this.open(t.dataset.id); return; }
    const a = t.dataset.a;
    if (a === 'back') { this.sel = null; this.det = null; this.addOpen = false; this.load(); }
    if (a === 'newt') { const h = this.eng.host; if (h) h.setState({ splashView: 'all' }, () => setTimeout(() => { const i = document.querySelector('.rsp [data-f="name"]'); if (i) { i.scrollIntoView({ block: 'center' }); i.focus(); } }, 60)); return; }
    if (a === 'pick') { const dd = (this.det && this.det.dd) || this.sel; t.disabled = true; t.lastChild.textContent = 'Opening…'; if (!pickUp(this.eng, dd)) { t.disabled = false; t.lastChild.textContent = 'Pick up'; } return; }
    if (a === 'open') window.open(rsLink(this.sel), '_blank', 'noopener');
    if (a === 'proj') window.open(rsLink(t.dataset.sid), '_blank', 'noopener');
    if (a === 'refresh') { if (dsOn()) dsFlush(); this.at = 0; this.refresh(); }
    if (a === 'gdref' || a === 'gdre' || a === 'gdsw') {
      const D = window.providentDrive;
      this.gdBusy = a === 'gdref' ? 'ref' : 're'; this.drawGd();
      try {
        if (a === 'gdsw') D.signOut();
        else if (a === 'gdre') D.drop();   // a fresh session; the remembered account comes back with no chooser
        if (a !== 'gdref') await D.signIn();
        this.gdBusy = 'ref'; this.drawGd();
        await this.gdRefresh();
      } catch (er) { window.alert(er.message || String(er)); }
      this.gdBusy = null; this.draw();
      return;
    }
    if (a === 'gsign') {
      t.disabled = true;
      try { await window.providentDrive.signIn(); window.dispatchEvent(new Event('provident-drive-signed')); }
      catch (er) { t.disabled = false; window.alert(er.message || String(er)); }
      return;
    }
    const by = StudioBase.shareName() || 'Designer', again = () => this.open(this.sel);
    if (a === 'addopen') { this.addOpen = true; this.draw(); const f = this.el.querySelector('.rva-mod button[data-a="addproj"],.rva-mod-x'); if (f) f.focus(); return; }
    if (a === 'addx') { if (t.classList.contains('rva-mod') && e.target !== t) return; this.addOpen = false; this.draw(); const o = this.el.querySelector('[data-a="addopen"]'); if (o) o.focus(); return; }
    if (a === 'settings') {
      const rs = this.det && this.det.rs; if (!rs) return;
      const id = this.sel, r = await rsSettings(rs, p => rsSettingsSave(id, rs, p, by), { ticket: isDs(id) || !!rs.ticket });
      if (r) { if (r.name && r.name !== rs.name) Arch.add(id, r.name, r.product); this.at = 0; again(); }
      const o = this.el.querySelector('[data-a="settings"]'); if (o) o.focus();
      return;
    }
    if (a === 'approve' && window.confirm(APPROVE_Q(t.dataset.lab))) {
      t.disabled = true; t.textContent = 'Saving…';
      try { await api('rsstep', { id: this.sel }, { act: 'approved', p: t.dataset.sid, by }); again(); }
      catch (er) { t.disabled = false; t.textContent = 'Already approved'; window.alert(er.message || String(er)); }
      return;
    }
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
  // GOOGLE DRIVE, AS A CONTROL: who this computer is signed in as, and two buttons. Refresh
  // forgets every cached Drive read and reads the ad sets again; Reconnect gets a new Google
  // session (the remembered account, so the popup closes by itself) and then refreshes —
  // the fix for a page that stopped picking up changes because its session lapsed.
  AV.drawGd = function () {
    const box = this.el.querySelector('.rva-gd'); if (!box) return;
    const D = window.providentDrive;
    if (!dsOn() || !D) { box.hidden = true; return; }
    const w = D.who && D.who(), ok = D.valid && D.valid(), busy = this.gdBusy;
    const st = busy ? 'busy' : ok ? 'ok' : w ? 'exp' : 'out';
    const line = busy === 'ref' ? 'Reading every ad set again from Google Drive…' : busy === 're' ? 'Reconnecting to Google Drive…'
      : ok ? 'Connected' + (w ? ' as <b>' + esc(w.name || w.email) + '</b> · ' + esc(w.email) : '')
        : w ? 'Session ended — reconnect as <b>' + esc(w.email) + '</b> to see the latest' : 'Not signed in — ad sets on Drive are not listed';
    box.hidden = false; box.dataset.s = st;
    box.innerHTML = '<span class="rva-gd-t"><i></i><span><b class="rva-gd-k">Google Drive</b><s>' + line + '</s></span></span>' +
      '<span class="rva-gd-a">' +
      (ok ? '<button type="button" class="p-ghost" data-a="gdref"' + (busy ? ' disabled' : '') + '>' + ico('ref') + 'Refresh</button>' : '') +
      '<button type="button" class="' + (ok ? 'p-ghost' : 'p-btn') + '" data-a="gdre"' + (busy ? ' disabled' : '') + '>' + (ok ? 'Reconnect' : w ? 'Reconnect' : 'Sign in with Google') + '</button>' +
      (w ? '<button type="button" class="rva-gd-sw" data-a="gdsw"' + (busy ? ' disabled' : '') + '>Use another account</button>' : '') +
      '</span>';
  };
  AV.gdRefresh = async function () {
    dsFlush();
    this.at = 0;
    if (this.sel) await this.open(this.sel, true); else await this.load(true);
  };
  AV.draw = function () {
    this.drawGd();
    const body = this.el.querySelector('.rva-body'), errHtml = this.err ? '<p class="rva-err" role="alert">' + esc(this.err) + '</p>' : '';
    this.el.querySelector('.rva-bar').hidden = !!this.sel;
    this.drawHealth();
    if (this.sel) { body.innerHTML = this.detHtml(); return; }
    if (this.items === null) { body.innerHTML = errHtml + '<p class="rva-wait">Reading the ad sets…</p>'; return; }
    const signHtml = this.sign ? '<div class="rva-sign"><span><b>' + (this.sign === 1 ? 'One ad set is' : this.sign + ' ad sets are') + ' stored on Google Drive.</b><s>Sign in with your Provident Google account to list ' + (this.sign === 1 ? 'it' : 'them') + ' here. Your account needs access to the ad set’s folder.</s></span><button type="button" class="p-btn" data-a="gsign">Sign in with Google</button></div>' : '';
    if (!this.items.length && this.sign) { body.innerHTML = errHtml + signHtml; return; }
    if (!this.items.length) { body.innerHTML = errHtml + '<div class="p-empty2">No campaigns yet. File one with New ticket.</div>'; return; }
    const names = {}; Arch.list().forEach(x => { names[x.id] = x.name; });
    const card = it => {
      if (it.gone) return '<button class="rva-c" data-id="' + esc(it.id) + '" data-gone="1"><span class="rva-th"></span><span class="rva-ct"><span class="rva-n"><b>' + esc(names[it.id] || 'Unknown ad set') + '</b></span><span class="rva-m">' + (isDs(it.id) ? 'Not found in Google Drive, or no access' : 'No record on the share store') + '</span></span></button>';
      const rs = it.rs || {}, auds = rsAuds(rs), all = rsOverall(auds);
      if (isOpen(rs)) {
        const tk = rs.ticket || {}, due = tk.deadline ? 'Due ' + dueLabel(tk.deadline) : '';
        const meta = [rs.product ? PRODUCT_NAME[rs.product] || '' : '', planCells(planOf(rs)).length + ' audiences', due].filter(Boolean).map(esc).join(' · ');
        return '<button class="rva-c" data-id="' + esc(it.id) + '" data-open="1"><span class="rva-th rva-th-t">' + ico('ticket', 'rva-ti') + '</span>' +
          '<span class="rva-ct"><span class="rva-n"><b title="' + esc(rs.name || 'Campaign') + '">' + esc(rs.name || 'Campaign') + '</b></span>' +
          '<span class="rva-now" data-i="o"><i></i><b>Open ticket</b>' + (tk.by ? '<u>' + esc(tk.by) + '</u>' : '') + '</span>' +
          '<span class="rva-m">' + meta + '</span></span>' + ico('chev', 'rva-go') + '</button>';
      }
      // what it is waiting on: the least advanced audience, by name, and how many more
      const open = auds.filter(a => !a.done).sort((x, y) => x.steps.findIndex(q => q.s !== 'done') - y.steps.findIndex(q => q.s !== 'done'));
      const first = open[0], si = first ? first.steps.findIndex(q => q.s !== 'done') : 3;
      const now = all.ready ? '<span class="rva-now" data-i="3"><i></i><b>Package ready</b></span>'
        : first ? '<span class="rva-now" data-i="' + si + '" title="' + esc(open.map(a => a.label + ': ' + (a.now ? a.now.label + ' · ' + a.now.sub : '')).join('\n')) + '"><i></i><b>' + esc(first.now ? first.now.label : STEP_LABELS[si]) + '</b><u>' + esc(first.label) + '</u>' + (open.length > 1 ? '<s>+' + (open.length - 1) + '</s>' : '') + '</span>'
        : '<span class="rva-now"><i></i><b>No projects yet</b></span>';
      const segs = '<span class="rva-segs" aria-label="' + esc(all.steps.map(x => x.label + ' ' + (x.s === 'done' ? 'done' : x.s === 'cur' ? 'in progress' : 'not started')).join(', ')) + '">' + all.steps.map(x => '<i data-s="' + x.s + '" title="' + esc(x.label + ' · ' + x.sub) + '"></i>').join('') + '</span>';
      const cd = modOf(it) ? new Date(modOf(it)) : null;
      const today = cd && cd.toDateString() === new Date().toDateString();
      const when = !cd ? '' : 'Changed ' + (today ? cd.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        : cd.toLocaleDateString([], cd.getFullYear() === new Date().getFullYear() ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }));
      const meta = [rs.product ? PRODUCT_NAME[rs.product] || '' : '', when].filter(Boolean).map(esc).join(' · ');
      const brand = brandHtml(it.brands);
      return '<button class="rva-c" data-id="' + esc(it.id) + '"' + (all.ready ? ' data-ready="1"' : '') + '><span class="rva-th">' + (it.thumb ? '<img src="' + esc(it.thumb) + '" alt="">' : '') + '</span>' +
        '<span class="rva-ct"><span class="rva-n"><b title="' + esc(rs.name || names[it.id] || 'Ad set') + '">' + esc(rs.name || names[it.id] || 'Ad set') + '</b></span>' +
        now + segs + '<span class="rva-m">' + brand + meta + '</span></span>' + ico('chev', 'rva-go') + '</button>';
    };
    // newest change first: the last thing anyone did in the ad set or any of its projects
    const sorted = this.items.slice().sort((a, b) => modOf(b) - modOf(a));
    const ready = x => rsOverall(rsAuds(x.rs || {})).ready;
    const open = sorted.filter(x => !x.gone && isOpen(x.rs)), prog = sorted.filter(x => !x.gone && !isOpen(x.rs) && !ready(x)), done = sorted.filter(x => !x.gone && !isOpen(x.rs) && ready(x)), gone = sorted.filter(x => x.gone);
    const grp = (t, l) => l.length ? '<section class="rva-g"><h3>' + t + '<s>' + l.length + '</s></h3><div class="rva-grid">' + l.map(card).join('') + '</div></section>' : '';
    body.innerHTML = errHtml + signHtml + grp('Open tickets', open) + grp('In design', prog) + grp('Package ready', done) + grp('Missing', gone);
  };
  // Material Rounded, wght 300 — the studio's icon family
  const ICO = {
    ticket: 'M172.31-180q-29.83 0-51.07-21.24Q100-222.48 100-252.31v-109.61q0-9.85 5.66-17.46 5.65-7.62 15.11-10.39 26.31-12.23 42.77-36.32Q180-450.19 180-480.02t-16.46-53.9q-16.46-24.08-42.77-36.31-9.46-2.77-15.11-10.39-5.66-7.61-5.66-17.46v-109.61q0-29.83 21.24-51.07Q142.48-780 172.31-780h615.38q29.83 0 51.07 21.24Q860-737.52 860-707.69v109.61q0 9.85-5.66 17.46-5.65 7.62-15.11 10.39-26.31 12.23-42.77 36.32Q780-509.81 780-479.98t16.46 53.9q16.46 24.08 42.77 36.31 9.46 2.77 15.11 10.39 5.66 7.61 5.66 17.46v109.61q0 29.83-21.24 51.07Q817.52-180 787.69-180H172.31Zm0-60h615.38q5.39 0 8.85-3.46t3.46-8.85V-342q-37-22-58.5-58.5T720-480q0-43 21.5-79.5T800-618v-89.69q0-5.39-3.46-8.85t-8.85-3.46H172.31q-5.39 0-8.85 3.46t-3.46 8.85V-618q37 22 58.5 58.5T240-480q0 43-21.5 79.5T160-342v89.69q0 5.39 3.46 8.85t8.85 3.46Zm307.7-53.85q12.76 0 21.37-8.63 8.62-8.62 8.62-21.38t-8.63-21.37q-8.63-8.62-21.38-8.62-12.76 0-21.37 8.63-8.62 8.63-8.62 21.39 0 12.75 8.63 21.37 8.63 8.61 21.38 8.61Zm0-156.15q12.76 0 21.37-8.63 8.62-8.63 8.62-21.38 0-12.76-8.63-21.37-8.63-8.62-21.38-8.62-12.76 0-21.37 8.63-8.62 8.63-8.62 21.38 0 12.76 8.63 21.37 8.63 8.62 21.38 8.62Zm0-156.15q12.76 0 21.37-8.63 8.62-8.63 8.62-21.39 0-12.75-8.63-21.37-8.63-8.61-21.38-8.61-12.76 0-21.37 8.63-8.62 8.62-8.62 21.38t8.63 21.37q8.63 8.62 21.38 8.62ZM480-480Z',
    attach: 'M706.92-334.23q0 97.44-67.81 165.83-67.8 68.4-165.07 68.4t-165.27-68.4q-68-68.39-68-165.83v-359.62q0-69.23 48.08-117.69Q336.92-860 406.15-860q69.23 0 117.31 48.46t48.08 117.69v340.39q0 40.61-28.29 69.34-28.3 28.73-68.96 28.73-40.67 0-69.4-28.53-28.73-28.53-28.73-69.54v-321.15q0-12.75 8.62-21.38 8.63-8.62 21.39-8.62 12.75 0 21.37 8.62 8.61 8.63 8.61 21.38v321.15q0 16.08 10.81 27.08t26.89 11q16.07 0 26.88-11 10.81-11 10.81-27.08v-340.77q-.62-44.31-30.85-75.04Q450.46-800 406.19-800q-44.28 0-74.85 30.92-30.57 30.93-30.57 75.23v359.62q-.62 72.54 50.15 123.38Q401.69-160 474.18-160q71.46 0 121.49-50.85 50.02-50.84 51.25-123.38v-340.38q0-12.75 8.63-21.38 8.63-8.62 21.39-8.62 12.75 0 21.37 8.62 8.61 8.63 8.61 21.38v340.38Z',
    img: 'M212.31-140Q182-140 161-161q-21-21-21-51.31v-535.38Q140-778 161-799q21-21 51.31-21h535.38Q778-820 799-799q21 21 21 51.31v535.38Q820-182 799-161q-21 21-51.31 21H212.31Zm0-60h535.38q4.62 0 8.46-3.85 3.85-3.84 3.85-8.46v-535.38q0-4.62-3.85-8.46-3.84-3.85-8.46-3.85H212.31q-4.62 0-8.46 3.85-3.85 3.84-3.85 8.46v535.38q0 4.62 3.85 8.46 3.84 3.85 8.46 3.85ZM200-200v-560 560Zm106.16-90h350.76q10.85 0 16.08-9.85 5.23-9.84-1.62-19.07L576-446.69q-5.62-7.23-14.46-7.23-8.85 0-14.46 7.23l-97.85 127.46-65.54-84q-5.61-6.85-14.27-6.85-8.65 0-14.27 7.24l-63.07 83.92q-7.23 9.23-2 19.07 5.23 9.85 16.08 9.85Z',
    doc: 'M360-250h240q12.77 0 21.38-8.62Q630-267.23 630-280t-8.62-21.38Q612.77-310 600-310H360q-12.77 0-21.38 8.62Q330-292.77 330-280t8.62 21.38Q347.23-250 360-250Zm0-160h240q12.77 0 21.38-8.62Q630-427.23 630-440t-8.62-21.38Q612.77-470 600-470H360q-12.77 0-21.38 8.62Q330-452.77 330-440t8.62 21.38Q347.23-410 360-410ZM252.31-100Q222-100 201-121q-21-21-21-51.31v-615.38Q180-818 201-839q21-21 51.31-21h287.77q14.46 0 27.81 5.62 13.34 5.61 23.19 15.46l167.84 167.84q9.85 9.85 15.46 23.19 5.62 13.35 5.62 27.81v447.77Q780-142 759-121q-21 21-51.31 21H252.31ZM540-656.16V-800H252.31q-4.62 0-8.46 3.85-3.85 3.84-3.85 8.46v615.38q0 4.62 3.85 8.46 3.84 3.85 8.46 3.85h455.38q4.62 0 8.46-3.85 3.85-3.84 3.85-8.46V-620H576.16q-15.47 0-25.81-10.35Q540-640.69 540-656.16ZM240-800v180-180V-160v-640Z',
    event: 'M522.27-266.88q-26.88-26.89-26.88-65.43 0-38.54 26.88-65.42 26.88-26.88 65.42-26.88 38.54 0 65.43 26.88Q680-370.85 680-332.31q0 38.54-26.88 65.43Q626.23-240 587.69-240q-38.54 0-65.42-26.88ZM212.31-100Q182-100 161-121q-21-21-21-51.31v-535.38Q140-738 161-759q21-21 51.31-21h55.38v-53.85q0-13.15 8.81-21.96 8.81-8.8 21.96-8.8 13.16 0 21.96 8.8 8.81 8.81 8.81 21.96V-780h303.08v-54.61q0-12.77 8.61-21.39 8.62-8.61 21.39-8.61 12.77 0 21.38 8.61 8.62 8.62 8.62 21.39V-780h55.38Q778-780 799-759q21 21 21 51.31v535.38Q820-142 799-121q-21 21-51.31 21H212.31Zm0-60h535.38q4.62 0 8.46-3.85 3.85-3.84 3.85-8.46v-375.38H200v375.38q0 4.62 3.85 8.46 3.84 3.85 8.46 3.85ZM200-607.69h560v-100q0-4.62-3.85-8.46-3.84-3.85-8.46-3.85H212.31q-4.62 0-8.46 3.85-3.85 3.84-3.85 8.46v100Zm0 0V-720v112.31Z',
    go: 'M665.08-450H210q-12.77 0-21.38-8.62Q180-467.23 180-480t8.62-21.38Q197.23-510 210-510h455.08L458.31-716.77q-8.92-8.92-8.81-20.88.12-11.96 9.42-21.27 9.31-8.69 21.08-9 11.77-.31 21.08 9l253.61 253.61q5.62 5.62 7.92 11.85 2.31 6.23 2.31 13.46t-2.31 13.46q-2.3 6.23-7.92 11.85L501.08-201.08q-8.31 8.31-20.58 8.5-12.27.19-21.58-8.5-9.3-9.31-9.3-21.38 0-12.08 9.3-21.39L665.08-450Z',
    add: 'M450-450H230q-12.75 0-21.37-8.63-8.63-8.63-8.63-21.38 0-12.76 8.63-21.37Q217.25-510 230-510h220v-220q0-12.75 8.63-21.37 8.63-8.63 21.38-8.63 12.76 0 21.37 8.63Q510-742.75 510-730v220h220q12.75 0 21.37 8.63 8.63 8.63 8.63 21.38 0 12.76-8.63 21.37Q742.75-450 730-450H510v220q0 12.75-8.63 21.37-8.63 8.63-21.38 8.63-12.76 0-21.37-8.63Q450-217.25 450-230v-220Z',
    x: 'M480-437.85 277.08-234.92q-8.31 8.3-20.89 8.5-12.57.19-21.27-8.5-8.69-8.7-8.69-21.08 0-12.38 8.69-21.08L437.85-480 234.92-682.92q-8.3-8.31-8.5-20.89-.19-12.57 8.5-21.27 8.7-8.69 21.08-8.69 12.38 0 21.08 8.69L480-522.15l202.92-202.93q8.31-8.3 20.89-8.5 12.57-.19 21.27 8.5 8.69 8.7 8.69 21.08 0 12.38-8.69 21.08L522.15-480l202.93 202.92q8.3 8.31 8.5 20.89.19 12.57-8.5 21.27-8.7 8.69-21.08 8.69-12.38 0-21.08-8.69L480-437.85Z',
    link: 'M432.31-298.46H281.54q-75.34 0-128.44-53.1Q100-404.65 100-479.98q0-75.33 53.1-128.44 53.1-53.12 128.44-53.12h150.77v60H281.54q-50.39 0-85.96 35.58Q160-530.38 160-480q0 50.38 35.58 85.96 35.57 35.58 85.96 35.58h150.77v60ZM330-450v-60h300v60H330Zm197.69 151.54v-60h150.77q50.39 0 85.96-35.58Q800-429.62 800-480q0-50.38-35.58-85.96-35.57-35.58-85.96-35.58H527.69v-60h150.77q75.34 0 128.44 53.1Q860-555.35 860-480.02q0 75.33-53.1 128.44-53.1 53.12-128.44 53.12H527.69Z',
    ref: 'M481.54-180q-125.63 0-212.81-87.17-87.19-87.17-87.19-212.77 0-125.6 87.19-212.83Q355.91-780 481.54-780q70.15 0 132.77 31.19 62.61 31.2 104.15 88.04V-750q0-12.75 8.63-21.37 8.63-8.63 21.38-8.63 12.76 0 21.37 8.63 8.62 8.62 8.62 21.37v178.46q0 15.37-10.39 25.76-10.4 10.39-25.76 10.39H563.85q-12.75 0-21.38-8.62-8.62-8.63-8.62-21.39 0-12.75 8.62-21.37 8.63-8.61 21.38-8.61h128q-31.62-57.93-87.7-91.27Q548.08-720 481.54-720q-100 0-170 70t-70 170q0 100 70 170t170 70q69.73 0 127.67-36.62 57.94-36.61 87.79-97.69 5.69-10.92 16.73-15.27 11.04-4.34 22.5-.5 12.23 3.85 17.12 16 4.88 12.16-.81 23.08-37.16 77.69-109.7 124.34Q570.3-180 481.54-180Z',
    chev: 'M517.85-480 354.92-642.92q-8.3-8.31-8.5-20.89-.19-12.57 8.5-21.27 8.7-8.69 21.08-8.69 12.38 0 21.08 8.69l179.77 179.77q5.61 5.62 7.92 11.85 2.31 6.23 2.31 13.46t-2.31 13.46q-2.31 6.23-7.92 11.85L397.08-274.92q-8.31 8.3-20.89 8.5-12.57.19-21.27-8.5-8.69-8.7-8.69-21.08 0-12.38 8.69-21.08L517.85-480Z',
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
    const d = this.det, back = '<button type="button" class="p-ghost rva-back" data-a="back">' + ico('back') + 'All campaigns</button>';
    if (!d) return back + '<p class="rva-wait">Reading the ad set…</p>';
    if (d.auth) return back + '<div class="rva-sign"><span><b>This ad set is stored on Google Drive.</b><s>Sign in with your Provident Google account to open it. Your account needs access to the ad set’s folder.</s></span><button type="button" class="p-btn" data-a="gsign">Sign in with Google</button></div>';
    if (d.error || d.gone) return back + '<p class="rva-err" role="alert">' + esc(d.error || (isDs(d.id) ? 'This ad set’s Ad set.json was not found in Google Drive, or your account has no access to its folder.' : 'This ad set has no record on the share store.')) + '</p><button type="button" class="rva-rm" data-a="rm">' + ico('del') + 'Remove from this list</button>';
    const rs = d.rs || {}, auds = rsAuds(rs), all = rsOverall(auds), name = rs.name || 'Ad set';
    const drv = rs.drive || '', url = /^https?:\/\//.test(drv), proj = d.proj || {}, live = d.live || {};
    if (isOpen(rs)) return back + this.ticketHtml(d);
    const row = (k, v) => '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>';
    const log = (d.log || []).concat((d.plog || []).filter(e => (e.changes || []).some(c => c.kind !== 'note')).map(e => Object.assign({}, e, { changes: (e.changes || []).map(c => Object.assign({}, c, { page: e.page + (c.page ? ' · ' + c.page : '') })) })))
      .sort((a, b) => b.at - a.at);
    const sizes = []; Object.keys(proj).forEach(s => ((proj[s].sum || {}).sizes || []).forEach(z => { if (sizes.indexOf(z) < 0) sizes.push(z); }));
    const next = all.ready ? 'Every audience is done since ' + day(all.at) + '. Performance marketing can download the whole package.'
      : auds.length ? 'Waiting on ' + auds.filter(a => !a.done).map(a => a.label + ' (' + (a.now ? a.now.sub.toLowerCase() : '') + ')').join(', ') + '.' : 'No projects yet.';
    // HEADER, then the controls under it: Add a project (a pop-up), and the two list actions
    const head = '<header class="rva-dh"><span class="rva-th rva-th-l">' + (d.thumb ? '<img src="' + esc(d.thumb) + '" alt="">' : '') + '</span>' +
      '<div class="rva-dt"><span class="rv-k">Ad set review' + (rs.product ? ' · ' + esc(PRODUCT_NAME[rs.product] || '') : '') + '</span><h2>' + esc(name) + '</h2>' +
      '<div class="rva-st">' + pillHtml(all.ready) + '<span>' + (all.ready ? 'Finished ' + esc(day(all.at)) : all.done + ' of ' + all.n + ' audiences done') + ' · created ' + esc(day(rs.created)) + (rs.by ? ' by ' + esc(rs.by) : '') + '</span></div></div>' +
      '<div class="rva-da">' + (url ? '<a class="p-ghost rva-a" href="' + esc(drv) + '" target="_blank" rel="noopener">' + ico('ext') + 'Drive folder</a>' : '') +
      '<button type="button" class="p-btn" data-a="open">' + ico('ext') + 'Open the ad set</button></div></header>' +
      '<div class="rva-tools" role="toolbar" aria-label="Ad set actions">' +
      '<button type="button" class="p-ghost rva-tl" data-a="addopen">' + ico('add') + 'Add a project</button>' +
      '<button type="button" class="p-ghost rva-tl" data-a="settings" title="Name, product, deadline, brief, markets, audiences and Arabic">' + PICO.tune.replace('<svg', '<svg class="rva-i"') + 'Ad set settings</button>' +
      '<span class="rva-tools-r"><button type="button" class="rva-rm" data-a="rm">' + ico('del') + 'Remove from this list</button>' +
      '<button type="button" class="rva-rm rva-dng" data-a="delset">' + ico('del') + 'Delete for everyone</button></span></div>';
    // PROGRESS, edge to edge
    const progress = '<section class="rva-card rva-prog"><div class="rva-ph"><h3>Progress</h3><p class="rva-next" data-s="' + (all.ready ? 'ready' : 'prog') + '">' + esc(next) + '</p></div>' + stepperHtml(all.steps) + '</section>';
    // AD SET LINKS, one card per team, side by side
    const LI = { dd: 'dd', ct: 'ct', pm: 'pm' };
    const links = '<section class="rva-lnk"><h3>Ad set links <s>One per team, for the whole ad set</s></h3><ul class="rva-lks">' + LINK_ROWS.map(([r, who, what]) => {
      const link = rsLink((rs.tok || {})[r] || '');
      return '<li class="rva-lk"><div class="rva-lk-h"><span class="rva-lk-i">' + ico(LI[r]) + '</span><b>' + who + '</b></div><s>' + what + '</s>' +
        '<div class="rva-lk-r"><code title="' + esc(link) + '">' + esc(link.replace(/^https?:\/\//, '')) + '</code>' +
        '<button type="button" class="p-ghost rva-cp" data-copy="' + esc(link) + '" aria-label="Copy the ' + who.toLowerCase() + ' link">' + ico('copy') + '<span>Copy link</span></button></div></li>';
    }).join('') + '</ul></section>';
    // AUDIENCES: a card each, its steps, and a tile per language
    const itState = it => it.copy ? 'Copy approved' : it.design ? 'Design done' : 'In design';
    const tile = (a, it, lang) => {
      if (!it) return '<div class="rva-lt" data-empty="1"><span class="rva-lt-th"></span><span class="rva-lt-t"><b>' + lang + '</b><s>' + (lang === 'Arabic' ? (a.engOnly ? 'Not needed for this audience' : 'No Arabic project yet') : 'No English project yet') + '</s></span></div>';
      const pj = proj[it.sid] || {}, dead = live[it.sid] === false;
      return '<div class="rva-lt"' + (it.copy ? ' data-ok="1"' : '') + '><button type="button" class="rva-pj" data-a="proj" data-sid="' + esc(it.sid) + '"' + (dead ? ' disabled title="This project has expired; the record is kept"' : ' title="Open in the studio"') + '>' +
        '<span class="rva-lt-th">' + (pj.thumb ? '<img src="' + esc(pj.thumb) + '" alt="">' : '') + '</span>' +
        '<span class="rva-lt-t"><b>' + lang + '</b><s>' + esc((pj.sum || {}).campaign || 'Untitled') + '</s><u><i></i>' + itState(it) + '</u></span>' + ico('ext') + '</button>' +
        (this.edit === it.sid ? this.relabHtml(it, rs)
          : '<span class="rva-pja"><button type="button" class="rva-lkb" data-a="relab" data-sid="' + esc(it.sid) + '">' + (it.market && it.aud ? 'Change audience' : 'Set its audience') + '</button>' +
            (it.copy ? '' : '<button type="button" class="rva-lkb" data-a="approve" data-sid="' + esc(it.sid) + '" data-lab="' + esc(itemLabel(it)) + '" title="For an ad already signed off outside the review: marks it approved without the content team">Already approved</button>') +
            '<button type="button" class="rva-lkb rva-dng" data-a="rmproj" data-sid="' + esc(it.sid) + '" data-lab="' + esc(itemLabel(it)) + '">Remove</button></span>') + '</div>';
    };
    const audCards = auds.map(a => {
      const extra = a.items.filter(it => it !== a.eng && it !== a.arb);
      return '<li class="rva-au"' + (a.done ? ' data-done="1"' : '') + '><div class="rva-au-h"><span class="rva-au-n">' + (a.market ? '<s>' + esc(a.market) + '</s>' : '') + '<b>' + esc(a.aud || a.label) + '</b></span>' + pillHtml(a.done, a.done ? 'Done' : a.now ? a.now.label : '') + '</div>' +
        stepperHtml(a.steps) +
        '<div class="rva-au-p">' + tile(a, a.eng, 'English') + tile(a, a.arb, 'Arabic') + extra.map(it => tile(a, it, it.lang === 'ARB' ? 'Arabic' : 'English')).join('') + '</div></li>';
    }).join('');
    const audiences = '<section class="rva-card rva-auc"><h3>Audiences <s>' + auds.length + '</s></h3><ul class="rva-aus">' + (audCards || '<li class="shl-empty">No projects yet. Use Add a project above.</li>') + '</ul></section>';
    const side = '<aside class="rva-side">' +
      '<section class="rva-card"><h3>Details</h3><dl class="rva-dl">' +
      row('Product', esc(PRODUCT_NAME[rs.product] || '—')) +
      row('Brand', brandHtml(d.brands) || '—') +
      row('Audiences', auds.length + ' · ' + (rs.items || []).length + ' projects') +
      row('Markets', esc([...new Set((rs.items || []).map(x => x.market).filter(Boolean))].join(', ') || '—')) +
      row('Sizes', sizes.length ? '<span class="rva-chips">' + sizes.map(z => '<span>' + esc(z) + '</span>').join('') + '</span>' : '—') +
      '</dl></section>' +
      briefHtml(rs.ticket) +
      '<section class="rva-card"><h3>Google Drive</h3><p class="rva-sub">Where this ad set’s files are kept, for everyone who opens this list.</p>' +
      '<label class="rva-drv"><span class="rva-vh">Google Drive location</span><input class="p-in" value="' + esc(drv) + '" placeholder="Drive folder link or path"><button type="button" class="p-ghost" data-a="drive">Save</button></label></section>' +
      '</aside>';
    const activity = '<section class="rva-card rva-actc"><h3>Activity <s>' + log.length + '</s></h3><ol class="shl-list rva-log">' + (log.length ? log.slice(0, 300).map((e, i, l) => logEntryHtml(e, { max: 20, cont: logCont(l[i - 1], e) })).join('')
      : '<li class="shl-empty">Nothing yet.</li>') + '</ol></section>';
    return back + head + '<div class="rva-det">' + progress + links + '<div class="rva-cols">' + audiences + side + activity + '</div></div>' +
      (this.addOpen ? this.addHtml(proj) : '');
  };
  // AN OPEN TICKET: what was asked for, and one action — pick it up.
  AV.ticketHtml = function (d) {
    const rs = d.rs || {}, tk = rs.ticket || {}, cells = planCells(planOf(rs)), url = /^https?:\/\//.test(rs.drive || '');
    const facts = [rs.product ? PRODUCT_NAME[rs.product] : '', tk.deadline ? 'Due ' + dueLabel(tk.deadline) : '', 'Filed ' + dayS(tk.at || rs.created) + (tk.by ? ' by ' + tk.by : '')].filter(Boolean);
    const tiles = cells.map(c => '<li class="rva-tkt"><s>' + esc(c.market) + '</s><b>' + esc(c.aud) + '</b><span>' + (c.arb ? 'EN · AR' : 'EN') + '</span></li>').join('');
    return '<header class="rva-dh"><span class="rva-th rva-th-l rva-th-t">' + ico('ticket', 'rva-ti') + '</span>' +
      '<div class="rva-dt"><span class="rv-k">Open ticket</span><h2>' + esc(rs.name || 'Campaign') + '</h2>' +
      '<div class="rva-st"><span class="rv-pill" data-s="open">Waiting for a designer</span><span>' + facts.map(esc).join(' · ') + '</span></div></div>' +
      '<div class="rva-da">' + (url ? '<a class="p-ghost rva-a" href="' + esc(rs.drive) + '" target="_blank" rel="noopener">' + ico('ext') + 'Drive folder</a>' : '') +
      '<button type="button" class="p-btn" data-a="pick" title="Opens the campaign’s first audience in a new project, ready to design">' + ico('go') + '<span>Pick up</span></button></div></header>' +
      '<div class="rva-det rva-tk">' +
      (briefHtml(tk, true) || '<section class="rva-card"><h3>Brief</h3><p class="rva-sub">No brief or files were filed with this ticket.</p></section>') +
      '<section class="rva-card"><h3>Audiences <s>' + cells.length + '</s></h3><ul class="rva-tks">' + (tiles || '<li class="shl-empty">None chosen — the designer sets them up.</li>') + '</ul></section>' +
      '<div class="rva-tools"><button type="button" class="p-ghost rva-tl" data-a="settings" title="Name, product, deadline, brief, markets, audiences and Arabic">' + PICO.tune.replace('<svg', '<svg class="rva-i"') + 'Ticket settings</button>' +
      '<span class="rva-tools-r"><button type="button" class="rva-rm" data-a="rm">' + ico('del') + 'Remove from this list</button>' +
      '<button type="button" class="rva-rm rva-dng" data-a="delset">' + ico('del') + 'Delete the ticket</button></span></div></div>';
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
    return '<div class="rva-mod" data-a="addx"><div class="rva-mod-in" role="dialog" aria-modal="true" aria-labelledby="rva-mod-t">' +
      '<div class="rva-mod-h"><h3 id="rva-mod-t">Add a project</h3><button type="button" class="rva-mod-x" data-a="addx" aria-label="Close">' + ico('x') + '</button></div>' +
      '<p class="rva-sub">Another audience, market or the Arabic version, from the projects saved on this computer. It opens in a new tab, where you choose its market, audience and language.</p>' +
      (rec.length ? '<ul class="rva-addl">' + rec.slice(0, 12).map(r => '<li><span class="rva-th">' + (r.thumbs && r.thumbs[0] ? '<img src="' + esc(r.thumbs[0]) + '" alt="">' : '') + '</span>' +
        '<span class="rva-addn"><b>' + esc(r.name || 'Untitled') + '</b><s>Saved ' + esc(when(r.ts)) + '</s></span>' +
        '<button type="button" class="p-ghost p-sm" data-a="addproj" data-pid="' + esc(r.pid) + '">Add</button></li>').join('') + '</ul>'
        : '<p class="rva-m rva-mod-e">No other saved Campaign projects on this computer. Save the project first, or open it and use Share › Ad set review.</p>') +
      '</div></div>';
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
          'The link carries previews of the images (about 1600px), not the full-size files. Anyone who has it can edit — share it only with people who should.',
        note: 'Your name is shown beside every change you make.' });
      const name = await dlg.name();
      if (!name) return;
      if (!StudioBase.shareWho()) lsSet(NAME_KEY, name);
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
      const dlg = nameDialog({ title: 'Open shared ad sets', btn: 'Open', auto: true,
        lead: '<b>' + esc(meta.name || 'Ad sets') + '</b> · shared by ' + esc(meta.by || 'someone') + ' · ' + n + (n === 1 ? ' project' : ' projects') +
          '. You can look through every audience and variant and change the words in Edit text; the Changes panel shows who changed what.',
        note: 'Your name is shown beside every change you make.' });
      const name = await dlg.name();
      if (!name) return;
      if (!StudioBase.shareWho()) lsSet(NAME_KEY, name);
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
      '<label class="shl-fld"><span>Your name</span><input class="p-in" maxlength="60" autocomplete="name" placeholder="e.g. Sara"></label><p class="shl-who" hidden></p>' +
      '<p class="shl-note"></p><p class="shl-st" aria-live="polite"></p>' +
      '<div class="shl-link" hidden><input class="p-in" readonly><button class="p-ghost shl-cp">Copy</button></div>' +
      '<div class="shl-acts"><button class="p-ghost shl-x">Cancel</button><button class="p-btn shl-go"></button></div></div>';
    document.body.appendChild(el);
    const $ = s => el.querySelector(s), inp = $('.shl-fld input'), go = $('.shl-go'), x = $('.shl-x');
    $('.shl-lead').innerHTML = o.lead || ''; $('.shl-note').textContent = o.note || ''; go.textContent = o.btn;
    inp.value = StudioBase.shareName();
    let res, autoGo = false;
    const p = new Promise(r => { res = r; });
    const close = v => { el.remove(); res(v); };
    // Signed in with Google: the account IS the name — no field. "Not you?" switches account
    // (a click, so Google's popup is allowed). With no account but sign-in available, Google is
    // offered beside the field, so the name is asked at most once on a computer.
    const D = window.providentDrive, fld = $('.shl-fld'), who = $('.shl-who');
    const showWho = () => {
      const w = StudioBase.shareWho();
      fld.hidden = !!w;
      who.hidden = !w && !dsOn();
      who.innerHTML = w ? 'Signed in as <b>' + esc(w.name) + '</b> · ' + esc(w.email) + ' <button type="button" class="shl-notme">Not you?</button>'
        : '<button type="button" class="p-ghost shl-gin">Sign in with Google instead</button><s>Your name then comes from your Google account, on every link.</s>';
      return w;
    };
    who.onclick = async e => {
      const b = e.target.closest('button'); if (!b || !D) return;
      try {
        if (b.classList.contains('shl-notme')) D.signOut();
        await D.signIn();
        $('.shl-st').textContent = ''; $('.shl-st').classList.remove('bad');
      } catch (er) { $('.shl-st').textContent = er.message || String(er); $('.shl-st').classList.add('bad'); }
      if (!StudioBase.shareWho() && D.valid && D.valid()) await D.whoFetch();
      if (showWho()) { $('.shl-note').textContent = ''; if (o.auto && autoGo) res(StudioBase.shareName()); }
      else if (!$('.shl-st').textContent) $('.shl-st').textContent = 'Signed in, but Google did not say which account — type your name, or try again.';
    };
    // No account known yet: load Google's script now, so the click's popup opens at once (a
    // script fetched after the click can outlast the click's permission to open a popup) — and
    // if a token is already here, ask Google whose it is without waiting for a click at all.
    if (D && !StudioBase.shareWho() && dsOn()) {
      D.load().catch(() => {});
      if (D.valid && D.valid()) D.whoFetch().then(() => {
        if (!el.isConnected || !showWho()) return;
        $('.shl-note').textContent = '';
        if (o.auto && autoGo) res(StudioBase.shareName());
      });
    }
    const submit = () => {
      if (StudioBase.shareWho()) { res(StudioBase.shareName()); return; }
      const v = inp.value.replace(/\s+/g, ' ').trim(); if (!v) { inp.focus(); $('.shl-st').textContent = 'Add your name so others know who made a change.'; return; } res(v);
    };
    go.onclick = submit; x.onclick = () => close('');
    inp.onkeydown = e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') close(''); };
    el.onkeydown = e => { if (e.key === 'Escape') close(''); };
    const api2 = {
      // an opening dialog with a known account goes straight on: there is nothing to ask
      name: () => { autoGo = true; if (o.auto && StudioBase.shareWho()) res(StudioBase.shareName()); return p; },
      busy: (t, pr) => { $('.shl-st').textContent = t; stBar(el, pr); go.disabled = true; inp.disabled = true; fld.hidden = true; who.hidden = true; },
      ready: r => { stBar(el, null); if (r.title) $('h2').textContent = r.title; $('.shl-lead').innerHTML = r.lead; $('.shl-note').textContent = StudioBase.shareWho() ? '' : (r.note || ''); $('.shl-st').textContent = ''; go.disabled = false; inp.disabled = false; if (!showWho()) setTimeout(() => inp.focus(), 30); },
      fail: (t, btn) => { stBar(el, null); $('.shl-st').textContent = t; $('.shl-st').classList.add('bad'); go.textContent = btn || 'Close'; go.disabled = false; go.onclick = () => close(''); x.hidden = true; },
      done: (link, copied) => {
        stBar(el, null);
        $('.shl-fld').hidden = true; $('.shl-note').textContent = '';
        $('.shl-lead').innerHTML = 'The link is ready' + (copied ? ' and copied' : '') + '. Send it to the people who should edit. Their name comes from their Google sign-in, or they type it once.';
        $('.shl-st').textContent = ''; const L = $('.shl-link'); L.hidden = false; L.querySelector('input').value = link;
        L.querySelector('.shl-cp').onclick = async () => { L.querySelector('.shl-cp').textContent = (await copyText(link)) ? 'Copied' : 'Select it'; L.querySelector('input').select(); };
        x.hidden = true; go.textContent = 'Done'; go.disabled = false; go.onclick = () => el.remove();
      },
      links: list => {
        $('.shl-fld').hidden = true; $('.shl-note').textContent = ''; $('.shl-st').textContent = '';
        $('.shl-lead').innerHTML = 'The review is ready. Send each team its own link — each person is named by their Google sign-in. All three are also kept in <b>Review links</b> on the home page.';
        const box = document.createElement('div'); box.className = 'rv-lks shl-lks';
        box.innerHTML = list.map(l => '<div class="rv-lk"><div class="rv-lk-t"><b>' + esc(l.who) + '</b><s>' + esc(l.what) + '</s></div><div class="rv-lk-r"><input class="p-in" readonly value="' + esc(l.link) + '" aria-label="' + esc(l.who) + ' link"><button type="button" class="p-ghost" data-copy="' + esc(l.link) + '">Copy</button></div></div>').join('');
        box.addEventListener('click', async e => { const b = e.target.closest('[data-copy]'); if (!b) return; const ok = await copyText(b.dataset.copy); b.textContent = ok ? 'Copied' : 'Select it'; });
        $('.shl-acts').before(box); el.querySelector('.shl-dlg-c').classList.add('shl-wide');
        x.hidden = true; go.textContent = 'Done'; go.disabled = false; go.onclick = () => el.remove();
      },
      close: () => el.remove(),
    };
    if (showWho()) $('.shl-note').textContent = '';
    if (o.busy) api2.busy(o.lead); else if (!StudioBase.shareWho()) setTimeout(() => inp.focus(), 30);
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
        '<div class="shl-share"><input class="p-in" readonly aria-label="Edit link"><button class="p-ghost" type="button">' + svg(ICON.link) + 'Copy link</button></div>' +
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
    $('.shl-me').onclick = async e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.who) {
        const D = window.providentDrive;
        D.signOut();
        try { await D.signIn(); } catch (er) { ui.flash(er.message || 'Could not sign in'); }
        if (eng.shRender) eng.shRender(); else if (eng.rvRender) eng.rvRender();
        return;
      }
      const v = (window.prompt('Your name, shown beside your changes:', StudioBase.shareName()) || '').replace(/\s+/g, ' ').trim();
      if (v) { lsSet(NAME_KEY, v); eng.shRender(); }
    };
    $('.shl-leave').onclick = () => {
      if (window.confirm('Stop following the link? The project stays open here, but your changes will no longer reach the link, and theirs will not reach you — on this computer, until you open the link again.')) { eng._shLeave = true; eng.shareStop(); }
    };
    let lastTop = '', toastT = 0;
    const ui = {
      root,
      status(kind, msg) {
        root.dataset.st = kind;
        $('.shl-state').textContent = kind === 'saving' ? (msg || 'Saving your changes…') : kind === 'error' ? (msg || 'Not saved yet')
          : kind === 'view' ? 'View only' : 'Saved';
        $('.shl-state').className = 'shl-state ' + kind;
      },
      flash(t) { const el = $('.shl-toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 3200); },
      set(v) {
        $('.shl-share input').value = v.link; $('.shl-share button').title = v.link;
        const ph = $('.shl-ph'), pn = Math.max(v.pv || 0, v.gone || 0);
        ph.hidden = !pn;
        if (pn) ph.querySelector('p').innerHTML = '<b>' + pn + ' full-size photo' + (pn > 1 ? 's have' : ' has') + ' expired.</b> '
          + ((v.pv || 0) ? 'The canvas shows ' + (pn > 1 ? 'previews' : 'a preview') + '. ' : '')
          + 'Photos are kept 60 days after the link was last opened. Pick the project’s saved .json (in its Source folder) to put them back for everyone.';
        $('.shl-sub').textContent = v.people > 1 ? v.people + ' people have edited' : 'Shared edit link';
        { const w = StudioBase.shareWho();
          const nm = String(v.me || 'Someone'), ini = nm.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || '?';
          $('.shl-me').innerHTML = '<span class="shl-av" aria-hidden="true">' + esc(ini) + '</span><b title="' + esc((root.dataset.role === 'pm' ? 'Viewing as ' : 'Editing as ') + nm + (w ? ' · ' + w.email : '')) + '">' + esc(nm) + '</b>'
            + (w ? '<button type="button" data-who="1">Not you?</button>' : '<button type="button">Change</button>'); }
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
.shl-who{margin:4px 0 0;font:400 13px/1.45 var(--ps-font);color:var(--ps-ink-2);display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px}
.shl-who[hidden]{display:none}
.shl-who b{font-weight:500;color:var(--ps-ink)}
.shl-who s{text-decoration:none;flex:1 0 100%;font-size:12px;color:var(--ps-dim)}
.shl-notme{border:none;background:none;padding:0;color:var(--ps-link);font:inherit;text-decoration:underline;cursor:pointer}
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
.rva-gd{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px;padding:12px 16px;border-radius:14px;background:var(--ps-card);box-shadow:inset 0 0 0 1px var(--ps-hair)}
.rva-gd[hidden]{display:none}
.rva-gd-t{display:flex;align-items:center;gap:12px;min-width:0;flex:1 1 280px}
.rva-gd-t>i{flex:none;width:8px;height:8px;border-radius:50%;background:var(--ps-dim)}
.rva-gd[data-s="ok"] .rva-gd-t>i{background:var(--ps-good)}
.rva-gd[data-s="exp"] .rva-gd-t>i{background:var(--ps-warn)}
.rva-gd[data-s="busy"] .rva-gd-t>i{background:var(--ps-link);animation:rvaGdP 1s ease-in-out infinite alternate}
@keyframes rvaGdP{to{opacity:.3}}
@media (prefers-reduced-motion:reduce){.rva-gd[data-s="busy"] .rva-gd-t>i{animation:none}}
.rva-gd-t>span{display:flex;flex-direction:column;gap:2px;min-width:0}
.rva-gd-k{font:500 13px/1.3 var(--ps-font);color:var(--ps-ink)}
.rva-gd-t s{text-decoration:none;font:400 12.5px/1.4 var(--ps-font);color:var(--ps-ink-2);overflow-wrap:anywhere}
.rva-gd-t s b{font-weight:500;color:var(--ps-ink)}
.rva-gd-a{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.rva-gd-a .p-ghost,.rva-gd-a .p-btn{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px;white-space:nowrap}
.rva-gd-a svg{width:16px;height:16px;fill:currentColor}
.rva-gd-sw{border:none;background:none;padding:0 4px;font:400 12.5px/1 var(--ps-font);color:var(--ps-link);text-decoration:underline;cursor:pointer}
.rva-gd-sw:disabled,.rva-gd-a button:disabled{opacity:.5;cursor:default}
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
/* ---- Review links, redesigned: one number leads, steps as columns, cards say what is next ---- */
.rva-bar{justify-content:flex-end}
.rva-add{position:relative;flex:0 1 420px;display:flex;align-items:center;gap:8px}
.rva-add-i{position:absolute;left:12px;width:18px;height:18px;fill:var(--ps-dim);pointer-events:none}
.rva-add .p-in{height:38px;padding-left:38px}
.rva{container-type:inline-size}
/* the setup widget's shape: a header band, then the body */
.rva-hl{flex-direction:column;align-items:stretch;gap:0;padding:0;overflow:hidden;border-radius:16px;background:var(--ps-card);box-shadow:inset 0 0 0 1px var(--ps-line)}
.rvo-h{display:flex;align-items:center;gap:28px;padding:24px 28px;background:var(--ps-card-h)}
.rvo-ht{flex:1;min-width:0;display:flex;align-items:center;gap:16px}
.rvo-t{flex:1;min-width:0}
.rvo-t h2{margin:4px 0 6px;font:500 26px/1.15 var(--ps-font);letter-spacing:-.015em;color:var(--ps-ink)}
.rvo-t p{margin:0;font:400 14px/1.45 var(--ps-font);color:var(--ps-ink-2)}
.rvo-in{display:flex;flex-direction:column;gap:14px;padding:24px 28px;border-top:1px solid var(--ps-hair)}
.rvo-in[hidden]{display:none}
.rvo-in .rvo-steps{padding:0;border:none}
.rvo-fig{flex:none;display:block;width:150px;aspect-ratio:400/320;
  --hairline-plate:var(--ps-fill);--hairline-hi:var(--ps-ink);--hairline-edge:var(--ps-ink-2);--hairline-mid:var(--ps-ink-2);--hairline-lo:var(--ps-dim);--hairline-stroke:1}
.rva-hl:hover .rvo-fig{--hairline-hi:var(--ps-link)}
.rvo-fig svg{display:block;width:100%;height:100%}
@container (max-width:700px){.rvo-h{flex-direction:column;align-items:flex-start;padding:20px;gap:12px}.rvo-fig{width:96px}.rvo-ht{align-self:stretch;flex-direction:column;align-items:flex-start;gap:8px}.rvo-t{flex:none}.rvo-t h2{font-size:21px}.rvo-in{padding:20px}.rvo-steps{grid-template-columns:repeat(2,1fr);row-gap:18px}}
.rvo-top{display:flex;align-items:flex-end;gap:32px;flex-wrap:wrap}
.rvo-hero{display:flex;flex-direction:column;gap:4px;margin-right:auto}
.rvo-k{font:500 13px/1.2 var(--ps-font);color:var(--ps-ink-2)}
.rvo-hero b{font:400 48px/1 var(--ps-font);letter-spacing:-.02em;color:var(--ps-ink);font-variant-numeric:tabular-nums}
.rvo-hero b i{margin-left:10px;font:400 18px/1 var(--ps-font);font-style:normal;color:var(--ps-dim);letter-spacing:0}
.rvo-stats{display:flex;gap:28px;margin:0;padding:0 0 4px}
.rvo-stats div{display:flex;flex-direction:column-reverse;gap:4px}
.rvo-stats dd{margin:0;font:500 22px/1 var(--ps-font);color:var(--ps-ink);font-variant-numeric:tabular-nums}
.rvo-stats dt{font:400 12.5px/1.2 var(--ps-font);color:var(--ps-dim)}
.rvo-up{display:flex;align-items:center;gap:4px;padding-bottom:2px;font:400 12.5px/1 var(--ps-font);color:var(--ps-dim);white-space:nowrap}
.rvo-re{display:grid;place-items:center;width:32px;height:32px;padding:0;border:none;border-radius:9999px;background:none;color:var(--ps-ink-2);cursor:pointer}
.rvo-re:hover{background:var(--ps-fill);color:var(--ps-ink)}
.rvo-re-i{width:18px;height:18px;fill:currentColor}
.rvo-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:0;padding:20px 0 0;list-style:none;border-top:1px solid var(--ps-hair)}
.rvo-steps li{display:flex;flex-direction:column;gap:8px;min-width:0}
.rvo-steps span{display:flex;align-items:center;gap:7px;font:500 12.5px/1.2 var(--ps-font);color:var(--ps-ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rvo-steps span i{flex:none;width:8px;height:8px;border-radius:50%}
.rvo-steps b{font:400 26px/1 var(--ps-font);color:var(--ps-ink);font-variant-numeric:tabular-nums}
.rvo-steps [data-zero] b{color:var(--ps-dim)}
.rvo-steps em{display:block;height:4px;border-radius:9999px;background:var(--ps-fill);overflow:hidden}
.rvo-steps em s{display:block;height:100%;border-radius:inherit;text-decoration:none}
.rvo-steps [data-i="0"] i,.rvo-steps [data-i="0"] s,.rva-now[data-i="0"] i{background:var(--ps-dim)}
.rvo-steps [data-i="1"] i,.rvo-steps [data-i="1"] s,.rva-now[data-i="1"] i{background:var(--ps-warn)}
.rvo-steps [data-i="2"] i,.rvo-steps [data-i="2"] s,.rva-now[data-i="2"] i{background:var(--ps-link)}
.rvo-steps [data-i="3"] i,.rvo-steps [data-i="3"] s,.rva-now[data-i="3"] i{background:var(--ps-good)}
.rva-g h3{display:flex;align-items:center;gap:8px;margin:0 0 12px;font:500 14px/1.3 var(--ps-font);color:var(--ps-ink-2)}
.rva-g h3 s{display:inline-grid;place-items:center;min-width:22px;height:22px;padding:0 7px;box-sizing:border-box;margin:0;border-radius:9999px;background:var(--ps-fill);font:500 12px/1 var(--ps-font);color:var(--ps-ink-2);text-decoration:none}
.rva-grid{grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:12px}
.rva-c{align-items:stretch;gap:16px;padding:14px 12px 14px 14px;border-radius:16px;background:var(--ps-card);box-shadow:inset 0 0 0 1px var(--ps-line)}
.rva-c:hover{box-shadow:inset 0 0 0 1px var(--ps-ink-2)}
.rva-c:hover .rva-go{color:var(--ps-ink);transform:translateX(2px)}
.rva-th{width:95px;height:95px;border-radius:10px;align-self:center}
.rva-br{display:inline-flex;align-items:center;gap:5px;margin-right:8px;padding:1px 8px;border-radius:9999px;font-size:11.5px;font-weight:500;font-style:normal;color:var(--ps-ink);box-shadow:inset 0 0 0 1px var(--ps-line)}
.rva-br::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--ps-ink-2)}
.rva-br[data-k="provident"]::before{background:#F3793C}
.rva-br[data-k="mixed"]::before{background:none;box-shadow:inset 0 0 0 1.5px #F3793C}
.rva-ct{gap:8px;justify-content:center}
.rva-n b{font:500 16px/1.25 var(--ps-font);color:var(--ps-ink)}
.rva-now{display:flex;align-items:center;gap:7px;min-width:0;font:400 13px/1.3 var(--ps-font);color:var(--ps-ink-2)}
.rva-now i{flex:none;width:8px;height:8px;border-radius:50%;background:var(--ps-dim)}
.rva-now b{flex:none;font-weight:500;color:var(--ps-ink)}
.rva-now b::after{content:'·';margin-left:7px;color:var(--ps-dim);font-weight:400}
.rva-now b:last-child::after{content:none}
.rva-now u{min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;text-decoration:none}
.rva-now s{flex:none;padding:2px 6px;border-radius:9999px;background:var(--ps-fill);font:500 11px/1 var(--ps-font);color:var(--ps-ink-2);text-decoration:none}
.rva-segs{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;max-width:220px}
.rva-segs i{height:4px;border-radius:9999px;background:var(--ps-fill-h)}
.rva-segs i[data-s="done"]{background:var(--ps-link)}
.rva-segs i[data-s="cur"]{box-shadow:inset 0 0 0 1px var(--ps-link)}   /* no gradient fills in the chrome */
.rva-c[data-ready] .rva-segs i{background:var(--ps-good)}
.rva-m{font:400 12.5px/1.3 var(--ps-font);color:var(--ps-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rva-n b{white-space:normal;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
.rva-go{flex:none;align-self:center;width:20px;height:20px;fill:currentColor;color:var(--ps-dim);transition:transform var(--ps-motion,.15s) var(--ps-ease,ease)}
@media (max-width:760px){.rvo-top{gap:20px}.rvo-hero{flex-basis:100%}.rvo-hero b{font-size:40px}.rvo-steps{grid-template-columns:repeat(2,1fr);row-gap:18px}.rva-add{flex-basis:100%}.rva-grid{grid-template-columns:minmax(0,1fr)}.rva-c{min-width:0}.rva-th{width:76px;height:76px}}
@media (prefers-reduced-motion:reduce){.rva-go{transition:none}}
/* THE AD SET PAGE, REORDERED (2026-10-27, by request): header, then its controls (Add a
   project opens a pop-up; Remove / Delete sit quietly at the right), Progress edge to edge,
   the three team links side by side, Audiences beside Details + Google Drive, Activity last. */
.rva-dh{max-width:none;margin-bottom:0}
.rva-tools{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px 16px;margin:14px 0 24px;padding:10px 0 0;box-shadow:inset 0 1px 0 var(--ps-hair)}
.rva-tl{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 14px 0 10px}
.rva-tl .rva-i{width:18px;height:18px}
.rva-tools-r{display:flex;flex-wrap:wrap;gap:4px 18px}
.rva-tools .rva-rm{align-self:center}
.rva-det{display:flex;flex-direction:column;gap:20px;min-width:0}
.rva-det .rva-cols{max-width:none}
/* Activity sits under Audiences, at its width, with Details + Google Drive beside both. */
.rva-det .rva-cols{grid-template-areas:'au side' 'act side'}
.rva-det .rva-auc{grid-area:au}.rva-det .rva-side{grid-area:side}.rva-det .rva-actc{grid-area:act}
@media (max-width:1100px){.rva-det .rva-cols{grid-template-areas:'au' 'side' 'act'}}
.rva-prog{padding:24px 28px}
.rva-ph{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:8px 24px;margin-bottom:22px}
.rva-ph h3{margin:0!important}
.rva-ph .rva-next{margin:0;padding:6px 12px;font:400 13px/1.45 var(--ps-font);color:var(--ps-ink-2)}
.rva-ph .rva-next[data-s="ready"]{color:var(--ps-ink)}
.rva-prog .rv-st b{font-size:14px}
.rva-lnk h3{display:flex;align-items:baseline;gap:10px;margin:0 0 12px;font:500 14px/1.3 var(--ps-font);color:var(--ps-ink-2)}
.rva-lnk h3 s{text-decoration:none;font:400 12.5px/1.3 var(--ps-font);color:var(--ps-dim)}
.rva-det .rva-lks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.rva-det .rva-lk{flex-direction:column;align-items:stretch;gap:8px;padding:16px!important;border-radius:16px;background:var(--ps-card);box-shadow:inset 0 0 0 1px var(--ps-line)!important}
.rva-lk-h{display:flex;align-items:center;gap:10px}
.rva-lk-h b{font:500 14px/1.3 var(--ps-font);color:var(--ps-ink)}
.rva-det .rva-lk-i{width:32px;height:32px;border-radius:9px}
.rva-det .rva-lk-i .rva-i{width:18px;height:18px}
.rva-det .rva-lk>s{flex:1;text-decoration:none;font:400 12.5px/1.45 var(--ps-font);color:var(--ps-dim)}
.rva-lk-r{display:flex;align-items:center;gap:8px;padding:4px 4px 4px 12px;border-radius:10px;background:var(--ps-fill)}
.rva-lk-r code{flex:1;min-width:0;overflow:hidden;font:400 11.5px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--ps-ink-2);white-space:nowrap;text-overflow:ellipsis}
.rva-lk-r .rva-cp{height:32px}
.rva-det .rva-aus{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(460px,100%),1fr));gap:14px}
.rva-det .rva-au{gap:16px;padding:16px!important;border-radius:14px;background:var(--ps-fill);box-shadow:none!important}
.rva-det .rva-au[data-done]{box-shadow:inset 0 0 0 1px var(--ps-good)!important}
.rva-au-n{display:flex;flex-direction:column;gap:2px;min-width:0}
.rva-au-n s{text-decoration:none;font:400 12px/1.3 var(--ps-font);color:var(--ps-dim)}
.rva-au-n b{font:500 16px/1.25 var(--ps-font);color:var(--ps-ink)}
.rva-au .rv-st b{font-size:12px}.rva-au .rv-st s{font-size:11px}
.rva-au .rv-dot{background:var(--ps-fill)}
.rva-det .rva-au .rv-pill[data-s="ready"]{color:var(--ps-ink)}   /* the green wash sits on the card's fill here, where green ink drops under 4.5 */
.rva-det .rva-au-p{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;align-items:start}
.rva-lt{display:flex;flex-direction:column;gap:6px;min-width:0}
.rva-lt .rva-pj{width:100%;display:flex;align-items:center;gap:10px;padding:8px;border-radius:12px;background:var(--ps-card);box-shadow:inset 0 0 0 1px var(--ps-line)}
.rva-lt .rva-pj:hover:not(:disabled){box-shadow:inset 0 0 0 2px var(--ps-link)}
.rva-lt-th{flex:none;width:44px;height:55px;border-radius:8px;overflow:hidden;background:var(--ps-fill-h)}
.rva-lt-th img{width:100%;height:100%;object-fit:cover;display:block}
.rva-lt-t{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}
.rva-lt-t b{font:500 13px/1.3 var(--ps-font);color:var(--ps-ink)}
.rva-lt-t s{overflow:hidden;text-decoration:none;font:400 12px/1.3 var(--ps-font);color:var(--ps-ink-2);white-space:nowrap;text-overflow:ellipsis;max-width:none}
.rva-lt-t u{display:inline-flex;align-items:center;gap:5px;text-decoration:none;font:400 11.5px/1.3 var(--ps-font);color:var(--ps-dim)}
.rva-lt-t u i{width:6px;height:6px;border-radius:50%;background:var(--ps-warn)}
.rva-lt[data-ok] .rva-lt-t u i{background:var(--ps-good)}
.rva-lt .rva-pj>.rva-i{flex:none;width:16px;height:16px;fill:currentColor;color:var(--ps-dim)}
.rva-lt[data-empty]{flex-direction:row;align-items:center;gap:10px;padding:8px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--ps-line)}
.rva-lt[data-empty] .rva-lt-th{background:none;box-shadow:inset 0 0 0 1px var(--ps-line)}
.rva-lt[data-empty] .rva-lt-t s{white-space:normal;color:var(--ps-dim)}
.rva-lt .rva-pja{gap:4px 12px;padding:0 4px}
.rva-lkb{border:none;background:none;padding:2px 0;font:400 12px/1.3 var(--ps-font);color:var(--ps-ink-2);cursor:pointer}
.rva-lkb:hover{color:var(--ps-ink);text-decoration:underline}
.rva-lt .rva-rl{display:flex;flex-wrap:wrap;gap:6px}
.rva-lt .rva-rl select.p-in{flex:1 1 90px;height:32px}
.rva-mod{position:fixed;inset:0;z-index:300;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.5)}
.rva-mod-in{width:min(520px,100%);max-height:min(640px,calc(100vh - 32px));overflow:auto;padding:20px 22px 22px;box-sizing:border-box;border-radius:16px;background:var(--ps-card);box-shadow:0 0 0 1px var(--ps-line)}
.rva-mod-h{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
.rva-mod-h h3{margin:0;font:500 17px/1.3 var(--ps-font);color:var(--ps-ink)}
.rva-mod-x{display:grid;place-items:center;width:32px;height:32px;border:none;border-radius:50%;background:none;color:var(--ps-ink-2);cursor:pointer}
.rva-mod-x:hover{background:var(--ps-fill)}
.rva-mod-x .rva-i{width:20px;height:20px}
.rva-mod .rva-sub{margin:0 0 14px}
.rva-mod-e{white-space:normal}
@media (max-width:1100px){.rva-det .rva-lks{grid-template-columns:minmax(0,1fr)}}
@media (max-width:760px){.rva-prog{padding:18px 16px}.rva-prog .rv-st b{font-size:12px}.rva-det .rva-aus{grid-template-columns:minmax(0,1fr)}.rva-det .rva-au-p{grid-template-columns:minmax(0,1fr)}.rva-tools-r{width:100%;justify-content:flex-start}}
/* REVIEW PANEL AND DETAILS WINDOW, REFINED (2026-10-28): one thing per tier. The ad set's
   name is the panel's title; where it stands is ONE line (step n of 4, the step, four
   segments); explanations live in an "i" or a step's tooltip. No step carries a sub-line. */
.rv-i{flex:none;display:inline-grid;place-items:center;width:16px;height:16px;border-radius:50%;box-shadow:inset 0 0 0 1px var(--ps-line);color:var(--ps-dim);font:italic 500 10.5px/1 Georgia,serif;cursor:help}
.rv-i:hover,.rv-i:focus-visible{color:var(--ps-ink);box-shadow:inset 0 0 0 1px var(--ps-ink-2);outline:none}
.rv-seg{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:4px;width:100%}
.rv-seg i{height:4px;border-radius:2px;background:var(--ps-line)}
.rv-seg i[data-s="done"]{background:var(--ps-link)}
.rv-seg i[data-s="cur"]{background:color-mix(in srgb,var(--ps-link) 40%,var(--ps-line))}
.rv-now{display:flex;flex-direction:column;gap:6px}
.rv-now .rv-k{font:400 12px/1.3 var(--ps-font);color:var(--ps-dim)}
.rv-now-t{display:flex;align-items:center;gap:8px;margin-bottom:4px}
.rv-now-t b{font:500 20px/1.25 var(--ps-font);letter-spacing:-.01em;color:var(--ps-ink)}
.rv-now[data-s="done"] .rv-now-t b{color:var(--ps-good)}
.rv-main{gap:20px}
.rv{gap:16px;padding:4px 16px 20px}
.rs-cur{gap:10px;padding:14px;border-radius:12px}
.rs-cur .rv-k{font:400 12px/1.3 var(--ps-font);color:var(--ps-dim)}
.rs-cur-t{display:flex;align-items:center;gap:8px}
.rs-cur-t b{font:500 15px/1.3 var(--ps-font);color:var(--ps-ink)}
.rs-cur .rv-acts .p-btn{flex:1 1 100%;height:40px}
.rs-sec{display:flex;flex-direction:column;gap:10px}
.rs-h{margin:0;font:400 12px/1.3 var(--ps-font);color:var(--ps-dim)}
.rs-h s{margin-left:4px;text-decoration:none}
.rs-a{gap:8px;padding:14px 0}
.rs-ah{cursor:default}
.rs-ah b{font-size:14px}
.rs-st{flex:none;font:400 12px/1.3 var(--ps-font);color:var(--ps-ink-2);white-space:nowrap}
.rs-st[data-s="done"]{color:var(--ps-good)}
.rs-a .rv-seg{max-width:120px}
.rs-a.rs-on .rs-ah b{color:var(--ps-ink)}
.rs-a.rs-on .rs-ah b::before{content:'';display:inline-block;width:6px;height:6px;margin:0 7px 2px 0;border-radius:50%;background:var(--ps-link)}
.rs-its{gap:8px;margin-top:2px}
.rs-it>span{width:30px;font:400 11.5px/1 var(--ps-font);color:var(--ps-dim)}
.rv-sum{margin:0;display:flex;align-items:center;justify-content:space-between;gap:12px;font:400 12.5px/1.4 var(--ps-font);color:var(--ps-ink-2)}
.rv-sum a{color:var(--ps-link);text-decoration:none;font-weight:500}
.rv-sum a:hover{text-decoration:underline}
.rv-ntf{font:400 12.5px/1.4 var(--ps-font);text-decoration:none;color:var(--ps-link)}
.rv-ntf:hover{text-decoration:underline}
.shl-share{padding:12px 16px 0}
.shl-share .p-in{display:none}
.shl-share .p-ghost{flex:1;justify-content:center;height:38px}
.shl-me{display:flex;align-items:center;gap:8px;margin:12px 16px 0;font-style:normal}
.shl-me .shl-av{width:24px;height:24px;flex:none;border-radius:50%;display:grid;place-items:center;background:var(--ps-fill);color:var(--ps-ink-2);font:500 10.5px/1 var(--ps-font)}
.shl-me b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:500 13px/1.3 var(--ps-font);color:var(--ps-ink)}
.shl-me button{flex:none;margin-left:auto;font:400 12px/1.3 var(--ps-font);color:var(--ps-dim);text-decoration:none}
.shl-me button:hover{color:var(--ps-ink);text-decoration:underline}
.shl-state{margin:2px 16px 12px 48px;font-style:normal}
/* the details window */
.rvh-dh{align-items:center;padding:22px 20px 18px 24px;box-shadow:inset 0 -1px 0 var(--ps-hair)}
.rvh-dh h2{margin:0;font:500 22px/1.25 var(--ps-font)}
.rvh-sub{margin:4px 0 0;font:400 13px/1.4 var(--ps-font);color:var(--ps-dim)}
.rvh-dhr{flex:none;display:flex;align-items:center;gap:12px}
.rvh-db{padding:22px 24px 12px;gap:24px}
.rvh-ov .rv-now{max-width:420px}
.rvh-db h3{margin:0 0 12px;font:400 12.5px/1.3 var(--ps-font);color:var(--ps-dim)}
.rvh-al{gap:10px}
.rvh-al>li{padding:18px 20px 20px;background:var(--ps-fill)}
.rvh-al>li[data-s="done"]{background:var(--ps-good-q)}
.rvh-ah{align-items:flex-start;margin-bottom:20px}
.rvh-ah>div{display:flex;flex-direction:column;gap:3px;min-width:0}
.rvh-ah b{font:500 16px/1.3 var(--ps-font);color:var(--ps-ink)}
.rvh-ah s{text-decoration:none;font:400 12.5px/1.35 var(--ps-font);color:var(--ps-ink-2)}
.rvh-ah .rs-st{padding-top:3px}
.rv-st-b li{cursor:default}
.rv-st-b b{font:400 13px/1.3 var(--ps-font)}
.rv-st-b [data-s="cur"] b{font-weight:500;color:var(--ps-ink)}
.rv-st-b [data-s="done"] b{color:var(--ps-ink-2)}
.rv-st-b [data-s="pend"] b{color:var(--ps-dim)}
.rvh-al .rv-dot{background:var(--ps-fill)}
.rvh-al>li[data-s="done"] .rv-dot{background:var(--ps-link)}
.rvh-df{padding:14px 24px 18px}
@media (max-width:560px){.rvh-dh{flex-wrap:wrap}.rvh-al>li{padding:16px}.rv-st-b b{font-size:11.5px}}
/* PM's package widget (2026-10-28): no longer a bar across the top of the window. It sits in
   the Ad sets pane under the audience's header, shaped like the setup widget. */
html.rv-pm .as-ov{top:0}
.rvh-host{display:none}
html.rv-pm .rvh-host{display:block;padding-top:20px}
html.rv-pm .rvh,html.rv-pm.shl-open .rvh{position:static;inset:auto;z-index:auto;right:auto;background:none;box-shadow:none}
body>.rvh{display:none}
.rvh-in{display:block;padding:0;border-radius:16px;overflow:hidden;background:var(--ps-card);box-shadow:0 0 0 1px var(--ps-line)}
.rvh-wh{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:22px 24px;background:var(--ps-card-h);box-shadow:inset 0 -1px 0 var(--ps-line)}
.rvh-wh .rvh-t{max-width:none;gap:4px}
.rvh-wh .rvh-k{font:400 12.5px/1.3 var(--ps-font);color:var(--ps-dim)}
.rvh-wh .rvh-t b{white-space:normal;font:500 22px/1.25 var(--ps-font);letter-spacing:-.01em;color:var(--ps-ink)}
.rvh-wh .rvh-t s{text-decoration:none;font:400 13.5px/1.4 var(--ps-font);color:var(--ps-ink-2)}
.rvh-wb{padding:24px}
.rvh-wb .rvh-st{width:100%}
.rvh-in>.rvh-a{display:flex;justify-content:flex-end;gap:8px;padding:14px 24px;box-shadow:inset 0 1px 0 var(--ps-line)}
@media (max-width:760px){.rvh-wh{padding:18px 16px}.rvh-wb{padding:18px 16px}.rvh-in>.rvh-a{padding:12px 16px;flex-wrap:wrap}.rvh-in>.rvh-a button{flex:1}}
/* ══ TICKETS, STATUS AND THE AD SET TAB (2026-10-28) ══ one weight per tier: a 500 title, ink-2
   labels, dim facts; every explanation is a tooltip. */
.rsp-i{display:inline-grid;place-items:center;width:15px;height:15px;margin-left:4px;border-radius:50%;background:var(--ps-fill);color:var(--ps-ink-2);font:600 10px/1 var(--ps-font);font-style:normal;cursor:help;vertical-align:1px}
.rsp-fw{max-width:none}
.rsp-raw{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:16px}
.rsp-raw textarea.p-in{width:100%;box-sizing:border-box;min-height:118px;height:auto;padding:12px 14px;font-size:14.5px;line-height:1.5;resize:vertical}
.rsp-files{display:flex;flex-wrap:wrap;align-content:flex-start;gap:8px;min-height:118px;padding:10px;box-sizing:border-box;border-radius:12px;box-shadow:inset 0 0 0 1px var(--ps-line)}
.rsp-add{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px 0 10px;border-radius:9999px;background:var(--ps-fill);color:var(--ps-ink);font:500 13px/1 var(--ps-font);cursor:pointer}
.rsp-add:hover{background:var(--ps-fill-h)}
.rsp-add:focus-within{outline:2px solid var(--ps-ink);outline-offset:2px}
.rsp-add svg,.rsp-fc svg,.rsp-tk svg,.rsp-lnk svg{width:18px;height:18px;fill:currentColor;flex:none}
.rsp-fc{display:inline-flex;align-items:center;gap:6px;max-width:100%;height:34px;padding:0 4px 0 10px;border-radius:9999px;background:var(--ps-card-h);box-shadow:inset 0 0 0 1px var(--ps-hair);color:var(--ps-ink-2)}
.rsp-fc b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:400 12.5px/1 var(--ps-font);color:var(--ps-ink)}
.rsp-fc button{display:grid;place-items:center;width:26px;height:26px;padding:0;border:none;border-radius:50%;background:none;color:var(--ps-dim);cursor:pointer}
.rsp-fc button:hover{background:var(--ps-fill);color:var(--ps-ink)}
.rsp-fc button svg{width:16px;height:16px}
.rsp-tk{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 18px 0 14px;white-space:nowrap}
.rsp-ft{position:relative;flex-wrap:wrap}
.rsp-pg{position:absolute;left:0;right:0;top:0;height:2px;margin:0;border-radius:0}
.rsp-done{display:flex;align-items:center;gap:16px}
.rsp-ok{flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:var(--ps-good-q);color:var(--ps-good)}
.rsp-ok svg{width:24px;height:24px;fill:currentColor}
.rsp-done div{display:flex;flex-direction:column;gap:2px;min-width:0}
.rsp-done b{font:500 20px/1.25 var(--ps-font);color:var(--ps-ink)}
.rsp-done s{text-decoration:none;font:400 13.5px/1.45 var(--ps-font);color:var(--ps-ink-2)}
.rsp-lnk{display:flex;align-items:center;gap:10px;padding:8px 8px 8px 14px;border-radius:12px;background:var(--ps-fill)}
.rsp-lnk code{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:400 12.5px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--ps-ink-2)}
.rsp-lnk .p-ghost{display:inline-flex;align-items:center;gap:6px;flex:none}
@media (max-width:760px){.rsp-raw{grid-template-columns:1fr}.rsp-files{min-height:0}.rsp-tk{flex:1;justify-content:center}}
/* Status */
.rva-new{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 18px 0 12px;margin-right:auto;white-space:nowrap}
.rva-new svg{width:18px;height:18px;fill:currentColor}
.rva-th-t{display:grid;place-items:center;background:var(--ps-fill)}
.rva-ti{width:30px;height:30px;fill:var(--ps-ink-2)}
.rva-th-l.rva-th-t .rva-ti{width:44px;height:44px}
.rva-now[data-i="o"] i{background:var(--ps-link)}
.rva-c[data-open] .rva-now b{color:var(--ps-ink)}
.rv-pill[data-s="open"]{background:var(--ps-accent);color:var(--ps-accent-i)}
.rv-pill[data-s="open"]::before{background:var(--ps-link)}
.rva-brief .rva-bt{margin:0 0 12px}
.rva-bt summary{cursor:pointer;font:400 14px/1.45 var(--ps-font);color:var(--ps-ink);list-style:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rva-bt summary::-webkit-details-marker{display:none}
.rva-bt[open] summary{display:none}
.rva-bt p{margin:0;max-height:320px;overflow:auto;white-space:pre-wrap;font:400 14px/1.55 var(--ps-font);color:var(--ps-ink)}
.rva-fls{display:flex;flex-wrap:wrap;gap:8px}
.rva-fl{display:inline-flex;align-items:center;gap:6px;max-width:100%;height:34px;padding:0 12px 0 10px;border-radius:9999px;background:var(--ps-fill);color:var(--ps-ink);text-decoration:none;font:400 12.5px/1 var(--ps-font)}
.rva-fl:hover{background:var(--ps-fill-h)}
.rva-fl span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rva-fi{width:18px;height:18px;flex:none;fill:var(--ps-ink-2)}
.rva-tk{display:flex;flex-direction:column;gap:16px;max-width:1240px}
.rva-tks{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(176px,1fr));gap:10px}
.rva-tkt{display:flex;flex-direction:column;gap:3px;padding:14px 16px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--ps-line)}
.rva-tkt s{text-decoration:none;font:400 12px/1.2 var(--ps-font);color:var(--ps-dim)}
.rva-tkt b{font:500 16px/1.2 var(--ps-font);color:var(--ps-ink)}
.rva-tkt span{margin-top:6px;font:600 11px/1 var(--ps-font);letter-spacing:.04em;color:var(--ps-ink-2)}
.rva-da .p-btn{display:inline-flex;align-items:center;gap:8px}
.rva-da .p-btn svg{width:18px;height:18px;fill:currentColor}
/* a campaign project's Changes pill and panel step aside: the Ad set tab carries both */
.shl[data-camp] .shl-pill,.shl[data-camp] .shl-panel{display:none!important}
/* the Ad set tab */
.adt{display:flex;flex-direction:column;gap:20px;padding:24px;border-radius:16px;background:var(--ps-card);box-shadow:inset 0 0 0 1px var(--ps-line);font-family:var(--ps-font)}
.adt-h{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px 24px}
.adt-ht{display:flex;flex-direction:column;gap:4px;min-width:0}
.adt-k{font:400 12.5px/1.3 var(--ps-font);color:var(--ps-dim)}
.adt-h h2{margin:0;font:500 24px/1.2 var(--ps-font);letter-spacing:-.01em;color:var(--ps-ink)}
.adt-h h2 s{margin-left:6px;text-decoration:none;font-weight:400;color:var(--ps-ink-2)}
.adt-now{display:flex;align-items:center;gap:8px;margin:4px 0 0;font:400 13.5px/1.4 var(--ps-font);color:var(--ps-ink-2)}
.adt-now i{width:8px;height:8px;border-radius:50%;background:var(--ps-warn);flex:none}
.adt-now[data-s="done"] i{background:var(--ps-good)}
.adt-acts{display:flex;align-items:center;flex-wrap:wrap;gap:8px}
.adt-go,.adt-ov{display:inline-flex;align-items:center;gap:8px;height:40px;white-space:nowrap}
.adt-go{padding:0 16px 0 20px}
.adt-go svg,.adt-ov svg,.adt-none .p-btn svg{width:18px;height:18px;fill:currentColor;flex:none}
.adt-none .p-btn{display:inline-flex;align-items:center;gap:8px;height:40px;flex-direction:row-reverse;padding:0 16px 0 20px}
.adt-q{height:40px;padding:0 10px;border:none;background:none;color:var(--ps-ink-2);font:500 14px/1 var(--ps-font);cursor:pointer;text-decoration:underline;text-decoration-color:var(--ps-line);text-underline-offset:4px}
.adt-q:hover{color:var(--ps-ink);text-decoration-color:currentColor}
.adt-q:disabled{opacity:.45;cursor:default}
.adt-lead{margin:0;font:400 13.5px/1.5 var(--ps-font);color:var(--ps-ink-2)}
.adt .rv-st-b b{font-size:12.5px}
.adt-card{display:block;margin-top:16px;padding:20px;border-radius:16px;background:var(--ps-card);box-shadow:inset 0 0 0 1px var(--ps-line);font-family:var(--ps-font)}
[data-adt="bot"]>.rva-card{margin-top:16px}
.adt-ch{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
.adt-card h3,[data-adt] .rva-card h3{margin:0;font:500 14px/1.3 var(--ps-font);color:var(--ps-ink-2)}
.adt-card h3 s{margin-left:4px;text-decoration:none;color:var(--ps-dim)}
.adt-ed{position:relative}
.adt-ed summary{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px 0 10px;border-radius:9999px;cursor:pointer;list-style:none;color:var(--ps-ink);font:500 13px/1 var(--ps-font)}
.adt-ed summary::-webkit-details-marker{display:none}
.adt-ed summary:hover{background:var(--ps-fill)}
.adt-ed summary svg{width:18px;height:18px;fill:currentColor}
.adt-ed[open] .rsp-more{position:absolute;right:0;top:38px;z-index:5;min-width:320px;background:var(--ps-card);box-shadow:inset 0 0 0 1px var(--ps-line)}
.adt-aus{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}
.adt-au{display:grid;grid-template-columns:1fr auto;align-items:center;gap:8px 10px;padding:14px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--ps-line)}
.adt-au[data-me]{box-shadow:inset 0 0 0 2px var(--ps-link)}
.adt-au-t{display:flex;flex-direction:column;gap:2px;min-width:0}
.adt-au-t s{text-decoration:none;font:400 12px/1.2 var(--ps-font);color:var(--ps-dim)}
.adt-au-t b{font:500 15px/1.2 var(--ps-font);color:var(--ps-ink)}
.adt-au .rsp-ar{grid-column:2;grid-row:1}
.adt-au-s{grid-column:1/-1;font:400 12.5px/1.2 var(--ps-font);color:var(--ps-ink-2)}
.adt-au[data-me] .adt-au-s{color:var(--ps-ink)}
.adt-au .rv-seg{grid-column:1/-1}
.rv-seg-e{display:block;height:4px;border-radius:9999px;background:var(--ps-fill)}
.adt-log{max-height:420px;overflow:auto;margin:0;padding:0}
.adt-lk{padding:0}
.adt-lk>summary{margin:0;padding:18px 20px;cursor:pointer;list-style:none}
.adt-lk>summary::-webkit-details-marker{display:none}
.adt-lk>summary svg{width:20px;height:20px;fill:var(--ps-ink-2);transition:transform var(--ps-motion,.15s) var(--ps-ease,ease)}
.adt-lk[open]>summary svg{transform:rotate(180deg)}
.adt-lk .rv-lks{padding:0 20px 16px}
.adt-drv{display:inline-flex;align-items:center;gap:6px;margin:0 20px 18px;color:var(--ps-link);font:500 13px/1 var(--ps-font);text-decoration:none}
.adt-drv svg{width:18px;height:18px;fill:currentColor}
.adt button:focus-visible,.adt-card button:focus-visible,.adt-card summary:focus-visible{outline:2px solid var(--ps-ink);outline-offset:2px}
@media (max-width:760px){.adt{padding:18px}.adt-h h2{font-size:21px}.adt-acts{width:100%}.adt-go{flex:1;justify-content:center}}
/* AD SET SETTINGS (2026-10-29): the setup form again, in a dialog, for a campaign that exists */
.shl-dlg-c.rss{width:min(680px,100%);max-height:calc(100vh - 32px);overflow:auto;display:flex;flex-direction:column;gap:16px}
.rss .shl-lead{margin:-8px 0 0}
.rss-q{display:grid;grid-template-columns:minmax(0,1.4fr) auto minmax(0,1fr);gap:16px;align-items:end}
.rss textarea.p-in{height:auto;min-height:84px;padding:10px 12px;resize:vertical;font:400 14px/1.5 var(--ps-font)}
.rss-plan{display:flex;flex-direction:column;gap:12px}
.rss-ph{display:flex;align-items:baseline;gap:8px}
.rss-ph b{font:500 13px/1.2 var(--ps-font);color:var(--ps-ink-2)}
.rss-ph .rsp-n{font:400 12px/1.2 var(--ps-font);color:var(--ps-dim)}
.rss .rsp-more{padding:14px}
.rss-has{font:italic 400 11.5px/1.3 var(--ps-font);color:var(--ps-dim)}
.rss .shl-st{margin:0;min-height:0}
.rss .shl-st:empty{display:none}
.rss .shl-acts{margin-top:0}
.rss button:focus-visible{outline:2px solid var(--ps-ink);outline-offset:2px}
.adt-set{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px 0 10px;border:none;border-radius:9999px;background:none;cursor:pointer;color:var(--ps-ink);font:500 13px/1 var(--ps-font)}
.adt-set:hover{background:var(--ps-fill)}
.adt-set svg{width:18px;height:18px;fill:currentColor}
@media (max-width:640px){.rss-q{grid-template-columns:1fr}}
`;
    document.head.appendChild(s);
  }
})();
