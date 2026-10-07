/* Provident Studio — support desk client.
 *
 * Talks to the Apps Script in tools/support/Code.gs. It lives in its own file, loaded by
 * `<script src>`, so the studio documents only carry markup and a few render keys: a
 * top-level `class` in a classic script is a global binding, the same way StudioBase is.
 *
 * It holds NO project state. Everything here is throwaway UI plus a cache of the tickets, so
 * it lives on an instance with `host()` (a forceUpdate) and never in the saved project — a
 * status change is not a change to a post and must not touch undo, recents or a session file.
 * The URL, team key and identity are per computer, in localStorage, and are never committed.
 */
class SupportDesk {
  static COLS = [
    { name: 'New', tone: 'new', hint: 'Waiting for someone to pick it up' },
    { name: 'In progress', tone: 'wip', hint: 'The design team is on it' },
    { name: 'Needs your input', tone: 'ask', hint: 'The team has a question for the requester' },
    { name: 'Done', tone: 'done', hint: 'Finished or closed' }
  ];
  static CATEGORIES = ['Bug or something broken', 'New template or layout', 'Change to a post', 'Question or how-to', 'Other'];
  static PRIORITIES = ['Low', 'Normal', 'Urgent'];
  static STUDIOS = ['Organic Post Studio', 'Campaign Ads Studio', 'Web Image Studio', 'Not about a studio'];
  static CFG = 'provident-support';
  static SEEN = 'provident-support-seen';
  static POLL = 60000;

  constructor(host) {
    this.host = host || (() => {});
    this.tickets = [];
    this.staff = false;
    this.staffList = [];
    this.err = '';
    this.formErr = '';
    this.loading = false;
    this.open = false;
    this.newOpen = false;
    this.sel = null;
    this.detail = null;
    this.bell = false;
    this.scope = 'all';
    this._seen = this.readSeen();
    this._prevUnseen = {};
    this._timer = null;
  }

  // ---------- config + identity ----------
  cfg() {
    try { const c = JSON.parse(localStorage.getItem(SupportDesk.CFG) || '{}'); return c && typeof c === 'object' ? c : {}; } catch (e) { return {}; }
  }
  saveCfg(c) { try { localStorage.setItem(SupportDesk.CFG, JSON.stringify(c)); } catch (e) {} }
  connected() { const c = this.cfg(); return !!(c.url && c.key && c.email); }
  me() { return String(this.cfg().email || '').trim().toLowerCase(); }
  readSeen() { try { return JSON.parse(localStorage.getItem(SupportDesk.SEEN) || 'null'); } catch (e) { return null; } }
  writeSeen() { try { localStorage.setItem(SupportDesk.SEEN, JSON.stringify(this._seen || {})); } catch (e) {} }

  // ---------- transport ----------
  // text/plain keeps this a "simple" request, so the browser sends no CORS preflight — an
  // Apps Script web app cannot answer one.
  async call(action, payload) {
    const c = this.cfg();
    if (!c.url || !c.key || !c.email) throw new Error('Connect the support desk first.');
    let r;
    try {
      r = await fetch(c.url, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ key: c.key, email: c.email, name: c.name || '', action }, payload || {})) });
    } catch (e) { throw new Error('Could not reach the support desk. Check the web app URL and your connection.'); }
    let j;
    try { j = await r.json(); } catch (e) { throw new Error('The support desk answered with something unexpected. Is the URL the web app’s /exec link?'); }
    if (!j || !j.ok) throw new Error((j && j.error) || 'The support desk refused that.');
    return j;
  }

  // ---------- data ----------
  async refresh(quiet) {
    if (!this.connected()) return;
    if (!quiet) { this.loading = true; this.host(); }
    try {
      const j = await this.call('list');
      this.tickets = j.tickets || [];
      this.staff = !!j.staff;
      this.staffList = j.staffList || [];
      this.err = '';
      // the first time this computer connects, everything already there is "seen" — otherwise a
      // new user opens to a bell full of history
      if (!this._seen) { this._seen = {}; this.tickets.forEach(t => { this._seen[t.id] = t.lastAt; }); this.writeSeen(); }
      this.alertNew();
      if (this.sel) this.loadDetail(this.sel, true);
    } catch (e) { this.err = String(e.message || e); }
    this.loading = false;
    this.host();
  }
  async loadDetail(id, quiet) {
    try {
      const j = await this.call('get', { id });
      if (this.sel === id) { this.detail = j; if (!quiet) this.markSeen(id); }
    } catch (e) { this.err = String(e.message || e); }
    this.host();
  }
  start() {
    if (this._timer) return;
    this._timer = setInterval(() => { if (document.visibilityState === 'visible' && this.connected()) this.refresh(true); }, SupportDesk.POLL);
    document.addEventListener('visibilitychange', this._vis = () => { if (document.visibilityState === 'visible' && this.connected()) this.refresh(true); });
    this.bind();
    if (this.connected()) this.refresh(true);
    this.fromHash();
  }
  stop() { if (this._timer) clearInterval(this._timer); this._timer = null; if (this._vis) document.removeEventListener('visibilitychange', this._vis); }
  // an emailed link opens the ticket: ...#support=PRV-0007
  fromHash() {
    // a SETUP LINK from the admin carries the web app URL and team key, so a requester never
    // sees or types either: ...#supportsetup=<base64url of {"u":url,"k":key}>
    const su = /[#&]supportsetup=([A-Za-z0-9_-]+)/.exec(location.hash || '');
    if (su) {
      try {
        const j = JSON.parse(decodeURIComponent(escape(atob(su[1].replace(/-/g, '+').replace(/_/g, '/')))));
        if (j && j.u && j.k) { this.saveCfg(Object.assign({}, this.cfg(), { url: j.u, key: j.k })); this.open = true; }
      } catch (e) { this.formErr = 'That setup link is damaged. Ask for a new one.'; this.open = true; }
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
      this.host(); if (this.connected()) this.refresh(true); return;
    }
    const m = /[#&]support=([A-Za-z0-9-]+)/.exec(location.hash || '');
    if (!m) return;
    this.open = true; this.sel = m[1]; this.detail = null;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    if (this.connected()) this.loadDetail(m[1]);
    this.host();
  }

  // ---------- unseen ----------
  unseen(t) { return !!(t.lastBy && String(t.lastBy).toLowerCase() !== this.me() && t.lastAt > ((this._seen || {})[t.id] || '')); }
  unseenList() { return this.tickets.filter(t => this.unseen(t)).sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1)); }
  markSeen(id) {
    const t = this.tickets.find(x => x.id === id); if (!t) return;
    if (!this._seen) this._seen = {};
    this._seen[id] = t.lastAt; this.writeSeen();
  }
  markAll() { if (!this._seen) this._seen = {}; this.tickets.forEach(t => { this._seen[t.id] = t.lastAt; }); this.writeSeen(); this.host(); }
  // a desktop notification, once per change, when the person has allowed them
  alertNew() {
    const now = {};
    this.unseenList().forEach(t => {
      now[t.id] = t.lastAt;
      if (this._prevUnseen[t.id] === t.lastAt) return;
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      if (document.visibilityState === 'visible' && this.open) return;
      try { new Notification(t.id + ' — ' + t.title, { body: this.lastLine(t), tag: t.id }); } catch (e) {}
    });
    this._prevUnseen = now;
  }
  lastLine(t) {
    const who = t.lastBy === (t.requester && t.requester.email) ? ((t.requester && t.requester.name) || 'The requester') : 'The design team';
    if (t.lastKind === 'status') return 'Status: ' + t.lastText;
    if (t.lastKind === 'comment') return who + ': ' + t.lastText;
    return 'New request: ' + t.lastText;
  }
  askNotify() {
    if (typeof Notification === 'undefined') return;
    try { Notification.requestPermission().then(() => this.host()); } catch (e) {}
  }

  // ---------- actions ----------
  async connect() {
    const g = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const old = this.cfg();
    const c = { url: g('sup-f-url') || old.url || '', key: g('sup-f-key') || old.key || '', name: g('sup-f-name'), email: g('sup-f-email').toLowerCase() };
    if (!c.url || !c.key) { this.formErr = 'This computer is not set up yet. Open the setup link the design team sent you.'; this.host(); return; }
    if (!/^(https:\/\/script\.google(usercontent)?\.com\/|http:\/\/(localhost|127\.0\.0\.1)[:\/])/.test(c.url)) { this.formErr = 'That is not a Google Apps Script web app URL (it starts https://script.google.com/…/exec).'; this.host(); return; }
    if (!c.name) { this.formErr = 'Enter your name.'; this.host(); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) { this.formErr = 'Enter your work email.'; this.host(); return; }
    this.saveCfg(c); this.formErr = ''; this._seen = this.readSeen();
    this.loading = true; this.host();
    try { await this.call('list'); } catch (e) { this.formErr = String(e.message || e); this.saveCfg({ url: old.url, key: old.key }); this.loading = false; this.host(); return; }
    await this.refresh(true);
  }
  disconnect() { const c = this.cfg(); this.saveCfg({ url: c.url, key: c.key }); this.tickets = []; this.sel = null; this.detail = null; this.staff = false; this.host(); }

  async submit() {
    const g = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const p = { title: g('sup-n-title'), description: g('sup-n-desc'), category: g('sup-n-cat'), priority: g('sup-n-prio'), studio: g('sup-n-studio'), link: g('sup-n-link') };
    if (!p.title) { this.formErr = 'Give the request a short title.'; this.host(); return; }
    if (!p.description) { this.formErr = 'Describe what you need — what you were doing, and what you expected.'; this.host(); return; }
    this.loading = true; this.formErr = ''; this.host();
    try {
      const j = await this.call('create', p);
      this.newOpen = false; this.sel = j.ticket.id; this.detail = null;
      await this.refresh(true);
      this.markSeen(j.ticket.id);
      this.loadDetail(j.ticket.id);
    } catch (e) { this.formErr = String(e.message || e); }
    this.loading = false; this.host();
  }
  async sendComment() {
    const el = document.getElementById('sup-cmt'); if (!el || !this.sel) return;
    const body = el.value.trim(); if (!body) return;
    el.disabled = true;
    try { await this.call('comment', { id: this.sel, body }); el.value = ''; await this.refresh(true); }
    catch (e) { this.err = String(e.message || e); }
    el.disabled = false; this.host();
  }
  // optimistic: the card moves at once and snaps back if the desk refuses
  async setStatus(id, status) {
    const t = this.tickets.find(x => x.id === id); if (!t || t.status === status) return;
    const was = t.status; t.status = status; this.host();
    try { await this.call('status', { id, status }); await this.refresh(true); }
    catch (e) { t.status = was; this.err = String(e.message || e); this.host(); }
  }
  async assign(id, who) {
    try { await this.call('assign', { id, assignee: who }); await this.refresh(true); } catch (e) { this.err = String(e.message || e); this.host(); }
  }
  select(id) { this.sel = id; this.detail = null; this.markSeen(id); this.host(); this.loadDetail(id); }
  closeDetail() { this.sel = null; this.detail = null; this.host(); }

  // ---------- kanban drag: staff only, mouse and pen. The status menu in the ticket is the
  // keyboard and touch route. Pointer events, never native drag-and-drop. ----------
  bind() {
    if (this._bound) return; this._bound = true;
    const clear = () => {
      const d = this._drag; if (!d) return;
      if (d.ghost) d.ghost.remove();
      if (d.card) d.card.removeAttribute('data-lift');
      document.querySelectorAll('[data-supcol][data-drop]').forEach(c => c.removeAttribute('data-drop'));
      this._drag = null;
    };
    const colAt = (x, y) => { const e = document.elementFromPoint(x, y); return e && e.closest ? e.closest('[data-supcol]') : null; };
    document.addEventListener('pointerdown', e => {
      if (e.button > 0 || e.pointerType === 'touch') return;
      const card = e.target.closest && e.target.closest('[data-supcard][data-supdrag]');
      if (!card) return;
      this._drag = { id: card.getAttribute('data-supcard'), x: e.clientX, y: e.clientY, on: false, card, ghost: null };
    }, true);
    document.addEventListener('pointermove', e => {
      const d = this._drag; if (!d) return;
      if (!d.on) {
        if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return;
        d.on = true;
        const r = d.card.getBoundingClientRect();
        d.ghost = d.card.cloneNode(true);
        d.ghost.removeAttribute('data-supcard'); d.ghost.setAttribute('data-ghost', '1');
        d.ghost.style.cssText = 'position:fixed;z-index:400;pointer-events:none;width:' + r.width + 'px;left:' + r.left + 'px;top:' + r.top + 'px;margin:0';
        d.dx = e.clientX - r.left; d.dy = e.clientY - r.top;
        document.body.appendChild(d.ghost);
        d.card.setAttribute('data-lift', '1');
      }
      d.ghost.style.left = (e.clientX - d.dx) + 'px'; d.ghost.style.top = (e.clientY - d.dy) + 'px';
      const col = colAt(e.clientX, e.clientY);
      document.querySelectorAll('[data-supcol][data-drop]').forEach(c => { if (c !== col) c.removeAttribute('data-drop'); });
      if (col) col.setAttribute('data-drop', '1');
    }, true);
    document.addEventListener('pointerup', e => {
      const d = this._drag; if (!d) return;
      const wasOn = d.on, id = d.id, col = wasOn ? colAt(e.clientX, e.clientY) : null;
      clear();
      if (!wasOn) return;
      // the release would otherwise click the card open
      const eat = ev => { ev.stopPropagation(); ev.preventDefault(); };
      document.addEventListener('click', eat, { capture: true, once: true });
      setTimeout(() => document.removeEventListener('click', eat, true), 0);
      if (col) this.setStatus(id, col.getAttribute('data-supcol'));
    }, true);
    document.addEventListener('pointercancel', clear, true);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && this._drag) clear(); }, true);
  }
  // Uncontrolled inputs are filled from `data-sup-v` once per value, after a render. A
  // controlled `value=` would need an onChange that re-renders on every keystroke, and the
  // one-minute poll must never be able to clobber a half-written request.
  fill() {
    document.querySelectorAll('[data-sup-v]').forEach(el => {
      const v = el.getAttribute('data-sup-v');
      if (el.__supv === v) return;
      el.__supv = v; el.value = v;
    });
  }

  // ---------- view ----------
  static ago(iso) {
    const t = Date.parse(iso); if (!t) return '';
    const s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 86400 * 7) return Math.floor(s / 86400) + 'd ago';
    return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }
  firstName(n) { return String(n || '').split(/\s+/)[0] || ''; }
  card(t) {
    return {
      id: t.id, title: t.title, cat: t.category, prio: t.priority,
      prioOn: t.priority === 'Urgent' ? '1' : undefined,
      who: this.staff ? ((t.requester && t.requester.name) || '') : '',
      whoOn: this.staff ? '1' : undefined,
      assignee: t.assignee ? this.firstName(t.assignee.split('@')[0].replace(/[._]/g, ' ')) : '',
      assigneeOn: t.assignee ? '1' : undefined,
      when: SupportDesk.ago(t.updated), comments: t.comments || 0, hasComments: t.comments ? '1' : undefined,
      unseen: this.unseen(t) ? '1' : undefined, on: this.sel === t.id ? '1' : undefined,
      drag: this.staff ? '1' : undefined,
      open: () => this.select(t.id)
    };
  }
  vals() {
    const D = this, c = this.cfg(), prioRank = { Urgent: 0, Normal: 1, Low: 2 };
    const me = this.me();
    let list = this.tickets;
    if (this.staff && this.scope === 'mine') list = list.filter(t => t.assignee === me || (t.requester && t.requester.email === me));
    const cols = SupportDesk.COLS.map(col => {
      const items = list.filter(t => t.status === col.name)
        .sort((a, b) => (prioRank[a.priority] - prioRank[b.priority]) || (a.updated < b.updated ? 1 : -1));
      return { name: col.name, tone: col.tone, hint: col.hint, count: items.length, empty: items.length ? undefined : '1', cards: items.map(t => D.card(t)) };
    });
    const t = this.sel && (this.detail && this.detail.ticket || this.tickets.find(x => x.id === this.sel));
    const timeline = (this.detail && this.detail.comments || []).map(m => ({
      who: m.name || m.email, when: SupportDesk.ago(m.at), body: m.body,
      system: m.kind === 'status' ? '1' : undefined, said: m.kind === 'comment' ? '1' : undefined,
      staff: m.staff ? '1' : undefined, mine: m.email === me ? '1' : undefined
    }));
    const unseen = this.unseenList();
    const isMine = !!(t && t.requester && t.requester.email === me);
    return {
      supOn: this.open ? '1' : undefined,
      supBadge: unseen.length, supBadgeOn: unseen.length ? '1' : undefined,
      supOpenFn: () => { D.open = true; D.host(); if (D.connected()) D.refresh(true); },
      supCloseFn: () => { D.open = false; D.sel = null; D.detail = null; D.newOpen = false; D.bell = false; D.host(); },
      supConnected: this.connected() ? '1' : undefined,
      supNeedConnect: this.connected() ? undefined : '1',
      supHasSetup: (c.url && c.key) ? '1' : undefined, supNoSetup: (c.url && c.key) ? undefined : '1',
      supCfgUrl: c.url || '', supCfgKey: c.key || '', supCfgName: c.name || '', supCfgEmail: c.email || '',
      supConnectFn: () => D.connect(),
      supDisconnectFn: () => { if (confirm('Sign out of the support desk on this computer? Your tickets stay where they are.')) D.disconnect(); },
      supWho: c.name ? c.name + (this.staff ? ' · design team' : '') : '',
      supErr: this.err, supErrOn: this.err ? '1' : undefined,
      supFormErr: this.formErr, supFormErrOn: this.formErr ? '1' : undefined,
      supBusy: this.loading ? '1' : undefined,
      supRefreshFn: () => D.refresh(false),
      supStaff: this.staff ? '1' : undefined,
      supScopeAll: this.scope === 'all' ? '1' : undefined, supScopeMine: this.scope === 'mine' ? '1' : undefined,
      supSetAll: () => { D.scope = 'all'; D.host(); }, supSetMine: () => { D.scope = 'mine'; D.host(); },
      supCols: cols,
      supTotal: this.tickets.length, supNoTickets: (!this.tickets.length && !this.loading) ? '1' : undefined,
      supEmptyNote: this.staff ? 'No requests yet.' : 'You have no requests yet. Use “New request” when you need something from the design team.',
      // new request
      supNewOn: this.newOpen ? '1' : undefined,
      supNewFn: () => { D.newOpen = true; D.formErr = ''; D.host(); },
      supNewClose: () => { D.newOpen = false; D.formErr = ''; D.host(); },
      supSubmitFn: () => D.submit(),
      supCats: SupportDesk.CATEGORIES.map(v => ({ v })), supPrios: SupportDesk.PRIORITIES.map(v => ({ v })),
      supStudios: SupportDesk.STUDIOS.map(v => ({ v })),
      // ticket
      supDetailOn: t ? '1' : undefined,
      supDetailLoading: (t && !this.detail) ? '1' : undefined,
      supD: t ? {
        id: t.id, title: t.title, desc: t.description, status: t.status, cat: t.category, prio: t.priority,
        prioOn: t.priority === 'Urgent' ? '1' : undefined,
        studio: t.studio, studioOn: t.studio ? '1' : undefined, link: t.link, linkOn: /^https?:\/\//.test(t.link || '') ? '1' : undefined,
        by: (t.requester && t.requester.name) || '', byEmail: (t.requester && t.requester.email) || '',
        created: SupportDesk.ago(t.created), assignee: t.assignee || '',
        tone: (SupportDesk.COLS.find(x => x.name === t.status) || {}).tone || 'new'
      } : null,
      supTimeline: timeline, supNoTimeline: timeline.length ? undefined : '1',
      supStatusOpts: SupportDesk.COLS.map(x => ({ v: x.name })),
      supStatusVal: t ? t.status : '',
      supStatusFn: ev => { const v = ev && ev.target && ev.target.value; if (t && v) D.setStatus(t.id, v); },
      supAssignOpts: [{ v: '', label: 'Unassigned' }].concat(this.staffList.map(v => ({ v, label: v }))),
      supAssignVal: t ? (t.assignee || '') : '',
      supAssignFn: ev => { const v = ev && ev.target ? ev.target.value : ''; if (t) D.assign(t.id, v); },
      supCanClose: (!this.staff && isMine && t && t.status !== 'Done') ? '1' : undefined,
      supCanReopen: (!this.staff && isMine && t && t.status === 'Done') ? '1' : undefined,
      supCloseTicket: () => t && D.setStatus(t.id, 'Done'),
      supReopenTicket: () => t && D.setStatus(t.id, 'New'),
      supSendFn: () => D.sendComment(),
      supDetailClose: () => D.closeDetail(),
      // notifications
      supBellOn: this.bell ? '1' : undefined,
      supBellFn: () => { D.bell = !D.bell; D.host(); },
      supBellList: unseen.map(u => ({ id: u.id, title: u.title, line: D.lastLine(u), when: SupportDesk.ago(u.lastAt),
        go: () => { D.bell = false; D.select(u.id); } })),
      supBellEmpty: unseen.length ? undefined : '1',
      supMarkAllFn: () => D.markAll(),
      supNotifAsk: (typeof Notification !== 'undefined' && Notification.permission === 'default') ? '1' : undefined,
      supNotifFn: () => D.askNotify(),
      supNotifOn: (typeof Notification !== 'undefined' && Notification.permission === 'granted') ? '1' : undefined
    };
  }
}
