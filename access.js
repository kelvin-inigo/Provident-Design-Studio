/* access.js — who may use the Campaign Ads Studio, and what each of them sees (2026-10-30).
 *
 * The sign-in screen, the role gate and the admin panel. Both studios; loaded in <head> after
 * share-link.js. The decisions live on the server (api/share.py, op=acc*): the page sends its
 * Google access token and the server asks Google whose it is, then answers with that person's
 * role. Nothing here is trusted for identity. Roles:
 *
 *   admin     the one person named by ACCESS_ADMIN in the deployment: everything, plus Access
 *   designer  the whole studio
 *   pm        performance marketing: Home's campaign setup (File as ticket only) and Status
 *
 * OFF unless the server says it is on (ACCESS_ADMIN set). A review link (#share=) opens without
 * signing in, because the link is already its own key. A file opened from the disk with no way
 * to reach the server opens as before; the website with no answer fails CLOSED.
 *
 * Everything drawn here is plain DOM outside React: the gate (#acx), the account chip in the
 * Home sidebar (.acx-me), the preview bar (.acx-bar) and the admin panel, which fills the empty
 * [data-acc-admin] host the shell renders for the Access view.
 */
(function () {
  'use strict';
  // BOTH STUDIOS since OPS's posts (2026-10-30). Each studio decides what a role sees in it.
  const CAS = /Campaign Studio/.test(decodeURIComponent(location.pathname));
  if (!CAS && !/Organic Studio/.test(decodeURIComponent(location.pathname))) return;

  // The content team is two roles, one per language: cten approves English copy, ctar the
  // Arabic translation. Both read as 'ct' everywhere else (role() below); 'ct' itself is the
  // older role and approves either.
  const ROLE = { admin: 'Admin', designer: 'Designer', pm: 'Performance marketing', smm: 'Social media manager', ct: 'Content team',
                 cten: 'Content team · English', ctar: 'Content team · Arabic' };
  const SEGL = { designer: 'Designer', smm: 'Social media', cten: 'Copy · English', ctar: 'Copy · Arabic', ct: 'Content team', pm: 'Performance' };
  const ROLE_SUB = {
    designer: 'Both studios: design, export, Status',
    pm: 'Set up campaigns as tickets, and follow them on Status',
    smm: 'Draft organic posts in OPS and send them to a designer',
    ct: 'Check the copy of posts, and of campaigns through their links',
    cten: 'Check the English copy of posts and campaigns',
    ctar: 'Check the Arabic translation of campaigns'
  };
  const ROLES = ['designer', 'smm', 'cten', 'ctar', 'pm'];
  const WANT = { designer: ['Design', 'Designer'], smm: ['Draft organic posts', 'Social media manager'], cten: ['Check English copy', 'Content team · English'],
                 ctar: ['Check Arabic copy', 'Content team · Arabic'], ct: ['Check copy', 'Content team'], pm: ['File campaigns', 'Performance marketing'] };
  const roleWord = r => ({ pm: 'performance marketing', designer: 'a designer', smm: 'a social media manager', ct: 'the content team',
                           cten: 'the content team (English)', ctar: 'the content team (Arabic)' }[r] || r);
  const LS_VIEWAS = 'provident-acc-viewas', LS_LINK = 'provident-acc-link';
  const ss = { get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
               set: (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const D = () => window.providentDrive;
  const base = () => (window.StudioBase && StudioBase.shareBase ? StudioBase.shareBase() : '') + '/api/share?op=';
  const initials = (n, e) => { const w = String(n || '').trim().split(/\s+/).filter(Boolean); return ((w.length ? (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : '')) : String(e || '?')[0]) || '?').toUpperCase(); };
  const when = t => {
    if (!t) return '';
    const d = new Date(t), now = new Date(), m = Math.round((now - d) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return 'today, ' + time;
    const y = new Date(now); y.setDate(now.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'yesterday, ' + time;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ' + time;
  };

  // ── icons: Material Symbols Rounded, wght 300 (the studio's family) ─────────────────────
  const P = {
    logout: 'M212.31-140Q182-140 161-161q-21-21-21-51.31v-535.38Q140-778 161-799q21-21 51.31-21h238.08q12.76 0 21.38 8.62 8.61 8.61 8.61 21.38t-8.61 21.38q-8.62 8.62-21.38 8.62H212.31q-4.62 0-8.46 3.85-3.85 3.84-3.85 8.46v535.38q0 4.62 3.85 8.46 3.84 3.85 8.46 3.85h238.08q12.76 0 21.38 8.62 8.61 8.61 8.61 21.38t-8.61 21.38q-8.62 8.62-21.38 8.62H212.31Zm492.38-310H393.85q-12.77 0-21.39-8.62-8.61-8.61-8.61-21.38t8.61-21.38q8.62-8.62 21.39-8.62h310.84l-76.92-76.92q-8.31-8.31-8.5-20.27-.19-11.96 8.5-21.27 8.69-9.31 21.08-9.62 12.38-.3 21.69 9l123.77 123.77q10.84 10.85 10.84 25.31 0 14.46-10.84 25.31L670.54-310.23q-8.92 8.92-21.19 8.81-12.27-.12-21.58-9.43-8.69-9.3-8.38-21.38.3-12.08 9-20.77l76.3-77Z',
    check: 'm382-354 339.38-339.38q8.93-8.93 21.2-9.12 12.27-.19 21.58 9.12 9.3 9.3 9.3 21.38 0 12.08-9.3 21.39L407.31-294.15q-10.85 10.84-25.31 10.84-14.46 0-25.31-10.84L195.85-455q-8.93-8.92-8.81-21.19.11-12.27 9.42-21.58 9.31-9.31 21.39-9.31 12.07 0 21.38 9.31L382-354Z',
    eye: 'M480.09-336.92q62.76 0 106.79-43.93 44.04-43.92 44.04-106.68 0-62.76-43.93-106.8-43.92-44.03-106.68-44.03-62.77 0-106.8 43.92-44.03 43.93-44.03 106.69 0 62.76 43.92 106.79 43.93 44.04 106.69 44.04ZM480-392q-38 0-64.5-26.5T389-483q0-38 26.5-64.5T480-574q38 0 64.5 26.5T571-483q0 38-26.5 64.5T480-392Zm.11 172q-129.96 0-237.38-71.08-107.42-71.07-164.27-189.38-3-5.39-4.5-11.06-1.5-5.67-1.5-11.99 0-6.33 1.5-12 1.5-5.67 4.5-11.06 56.85-118.31 164.16-189.38 107.3-71.07 237.27-71.07 129.96 0 237.38 71.07 107.42 71.07 164.27 189.38 3 5.39 4.5 11.06 1.5 5.67 1.5 12 0 6.32-1.5 11.99t-4.5 11.06q-56.85 118.31-164.16 189.38Q610.08-220 480.11-220Z',
    back: 'M376.23-450 590.85-235.38q8.92 8.92 8.8 21.19-.11 12.27-9.42 21.58-9.31 8.69-21.38 9-12.08.3-21.39-9L328.23-411.85q-5.61-5.61-7.92-11.84-2.31-6.23-2.31-13.46t2.31-13.46q2.31-6.24 7.92-11.85l219.23-219.23q8.3-8.31 20.88-8.5 12.58-.19 21.89 8.5 9.31 9.31 9.31 21.69 0 12.38-9.31 21.69L376.23-450Z',
    person: 'M480-492.31q-57.75 0-98.87-41.12Q340-574.56 340-632.31q0-57.75 41.13-98.87 41.12-41.13 98.87-41.13 57.75 0 98.87 41.13Q620-690.06 620-632.31q0 57.75-41.13 98.88-41.12 41.12-98.87 41.12ZM180-247.69v-28.16q0-29.38 15.96-54.42 15.96-25.04 42.66-38.5 59.3-29.07 119.65-43.61 60.35-14.54 121.73-14.54t121.73 14.54q60.35 14.54 119.65 43.61 26.7 13.46 42.66 38.5Q780-305.23 780-275.85v28.16q0 25.3-17.73 43.04-17.73 17.73-43.04 17.73H240.77q-25.31 0-43.04-17.73Q180-222.39 180-247.69Z',
    shield: 'M480-114.23q-6.46 0-12.69-1-6.23-1-12.08-3Q320-163.08 240-286.35q-80-123.27-80-266.11v-181.46q0-22.82 13.13-41.04 13.14-18.21 33.95-26.27l227.69-85q12.84-4.62 25.23-4.62 12.39 0 25.23 4.62l227.69 85q20.81 8.06 33.95 26.27Q800-756.74 800-733.92v181.46q0 142.84-80 266.11-80 123.27-214.31 168.12-5.85 2-12.08 3-6.23 1-12.69 1Z',
    send: 'M792.15-449.08 175.38-189.39q-18.07 7.23-33.73-3.11Q126-202.85 126-221.92v-516.16q0-19.07 15.65-29.42 15.66-10.34 33.73-3.11l616.77 259.69q22.31 9.85 22.31 30.92 0 21.08-22.31 30.92ZM186-264l474-196-474-196v139.23L428.31-480 186-420.77V-264Zm0 0v-392 392Z',
    refresh: 'M480-160q-133.85 0-226.92-93.08Q160-346.15 160-480t93.08-226.92Q346.15-800 480-800q71.69 0 133.85 29.31 62.15 29.31 106.15 82.38V-770q0-12.77 8.62-21.38Q737.23-800 750-800t21.38 8.62Q780-782.77 780-770v192.31q0 15.36-10.39 25.75-10.4 10.4-25.76 10.4H551.54q-12.77 0-21.39-8.61-8.61-8.62-8.61-21.39 0-12.77 8.61-21.38 8.62-8.62 21.39-8.62h137.69q-35.08-57.08-91.96-90.77Q540.38-740 480-740q-108.33 0-184.17 75.79Q220-588.42 220-480.13q0 108.28 75.83 184.21Q371.67-220 480-220q73.38 0 135.65-38.08 62.27-38.07 95.66-102.38 6.23-10.92 17.73-15.73 11.5-4.81 23.04-.73 12.3 4.07 17.11 15.8 4.81 11.74-1.42 22.27-40.69 79.31-115.61 128.08Q577.23-160 480-160Z'
  };
  const ic = (k, cls) => '<svg class="acx-i' + (cls ? ' ' + cls : '') + '" viewBox="0 -960 960 960" aria-hidden="true"><path d="' + P[k] + '"/></svg>';
  const GOOGLE_G = '<svg class="acx-g" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

  // ── state ────────────────────────────────────────────────────────────────────────────────
  const A = {
    on: null,          // the server's answer: is sign-in switched on here
    me: null,          // { email, name, role, status, admin, note, want, first, last }
    phase: 'check',    // check | signin | busy | pending | declined | outside | error | in
    err: '', domain: 'providentestate.com',
    host: null, list: null, listErr: '', tab: 'req', listBusy: false, noteSent: false
  };
  const viewAs = () => (A.me && A.me.admin ? ss.get(LS_VIEWAS) : null);
  const rawRole = () => (A.phase === 'in' && A.me ? (viewAs() || A.me.role) : null);
  const fam = r => (r === 'cten' || r === 'ctar' ? 'ct' : r);
  const role = () => fam(rawRole());
  // which copy this person approves: 'en', 'ar', or null (either). A review link's tab is never
  // gated, so there the account is looked up quietly (A.quiet) when Google is already signed in.
  const copyLang = () => { const r = rawRole() || (A.quiet && A.quiet.status === 'active' ? A.quiet.role : null);
    return r === 'cten' ? 'en' : r === 'ctar' ? 'ar' : null; };
  // LIMITED in this studio: CAS is the designer's (and the admin's); performance marketing, the
  // social media manager and the content team get Home's setup and Status there. OPS is open to
  // all but performance marketing, which gets OPS's Status only.
  const lim = () => { const r = role(); return !!r && (CAS ? ['pm', 'smm', 'ct'].indexOf(r) >= 0 : r === 'pm'); };

  // A review link (#share=) is its own key: it opens without signing in, and so does every
  // reload in the tab it opened.
  const viaLink = () => /(^|[#&])share=/.test(location.hash) || ss.get(LS_LINK) === '1';
  if (/(^|[#&])share=/.test(location.hash)) ss.set(LS_LINK, '1');
  const gated = () => !viaLink();

  // Hide the studio before it paints; the gate takes over once the body exists.
  if (gated()) document.documentElement.classList.add('acx-hold');

  // ── the server ───────────────────────────────────────────────────────────────────────────
  async function post(op, body) {
    const d = D(); const tok = d && d.tok && d.tok.at;
    const r = await fetch(base() + op, { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ tok }, body || {})) });
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok) { const e = new Error(j.error || 'The access check answered HTTP ' + r.status + '.'); e.code = r.status; throw e; }
    return j;
  }
  async function status() {
    try {
      const r = await fetch(base() + 'accstatus', { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json(); if (j.domain) A.domain = j.domain;
      return !!j.on;
    } catch (e) {
      // off the website (a file from the disk, Design Cursor) the studio opens as it always has;
      // on the website, no answer is a closed door, never an open one
      return /^https?:$/.test(location.protocol) ? 'down' : false;
    }
  }

  // Ask the server who this is. tryQuiet: no click available, so never open a popup.
  async function check(tryQuiet) {
    const d = D();
    if (tryQuiet) {
      if (!d || !(await d.ensure())) { A.phase = 'signin'; return draw(); }
    }
    try {
      const me = await post('accme');
      A.me = me; A.err = '';
      A.phase = me.status === 'active' ? 'in' : (me.status === 'pending' ? 'pending' : 'declined');
    } catch (e) {
      if (e.code === 403 && /account/.test(e.message)) { A.phase = 'outside'; A.err = e.message; }
      else if (e.code === 401) { try { d && d.drop(); } catch (x) {} A.phase = 'signin'; A.err = tryQuiet ? '' : e.message; }
      else { A.phase = 'error'; A.err = e.message; }
    }
    draw();
  }

  async function signIn(another) {
    const d = D(); if (!d) return;
    if (another) { try { d.signOut(); } catch (e) {} }
    A.phase = 'busy'; A.err = ''; draw();
    try { await d.signIn(); await check(false); }
    catch (e) { A.phase = 'signin'; A.err = e.message || String(e); draw(); }
  }

  function signOut() {
    try { D() && D().signOut(); } catch (e) {}
    ss.set(LS_VIEWAS, null);
    A.me = null; A.phase = 'signin'; A.err = ''; A.list = null;
    document.documentElement.classList.add('acx-hold');
    apply(); draw();
  }

  // ── what each role sees ──────────────────────────────────────────────────────────────────
  // CSS hides the controls (below); a capture-phase click guard and the shell's view check
  // (window.providentAccess.now) refuse them too, so a hidden button cannot be pressed by
  // other means. The server still holds the data rules: Drive sharing, the review links.
  const PM_BLOCK = ['pick', 'proj', 'startcell', 'addopen', 'addproj', 'addx', 'approve', 'relab', 'relabsave', 'rmproj', 'delset', 'overview'];
  function apply() {
    const h = document.documentElement, r = role();
    if (r) h.setAttribute('data-acc-role', r); else h.removeAttribute('data-acc-role');
    h.toggleAttribute('data-acc-lim', lim());
    const cl = copyLang(); if (cl) h.setAttribute('data-acc-copy', cl); else h.removeAttribute('data-acc-copy');
    h.toggleAttribute('data-acc-isadmin', !!(A.me && A.me.admin && A.phase === 'in'));
    h.toggleAttribute('data-acc-preview', !!viewAs());
    if (A.phase === 'in' || !gated() || A.on === false) h.classList.remove('acx-hold');
    const sh = A.host;
    if (sh) {
      // performance marketing never reaches the editor: back to Home
      const e = sh.eng;
      if (lim() && e && e.state && e.state.screen && e.state.screen !== 'splash') { try { e.upd(x => { x.screen = 'splash'; return x; }); } catch (x) {} }
      try { sh.forceUpdate(); } catch (x) {}
    }
    bar(); chip();
  }
  document.addEventListener('click', e => {
    if (!lim() || !CAS) return;
    const t = e.target && e.target.closest && e.target.closest('[data-a],.rsp-go,.p-sbf button,.rc-c');
    if (!t) return;
    if (t.matches('.rsp-go,.p-sbf button,.rc-c') || PM_BLOCK.indexOf(t.dataset.a) >= 0) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  // ── the gate ─────────────────────────────────────────────────────────────────────────────
  let gate = null;
  function lockup() {
    const src = document.querySelector('.p-wm-a');
    return src ? '<span class="p-wm acx-wm">' + src.outerHTML + '</span>' : '<span class="acx-wm-t">provident<b>.</b> <span>Design Studio</span></span>';
  }
  function steps(cur) {
    const L = [['Signed in', 'with Google'], ['The admin reviews it', 'usually the same day'], ['You’re in', 'this page opens by itself']];
    return '<ol class="acx-steps">' + L.map((s, i) => '<li data-s="' + (i < cur ? 'done' : i === cur ? 'cur' : 'next') + '"><span class="acx-dot">' + (i < cur ? ic('check') : '') + '</span><span><b>' + s[0] + '</b><small>' + s[1] + '</small></span></li>').join('') + '</ol>';
  }
  function body() {
    const d = D(), w = d && d.who ? d.who() : null, me = A.me;
    const acct = x => x ? '<div class="acx-acct"><span class="acx-av">' + esc(initials(x.name, x.email)) + '</span><span><b>' + esc(x.name || x.email) + '</b><small>' + esc(x.email) + '</small></span></div>' : '';
    const errLine = A.err ? '<p class="acx-err" role="alert">' + esc(A.err) + '</p>' : '';
    const other = '<button type="button" class="acx-link" data-x="other">Use another account</button>';
    switch (A.phase) {
      case 'check': return '<h1>Checking your access</h1><p class="acx-lede">One moment.</p><div class="acx-skel"><i></i><i></i></div>';
      case 'busy': return '<h1>Signing you in</h1><p class="acx-lede">Finish in the Google window, then come back here.</p><div class="acx-skel"><i></i><i></i></div>';
      case 'signin': return '<h1>Sign in to the studio</h1><p class="acx-lede">Use your Provident Google account. What opens depends on what the admin has given you.</p>' +
        '<button type="button" class="acx-go" data-x="in">' + GOOGLE_G + '<span>' + (w ? 'Continue as ' + esc((w.name || w.email).split(' ')[0]) : 'Continue with Google') + '</span></button>' +
        (w ? '<p class="acx-as">' + esc(w.email) + ' · ' + other + '</p>' : '') + errLine +
        '<p class="acx-foot">Only @' + esc(A.domain) + ' accounts. First time here? Sign in and the admin is asked to let you in.</p>';
      case 'pending': return '<h1>Waiting for access</h1><p class="acx-lede">Your request is with the admin. You don’t need to do anything else — this page lets you in as soon as it’s approved.</p>' +
        acct(me) + steps(1) +
        '<form class="acx-note" data-x="note"><label for="acx-n">Add a note for the admin <small>Optional</small></label>' +
        '<textarea id="acx-n" rows="3" maxlength="400" placeholder="Who you are and what you need it for">' + esc(me.note || '') + '</textarea>' +
        '<fieldset><legend>I need to</legend>' + ROLES.map(k => '<label class="acx-want"><input type="radio" name="want" value="' + k + '"' + (me.want === k ? ' checked' : '') + '><span><b>' + WANT[k][0] + '</b><small>' + WANT[k][1] + '</small></span></label>').join('') + '</fieldset>' +
        '<div class="acx-row"><button type="submit" class="acx-btn">' + ic('send') + (A.noteSent ? 'Sent' : 'Send to the admin') + '</button><button type="button" class="acx-ghost" data-x="again">' + ic('refresh') + 'Check again</button></div></form>' +
        errLine + '<p class="acx-foot">' + other + '</p>';
      case 'declined': return '<h1>' + (me.status === 'revoked' ? 'Your access was removed' : 'Your request was declined') + '</h1>' +
        '<p class="acx-lede">The admin ' + (me.status === 'revoked' ? 'took this account off the studio' : 'didn’t let this account in') + (me.at ? ' ' + esc(when(me.at)) : '') + '. If that’s a mistake, ask again with a note.</p>' + acct(me) +
        '<form class="acx-note" data-x="ask"><label for="acx-n">A note for the admin</label><textarea id="acx-n" rows="3" maxlength="400" placeholder="Why you need it"></textarea>' +
        '<div class="acx-row"><button type="submit" class="acx-btn">' + ic('send') + 'Ask again</button></div></form>' + errLine + '<p class="acx-foot">' + other + '</p>';
      case 'outside': return '<h1>That’s not a Provident account</h1><p class="acx-lede">' + esc(A.err) + '</p>' +
        '<button type="button" class="acx-go" data-x="other">' + GOOGLE_G + '<span>Choose another account</span></button>';
      case 'error': return '<h1>Can’t check your access</h1><p class="acx-lede">' + esc(A.err || 'The studio could not reach its access check.') + '</p>' +
        '<div class="acx-row"><button type="button" class="acx-btn" data-x="retry">' + ic('refresh') + 'Try again</button></div><p class="acx-foot">' + other + '</p>';
    }
    return '';
  }
  function draw() {
    apply();
    if (A.phase === 'in' || !gated() || A.on === false) { if (gate) { gate.remove(); gate = null; } return; }
    if (!document.body) return;
    if (!gate) {
      gate = document.createElement('div');
      gate.id = 'acx'; gate.setAttribute('role', 'dialog'); gate.setAttribute('aria-modal', 'true'); gate.setAttribute('aria-labelledby', 'acx-h');
      gate.innerHTML = '<main class="acx-l"><header class="acx-top"></header><section class="acx-b" aria-live="polite"></section></main>' +
        '<aside class="acx-r" aria-hidden="true"><div class="acx-fig"></div><p class="acx-cap">' + (CAS ? '<b>Campaign Ads Studio</b><span>Meta ads in every size, on brand, from one design.</span>' : '<b>Organic Post Studio</b><span>Feed and story posts, drafted, designed and checked in one place.</span>') + '</p></aside>';
      document.body.appendChild(gate);
      gate.addEventListener('click', onGate);
      gate.addEventListener('submit', onSubmit);
      const H = window.providentHairline, f = gate.querySelector('.acx-fig');
      const fig = CAS ? H && H.elevator : H && (H.turntable || H.elevator);
      if (fig && f) { try { gate._fig = fig(f, { play: true, intensity: .7 }); } catch (e) {} }
      const lk = () => { const t = gate && gate.querySelector('.acx-top'); if (t) t.innerHTML = lockup(); };
      lk(); if (!document.querySelector('.p-wm-a')) setTimeout(lk, 600);
    }
    const b = gate.querySelector('.acx-b');
    const keep = document.activeElement && b.contains(document.activeElement) && document.activeElement.id === 'acx-n' ? document.activeElement.value : null;
    b.setAttribute('data-p', A.phase);
    b.innerHTML = body();
    const h1 = b.querySelector('h1'); if (h1) h1.id = 'acx-h';
    if (keep != null) { const n = b.querySelector('#acx-n'); if (n) { n.value = keep; n.focus(); } }
    else { const f = b.querySelector('.acx-go,.acx-btn'); if (f && A.phase !== 'pending') f.focus({ preventScroll: true }); }
  }
  function onGate(e) {
    const t = e.target.closest('[data-x]'); if (!t || t.tagName === 'FORM') return;
    const x = t.dataset.x;
    if (x === 'in') signIn(false);
    else if (x === 'other') signIn(true);
    else if (x === 'again' || x === 'retry') { A.phase = 'check'; draw(); boot(); }
  }
  async function onSubmit(e) {
    e.preventDefault();
    const f = e.target, x = f.dataset.x, note = (f.querySelector('#acx-n') || {}).value || '';
    const want = (f.querySelector('input[name=want]:checked') || {}).value || null;
    const btn = f.querySelector('button[type=submit]'); if (btn) btn.disabled = true;
    try {
      A.me = await post('accreq', { note, want, again: x === 'ask' });
      A.phase = 'pending'; A.noteSent = true; A.err = '';
    } catch (er) { A.err = er.message; }
    draw();
  }

  // ── the preview bar: an admin looking at the studio as someone else ──────────────────────
  function bar() {
    let b = document.querySelector('.acx-bar'); const va = viewAs();
    if (!va) { if (b) b.remove(); return; }
    if (!document.body) return;
    if (!b) { b = document.createElement('div'); b.className = 'acx-bar'; b.setAttribute('role', 'status'); document.body.appendChild(b); b.addEventListener('click', ev => { if (ev.target.closest('button')) preview(null); }); }
    b.innerHTML = ic('eye') + '<span>Previewing as <b>' + esc(ROLE[va]) + '</b></span><button type="button">' + ic('back') + 'Back to Access</button>';
  }
  function preview(r) {
    ss.set(LS_VIEWAS, r);
    const sh = A.host;
    if (sh) { try { sh.setState({ splashView: r ? (!CAS && r === 'pm' ? 'rev' : 'all') : (CAS ? 'acc' : 'all') }); } catch (e) {} }
    apply();
  }

  // ── the account chip at the foot of the Home sidebar ─────────────────────────────────────
  function chip() {
    const sb = document.querySelector('.p-br-sb');
    let c = sb && sb.querySelector('.acx-me');
    if (!sb || A.phase !== 'in' || !A.me || !gated() || A.on === false) { if (c) c.remove(); return; }
    if (!c) {
      c = document.createElement('div'); c.className = 'acx-me';
      c.addEventListener('click', e => { if (e.target.closest('[data-x=out]')) signOut(); });
    }
    if (c.parentNode !== sb || sb.lastElementChild !== c) sb.appendChild(c);
    const html = '<span class="acx-av">' + esc(initials(A.me.name, A.me.email)) + '</span><span class="acx-me-t" title="' + esc((A.me.name ? A.me.name + ' · ' : '') + A.me.email + ' · ' + (ROLE[A.me.role] || '')) + '"><b>' + esc(A.me.name || A.me.email) + '</b><small>' + esc(ROLE[A.me.role] || '') + '</small></span>' +
      '<button type="button" class="acx-me-out" data-x="out" title="Sign out of ' + esc(A.me.email) + '" aria-label="Sign out">' + ic('logout') + '</button>';
    if (c._h !== html) { c.innerHTML = html; c._h = html; }
  }

  // ── the admin panel (the Access view) ────────────────────────────────────────────────────
  async function loadList(quiet) {
    if (A.listBusy) return; A.listBusy = true;
    try { A.list = await post('acclist'); A.listErr = ''; }
    catch (e) { A.listErr = e.message; }
    A.listBusy = false;
    if (A.host) { try { A.host.forceUpdate(); } catch (e) {} }
    drawAdmin(true);
  }
  const reqs = () => ((A.list && A.list.users) || []).filter(u => u.status === 'pending');
  const people = () => ((A.list && A.list.users) || []).filter(u => u.status !== 'pending');
  // THE ROLE IS A DROPDOWN (2026-10-30, by request): five roles side by side ran wider than the
  // table. One select per person; each option's tooltip says what that role can do.
  function seg(name, val, sel) {
    return '<span class="ac-dd"><select class="ac-sel" aria-label="Role" data-k="' + name + '" data-e="' + esc(val) + '" title="' + esc(ROLE_SUB[sel] || '') + '">' +
      ROLES.map(k => '<option value="' + k + '"' + (sel === k ? ' selected' : '') + ' title="' + esc(ROLE_SUB[k]) + '">' + esc(ROLE[k]) + '</option>').join('') +
      (sel && ROLES.indexOf(sel) < 0 ? '<option value="' + esc(sel) + '" selected>' + esc(ROLE[sel] || sel) + '</option>' : '') +
      '</select></span>';
  }
  const LOGW = {
    request: e => 'tried to sign in for the first time',
    retry: e => 'tried to sign in again (' + ({ pending: 'still waiting', declined: 'declined', revoked: 'access removed' }[e.status] || e.status) + ')',
    note: e => 'sent a note' + (e.want ? ', asking to be ' + roleWord(e.want) : ''),
    outside: e => 'tried to sign in with an account outside Provident',
    grant: e => 'was let in as ' + (ROLE[e.role] || e.role),
    add: e => 'was added as ' + (ROLE[e.role] || e.role),
    role: e => 'became ' + (ROLE[e.role] || e.role),
    decline: e => 'was declined',
    revoke: e => 'lost access',
    remove: e => 'was taken off the list'
  };
  const LOGK = { request: 'ask', retry: 'ask', note: 'ask', outside: 'bad', grant: 'good', add: 'good', role: 'good', decline: 'bad', revoke: 'bad', remove: 'bad' };
  function adminHtml() {
    if (!A.list) return A.listErr ? '<div class="ac-empty"><b>Couldn’t load who has access</b><span>' + esc(A.listErr) + '</span><button type="button" class="acx-btn" data-ac="reload">' + ic('refresh') + 'Try again</button></div>'
      : '<div class="ac-load"><i></i><i></i><i></i></div>';
    const R = reqs(), Pp = people(), L = A.list.log || [];
    const tabs = [['req', 'Requests', R.length], ['ppl', 'People', Pp.length + 1], ['log', 'Activity', null]];
    let h = '<div class="ac-top"><div class="ac-tabs" role="tablist">' + tabs.map(([k, l, n]) =>
      '<button type="button" role="tab" aria-selected="' + (A.tab === k) + '" data-ac="tab" data-v="' + k + '"' + (A.tab === k ? ' data-on' : '') + '>' + l + (n != null ? '<s' + (k === 'req' && n ? ' data-hot' : '') + '>' + n + '</s>' : '') + '</button>').join('') + '</div>' +
      '<div class="ac-pv"><label for="ac-pvs">Preview the studio as</label><span class="ac-dd ac-dd-eye">' + ic('eye') +
        '<select id="ac-pvs" class="ac-sel" data-pv="1" title="Opens the studio as that role would see it, until you end the preview"><option value="" selected disabled>Choose a role</option>' +
        ['designer', 'smm', 'cten', 'ctar', 'pm'].map(k => '<option value="' + k + '" title="' + esc(ROLE_SUB[k]) + '">' + esc(ROLE[k]) + '</option>').join('') + '</select></span></div></div>';
    if (A.listErr) h += '<p class="acx-err" role="alert">' + esc(A.listErr) + '</p>';
    if (A.tab === 'req') {
      if (!R.length) h += '<div class="ac-empty">' + ic('shield') + '<b>No one is waiting</b><span>When someone signs in for the first time they show up here, with any note they leave, for you to let in or decline.</span></div>';
      else h += '<ul class="ac-reqs">' + R.map(u => {
        const sel = (A.pick && A.pick[u.email]) || u.want || 'pm';
        return '<li class="ac-req"><span class="acx-av">' + esc(initials(u.name, u.email)) + '</span>' +
          '<div class="ac-who"><b>' + esc(u.name || u.email) + '</b><small>' + esc(u.email) + '</small>' +
          '<span class="ac-meta">Tried ' + (u.n > 1 ? u.n + ' times · first ' + esc(when(u.first)) + ' · last ' : '') + esc(when(u.last)) + (u.want ? ' · asks to be ' + roleWord(u.want) : '') + '</span>' +
          (u.note ? '<q class="ac-q">' + esc(u.note) + '</q>' : '') + '</div>' +
          '<div class="ac-act"><span class="ac-lbl">Let in as</span>' + seg('pick', u.email, sel) +
          '<div class="ac-btns"><button type="button" class="acx-btn" data-ac="grant" data-e="' + esc(u.email) + '">' + ic('check') + 'Let in</button><button type="button" class="acx-ghost ac-no" data-ac="decline" data-e="' + esc(u.email) + '">Decline</button></div></div></li>';
      }).join('') + '</ul>';
    } else if (A.tab === 'ppl') {
      const adm = A.list.admin;
      h += '<form class="ac-add" data-ac="add"><label for="ac-em">Add someone</label><input id="ac-em" type="email" required placeholder="name@' + esc(A.list.domain || A.domain) + '" autocomplete="off">' +
        seg('add', '', A.addRole || 'pm') + '<button type="submit" class="acx-btn">Add</button></form>' +
        '<table class="ac-t"><thead><tr><th>Person</th><th>Role</th><th>Last signed in</th><th><span class="ac-sr">Actions</span></th></tr></thead><tbody>' +
        '<tr data-st="active"><td><div class="ac-p"><span class="acx-av">' + esc(initials(A.me.name, adm)) + '</span><span><b>' + esc(A.me.name || adm) + '</b><small>' + esc(adm) + '</small></span></div></td><td><span class="ac-role">Admin · you</span></td><td>now</td><td></td></tr>' +
        Pp.map(u => {
          const act = u.status === 'active';
          return '<tr data-st="' + esc(u.status) + '"><td><div class="ac-p"><span class="acx-av">' + esc(initials(u.name, u.email)) + '</span><span><b>' + esc(u.name || u.email) + '</b><small>' + esc(u.email) + '</small></span></div></td>' +
            '<td>' + (act ? seg('role', u.email, u.role) : '<span class="ac-st">' + esc({ declined: 'Declined', revoked: 'Access removed' }[u.status] || u.status) + '</span>') + '</td>' +
            '<td class="ac-num">' + (u.last ? esc(when(u.last)) : '<span class="ac-dim">not yet</span>') + '</td>' +
            '<td class="ac-end">' + (act ? '<button type="button" class="acx-ghost ac-no" data-ac="revoke" data-e="' + esc(u.email) + '">Remove access</button>'
              : '<button type="button" class="acx-ghost" data-ac="restore" data-e="' + esc(u.email) + '" data-r="' + esc(u.role || 'pm') + '">Let in</button><button type="button" class="acx-link" data-ac="remove" data-e="' + esc(u.email) + '">Forget</button>') + '</td></tr>';
        }).join('') + '</tbody></table>';
    } else {
      if (!L.length) h += '<div class="ac-empty"><b>Nothing yet</b><span>Every sign-in attempt and every decision is listed here.</span></div>';
      else {
        let day = '';
        h += '<ol class="ac-log">' + L.map(e => {
          const d = new Date(e.at), dk = d.toDateString();
          const head = dk !== day ? '<li class="ac-day">' + esc((w => w.charAt(0).toUpperCase() + w.slice(1))(when(e.at).replace(/, .*$/, '').replace(/^(just now|\d+ min ago)$/, 'today'))) + '</li>' : '';
          day = dk;
          return head + '<li class="ac-ev" data-k="' + (LOGK[e.what] || 'ask') + '"><span class="ac-evd"></span><span class="ac-evt"><b>' + esc(e.name || e.email) + '</b> ' + esc((LOGW[e.what] || (() => e.what))(e)) +
            (e.by ? ' <span class="ac-dim">by ' + esc(e.by === A.list.admin ? 'you' : e.by) + '</span>' : '') + '<small>' + esc(e.email) + '</small></span><time>' + esc(d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })) + '</time></li>';
        }).join('') + '</ol>';
      }
    }
    return h;
  }
  function drawAdmin(force) {
    const host = document.querySelector('div[data-acc-admin]');
    if (!host) return;
    if (!A.me || !A.me.admin) { host.innerHTML = ''; return; }
    let root = host.querySelector('.ac');
    if (!root) { root = document.createElement('div'); root.className = 'ac'; host.appendChild(root); root.addEventListener('click', onAdmin); root.addEventListener('submit', onAdmin); root.addEventListener('change', e => { if (e.target.matches('select[data-k]')) onAdmin(e); else if (e.target.matches('select[data-pv]') && e.target.value) { const v = e.target.value; e.target.value = ''; preview(v); } }); force = true; if (!A.list) loadList(); }
    if (!force) return;
    const ae = document.activeElement, keepEm = ae && ae.id === 'ac-em' ? ae.value : null;
    root.innerHTML = adminHtml();
    if (keepEm != null) { const i = root.querySelector('#ac-em'); if (i) { i.value = keepEm; i.focus(); } }
  }
  async function change(email, action, rl, btn) {
    if (btn) btn.disabled = true;
    try { await post('accset', { email, action, role: rl }); A.listErr = ''; }
    catch (e) { A.listErr = e.message; }
    await loadList();
  }
  function onAdmin(e) {
    const t = e.type === 'submit' ? e.target : e.target.closest('[data-ac],[data-k]');
    if (!t) return;
    if (e.type === 'submit') e.preventDefault();
    if (t.dataset.k) {   // a role dropdown: it acts on change, never on the click that opens it
      if (t.tagName === 'SELECT' && e.type !== 'change') return;
      const em = t.dataset.e, v = t.tagName === 'SELECT' ? t.value : t.dataset.v;
      if (t.dataset.k === 'pick') { A.pick = Object.assign({}, A.pick, { [em]: v }); drawAdmin(true); }
      else if (t.dataset.k === 'add') { A.addRole = v; drawAdmin(true); }
      else if (t.dataset.k === 'role') change(em, 'role', v, t);
      return;
    }
    const a = t.dataset.ac, em = t.dataset.e;
    if (a === 'tab') { A.tab = t.dataset.v; drawAdmin(true); }
    else if (a === 'reload') loadList();
    else if (a === 'pv') preview(t.dataset.v);
    else if (a === 'grant') change(em, 'grant', (A.pick && A.pick[em]) || (reqs().find(u => u.email === em) || {}).want || 'pm', t);
    else if (a === 'decline') change(em, 'decline', null, t);
    else if (a === 'revoke' && confirm('Remove ' + em + '’s access? They are signed out of the studio the next time it checks, within five minutes.')) change(em, 'revoke', null, t);
    else if (a === 'restore') change(em, 'grant', t.dataset.r, t);
    else if (a === 'remove' && confirm('Forget ' + em + '? If they sign in again they show up as a new request.')) change(em, 'remove', null, t);
    else if (a === 'add') {
      const i = t.querySelector('#ac-em'), v = (i && i.value || '').trim();
      if (v) { change(v, 'add', A.addRole || 'pm', t.querySelector('button[type=submit]')); }
    }
  }

  // ── boot and keep checking ───────────────────────────────────────────────────────────────
  async function boot() {
    if (!gated()) {
      A.on = false; apply();
      // a review link: no gate, but learn quietly which copy this person approves
      try { const d = D(); if (d && d.valid && d.valid()) { A.quiet = await post('accme'); apply(); } } catch (e) {}
      return;
    }
    const on = await status();
    if (on === false) { A.on = false; draw(); return; }
    if (on === 'down') { A.on = true; A.phase = 'error'; A.err = 'The studio could not reach its access check. Check the connection and try again.'; draw(); return; }
    A.on = true;
    await check(true);
  }
  // pending: every 20s, so approval lets them in without a reload; in: every 5 min, so a removal
  // takes effect; the admin's lists refresh every 30s while the Access view is open
  let lastMe = Date.now();
  setInterval(() => {
    if (document.visibilityState !== 'visible' || !A.on || !gated()) return;
    const age = Date.now() - lastMe;
    if ((A.phase === 'pending' && age > 20000) || (A.phase === 'in' && age > 300000)) {
      lastMe = Date.now();
      const was = A.phase;
      (async () => { const d = D(); if (d && (await d.ensure())) { await check(false); if (was === 'pending' && A.phase === 'in') { try { A.host && A.host.forceUpdate(); } catch (e) {} } } })();
    }
  }, 5000);
  setInterval(() => {
    chip();
    if (A.me && A.me.admin && A.phase === 'in') {
      const host = document.querySelector('div[data-acc-admin]');
      if (host) { drawAdmin(false); if (document.visibilityState === 'visible' && Date.now() - (A._lt || 0) > 30000) { A._lt = Date.now(); loadList(); } }
    }
    if (lim()) apply();
  }, 500);

  window.addEventListener('provident-drive-signed', () => { if (A.phase === 'signin' && A.on) check(false); });

  // ── what the shell reads ─────────────────────────────────────────────────────────────────
  window.providentAccess = {
    // { role, admin, preview, pending } — role null while nobody is signed in or the gate is off
    now() {
      return { role: role(), copy: copyLang(), raw: rawRole(), lim: lim(), studio: CAS ? 'cas' : 'ops', admin: !!(A.me && A.me.admin && A.phase === 'in' && !viewAs()), preview: viewAs(),
               pending: A.list ? reqs().length : 0, gated: A.on === true && gated() };
    },
    attach(shell) { A.host = shell; apply(); },
    signOut
  };

  // ── styles ───────────────────────────────────────────────────────────────────────────────
  const css = `
html.acx-hold .p-shell{visibility:hidden}
#acx{position:fixed;inset:0;z-index:4000;display:grid;grid-template-columns:minmax(0,560px) minmax(0,1fr);background:var(--ps-app);color:var(--ps-ink);font-family:var(--ps-font);overflow:auto}
#acx .acx-l{display:flex;flex-direction:column;min-height:100vh;padding:40px clamp(28px,6vw,72px);box-sizing:border-box}
#acx .acx-top{height:24px;display:flex;align-items:center}
#acx .acx-wm .p-wm-a{height:20px;width:auto;display:block}
#acx .acx-wm-t{font:300 20px/1 var(--ps-font)}#acx .acx-wm-t b{color:var(--ps-brand);font-weight:300}#acx .acx-wm-t span{font-size:12px;border:1px solid var(--ps-line);border-radius:9999px;padding:3px 8px;margin-left:6px}
#acx .acx-b{margin:auto 0;padding:56px 0 40px;max-width:400px;width:100%}
#acx h1{font:500 32px/1.15 var(--ps-font);letter-spacing:-.01em;margin:0 0 12px;text-wrap:balance}
#acx .acx-lede{font:400 15.5px/1.55 var(--ps-font);color:var(--ps-ink-2);margin:0 0 32px;max-width:38ch}
#acx .acx-go{display:flex;align-items:center;justify-content:center;gap:12px;width:100%;height:52px;border-radius:9999px;border:0;cursor:pointer;
  background:var(--ps-primary);color:var(--ps-primary-i);font:600 15px/1 var(--ps-font);letter-spacing:.01em;transition:background-color var(--ps-motion) var(--ps-ease),transform var(--ps-motion) var(--ps-ease)}
#acx .acx-go:hover{background:var(--ps-primary-h)}#acx .acx-go:active{transform:translateY(1px)}
#acx .acx-g{width:20px;height:20px;padding:5px;border-radius:50%;background:#fff;flex:none}
#acx .acx-as{margin:14px 0 0;text-align:center;font:400 13px/1.4 var(--ps-font);color:var(--ps-dim)}
#acx .acx-foot{margin:28px 0 0;font:400 13px/1.5 var(--ps-font);color:var(--ps-dim);max-width:40ch}
#acx .acx-link,.ac .acx-link{background:none;border:0;padding:0;font:inherit;color:var(--ps-ink-2);text-decoration:underline;text-underline-offset:3px;cursor:pointer}
#acx .acx-link:hover,.ac .acx-link:hover{color:var(--ps-ink)}
#acx .acx-err,.ac .acx-err{margin:16px 0 0;padding:10px 14px;border-radius:10px;background:var(--ps-bad-q);color:var(--ps-ink);font:400 13.5px/1.45 var(--ps-font)}
#acx .acx-skel{display:grid;gap:10px}#acx .acx-skel i{display:block;height:52px;border-radius:9999px;background:var(--ps-fill);animation:acxPulse 1.4s ease-in-out infinite}#acx .acx-skel i+i{width:60%;height:14px;margin:4px auto 0}
@keyframes acxPulse{50%{opacity:.5}}
#acx .acx-acct{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;background:var(--ps-card);box-shadow:inset 0 0 0 1px var(--ps-hair);margin:0 0 24px}
.acx-av{flex:none;display:inline-grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--ps-accent);color:var(--ps-accent-i);font:600 12.5px/1 var(--ps-font);letter-spacing:.02em}
#acx .acx-acct b,.acx-me-t b{display:block;font:500 14px/1.3 var(--ps-font)}#acx .acx-acct small,.acx-me-t small{display:block;font:400 12.5px/1.35 var(--ps-font);color:var(--ps-dim)}
#acx .acx-steps{list-style:none;margin:0 0 28px;padding:0;display:grid;gap:0}
#acx .acx-steps li{position:relative;display:flex;gap:14px;padding:0 0 18px}
#acx .acx-steps li:not(:last-child)::before{content:'';position:absolute;left:11px;top:26px;bottom:2px;width:1px;background:var(--ps-line)}
#acx .acx-dot{flex:none;width:23px;height:23px;border-radius:50%;display:grid;place-items:center;box-shadow:inset 0 0 0 1.5px var(--ps-line)}
#acx [data-s=done] .acx-dot{background:var(--ps-good);box-shadow:none;color:var(--ps-app)}#acx [data-s=done] .acx-dot .acx-i{width:15px;height:15px}
#acx [data-s=cur] .acx-dot{box-shadow:inset 0 0 0 1.5px var(--ps-warn)}#acx [data-s=cur] .acx-dot::after{content:'';width:9px;height:9px;border-radius:50%;background:var(--ps-warn);animation:acxPulse 1.6s ease-in-out infinite}
#acx .acx-steps b{display:block;font:500 14px/1.4 var(--ps-font)}#acx .acx-steps small{display:block;font:400 12.5px/1.4 var(--ps-font);color:var(--ps-dim)}
#acx [data-s=next] b{color:var(--ps-ink-2)}
#acx .acx-note{display:grid;gap:10px;padding-top:24px;border-top:1px solid var(--ps-hair)}
#acx .acx-note label[for]{font:500 13.5px/1.3 var(--ps-font)}#acx .acx-note label small{font-weight:400;color:var(--ps-dim);margin-left:6px}
#acx textarea{width:100%;box-sizing:border-box;resize:vertical;min-height:84px;padding:12px 14px;border-radius:12px;border:0;background:var(--ps-fill);color:var(--ps-ink);font:400 14px/1.5 var(--ps-font)}
#acx textarea::placeholder{color:var(--ps-dim)}
#acx fieldset{border:0;margin:6px 0 0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:8px}
#acx legend{font:500 13.5px/1.3 var(--ps-font);margin:0 0 8px;padding:0}
#acx .acx-want{position:relative;display:block;cursor:pointer}
#acx .acx-want input{position:absolute;opacity:0;pointer-events:none}
#acx .acx-want span{display:block;padding:11px 12px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--ps-line);transition:background-color var(--ps-motion) var(--ps-ease)}
#acx .acx-want b{display:block;font:500 13.5px/1.3 var(--ps-font)}#acx .acx-want small{display:block;font:400 12px/1.35 var(--ps-font);color:var(--ps-dim);margin-top:2px}
#acx .acx-want:hover span{background:var(--ps-fill)}
#acx .acx-want input:checked+span{background:var(--ps-accent);box-shadow:none;color:var(--ps-accent-i)}#acx .acx-want input:checked+span small{color:inherit;opacity:.8}
#acx .acx-want input:focus-visible+span{outline:2px solid var(--ps-ink);outline-offset:2px}
#acx .acx-row,.ac .ac-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.acx-btn,.acx-ghost{display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 16px;border-radius:9999px;border:0;cursor:pointer;font:600 14px/1 var(--ps-font);letter-spacing:.01em;white-space:nowrap;transition:background-color var(--ps-motion) var(--ps-ease)}
.acx-btn{background:var(--ps-primary);color:var(--ps-primary-i)}.acx-btn:hover{background:var(--ps-primary-h)}.acx-btn:disabled{opacity:.5;cursor:default}
.acx-ghost{background:transparent;color:var(--ps-ink);box-shadow:inset 0 0 0 1px var(--ps-line)}.acx-ghost:hover{background:var(--ps-fill)}.acx-ghost:disabled{opacity:.5}
.acx-i{width:17px;height:17px;fill:currentColor;flex:none}
#acx .acx-r{position:relative;display:flex;flex-direction:column;margin:16px;border-radius:24px;background:var(--ps-stage);overflow:hidden;min-height:calc(100vh - 32px)}
#acx .acx-fig{flex:1;display:flex;align-items:center;justify-content:center;min-height:0;padding:24px;
  --hairline-plate:var(--ps-fill);--hairline-hi:var(--ps-ink);--hairline-edge:var(--ps-ink-2);--hairline-mid:var(--ps-ink-2);--hairline-lo:var(--ps-dim);--hairline-stroke:1}
/* the figure draws off-centre in its own 400x320 frame (ink x 70..290, y 147..285 — see the
   Ad sets drop zone): nudge it so the INK sits in the middle of the panel */
#acx .acx-fig > svg{position:static !important;width:min(92%,640px) !important;height:auto !important;transform:translate(5%,-12%)}
#acx .acx-cap{position:relative;margin:0;padding:0 40px 40px;flex:none;display:grid;gap:6px}
#acx .acx-cap b{font:500 18px/1.3 var(--ps-font)}#acx .acx-cap span{font:400 14px/1.5 var(--ps-font);color:var(--ps-ink-2)}
#acx :focus-visible,.ac :focus-visible,.acx-me :focus-visible,.acx-bar :focus-visible{outline:2px solid var(--ps-ink);outline-offset:2px}
@media (max-width:900px){#acx{grid-template-columns:1fr}#acx .acx-r{display:none}#acx .acx-l{padding:28px 20px}#acx h1{font-size:27px}}
@media (prefers-reduced-motion:reduce){#acx .acx-skel i,#acx [data-s=cur] .acx-dot::after{animation:none}#acx .acx-go:active{transform:none}}

/* the account chip, last in the Home sidebar */
.acx-me{display:flex;align-items:center;gap:10px;margin-top:12px;padding:10px 6px 2px 4px;border-top:1px solid var(--ps-hair)}
.acx-me .acx-av{width:30px;height:30px;font-size:11.5px}
.acx-me-t{min-width:0;flex:1}.acx-me-t b,.acx-me-t small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.acx-me-t b{font-size:13px}.acx-me-t small{font-size:11.5px}
.acx-me-out{flex:none;display:grid;place-items:center;width:32px;height:32px;border-radius:50%;border:0;background:transparent;color:var(--ps-ink-2);cursor:pointer}
.acx-me-out:hover{background:var(--ps-fill);color:var(--ps-ink)}
html[data-acc-lim] .acx-me{margin-top:auto}
@media (max-width:760px){.acx-me{flex:1 0 100%;margin-top:6px}}

/* an admin previewing someone else's view */
.acx-bar{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:3900;display:flex;align-items:center;gap:12px;padding:8px 8px 8px 16px;border-radius:9999px;
  background:var(--ps-primary);color:var(--ps-primary-i);font:400 13.5px/1.3 var(--ps-font);box-shadow:0 0 0 1px var(--ps-link);max-width:calc(100vw - 32px)}
.acx-bar b{font-weight:600}
.acx-bar button{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 14px;border-radius:9999px;border:0;cursor:pointer;background:var(--ps-primary-i);color:var(--ps-primary);font:600 13px/1 var(--ps-font);white-space:nowrap}
html[data-acc-preview] .p-br-mn{padding-bottom:96px}
@media (max-width:640px){.acx-bar > span{display:none}}

/* PERFORMANCE MARKETING: Home's setup with File as ticket only, and Status */
html[data-acc-lim] .p-br-sb .p-ws,html[data-acc-lim] .p-br-sb .p-sec-l0,
html[data-acc-lim] .p-sbn .p-nav2:not(:first-child):not(:nth-child(2)),html[data-acc-lim] .p-sbn-sep,
html[data-acc-lim] .p-sbf,html[data-acc-lim] .p-home-side,
html[data-acc-lim] .rsp-go,
html[data-acc-lim] [data-a=pick],html[data-acc-lim] [data-a=startcell],html[data-acc-lim] [data-a=addopen],html[data-acc-lim] [data-a=approve],
html[data-acc-lim] [data-a=relab],html[data-acc-lim] [data-a=rmproj],html[data-acc-lim] [data-a=delset],html[data-acc-lim] [data-a=overview],
html[data-acc-lim] .rvd-ph{display:none !important}
html[data-acc-lim] [data-a=proj]{pointer-events:none;cursor:default}
html[data-acc-lim] .rsp-tk{background:var(--ps-primary);color:var(--ps-primary-i);box-shadow:none}
html[data-acc-lim] .rsp-tk:hover{background:var(--ps-primary-h)}
html:not([data-acc-isadmin]) .p-nav2-acc,html[data-acc-preview] .p-nav2-acc{display:none}

/* THE ACCESS VIEW (admin only) */
.ac{max-width:1080px;font-family:var(--ps-font);color:var(--ps-ink)}
.ac .ac-top{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin:0 0 24px}
.ac .ac-tabs{display:inline-flex;gap:2px;padding:3px;border-radius:9999px;background:var(--ps-fill)}
.ac .ac-tabs button{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 16px;border:0;border-radius:9999px;background:transparent;color:var(--ps-ink-2);font:600 14px/1 var(--ps-font);cursor:pointer}
.ac .ac-tabs button:hover{color:var(--ps-ink)}
.ac .ac-tabs button[data-on]{background:var(--ps-card);color:var(--ps-ink);box-shadow:inset 0 0 0 1px var(--ps-hair)}
.ac .ac-tabs s{text-decoration:none;font:500 12px/1 var(--ps-font);font-variant-numeric:tabular-nums;color:var(--ps-dim)}
.ac .ac-tabs s[data-hot]{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 6px;box-sizing:border-box;border-radius:9999px;background:var(--ps-warn);color:#141210}
.ac .ac-pv{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.ac .ac-pv > span{font:400 13px/1 var(--ps-font);color:var(--ps-dim);margin-right:2px}
.ac .ac-pv .acx-ghost{height:32px;padding:0 12px;font-size:13px}
.ac .ac-pv > label{font:400 13px/1 var(--ps-font);color:var(--ps-dim);margin-right:2px}
.ac .ac-dd-eye > .acx-i{position:absolute;left:14px;top:50%;width:18px;height:18px;margin-top:-9px;fill:var(--ps-ink-2);pointer-events:none}
.ac .ac-dd-eye .ac-sel{padding-left:40px;min-width:250px}
.ac .ac-empty{display:grid;justify-items:start;gap:8px;padding:40px;border-radius:16px;box-shadow:inset 0 0 0 1px var(--ps-hair)}
.ac .ac-empty .acx-i{width:28px;height:28px;color:var(--ps-dim);margin-bottom:4px}
.ac .ac-empty b{font:500 17px/1.3 var(--ps-font)}.ac .ac-empty span{font:400 14px/1.55 var(--ps-font);color:var(--ps-ink-2);max-width:52ch}
.ac .ac-load{display:grid;gap:10px}.ac .ac-load i{display:block;height:84px;border-radius:16px;background:var(--ps-fill);animation:acxPulse 1.4s ease-in-out infinite}
.ac .ac-reqs{list-style:none;margin:0;padding:0;border-radius:16px;box-shadow:inset 0 0 0 1px var(--ps-hair)}
.ac .ac-req{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:16px;align-items:start;padding:20px}
.ac .ac-req + .ac-req{border-top:1px solid var(--ps-hair)}
.ac .ac-req .acx-av{width:40px;height:40px;font-size:14px}
.ac .ac-who b{display:block;font:500 16px/1.3 var(--ps-font)}.ac .ac-who small{display:block;font:400 13px/1.4 var(--ps-font);color:var(--ps-ink-2)}
.ac .ac-meta{display:block;margin-top:8px;font:400 12.5px/1.45 var(--ps-font);color:var(--ps-dim)}
.ac .ac-q{display:block;margin-top:12px;padding:10px 14px;border-radius:12px;background:var(--ps-fill);font:400 14px/1.5 var(--ps-font);color:var(--ps-ink);quotes:'\\201C' '\\201D';max-width:60ch}
.ac .ac-q::before{content:open-quote}.ac .ac-q::after{content:close-quote}
.ac .ac-act{display:grid;justify-items:end;gap:10px}.ac .ac-lbl{font:400 12.5px/1 var(--ps-font);color:var(--ps-dim)}
.ac .ac-dd{position:relative;display:inline-flex;align-items:center;max-width:100%}
.ac .ac-sel{-webkit-appearance:none;appearance:none;height:36px;min-width:220px;max-width:100%;box-sizing:border-box;padding:0 38px 0 14px;border:0;border-radius:9999px;background:var(--ps-fill);color:var(--ps-ink);font:500 13.5px/1 var(--ps-font);cursor:pointer;transition:background-color var(--ps-motion) var(--ps-ease)}
.ac .ac-sel:hover{background:var(--ps-fill-h)}
.ac .ac-sel:focus-visible{outline:2px solid var(--ps-ink);outline-offset:2px}
.ac .ac-sel:disabled{opacity:.5;cursor:default}
.ac .ac-sel option{background:var(--ps-card);color:var(--ps-ink)}
.ac .ac-dd::after{content:'';position:absolute;right:16px;top:50%;width:7px;height:7px;margin-top:-6px;border-right:1.5px solid var(--ps-ink-2);border-bottom:1.5px solid var(--ps-ink-2);transform:rotate(45deg);pointer-events:none}
.ac .ac-add .ac-sel{min-width:240px}
.ac .ac-seg{display:inline-flex;gap:2px;padding:3px;border-radius:9999px;background:var(--ps-fill)}
.ac .ac-seg button{height:30px;padding:0 12px;border:0;border-radius:9999px;background:transparent;color:var(--ps-ink-2);font:500 13px/1 var(--ps-font);cursor:pointer;white-space:nowrap}
.ac .ac-seg button:hover{color:var(--ps-ink)}
.ac .ac-seg button[data-on]{background:var(--ps-accent);color:var(--ps-accent-i)}
/* five roles: tighter in the People table, and the track wraps before it runs out of the column */
.ac .ac-t .ac-seg{flex-wrap:nowrap;max-width:100%}@media (max-width:1279px){.ac .ac-t .ac-seg{flex-wrap:wrap;border-radius:18px}}
.ac .ac-t td:first-child{max-width:0;width:40%}.ac .ac-t .ac-p > span{min-width:0}.ac .ac-t .ac-p b,.ac .ac-t .ac-p small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ac .ac-t .ac-seg button{padding:0 8px;font-size:12.5px}
.ac .ac-no{color:var(--ps-ink-2)}.ac .ac-no:hover{color:var(--ps-bad);background:var(--ps-bad-q);box-shadow:none}
.ac .ac-add{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 20px;padding:14px 16px;border-radius:16px;background:var(--ps-card);box-shadow:inset 0 0 0 1px var(--ps-hair)}
.ac .ac-add label{font:500 14px/1 var(--ps-font);margin-right:4px}
.ac .ac-add input{flex:1 1 220px;height:36px;box-sizing:border-box;padding:0 14px;border-radius:9999px;border:0;background:var(--ps-fill);color:var(--ps-ink);font:400 14px/1 var(--ps-font)}
.ac .ac-add input::placeholder{color:var(--ps-dim)}
.ac .ac-t{width:100%;border-collapse:collapse;font:400 14px/1.4 var(--ps-font)}
.ac .ac-t th{text-align:left;font:500 12.5px/1 var(--ps-font);color:var(--ps-dim);padding:0 12px 10px;border-bottom:1px solid var(--ps-hair)}
.ac .ac-t td{padding:12px;border-bottom:1px solid var(--ps-hair);vertical-align:middle}
.ac .ac-t tr[data-st=declined] .ac-p,.ac .ac-t tr[data-st=revoked] .ac-p{opacity:.62}
.ac .ac-p{display:flex;align-items:center;gap:12px;min-width:0}.ac .ac-p b{display:block;font-weight:500}.ac .ac-p small{display:block;font-size:12.5px;color:var(--ps-dim)}
.ac .ac-role{font:500 13px/1 var(--ps-font);color:var(--ps-ink-2)}
.ac .ac-st{font:400 13px/1 var(--ps-font);color:var(--ps-ink-2)}
.ac .ac-num{font-variant-numeric:tabular-nums;color:var(--ps-ink-2);white-space:nowrap}
.ac .ac-end{text-align:right;white-space:nowrap}.ac .ac-end > * + *{margin-left:12px}
.ac .ac-dim{color:var(--ps-dim)}
.ac .ac-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.ac .ac-log{list-style:none;margin:0;padding:0}
.ac .ac-day{font:500 12.5px/1 var(--ps-font);color:var(--ps-dim);padding:20px 0 10px}.ac .ac-day:first-child{padding-top:0}
.ac .ac-ev{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:14px;align-items:baseline;padding:10px 0;border-bottom:1px solid var(--ps-hair)}
.ac .ac-evd{width:8px;height:8px;border-radius:50%;background:var(--ps-warn);transform:translateY(-1px)}
.ac .ac-ev[data-k=good] .ac-evd{background:var(--ps-good)}.ac .ac-ev[data-k=bad] .ac-evd{background:var(--ps-bad)}
.ac .ac-evt{font:400 14px/1.45 var(--ps-font);color:var(--ps-ink-2)}.ac .ac-evt b{font-weight:500;color:var(--ps-ink)}
.ac .ac-evt small{display:block;font-size:12px;color:var(--ps-dim)}
.ac .ac-ev time{font:400 12.5px/1 var(--ps-font);color:var(--ps-dim);font-variant-numeric:tabular-nums}
@media (max-width:860px){
  .ac .ac-req{grid-template-columns:auto minmax(0,1fr)}.ac .ac-act{grid-column:1/-1;justify-items:start}
  .ac .ac-t thead{display:none}.ac .ac-t tr{display:grid;grid-template-columns:1fr auto;gap:8px 12px;padding:12px 0;border-bottom:1px solid var(--ps-hair)}
  .ac .ac-t td{border:0;padding:0}.ac .ac-t td:nth-child(3){display:none}.ac .ac-end{grid-column:1/-1;text-align:left}
  .ac .ac-pv > label{display:none}
}
`;
  const st = document.createElement('style'); st.id = 'acx-css'; st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  const go = () => { draw(); boot(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
