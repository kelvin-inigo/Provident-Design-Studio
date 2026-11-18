/* THE ENGINE (2026-11-18, by request): PDS's own status page on the home, #/engine.
   For the admin and anyone whose role opens 'arch' (AI Engineers by default; Access › Roles).
   What it shows, live:
   - what is in production now (the newest Vercel deployment GitHub reports, and its state);
   - the services the studios lean on: the sign-in server, the share store, the GitHub feed;
   - every day since the first commit, as a strip, and every commit on main as a timeline with
     its date and time, its area and, when Vercel shipped it, the deployment's state;
   - how PDS is built: each area, its files, and when it last changed.
   The commits and deployments come from api/share.py op 'engine' (the public repository on
   GitHub, read by the server so one cache serves everyone). This page keeps what it has read in
   localStorage (provident-engine-v1) and asks only for what is newer, every 30 s while visible.
   Chrome only: --ps-* tokens, Google Sans Flex, rings not shadows (DESIGN.md). */
(function () {
  'use strict';
  var LS = 'provident-engine-v1', POLL = 30000, PAGE = 60;
  var REPO_URL = 'https://github.com/kelvin-inigo/Provident-Design-Studio';
  var E = { commits: [], deploys: [], rate: null, err: '', at: 0, busy: false, total: 0, filter: 'all', q: '', shown: PAGE,
            fresh: {}, health: {}, root: null, timer: null, grown: false, repo: '' };
  try { var c0 = JSON.parse(localStorage.getItem(LS) || 'null'); if (c0 && Array.isArray(c0.commits)) { E.commits = c0.commits; E.deploys = c0.deploys || []; E.at = c0.at || 0; E.total = E.commits.length; } } catch (x) {}

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var ico = function (id) { return '<svg class="i" aria-hidden="true"><use href="#g-' + id + '"/></svg>'; };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var dayKey = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var hm = function (d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  function ago(t) {
    if (!t) return '';
    var s = Math.round((Date.now() - new Date(t).getTime()) / 1000);
    if (s < 45) return 'just now';
    if (s < 3600) return Math.round(s / 60) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' h ago';
    var d = Math.round(s / 86400); return d === 1 ? 'yesterday' : d + ' days ago';
  }
  function dayName(k) {
    var d = new Date(k + 'T12:00:00'), t = new Date(), y = new Date(); y.setDate(t.getDate() - 1);
    var long = d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
    return k === dayKey(t) ? 'Today · ' + long.replace(/^\w+,?\s*/, '') : k === dayKey(y) ? 'Yesterday · ' + long.replace(/^\w+,?\s*/, '') : long;
  }

  // ── what a commit touched, from its message: the repo's own prefixes first ─────────────────
  var AREAS = [
    { k: 'cas', n: 'CAS', re: /^(CAS|cas-[a-z-]+|Campaign|Ad sets?|Review links?)\b|\b(CAS|campaign ads?|ad set)\b/i },
    { k: 'ops', n: 'OPS', re: /^(OPS|Organic)\b|\b(OPS|organic|carousel|hub post)\b/i },
    { k: 'casv', n: 'CASV', re: /\b(CASV|Video Studio)\b/i },
    { k: 'home', n: 'Home', re: /^(Home|Landing( page)?|One home|Status)\b|\b(home|landing page|Status board|Next up)\b/i },
    { k: 'server', n: 'Server', re: /^(api|Access|Sign-in|Share links?)\b|\b(api\/|share\.py|gauth|sign-in|Upstash|roles?|access list)\b/i },
    { k: 'agents', n: 'Agents', re: /^(studio-mcp|Grok|MCP|rembg|Photoshop|tools)\b|\b(MCP|Grok|skill|rembg|Photoshop)\b/i },
    { k: 'docs', n: 'Docs', re: /^(Docs?|Guide|Notes|Architecture PDF|CLAUDE)\b|\b(docs?|guide|PDF|notes)\b/i },
    { k: 'kit', n: 'Design system', re: /^(Kit|UI|Design system|Chrome)\b|\b(design system|ui-design-system|tokens?)\b/i }
  ];
  var AREA_N = {}; AREAS.forEach(function (a) { AREA_N[a.k] = a.n; });
  function areaOf(c) {
    if (c._a !== undefined) return c._a;
    var t = String(c.msg || '').split('\n')[0], pre = /^([A-Za-z][\w .\/-]{0,24}):\s/.exec(t), hit = '';
    if (pre) AREAS.some(function (a) { if (a.re.test(pre[1])) { hit = a.k; return true; } return false; });
    if (!hit) AREAS.some(function (a) { if (a.re.test(t)) { hit = a.k; return true; } return false; });
    return (c._a = hit);
  }
  function titleOf(c) { return String(c.msg || '').split('\n')[0]; }
  function bodyOf(c) { var b = String(c.msg || '').split('\n').slice(1).join(' ').replace(/Co-Authored-By:.*$/i, '').replace(/\s+/g, ' ').trim(); return b; }

  // ── how PDS is built (docs/architecture/pds-architecture.html, section 3) ─────────────────
  var BUILT = [
    { k: 'cas', n: 'CAS · Campaign Ads Studio', f: 'Provident Campaign Studio.dc.html', d: 'Paid Meta ads in every size, Eventbrite banners, animated video backgrounds, the ad set hand-off.' },
    { k: 'ops', n: 'OPS · Organic Post Studio', f: 'Provident Organic Studio.dc.html · post-flow.js', d: 'Feed, story and carousel posts from locked templates; posts on Drive; Send to the Content Hub.' },
    { k: 'casv', n: 'CASV · Video Studio', f: 'video-studio branch, local only (:8794)', d: 'Reels and squares on a designer’s Mac; Higgsfield clips; hands videos to CAS.' },
    { k: 'home', n: 'Home', f: 'index.html · engine.js', d: 'Next up, Status, Projects, Access and this page. Runs no studio code.' },
    { k: 'server', n: 'Server and sign-in', f: 'api/share.py · api/gauth.py · access.js', d: 'Google sign-in, roles, Roam notes, Arabic copy by Claude, the hub keys and this feed. Vercel Python.' },
    { k: 'kit', n: 'Shared runtime and design system', f: 'runtime.js · studio-base.js · share-link.js · ui-design-system/', d: 'Storage, workspaces, ad set reviews on Drive, the chrome tokens both studios mirror.' },
    { k: 'agents', n: 'Agents and helpers', f: 'tools/studio-mcp · .claude/skills · tools/rembg', d: 'The studio tools for Claude and the Grok bot, the skills, cut-outs and the Photoshop round trip.' },
    { k: 'docs', n: 'Docs', f: 'docs/notes · docs/architecture · CAS-OPS-GUIDE.md', d: 'Every decision since August, the architecture reference, the guide the team reads.' }
  ];

  // ── deployments ─────────────────────────────────────────────────────────────────────────
  var DS = {
    success: ['ok', 'Deployed'], inactive: ['old', 'Replaced'], failure: ['bad', 'Failed'], error: ['bad', 'Failed'],
    pending: ['run', 'Queued'], queued: ['run', 'Queued'], in_progress: ['run', 'Building']
  };
  function depBySha() { var m = {}; E.deploys.forEach(function (d) { (m[d.sha] = m[d.sha] || []).push(d); }); return m; }
  function liveDeploy() {
    return E.deploys.filter(function (d) { return /prod/i.test(d.env) && d.state === 'success'; })[0] || null;
  }
  function depChip(d, live) {
    var s = live ? ['ok', 'Live'] : DS[d.state] || ['old', 'Deployed'];
    return '<span class="eg-d" data-s="' + s[0] + '" title="' + esc((d.env || 'Deployment') + ' · ' + new Date(d.at).toLocaleString()) + '"><i></i>' + s[1] + '</span>';
  }

  // ── the server ─────────────────────────────────────────────────────────────────────────
  function poll(force) {
    var A = window.providentAccess;
    if (E.busy || !A || !A.call) return;
    if (!force && document.hidden) return;
    E.busy = true; paintHead();
    var have = E.commits[0] ? E.commits[0].sha : '';
    A.call('engine', { have: have }).then(function (r) {
      var before = {}; E.commits.forEach(function (c) { before[c.sha] = 1; });
      if (r.full) E.commits = r.commits || [];
      else if (r.commits && r.commits.length) E.commits = r.commits.concat(E.commits);
      if (have) (r.commits || []).forEach(function (c) { if (!before[c.sha]) E.fresh[c.sha] = Date.now(); });
      E.deploys = r.deploys || E.deploys; E.rate = r.rate || null; E.err = r.err || ''; E.total = r.total || E.commits.length;
      E.repo = r.repo || ''; E.at = r.at || Date.now();
      try { localStorage.setItem(LS, JSON.stringify({ commits: E.commits.map(function (c) { return { sha: c.sha, msg: c.msg, at: c.at, by: c.by, login: c.login }; }), deploys: E.deploys, at: E.at })); } catch (x) {}
    }).catch(function (e) { E.err = (e && e.message) || 'The engine feed could not be read.'; })
      .then(function () { E.busy = false; paint(); });
    health();
  }
  // the services, timed from this browser
  function health() {
    var base = (window.StudioBase && StudioBase.shareBase ? StudioBase.shareBase() : '');
    function probe(k, url, read) {
      var t0 = performance.now();
      fetch(url, { cache: 'no-store' }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return [r, j]; }); })
        .then(function (x) { E.health[k] = read(x[0], x[1], Math.round(performance.now() - t0)); })
        .catch(function () { E.health[k] = { s: 'bad', t: 'Not reachable' }; })
        .then(paintServices);
    }
    probe('server', base + '/api/share?op=accstatus', function (r, j, ms) { return r.ok ? { s: 'ok', t: (j.on ? 'Sign-in on' : 'Sign-in off') + ' · ' + ms + ' ms' } : { s: 'bad', t: 'HTTP ' + r.status }; });
    probe('gauth', base + '/api/gauth?op=status', function (r, j, ms) { return r.ok ? { s: 'ok', t: (j.on === false ? 'Popup sign-in' : 'Stays signed in') + ' · ' + ms + ' ms' } : { s: 'bad', t: 'HTTP ' + r.status }; });
    probe('store', base + '/api/share?op=health', function (r, j) {
      if (r.status === 410) return { s: 'old', t: 'Retired' };
      if (!r.ok || !j.ok) return { s: 'bad', t: (j && j.error) || 'HTTP ' + r.status };
      var pc = j.bytes && j.limit ? Math.round(100 * j.bytes / j.limit) : null;
      return { s: pc != null && pc >= 90 ? 'warn' : 'ok', t: (pc != null ? pc + '% full' : 'Answering') + ' · ' + (j.ms || 0) + ' ms' };
    });
  }

  // ── painting ───────────────────────────────────────────────────────────────────────────
  function shell() {
    return '<div class="eg" id="eg">' +
      '<header class="eg-hd"><div class="eg-hd-t"><h1 class="h1">Engine</h1><p class="lede" id="eg-lede">How PDS is built, and everything that changes in it, as it happens.</p></div>' +
        '<div class="eg-live" id="eg-live"></div></header>' +
      '<section class="eg-now" id="eg-now" aria-label="In production"></section>' +
      '<section class="eg-sv" id="eg-sv" aria-label="Services"></section>' +
      '<section class="eg-days" aria-labelledby="eg-days-h"><div class="sh"><span id="eg-days-h">Every day since the first commit</span><small id="eg-days-n"></small></div><div class="eg-strip" id="eg-strip"></div><div class="eg-months" id="eg-months"></div>' +
        '<p class="eg-key"><span><i data-k="c"></i>Commits that day</span><span><i data-k="d"></i>Shipped to Vercel that day</span><span class="eg-key-n">GitHub keeps the last 100 deployments; older days show commits only.</span></p></section>' +
      '<div class="eg-cols"><section class="eg-tl" aria-labelledby="eg-tl-h">' +
        '<div class="eg-tl-bar"><h2 class="eg-h2" id="eg-tl-h">Timeline</h2><span class="sp"></span>' +
          '<label class="eg-q">' + ico('search') + '<input id="eg-q" type="search" placeholder="Find a commit" aria-label="Find a commit" autocomplete="off"></label></div>' +
        '<div class="eg-f" id="eg-f" role="group" aria-label="Show"></div>' +
        '<div id="eg-list"></div></section>' +
      '<aside class="eg-built" aria-labelledby="eg-b-h"><h2 class="eg-h2" id="eg-b-h">How PDS is built</h2><ul class="eg-b" id="eg-b"></ul>' +
        '<h2 class="eg-h2" id="eg-ep-h">Endpoints</h2><ul class="eg-ep" id="eg-ep" aria-labelledby="eg-ep-h"></ul>' +
        '<div class="eg-links"><a class="b b-g" href="docs/architecture/PDS-Architecture.pdf" target="_blank" rel="noopener">' + ico('file') + 'Architecture reference</a>' +
        '<a class="b b-q" href="' + REPO_URL + '" target="_blank" rel="noopener">' + ico('out') + 'Repository</a></div>' +
        '<p class="eg-note" id="eg-feed"></p></aside></div></div>';
  }
  function paintHead() {
    var L = document.getElementById('eg-live'); if (!L) return;
    var stale = !E.at || Date.now() - E.at > 3 * POLL, s = E.err && !E.commits.length ? 'bad' : E.err || stale ? 'warn' : 'ok';
    L.innerHTML = '<span class="eg-dot" data-s="' + s + '"' + (E.busy ? ' data-busy' : '') + '><i></i></span>' +
      '<span class="eg-live-t"><b>' + (s === 'ok' ? 'Live' : s === 'warn' ? (E.err ? 'Behind' : 'Waiting') : 'Not connected') + '</b><small>' + (E.at ? 'Read ' + ago(E.at) : 'Reading GitHub…') + '</small></span>' +
      '<button class="b b-g" type="button" data-eg="refresh"' + (E.busy ? ' disabled' : '') + '>' + ico('sync') + (E.busy ? 'Reading…' : 'Refresh') + '</button>';
    var ld = document.getElementById('eg-lede');
    if (ld && E.commits.length) {
      var first = new Date(E.commits[E.commits.length - 1].at);
      ld.textContent = 'How PDS is built, and everything that changes in it, as it happens: ' + E.total.toLocaleString() + ' commits since ' +
        first.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' }) + ', and every Vercel deployment.';
    }
  }
  function paintNow() {
    var N = document.getElementById('eg-now'); if (!N) return;
    var live = liveDeploy(), newer = E.deploys.filter(function (d) { return DS[d.state] && DS[d.state][0] === 'run'; })[0], bad = E.deploys[0] && DS[E.deploys[0].state] && DS[E.deploys[0].state][0] === 'bad' ? E.deploys[0] : null;
    if (!live && !E.deploys.length) { N.innerHTML = E.commits.length || E.err ? '<p class="eg-now-e">' + esc(E.err || 'No deployments reported yet.') + '</p>' : '<div class="eg-sk"></div>'; return; }
    var c = live && E.commits.filter(function (x) { return x.sha === live.sha; })[0];
    N.innerHTML = '<div class="eg-now-r"><span class="eg-now-l">In production</span>' +
      (live ? depChip(live, true) + '<a class="eg-sha" href="' + REPO_URL + '/commit/' + esc(live.sha) + '" target="_blank" rel="noopener">' + esc(live.sha.slice(0, 7)) + '</a>' +
        '<b class="eg-now-m">' + esc(c ? titleOf(c) : 'Commit ' + live.sha.slice(0, 7)) + '</b><small>deployed ' + esc(ago(live.stateAt || live.at)) + '</small>' +
        (live.url ? '<a class="b b-l" href="' + esc(live.url) + '" target="_blank" rel="noopener">Open the site</a>' : '')
        : '<b class="eg-now-m">No live deployment reported</b>') + '</div>' +
      (newer ? '<div class="eg-now-r eg-now-n">' + depChip(newer) + '<a class="eg-sha" href="' + REPO_URL + '/commit/' + esc(newer.sha) + '" target="_blank" rel="noopener">' + esc(newer.sha.slice(0, 7)) + '</a><span>Started ' + esc(ago(newer.at)) + '; it replaces production when it is ready.</span></div>' : '') +
      (bad && !newer ? '<div class="eg-now-r eg-now-n">' + depChip(bad) + '<a class="eg-sha" href="' + REPO_URL + '/commit/' + esc(bad.sha) + '" target="_blank" rel="noopener">' + esc(bad.sha.slice(0, 7)) + '</a><span>The newest deployment failed ' + esc(ago(bad.stateAt || bad.at)) + '; production stays on the one above.</span></div>' : '');
  }
  function paintServices() {
    var S = document.getElementById('eg-sv'); if (!S) return;
    var r = E.rate && E.rate.left != null ? E.rate : null, gh = E.err ? { s: E.commits.length ? 'warn' : 'bad', t: E.err } : r ? { s: r.left < (r.limit || 60) * 0.1 ? 'warn' : 'ok', t: r.left.toLocaleString() + ' of ' + (r.limit || 0).toLocaleString() + ' left this hour' } : null;
    var rows = [['server', 'Studio server', E.health.server], ['gauth', 'Google sign-in', E.health.gauth], ['store', 'Share store', E.health.store], ['gh', 'GitHub feed', gh]];
    S.innerHTML = rows.map(function (x) {
      var v = x[2] || { s: 'wait', t: 'Checking…' };
      return '<div class="eg-s" data-s="' + v.s + '"><span class="eg-dot" data-s="' + v.s + '"><i></i></span><span><b>' + x[1] + '</b><small title="' + esc(v.t) + '">' + esc(v.t) + '</small></span></div>';
    }).join('');
    paintEndpoints();
  }
  // THE ENDPOINTS THIS PAGE AND ACCESS USE (2026-11-18, by request): each path on this site, what
  // it is for, who may call it, and how it answered from here (the same probes as the services)
  var EPS = [
    ['POST', '/api/share?op=engine', 'This page: commits on main and Vercel deployments, from GitHub', 'Admin, or a role with See the engine', 'gh'],
    ['GET', '/api/share?op=accstatus', 'Whether sign-in is on, and for which domain', 'Anyone', 'server'],
    ['GET', '/api/gauth?op=status', 'Google sign-in that stays signed in', 'Anyone', 'gauth'],
    ['GET', '/api/share?op=health', 'The share store: answering, how full', 'Anyone', 'store'],
    ['POST', '/api/share?op=accrole', 'Name, rename or remove a team role (Access › New role…)', 'The admin', ''],
    ['POST', '/api/share?op=accme', 'Who is signed in, their role and the role map', 'Any Google account on the domain', 'server']
  ];
  function paintEndpoints() {
    var U = document.getElementById('eg-ep'); if (!U) return;
    var base = (window.StudioBase && StudioBase.shareBase ? StudioBase.shareBase() : '') || location.origin;
    var gh = E.err ? { s: E.commits.length ? 'warn' : 'bad' } : E.at ? { s: 'ok' } : null;
    U.innerHTML = EPS.map(function (x) {
      var v = x[4] === 'gh' ? gh : x[4] ? E.health[x[4]] : null, sv = v ? v.s : 'old';
      return '<li><span class="eg-dot" data-s="' + sv + '" title="' + (v ? ({ ok: 'Answering', warn: 'Answering, with a warning', bad: 'Not answering', old: 'Retired' }[sv] || 'Checking') : 'Not checked from this page') + '"><i></i></span>' +
        '<span class="eg-ep-t"><span class="eg-ep-p"><small>' + x[0] + '</small><code>' + esc(x[1]) + '</code></span><span>' + esc(x[2]) + '</span><small>' + esc(x[3]) + '</small></span></li>';
    }).join('');
    var F = document.getElementById('eg-ep-h'); if (F) F.title = 'On ' + base;
  }
  function paintStrip() {
    var S = document.getElementById('eg-strip'), M = document.getElementById('eg-months'); if (!S || !E.commits.length) return;
    var per = {}, dep = {}, first = new Date(E.commits[E.commits.length - 1].at), today = new Date(), days = [];
    E.commits.forEach(function (c) { var k = dayKey(new Date(c.at)); per[k] = (per[k] || 0) + 1; });
    E.deploys.forEach(function (d) { var k = dayKey(new Date(d.at)); dep[k] = (dep[k] || 0) + 1; });
    for (var d = new Date(first.getFullYear(), first.getMonth(), first.getDate()); d <= today; d.setDate(d.getDate() + 1)) days.push(dayKey(d));
    var max = Math.max.apply(null, days.map(function (k) { return per[k] || 0; }).concat([1]));
    S.style.setProperty('--n', days.length);
    S.innerHTML = days.map(function (k, i) {
      var n = per[k] || 0, h = n ? Math.max(8, Math.round(100 * Math.sqrt(n / max))) : 0, dd = new Date(k + 'T12:00:00');
      var label = dd.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + (n ? n + ' commit' + (n > 1 ? 's' : '') : 'no commits') + (dep[k] ? ' · ' + dep[k] + ' deployment' + (dep[k] > 1 ? 's' : '') : '');
      return '<button type="button" class="eg-day" data-eg="day" data-k="' + k + '"' + (n ? '' : ' disabled') + ' title="' + esc(label) + '" aria-label="' + esc(label) + '" style="--h:' + h + '%;--i:' + i + '"' +
        (dep[k] ? ' data-dep' : '') + (k === dayKey(today) ? ' data-today' : '') + '><i></i></button>';
    }).join('');
    var months = [], last = '';
    days.forEach(function (k, i) { var m = k.slice(0, 7); if (m !== last) { last = m; months.push('<span style="--i:' + i + '">' + new Date(k + 'T12:00:00').toLocaleDateString([], { month: 'short' }) + '</span>'); } });
    M.style.setProperty('--n', days.length); M.innerHTML = months.join('');
    var act = days.filter(function (k) { return per[k]; }).length;
    var dn = document.getElementById('eg-days-n'); if (dn) dn.textContent = days.length + ' days · ' + act + ' with commits · ' + E.deploys.length + (E.deploys.length >= 100 ? '+' : '') + ' deployments reported';
    if (!E.grown) { E.grown = true; S.setAttribute('data-grow', ''); setTimeout(function () { S.removeAttribute('data-grow'); }, 1400); }
  }
  function filtered() {
    var q = E.q.trim().toLowerCase(), dm = depBySha();
    return E.commits.filter(function (c) {
      if (E.filter === 'deployed' && !dm[c.sha]) return false;
      if (E.filter !== 'all' && E.filter !== 'deployed' && areaOf(c) !== E.filter) return false;
      return !q || String(c.msg).toLowerCase().indexOf(q) >= 0 || c.sha.indexOf(q) === 0;
    });
  }
  function paintFilters() {
    var F = document.getElementById('eg-f'); if (!F) return;
    var dm = depBySha(), n = { all: E.commits.length, deployed: E.commits.filter(function (c) { return dm[c.sha]; }).length };
    E.commits.forEach(function (c) { var a = areaOf(c); if (a) n[a] = (n[a] || 0) + 1; });
    var opts = [['all', 'All'], ['deployed', 'Deployed']].concat(AREAS.map(function (a) { return [a.k, a.n]; })).filter(function (o) { return n[o[0]]; });
    F.innerHTML = opts.map(function (o) { return '<button type="button" data-eg="f" data-v="' + o[0] + '" aria-pressed="' + (E.filter === o[0]) + '">' + o[1] + '<small>' + n[o[0]] + '</small></button>'; }).join('');
  }
  function paintList() {
    var Lh = document.getElementById('eg-list'); if (!Lh) return;
    if (!E.commits.length) { Lh.innerHTML = E.err ? '<div class="quiet"><b>The timeline could not be read</b><p>' + esc(E.err) + '</p></div>' : '<div class="eg-sk-l"><i></i><i></i><i></i><i></i></div>'; return; }
    var all = filtered(), list = all.slice(0, E.shown), dm = depBySha(), live = liveDeploy(), day = '', h = '';
    if (!all.length) { Lh.innerHTML = '<div class="quiet"><b>No commits match</b><p>Nothing in the ' + E.commits.length + ' commits matches that. Clear the search or pick All.</p></div>'; return; }
    h += '<ol class="eg-c">';
    list.forEach(function (c) {
      var d = new Date(c.at), k = dayKey(d);
      if (k !== day) { day = k; var cnt = all.filter(function (x) { return dayKey(new Date(x.at)) === k; }).length;
        h += '<li class="eg-dh" id="eg-d-' + k + '"><span>' + esc(dayName(k)) + '</span><small>' + cnt + ' commit' + (cnt > 1 ? 's' : '') + '</small></li>'; }
      var a = areaOf(c), t = titleOf(c), b = bodyOf(c), deps = dm[c.sha] || [], fr = E.fresh[c.sha] && Date.now() - E.fresh[c.sha] < 120000;
      // the commit's own label ("CAS Ad sets:", "Status:") stays, in a quieter ink
      var pre = /^([^:]{1,32}):\s+(.+)$/.exec(t), tt = pre ? '<span class="eg-pre">' + esc(pre[1]) + '</span> ' + esc(pre[2]) : esc(t);
      h += '<li class="eg-r"' + (fr ? ' data-new' : '') + (deps.length ? ' data-dep' : '') + '>' +
        '<time datetime="' + esc(c.at) + '" title="' + esc(d.toLocaleString()) + '">' + esc(hm(d)) + '</time>' +
        '<span class="eg-r-m"><b>' + tt + '</b>' + (b ? '<small>' + esc(b) + '</small>' : '') + '</span>' +
        '<span class="eg-r-x">' + (a ? '<span class="eg-tag">' + AREA_N[a] + '</span>' : '') +
          (deps.length ? depChip(deps[0], live && live.id === deps[0].id) : '') +
          '<a class="eg-sha" href="' + REPO_URL + '/commit/' + esc(c.sha) + '" target="_blank" rel="noopener" title="Open this commit on GitHub">' + esc(c.sha.slice(0, 7)) + '</a></span></li>';
    });
    h += '</ol>';
    if (all.length > list.length) h += '<div class="eg-more"><button class="b b-g" type="button" data-eg="more">Show ' + Math.min(PAGE, all.length - list.length) + ' more</button><small>' + list.length + ' of ' + all.length + '</small></div>';
    else h += '<p class="eg-end">The first commit. ' + esc(new Date(all[all.length - 1].at).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })) + '.</p>';
    Lh.innerHTML = h;
  }
  function paintBuilt() {
    var B = document.getElementById('eg-b'); if (!B) return;
    var wk = Date.now() - 7 * 864e5;
    B.innerHTML = BUILT.map(function (x) {
      var cs = E.commits.filter(function (c) { return areaOf(c) === x.k; }), lastC = cs[0], w = cs.filter(function (c) { return new Date(c.at).getTime() > wk; }).length;
      return '<li><button type="button" data-eg="f" data-v="' + x.k + '" title="Show only ' + esc(AREA_N[x.k] || x.n) + ' in the timeline"><b>' + esc(x.n) + '</b><code>' + esc(x.f) + '</code><span>' + esc(x.d) + '</span>' +
        '<small>' + (lastC ? 'Changed ' + esc(ago(lastC.at)) + (w ? ' · ' + w + ' this week' : '') : E.commits.length ? 'No commit names it yet' : '&nbsp;') + '</small></button></li>';
    }).join('');
    var F = document.getElementById('eg-feed');
    if (F) F.innerHTML = 'Read from the public repository on GitHub by the studio’s server (<code>/api/share?op=engine</code>)' + (E.rate && E.rate.left != null ? (E.rate.token ? ', with its token' : ', without a token: GitHub allows it 60 reads an hour. A read-only GITHUB_TOKEN in Vercel lifts that') : '') + '. Commits made on a Mac show here once they are pushed.';
  }
  function paint() { if (!E.root || !document.body.contains(E.root)) return; paintHead(); paintNow(); paintServices(); paintStrip(); paintFilters(); paintList(); paintBuilt(); }

  // ── wiring ─────────────────────────────────────────────────────────────────────────────
  function onClick(e) {
    var t = e.target.closest && e.target.closest('[data-eg]'); if (!t) return;
    var a = t.dataset.eg;
    if (a === 'refresh') poll(true);
    else if (a === 'more') { E.shown += PAGE; paintList(); }
    else if (a === 'f') { E.filter = E.filter === t.dataset.v && t.closest('#eg-b') ? 'all' : t.dataset.v; E.shown = PAGE; paintFilters(); paintList(); var tl = document.getElementById('eg-tl-h'); if (t.closest('#eg-b') && tl) tl.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (a === 'day') {
      var k = t.dataset.k; E.filter = 'all'; E.q = ''; var qi = document.getElementById('eg-q'); if (qi) qi.value = '';
      var idx = E.commits.findIndex(function (c) { return dayKey(new Date(c.at)) === k; });
      var lastIdx = E.commits.length - 1 - E.commits.slice().reverse().findIndex(function (c) { return dayKey(new Date(c.at)) === k; });
      if (idx >= 0) E.shown = Math.max(E.shown, Math.ceil((lastIdx + 1) / PAGE) * PAGE);
      paintFilters(); paintList();
      var el = document.getElementById('eg-d-' + k); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.setAttribute('data-hit', ''); setTimeout(function () { el.removeAttribute('data-hit'); }, 1800); }
    }
  }
  var qT = null;
  function onInput(e) { if (e.target.id !== 'eg-q') return; clearTimeout(qT); qT = setTimeout(function () { E.q = e.target.value; E.shown = PAGE; paintList(); }, 120); }
  function mount(root) {
    E.root = root.querySelector('#eg') || root;
    if (!E.root._wired) { E.root._wired = true; E.root.addEventListener('click', onClick); E.root.addEventListener('input', onInput); }
    E.grown = false; paint(); poll(true);
    clearInterval(E.timer);
    E.timer = setInterval(function () {
      if (!E.root || !document.body.contains(E.root)) { clearInterval(E.timer); E.timer = null; return; }
      poll(); paintHead();
    }, POLL);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && E.root && document.body.contains(E.root) && Date.now() - E.at > POLL) poll(); });

  // ── styles: chrome tokens only ─────────────────────────────────────────────────────────
  var css = [
    '.eg{display:flex;flex-direction:column;gap:22px;max-width:1240px}',
    '.eg-hd{display:flex;flex-wrap:wrap;align-items:flex-end;gap:16px 28px}',
    '.eg-hd-t{flex:1 1 520px;min-width:0}',
    '.eg-hd .lede{max-width:70ch}',
    '.eg-live{display:flex;align-items:center;gap:12px}',
    '.eg-live-t b{display:block;font:500 14px/1.2 var(--ps-font)}',
    '.eg-live-t small{display:block;margin-top:2px;font:400 12.5px/1.2 var(--ps-font);color:var(--ps-dim);font-variant-numeric:tabular-nums}',
    '.eg-dot{position:relative;display:inline-grid;place-items:center;width:12px;height:12px;flex:none}',
    '.eg-dot i{width:8px;height:8px;border-radius:50%;background:var(--ps-dim)}',
    '.eg-dot[data-s="ok"] i{background:var(--ps-good)}.eg-dot[data-s="warn"] i,.eg-dot[data-s="run"] i{background:var(--ps-warn)}.eg-dot[data-s="bad"] i{background:var(--ps-bad)}.eg-dot[data-s="old"] i{background:var(--ps-ink-2)}',
    '.eg-dot[data-s="ok"]::after{content:"";position:absolute;inset:-3px;border-radius:50%;box-shadow:0 0 0 1.5px var(--ps-good);opacity:0;animation:egping 3s cubic-bezier(.16,1,.3,1) infinite}',
    '.eg-dot[data-busy] i{animation:egbusy 1s ease-in-out infinite alternate}',
    '@keyframes egping{0%{opacity:.7;transform:scale(.6)}70%,100%{opacity:0;transform:scale(1.5)}}',
    '@keyframes egbusy{to{opacity:.35}}',
    /* in production */
    '.eg-now{display:flex;flex-direction:column;gap:2px;padding:6px;border-radius:16px;background:var(--ps-card);box-shadow:inset 0 0 0 1px var(--ps-hair)}',
    '.eg-now-r{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;min-height:48px;padding:6px 14px;border-radius:12px}',
    '.eg-now-n{background:var(--ps-fill);font:400 13.5px/1.4 var(--ps-font);color:var(--ps-ink-2)}',
    '.eg-now-l{font:600 14px/1.3 var(--ps-font);margin-right:4px}',
    '.eg-now-m{flex:1 1 280px;min-width:0;font:500 15px/1.35 var(--ps-font);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.eg-now-r small{font:400 13px/1.3 var(--ps-font);color:var(--ps-ink-2);font-variant-numeric:tabular-nums}',
    '.eg-now-e{margin:0;padding:12px 14px;font:400 14px/1.5 var(--ps-font);color:var(--ps-ink-2)}',
    '.eg-sk{height:48px;border-radius:12px;background:var(--ps-fill);animation:egbusy 1.2s ease-in-out infinite alternate}',
    /* services */
    '.eg-sv{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;border-radius:16px;overflow:hidden;background:var(--ps-hair);box-shadow:inset 0 0 0 1px var(--ps-hair)}',
    '.eg-s{display:flex;align-items:flex-start;gap:10px;padding:14px 16px;background:var(--ps-card);min-width:0}',
    '.eg-s .eg-dot{margin-top:3px}',
    '.eg-s > span:last-child{min-width:0}',
    '.eg-s b{display:block;font:500 14px/1.3 var(--ps-font)}',
    '.eg-s small{display:block;margin-top:3px;font:400 12.5px/1.35 var(--ps-font);color:var(--ps-ink-2);font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.eg-s[data-s="bad"] small{color:var(--ps-bad)}',
    /* the strip */
    '.eg-days .sh{margin-bottom:10px}',
    '.eg-strip{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:2px;align-items:end;height:84px;padding:10px 10px 0;border-radius:16px 16px 0 0;background:var(--ps-fill)}',
    '.eg-day{position:relative;height:100%;min-width:0;padding:0;border:0;background:none;cursor:pointer;display:flex;align-items:flex-end}',
    '.eg-day i{display:block;width:100%;height:var(--h);min-height:0;border-radius:3px 3px 1px 1px;background:var(--ps-link);opacity:.55;transform-origin:bottom;transition:opacity var(--ps-motion) var(--ps-ease)}',
    '.eg-day[data-dep] i{opacity:.95}',
    '.eg-day:disabled{cursor:default}',
    '.eg-day:not(:disabled):hover i{opacity:1}',
    '.eg-day:focus-visible{outline:2px solid var(--ps-ink);outline-offset:2px;border-radius:3px}',
    '.eg-strip[data-grow] .eg-day i{animation:eggrow 700ms cubic-bezier(.16,1,.3,1) both;animation-delay:calc(var(--i) * 6ms)}',
    '@keyframes eggrow{from{transform:scaleY(0)}}',
    '.eg-months{position:relative;height:28px;padding:0 10px;border-radius:0 0 16px 16px;background:var(--ps-fill)}',
    '.eg-key{display:flex;flex-wrap:wrap;gap:6px 18px;margin:10px 2px 0;font:400 12.5px/1.3 var(--ps-font);color:var(--ps-ink-2)}',
    '.eg-key span{display:inline-flex;align-items:center;gap:7px}',
    '.eg-key i{width:10px;height:10px;border-radius:2px;background:var(--ps-link);opacity:.55}',
    '.eg-key i[data-k="d"]{opacity:.95}',
    '.eg-key-n{color:var(--ps-dim)}',
    '.eg-pre{font-weight:400;color:var(--ps-ink-2)}',
    '.eg-months span{position:absolute;top:10px;left:calc(10px + (100% - 20px) * var(--i) / var(--n));font:500 12px/1 var(--ps-font);color:var(--ps-ink-2);white-space:nowrap}',
    /* timeline + built */
    '.eg-cols{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:28px 40px;align-items:start;margin-top:6px}',
    '.eg-h2{margin:0;font:500 18px/1.3 var(--ps-font);letter-spacing:-.005em}',
    '.eg-tl-bar{display:flex;align-items:center;gap:12px;margin-bottom:12px;scroll-margin-top:88px}',
    '.eg-q{position:relative;display:flex;align-items:center;flex:0 1 280px}',
    '.eg-q svg.i{position:absolute;left:12px;width:17px;height:17px;color:var(--ps-ink-2);pointer-events:none}',
    '.eg-q input{width:100%;height:36px;box-sizing:border-box;padding:0 14px 0 38px;border:0;border-radius:var(--ps-pill);background:var(--ps-fill);color:var(--ps-ink);font:400 14px/1 var(--ps-font)}',
    '.eg-q input::placeholder{color:var(--ps-dim)}',
    '.eg-q input:focus-visible{outline:2px solid var(--ps-ink);outline-offset:2px}',
    '.eg-f{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}',
    '.eg-f button{display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 12px;border:0;border-radius:var(--ps-pill);background:var(--ps-fill);color:var(--ps-ink-2);font:500 13px/1 var(--ps-font);cursor:pointer;transition:background-color var(--ps-motion) var(--ps-ease),color var(--ps-motion) var(--ps-ease)}',
    '.eg-f button:hover{background:var(--ps-fill-h);color:var(--ps-ink)}',
    '.eg-f button[aria-pressed="true"]{background:var(--ps-fill-on);color:var(--ps-ink)}',
    '.eg-f button small{font:400 12px/1 var(--ps-font);color:var(--ps-dim);font-variant-numeric:tabular-nums}',
    '.eg-f button[aria-pressed="true"] small{color:var(--ps-ink-2)}',
    '.eg-f button:focus-visible,.eg-built button:focus-visible,.eg-sha:focus-visible{outline:2px solid var(--ps-ink);outline-offset:2px}',
    '.eg-c{list-style:none;margin:0;padding:0;position:relative}',
    '.eg-c::before{content:"";position:absolute;left:62px;top:52px;bottom:12px;width:1px;background:var(--ps-hair)}',
    '.eg-dh{position:sticky;top:64px;z-index:2;display:flex;align-items:baseline;gap:10px;margin:18px 0 4px;padding:10px 0 8px;background:var(--ps-app);font:600 14px/1.3 var(--ps-font);scroll-margin-top:72px}',
    '.eg-dh small{font:400 13px/1.3 var(--ps-font);color:var(--ps-dim);font-variant-numeric:tabular-nums}',
    '.eg-dh[data-hit] span{color:var(--ps-link)}',
    '.eg-r{position:relative;display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:4px 28px;align-items:start;padding:11px 12px 11px 0;border-radius:12px;transition:background-color 1.6s var(--ps-ease)}',
    '.eg-r::before{content:"";position:absolute;left:59px;top:17px;width:7px;height:7px;border-radius:50%;background:var(--ps-app);box-shadow:inset 0 0 0 1.5px var(--ps-line)}',
    '.eg-r[data-dep]::before{background:var(--ps-good);box-shadow:none}',
    '.eg-r:hover{background:var(--ps-card)}',
    '.eg-r[data-new]{animation:egnew 2.4s cubic-bezier(.16,1,.3,1)}',
    '@keyframes egnew{0%{background:var(--ps-fill-on);transform:translateY(-6px)}25%{transform:none}100%{background:transparent}}',
    '.eg-r time{padding-top:2px;font:400 13px/1.3 var(--ps-font);color:var(--ps-dim);font-variant-numeric:tabular-nums;text-align:right}',
    '.eg-r-m{min-width:0;padding-left:14px}',
    '.eg-r-m b{display:block;font:500 14.5px/1.4 var(--ps-font);color:var(--ps-ink);text-wrap:pretty}',
    '.eg-r-m small{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-top:3px;font:400 13px/1.45 var(--ps-font);color:var(--ps-ink-2);max-width:78ch}',
    '.eg-r-x{display:flex;align-items:center;gap:8px;padding-top:1px}',
    '.eg-tag{display:inline-flex;align-items:center;height:24px;padding:0 9px;border-radius:var(--ps-pill);background:var(--ps-fill);font:500 12px/1 var(--ps-font);color:var(--ps-ink-2);white-space:nowrap}',
    '.eg-d{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 9px 0 8px;border-radius:var(--ps-pill);font:500 12px/1 var(--ps-font);color:var(--ps-ink);box-shadow:inset 0 0 0 1px var(--ps-line);white-space:nowrap}',
    '.eg-d i{width:7px;height:7px;border-radius:50%;background:var(--ps-ink-2)}',
    '.eg-d[data-s="ok"] i{background:var(--ps-good)}.eg-d[data-s="run"] i{background:var(--ps-warn);animation:egbusy .8s ease-in-out infinite alternate}.eg-d[data-s="bad"] i{background:var(--ps-bad)}',
    '.eg-d[data-s="ok"]{background:var(--ps-good-q);box-shadow:none}.eg-d[data-s="bad"]{background:var(--ps-bad-q);box-shadow:none}.eg-d[data-s="run"]{background:var(--ps-warn-q);box-shadow:none}',
    '.eg-d[data-s="old"]{color:var(--ps-ink-2)}',
    '.eg-sha{font:500 12.5px/1 var(--ps-font);font-variant-numeric:tabular-nums;letter-spacing:.02em;color:var(--ps-link);text-decoration:none;text-underline-offset:3px;border-radius:4px}',
    '.eg-sha:hover{text-decoration:underline}',
    '.eg-more{display:flex;align-items:center;gap:14px;margin:18px 0 0 76px}',
    '.eg-more small,.eg-end{font:400 13px/1.4 var(--ps-font);color:var(--ps-dim);font-variant-numeric:tabular-nums}',
    '.eg-end{margin:18px 0 0 76px}',
    '.eg-sk-l{display:grid;gap:10px}.eg-sk-l i{display:block;height:46px;border-radius:12px;background:var(--ps-fill);animation:egbusy 1.2s ease-in-out infinite alternate}',
    '.eg-built{display:flex;flex-direction:column;gap:14px}',
    '.eg-built > .eg-h2 + .eg-ep,.eg-built > .eg-h2 + .eg-b{margin-top:-2px}',
    '#eg-ep-h{margin-top:14px}',
    '.eg-b{list-style:none;margin:0;padding:0;border-radius:16px;background:var(--ps-card);box-shadow:inset 0 0 0 1px var(--ps-hair);overflow:hidden}',
    '.eg-b li + li{box-shadow:inset 0 1px 0 var(--ps-hair)}',
    '.eg-b button{display:grid;gap:4px;width:100%;padding:14px 18px;border:0;background:none;color:var(--ps-ink);text-align:left;cursor:pointer;transition:background-color var(--ps-motion) var(--ps-ease)}',
    '.eg-b button:hover{background:var(--ps-card-h)}',
    '.eg-b b{font:500 14.5px/1.3 var(--ps-font)}',
    '.eg-b code{font:400 12.5px/1.4 var(--ps-font);color:var(--ps-link);overflow-wrap:anywhere}',
    '.eg-b span{font:400 13px/1.45 var(--ps-font);color:var(--ps-ink-2)}',
    '.eg-b small{margin-top:2px;font:400 12.5px/1.3 var(--ps-font);color:var(--ps-dim);font-variant-numeric:tabular-nums}',
    '.eg-links{display:flex;flex-wrap:wrap;gap:8px}',
    '.eg-ep{list-style:none;margin:0;padding:0;border-radius:16px;background:var(--ps-card);box-shadow:inset 0 0 0 1px var(--ps-hair)}',
    '.eg-ep li{display:grid;grid-template-columns:12px minmax(0,1fr);gap:12px;padding:12px 18px}',
    '.eg-ep li + li{box-shadow:inset 0 1px 0 var(--ps-hair)}',
    '.eg-ep .eg-dot{margin-top:4px}',
    '.eg-ep-t{display:grid;gap:3px;min-width:0}',
    '.eg-ep-p{display:flex;align-items:baseline;gap:8px;min-width:0}',
    '.eg-ep-p small{flex:none;font:600 11.5px/1 var(--ps-font);color:var(--ps-ink-2)}',
    '.eg-ep code,.eg-note code{font:500 13px/1.35 var(--ps-font);color:var(--ps-link);overflow-wrap:anywhere;user-select:all}',
    '.eg-ep-t > span:not(.eg-ep-p){font:400 13px/1.45 var(--ps-font);color:var(--ps-ink-2)}',
    '.eg-ep-t > small{font:400 12.5px/1.3 var(--ps-font);color:var(--ps-dim)}',
    '.eg-note{margin:0;font:400 12.5px/1.5 var(--ps-font);color:var(--ps-dim)}',
    '@media (max-width:1100px){.eg-cols{grid-template-columns:minmax(0,1fr)}.eg-built{position:static}.eg-sv{grid-template-columns:repeat(2,minmax(0,1fr))}}',
    '@media (max-width:640px){.eg-sv{grid-template-columns:minmax(0,1fr)}.eg-r{grid-template-columns:44px minmax(0,1fr);gap:6px 14px}.eg-r-x{grid-column:2;padding-left:14px;flex-wrap:wrap}.eg-c::before{left:56px}.eg-r::before{left:53px}.eg-more,.eg-end{margin-left:58px}.eg-strip{height:64px;gap:1px;padding:8px 8px 0}.eg-months{padding:0 8px}.eg-tl-bar{flex-wrap:wrap}.eg-q{flex:1 1 100%}.eg-dh{top:56px}}',
    '@media (prefers-reduced-motion:reduce){.eg-dot[data-s="ok"]::after,.eg-dot[data-busy] i,.eg-d[data-s="run"] i,.eg-sk,.eg-sk-l i{animation:none}.eg-strip[data-grow] .eg-day i,.eg-r[data-new]{animation:none}}'
  ].join('\n');
  var st = document.createElement('style'); st.id = 'engine-css'; st.textContent = css; document.head.appendChild(st);

  window.providentEngine = { shell: shell, mount: mount };
})();
