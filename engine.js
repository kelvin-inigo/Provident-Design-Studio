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
  var E = { commits: [], deploys: [], rate: null, err: '', at: 0, busy: false, total: 0, only: 'all', area: '', q: '', shown: PAGE,
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
      // only real commit ids reach a link or an element id
      var hex = function (x) { return x && /^[0-9a-f]{40}$/.test(x.sha); };
      r.commits = (r.commits || []).filter(hex); r.deploys = (r.deploys || []).filter(function (d) { return /^[0-9a-f]{40}$/.test(d.sha || ''); });
      if (r.mapAt && !hex(r.mapAt)) r.mapAt = null;
      var before = {}; E.commits.forEach(function (c) { before[c.sha] = 1; });
      if (r.full) E.commits = r.commits || [];
      else if (r.commits && r.commits.length) E.commits = r.commits.concat(E.commits);
      if (have) (r.commits || []).forEach(function (c) { if (!before[c.sha]) E.fresh[c.sha] = Date.now(); });
      E.deploys = r.deploys || E.deploys; E.rate = r.rate || null; E.err = r.err || ''; E.total = r.total || E.commits.length;
      E.repo = r.repo || ''; E.at = r.at || Date.now(); if (r.links) E.links = r.links; if (r.mapAt) E.mapAt = r.mapAt;
      var lv = liveDeploy();
      if (lv && E.liveSha && lv.sha !== E.liveSha) {
        var lc = E.commits.filter(function (c) { return c.sha === lv.sha; })[0];
        toast('ok', 'PDS updated', 'Now live: ' + (lc ? titleOf(lc) : lv.sha.slice(0, 7)) + '. The map was read again.', 'deploy');
        loadMap(lv.sha);
      }
      if (lv) E.liveSha = lv.sha;
      try { localStorage.setItem(LS, JSON.stringify({ commits: E.commits.map(function (c) { return { sha: c.sha, msg: c.msg, at: c.at, by: c.by, login: c.login }; }), deploys: E.deploys, at: E.at })); } catch (x) {}
    }).catch(function (e) { E.err = (e && e.message) || 'The engine feed could not be read.'; E.errAt = Date.now(); })
      .then(function () { E.busy = false; paint(); alerts(); });
    health();
  }
  // the services, timed from this browser
  // the connections the browser itself makes (the map's own probes)
  var MAC_LS = 'provident-engine-mac';
  function hubOrigin() {
    var u = ''; try { u = (JSON.parse(localStorage.getItem('provident-ops-endpoint') || '{}') || {}).url || ''; } catch (x) {}
    u = String(u).trim().replace(/\/api\/imports\/?$/, '').replace(/\/+$/, '');
    return /^https?:\/\/[^/]+$/.test(u) ? u : 'https://provident-content-hub.ngrok-free.dev';
  }
  function timed(url, opt) {
    var t0 = performance.now(), ac = new AbortController(), to = setTimeout(function () { ac.abort(); }, 8000);
    return fetch(url, Object.assign({ cache: 'no-store', signal: ac.signal }, opt || {})).then(function (r) { clearTimeout(to); return { r: r, ms: Math.round(performance.now() - t0) }; },
      function (e) { clearTimeout(to); throw e; });
  }
  function linkProbes(mac) {
    var D = window.providentDrive, done = function () { paintMap(); alerts(); };
    if (D && D.valid && D.valid()) timed(D.base() + '/drive/v3/about?fields=user(emailAddress)', { headers: { Authorization: 'Bearer ' + D.tok.at } })
      .then(function (x) { E.health.drive = x.r.ok ? { s: 'ok', t: 'Signed in · ' + x.ms + ' ms' } : { s: x.r.status === 401 ? 'warn' : 'bad', t: x.r.status === 401 ? 'Sign-in ran out on this computer' : 'HTTP ' + x.r.status }; })
      .catch(function () { E.health.drive = { s: 'bad', t: 'Not reachable' }; }).then(done);
    else { E.health.drive = { s: 'off', t: 'Not signed in to Drive on this computer' }; }
    timed('https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=home')
      .then(function (x) { E.health.translate = x.r.ok ? { s: 'ok', t: 'Answering · ' + x.ms + ' ms' } : { s: 'warn', t: 'HTTP ' + x.r.status }; })
      .catch(function () { E.health.translate = { s: 'bad', t: 'Not reachable' }; }).then(done);
    var hub = hubOrigin(), hh = window.StudioBase && StudioBase.hubTunnel ? StudioBase.hubTunnel(hub, {}) : { 'ngrok-skip-browser-warning': '1' };
    // the hub's own list (the route OPS's From the hub reads; it answers CORS): 200, or 401 without
    // a key, both mean the hub is up behind its tunnel
    var hn = hub.replace(/^https?:\/\//, '');
    timed(hub + '/api/imports', { headers: hh, mode: 'cors', credentials: 'omit' })
      .then(function (x) { E.health.hub = x.r.ok || x.r.status === 401 || x.r.status === 403 ? { s: 'ok', t: 'Up · ' + x.ms + ' ms' } : { s: 'bad', t: 'HTTP ' + x.r.status + ' from ' + hn }; })
      .catch(function () {
        return timed(hub + '/api/imports', { headers: hh, mode: 'no-cors', credentials: 'omit' })
          .then(function () { E.health.hub = { s: 'warn', t: 'Tunnel answers; the hub didn’t reply to this browser (ngrok may ask for a sign-in)' }; });
      })
      .catch(function () { E.health.hub = { s: 'bad', t: 'Not reachable at ' + hn }; }).then(done);
    if (!mac) return;
    // this Mac's helpers: CORS where they send it, else an opaque answer still proves they run
    [['rembg', 'http://127.0.0.1:7311/health'], ['ps', 'http://127.0.0.1:7312/health'], ['casv', 'http://localhost:8794/api/outbox/list'], ['mcp', 'http://127.0.0.1:7313/health']].forEach(function (x) {
      E.health[x[0]] = { s: 'wait', t: 'Checking…' };
      timed(x[1]).then(function (y) { E.health[x[0]] = y.r.ok ? { s: 'ok', t: 'Running · ' + y.ms + ' ms' } : { s: 'warn', t: 'HTTP ' + y.r.status }; })
        .catch(function () { return timed(x[1], { mode: 'no-cors' }).then(function (y) { E.health[x[0]] = { s: 'ok', t: 'Running · ' + y.ms + ' ms' }; }); })
        .catch(function () { E.health[x[0]] = { s: 'off', t: 'Not running on this Mac' }; }).then(done);
    });
  }
  function health() {
    var base = (window.StudioBase && StudioBase.shareBase ? StudioBase.shareBase() : '');
    var mac = false; try { mac = localStorage.getItem(MAC_LS) === '1'; } catch (x) {}
    linkProbes(mac);
    function probe(k, url, read) {
      var t0 = performance.now();
      fetch(url, { cache: 'no-store' }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return [r, j]; }); })
        .then(function (x) { E.health[k] = read(x[0], x[1], Math.round(performance.now() - t0)); })
        .catch(function () { E.health[k] = { s: 'bad', t: 'Not reachable' }; })
        .then(function () { paintServices(); alerts(); });
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
        '<div class="eg-hd-a"><div class="eg-live" id="eg-live"></div>' +
        '<div class="eg-pop"><button class="b b-g" type="button" data-eg="share" aria-expanded="false" aria-controls="eg-share">' + ico('out') + 'Share</button><div class="eg-share" id="eg-share" hidden></div></div>' +
        '<button class="b b-q" type="button" data-eg="alerts" id="eg-al-b"></button></div></header>' +
        '<div class="eg-down" id="eg-down" role="alert" hidden></div>' +
      '<section class="eg-now" id="eg-now" aria-label="In production"></section>' +
      '<section class="eg-sv" id="eg-sv" aria-label="Services"></section>' +
      '<section class="eg-map-s" aria-labelledby="eg-map-h"><div class="sh eg-map-hd"><span id="eg-map-h">How it connects</span><small id="eg-map-n"></small><span class="sp"></span>' +
        '<button class="b b-g" type="button" data-eg="mac" id="eg-mac-b">' + ico('sync') + 'Check this Mac</button></div>' +
        '<div class="eg-map" id="eg-map"><svg class="eg-wires" id="eg-wires" aria-hidden="true"></svg></div>' +
        '<p class="eg-key eg-map-key"><span><i class="eg-w" data-s="ok"></i>Working</span><span><i class="eg-w" data-s="warn"></i>Slow or partly working</span><span><i class="eg-w" data-s="bad"></i>Not working</span><span><i class="eg-w" data-s="off"></i>Not set up, or not running on this Mac</span><span class="eg-key-n">Hover a box to follow its lines.</span></p></section>' +
      '<section class="eg-days" aria-labelledby="eg-days-h"><div class="sh"><span id="eg-days-h">Every day since the first commit</span><small id="eg-days-n"></small></div><div class="eg-strip" id="eg-strip"></div><div class="eg-months" id="eg-months"></div>' +
        '<p class="eg-key"><span><i data-k="c"></i>Commits that day</span><span><i data-k="d"></i>Shipped to Vercel that day</span><span class="eg-key-n">GitHub keeps the last 100 deployments; older days show commits only.</span></p></section>' +
      '<div class="eg-cols"><section class="eg-tl" aria-labelledby="eg-tl-h">' +
        '<div class="eg-tb" id="eg-tb"><div class="eg-tb-r1"><h2 class="eg-h2" id="eg-tl-h">Timeline</h2><span class="eg-tb-n" id="eg-tl-n" aria-live="polite"></span><span class="sp"></span>' +
          '<label class="eg-q">' + ico('search') + '<input id="eg-q" type="search" placeholder="Find a commit" aria-label="Find a commit" autocomplete="off"></label></div>' +
        '<div class="eg-tb-r2"><div class="eg-seg" id="eg-seg" role="group" aria-label="Which commits"></div><span class="eg-tb-div" aria-hidden="true"></span><div class="eg-f" id="eg-f" role="group" aria-label="Area"></div></div></div>' +
        '<div id="eg-list"></div></section>' +
      '<aside class="eg-built" aria-labelledby="eg-b-h"><h2 class="eg-h2" id="eg-b-h">How PDS is built</h2><ul class="eg-b" id="eg-b"></ul>' +
        '<h2 class="eg-h2" id="eg-ep-h">Endpoints</h2><ul class="eg-ep" id="eg-ep" aria-labelledby="eg-ep-h"></ul>' +
        '<div class="eg-links"><a class="b b-g" href="docs/architecture/PDS-Architecture.pdf" target="_blank" rel="noopener noreferrer">' + ico('file') + 'Architecture reference</a>' +
        '<a class="b b-q" href="' + REPO_URL + '" target="_blank" rel="noopener noreferrer">' + ico('out') + 'Repository</a></div>' +
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
      (live ? depChip(live, true) + '<a class="eg-sha" href="' + REPO_URL + '/commit/' + esc(live.sha) + '" target="_blank" rel="noopener noreferrer">' + esc(live.sha.slice(0, 7)) + '</a>' +
        '<b class="eg-now-m">' + esc(c ? titleOf(c) : 'Commit ' + live.sha.slice(0, 7)) + '</b><small>deployed ' + esc(ago(live.stateAt || live.at)) + '</small>' +
        (/^https:\/\/[^\s"'<>]+$/.test(live.url || '') ? '<a class="b b-l" href="' + esc(live.url) + '" target="_blank" rel="noopener noreferrer">Open the site</a>' : '')
        : '<b class="eg-now-m">No live deployment reported</b>') + '</div>' +
      (newer ? '<div class="eg-now-r eg-now-n">' + depChip(newer) + '<a class="eg-sha" href="' + REPO_URL + '/commit/' + esc(newer.sha) + '" target="_blank" rel="noopener noreferrer">' + esc(newer.sha.slice(0, 7)) + '</a><span>Started ' + esc(ago(newer.at)) + '; it replaces production when it is ready.</span></div>' : '') +
      (bad && !newer ? '<div class="eg-now-r eg-now-n">' + depChip(bad) + '<a class="eg-sha" href="' + REPO_URL + '/commit/' + esc(bad.sha) + '" target="_blank" rel="noopener noreferrer">' + esc(bad.sha.slice(0, 7)) + '</a><span>The newest deployment failed ' + esc(ago(bad.stateAt || bad.at)) + '; production stays on the one above.</span></div>' : '');
  }
  function paintServices() {
    var S = document.getElementById('eg-sv'); if (!S) return;
    var r = E.rate && E.rate.left != null ? E.rate : null, gh = E.err ? { s: E.commits.length ? 'warn' : 'bad', t: E.err } : r ? { s: r.left < (r.limit || 60) * 0.1 ? 'warn' : 'ok', t: r.left.toLocaleString() + ' of ' + (r.limit || 0).toLocaleString() + ' left this hour' } : null;
    var rows = [['server', 'Studio server', E.health.server], ['gauth', 'Google sign-in', E.health.gauth], ['store', 'Share store', E.health.store], ['gh', 'GitHub feed', gh]];
    S.innerHTML = rows.map(function (x) {
      var v = x[2] || { s: 'wait', t: 'Checking…' };
      return '<div class="eg-s" data-s="' + v.s + '"><span class="eg-dot" data-s="' + v.s + '"><i></i></span><span><b>' + x[1] + '</b><small title="' + esc(v.t) + '">' + esc(v.t) + '</small></span></div>';
    }).join('');
    paintEndpoints(); paintMap();
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
  // ── HOW IT CONNECTS (2026-11-18, by request): every app and outside service PDS talks to, in
  // lanes, with a line for each connection coloured by its live check. Boxes are laid out by CSS;
  // the lines are drawn over them from the boxes' real positions (and again on resize).
  // THE MAP IS DATA (2026-11-18, by request: "make sure this diagram updates every time a push and
  // commit affects it"): engine-map.json at the site root, written in the same pass as any change
  // that adds, removes or rewires a part (CLAUDE.md's standing rule). It is fetched on mount, again
  // whenever a new production deployment goes live, and the server reports the commit that last
  // changed it (op engine, mapAt).
  var LANES = [], NODES = [], WIRES = [], MAPV = '';
  function takeMap(m) {
    var ok = m && Array.isArray(m.lanes) && Array.isArray(m.nodes) && Array.isArray(m.wires);
    if (!ok) throw new Error('engine-map.json is not a map');
    var str = function (v) { return String(v == null ? '' : v).slice(0, 200); };
    LANES = m.lanes.map(function (l) { return [str(l.id), str(l.name), str(l.about)]; });
    NODES = m.nodes.map(function (n) { return { id: str(n.id).replace(/[^\w-]/g, ''), l: str(n.lane), n: str(n.name), s: str(n.about), k: str(n.check), own: !!n.own }; });
    var idc = function (v) { return str(v).replace(/[^\w-]/g, ''); };
    WIRES = m.wires.map(function (w) { return [idc(w.from), idc(w.to), str(w.check), str(w.carries)]; });
  }
  function loadMap(v) {
    return fetch('engine-map.json?v=' + encodeURIComponent(v || Date.now()), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (m) { takeMap(m); MAPV = v || ''; E.mapErr = ''; paintMap(); alerts(); })
      .catch(function (e) { E.mapErr = 'The map could not be read (' + ((e && e.message) || 'error') + ').'; paintMap(); });
  }
  // every state that reaches an attribute is one of these words, whatever a check returned
  var STATES = { ok: 1, warn: 1, bad: 1, off: 1, wait: 1, old: 1 };
  function stateOf(k) { var v = stateOf0(k) || {}; return { s: STATES[v.s] ? v.s : 'wait', t: String(v.t == null ? '' : v.t).slice(0, 240) }; }
  // what the server reports (Upstash, Anthropic, Roam, its keys) is only as good as the server's
  // last answer: while the studio server or the engine feed is failing, those boxes say unknown
  // instead of repeating an old "Answering"
  var VIA_SERVER = { store: 1, anthropic: 1, roam: 1, hubkeys: 1 };
  function serverDown() { var h = E.health.server; return !!((h && h.s === 'bad') || (E.err && E.errAt && (!E.at || E.errAt > E.at))); }
  function stateOf0(k) {
    var L = E.links || {};
    if (VIA_SERVER[k] && serverDown()) return { s: 'wait', t: 'Unknown while the studio server is not answering' };
    if (k === 'self') return { s: 'ok', t: 'Open' };
    if (k === 'gh') return E.err ? { s: E.commits.length ? 'warn' : 'bad', t: E.err } : E.at ? { s: 'ok', t: E.rate && E.rate.left != null ? E.rate.left + ' of ' + E.rate.limit + ' reads left' : 'Answering' } : { s: 'wait', t: 'Checking…' };
    if (k === 'google') return E.at && !E.err ? { s: 'ok', t: 'Your sign-in was confirmed' } : E.health.server ? E.health.server : { s: 'wait', t: 'Checking…' };
    if (k === 'store') return L.store || E.health.store || { s: 'wait', t: 'Checking…' };
    if (k === 'anthropic' || k === 'roam') return L[k] || { s: 'wait', t: E.at ? 'Not reported' : 'Checking…' };
    if (k === 'hubkeys') { var ks = L.keys || {}; return L.keys ? (ks.HUB_PUSH_KEY ? { s: 'ok', t: 'Push key set' } : { s: 'off', t: 'HUB_PUSH_KEY not set' }) : { s: 'wait', t: 'Checking…' }; }
    if (k === 'grok') { var m = E.health.mcp; return m ? (m.s === 'ok' ? { s: 'ok', t: 'remote.py is running here' } : { s: 'off', t: 'Runs from the office Mac' }) : { s: 'off', t: 'Runs from the office Mac' }; }
    if (['rembg', 'ps', 'casv', 'mcp'].indexOf(k) >= 0 && !E.health[k]) return { s: 'off', t: 'Not checked: press Check this Mac' };
    return E.health[k] || { s: 'wait', t: 'Checking…' };
  }
  function paintMap() {
    var M = document.getElementById('eg-map'); if (!M) return;
    var html = LANES.map(function (ln) {
      return '<div class="eg-lane" data-l="' + ln[0] + '"><div class="eg-lane-h"><b>' + ln[1] + '</b><small>' + ln[2] + '</small></div><div class="eg-lane-b">' +
        NODES.filter(function (n) { return n.l === ln[0]; }).map(function (n) {
          var st = stateOf(n.k);
          return '<div class="eg-n" id="eg-n-' + n.id + '" data-n="' + n.id + '" data-s="' + st.s + '"' + (n.own ? ' data-own' : '') + ' tabindex="0">' +
            '<b>' + esc(n.n) + '</b><small>' + esc(n.s) + '</small><span class="eg-n-st"><span class="eg-dot" data-s="' + st.s + '"><i></i></span>' + esc(st.t) + '</span></div>';
        }).join('') + '</div></div>';
    }).join('');
    var svg = document.getElementById('eg-wires');
    Array.prototype.slice.call(M.querySelectorAll('.eg-lane')).forEach(function (x) { x.remove(); });
    M.insertAdjacentHTML('beforeend', html);
    if (svg) M.appendChild(svg);
    var good = WIRES.filter(function (w) { return stateOf(w[2]).s === 'ok'; }).length, bad = WIRES.filter(function (w) { return stateOf(w[2]).s === 'bad'; }).length;
    var mn = document.getElementById('eg-map-n'), ma = E.mapAt;
    if (mn) mn.textContent = E.mapErr || (NODES.length + ' parts · ' + WIRES.length + ' connections · ' + good + ' working' + (bad ? ' · ' + bad + ' not working' : '') +
      (ma && ma.sha ? ' · map last changed ' + ago(ma.at) + ' in ' + ma.sha.slice(0, 7) : ''));
    var mb = document.getElementById('eg-mac-b'); if (mb) { var on = false; try { on = localStorage.getItem(MAC_LS) === '1'; } catch (x) {} mb.lastChild.textContent = on ? 'Check this Mac again' : 'Check this Mac'; }
    setTimeout(drawWires, 0);
  }
  function drawWires() {
    var M = document.getElementById('eg-map'), svg = document.getElementById('eg-wires'); if (!M || !svg) return;
    var box = M.getBoundingClientRect(); svg.setAttribute('width', box.width); svg.setAttribute('height', box.height);
    var at = function (id) { var e = document.getElementById('eg-n-' + id); if (!e) return null; var r = e.getBoundingClientRect(); return { x: r.left - box.left + r.width / 2, t: r.top - box.top, b: r.bottom - box.top, l: r.left - box.left, r: r.right - box.left, m: r.top - box.top + r.height / 2 }; };
    svg.innerHTML = WIRES.map(function (w, i) {
      var a = at(w[0]), b = at(w[1]); if (!a || !b) return '';
      // the direction from where the boxes really sit: below, above, or side by side in a row
      var st = stateOf(w[2]).s, d;
      if (b.t >= a.b - 2 || a.t >= b.b - 2) {
        var up = b.b <= a.t + 2, y1 = up ? a.t : a.b, y2 = up ? b.b : b.t, dy = Math.max(24, Math.abs(y2 - y1) * .45) * (up ? -1 : 1);
        d = 'M' + a.x + ' ' + y1 + ' C' + a.x + ' ' + (y1 + dy) + ' ' + b.x + ' ' + (y2 - dy) + ' ' + b.x + ' ' + y2;
      } else {
        var right = b.l >= a.r, x1 = right ? a.r : a.l, x2 = right ? b.l : b.r, dx = Math.max(16, Math.abs(x2 - x1) * .45) * (right ? 1 : -1);
        d = 'M' + x1 + ' ' + a.m + ' C' + (x1 + dx) + ' ' + a.m + ' ' + (x2 - dx) + ' ' + b.m + ' ' + x2 + ' ' + b.m;
      }
      return '<path class="eg-wire" data-s="' + st + '" data-a="' + w[0] + '" data-b="' + w[1] + '" d="' + d + '"><title>' + esc(w[3] + ' · ' + stateOf(w[2]).t) + '</title></path>';
    }).join('');
  }
  function focusNode(id) {
    var M = document.getElementById('eg-map'); if (!M) return;
    M.toggleAttribute('data-focus', !!id);
    Array.prototype.forEach.call(M.querySelectorAll('.eg-wire'), function (p) { p.toggleAttribute('data-on', !!id && (p.dataset.a === id || p.dataset.b === id)); });
    Array.prototype.forEach.call(M.querySelectorAll('.eg-n'), function (n) {
      var linked = !id || n.dataset.n === id || WIRES.some(function (w) { return (w[0] === id && w[1] === n.dataset.n) || (w[1] === id && w[0] === n.dataset.n); });
      n.toggleAttribute('data-dim', !linked);
    });
  }
  // ── ALERTS (2026-11-18, by request: "notification if something is disconnected") ───────────
  // Whenever Home is open for the admin or an AI Engineer (watch(), below), the checks run every
  // minute. A connection that turns red raises a toast on any page of the home, a red count on the
  // Engine link and in the tab title, a banner on this page, and, when the person turned it on
  // here, a desktop notification. One that recovers says so once. Amber and grey never alert.
  // What was last said is kept in localStorage (provident-engine-alerts), so a reload repeats nothing.
  var AL_LS = 'provident-engine-alerts', NOTE_LS = 'provident-engine-notify';
  function readJ(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (x) { return null; } }
  function down() {
    return NODES.filter(function (n) { return n.k !== 'self' && stateOf(n.k).s === 'bad'; }).map(function (n) { return { id: n.id, n: n.n, t: stateOf(n.k).t }; });
  }
  function alerts() {
    if (!NODES.length || !E.at) return;
    var now = down(), was = readJ(AL_LS) || {}, seen = {};
    now.forEach(function (d) {
      seen[d.id] = 1;
      if (!was[d.id]) toast('bad', d.n + ' is not working', d.t, d.id, true);
    });
    Object.keys(was).forEach(function (id) {
      // still being checked (or unknown): not news yet, keep it as it was
      var nn = NODES.filter(function (x) { return x.id === id; })[0];
      if (!seen[id] && nn && stateOf(nn.k).s === 'wait') { seen[id] = 1; return; }
      if (!seen[id]) { var n = NODES.filter(function (x) { return x.id === id; })[0]; if (n) toast('ok', n.n + ' is answering again', stateOf(n.k).t, id, true); }
    });
    try { localStorage.setItem(AL_LS, JSON.stringify(seen)); } catch (x) {}
    badge(now);
  }
  function badge(now) {
    var a = document.querySelector('[data-nav="engine"]');
    if (a) {
      var b = a.querySelector('.eg-nb');
      if (now.length) { if (!b) { b = document.createElement('span'); b.className = 'eg-nb'; a.appendChild(b); } b.textContent = now.length; b.title = now.length + ' connection' + (now.length > 1 ? 's' : '') + ' not working'; }
      else if (b) b.remove();
    }
    var t = document.title.replace(/^\(\d+\) /, ''); document.title = now.length ? '(' + now.length + ') ' + t : t;
    var D = document.getElementById('eg-down');
    if (D) {
      D.hidden = !now.length;
      D.innerHTML = now.length ? '<span class="eg-dot" data-s="bad"><i></i></span><span><b>' + now.length + ' connection' + (now.length > 1 ? 's are' : ' is') + ' not working</b><small>' +
        now.map(function (d) { return esc(d.n) + ': ' + esc(d.t); }).join(' · ') + '</small></span><button class="b b-q" type="button" data-eg="tomap">Show on the map</button>' : '';
    }
  }
  function toast(kind, head, body, key, desk) {
    var T = document.getElementById('eg-toasts');
    if (!T) { T = document.createElement('div'); T.id = 'eg-toasts'; T.className = 'eg-toasts'; T.setAttribute('aria-live', 'polite'); document.body.appendChild(T); }
    var old = T.querySelector('[data-k="' + key + '"]'); if (old) old.remove();
    var el = document.createElement('div'); el.className = 'eg-toast'; el.dataset.k = key; el.dataset.s = kind; el.setAttribute('role', kind === 'bad' ? 'alert' : 'status');
    var onPage = !!(E.root && document.body.contains(E.root));
    el.innerHTML = '<span class="eg-dot" data-s="' + kind + '"><i></i></span><span class="eg-toast-t"><b>' + esc(head) + '</b><small>' + esc(body) + '</small></span>' +
      (onPage ? '' : '<a class="b b-l" href="#/engine">Open Engine</a>') + '<button type="button" aria-label="Dismiss">' + ico('x') + '</button>';
    el.querySelector('button').addEventListener('click', function () { el.remove(); });
    T.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.remove(); }, kind === 'bad' ? 30000 : 10000);
    var on = false; try { on = localStorage.getItem(NOTE_LS) === '1'; } catch (x) {}
    if (desk && on && window.Notification && Notification.permission === 'granted' && (document.hidden || !onPage)) {
      try { var nt = new Notification('PDS · ' + head, { body: body, tag: 'pds-' + key }); nt.onclick = function () { window.focus(); location.hash = '#/engine'; nt.close(); }; } catch (x) {}
    }
  }
  function paintAlertsBtn() {
    var b = document.getElementById('eg-al-b'); if (!b) return;
    var on = false; try { on = localStorage.getItem(NOTE_LS) === '1'; } catch (x) {}
    var can = !!window.Notification, denied = can && Notification.permission === 'denied';
    b.disabled = !can || denied;
    b.innerHTML = ico(on && !denied ? 'check' : 'tray') + (denied ? 'Alerts blocked in this browser' : on ? 'Desktop alerts on' : 'Turn on desktop alerts');
    b.title = denied ? 'Chrome is blocking notifications for this site: allow them in the address bar’s site settings' : on ? 'Click to turn off. You are told when a connection stops or starts working again.' : 'Get a desktop notification when a connection stops working, even with this tab in the background';
  }
  // ── SHARE (2026-11-18, by request) ─────────────────────────────────────────────────────────
  // The page's link (it opens only for the admin and AI Engineers, after a Google sign-in), and for
  // the admin: let an engineer in as AI Engineers by email (op accset, the same as Access) and open
  // an email to them with the link. Nothing is sent from here: the mail opens in the admin's own
  // mail app.
  var LINK = 'https://provident-design-studio.vercel.app/#/engine';
  function paintShare() {
    var P = document.getElementById('eg-share'); if (!P) return;
    var A = window.providentAccess, adm = !!(A && A.now && A.now().admin), sh = E.share || {};
    var ai = (sh.team || []).filter(function (p) { return p.role === 'ai'; });
    P.innerHTML = '<b class="eg-sh-h">Share the Engine</b>' +
      '<p>It opens for the admin and AI Engineers only, after they sign in with their Provident Google account.</p>' +
      '<div class="eg-sh-l"><input readonly value="' + esc(LINK) + '" aria-label="Link to the Engine" id="eg-sh-in"><button class="b b-g" type="button" data-eg="copy">' + ico(sh.copied ? 'check' : 'copy') + (sh.copied ? 'Copied' : 'Copy link') + '</button></div>' +
      (ai.length ? '<div class="eg-sh-w"><small>AI Engineers</small>' + ai.map(function (p) { return '<span>' + esc(p.name || p.email) + '</span>'; }).join('') + '</div>' : '') +
      (adm ? '<form class="eg-sh-f" data-eg="invite"><label for="eg-sh-em">Let an engineer in</label><div><input id="eg-sh-em" type="email" required placeholder="name@providentestate.com" autocomplete="off"' + (sh.em ? ' value="' + esc(sh.em) + '"' : '') + '>' +
        '<button class="b b-p" type="submit"' + (sh.busy ? ' disabled' : '') + '>' + (sh.busy ? 'Letting in…' : 'Let in as AI Engineer') + '</button></div>' +
        (sh.err ? '<p class="eg-sh-e" role="alert">' + esc(sh.err) + '</p>' : '') +
        (sh.done ? '<p class="eg-sh-ok">' + esc(sh.done) + ' can open the Engine now. <a class="b b-l" href="' + esc(mailto(sh.done)) + '">Email them the link</a></p>' : '') + '</form>'
        : '<p class="eg-sh-n">To bring in another engineer, ask the admin: they let them in as AI Engineers.</p>');
  }
  function mailto(to) {
    return 'mailto:' + encodeURIComponent(to) + '?subject=' + encodeURIComponent('PDS Engine: the architecture and every change, live') +
      '&body=' + encodeURIComponent('Hi,\n\nYou can now open the PDS Engine page: how Provident Design Studio is built, every commit and deployment, and a live map of its connections.\n\n' +
        LINK + '\n\nSign in with your Provident Google account. It opens for the admin and AI Engineers only.\n\nThe architecture reference (PDF) is linked from the page.');
  }
  function shareOpen(open) {
    var P = document.getElementById('eg-share'), B = document.querySelector('[data-eg="share"]'); if (!P || !B) return;
    P.hidden = !open; B.setAttribute('aria-expanded', String(!!open));
    if (open) {
      E.share = E.share || {}; paintShare();
      var A = window.providentAccess;
      if (A && A.team) A.team().then(function (t) { E.share.team = t; paintShare(); }).catch(function () {});
    }
  }
  function invite(form) {
    var A = window.providentAccess, i = form.querySelector('#eg-sh-em'), em = (i && i.value || '').trim().toLowerCase();
    if (!em || !A || !A.call) return;
    E.share = Object.assign(E.share || {}, { em: em, busy: true, err: '', done: '' }); paintShare();
    A.call('accset', { email: em, action: 'add', role: 'ai' }).then(function () { E.share = Object.assign(E.share, { busy: false, done: em, em: '' }); return A.team ? A.team(true) : null; })
      .then(function (t) { if (t) E.share.team = t; paintShare(); })
      .catch(function (e) { E.share = Object.assign(E.share, { busy: false, err: (e && e.message) || 'The studio refused.' }); paintShare(); });
  }
  // ── the background watch: Home open, the admin or an AI Engineer signed in ───────────────
  function allowed() { var A = window.providentAccess; return !!(A && A.now && (A.now().admin || (A.can && A.now().role && A.can('arch')))); }
  var watching = null;
  function watch() {
    if (watching || !allowed()) return;
    if (!NODES.length) loadMap('');
    watching = setInterval(function () {
      if (!allowed()) { clearInterval(watching); watching = null; badge([]); return; }
      if (E.root && document.body.contains(E.root)) return;   // the page polls on its own
      poll(true);
    }, 60000);
    poll(true);
  }
  window.addEventListener('provident-access', function () { setTimeout(watch, 0); });
  setTimeout(watch, 4000);
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
      if (E.only === 'deployed' && !dm[c.sha]) return false;
      if (E.area && areaOf(c) !== E.area) return false;
      return !q || String(c.msg).toLowerCase().indexOf(q) >= 0 || c.sha.indexOf(q) === 0;
    });
  }
  // THE TIMELINE'S TOOLBAR (2026-11-18, /impeccable): one line for the title, what is shown and
  // the search; under it, which commits (All | Deployed, a switch) and which area (one row that
  // scrolls sideways rather than wrapping). The two combine. The bar sticks under the top bar
  // while the list scrolls, and each day's heading sticks under the bar.
  function paintFilters() {
    var F = document.getElementById('eg-f'), G = document.getElementById('eg-seg'), N = document.getElementById('eg-tl-n'); if (!F) return;
    var dm = depBySha(), pool = E.only === 'deployed' ? E.commits.filter(function (c) { return dm[c.sha]; }) : E.commits, n = {};
    pool.forEach(function (c) { var a = areaOf(c); if (a) n[a] = (n[a] || 0) + 1; });
    var nd = E.commits.filter(function (c) { return dm[c.sha]; }).length;
    if (G) G.innerHTML = [['all', 'All', E.commits.length], ['deployed', 'Deployed', nd]].map(function (o) {
      return '<button type="button" data-eg="only" data-v="' + o[0] + '" aria-pressed="' + (E.only === o[0]) + '">' + o[1] + '<small>' + o[2].toLocaleString() + '</small></button>'; }).join('');
    F.innerHTML = AREAS.filter(function (a) { return n[a.k] || E.area === a.k; }).map(function (a) {
      return '<button type="button" data-eg="f" data-v="' + a.k + '" aria-pressed="' + (E.area === a.k) + '">' + a.n + '<small>' + (n[a.k] || 0) + '</small></button>'; }).join('');
    if (N) {
      var shown = filtered().length, parts = [];
      if (E.only === 'deployed') parts.push('deployed');
      if (E.area) parts.push(AREA_N[E.area]);
      if (E.q.trim()) parts.push('matching “' + esc(E.q.trim()) + '”');
      N.innerHTML = parts.length ? shown.toLocaleString() + ' of ' + E.commits.length.toLocaleString() + ' · ' + parts.join(' · ') + ' <button type="button" class="b b-l" data-eg="clear">Clear</button>'
        : E.commits.length ? E.commits.length.toLocaleString() + ' commits' : '';
    }
    sizes();
  }
  // the sticky toolbar sits under Home's own top bar, whatever height that is (two rows on a phone)
  function sizes() {
    var eg = document.getElementById('eg'), tb = document.getElementById('eg-tb'), hd = document.querySelector('header.p-top'); if (!eg) return;
    if (hd) eg.style.setProperty('--hdh', Math.round(hd.getBoundingClientRect().height) + 'px');
    if (tb) eg.style.setProperty('--tbh', tb.offsetHeight + 'px');
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
          '<a class="eg-sha" href="' + REPO_URL + '/commit/' + esc(c.sha) + '" target="_blank" rel="noopener noreferrer" title="Open this commit on GitHub">' + esc(c.sha.slice(0, 7)) + '</a></span></li>';
    });
    h += '</ol>';
    if (all.length > list.length) h += '<div class="eg-more"><button class="b b-g" type="button" data-eg="more">Show ' + Math.min(PAGE, all.length - list.length) + ' more</button><small>' + list.length + ' of ' + all.length + '</small></div>';
    else h += '<p class="eg-end">' + (all.length < E.commits.length ? 'That’s every match: ' + all.length + ' of ' + E.commits.length + '.'
      : 'The first commit. ' + esc(new Date(all[all.length - 1].at).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })) + '.') + '</p>';
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
  function paint() { if (!E.root || !document.body.contains(E.root)) return; paintHead(); paintNow(); paintServices(); paintMap(); paintStrip(); paintFilters(); paintList(); paintBuilt(); }

  // ── wiring ─────────────────────────────────────────────────────────────────────────────
  function onClick(e) {
    var t = e.target.closest && e.target.closest('[data-eg]'); if (!t) return;
    var a = t.dataset.eg;
    if (a === 'refresh') poll(true);
    else if (a === 'share') shareOpen(document.getElementById('eg-share').hidden);
    else if (a === 'copy') { var inp = document.getElementById('eg-sh-in'); (navigator.clipboard ? navigator.clipboard.writeText(LINK) : Promise.reject()).catch(function () { if (inp) { inp.select(); document.execCommand('copy'); } })
      .then(function () { E.share.copied = true; paintShare(); setTimeout(function () { if (E.share) { E.share.copied = false; paintShare(); } }, 2000); }); }
    else if (a === 'alerts') {
      var on = false; try { on = localStorage.getItem(NOTE_LS) === '1'; } catch (x) {}
      if (on) { try { localStorage.removeItem(NOTE_LS); } catch (x) {} paintAlertsBtn(); }
      else Notification.requestPermission().then(function (p) { if (p === 'granted') { try { localStorage.setItem(NOTE_LS, '1'); } catch (x) {} toast('ok', 'Desktop alerts are on', 'You will be told when a connection stops or starts working again.', 'al-on'); } paintAlertsBtn(); });
    }
    else if (a === 'tomap') { var mh = document.getElementById('eg-map-h'); if (mh) mh.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (a === 'mac') { try { localStorage.setItem(MAC_LS, '1'); } catch (x) {} linkProbes(true); paintMap(); }
    else if (a === 'more') { E.shown += PAGE; paintList(); }
    else if (a === 'f') { E.area = E.area === t.dataset.v ? '' : t.dataset.v; E.shown = PAGE; paintFilters(); paintList(); var tl = document.getElementById('eg-tb'); if (t.closest('#eg-b') && tl) tl.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (a === 'only') { E.only = t.dataset.v; E.shown = PAGE; paintFilters(); paintList(); }
    else if (a === 'clear') { E.only = 'all'; E.area = ''; E.q = ''; var q0 = document.getElementById('eg-q'); if (q0) q0.value = ''; E.shown = PAGE; paintFilters(); paintList(); }
    else if (a === 'day') {
      var k = t.dataset.k; E.only = 'all'; E.area = ''; E.q = ''; var qi = document.getElementById('eg-q'); if (qi) qi.value = '';
      var idx = E.commits.findIndex(function (c) { return dayKey(new Date(c.at)) === k; });
      var lastIdx = E.commits.length - 1 - E.commits.slice().reverse().findIndex(function (c) { return dayKey(new Date(c.at)) === k; });
      if (idx >= 0) E.shown = Math.max(E.shown, Math.ceil((lastIdx + 1) / PAGE) * PAGE);
      paintFilters(); paintList();
      var el = document.getElementById('eg-d-' + k); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.setAttribute('data-hit', ''); setTimeout(function () { el.removeAttribute('data-hit'); }, 1800); }
    }
  }
  var qT = null;
  function onSubmit(e) { var f = e.target.closest && e.target.closest('[data-eg="invite"]'); if (f) { e.preventDefault(); invite(f); } }
  function onKey(e) { if (e.key === 'Escape' && !document.getElementById('eg-share').hidden) { shareOpen(false); var b = document.querySelector('[data-eg="share"]'); if (b) b.focus(); } }
  function onInput(e) { if (e.target.id !== 'eg-q') return; clearTimeout(qT); qT = setTimeout(function () { E.q = e.target.value; E.shown = PAGE; paintFilters(); paintList(); }, 120); }
  function mount(root) {
    E.root = root.querySelector('#eg') || root;
    if (!E.root._wired) {
      E.root._wired = true; E.root.addEventListener('click', onClick); E.root.addEventListener('input', onInput); E.root.addEventListener('submit', onSubmit); E.root.addEventListener('keydown', onKey);
      document.addEventListener('click', function (e) { var P = document.getElementById('eg-share'); if (P && !P.hidden && !e.target.closest('.eg-pop')) shareOpen(false); });
      var over = function (e) { var n = e.target.closest && e.target.closest('.eg-n'); focusNode(n ? n.dataset.n : null); };
      E.root.addEventListener('mouseover', over); E.root.addEventListener('focusin', over);
      E.root.addEventListener('mouseleave', function () { focusNode(null); });
      var mp = E.root.querySelector('#eg-map'); if (mp && window.ResizeObserver) new ResizeObserver(function () { setTimeout(drawWires, 0); }).observe(mp);
      var tb = E.root.querySelector('#eg-tb'), hd = document.querySelector('header.p-top');
      if (window.ResizeObserver) { var ro = new ResizeObserver(sizes); if (tb) ro.observe(tb); if (hd) ro.observe(hd); }
    }
    E.grown = false; paint(); paintAlertsBtn(); loadMap(E.liveSha || ''); poll(true); watch();
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
    /* header actions, share, alerts */
    '.eg-hd-a{display:flex;flex-wrap:wrap;align-items:center;gap:10px 12px}',
    '.eg-hd-a .eg-live{margin-right:6px}',
    '.eg-pop{position:relative}',
    '.eg-share{position:absolute;z-index:40;top:44px;right:0;width:min(420px,calc(100vw - 32px));box-sizing:border-box;padding:18px;border-radius:16px;background:var(--ps-card);box-shadow:inset 0 0 0 1px var(--ps-line),0 0 0 4px color-mix(in srgb,var(--ps-app) 70%,transparent);display:grid;gap:12px}',
    '.eg-share[hidden]{display:none}',
    '.eg-sh-h{font:500 16px/1.3 var(--ps-font)}',
    '.eg-share p{margin:0;font:400 13.5px/1.5 var(--ps-font);color:var(--ps-ink-2)}',
    '.eg-sh-l{display:flex;gap:8px}',
    '.eg-sh-l input,.eg-sh-f input{flex:1 1 auto;min-width:0;height:36px;box-sizing:border-box;padding:0 14px;border:0;border-radius:var(--ps-pill);background:var(--ps-fill);color:var(--ps-ink);font:400 13.5px/1 var(--ps-font)}',
    '.eg-sh-l input:focus-visible,.eg-sh-f input:focus-visible{outline:2px solid var(--ps-ink);outline-offset:2px}',
    '.eg-sh-w{display:flex;flex-wrap:wrap;align-items:center;gap:6px}',
    '.eg-sh-w small{font:400 12.5px/1 var(--ps-font);color:var(--ps-dim);margin-right:4px}',
    '.eg-sh-w span{display:inline-flex;align-items:center;height:26px;padding:0 10px;border-radius:var(--ps-pill);background:var(--ps-fill);font:500 12.5px/1 var(--ps-font)}',
    '.eg-sh-f{display:grid;gap:8px;padding-top:12px;box-shadow:inset 0 1px 0 var(--ps-hair)}',
    '.eg-sh-f label{font:500 14px/1.3 var(--ps-font)}',
    '.eg-sh-f > div{display:flex;flex-wrap:wrap;gap:8px}',
    '.eg-sh-e{color:var(--ps-bad)!important}',
    '.eg-sh-ok{color:var(--ps-ink)!important}',
    '.eg-down{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;padding:12px 14px 12px 16px;border-radius:16px;background:var(--ps-bad-q);box-shadow:inset 0 0 0 1px var(--ps-bad)}',
    '.eg-down[hidden]{display:none}',
    '.eg-down > span:nth-child(2){flex:1 1 300px;min-width:0}',
    '.eg-down b{display:block;font:500 14.5px/1.3 var(--ps-font)}',
    '.eg-down small{display:block;margin-top:3px;font:400 13px/1.4 var(--ps-font);color:var(--ps-ink-2)}',
    '.eg-nb{display:inline-grid;place-items:center;min-width:18px;height:18px;margin-left:6px;padding:0 5px;box-sizing:border-box;border-radius:9999px;background:var(--ps-bad);color:#fff;font:600 11.5px/1 var(--ps-font);font-variant-numeric:tabular-nums}',
    '.eg-toasts{position:fixed;z-index:200;right:16px;bottom:16px;display:flex;flex-direction:column;gap:8px;width:min(380px,calc(100vw - 32px))}',
    '.eg-toast{display:flex;align-items:flex-start;gap:10px;padding:12px 10px 12px 14px;border-radius:14px;background:var(--ps-card);color:var(--ps-ink);box-shadow:inset 0 0 0 1px var(--ps-line),0 0 0 4px color-mix(in srgb,var(--ps-app) 70%,transparent);animation:egtoast 260ms cubic-bezier(.16,1,.3,1)}',
    '.eg-toast[data-s="bad"]{box-shadow:inset 0 0 0 1.5px var(--ps-bad),0 0 0 4px color-mix(in srgb,var(--ps-app) 70%,transparent)}',
    '.eg-toast .eg-dot{margin-top:3px}',
    '.eg-toast-t{flex:1;min-width:0}',
    '.eg-toast b{display:block;font:500 14px/1.3 var(--ps-font)}',
    '.eg-toast small{display:block;margin-top:2px;font:400 12.5px/1.4 var(--ps-font);color:var(--ps-ink-2)}',
    '.eg-toast .b-l{align-self:center;font-size:13px;white-space:nowrap}',
    '.eg-toast button{display:grid;place-items:center;width:28px;height:28px;padding:0;border:0;border-radius:50%;background:none;color:var(--ps-ink-2);cursor:pointer}',
    '.eg-toast button:hover{background:var(--ps-fill)}',
    '.eg-toast button svg.i{width:15px;height:15px}',
    '@keyframes egtoast{from{opacity:0;transform:translateY(8px)}}',
    /* how it connects */
    '.eg-map-hd{flex-wrap:wrap;row-gap:8px}',
    '.eg-map-hd > small{flex:1 1 auto}',
    '.eg-map-hd .sp{display:none}',
    '.eg-map-hd .b{margin-left:auto}',
    '.eg-map{position:relative;display:flex;flex-direction:column;gap:52px;padding:22px 18px;border-radius:16px;background:var(--ps-fill)}',
    '.eg-wires{position:absolute;left:0;top:0;pointer-events:none;overflow:visible;z-index:0}',
    '.eg-wire{fill:none;stroke:var(--ps-line);stroke-width:1.5;transition:opacity var(--ps-motion) var(--ps-ease),stroke-width var(--ps-motion) var(--ps-ease)}',
    '.eg-wire[data-s="ok"]{stroke:var(--ps-good);opacity:.8;stroke-dasharray:6 6;animation:egflow 1.6s linear infinite}',
    '.eg-wire[data-s="warn"]{stroke:var(--ps-warn);opacity:.8}',
    '.eg-wire[data-s="bad"]{stroke:var(--ps-bad);opacity:.9;stroke-dasharray:2 5}',
    '.eg-wire[data-s="off"],.eg-wire[data-s="old"],.eg-wire[data-s="wait"]{stroke:var(--ps-dim);stroke-dasharray:2 5;opacity:.75}',
    '.eg-map[data-focus] .eg-wire{opacity:.12}',
    '.eg-map[data-focus] .eg-wire[data-on]{opacity:1;stroke-width:2.25}',
    '@keyframes egflow{to{stroke-dashoffset:-24}}',
    '.eg-lane{position:relative;z-index:1;display:grid;grid-template-columns:190px minmax(0,1fr);gap:18px;align-items:center}',
    '.eg-lane-h b{display:block;font:600 14px/1.3 var(--ps-font)}',
    '.eg-lane-h small{display:block;margin-top:3px;font:400 12.5px/1.4 var(--ps-font);color:var(--ps-ink-2)}',
    '.eg-lane-b{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}',
    '.eg-n{flex:0 1 170px;min-width:140px;display:grid;gap:3px;padding:11px 13px;border-radius:14px;background:var(--ps-card);box-shadow:inset 0 0 0 1px var(--ps-hair);transition:opacity var(--ps-motion) var(--ps-ease),box-shadow var(--ps-motion) var(--ps-ease);cursor:default}',
    '.eg-n[data-own]{box-shadow:inset 0 0 0 1.5px var(--ps-fill-on)}',
    '.eg-n:hover,.eg-n:focus-visible{box-shadow:inset 0 0 0 1.5px var(--ps-ink-2);outline:none}',
    '.eg-n[data-dim]{opacity:.35}',
    '.eg-n b{font:500 14px/1.25 var(--ps-font)}',
    '.eg-n small{font:400 12px/1.3 var(--ps-font);color:var(--ps-ink-2)}',
    '.eg-n-st{display:flex;align-items:center;gap:6px;margin-top:4px;font:400 12px/1.3 var(--ps-font);color:var(--ps-ink-2);font-variant-numeric:tabular-nums;min-width:0}',
    '.eg-n[data-s="bad"] .eg-n-st{color:var(--ps-bad)}',
    '.eg-n .eg-dot{width:10px;height:10px}.eg-n .eg-dot i{width:7px;height:7px}',
    '.eg-dot[data-s="off"] i,.eg-dot[data-s="wait"] i{background:var(--ps-dim)}',
    '.eg-n .eg-dot::after{display:none}',
    '.eg-map-key{margin-top:12px}',
    '.eg-w{width:18px!important;height:0!important;border-radius:0!important;background:none!important;opacity:1!important;border-top:2px dotted var(--ps-dim)}',
    '.eg-w[data-s="ok"]{border-top-color:var(--ps-good)}.eg-w[data-s="warn"]{border-top-style:solid;border-top-color:var(--ps-warn)}.eg-w[data-s="bad"]{border-top-style:dotted;border-top-color:var(--ps-bad)}',
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
    '.eg-tb{position:sticky;top:var(--hdh,64px);z-index:4;display:grid;gap:10px;margin:0 -12px 6px;padding:12px 12px 12px;background:var(--ps-app);box-shadow:0 1px 0 var(--ps-hair);scroll-margin-top:72px}',
    '.eg-tb-r1{display:flex;align-items:center;gap:8px 14px;min-width:0}',
    '.eg-tb-n{font:400 13px/1.3 var(--ps-font);color:var(--ps-ink-2);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}',
    '.eg-tb-n .b-l{margin-left:6px;font-size:13px}',
    '.eg-q{position:relative;display:flex;align-items:center;flex:0 1 300px;min-width:180px}',
    '.eg-q svg.i{position:absolute;left:12px;width:17px;height:17px;color:var(--ps-ink-2);pointer-events:none}',
    '.eg-q input{width:100%;height:36px;box-sizing:border-box;padding:0 14px 0 38px;border:0;border-radius:var(--ps-pill);background:var(--ps-fill);color:var(--ps-ink);font:400 14px/1 var(--ps-font)}',
    '.eg-q input::placeholder{color:var(--ps-dim)}',
    '.eg-q input:focus-visible{outline:2px solid var(--ps-ink);outline-offset:2px}',
    '.eg-tb-r2{display:flex;align-items:center;gap:12px;min-width:0}',
    '.eg-seg{flex:none;display:inline-flex;padding:3px;border-radius:var(--ps-pill);background:var(--ps-fill)}',
    '.eg-seg button{display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 13px;border:0;border-radius:var(--ps-pill);background:none;color:var(--ps-ink-2);font:500 13px/1 var(--ps-font);cursor:pointer;transition:background-color var(--ps-motion) var(--ps-ease),color var(--ps-motion) var(--ps-ease)}',
    '.eg-seg button:hover{color:var(--ps-ink)}',
    '.eg-seg button[aria-pressed="true"]{background:var(--ps-fill-on);color:var(--ps-ink)}',
    '.eg-tb-div{flex:none;width:1px;height:22px;background:var(--ps-line)}',
    '.eg-f{flex:1 1 auto;min-width:0;display:flex;gap:2px;overflow-x:auto;scrollbar-width:none;-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 28px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 28px),transparent);padding-right:28px}',
    '.eg-f::-webkit-scrollbar{display:none}',
    '.eg-f button{flex:none;display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 11px;border:0;border-radius:var(--ps-pill);background:none;color:var(--ps-ink-2);font:500 13px/1 var(--ps-font);cursor:pointer;white-space:nowrap;transition:background-color var(--ps-motion) var(--ps-ease),color var(--ps-motion) var(--ps-ease)}',
    '.eg-f button:hover{background:var(--ps-fill);color:var(--ps-ink)}',
    '.eg-f button[aria-pressed="true"]{background:var(--ps-fill-on);color:var(--ps-ink)}',
    '.eg-seg small,.eg-f small{font:400 12px/1 var(--ps-font);color:var(--ps-dim);font-variant-numeric:tabular-nums}',
    '.eg-seg button[aria-pressed="true"] small,.eg-f button[aria-pressed="true"] small{color:var(--ps-ink-2)}',
    '.eg-seg button:focus-visible,.eg-f button:focus-visible{outline:2px solid var(--ps-ink);outline-offset:-2px}',
    '.eg-built button:focus-visible,.eg-sha:focus-visible{outline:2px solid var(--ps-ink);outline-offset:2px}',
    '.eg-c{list-style:none;margin:0;padding:0;position:relative}',
    '.eg-c::before{content:"";position:absolute;left:62px;top:52px;bottom:12px;width:1px;background:var(--ps-hair)}',
    '.eg-dh{position:sticky;top:calc(var(--hdh,64px) + var(--tbh,108px));z-index:2;display:flex;align-items:baseline;gap:10px;margin:18px 0 4px;padding:10px 0 8px;background:var(--ps-app);font:600 14px/1.3 var(--ps-font);scroll-margin-top:calc(72px + var(--tbh,108px))}',
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
    '@media (max-width:900px){.eg-lane{grid-template-columns:minmax(0,1fr);gap:10px}.eg-lane-h{text-align:center}}',
    '@media (max-width:640px){.eg-map{padding:12px;gap:40px}.eg-n{flex:1 1 140px}.eg-sv{grid-template-columns:minmax(0,1fr)}.eg-r{grid-template-columns:44px minmax(0,1fr);gap:6px 14px}.eg-r-x{grid-column:2;padding-left:14px;flex-wrap:wrap}.eg-c::before{left:56px}.eg-r::before{left:53px}.eg-more,.eg-end{margin-left:58px}.eg-strip{height:64px;gap:1px;padding:8px 8px 0}.eg-months{padding:0 8px}.eg-tb{margin:0 -16px 6px;padding:10px 16px}.eg-tb-r1{flex-wrap:wrap}.eg-q{flex:1 1 100%;order:3}}',
    '@media (prefers-reduced-motion:reduce){.eg-toast{animation:none}.eg-wire[data-s="ok"]{animation:none}.eg-dot[data-s="ok"]::after,.eg-dot[data-busy] i,.eg-d[data-s="run"] i,.eg-sk,.eg-sk-l i{animation:none}.eg-strip[data-grow] .eg-day i,.eg-r[data-new]{animation:none}}'
  ].join('\n');
  var st = document.createElement('style'); st.id = 'engine-css'; st.textContent = css; document.head.appendChild(st);

  window.providentEngine = { shell: shell, mount: mount };
})();
