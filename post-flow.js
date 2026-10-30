/* post-flow.js — OPS's posts on Google Drive, their hand-offs, and the Status board (2026-10-30).
 *
 * The social media manager drafts a post in OPS and sends it to a designer, who refines it and
 * sends it to the content team, who check the copy. Four steps, in order:
 *
 *   Draft (social media manager) › Design (designer) › Copy check (content team) › Ready
 *
 * EVERY POST LIVES ON GOOGLE DRIVE, in one folder per post under the posts folder:
 *   <Organic posts>/<post name>/
 *     <post name>_Post.json        the post: name, brief, deadline, steps, its log
 *     <post name>.smpstudio.json   the OPS project, with its review data (revision, photos, log)
 *     Assets/…                     its pictures, one file each
 *     Brief/…                      the files attached when it was started
 *     Exports/…                    every export, uploaded as it is made
 * It is the CAS ad set machinery (share-link.js's Drive kit, providentDsKit) with kind 'post' and
 * one project: the project follows its file exactly as an ad set's project does — every edit is
 * saved to Drive within seconds, and everyone on the post sees it. Everyone opens the post by the
 * project's own link; which step a person may press is their signed-in role (access.js):
 * smm · designer · ct, the admin everything, and with sign-in off, anyone.
 *
 * Plain DOM outside React, like the archive: the Home sheet ([data-post-plan]) and the Status
 * board ([data-post-status]). The top bar's flow is OPS markup reading postVals().
 */
(function () {
  'use strict';
  if (!/Organic Studio/.test(decodeURIComponent(location.pathname))) return;
  const K = window.providentDsKit;
  // StudioBase is a top-level class: a global binding, not a window property
  if (!K || typeof StudioBase === 'undefined') return;
  const SP = StudioBase.prototype;
  const { api, dsList, dsQuery, dsFolder, dsCreate, dsRead, dsWrite, dsPutRec, dsRand, dsSafe, dsJson, dsGate, dsOn, dsLog, dsPub, dsWho, DS_FOLDER, IS, esc, ago, clip, busyDlg, askNotify, copyText, injectCss, pool, lsGet, lsSet, ssSet, isDs } = K;

  // the studio's icons: Material Symbols Rounded at wght300, the same paths the archive uses
  const ADD_D = 'M450-450H250q-12.75 0-21.37-8.63-8.63-8.63-8.63-21.38 0-12.76 8.63-21.37Q237.25-510 250-510h200v-200q0-12.75 8.63-21.37 8.63-8.63 21.38-8.63 12.76 0 21.37 8.63Q510-722.75 510-710v200h200q12.75 0 21.37 8.63 8.63 8.63 8.63 21.38 0 12.76-8.63 21.37Q722.75-450 710-450H510v200q0 12.75-8.63 21.37-8.63 8.63-21.38 8.63-12.76 0-21.37-8.63Q450-237.25 450-250v-200Z';
  const ico = k => k === 'add' ? '<svg class="pf-i" viewBox="0 -960 960 960" aria-hidden="true"><path d="' + ADD_D + '"/></svg>' : (K.PICO[k] || '').replace('<svg ', '<svg class="pf-i" ');
  const POST_TAIL = '_Post.json', POST_DIR = 'Organic posts';
  // the team's shared Drive folder that holds 'Offplan 2025' and 'Offplan 2026'; 'Organic posts'
  // is made beside them the first time a post is started. localStorage['provident-posts-root']
  // (a folder link or id) points somewhere else on one computer.
  const POSTS_PARENT = '1FD5dl42YxKi6h8hlHvTwaMT__Nt545WO';
  const LIST = 'provident-posts', HIDE = 'provident-posts-hidden', CACHE = 'provident-posts-list', PLAN = 'provident-postplan', PICK = 'provident-postpick';
  const STEPS = [
    { t: 'Draft', who: 'Social media manager', wait: 'With the social media manager', roles: ['smm', 'designer'] },
    { t: 'Design', who: 'Designer', wait: 'With the designer', roles: ['designer'] },
    { t: 'Copy check', who: 'Content team', wait: 'With the content team', roles: ['ct'] },
    { t: 'Ready', who: 'Ready to publish', wait: 'Ready to publish', roles: ['designer', 'ct', 'smm'] }
  ];
  const FIELD = ['draft', 'design', 'copy'];
  const isPost = rs => !!(rs && rs.kind === 'post');
  const D = () => window.providentDrive;
  const role = () => { try { const n = window.providentAccess && window.providentAccess.now(); return n && n.role; } catch (e) { return null; } };
  const may = k => { const r = role(); return !r || r === 'admin' || STEPS[k].roles.indexOf(r) >= 0; };
  const fidOf = tok => { tok = String(tok || ''); return tok[0] === 'R' ? tok.slice(tok.indexOf('.') + 1) : ''; };
  const projLink = sid => StudioBase.shareBase() + '/' + encodeURIComponent(StudioBase.SESSIONS['provident-smp-studio'] ? StudioBase.SESSIONS['provident-smp-studio'].file : 'Provident Organic Studio.dc.html') + '#share=' + sid;
  const day = t => t ? new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
  const dueDay = d => d ? new Date(d + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
  const overdue = d => d && new Date(d + 'T23:59') < new Date();

  // where a post stands: 0 Draft · 1 Design · 2 Copy check · 3 Ready
  function stage(rs) {
    const it = (rs && rs.items || [])[0] || null;
    const k = !it || !it.draft ? 0 : !it.design ? 1 : !it.copy ? 2 : 3;
    return { k, it, none: !it };
  }
  // what the signed-in person can press at this step: the move on, and the move back
  function acts(rs) {
    const { k, it } = stage(rs);
    if (!it) return { go: null, back: null };
    const go = [{ act: 'draft-done', label: 'Send to designer', tip: 'The draft is ready: the designer refines it and makes the final design' },
      { act: 'design-done', label: 'Send to copy check', tip: 'Design done: the content team checks the copy' },
      { act: 'copy-done', label: 'Approve copy', tip: 'The copy is right: the post is ready to publish' }][k] || null;
    const back = [null, { act: 'draft-open', label: 'Back to draft', tip: 'Sends it back to the social media manager' },
      { act: 'design-open', label: 'Back to design', tip: 'Sends it back to the designer with what to change' },
      { act: 'copy-open', label: 'Reopen copy check', tip: 'Takes it out of Ready, back to the content team' }][k];
    const backOk = back && (may(k) || (k === 2 && role() === 'designer'));
    return { go: go && may(k) ? go : null, back: backOk ? back : null };
  }
  const segs = k => STEPS.map((s, i) => ({ s: i < k || k === 3 ? 'done' : i === k ? 'cur' : 'todo', t: s.t + ' · ' + s.who }));

  // ── this computer's list of posts (the board also finds every post in the posts folder) ──
  const Posts = {
    list() { try { const a = JSON.parse(lsGet(LIST) || '[]'); return Array.isArray(a) ? a.filter(x => x && /^R[\w-]+\.[\w-]{20,}$/.test(x.id || '')) : []; } catch (e) { return []; } },
    hidden() { try { const a = JSON.parse(lsGet(HIDE) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } },
    add(rs, force) {
      const id = rs && rs.tok && rs.tok.dd; if (!id) return;
      if (force) lsSet(HIDE, JSON.stringify(this.hidden().filter(x => x !== id))); else if (this.hidden().indexOf(id) >= 0) return;
      const a = this.list(), o = a.find(x => x.id === id);
      if (o) o.name = rs.name || o.name; else a.unshift({ id, name: rs.name || '', at: Date.now() });
      lsSet(LIST, JSON.stringify(a.slice(0, 300)));
    },
    drop(id) { lsSet(LIST, JSON.stringify(this.list().filter(x => x.id !== id))); lsSet(HIDE, JSON.stringify([id].concat(this.hidden()).slice(0, 400))); }
  };
  window.providentPosts = Posts;

  // ── Drive ───────────────────────────────────────────────────────────────────────────────
  async function postsRoot(make) {
    const D0 = D(), own = D0.id(lsGet('provident-posts-root'));
    if (own) return own;
    const had = lsGet('provident-posts-root-id');
    if (had) return had;
    const f = (await dsList(POSTS_PARENT, POST_DIR)).find(x => x.mimeType === DS_FOLDER);
    if (f) { lsSet('provident-posts-root-id', f.id); return f.id; }
    if (!make) return null;
    const id = await dsFolder(POSTS_PARENT, POST_DIR);
    lsSet('provident-posts-root-id', id);
    return id;
  }
  // every post in the posts folder, put on this computer's list (once a minute at most)
  let findAt = 0, findRun = null;
  function discover(force) {
    const D0 = D();
    if (!dsOn() || !D0 || !(D0.valid && D0.valid())) return Promise.resolve(false);
    if (findRun) return findRun;
    if (!force && Date.now() - findAt < 60000) return Promise.resolve(false);
    findRun = (async () => {
      try {
        const root = await postsRoot(false); if (!root) return false;
        const dirs = (await dsQuery("'" + root + "' in parents and trashed=false and mimeType='" + DS_FOLDER + "'")).map(f => f.id);
        const known = new Set(Posts.list().map(x => fidOf(x.id)).concat(Posts.hidden().map(fidOf)));
        const found = [];
        for (let i = 0; i < dirs.length; i += 30) {
          const par = dirs.slice(i, i + 30).map(id => "'" + id + "' in parents").join(' or ');
          found.push(...(await dsQuery('(' + par + ") and trashed=false and name contains '" + POST_TAIL + "'")));
        }
        await pool(found.filter(f => !known.has(f.id)), 6, async f => {
          try { const rs = await dsRead(f.id, false, true); if (isPost(rs) && !rs.deleted && rs.tok) Posts.add(rs); } catch (e) {}
        });
        findAt = Date.now();
        return true;
      } catch (e) { return false; } finally { findRun = null; }
    })();
    return findRun;
  }
  // a new post: its folder, its record, the brief's files
  async function makePost(plan, files, busy) {
    const by = dsWho(plan.by), now = Date.now();
    busy('Opening the posts folder on Google Drive…', .04);
    const root = await postsRoot(true);
    const kids = (await dsList(root)).filter(x => x.mimeType === DS_FOLDER).map(x => x.name);
    const base = dsSafe(plan.name || 'Post'); let nm = base, n = 2; while (kids.indexOf(nm) >= 0) nm = base + ' (' + (n++) + ')';
    const folder = await dsFolder(root, nm);
    const rs = { app: 'provident-post', kind: 'post', name: String(plan.name || 'Post').trim().slice(0, 120), created: now, by, folder,
      drive: 'https://drive.google.com/drive/folders/' + folder, tpl: plan.tpl || '', items: [], hist: [{ act: 'ticket', by, at: now }], log: [],
      ticket: { brief: String(plan.brief || '').slice(0, 60000), deadline: plan.deadline || '', by, at: now, files: [] } };
    busy('Saving the post…', .12);
    const f = await dsCreate(folder, dsSafe(rs.name) + POST_TAIL, dsJson(rs));
    rs.rid = f.id; rs.tok = { dd: 'R' + dsRand(10) + '.' + f.id };
    const list = Array.from(files || []);
    if (list.length) {
      const bf = await dsFolder(folder, 'Brief');
      for (let i = 0; i < list.length; i++) {
        busy('Saving files · ' + (i + 1) + ' of ' + list.length + '…', .15 + .7 * i / list.length);
        const x = await dsCreate(bf, list[i].name, list[i]);
        rs.ticket.files.push({ id: x.id, name: list[i].name, type: list[i].type || '', size: list[i].size || 0 });
      }
    }
    dsLog(rs, by, [{ kind: 'step', page: 'Post', text: 'Started the post' }]);
    await dsWrite(f.id, rs);
    Posts.add(rs, true);
    return rs;
  }
  // the open project becomes the post's design: its file and pictures in the post's folder, and
  // this tab follows it from then on
  async function addProject(eng, tok, dlg) {
    const fid = fidOf(tok), rs = await dsRead(fid, true);
    if (!isPost(rs) || rs.deleted) throw new Error('This post is not on Google Drive any more.');
    if ((rs.items || []).length) throw new Error('“' + (rs.name || 'This post') + '” already has its design. Open it from Status.');
    await eng.ensurePid();
    const by = dsWho(StudioBase.shareName()), now = Date.now(), app = eng.shApp(), st = eng.shPub(), name = rs.name || eng.shName(st);
    dlg.busy('Saving the design into “' + name + '”…', .08);
    const doc = { app, state: st, images: {}, review: { meta: { app, name, by, created: now }, rev: 1, imgs: {}, rid: fid,
      log: [{ by, at: now, burst: '', changes: [{ kind: 'note', text: 'Started the design' }], rev: 1 }] } };
    const f = await dsCreate(rs.folder, dsSafe(name) + '.smpstudio.json', dsJson(doc));
    const sid = 'D' + f.id, C = IS(), map = {}, imgs = {};
    const pics = eng.shSlots().filter(sl => { const r = C.getRec(sl); return r && r.u; });
    for (let k = 0; k < pics.length; k++) {
      dlg.busy('Saving pictures · ' + (k + 1) + ' of ' + pics.length + '…', .15 + .7 * k / pics.length);
      const e = await dsPutRec(sid, pics[k], C.getRec(pics[k])); map[pics[k]] = e; imgs[pics[k]] = e.h;
    }
    let rev = 1;
    if (pics.length) rev = (await api('save', { id: sid }, { base: 1, by, imgs: map })).rev;
    dlg.busy('Finishing…', .92);
    // a designer starting a post has no draft to hand over: it opens at Design
    const r0 = role(), item = { sid, added: now, by, draft: r0 === 'designer' ? { by, at: now } : null, design: null, copy: null };
    rs.items = [item];
    rs.hist = (rs.hist || []).concat({ act: 'add', by, at: now, sid }).slice(-400);
    dsLog(rs, by, [{ kind: 'step', page: 'Post', text: 'Started the design' }]);
    try { const th = await eng.postThumb(); if (th) { rs.thumb = th; } } catch (e) {}
    await dsWrite(fid, rs);
    try { const d = await dsRead(f.id, true); d.review.sum = eng.postSum(st); if (rs.thumb) { d.review.thumb = rs.thumb; d.review.thumbAt = Date.now(); } await dsWrite(f.id, d); } catch (e) {}
    ssSet(eng.shKey(), { id: sid, rev, n: 0, pid: eng.state.pid, imgs, name, role: 'dd', rs: dsPub(rs, 'dd') });
    ssSet(eng.shKey('-base'), st);
    ssSet(eng.shKey('-log'), null);
    eng.shareStart(false);
    Posts.add(rs, true);
    return rs;
  }

  // ── the studio's side ───────────────────────────────────────────────────────────────────
  SP.postSum = function (st) {
    st = st || this.state;
    return { name: this.shName(st), tpl: st.tpl || '', slides: (st.slides || []).length, updated: Date.now(), pid: st.pid || '' };
  };
  SP.postThumb = async function (st, own) {
    try {
      st = st || this.state;
      const C = this.constructor, sz = C.mainSize ? C.mainSize(st) : 'ft';
      const a = await this.loadAssets(st, own);
      const cv = this.renderOpsToCanvas(this.buildOps(st, 0, sz, a), .16);
      const u = cv.toDataURL('image/webp', .8);
      return /^data:image\/webp/.test(u) && u.length < 110000 ? u : undefined;
    } catch (e) { return undefined; }
  };
  SP.postRs = function () { const S = this._sh; return S && isPost(S.rs) ? S.rs : null; };
  SP.postAfterStep = function () { this.forceUpdate(); Status.poke(); };
  // the top bar's flow: where the post stands, and the one thing the signed-in person does next
  SP.postVals = function () {
    const rs = this.postRs(), scr = this.state.screen, work = scr === 'editor' || scr === 'guide';
    if (!work || !dsOn()) return { pfOn: undefined };
    if (!rs) {
      const S = this._sh;
      if (S) return { pfOn: undefined };   // following a plain edit link
      const smm = role() === 'smm';
      return { pfOn: '1', pfState: 'none', pfSegs: segs(-1).map(g => ({ s: 'todo', t: g.t })), pfStep: 'Not on Drive', pfWhere: 'Save it to Google Drive to hand it off',
        pfTip: 'This post is only on this computer. Saving it to Drive puts it on Status, where the designer and the content team pick it up.', pfGo: () => this.postToDrive(false),
        pfFlowOn: '1', pfFlowLabel: smm ? 'Send to designer' : 'Save to Drive', pfFlowTip: smm ? 'Saves the post to Google Drive and sends the draft to a designer' : 'Saves the post to Google Drive, where everyone on it can open it',
        pfFlow: () => this.postToDrive(smm) };
    }
    const st = stage(rs), a = acts(rs), busy = this._rvBusy;
    return {
      pfOn: '1', pfState: st.k === 2 ? 'ct' : st.k === 3 ? 'done' : 'k' + st.k, pfSegs: segs(st.k), pfStep: STEPS[st.k].t,
      pfWhere: st.k === 3 ? (rs.name || '') : STEPS[st.k].wait + (rs.ticket && rs.ticket.deadline ? ' · due ' + dueDay(rs.ticket.deadline) : ''),
      pfTip: (rs.name || 'Post') + ' — ' + STEPS[st.k].wait + '. Opens the post’s panel: its steps, who did what, and its Drive folder.',
      pfGo: () => this.shPanel(true),
      pfFlowOn: a.go ? '1' : undefined, pfFlowLabel: busy ? 'Saving…' : a.go ? a.go.label : '', pfFlowTip: a.go ? a.go.tip : '',
      pfFlow: () => { if (a.go && !this._rvBusy) this.rvStep(a.go.act); }
    };
  };
  // the Changes panel's post section: the step, its buttons, the links
  SP.postPanel = function () {
    const rs = this.postRs(); if (!rs) return '';
    const st = stage(rs), a = acts(rs), it = st.it, busy = this._rvBusy;
    const who = FIELD.map((f, i) => it && it[f] ? '<li><b>' + esc(STEPS[i].t) + '</b><span>' + esc(it[f].by) + ' · ' + esc(ago(it[f].at)) + '</span></li>' : '').join('');
    const btn = (x, cls) => x ? '<button type="button" class="' + cls + '" data-act="' + x.act + '" title="' + esc(x.tip) + '"' + (busy ? ' disabled' : '') + '>' + (busy === x.act ? 'Saving…' : esc(x.label)) + '</button>' : '';
    return '<div class="pf-now"><span class="pf-k">Step ' + Math.min(st.k + 1, 4) + ' of 4</span><b>' + esc(STEPS[st.k].t) + '</b>' +
      '<span class="pf-segs">' + segs(st.k).map(g => '<i data-s="' + g.s + '" title="' + esc(g.t) + '"></i>').join('') + '</span>' +
      '<p class="pf-w">' + esc(STEPS[st.k].wait) + (rs.ticket && rs.ticket.deadline ? ' · due ' + esc(dueDay(rs.ticket.deadline)) : '') + '</p></div>' +
      (a.go || a.back ? '<div class="rv-acts">' + btn(a.go, 'p-btn') + btn(a.back, 'p-ghost') + '</div>' : '') +
      (who ? '<ul class="pf-who">' + who + '</ul>' : '') +
      (rs.ticket && rs.ticket.brief ? '<details class="pf-brief"><summary>Brief</summary><p>' + esc(rs.ticket.brief) + '</p></details>' : '') +
      '<p class="pf-links"><button type="button" class="pf-a" data-post-go="' + esc((rs.tok || {}).dd || '') + '">Open on Status</button>' +
      (rs.drive ? '<a class="pf-a" href="' + esc(rs.drive) + '" target="_blank" rel="noopener">Drive folder</a>' : '') + '</p>' +
      (window.Notification && Notification.permission === 'default' ? '<button type="button" class="rv-ntf" data-ntf="1" title="A Chrome notification when the post moves on">Notify me when it moves on</button>' : '');
  };
  // a post that is only on this computer goes to Drive (and on, for the social media manager)
  SP.postToDrive = async function (send) {
    if (this._pfBusy) return;
    if (!(await dsGate('Save the post to Google Drive'))) return;
    const dlg = busyDlg(send ? 'Send to designer' : 'Save to Google Drive', 'The post gets its own folder in “' + POST_DIR + '” on Google Drive. Everyone on it opens the same file, and every change is saved there.');
    this._pfBusy = true;
    try {
      const plan = { name: this.shName(), tpl: this.state.tpl, by: StudioBase.shareName() || 'Someone' };
      const rs = await makePost(plan, [], dlg.busy);
      await addProject(this, rs.tok.dd, dlg);
      if (send) { await new Promise(r => setTimeout(r, 300)); await this.rvStep('draft-done'); }
      dlg.close();
      askNotify();
    } catch (e) { dlg.fail(e.message || String(e)); }
    finally { this._pfBusy = false; this.forceUpdate(); }
  };
  // after a template was picked for a post started on Home: the new project joins it
  SP.postPickCheck = async function () {
    let g = null; try { g = JSON.parse(lsGet(PICK) || 'null'); } catch (e) {}
    if (!g || !g.tok || Date.now() - (g.at || 0) > 300000) return;
    const scr = this.state.screen;
    if (scr === 'splash' || scr === 'pick') { setTimeout(() => this.postPickCheck(), 400); return; }
    try { localStorage.removeItem(PICK); } catch (e) {}
    if (this._sh) return;
    if (!(await dsGate('Start the post'))) return;
    const dlg = busyDlg('Starting the post', 'Saving the design into the post’s folder on Google Drive.');
    try { await addProject(this, g.tok, dlg); dlg.close(); this.forceUpdate(); }
    catch (e) { dlg.fail(e.message || String(e)); }
  };
  // every export also goes up to the post's Exports folder on Drive
  async function exportsUp(eng, files) {
    const rs = eng.postRs(); if (!rs || !rs.folder || !files || !files.length) return;
    const pics = files.filter(f => /\.(jpe?g|png|svg|pdf|webp)$/i.test(String(f.name || '')));
    if (!pics.length) return;
    try {
      const dir = await dsFolder(rs.folder, 'Exports');
      const have = await dsList(dir);
      await pool(pics, 3, async f => {
        const name = String(f.name).split('/').pop(), ext = name.split('.').pop().toLowerCase(), type = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml', pdf: 'application/pdf', webp: 'image/webp' }[ext] || '',
          blob = f.data instanceof Blob ? f.data : new Blob([f.data || ''], { type });
        const old = have.find(x => x.name === name);
        if (old) await K.dsFetch('/upload/drive/v3/files/' + old.id + '?uploadType=media&supportsAllDrives=true', { method: 'PATCH', headers: { 'Content-Type': blob.type || 'application/octet-stream' }, body: blob });
        else await dsCreate(dir, name, blob);
      });
      const s0 = eng.state.exportStatus || '';
      eng.setState({ exportStatus: s0 + (s0 ? ' · ' : '') + 'also on Google Drive in ' + (rs.name || 'the post') + '/Exports' });
    } catch (e) { const s0 = eng.state.exportStatus || ''; eng.setState({ exportStatus: s0 + ' · not uploaded to Drive: ' + (e.message || e) }); }
  }
  // once per engine: the template pick and the export learn about posts
  SP.postInit = function () {
    const proto = Object.getPrototypeOf(this);
    if (!proto._pfWrapped) {
      proto._pfWrapped = true;
      const pick = proto.pickTpl, deliver = proto.deliver;
      proto.pickTpl = async function (t) {
        if (!dsOn() || role() === 'pm') return pick.call(this, t);
        // a post started earlier is waiting for its template (Start the design): no second post
        let g = null; try { g = JSON.parse(lsGet(PICK) || 'null'); } catch (e) {}
        if (g && g.tok && Date.now() - (g.at || 0) < 300000) return pick.call(this, t);
        if (!this.confirmDiscard()) return;
        if (!(await dsGate('Start the post on Google Drive'))) return;
        const d = Plan.draft(), name = String(d.name || '').trim() || 'Untitled post · ' + day(Date.now());
        const dlg = busyDlg('Starting “' + name + '”', 'The post gets its own folder on Google Drive. Pick up where you left off from Status, on any computer.');
        try {
          const rs = await makePost({ name, brief: d.brief, deadline: d.deadline, tpl: t, by: StudioBase.shareName() || 'Someone' }, Plan.files, dlg.busy);
          lsSet(PICK, JSON.stringify({ tok: rs.tok.dd, at: Date.now() }));
          Plan.clear();
          dlg.close();
        } catch (e) { dlg.fail(e.message || String(e)); return; }
        this.markSaved && this.markSaved();
        return pick.call(this, t);
      };
      proto.deliver = async function (files, name, opt) {
        const r = await deliver.call(this, files, name, opt);
        if (r !== false && !this._ep) await exportsUp(this, files);
        return r;
      };
    }
    this.postPickCheck();
  };

  // ── Home, door two: Start a post ─────────────────────────────────────────────────────────
  // Three steps in order: name it (and when it is due), the brief, then a template — the
  // template gallery under this sheet is the third step, and picking one makes the post.
  const Plan = {
    files: [],
    draft() { let d = null; try { d = JSON.parse(lsGet(PLAN) || 'null'); } catch (e) {} return Object.assign({ name: '', deadline: '', brief: '' }, d || {}); },
    set(k, v) { const d = this.draft(); d[k] = v; lsSet(PLAN, JSON.stringify(d)); },
    clear() { lsSet(PLAN, ''); this.files = []; document.querySelectorAll('div[data-post-plan]').forEach(el => { if (el._pp) el._pp.draw(); }); },
    mount(eng) { document.querySelectorAll('div[data-post-plan]').forEach(el => { if (!el._pp) el._pp = new PlanView(el, eng); }); }
  };
  function PlanView(el, eng) {
    this.el = el; this.eng = eng;
    el.addEventListener('input', e => { const f = e.target.dataset.f; if (f) Plan.set(f, e.target.value); });
    el.addEventListener('change', e => {
      if (e.target.type === 'file') { Plan.files = Plan.files.concat(Array.from(e.target.files || [])).slice(0, 20); e.target.value = ''; this.draw(); }
    });
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-pp]'); if (!b) return;
      if (b.dataset.pp === 'attach') el.querySelector('input[type=file]').click();
      if (b.dataset.pp === 'rm') { Plan.files.splice(+b.dataset.i, 1); this.draw(); }
    });
    this.draw();
    setTimeout(() => { const n = el.querySelector('.pp3-name'); if (n && !n.value && document.activeElement === document.body) n.focus({ preventScroll: true }); }, 0);
  }
  // START A POST IS CAS'S BRIEF SHEET (2026-10-30, /impeccable): no numbered steps. The post's NAME
  // is the page's headline, the due date sits on one quiet line under it, the BRIEF is the one big
  // surface with the files attached to its foot, and the templates below are the last move.
  const kb = n => n < 1024 ? n + ' B' : n < 1048576 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
  PlanView.prototype.draw = function () {
    const d = Plan.draft(), on = dsOn();
    this.el.innerHTML =
      '<section class="pp3" aria-label="New post">' +
        '<label class="pp3-namew"><span class="pf-sr">Post name</span>' +
          '<input class="pp3-name" data-f="name" maxlength="120" placeholder="Name the post" autocomplete="off" spellcheck="false" value="' + esc(d.name) + '"></label>' +
        '<div class="pp3-q">' +
          '<label class="pp3-chip pp3-due" title="When the post should go out">' + ico('event') + '<span class="pp3-cht">Due</span><input type="date" data-f="deadline" value="' + esc(d.deadline) + '"></label>' +
          (on ? '<span class="pp3-chip pp3-where" title="Each post gets its own folder in Organic posts: the record, the design, the brief files and the exports">' + ico('folder') + '<span>Saved to Google Drive · Organic posts</span></span>' : '') +
        '</div>' +
        '<div class="pp3-raw">' +
          '<label class="pp3-bl" for="pp3-brief">Brief <small>Optional</small></label>' +
          '<div class="pp3-sheet">' +
            '<textarea id="pp3-brief" data-f="brief" rows="6" placeholder="What the post is for, the key message, anything the designer should know">' + esc(d.brief) + '</textarea>' +
            '<div class="pp3-files"><button type="button" class="pp3-add" data-pp="attach" title="Renders, logos, brochures. Saved into the post’s Brief/ folder for the designer.">' + ico('attach') + '<span>Attach files</span></button><input type="file" multiple hidden>' +
              Plan.files.map((f, i) => '<span class="pp3-fc" title="' + esc(f.name + ' · ' + kb(f.size || 0)) + '"><b>' + esc(f.name) + '</b><button type="button" data-pp="rm" data-i="' + i + '" aria-label="Remove ' + esc(f.name) + '">' + ico('x') + '</button></span>').join('') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="pp3-th"><b>Pick a template</b><span>' + (on ? 'Picking one opens the post and saves it to Google Drive. From there it goes Draft, Design, Copy check, Ready.' : 'Picking one opens the post.') + '</span></div>' +
      '</section>';
  };

  // ── the posts, read once for Home and Status alike ──────────────────────────────────────
  const Feed = {
    items: null, at: 0, busy: false, sign: false, err: '', subs: new Set(),
    on(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
    emit() { this.subs.forEach(fn => { try { fn(); } catch (e) {} }); },
    cached() { if (this.items) return this.items; try { const c = JSON.parse(lsGet(CACHE) || 'null'); if (c && Array.isArray(c.items)) { this.items = c.items; this.at = c.at || 0; } } catch (e) {} return this.items; },
    async load(quiet) {
      if (this.run) return this.run;
      this.run = (async () => {
        const D0 = D();
        if (!dsOn()) { this.err = 'Google Drive is not set up on this site.'; this.emit(); return; }
        if (!(D0 && D0.valid && D0.valid())) { let ok = false; try { ok = !!(await D0.ensure()); } catch (e) {} if (!ok) { this.sign = true; this.emit(); return; } }
        this.sign = false; this.busy = true; this.emit();
        try {
          if (quiet) K.dsFlush();
          await discover(!quiet);
          const ids = Posts.list().map(x => x.id), out = [];
          for (let i = 0; i < ids.length; i += 40) out.push(...((await api('rsinfo', { ids: ids.slice(i, i + 40).join(',') })).items || []));
          this.items = out.filter(x => !x.gone && isPost(x.rs));
          this.err = '';
          try { lsSet(CACHE, JSON.stringify({ at: Date.now(), items: this.items.map(x => Object.assign({}, x, { log: undefined, plog: undefined, proj: undefined })) })); } catch (e) {}
        } catch (e) { if (e.gdAuth) this.sign = true; else this.err = e.message || String(e); }
        this.busy = false; this.at = Date.now(); this.emit();
        Status.views.forEach(v => { try { if (v.eng.host) v.eng.host.forceUpdate(); } catch (e) {} });
        document.querySelectorAll('div[data-post-home]').forEach(el => { try { if (el._ph && el._ph.eng.host) el._ph.eng.host.forceUpdate(); } catch (e) {} });
      })();
      try { return await this.run; } finally { this.run = null; }
    }
  };
  function openProject(eng, sid) {
    if (eng._sh && eng._sh.id === sid) { eng.upd(x => { x.screen = 'editor'; return x; }); return; }
    if (eng.confirmDiscard && !eng.confirmDiscard()) return;
    eng.markSaved && eng.markSaved();
    eng.shareOpenLink(sid);
  }
  function startDesign(eng, tok) {
    if (eng.confirmDiscard && !eng.confirmDiscard()) return;
    lsSet(PICK, JSON.stringify({ tok, at: Date.now() }));
    eng.upd(x => { x.screen = 'pick'; return x; });
  }
  // newest urgency first: overdue, then due soonest, then the latest change
  const urgency = x => { const t = (x.rs.ticket || {}).deadline; return t ? new Date(t + 'T12:00').getTime() : 9e15; };
  const byUrgency = (a, b) => urgency(a) - urgency(b) || Math.max(b.mod || 0, b.rs.created || 0) - Math.max(a.mod || 0, a.rs.created || 0);

  // ── Home, door one: My turn ─────────────────────────────────────────────────────────────
  // The posts waiting on the signed-in person as full rows — their render, where they stand,
  // who handed them over, when they are due — each with its one step as a button, so the work
  // moves on without opening it. Then the posts other people have, and the ones ready to go.
  let autoDoor = false;
  const Home = { mount(eng) { document.querySelectorAll('div[data-post-home]').forEach(el => { if (!el._ph) el._ph = new HomeView(el, eng); else el._ph.draw(); }); } };
  function HomeView(el, eng) {
    this.el = el; this.eng = eng;
    el.addEventListener('click', e => this.click(e));
    el.addEventListener('keydown', e => {
      const t = e.target.closest('[role=tab]'); if (!t || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
      const tabs = [...el.querySelectorAll('[role=tab]')], i = tabs.indexOf(t), n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      if (n) { n.click(); setTimeout(() => { const f = el.querySelector('[role=tab][aria-selected=true]'); if (f) f.focus(); }, 30); }
    });
    this.off = Feed.on(() => { if (!document.body.contains(el)) { this.off(); return; } this.draw(); this.door(); });
    Feed.cached();
    this.draw();
    if (!Feed.at || Date.now() - Feed.at > 30000) Feed.load(true);
    this.door();
    this.t = setInterval(() => { if (!document.body.contains(el)) { clearInterval(this.t); this.off(); return; } if (document.visibilityState === 'visible') Feed.load(true); }, 45000);
  }
  const view = eng => ((eng.host && eng.host.state.splashView) || 'all');
  const canStartNow = () => { const r = role(); return r !== 'ct' && r !== 'pm'; };
  // An empty queue is not a room to land in: someone who can start a post, with nothing
  // waiting on them, opens on Start a post — once per visit, and never after they chose.
  HomeView.prototype.door = function () {
    if (autoDoor || !Feed.items || Feed.busy && !Feed.at) return;
    const r = role(); if (!r || r === 'admin') { autoDoor = true; return; }
    autoDoor = true;
    if (view(this.eng) === 'all' && canStartNow() && !Feed.items.some(x => this.mineOf(x))) { try { this.eng.host.setState({ splashView: 'new' }); } catch (e) {} }
  };
  // a post on me: my step's button is live — or I started it and no design exists yet
  HomeView.prototype.mineOf = function (x) {
    const st = stage(x.rs), me = StudioBase.shareName();
    if (st.none) return canStartNow() && (!role() || x.rs.by === me);
    return waitingOnMe(x.rs);
  };
  function fromLine(rs) {
    const st = stage(rs), it = st.it, me = StudioBase.shareName(), who = n => (n && n === me ? 'you' : n || 'someone');
    if (st.none) return 'No design yet · started by ' + who(rs.by) + ' ' + ago(rs.created || 0);
    const prev = st.k > 0 && it && it[FIELD[st.k - 1]];
    if (prev && prev.by === me && st.k === 1) return 'Started by you · ' + ago(prev.at);
    if (prev) return (st.k === 3 ? 'Approved by ' : 'From ') + who(prev.by) + ' · ' + ago(prev.at);
    return 'Started by ' + who(it.by || rs.by) + ' · ' + ago(it.added || rs.created || 0);
  }
  function dueHtml(rs, k) {
    const t = (rs.ticket || {}).deadline; if (!t) return '';
    const late = overdue(t) && k < 3, d = new Date(t + 'T00:00'), today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Math.round((d - today) / 864e5);
    const w = late ? (days === -1 ? 'Due yesterday' : 'Overdue · ' + dueDay(t)) : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : days < 7 && days > 0 ? 'Due ' + d.toLocaleDateString(undefined, { weekday: 'long' }) : 'Due ' + dueDay(t);
    return '<span class="ph-due"' + (late ? ' data-late' : days <= 1 && k < 3 ? ' data-soon' : '') + '>' + esc(w) + '</span>';
  }
  HomeView.prototype.row = function (x, mine) {
    const rs = x.rs, st = stage(rs), a = acts(rs), it = st.it, sid = it && it.sid, busy = this.busyId === x.id;
    const segsH = '<span class="ph-segs" data-k="' + (st.none ? 'draft' : STEP_DOT[st.k]) + '" aria-hidden="true">' + segs(st.none ? -1 : st.k).map(g => '<i data-s="' + (st.none ? 'todo' : g.s) + '"></i>').join('') + '</span>';
    const step = st.none ? 'Draft' : STEPS[st.k].t;
    let act = '';
    if (mine && st.none) act = '<button type="button" class="p-btn ph-go" data-ph="design" data-id="' + esc(x.id) + '">Start the design</button>';
    else if (mine && a.go) act = '<button type="button" class="p-btn ph-go" data-ph="step" data-act="' + a.go.act + '" data-sid="' + esc(sid) + '" data-id="' + esc(x.id) + '" title="' + esc(a.go.tip) + '"' + (busy ? ' disabled' : '') + '>' + (busy ? 'Sending…' : esc(a.go.label)) + '</button>';
    const open = sid && role() !== 'pm' ? '<button type="button" class="p-ghost ph-open" data-ph="open" data-sid="' + esc(sid) + '">Open</button>' : '';
    return '<li class="ph-r"' + (mine ? ' data-me' : '') + (busy ? ' data-busy' : '') + ' data-id="' + esc(x.id) + '">' +
      '<button type="button" class="ph-th" data-ph="' + (sid && role() !== 'pm' ? 'open' : 'card') + '" data-sid="' + esc(sid || '') + '" data-id="' + esc(x.id) + '" aria-label="Open ' + esc(rs.name || 'post') + '">' + (x.thumb ? '<img src="' + esc(x.thumb) + '" alt="">' : '<i aria-hidden="true"></i>') + '</button>' +
      '<div class="ph-t"><b>' + esc(rs.name || 'Post') + '</b>' +
        '<span class="ph-st">' + segsH + '<span class="ph-sn">' + esc(step) + '</span><span class="ph-fr">' + esc(mine || st.none || st.k === 3 ? fromLine(rs) : STEPS[st.k].wait + ' · ' + fromLine(rs).replace(/^From /, 'from ').replace(/^Started by /, 'started by ')) + '</span></span></div>' +
      dueHtml(rs, st.k) +
      '<div class="ph-a">' + act + open + '</div></li>';
  };
  HomeView.prototype.draw = function () {
    const v = view(this.eng), r = role(), start = canStartNow();
    const items = (Feed.items || []).slice().sort(byUrgency);
    const mine = items.filter(x => this.mineOf(x)), rest = items.filter(x => !this.mineOf(x)), ready = rest.filter(x => stage(x.rs).k === 3 && !stage(x.rs).none), going = rest.filter(x => ready.indexOf(x) < 0);
    const meta = v === 'all' && dsOn() && Feed.items ? '<p class="ph-meta"><span>' + (Feed.busy ? 'Reading Google Drive…' : Feed.at ? 'Updated ' + esc(ago(Feed.at)) : '') + '</span><button type="button" class="pf-a" data-ph="refresh">Refresh</button><button type="button" class="pf-a" data-ph="status">Open Status</button></p>' : '';
    // with one door there is no switch: the Drive line joins the first section's heading row
    let h = !start ? '' : '<div class="ph-bar">' + (start ? '<div class="ph-sw" role="tablist" aria-label="Home">' +
      '<button type="button" role="tab" data-ph="door" data-v="all" aria-selected="' + (v === 'all') + '"' + (v === 'all' ? ' data-on' : '') + '>My turn</button>' +
      '<button type="button" role="tab" data-ph="door" data-v="new" aria-selected="' + (v === 'new') + '"' + (v === 'new' ? ' data-on' : '') + '>' + ico('add') + 'Start a post</button></div>' : '') + meta + '</div>';
    if (v !== 'all') { this.set(h); return; }
    h += '<div class="ph-room">';
    if (!dsOn()) h += '<div class="ph-empty"><b>Posts are kept on Google Drive</b><span>Google sign-in is not set up on this copy of the studio, so there is no queue here. Start a post from a template, or open one from Recent.</span></div>';
    else if (Feed.sign) h += '<div class="ph-empty"><b>Sign in to see your posts</b><span>They are saved in Google Drive. Sign in once with your Provident Google account — this computer remembers it.</span><button type="button" class="p-btn" data-ph="sign">Sign in with Google</button></div>';
    else if (Feed.err && !Feed.items) h += '<div class="ph-empty"><b>Couldn’t read the posts</b><span>' + esc(Feed.err) + '</span><button type="button" class="p-ghost" data-ph="refresh">Try again</button></div>';
    else if (!Feed.items) h += '<ul class="ph-list ph-load" aria-label="Loading">' + '<li></li>'.repeat(3) + '</ul>';
    else {
      const meName = r && r !== 'admin';
      if (meName) {
        h += '<section class="ph-g" aria-labelledby="ph-g1"><h3 id="ph-g1">Waiting on you' + (mine.length ? '<s>' + mine.length + '</s>' : '') + '</h3>';
        h += mine.length ? '<ul class="ph-list">' + mine.map(x => this.row(x, true)).join('') + '</ul>'
          : '<div class="ph-clear">' + ico('tick') + '<div><b>You’re clear</b><span>' + (going.length ? going.length + (going.length === 1 ? ' post is' : ' posts are') + ' with others right now.' : 'No post is waiting on anyone.') + '</span></div>' +
            (start ? '<button type="button" class="p-btn" data-ph="door" data-v="new">Start a post</button>' : '') + '</div>';
        h += '</section>';
      }
      const others = meName ? going : going.concat(mine.filter(x => going.indexOf(x) < 0 && ready.indexOf(x) < 0));
      if (others.length) h += '<section class="ph-g ph-q" aria-labelledby="ph-g2"><h3 id="ph-g2">' + (meName ? 'With others' : 'In progress') + '<s>' + others.length + '</s></h3><ul class="ph-list">' + others.slice(0, 8).map(x => this.row(x, !meName && !!acts(x.rs).go)).join('') + '</ul>' +
        (others.length > 8 ? '<button type="button" class="pf-a ph-more" data-ph="status">All ' + others.length + ' on Status</button>' : '') + '</section>';
      if (ready.length) h += '<section class="ph-g ph-q" aria-labelledby="ph-g3"><h3 id="ph-g3">Ready to publish<s>' + ready.length + '</s></h3><ul class="ph-list">' + ready.slice(0, 4).map(x => this.row(x, false)).join('') + '</ul>' +
        (ready.length > 4 ? '<button type="button" class="pf-a ph-more" data-ph="status">All ' + ready.length + ' on Status</button>' : '') + '</section>';
      if (!items.length && !meName) h += '<div class="ph-empty"><b>No posts yet</b><span>Start one: name it, add a brief, pick a template. It is saved to Google Drive and shows here.</span>' + (start ? '<button type="button" class="p-btn" data-ph="door" data-v="new">Start a post</button>' : '') + '</div>';
    }
    h += '</div>';
    if (!start && meta) h = h.replace('</h3>', meta + '</h3>');
    this.set(h);
  };
  // redraw without losing the focused control
  HomeView.prototype.set = function (h) {
    if (this._h === h) return; this._h = h;
    const f = document.activeElement && this.el.contains(document.activeElement) ? document.activeElement : null;
    const key = f && (f.dataset.ph + '|' + (f.dataset.v || f.dataset.sid || f.dataset.id || ''));
    this.el.innerHTML = h;
    if (key) { const n = [...this.el.querySelectorAll('[data-ph]')].find(b => (b.dataset.ph + '|' + (b.dataset.v || b.dataset.sid || b.dataset.id || '')) === key); if (n) n.focus({ preventScroll: true }); }
  };
  HomeView.prototype.click = async function (e) {
    const b = e.target.closest('[data-ph]'); if (!b) return;
    const a = b.dataset.ph, eng = this.eng;
    if (a === 'door') { autoDoor = true; eng.host.setState({ splashView: b.dataset.v }); }
    else if (a === 'open') openProject(eng, b.dataset.sid);
    else if (a === 'design') startDesign(eng, b.dataset.id);
    else if (a === 'card' || a === 'status') { Status.want = a === 'card' ? b.dataset.id : null; eng.host.setState({ splashView: 'rev' }, () => setTimeout(() => Status.mount(eng), 0)); }
    else if (a === 'refresh') Feed.load(false);
    else if (a === 'sign') { if (await dsGate('Read your posts on Google Drive')) Feed.load(false); }
    else if (a === 'step') {
      // THE ONE AUTHORED MOMENT: the row hands itself on — it folds away from Waiting on you and
      // comes back under With others, from the same Drive read
      const sid = b.dataset.sid, row = b.closest('.ph-r');
      this.busyId = b.dataset.id; this.draw(); askNotify();
      try {
        await api('rsstep', { id: sid }, { act: b.dataset.act, p: sid, by: StudioBase.shareName() || 'Someone' });
        const live = this.el.querySelector('.ph-r[data-id="' + CSS.escape(b.dataset.id) + '"]') || row;
        if (live) { live.setAttribute('data-sent', ''); await new Promise(r => setTimeout(r, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 320)); }
        this.busyId = null;
        await Feed.load(true);
      } catch (er) { this.busyId = null; this.draw(); window.alert(er.message || String(er)); }
    }
  };

  // ── Status: the board ───────────────────────────────────────────────────────────────────
  const Status = {
    views: new Set(),
    mount(eng) { document.querySelectorAll('div[data-post-status]').forEach(el => { if (!el._ps) { el._ps = new StatusView(el, eng); this.views.add(el._ps); } else if (this.want) { const w = this.want; this.want = null; el._ps.open(w); } }); },
    poke() { this.views.forEach(v => { if (document.body.contains(v.el)) v.load(true); else this.views.delete(v); }); },
    count() { const it = Feed.cached() || []; return it.filter(x => x.rs && waitingOnMe(x.rs)).length; }
  };
  window.providentPostStatus = Status;
  //   // A DRAFT IS ITS AUTHOR'S: another social media manager, or a designer, may send one on, but it
  // is waiting only on whoever started it
  const waitingOnMe = rs => {
    const r = role(); if (!r || r === 'admin') return false;
    const st = stage(rs); if (st.k === 0) { const me = StudioBase.shareName(), by = (st.it && st.it.by) || rs.by; if (r === 'designer' || by !== me) return false; }
    return !!acts(rs).go;
  };
  function StatusView(el, eng) {
    injectCss();
    this.el = el; this.eng = eng; this.items = null; this.err = ''; this.mine = lsGet('provident-posts-mine') === '1'; this.det = null;
    this.items = Feed.cached();
    el.addEventListener('click', e => this.click(e));
    this.off = Feed.on(() => { if (!document.body.contains(el)) { this.off(); return; } this.items = Feed.items || this.items; this.sign = Feed.sign; this.err = Feed.err; this.at = Feed.at; this.draw(); });
    this.draw();
    this.load();
    this.t = setInterval(() => { if (!document.body.contains(el)) { clearInterval(this.t); return; } if (document.visibilityState === 'visible') this.load(true); }, 45000);
  }
  StatusView.prototype.load = async function (quiet) {
    if (!quiet) { this.busy = true; this.draw(); }
    await Feed.load(quiet);
    this.items = Feed.items || this.items; this.sign = Feed.sign; this.err = Feed.err; this.busy = false; this.at = Feed.at;
    if (this.det) await this.open(this.det.id, true);
    this.draw();
  };
  StatusView.prototype.open = async function (id, quiet) {
    this.det = { id, busy: !quiet, e: (this.det && this.det.id === id && this.det.e) || (this.items || []).find(x => x.id === id) || null };
    if (!quiet) this.draw();
    try { const r = await api('rsinfo', { ids: id, full: '1' }); const e = (r.items || [])[0]; if (e && !e.gone && this.det && this.det.id === id) this.det.e = e; }
    catch (e) { if (this.det) this.det.err = e.message || String(e); }
    if (this.det) this.det.busy = false;
    this.draw();
  };
  StatusView.prototype.click = async function (ev) {
    const b = ev.target.closest('[data-ps]'); if (!b) return;
    const a = b.dataset.ps, id = b.dataset.id;
    if (a === 'card') { this.open(id); this.el.scrollIntoView({ block: 'start' }); }
    else if (a === 'back') { this.det = null; this.draw(); }
    else if (a === 'refresh') this.load(false);
    else if (a === 'sign') { if (await dsGate('Read the posts on Google Drive')) this.load(false); }
    else if (a === 'mine') { this.mine = !this.mine; lsSet('provident-posts-mine', this.mine ? '1' : '0'); this.draw(); }
    else if (a === 'new') { const h = this.eng.host; if (h) h.setState({ splashView: 'all' }, () => setTimeout(() => { const n = document.querySelector('.pp3-name'); if (n) n.focus(); }, 60)); }
    else if (a === 'openp') openProject(this.eng, b.dataset.sid);
    else if (a === 'start') startDesign(this.eng, id);
    else if (a === 'copy') { const ok = await copyText(b.dataset.link); b.textContent = ok ? 'Copied' : 'Select it'; setTimeout(() => { b.textContent = 'Copy link'; }, 1600); }
    else if (a === 'step') {
      const sid = b.dataset.sid; b.disabled = true; b.textContent = 'Saving…';
      try { await api('rsstep', { id: sid }, { act: b.dataset.act, p: sid, by: StudioBase.shareName() || 'Someone' }); askNotify(); await this.load(true); }
      catch (e) { window.alert(e.message || String(e)); this.draw(); }
    }
    else if (a === 'remove') { if (window.confirm('Take this post off Status on this computer? It stays on Google Drive.')) { Posts.drop(id); this.items = (this.items || []).filter(x => x.id !== id); this.det = null; this.draw(); } }
  };
  const STEP_DOT = ['draft', 'design', 'copy', 'ready'];
  function cardHtml(x) {
    const rs = x.rs, st = stage(rs), t = rs.ticket || {}, mod = Math.max(x.mod || 0, rs.created || 0), me = waitingOnMe(rs);
    return '<button type="button" class="ps-c" data-ps="card" data-id="' + esc(x.id) + '"' + (me ? ' data-me' : '') + '>' +
      '<span class="ps-th">' + (x.thumb ? '<img src="' + esc(x.thumb) + '" alt="">' : '<i aria-hidden="true"></i>') + '</span>' +
      '<span class="ps-ct"><b>' + esc(rs.name || 'Post') + '</b>' +
        '<small>' + (st.none ? 'No design yet' : esc(STEPS[st.k].wait)) + '</small>' +
        '<span class="ps-m">' + (t.deadline ? '<span class="ps-due"' + (overdue(t.deadline) && st.k < 3 ? ' data-late' : '') + '>Due ' + esc(dueDay(t.deadline)) + '</span>' : '') +
          '<span>' + esc(mod ? 'Changed ' + ago(mod) : '') + '</span></span>' +
        (me ? '<span class="ps-you">Your turn</span>' : '') + '</span></button>';
  }
  StatusView.prototype.draw = function () {
    if (this.det) { this.el.innerHTML = this.detHtml(); return; }
    const items = (this.items || []).slice().sort((a, b) => Math.max(b.mod || 0, b.rs.created || 0) - Math.max(a.mod || 0, a.rs.created || 0));
    const mine = items.filter(x => waitingOnMe(x.rs)), r = role(), show = this.mine ? mine : items;
    const cols = STEPS.map((s, k) => ({ s, k, list: show.filter(x => stage(x.rs).k === k) }));
    let h = '<div class="ps">';
    h += '<div class="ps-bar"><div class="ps-sum"><b>' + items.length + (items.length === 1 ? ' post' : ' posts') + '</b>' +
      (r && r !== 'admin' ? '<span>' + mine.length + ' waiting on you</span>' : '<span>' + items.filter(x => stage(x.rs).k === 3).length + ' ready to publish</span>') + '</div>' +
      (r && r !== 'admin' ? '<div class="p-tabs ps-f" role="tablist"><button type="button" data-ps="mine"' + (!this.mine ? ' data-on' : '') + ' role="tab" aria-selected="' + !this.mine + '">All posts</button><button type="button" data-ps="mine"' + (this.mine ? ' data-on' : '') + ' role="tab" aria-selected="' + this.mine + '">Waiting on me</button></div>' : '') +
      '<span class="ps-at">' + (this.busy ? 'Reading Google Drive…' : this.at ? 'Updated ' + esc(ago(this.at)) : '') + '</span>' +
      '<button type="button" class="p-ghost ps-re" data-ps="refresh" title="Read Google Drive again">Refresh</button></div>';
    if (this.sign) h += '<div class="ps-empty"><b>Sign in to see the posts</b><span>They are saved in Google Drive. Sign in once with your Provident Google account — this computer remembers it.</span><button type="button" class="p-btn" data-ps="sign">Sign in with Google</button></div>';
    else if (this.err) h += '<div class="ps-empty"><b>Couldn’t read the posts</b><span>' + esc(this.err) + '</span><button type="button" class="p-ghost" data-ps="refresh">Try again</button></div>';
    else if (!this.items && this.busy) h += '<div class="ps-load"><i></i><i></i><i></i><i></i></div>';
    else if (!items.length) h += '<div class="ps-empty"><b>No posts yet</b><span>Start one on Home: name it, add a brief and pick a template. It is saved to Google Drive and shows up here for the designer and the content team.</span></div>';
    else h += '<div class="ps-cols">' + cols.map(c => '<section class="ps-col" data-k="' + STEP_DOT[c.k] + '"><h3><i></i>' + esc(c.s.t) + '<s>' + c.list.length + '</s><small>' + esc(c.s.who) + '</small></h3>' +
      (c.list.length ? c.list.map(cardHtml).join('') : '<p class="ps-none">' + (this.mine ? 'Nothing here for you' : 'Nothing at this step') + '</p>') + '</section>').join('') + '</div>';
    this.el.innerHTML = h + '</div>';
  };
  StatusView.prototype.detHtml = function () {
    const d = this.det, x = d.e;
    if (!x) return '<div class="ps"><button type="button" class="pf-a ps-back" data-ps="back">‹ All posts</button><div class="ps-load"><i></i><i></i></div></div>';
    const rs = x.rs, st = stage(rs), it = st.it, t = rs.ticket || {}, a = acts(rs), sid = it && it.sid;
    const step = (s, i) => {
      const f = FIELD[i], done = i < 3 ? !!(it && it[f]) : st.k === 3, cur = i === st.k && !done;
      return '<li data-s="' + (done ? 'done' : cur ? 'cur' : 'todo') + '"><i></i><b>' + esc(s.t) + '</b><span>' + esc(done && i < 3 ? it[f].by + ' · ' + day(it[f].at) : done ? 'Ready to publish' : cur ? s.wait : s.who) + '</span></li>';
    };
    const btn = (y, cls) => y && sid ? '<button type="button" class="' + cls + '" data-ps="step" data-act="' + y.act + '" data-sid="' + esc(sid) + '" title="' + esc(y.tip) + '">' + esc(y.label) + '</button>' : '';
    // the post's log and its project's log both note the design's start: one line, not two
    const seen = new Set(), logs = (x.log || []).concat(x.plog || []).sort((p, q) => (q.at || 0) - (p.at || 0)).filter(e => {
      const k = (e.by || '') + '|' + ((e.changes || [])[0] || {}).text + '|' + Math.round((e.at || 0) / 10000);
      if (seen.has(k)) return false; seen.add(k); return true;
    }).slice(0, 60);
    const line = e => { const c = e.changes || []; return c.map(y => y.text || ((y.label || y.page || '') + (y.now ? ': ' + clip(y.now, 70) : ''))).filter(Boolean).slice(0, 3).join(' · ') + (c.length > 3 ? ' · +' + (c.length - 3) + ' more' : ''); };
    return '<div class="ps ps-det">' +
      '<button type="button" class="pf-a ps-back" data-ps="back">‹ All posts</button>' +
      '<header class="psd-h"><span class="psd-th">' + (x.thumb ? '<img src="' + esc(x.thumb) + '" alt="">' : '<i aria-hidden="true"></i>') + '</span>' +
        '<div class="psd-t"><span class="pf-k">Organic post' + (t.deadline ? ' · due ' + esc(dueDay(t.deadline)) : '') + '</span><h2>' + esc(rs.name || 'Post') + '</h2>' +
        '<p>Started by ' + esc(rs.by || 'someone') + ' · ' + esc(day(rs.created)) + (x.mod ? ' · changed ' + esc(ago(x.mod)) : '') + '</p>' +
        '<div class="psd-acts">' + (sid && role() !== 'pm' ? '<button type="button" class="p-btn" data-ps="openp" data-sid="' + esc(sid) + '">Open in the studio</button>'
          : (sid || role() === 'pm' || role() === 'ct' ? '' : '<button type="button" class="p-btn" data-ps="start" data-id="' + esc(x.id) + '">Start the design</button>')) +
          btn(a.go, 'p-ghost') + btn(a.back, 'p-ghost') +
          (sid ? '<button type="button" class="p-ghost" data-ps="copy" data-link="' + esc(projLink(sid)) + '">Copy link</button>' : '') +
          (rs.drive ? '<a class="p-ghost" href="' + esc(rs.drive) + '" target="_blank" rel="noopener">Drive folder</a>' : '') + '</div></div></header>' +
      '<div class="psd-cols"><div>' +
        '<section class="psd-card"><h3>Progress</h3><ol class="psd-steps">' + STEPS.map(step).join('') + '</ol></section>' +
        '<section class="psd-card"><h3>Activity</h3>' + (logs.length ? '<ul class="psd-log">' + logs.map(e => '<li><b>' + esc(e.by || '') + '</b><span>' + esc(line(e)) + '</span><s>' + esc(ago(e.at || 0)) + '</s></li>').join('') + '</ul>' : '<p class="ps-none">Nothing yet</p>') + '</section>' +
      '</div><aside>' +
        '<section class="psd-card"><h3>Brief</h3>' + (t.brief ? '<p class="psd-brief">' + esc(t.brief) + '</p>' : '<p class="ps-none">No brief</p>') +
          ((t.files || []).length ? '<ul class="psd-files">' + t.files.map(f => '<li><a href="https://drive.google.com/file/d/' + esc(f.id) + '/view" target="_blank" rel="noopener">' + esc(f.name) + '</a></li>').join('') + '</ul>' : '') + '</section>' +
        '<button type="button" class="pf-a psd-rm" data-ps="remove" data-id="' + esc(x.id) + '">Take off this computer’s Status</button>' +
      '</aside></div></div>';
  };

  // ── markup hosts mount from the shell's render ──────────────────────────────────────────
  SP.postMount = function () { setTimeout(() => { Home.mount(this); Plan.mount(this); Status.mount(this); }, 0); };
  SP.postStatusOpen = function (tok) { Status.want = tok; const h = this.host; if (h) h.setState({ splashView: 'rev' }, () => setTimeout(() => Status.mount(this), 0)); };
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-post-go]'); if (!b) return;
    const sh = document.querySelector('.p-shell'), fib = sh && Object.keys(sh).find(k => k.indexOf('__reactFiber') === 0);
    let n = fib && sh[fib]; while (n && !(n.stateNode && n.stateNode.logic)) n = n.return;
    const eng = n && n.stateNode.logic.active && n.stateNode.logic.active();
    if (!eng) return;
    if (eng.state.screen !== 'splash') eng.upd(x => { x.screen = 'splash'; return x; });
    eng.postStatusOpen(b.getAttribute('data-post-go'));
  });

  // ── styles ──────────────────────────────────────────────────────────────────────────────
  const css = `
.pf-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.pf-a{background:none;border:0;padding:0;font:500 13px/1.3 var(--ps-font);color:var(--ps-link);text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.pf-a:hover{color:var(--ps-ink)}
.pf-k{display:block;font:400 12.5px/1.3 var(--ps-font);color:var(--ps-ink-2)}
/* the panel */
.pf-now{display:grid;gap:6px;margin:0 0 14px}
.pf-now b{font:500 20px/1.2 var(--ps-font);color:var(--ps-ink)}
.pf-segs{display:flex;gap:4px}.pf-segs i{flex:1;height:4px;border-radius:9999px;background:var(--ps-line)}
.pf-segs i[data-s=done]{background:var(--ps-good)}.pf-segs i[data-s=cur]{background:var(--ps-link)}
.pf-w{margin:2px 0 0;font:400 13px/1.4 var(--ps-font);color:var(--ps-ink-2)}
.pf-who{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:6px}
.pf-who li{display:flex;justify-content:space-between;gap:12px;font:400 12.5px/1.35 var(--ps-font);color:var(--ps-ink-2)}.pf-who b{font-weight:500;color:var(--ps-ink)}
.pf-brief{margin:14px 0 0;font:400 13px/1.5 var(--ps-font)}.pf-brief summary{cursor:pointer;color:var(--ps-ink);font-weight:500}.pf-brief p{white-space:pre-wrap;color:var(--ps-ink-2);margin:6px 0 0}
.pf-links{display:flex;gap:16px;margin:14px 0 0}
/* the top bar: CAS's flow (its section 61), mirrored */
.p-flow{display:flex;align-items:center;gap:4px;height:36px;box-sizing:border-box;padding:0 3px 0 0;border-radius:var(--ps-pill);background:var(--ps-fill);flex:0 1 auto;min-width:0}
.p-flow-at{display:flex;align-items:center;gap:10px;height:36px;padding:0 12px 0 14px;border:none;border-radius:var(--ps-pill);background:none;color:var(--ps-ink);cursor:pointer;min-width:0;font-family:var(--ps-font)}
.p-flow-at:hover{background:var(--ps-fill-h)}
.p-flow-segs{display:flex;align-items:center;gap:3px;flex:none}
.p-flow-segs i{display:block;width:12px;height:4px;border-radius:9999px;background:var(--ps-line)}
.p-flow-segs i[data-s="done"]{background:var(--ps-good)}
.p-flow-segs i[data-s="cur"]{background:var(--ps-link)}
.p-flow[data-state="ct"] .p-flow-segs i[data-s="cur"]{background:var(--ps-warn)}
.p-flow-t{display:flex;align-items:baseline;gap:8px;min-width:0;white-space:nowrap}
.p-flow-t b{flex:none;font:600 13.5px/1 var(--ps-font);letter-spacing:.01em}
.p-flow-t s{text-decoration:none;font:400 12.5px/1 var(--ps-font);color:var(--ps-ink-2);overflow:hidden;text-overflow:ellipsis}
.p-flow[data-state="none"] .p-flow-t b,.p-flow[data-state="find"] .p-flow-t b{font-weight:500;color:var(--ps-ink-2)}
.p-flow[data-state="find"] .p-flow-segs::before{content:'';width:12px;height:12px;box-sizing:border-box;border-radius:50%;border:2px solid var(--ps-line);border-top-color:var(--ps-link);animation:p-flow-spin .8s linear infinite}
@keyframes p-flow-spin{to{transform:rotate(360deg)}}
.p-flow-go{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px 0 14px;border:none;border-radius:var(--ps-pill);background:var(--ps-primary);color:var(--ps-primary-i);font:600 13.5px/1 var(--ps-font);letter-spacing:.01em;white-space:nowrap;cursor:pointer;flex:none}
.p-flow-go:hover{background:var(--ps-primary-h)}
.p-flow-gi{width:16px;height:16px;fill:currentColor;flex:none}
.p-flow-at:focus-visible,.p-flow-go:focus-visible{outline:2px solid var(--ps-ink);outline-offset:2px}
@media (prefers-reduced-motion:reduce){.p-flow[data-state="find"] .p-flow-segs::before{animation:none}}
@media (max-width:1599px){.p-top:has(.p-flow) > .p-seg:not(.p-seg-mode){display:none}}
@media (max-width:1360px){.p-flow-t s{display:none}}
/* the step name never clips: the flow keeps its own width, and Preview gives up its word first */
.p-flow-at{flex:none}
@media (max-width:760px){.p-flow{order:6;flex:1 1 100%;justify-content:space-between}.p-flow-go{margin-left:auto}}
.p-flow[data-state="done"] .p-flow-segs i{background:var(--ps-good)}
.p-top:has(.p-flow-go) .p-share > .p-ghost{background:transparent;color:var(--ps-ink);box-shadow:inset 0 0 0 1px var(--ps-line)}
.p-top:has(.p-flow-go) .p-share > .p-ghost:hover,.p-top:has(.p-flow-go) .p-share > .p-ghost[data-on]{background:var(--ps-fill);color:var(--ps-ink);box-shadow:inset 0 0 0 1px var(--ps-line)}
/* the flow takes room the delivery trio's words had: below 1720 they are icons only (each
   names itself in its title), and the step's "with whom" goes before the step name */
@media (max-width:1720px){.p-top:has(.p-flow) .p-tgrp:not(.p-tgrp-h) > .p-ghost{font-size:0;gap:0;padding:0 11px;letter-spacing:0}}
@media (max-width:1600px){.p-top:has(.p-flow) .p-flow-t s{display:none}}
.p-top .p-flow{flex:none}
/* HOME: two doors — My turn and Start a post (2026-10-30) */
.pf-i{width:18px;height:18px;fill:currentColor;flex:none}
.p-br-mn:has(div[data-post-home]) .p-br-new{display:none}
.p-br-mn:has(.pp2) .p-sec-tpl{display:none}
.p-nav2 s.p-nav2-hot{background:var(--ps-accent);color:var(--ps-accent-i)}
.ph-host{font-family:var(--ps-font);color:var(--ps-ink)}
.p-br-mn:has(.pp2) .p-grid2{margin-left:50px}
@media (max-width:760px){.p-br-mn:has(.pp2) .p-grid2{margin-left:0}}
.ph-sw{display:inline-flex;gap:4px;padding:4px;margin:0 0 28px;border-radius:9999px;background:var(--ps-fill)}
.ph-sw button{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 20px;border:0;border-radius:9999px;background:transparent;color:var(--ps-ink-2);font:600 14px/1 var(--ps-font);letter-spacing:.16px;cursor:pointer;transition:background-color var(--ps-motion,.15s) var(--ps-ease,ease),color var(--ps-motion,.15s) var(--ps-ease,ease)}
.ph-sw button:hover{color:var(--ps-ink);background:var(--ps-fill-h)}
.ph-sw button[data-on],.ph-sw button[data-on]:hover{background:var(--ps-accent);color:var(--ps-accent-i)}
.ph-sw button:focus-visible{outline:2px solid var(--ps-ink);outline-offset:2px}
.ph-sw s{text-decoration:none;min-width:22px;height:22px;padding:0 7px;box-sizing:border-box;border-radius:9999px;background:var(--ps-primary);color:var(--ps-primary-i);font:600 12px/22px var(--ps-font);text-align:center;font-variant-numeric:tabular-nums}
.ph-sw button[data-on] s{background:var(--ps-accent-i);color:var(--ps-accent)}
.ph-room,.pp2{animation:phIn .32s cubic-bezier(.16,1,.3,1) both}
@keyframes phIn{from{opacity:.35;transform:translateY(8px)}}
.ph-g{margin:0 0 32px}
.ph-g h3{display:flex;align-items:center;gap:8px;margin:0 0 12px;font:600 14px/1.3 var(--ps-font);color:var(--ps-ink)}
.ph-g h3 s{text-decoration:none;font:500 12px/1 var(--ps-font);color:var(--ps-ink-2);padding:4px 8px;border-radius:9999px;background:var(--ps-fill)}
.ph-q h3{color:var(--ps-ink-2)}
.ph-list{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.ph-r{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;column-gap:20px;padding:12px 14px 12px 12px;border-radius:16px;background:var(--ps-card);box-shadow:inset 0 0 0 1px var(--ps-hair);transition:opacity .22s ease,transform .32s cubic-bezier(.16,1,.3,1),box-shadow var(--ps-motion,.15s) var(--ps-ease,ease)}
.ph-r:hover{box-shadow:inset 0 0 0 1px var(--ps-line)}
.ph-r[data-me]{padding:14px 16px 14px 14px}
.ph-r[data-busy]{opacity:.7}
.ph-r[data-sent]{opacity:0;transform:translateX(28px)}
.ph-th{display:block;width:48px;aspect-ratio:3/4;padding:0;border:0;border-radius:6px;overflow:hidden;background:var(--ps-fill-h);cursor:pointer}
.ph-r[data-me] .ph-th{width:72px;border-radius:8px}
.ph-th img{width:100%;height:100%;object-fit:cover;display:block}
.ph-th:focus-visible{outline:2px solid var(--ps-ink);outline-offset:2px}
.ph-t{display:grid;gap:6px;min-width:0}
.ph-t b{font:500 15px/1.3 var(--ps-font);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-r[data-me] .ph-t b{font-size:18px;letter-spacing:-.005em}
.ph-st{display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px;min-width:0;font:400 13px/1.3 var(--ps-font);color:var(--ps-ink-2)}
.ph-sn{font-weight:500;color:var(--ps-ink)}
.ph-fr{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-segs{display:inline-flex;gap:3px}
.ph-segs i{width:14px;height:4px;border-radius:9999px;background:var(--ps-line)}
.ph-segs i[data-s=done]{background:var(--ps-good)}.ph-segs i[data-s=cur]{background:var(--ps-link)}
.ph-due{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;font:500 13px/1 var(--ps-font);color:var(--ps-ink-2);font-variant-numeric:tabular-nums}
.ph-due::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--ps-dim)}
.ph-due[data-soon]{color:var(--ps-ink)}.ph-due[data-soon]::before{background:var(--ps-warn)}
.ph-due[data-late]{color:var(--ps-bad)}.ph-due[data-late]::before{background:var(--ps-bad)}
.ph-a{display:flex;align-items:center;gap:8px;justify-content:flex-end}
.ph-a button{height:36px;white-space:nowrap}
.ph-clear{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:16px;padding:20px 22px;border-radius:16px;background:var(--ps-fill)}
.ph-clear>.pf-i{width:28px;height:28px;padding:8px;border-radius:50%;background:var(--ps-good);fill:var(--ps-app)}
.ph-clear b{display:block;font:500 17px/1.3 var(--ps-font)}.ph-clear span{display:block;margin-top:2px;font:400 14px/1.45 var(--ps-font);color:var(--ps-ink-2)}
.ph-empty{display:grid;justify-items:start;gap:8px;max-width:560px;padding:26px 28px;border-radius:16px;background:var(--ps-fill)}
.ph-empty b{font:500 17px/1.3 var(--ps-font)}.ph-empty span{font:400 14px/1.5 var(--ps-font);color:var(--ps-ink-2)}.ph-empty button{margin-top:6px}
.ph-load li{height:96px;border-radius:16px;background:var(--ps-fill);animation:psPulse 1.4s ease-in-out infinite}
.ph-more{margin:12px 0 0 2px}
.ph-foot{display:flex;align-items:center;gap:18px;margin:4px 0 36px;font:400 12.5px/1 var(--ps-font);color:var(--ps-dim)}
.ph-foot span{margin-right:auto}
@media (prefers-reduced-motion:reduce){.ph-room,.pp2{animation:none}.ph-r{transition:none}}
@container (max-width:760px){
  .ph-r{grid-template-columns:auto minmax(0,1fr);row-gap:10px}
  .ph-due{grid-column:2}
  .ph-a{grid-column:1/-1;justify-content:stretch}.ph-a .ph-go{flex:1}
  .ph-r[data-me] .ph-th{width:56px}
  .ph-clear{grid-template-columns:auto minmax(0,1fr)}.ph-clear>button{grid-column:1/-1}
}
.ph-host,.pp-host{container-type:inline-size}

/* review fixes: one quiet Open, step colours as on Status, the switch row's meta, one foot */
.ph-bar{display:flex;align-items:center;flex-wrap:wrap;gap:12px 24px;margin:0 0 28px}
.ph-bar .ph-sw{margin:0}
.ph-g h3 .ph-meta{margin-left:auto;font-weight:400}
.ph-meta{display:flex;align-items:center;gap:18px;margin:0 0 0 auto;font:400 12.5px/1 var(--ps-font);color:var(--ps-dim)}
.ph-r .ph-open{background:transparent;color:var(--ps-ink-2);box-shadow:none}
.ph-r .ph-open:hover{background:var(--ps-fill);color:var(--ps-ink)}
.ph-segs[data-k=copy] i[data-s=cur]{background:var(--ps-warn)}
.ph-segs[data-k=ready] i{background:var(--ps-good)}
.p-br-mn:has(div[data-post-home] .ph-room) .p-sec-l{padding:32px 0 0 !important;margin-block:0 20px;border-top:1px solid var(--ps-hair);font:600 14px/1.3 var(--ps-font);color:var(--ps-ink-2);letter-spacing:0;text-transform:none}
.p-br-mn:has(.pp2) .p-c-car{left:auto;right:9px;top:9px;bottom:auto}
@container (max-width:760px){.ph-fr{white-space:normal}.ph-meta{margin:0;width:100%}}
/* the recents at Home's foot: a strip at queue scale — render and name, nothing from the library */
.p-br-mn:has(div[data-post-home] .ph-room) .p-grid2{display:flex;flex-wrap:wrap;gap:18px 16px;grid-template-columns:none}
.p-br-mn:has(div[data-post-home] .ph-room) .p-grid2 .p-c{width:140px;gap:8px;padding:0}
.p-br-mn:has(div[data-post-home] .ph-room) .p-grid2 .p-c-p{width:72px;border-radius:8px}
.p-br-mn:has(div[data-post-home] .ph-room) .p-grid2 .p-c-n{font:500 12.5px/1.3 var(--ps-font);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;white-space:normal}
.p-br-mn:has(div[data-post-home] .ph-room) .p-grid2 :is(.p-c-m,.p-c-tags,.p-c-b,.p-c-hint,.p-c-vars){display:none}
/* door two: three steps */
.pp2{list-style:none;margin:0 0 8px;padding:0;max-width:760px;font-family:var(--ps-font);color:var(--ps-ink)}
.pp2>li{position:relative;display:grid;grid-template-columns:32px minmax(0,1fr);column-gap:18px;padding:0 0 30px}
.pp2>li:not(:last-child)::before{content:'';position:absolute;left:15.5px;top:38px;bottom:6px;width:1px;background:var(--ps-line)}
.pp2-n{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:var(--ps-fill-h);font:600 13px/1 var(--ps-font);font-variant-numeric:tabular-nums}
.pp2>li:focus-within .pp2-n{background:var(--ps-accent);color:var(--ps-accent-i)}
.pp2 h3{margin:5px 0 12px;font:600 15px/1.3 var(--ps-font)}
.pp2 h3 small{margin-left:6px;font:400 12.5px/1 var(--ps-font);color:var(--ps-ink-2)}
.pp2-name{display:block;width:100%;box-sizing:border-box;border:0;border-bottom:1px solid var(--ps-line);background:transparent;color:var(--ps-ink);font:500 clamp(24px,2.6vw,32px)/1.2 var(--ps-font);letter-spacing:-.01em;padding:2px 0 10px;outline:none;transition:border-color var(--ps-motion,.15s) var(--ps-ease,ease)}
.pp2-name:focus{border-bottom-color:var(--ps-ink)}
.pp2-name::placeholder{color:var(--ps-dim)}
.pp2-due{display:inline-flex;align-items:center;gap:8px;height:36px;margin-top:14px;padding:0 8px 0 12px;border-radius:9999px;box-shadow:inset 0 0 0 1px var(--ps-line);font:500 13px/1 var(--ps-font);color:var(--ps-ink-2)}
.pp2-due:focus-within{box-shadow:inset 0 0 0 1px var(--ps-ink)}
.pp2-due input{border:0;background:transparent;color:var(--ps-ink);font:400 13.5px/1 var(--ps-font);height:32px;color-scheme:light dark;outline:none}
.pp2 textarea{display:block;width:100%;box-sizing:border-box;min-height:104px;resize:vertical;border:0;border-radius:14px;background:var(--ps-fill);color:var(--ps-ink);padding:14px 16px;font:400 15px/1.5 var(--ps-font)}
.pp2 textarea::placeholder{color:var(--ps-dim)}
.pp2 textarea:focus{outline:2px solid var(--ps-ink);outline-offset:2px}
.pp2-files{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:10px}
.pp2-att{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px 0 10px;border:0;border-radius:9999px;background:transparent;box-shadow:inset 0 0 0 1px var(--ps-line);color:var(--ps-ink);font:600 13px/1 var(--ps-font);cursor:pointer}
.pp2-att:hover{background:var(--ps-fill)}
.pp2-f{display:inline-flex;align-items:center;gap:4px;height:30px;padding:0 4px 0 12px;border-radius:9999px;background:var(--ps-fill);font:400 12.5px/1 var(--ps-font);max-width:240px}
.pp2-f>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pp2-f button{display:grid;place-items:center;width:24px;height:24px;border:0;border-radius:50%;background:none;color:var(--ps-ink-2);cursor:pointer}
.pp2-f button:hover{background:var(--ps-fill-h);color:var(--ps-ink)}
.pp2 p{margin:0;font:400 14px/1.5 var(--ps-font);color:var(--ps-ink-2);max-width:62ch}
.pp2 button:focus-visible,.pp2 input:focus-visible{outline:2px solid var(--ps-ink);outline-offset:2px}
/* Status */
.ps{font-family:var(--ps-font);color:var(--ps-ink)}
.ps-bar{display:flex;align-items:center;flex-wrap:wrap;gap:12px 16px;margin:0 0 20px}
.ps-sum{display:flex;align-items:baseline;gap:10px;margin-right:auto}.ps-sum b{font:500 18px/1 var(--ps-font)}.ps-sum span{font:400 13.5px/1 var(--ps-font);color:var(--ps-ink-2)}
.ps-at{font:400 12.5px/1 var(--ps-font);color:var(--ps-dim)}
.ps-f{width:auto}
.ps-cols{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;align-items:start}
.ps-col{display:grid;gap:10px;padding:14px;border-radius:16px;background:var(--ps-fill);min-width:0}
.ps-col h3{margin:0 0 2px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;column-gap:8px;font:600 14px/1.3 var(--ps-font)}
.ps-col h3 i{width:8px;height:8px;border-radius:50%;background:var(--ps-dim)}
.ps-col[data-k=design] h3 i{background:var(--ps-link)}.ps-col[data-k=copy] h3 i{background:var(--ps-warn)}.ps-col[data-k=ready] h3 i{background:var(--ps-good)}
.ps-col h3 s{text-decoration:none;font:500 12px/1 var(--ps-font);color:var(--ps-ink-2);padding:4px 8px;border-radius:9999px;background:var(--ps-fill-h)}
.ps-col h3 small{grid-column:2/-1;font:400 12px/1.3 var(--ps-font);color:var(--ps-ink-2)}
.ps-c{display:grid;grid-template-columns:54px minmax(0,1fr);gap:12px;width:100%;padding:10px;border:0;border-radius:12px;background:var(--ps-card);box-shadow:inset 0 0 0 1px var(--ps-hair);color:var(--ps-ink);text-align:left;cursor:pointer;font-family:var(--ps-font)}
.ps-c:hover{box-shadow:inset 0 0 0 1px var(--ps-line)}
.ps-c[data-me]{box-shadow:inset 0 0 0 2px var(--ps-link)}
.ps-c:focus-visible{outline:2px solid var(--ps-ink);outline-offset:2px}
.ps-th{display:block;width:54px;aspect-ratio:3/4;border-radius:6px;overflow:hidden;background:var(--ps-fill-h)}
.ps-th img{width:100%;height:100%;object-fit:cover;display:block}
.ps-ct{display:grid;align-content:start;gap:4px;min-width:0}
.ps-ct b{font:500 14px/1.3 var(--ps-font);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.ps-ct small{font:400 12.5px/1.3 var(--ps-font);color:var(--ps-ink-2)}
.ps-m{display:flex;flex-wrap:wrap;gap:4px 10px;font:400 12px/1.3 var(--ps-font);color:var(--ps-dim)}
.ps-due[data-late]{color:var(--ps-bad);font-weight:500}
.ps-you{justify-self:start;margin-top:2px;padding:3px 8px;border-radius:9999px;background:var(--ps-accent);color:var(--ps-accent-i);font:600 11.5px/1 var(--ps-font)}
.ps-none{margin:4px 2px;font:400 12.5px/1.4 var(--ps-font);color:var(--ps-dim)}
.ps-empty{display:grid;justify-items:start;gap:8px;max-width:520px;padding:28px;border-radius:16px;background:var(--ps-fill)}
.ps-empty b{font:500 17px/1.3 var(--ps-font)}.ps-empty span{font:400 14px/1.5 var(--ps-font);color:var(--ps-ink-2)}.ps-empty button{margin-top:6px}
.ps-load{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.ps-load i{height:180px;border-radius:16px;background:var(--ps-fill);animation:psPulse 1.4s ease-in-out infinite}
@keyframes psPulse{50%{opacity:.5}}
@media (prefers-reduced-motion:reduce){.ps-load i{animation:none}}
.ps-back{display:inline-block;margin:0 0 16px}
.psd-h{display:grid;grid-template-columns:96px minmax(0,1fr);gap:20px;align-items:start;margin:0 0 24px}
.psd-th{display:block;width:96px;aspect-ratio:3/4;border-radius:10px;overflow:hidden;background:var(--ps-fill)}.psd-th img{width:100%;height:100%;object-fit:cover;display:block}
.psd-t h2{margin:2px 0 6px;font:500 28px/1.2 var(--ps-font);letter-spacing:-.01em}
.psd-t p{margin:0;font:400 13.5px/1.4 var(--ps-font);color:var(--ps-ink-2)}
.psd-acts{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 0}.psd-acts a{text-decoration:none;display:inline-flex;align-items:center}
.psd-cols{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:20px;align-items:start}
.psd-cols>div,.psd-cols>aside{display:grid;gap:16px}
.psd-card{padding:18px 20px;border-radius:16px;background:var(--ps-card);box-shadow:inset 0 0 0 1px var(--ps-hair)}
.psd-card h3{margin:0 0 12px;font:600 14px/1.3 var(--ps-font)}
.psd-steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.psd-steps li{display:grid;gap:4px;padding-top:12px;position:relative}
.psd-steps li i{position:absolute;top:0;left:0;right:0;height:4px;border-radius:9999px;background:var(--ps-line)}
.psd-steps li[data-s=done] i{background:var(--ps-good)}.psd-steps li[data-s=cur] i{background:var(--ps-link)}
.psd-steps b{font:500 13.5px/1.3 var(--ps-font)}.psd-steps li[data-s=todo] b{color:var(--ps-ink-2)}
.psd-steps span{font:400 12.5px/1.35 var(--ps-font);color:var(--ps-ink-2)}
.psd-log{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.psd-log li{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;font:400 13px/1.4 var(--ps-font)}
.psd-log b{font-weight:500}.psd-log span{color:var(--ps-ink-2)}.psd-log s{text-decoration:none;color:var(--ps-dim);font-size:12px;white-space:nowrap}
.psd-brief{margin:0;white-space:pre-wrap;font:400 13.5px/1.55 var(--ps-font);color:var(--ps-ink-2)}
.psd-files{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:6px;font:400 13px/1.3 var(--ps-font)}.psd-files a{color:var(--ps-link)}
.psd-rm{justify-self:start;color:var(--ps-ink-2)}
@container (max-width:1000px){.ps-cols{grid-template-columns:repeat(2,minmax(0,1fr))}.psd-cols{grid-template-columns:1fr}}
@container (max-width:560px){.ps-cols,.psd-steps{grid-template-columns:1fr}.psd-h{grid-template-columns:64px minmax(0,1fr)}.psd-th{width:64px}}
[data-post-status]{container-type:inline-size}
/* performance marketing in OPS: Status only */
html[data-acc-lim] .p-br-sb .p-nav2:not(.p-nav2-rev),html[data-acc-lim] .p-br-sb .p-ws,html[data-acc-lim] .p-br-sb .p-sec-l0,html[data-acc-lim] .p-br-sb .p-sbn-sep,html[data-acc-lim] .p-br-sb .p-sbf,html[data-acc-lim] .p-br-new,html[data-acc-lim] .p-br-alt,html[data-acc-lim] .p-br-sep{display:none !important}
/* ── HOME TAKES CAS'S DESIGN (2026-10-30, /impeccable — "grab the design elements from CAS") ──
   · Start a post is CAS's brief sheet: the name is the headline, the due date one chip under it,
     the brief the one big card with its files attached to the foot, then the templates.
   · The My turn | Start a post switch is CAS's .p-tabs track (40px), not a second, bigger one.
   · A row is CAS's audience card: the lifted card fill, a hairline that firms on hover. */
.pp3{display:flex;flex-direction:column;gap:26px;max-width:none;padding:6px 0 28px;font-family:var(--ps-font);color:var(--ps-ink);animation:phIn .32s cubic-bezier(.16,1,.3,1) both}
.pp3-namew{display:block}
.pp3-name{display:block;width:100%;box-sizing:border-box;margin:0;padding:2px 0 12px;border:none;border-bottom:1px solid var(--ps-line);border-radius:0;background:none;color:var(--ps-ink);font:400 clamp(30px,3.4vw,46px)/1.12 var(--ps-font);letter-spacing:-.028em;outline:none;transition:border-color var(--ps-motion,.15s) var(--ps-ease,ease)}
.pp3-name::placeholder{color:var(--ps-dim)}
.pp3-name:hover{border-bottom-color:var(--ps-ink-2)}
.pp3-name:focus{border-bottom-color:var(--ps-ink)}
.pp3-q{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
.pp3-chip{display:inline-flex;align-items:center;gap:8px;height:40px;box-sizing:border-box;padding:0 14px 0 12px;border-radius:9999px;background:var(--ps-fill);color:var(--ps-ink-2);transition:background-color var(--ps-motion,.15s) var(--ps-ease,ease)}
.pp3-chip .pf-i{width:18px;height:18px}
.pp3-due{cursor:text}
.pp3-due:hover{background:var(--ps-fill-h)}
.pp3-due:focus-within{outline:2px solid var(--ps-ink);outline-offset:2px}
.pp3-cht{font:500 13px/1 var(--ps-font);color:var(--ps-ink-2);white-space:nowrap}
.pp3-due input{width:122px;height:100%;padding:0;border:none;background:none;outline:none;color:var(--ps-ink);font:400 14px/1 var(--ps-font)}
.pp3-due input::-webkit-calendar-picker-indicator{opacity:.6;cursor:pointer}
:root:not([data-theme="light"]) .pp3-due input{color-scheme:dark}
.pp3-where{background:none;box-shadow:inset 0 0 0 1px var(--ps-hair);font:400 13px/1 var(--ps-font);color:var(--ps-ink-2);min-width:0}
.pp3-where span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pp3-bl{display:block;margin:0 0 10px;font:500 13px/1.2 var(--ps-font);color:var(--ps-ink-2)}
.pp3-bl small{margin-left:6px;font:400 12.5px/1 var(--ps-font);color:var(--ps-dim)}
.pp3-sheet{border-radius:16px;background:var(--ps-card);box-shadow:inset 0 0 0 1px var(--ps-line);overflow:hidden;transition:box-shadow var(--ps-motion,.15s) var(--ps-ease,ease)}
.pp3-sheet:focus-within{box-shadow:inset 0 0 0 1px var(--ps-ink-2)}
.pp3-sheet textarea{display:block;width:100%;box-sizing:border-box;min-height:200px;margin:0;padding:18px 20px;border:none;background:none;outline:none;resize:vertical;color:var(--ps-ink);font:400 16px/1.6 var(--ps-font)}
.pp3-sheet textarea::placeholder{color:var(--ps-dim)}
.pp3-files{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 12px;border-top:1px solid var(--ps-hair);background:var(--ps-card-h)}
.pp3-add{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px 0 10px;border:none;border-radius:9999px;background:none;color:var(--ps-ink-2);font:500 13px/1 var(--ps-font);cursor:pointer}
.pp3-add:hover{background:var(--ps-fill);color:var(--ps-ink)}
.pp3-add .pf-i{width:18px;height:18px}
.pp3-fc{display:inline-flex;align-items:center;gap:6px;max-width:100%;height:34px;box-sizing:border-box;padding:0 4px 0 12px;border-radius:9999px;background:var(--ps-card);box-shadow:inset 0 0 0 1px var(--ps-hair)}
.pp3-fc b{min-width:0;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:400 12.5px/1 var(--ps-font);color:var(--ps-ink)}
.pp3-fc button{display:grid;place-items:center;width:26px;height:26px;padding:0;border:none;border-radius:50%;background:none;color:var(--ps-dim);cursor:pointer}
.pp3-fc button:hover{background:var(--ps-fill);color:var(--ps-ink)}
.pp3-fc .pf-i{width:16px;height:16px}
.pp3-th{display:grid;gap:4px;margin-top:4px}
.pp3-th b{font:500 13px/1.2 var(--ps-font);color:var(--ps-ink-2)}
.pp3-th span{font:400 13px/1.45 var(--ps-font);color:var(--ps-dim);max-width:62ch}
.pp3 :focus-visible{outline:2px solid var(--ps-ink);outline-offset:2px}
.pp3-sheet textarea:focus-visible,.pp3 .pp3-name:focus-visible{outline:none}
.p-br-mn:has(.pp3) .p-sec-tpl{display:none}
.p-br-mn:has(.pp3) .p-c-car{left:auto;right:9px;top:9px;bottom:auto}
@media (max-width:600px){.pp3-where{flex-basis:100%}.pp3-sheet textarea{min-height:150px}}
@media (prefers-reduced-motion:reduce){.pp3{animation:none}.pp3-name,.pp3-chip,.pp3-sheet{transition:none}}
/* the switch: CAS's .p-tabs proportions */
.ph-bar{margin:4px 0 28px}
.ph-sw{padding:3px;gap:2px}
.ph-sw button{height:34px;padding:0 16px;font:600 13.5px/1 var(--ps-font)}
.ph-sw .pf-i{width:16px;height:16px}
/* a row is CAS's audience card */
.ph-r{background:var(--ps-card-h);box-shadow:inset 0 0 0 1px var(--ps-hair)}
.ph-r:hover{box-shadow:inset 0 0 0 1px var(--ps-line)}
:root[data-theme="light"] .ph-r{background:var(--ps-card);box-shadow:inset 0 0 0 1px var(--ps-line)}
.ph-g h3{font:500 13px/1.2 var(--ps-font);color:var(--ps-ink-2)}
.ph-g:first-child h3{color:var(--ps-ink)}
.ph-g h3 s{font:500 12px/1 var(--ps-font);padding:3px 8px}
/* the recents under My turn take CAS's heading: a hairline, then "Pick up where you left off" */
.p-br-mn:has(div[data-post-home] .ph-room) .p-sec-rec{font:500 13px/1.2 var(--ps-font) !important;color:var(--ps-ink-2)}

`;
  const st = document.createElement('style'); st.id = 'pf-css'; st.textContent = css;
  (document.head || document.documentElement).appendChild(st);
})();
