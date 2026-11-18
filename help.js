/* HELP (2026-11-18, by request): the support page of PDS on the home, #/help.
   "I need to…": it opens on the jobs the signed-in person's role does, never on a table of
   contents. Three studios, one switch: CAS + CASV | OPS | Home, holding only the ones the role
   opens. Each job opens a captured walkthrough: the real screens (help/frames/, from the local
   test server's demo data) played step by step, a ring gliding to the part each step names, with
   the steps as a list that follows. Getting around maps each view the role uses.
   WHO SEES WHAT follows Access › Roles (help-content.js says how): a change to a role's ticks
   changes its Help, and the admin's Preview as shows any role's Help. It is a view, not a lock:
   help-content.js is a public file. Signed out, only how to get in shows.
   Routes: #/help (?a=cas|ops|home, ?q=search), #/help/<article id>.
   Chrome only: --ps-* tokens, Google Sans Flex, rings not shadows (DESIGN.md). */
(function () {
  'use strict';
  var H = window.providentHelpContent;
  if (!H) return;
  var STEP_MS = 5600, FRAMES = null, framesP = null, P = null, ctx0 = null;
  var reduce = function () { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  // the guide's own marks: **on-screen name** and `file name`
  var md = function (s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>'); };
  var plain = function (s) { return String(s || '').replace(/\*\*|`/g, ''); };
  var SVG = {
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z"/>',
    pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
    prev: '<path d="M15 6l-6 6 6 6"/>', next: '<path d="M9 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>', again: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4"/>',
    walk: '<rect x="3.5" y="5" width="17" height="11" rx="2"/><path d="M10.5 8.5v4l3.5-2z"/><path d="M8 20h8"/>',
    q: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.6v.1"/>',
    open: '<path d="M14 5h5v5M19 5l-8 8M17 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 4 18.5v-10A1.5 1.5 0 0 1 5.5 7H10"/>'
  };
  var ico = function (k) { return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + SVG[k] + '</svg>'; };
  var BY = {}; H.ARTICLES.forEach(function (a) { BY[a.id] = a; });
  // how far this viewer has watched each guide (steps reached), kept on this computer only:
  // it fills the rows' step segments, as a post's steps fill on Home
  var SEEN_K = 'provident-help-seen';
  function seen() { try { return JSON.parse(localStorage.getItem(SEEN_K) || '{}') || {}; } catch (e) { return {}; } }
  function saw(id, n) { try { var m = seen(); if ((m[id] || 0) < n) { m[id] = n; localStorage.setItem(SEEN_K, JSON.stringify(m)); } } catch (e) {} }
  var secs = function (a) { return Math.round(a.steps.length * STEP_MS / 1000); };
  var AREA = {}; H.AREAS.forEach(function (a) { AREA[a.k] = a; });

  // ── who sees what ─────────────────────────────────────────────────────────────────────────
  // ctx (from index.html): { out, admin (the admin, not previewing), raw (the role, or the one
  // previewed), name, email, roleLabel, can(cap, role) }
  var FAM = { pm: ['pm', 'dmt'], ct: ['ct', 'cten', 'ctar'], smm: ['smm'], admin: ['admin'] };
  function visFor(a, r, cx) {
    return a.who.some(function (w) {
      if (w === 'all') return !!r;
      if (w === 'out') return false;
      if (FAM[w]) return FAM[w].indexOf(r) >= 0;
      return !!(cx.can && cx.can(w, r));
    });
  }
  function vis(a, cx) {
    if (cx.out) return a.who.indexOf('out') >= 0;
    if (cx.admin) return true;
    return visFor(a, cx.raw, cx);
  }
  // the standard roles that see an article, in words ("Designers, social media")
  var WHO_N = [['designer', 'Designers'], ['smm', 'Social media'], ['cten', 'Content team · English'], ['ctar', 'Content team · Arabic'],
    ['pm', 'Performance marketing'], ['dmt', 'Digital Marketing Team'], ['ai', 'AI Engineers']];
  function whoLine(a, cx) {
    if (a.who.indexOf('admin') >= 0 && a.who.length === 1) return 'The admin';
    var l = WHO_N.filter(function (p) { return visFor(a, p[0], cx); }).map(function (p) { return p[1]; });
    return l.length >= WHO_N.length ? 'Everyone' : l.join(', ');
  }
  function roleKey(cx) {
    if (cx.out) return null;
    if (cx.admin) return 'admin';
    var r = cx.raw || '';
    return H.ROLES[r] ? r : /^x-/.test(r) ? 'other' : 'other';
  }
  function visible(cx) { return H.ARTICLES.filter(function (a) { return vis(a, cx); }); }

  // ── frames ────────────────────────────────────────────────────────────────────────────────
  function loadFrames() {
    if (framesP) return framesP;
    framesP = fetch('help/frames.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; }).then(function (j) { FRAMES = j || {}; return FRAMES; });
    return framesP;
  }
  var src = function (f) { return 'help/frames/' + f + '.webp'; };
  // a guide's thumbnail: its own pick (th: [frame, part]) where its first screen crops badly
  function firstShot(a) { if (a.th) return { f: a.th[0], s: a.th[1] }; for (var i = 0; i < a.steps.length; i++) if (a.steps[i].f) return a.steps[i]; return null; }
  // a thumbnail is the frame, zoomed onto the part its first step names
  function thumb(a, big) {
    var s = firstShot(a);
    if (!s) return '<span class="hp-th" data-none aria-hidden="true">' + ico('walk') + '</span>';
    var sp = FRAMES && FRAMES[s.f] && FRAMES[s.f].spots && FRAMES[s.f].spots[s.s], z = 1.22, st = '', ring = '';
    // a step with a screen but no part named still fills the thumbnail, from the middle
    var sp0 = sp || [50, 50, 0, 0];
    if (sp0) {
      var cx = (sp0[0] + sp0[2] / 2) / 100, cy = (sp0[1] + sp0[3] / 2) / 100, ih = (z / 1.6) / 0.75 * 100;
      var l = Math.max(100 - z * 100, Math.min(0, 50 - cx * z * 100)), t = Math.max(100 - ih, Math.min(0, 50 - cy * ih));
      st = ' style="width:' + (z * 100) + '%;left:' + l.toFixed(1) + '%;top:' + t.toFixed(1) + '%"';
      // the part the first step names, ringed as the walkthrough rings it
      var rl = l + sp0[0] * z, rt = t + sp0[1] / 100 * ih, rw = sp0[2] * z, rh = sp0[3] / 100 * ih;
      if (sp) ring = '<i class="hp-tr-r" style="left:' + rl.toFixed(1) + '%;top:' + rt.toFixed(1) + '%;width:' + rw.toFixed(1) + '%;height:' + rh.toFixed(1) + '%"></i>';
    }
    return '<span class="hp-th" aria-hidden="true"><img src="' + src(s.f) + '" alt="" decoding="async"' + st + '>' + ring + '</span>';
  }
  function row(a, lead, cx) {
    var n = a.steps.length, shots = a.steps.filter(function (s) { return s.f; }).length;
    return '<li class="hp-row"' + (lead ? ' data-lead' : '') + '><a class="hp-ra" href="#/help/' + a.id + '">' + thumb(a, lead) +
      '<span class="hp-rt"><b>' + esc(a.title) + '</b><span class="hp-rs">' + md(a.sum) + '</span>' +
      '<span class="hp-rm"><span class="seg" aria-hidden="true">' + a.steps.map(function (x, k) { return '<i' + (k < (seen()[a.id] || 0) ? ' data-s="done"' : '') + '></i>'; }).join('') + '</span>' +
      n + ' steps · ' + secs(a) + ' s to watch' + ((seen()[a.id] || 0) >= n ? ' · watched' : '') + (cx && cx.search ? ' · ' + esc(AREA[a.area].n) : '') + '</span></span>' +
      '<span class="b ' + (lead ? 'b-p' : 'b-g') + ' hp-go">' + (shots ? ico('play') + 'Watch' : 'Read') + '</span></a></li>';
  }

  // ── the page ──────────────────────────────────────────────────────────────────────────────
  function render(parts, q, cx) {
    ctx0 = cx;
    stop();
    if (parts[0] && BY[parts[0]]) return article(BY[parts[0]], cx);
    return index(q || {}, cx);
  }
  function areasFor(cx) {
    var v = visible(cx);
    return H.AREAS.filter(function (ar) { return v.some(function (a) { return a.area === ar.k; }); });
  }
  function index(q, cx) {
    var v = visible(cx), rk = roleKey(cx), R = rk && H.ROLES[rk], ars = areasFor(cx);
    if (cx.out) {
      var a0 = BY['home-signin'];
      return '<div class="hp" data-out><header class="hp-hd"><div><h1 class="h1">Help</h1><p class="lede">Sign in with your Provident Google account to see the guides for your role: what you do in each studio, step by step, with the real screens.</p><p class="hp-in"><button class="b b-p b-lg" type="button" data-sign="in">Sign in with Google</button><a class="b b-l" href="#/">Back</a></p></div></header>' +
        '<section class="hp-sec"><ol class="rows hp-rows">' + row(a0, false) + '</ol></section></div>';
    }
    var start = (R ? R.start : []).filter(function (id) { return BY[id] && vis(BY[id], cx); });
    if (cx.admin) start = H.ROLES.admin.start.slice();
    var cur = ars.some(function (x) { return x.k === q.a; }) ? q.a : areaOf(cx);
    var who = cx.admin ? 'Admin' : (cx.roleLabel || 'No role yet');
    var h = '<div class="hp"><header class="hp-hd"><div class="hp-hd-t"><h1 class="h1">Help</h1>' +
      '<p class="hp-who">' + (cx.name ? '<span class="hp-nm">' + esc(cx.name) + '</span>' : '') + '<span class="hp-role">' + esc(who) + '</span>' +
      (cx.preview ? '<span class="hp-pv">' + ico('q') + 'What this role sees</span>' : '') + '</p>' +
      '<p class="lede">' + esc(R ? R.line : 'Help shows the guides for what your role opens.') + (cx.admin ? ' You see every guide; Preview as (Access) shows one role’s Help.' : '') + '</p></div></header>' +
      '<div class="hp-bar">' + (ars.length ? '<div class="hp-sw" role="tablist" aria-label="Studio">' + ars.map(function (ar) {
        var n = v.filter(function (a) { return a.area === ar.k && start.indexOf(a.id) < 0; }).length;
        return '<button type="button" role="tab" data-hpa="' + ar.k + '" aria-selected="' + (ar.k === cur) + '"' + (ar.k === cur ? '' : ' tabindex="-1"') + '>' + esc(ar.n) + (n ? '<s>' + n + '</s>' : '') + '</button>';
      }).join('') + '</div>' : '') +
      '<label class="srch hp-q">' + ico('search') + '<input id="hp-q" type="search" placeholder="Search help" aria-label="Search help" autocomplete="off" value="' + esc(q.q || '') + '"></label></div>' +
      '<div id="hp-body">' + body(q.q || '', cur, start, cx) + '</div>' +
      foot(cx) + '</div>';
    return h;
  }
  function body(qs, cur, start, cx) {
    var v = visible(cx), ars = areasFor(cx), h = '';
    qs = String(qs || '').trim().toLowerCase();
    if (qs) {
      var words = qs.split(/\s+/);
      var hit = v.filter(function (a) {
        var t = (a.title + ' ' + a.sum + ' ' + a.group + ' ' + a.steps.map(function (s) { return s.t; }).join(' ') + ' ' + (a.more || []).join(' ')).toLowerCase();
        return words.every(function (w) { return t.indexOf(w) >= 0; });
      });
      return '<section class="hp-sec"><div class="sh">' + (hit.length ? hit.length + (hit.length === 1 ? ' guide' : ' guides') + ' for “' + esc(qs) + '”' : 'Nothing for “' + esc(qs) + '”') + '</div>' +
        (hit.length ? '<ol class="rows hp-rows">' + hit.map(function (a) { return row(a, false, { search: true }); }).join('') + '</ol>'
          : '<div class="quiet"><b>Try the name on the button</b><p>Search reads the guides your role sees, by the words on screen: “Pick up”, “Send to copy check”, “Download package”.</p></div>') + '</section>';
    }
    if (start.length) h += '<section class="hp-sec hp-start"><div class="sh">Start here<small>' + start.length + '</small></div><ol class="rows hp-rows">' +
      start.map(function (id) { return row(BY[id], true, cx); }).join('') + '</ol></section>';
    if (!ars.length) return h + '<div class="quiet"><b>Nothing here for your role yet</b><p>Your role opens nothing in the studios yet. The admin chooses what each role opens under Access › Roles.</p></div>';
    h += '<div class="hp-ah2"><h2 class="hp-an">' + esc(AREA[cur].long) + '</h2><p class="hp-ad">' + esc(AREA[cur].desc) + '</p></div>';
    var mine = v.filter(function (a) { return a.area === cur && start.indexOf(a.id) < 0; }), groups = [];
    mine.forEach(function (a) { if (groups.indexOf(a.group) < 0) groups.push(a.group); });
    h += groups.map(function (g) {
      var l = mine.filter(function (a) { return a.group === g; });
      return '<section class="hp-sec"><div class="sh">' + esc(g) + '<small>' + l.length + '</small></div><ol class="rows hp-rows">' + l.map(function (a) { return row(a, false, cx); }).join('') + '</ol></section>';
    }).join('');
    if (!groups.length) h += '<p class="hp-none">Everything for you in ' + esc(AREA[cur].n) + ' is under Start here, above.</p>';
    h += views(cur, cx) + trouble(cur, cx);
    return h;
  }
  // GETTING AROUND: each view the role uses in this studio, the parts numbered on the real screen
  function views(cur, cx) {
    var l = H.VIEWS.filter(function (w) { return w.area === cur && vis({ who: w.who }, cx); });
    if (!l.length) return '';
    var on = l[0];
    return '<section class="hp-sec hp-views"><div class="sh">Getting around<small>' + l.length + (l.length === 1 ? ' view' : ' views') + '</small></div>' +
      (l.length > 1 ? '<div class="flt" role="group" aria-label="View">' + l.map(function (w, i) { return '<button type="button" data-hpv="' + w.id + '" aria-pressed="' + (i === 0) + '">' + esc(w.n) + '</button>'; }).join('') + '</div>' : '') +
      '<div id="hp-map">' + map(on) + '</div></section>';
  }
  function map(w) {
    var fr = FRAMES && FRAMES[w.f], pins = w.pins.filter(function (p) { return !FRAMES || (fr && fr.spots && fr.spots[p[0]]); });
    return '<div class="vm"><div class="vm-st"><img src="' + src(w.f) + '" alt="The ' + esc(w.n) + ', captured from the test server" decoding="async">' +
      pins.map(function (p, i) { var s = fr && fr.spots && fr.spots[p[0]]; return s ? '<button type="button" class="vm-pin" data-pin="' + i + '" style="left:' + s[0] + '%;top:' + s[1] + '%" aria-label="' + (i + 1) + ': ' + esc(p[1]) + '">' + (i + 1) + '</button>' : ''; }).join('') +
      '<i class="vm-ring" aria-hidden="true"></i><span class="wt-tag">Demo data</span></div>' +
      '<ol class="vm-lg">' + pins.map(function (p, i) { return '<li><button type="button" data-pin="' + i + '"><span class="wt-n">' + (i + 1) + '</span><span><b>' + esc(p[1]) + '</b><small>' + esc(p[2]) + '</small></span></button></li>'; }).join('') + '</ol></div>';
  }
  function trouble(cur, cx) {
    var l = (H.TROUBLE || []).filter(function (t) { return t.area === cur && vis({ who: t.who }, cx); });
    if (!l.length) return '';
    return '<section class="hp-sec"><div class="sh">Something not working?<small>' + l.length + '</small></div><div class="hp-tr">' +
      l.map(function (t) { return '<details><summary>' + esc(t.q) + '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></summary><p>' + md(t.a) + '</p></details>'; }).join('') + '</div></section>';
  }
  function foot(cx) {
    return '<footer class="hp-ft"><span>' + ico('q') + '</span><div><b>Still stuck?</b><p>' +
      (cx.admin ? 'Every role’s guides are written from the user guide. To see one role’s Help, choose it under <a class="b b-l" href="#/access">Access › Preview the home as</a>.'
        : 'Ask the admin: they can open the home exactly as your role sees it. If something is missing from your Help, your role may not open it yet.') + '</p></div></footer>';
  }

  // ── an article: the walkthrough and its steps ─────────────────────────────────────────────
  function article(a, cx) {
    if (!vis(a, cx)) {
      return '<div class="hp"><a class="b b-q hp-bk" href="#/help">' + ico('back') + 'Help</a><div class="quiet" style="margin-top:20px"><b>This guide is for another role</b><p>' + esc(a.title) +
        ' is for ' + esc(whoLine(a, cx).toLowerCase() || 'other roles') + '. Your Help lists what your role opens.</p></div></div>';
    }
    var shots = a.steps.some(function (s) { return s.f; }), rel = visible(cx).filter(function (x) { return x.area === a.area && x.group === a.group && x.id !== a.id; });
    var used = []; a.steps.forEach(function (s) { if (s.f && used.indexOf(s.f) < 0) used.push(s.f); });
    var h = '<div class="hp hp-a"><a class="b b-q hp-bk" href="#/help?a=' + a.area + '">' + ico('back') + 'Help · ' + esc(AREA[a.area].n) + '</a>' +
      '<header class="hp-ah"><h1 class="h2">' + esc(a.title) + '</h1><p class="lede">' + md(a.sum) + '</p>' +
      '<p class="hp-am">' + esc(a.group) + ' · ' + a.steps.length + ' steps · ' + secs(a) + ' s to watch · about ' + a.min + ' min to do · For ' + esc(whoLine(a, cx)) + '</p></header>' +
      '<div class="wt" id="wt" data-id="' + a.id + '"' + (shots ? '' : ' data-text') + '>' +
      (shots ? '<div class="wt-main"><div class="wt-stage" id="wt-stage" tabindex="0" aria-label="Walkthrough: ' + esc(a.title) + '. Left and right arrows move between steps, space plays and pauses.">' +
        '<div class="wt-cam">' + used.map(function (f) { return '<img src="' + src(f) + '" alt="" data-f="' + f + '" decoding="async">'; }).join('') +
        '<i class="wt-ring" aria-hidden="true"></i></div><div class="wt-card" aria-hidden="true"><span class="wt-n"></span><p></p></div>' +
        '<span class="wt-tag" title="Captured from the local test server; the names are demo names">Demo data</span></div>' +
        '<div class="wt-ctl"><button type="button" class="wt-pp" id="wt-pp" aria-label="Pause">' + ico('pause') + '</button>' +
        '<div class="wt-segs" role="group" aria-label="Steps">' + a.steps.map(function (s, i) { return '<button type="button" data-st="' + i + '" aria-label="Step ' + (i + 1) + '"><i></i></button>'; }).join('') + '</div>' +
        '<span class="wt-of" id="wt-of" aria-live="polite"></span>' +
        '<button type="button" class="wt-nv" data-nv="-1" aria-label="Previous step">' + ico('prev') + '</button><button type="button" class="wt-nv" data-nv="1" aria-label="Next step">' + ico('next') + '</button></div>' +
        '</div>' : '') +
      '<ol class="wt-steps">' + a.steps.map(function (s, i) {
        return '<li><button type="button" data-st="' + i + '"' + (shots ? '' : ' disabled') + '><span class="wt-n">' + (i + 1) + '</span><span class="wt-t">' + md(s.t) + '</span></button></li>';
      }).join('') + '</ol></div>';
    if (a.video) h += '<section class="hp-sec"><div class="sh">Recorded walkthrough</div><div class="hp-vid">' +
      (/\.(mp4|webm)(\?|$)/i.test(a.video) ? '<video controls preload="metadata" src="' + esc(a.video) + '"></video>' : '<iframe src="' + esc(a.video) + '" title="' + esc(a.title) + '" allow="fullscreen" loading="lazy"></iframe>') + '</div></section>';
    if (a.more && a.more.length) h += '<section class="hp-sec hp-more"><div class="sh">Worth knowing</div><ul>' + a.more.map(function (m) { return '<li>' + md(m) + '</li>'; }).join('') + '</ul></section>';
    if (rel.length) h += '<section class="hp-sec"><div class="sh">Also in ' + esc(a.group) + '<small>' + rel.length + '</small></div><ol class="rows hp-rows">' + rel.map(function (x) { return row(x, false, cx); }).join('') + '</ol></section>';
    return h + '</div>';
  }

  // ── the player ────────────────────────────────────────────────────────────────────────────
  function stop() { if (P && P.raf) cancelAnimationFrame(P.raf); P = null; }
  function mount(pg) {
    loadFrames().then(function () {
      if (!pg.isConnected) return;
      // thumbnails and maps were drawn before the spots arrived: draw them again with them
      if (!pg._hpFramed) { pg._hpFramed = true; var hb = pg.querySelector('#hp-body'), q = pg.querySelector('#hp-q');
        if (hb && ctx0) { var a0 = pg.querySelector('[data-hpa][aria-selected="true"]'); hb.innerHTML = body(q ? q.value : '', a0 ? a0.dataset.hpa : areaOf(ctx0), startOf(ctx0), ctx0); } }
      var wt = pg.querySelector('#wt'); if (wt && !wt.hasAttribute('data-text')) player(wt);
    });
  }
  // the studio a role opens on: its own (Help's ROLES.area), else the first it has guides in
  function areaOf(cx) {
    var ars = areasFor(cx), rk = roleKey(cx), R = rk && H.ROLES[rk];
    return R && ars.some(function (x) { return x.k === R.area; }) ? R.area : ars[0] && ars[0].k;
  }
  function startOf(cx) { var rk = roleKey(cx); if (cx.admin) return H.ROLES.admin.start.slice(); return ((rk && H.ROLES[rk]) ? H.ROLES[rk].start : []).filter(function (id) { return BY[id] && vis(BY[id], cx); }); }
  function player(wt) {
    stop();
    var a = BY[wt.dataset.id]; if (!a) return;
    P = { a: a, i: 0, t0: performance.now(), el: wt, playing: !reduce(), raf: 0, done: false, last: 0 };
    go(0);
    tick();
  }
  function frameAt(i) { for (var k = i; k >= 0; k--) if (P.a.steps[k].f) return P.a.steps[k].f; return null; }
  function go(i) {
    if (!P) return;
    var n = P.a.steps.length; i = Math.max(0, Math.min(n - 1, i));
    P.i = i; P.t0 = performance.now(); P.done = false;
    var s = P.a.steps[i], f = frameAt(i), el = P.el, st = el.querySelector('#wt-stage');
    st.querySelectorAll('img').forEach(function (im) { im.toggleAttribute('data-on', im.dataset.f === f); });
    var sp = s.f && s.s && FRAMES && FRAMES[s.f] && FRAMES[s.f].spots && FRAMES[s.f].spots[s.s], ring = st.querySelector('.wt-ring');
    if (sp) { ring.style.setProperty('--x', sp[0] + '%'); ring.style.setProperty('--y', sp[1] + '%'); ring.style.setProperty('--w', sp[2] + '%'); ring.style.setProperty('--h', sp[3] + '%'); }
    st.toggleAttribute('data-ring', !!sp);
    // THE CAMERA: the whole 1440 screen at stage size makes a button a few pixels tall, so the
    // stage moves in on the part a step names: more on a narrow stage, never past the frame's edge
    var cam = st.querySelector('.wt-cam'), z = 1, tx = 0, ty = 0;
    if (sp) {
      var narrow = st.clientWidth < 600, big = Math.max(sp[2], sp[3]) / 100;
      z = Math.max(1, Math.min(narrow ? 2.6 : 1.8, (narrow ? 0.85 : 0.7) / big));
      var cx = (sp[0] + sp[2] / 2) / 100, cy = (sp[1] + sp[3] / 2) / 100;
      tx = Math.max(1 - z, Math.min(0, 0.5 - cx * z)); ty = Math.max(1 - z, Math.min(0, 0.5 - cy * z));
    }
    cam.style.transform = 'translate(' + (tx * 100).toFixed(2) + '%,' + (ty * 100).toFixed(2) + '%) scale(' + z.toFixed(3) + ')';
    cam.style.setProperty('--z', z.toFixed(3));
    saw(P.a.id, i + 1);
    // a step with no screen of its own reads as a card over the last screen
    var card = st.querySelector('.wt-card');
    st.toggleAttribute('data-card', !s.f);
    card.querySelector('.wt-n').textContent = i + 1; card.querySelector('p').innerHTML = md(s.t);
    el.querySelectorAll('.wt-steps button').forEach(function (b, k) { b.toggleAttribute('data-on', k === i); b.toggleAttribute('data-done', k < i); if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    el.querySelectorAll('.wt-segs button').forEach(function (b, k) { b.dataset.s = k < i ? 'done' : k === i ? 'cur' : 'todo'; b.style.setProperty('--p', k < i ? 1 : 0); });
    var of = el.querySelector('#wt-of'); if (of) of.textContent = 'Step ' + (i + 1) + ' of ' + n;
    var li = el.querySelectorAll('.wt-steps li')[i];
    if (li && window.matchMedia('(min-width: 961px)').matches) { var ol = li.parentElement; if (li.offsetTop < ol.scrollTop || li.offsetTop + li.offsetHeight > ol.scrollTop + ol.clientHeight) ol.scrollTo({ top: li.offsetTop - 8, behavior: reduce() ? 'auto' : 'smooth' }); }
    setPP();
  }
  function tick() {
    if (!P) return;
    P.raf = requestAnimationFrame(function () {
      if (!P || !P.el.isConnected) { stop(); return; }
      // a paused or hidden walkthrough holds its place: the clock moves on without it
      var now = performance.now(), dt = now - (P.last || now); P.last = now;
      if (!P.playing || document.hidden) P.t0 += dt;
      else {
        var p = (now - P.t0) / STEP_MS, seg = P.el.querySelectorAll('.wt-segs button')[P.i];
        if (seg) seg.style.setProperty('--p', Math.min(1, p).toFixed(3));
        if (p >= 1) {
          if (P.i < P.a.steps.length - 1) go(P.i + 1);
          else { P.playing = false; P.done = true; setPP(); }
        }
      }
      tick();
    });
  }
  function setPP() {
    if (!P) return;
    var b = P.el.querySelector('#wt-pp'); if (!b) return;
    var k = P.done ? 'again' : P.playing ? 'pause' : 'play';
    b.innerHTML = ico(k); b.setAttribute('aria-label', P.done ? 'Watch again' : P.playing ? 'Pause' : 'Play');
    P.el.toggleAttribute('data-playing', P.playing);
  }
  function toggle() {
    if (!P) return;
    if (P.done) { P.playing = true; go(0); return; }
    P.playing = !P.playing;
    setPP();
  }

  // ── wiring ────────────────────────────────────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-hpa],[data-hpv],[data-pin],[data-st],[data-nv],#wt-pp');
    if (!t || !t.closest('.hp')) return;
    if (t.dataset.hpa) { history.replaceState(null, '', '#/help?a=' + t.dataset.hpa);
      t.parentElement.querySelectorAll('[data-hpa]').forEach(function (b) { var on = b === t; b.setAttribute('aria-selected', String(on)); if (on) b.removeAttribute('tabindex'); else b.setAttribute('tabindex', '-1'); });
      var qi = document.getElementById('hp-q'); if (qi) qi.value = '';
      var hb = document.getElementById('hp-body'); if (hb && ctx0) hb.innerHTML = body('', t.dataset.hpa, startOf(ctx0), ctx0);
      var an = document.querySelector('.hp-ah2'); if (an && an.getBoundingClientRect().top < 0) an.scrollIntoView({ block: 'start', behavior: reduce() ? 'auto' : 'smooth' });
      t.focus(); return; }
    if (t.dataset.hpv) { var w = H.VIEWS.filter(function (x) { return x.id === t.dataset.hpv; })[0]; if (!w) return;
      t.parentElement.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); });
      var m = document.getElementById('hp-map'); if (m) m.innerHTML = map(w); return; }
    if (t.dataset.pin != null) { pin(t.closest('.vm'), +t.dataset.pin); return; }
    if (t.id === 'wt-pp') { toggle(); return; }
    if (t.dataset.nv) { if (P) { go(P.i + +t.dataset.nv); } return; }
    if (t.dataset.st != null && P) { go(+t.dataset.st); }
  });
  // a pin and its legend line light together
  function pin(vm, i) {
    if (!vm) return;
    var b = vm.querySelector('.vm-pin[data-pin="' + i + '"]'), r = vm.querySelector('.vm-ring'), id = vm.querySelector('.vm-st img');
    vm.querySelectorAll('[data-pin]').forEach(function (x) { x.toggleAttribute('data-on', +x.dataset.pin === i); });
    var w = H.VIEWS.filter(function (x) { return id && id.getAttribute('src') === src(x.f); })[0];
    var p = w && w.pins.filter(function (q) { return FRAMES && FRAMES[w.f] && FRAMES[w.f].spots[q[0]]; })[i], s = p && FRAMES[w.f].spots[p[0]];
    if (s && r) { r.style.setProperty('--x', s[0] + '%'); r.style.setProperty('--y', s[1] + '%'); r.style.setProperty('--w', s[2] + '%'); r.style.setProperty('--h', s[3] + '%'); vm.setAttribute('data-ring', ''); }
    void b;
  }
  document.addEventListener('pointerover', function (e) { var t = e.target.closest && e.target.closest('.vm [data-pin]'); if (t) pin(t.closest('.vm'), +t.dataset.pin); });
  document.addEventListener('focusin', function (e) { var t = e.target.closest && e.target.closest('.vm [data-pin]'); if (t) pin(t.closest('.vm'), +t.dataset.pin); });
  document.addEventListener('keydown', function (e) {
    if (!P || !P.el.isConnected || e.altKey || e.metaKey || e.ctrlKey) return;
    var tg = e.target, typing = tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable);
    if (typing) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(P.i + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(P.i - 1); }
    else if (e.key === ' ' && (tg === document.body || (tg.closest && tg.closest('#wt-stage')))) { e.preventDefault(); toggle(); }
  });
  // the search reads as you type, without redrawing the field under the caret
  document.addEventListener('input', function (e) {
    if (e.target.id !== 'hp-q' || !ctx0) return;
    var v = e.target.value, hb = document.getElementById('hp-body'), a0 = document.querySelector('[data-hpa][aria-selected="true"]');
    history.replaceState(null, '', '#/help' + (v ? '?q=' + encodeURIComponent(v) : ''));
    if (hb) hb.innerHTML = body(v, a0 ? a0.dataset.hpa : areaOf(ctx0), startOf(ctx0), ctx0);
  });
  // arrow keys move along the studio switch, as on Status
  document.addEventListener('keydown', function (e) {
    var t = e.target; if (!t.dataset || !t.dataset.hpa || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
    var l = [].slice.call(t.parentElement.querySelectorAll('[data-hpa]')), i = l.indexOf(t) + (e.key === 'ArrowRight' ? 1 : -1);
    if (l[i]) { e.preventDefault(); l[i].click(); }
  });
  window.addEventListener('hashchange', function () { if (!/^#\/help\//.test(location.hash)) stop(); });

  var css = `
.hp{--hp-col:minmax(0,1fr); max-width:1120px}
.hp-hd{display:flex; align-items:flex-end; gap:24px 40px; flex-wrap:wrap; margin:0 0 20px}
.hp-hd-t{flex:1 1 520px; min-width:0}
.hp-who{display:flex; flex-wrap:wrap; align-items:center; gap:8px 10px; margin:14px 0 0; font:500 15px/1.3 var(--ps-font); color:var(--ps-ink)}
.hp-role{display:inline-flex; align-items:center; height:26px; padding:0 11px; border-radius:var(--ps-pill); background:var(--ps-fill-on); font:500 13px/1 var(--ps-font); color:var(--ps-ink)}
.hp-pv{display:inline-flex; align-items:center; gap:6px; font:400 13px/1 var(--ps-font); color:var(--ps-ink-2)}
.hp-pv svg.i{width:15px; height:15px}
.hp-hd .lede{margin-top:10px; text-wrap:pretty}
.hp-in{display:flex; align-items:center; gap:20px; margin:22px 0 0}
.hp-q{flex:0 1 300px; min-width:220px; margin-left:auto}
.srch.hp-q{display:flex; align-items:center; gap:10px; height:40px; padding:0 14px; border-radius:var(--ps-pill); background:var(--ps-fill); color:var(--ps-ink-2); box-sizing:border-box; cursor:text}
.srch.hp-q:focus-within{outline:2px solid var(--ps-ink); outline-offset:2px}
.srch.hp-q input{flex:1; min-width:0; height:100%; border:0; background:none; color:var(--ps-ink); font:400 15px/1 var(--ps-font); outline:none}
.srch.hp-q input::placeholder{color:var(--ps-dim)}
.srch.hp-q input::-webkit-search-cancel-button{filter:grayscale(1); opacity:.6}
.hp-sec{margin:0 0 36px}
.hp-start{margin-bottom:44px}
.hp-rows{gap:10px}
.hp-row{list-style:none}
.hp-ra{display:grid; grid-template-columns:120px minmax(0,1fr) auto; align-items:center; gap:20px; padding:12px 16px 12px 12px; border-radius:16px; background:var(--ps-card);
  box-shadow:inset 0 0 0 1px var(--ps-hair); color:var(--ps-ink); text-decoration:none; transition:box-shadow var(--ps-motion) var(--ps-ease), background-color var(--ps-motion) var(--ps-ease)}
.hp-ra:hover{box-shadow:inset 0 0 0 1px var(--ps-line); background:var(--ps-card-h)}
.hp-row[data-lead] .hp-ra{padding:14px 18px 14px 14px; gap:22px}
.hp-th{position:relative; display:grid; place-items:center; aspect-ratio:4/3; border-radius:8px; overflow:hidden; background:var(--ps-stage); box-shadow:0 0 0 1px var(--ps-hair); color:var(--ps-dim)}
.hp-th img{position:absolute; left:0; top:0; width:100%; height:auto; display:block; max-width:none}
.hp-tr-r{position:absolute; border-radius:6px; box-shadow:0 0 0 1.5px var(--ps-link), 0 0 0 999px rgb(10 11 13 / .18); pointer-events:none}
.hp-th[data-none]{background:var(--ps-fill)}
.hp-th[data-none] svg.i{width:26px; height:26px; stroke-width:1.5}
.hp-rt{display:flex; flex-direction:column; gap:5px; min-width:0}
.hp-rt b{font:500 15px/1.3 var(--ps-font); color:var(--ps-ink)}
.hp-row[data-lead] .hp-rt b{font-size:18px}
.hp-rs{font:400 14px/1.45 var(--ps-font); color:var(--ps-ink-2); max-width:62ch}
.hp-rs b{font-weight:500; color:var(--ps-ink)}
.hp-rm{display:flex; align-items:center; gap:10px; margin-top:3px; font:400 13px/1.3 var(--ps-font); color:var(--ps-ink-2); font-variant-numeric:tabular-nums}
.hp-rm .seg i{width:12px}
.hp-go{pointer-events:none}
.hp-ra:hover .hp-go.b-g{background:var(--ps-fill-h)}
.hp-ra:hover .hp-go.b-p{background:var(--ps-primary-h)}
.hp-go svg.i{width:15px; height:15px; fill:currentColor; stroke:none}
.hp-bar{position:sticky; top:55px; z-index:5; display:flex; align-items:center; gap:12px 20px; flex-wrap:wrap; margin:0 -32px 32px; padding:12px 32px; background:color-mix(in srgb, var(--ps-app) 92%, transparent);
  -webkit-backdrop-filter:saturate(1.2) blur(10px); backdrop-filter:saturate(1.2) blur(10px); box-shadow:0 1px 0 var(--ps-hair)}
.hp-sw{display:inline-flex; gap:2px; padding:4px; border-radius:var(--ps-pill); background:var(--ps-fill)}
.hp-sw button{display:inline-flex; align-items:center; gap:8px; height:40px; padding:0 20px; white-space:nowrap; flex:none; border:0; border-radius:var(--ps-pill); background:transparent; color:var(--ps-ink-2); cursor:pointer;
  font:600 14px/1 var(--ps-font); letter-spacing:.16px; transition:background-color var(--ps-motion) var(--ps-ease), color var(--ps-motion) var(--ps-ease)}
.hp-sw button:hover{background:var(--ps-fill-h); color:var(--ps-ink)}
.hp-sw button[aria-selected="true"]{background:var(--ps-fill-on); color:var(--ps-ink)}
.hp-sw s{display:inline-grid; place-items:center; min-width:22px; height:22px; padding:0 6px; box-sizing:border-box; border-radius:var(--ps-pill); background:var(--ps-card); text-decoration:none;
  font:600 11.5px/1 var(--ps-font); color:var(--ps-ink-2); font-variant-numeric:tabular-nums}
.hp-ah2{margin:8px 0 22px; scroll-margin-top:130px}
.hp-an{margin:0; font:400 28px/1.2 var(--ps-font); letter-spacing:-.018em; color:var(--ps-ink)}
.hp-ad{margin:6px 0 0; font:400 15px/1.5 var(--ps-font); color:var(--ps-ink-2); max-width:62ch; text-wrap:pretty}
.hp-none{margin:0 0 36px; font:400 14px/1.5 var(--ps-font); color:var(--ps-ink-2)}
/* the view maps: the real screen, numbered */
.vm{display:grid; grid-template-columns:minmax(0,1fr) 300px; gap:20px; align-items:start}
.vm-st{position:relative; aspect-ratio:1440/900; border-radius:14px; overflow:hidden; background:var(--ps-stage); box-shadow:0 0 0 1px var(--ps-hair)}
.vm-st img{position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block}
.vm-pin{position:absolute; z-index:2; transform:translate(-35%,-35%); display:grid; place-items:center; width:26px; height:26px; padding:0; border:0; border-radius:50%; cursor:pointer;
  background:var(--ps-primary); color:var(--ps-primary-i); font:600 12.5px/1 var(--ps-font); box-shadow:0 0 0 2px var(--ps-app); transition:transform var(--ps-motion) var(--ps-ease)}
.vm-pin:hover,.vm-pin[data-on]{transform:translate(-35%,-35%) scale(1.14)}
.vm-ring,.wt-ring{position:absolute; z-index:1; left:var(--x,0); top:var(--y,0); width:var(--w,0); height:var(--h,0); border-radius:8px; pointer-events:none; opacity:0;
  box-shadow:0 0 0 calc(2.5px / var(--z,1)) var(--ps-link), 0 0 0 9999px rgb(10 11 13 / .34); transition:left 520ms var(--ps-ease), top 520ms var(--ps-ease), width 520ms var(--ps-ease), height 520ms var(--ps-ease), opacity 240ms var(--ps-ease)}
.vm[data-ring] .vm-ring,.wt-stage[data-ring] .wt-ring{opacity:1}
.vm-lg{list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:4px}
.vm-lg button{display:grid; grid-template-columns:26px minmax(0,1fr); gap:12px; width:100%; padding:10px; border:0; border-radius:14px; background:none; text-align:left; cursor:pointer; color:var(--ps-ink)}
.vm-lg button:hover,.vm-lg button[data-on]{background:var(--ps-fill)}
.vm-lg b{display:block; font:500 14px/1.3 var(--ps-font)}
.vm-lg small{display:block; margin-top:3px; font:400 13px/1.45 var(--ps-font); color:var(--ps-ink-2)}
.wt-n{display:inline-grid; place-items:center; width:26px; height:26px; flex:none; border-radius:50%; background:var(--ps-fill); color:var(--ps-ink-2); font:600 12.5px/1 var(--ps-font); font-variant-numeric:tabular-nums}
.vm-lg button[data-on] .wt-n{background:var(--ps-primary); color:var(--ps-primary-i)}
.wt-tag{position:absolute; z-index:3; right:12px; bottom:12px; display:inline-flex; align-items:center; height:24px; padding:0 10px; border-radius:var(--ps-pill);
  background:color-mix(in srgb, var(--ps-card) 88%, transparent); box-shadow:inset 0 0 0 1px var(--ps-hair); font:500 12px/1 var(--ps-font); color:var(--ps-ink-2)}
/* troubleshooting */
.hp-tr{display:flex; flex-direction:column; gap:8px}
.hp-tr details{border-radius:14px; background:var(--ps-card); box-shadow:inset 0 0 0 1px var(--ps-hair)}
.hp-tr summary{display:flex; align-items:center; gap:12px; padding:14px 16px; list-style:none; cursor:pointer; font:500 15px/1.35 var(--ps-font); color:var(--ps-ink)}
.hp-tr summary::-webkit-details-marker{display:none}
.hp-tr summary svg.i{margin-left:auto; color:var(--ps-ink-2); transition:transform var(--ps-motion) var(--ps-ease)}
.hp-tr details[open] summary svg.i{transform:rotate(180deg)}
.hp-tr p{margin:0; padding:0 16px 16px; font:400 14px/1.55 var(--ps-font); color:var(--ps-ink-2); max-width:72ch}
.hp-tr b,.hp-more b{font-weight:500; color:var(--ps-ink)}
.hp code,.wt code{font:400 .92em/1 ui-monospace,SFMono-Regular,Menlo,monospace; padding:2px 5px; border-radius:6px; background:var(--ps-fill); color:var(--ps-ink); overflow-wrap:anywhere}
.hp-ft{display:grid; grid-template-columns:auto minmax(0,1fr); gap:16px; align-items:start; padding:22px 24px; border-radius:16px; background:var(--ps-fill); margin-top:8px}
.hp-ft > span svg.i{width:24px; height:24px; color:var(--ps-ink-2)}
.hp-ft b{display:block; font:500 17px/1.3 var(--ps-font)}
.hp-ft p{margin:6px 0 0; font:400 14px/1.5 var(--ps-font); color:var(--ps-ink-2); max-width:72ch}
.hp-ft .b-l{display:inline; font-size:inherit}
/* an article */
.hp-bk{margin:0 0 18px -12px}
.hp-ah{margin:0 0 24px}
.hp-ah .h2{text-wrap:balance}
.hp-am{margin:12px 0 0; font:400 13px/1.4 var(--ps-font); color:var(--ps-ink-2)}
.wt{display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:24px; align-items:start; margin:0 0 40px}
.wt[data-text]{grid-template-columns:minmax(0,1fr)}
.wt-main{min-width:0}
.wt-stage{position:relative; aspect-ratio:1440/900; border-radius:16px; overflow:hidden; background:var(--ps-stage); box-shadow:0 0 0 1px var(--ps-hair); outline-offset:3px}
.wt-cam{position:absolute; inset:0; transform-origin:0 0; transition:transform 560ms var(--ps-ease); will-change:transform}
.wt-stage img{position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; opacity:0; transition:opacity 320ms var(--ps-ease)}
.wt-stage img[data-on]{opacity:1}
.wt-card{position:absolute; z-index:2; left:50%; top:50%; width:min(78%, 520px); transform:translate(-50%,-46%); display:grid; grid-template-columns:auto minmax(0,1fr); gap:14px; align-items:start;
  padding:22px 24px; border-radius:16px; background:var(--ps-card); box-shadow:inset 0 0 0 1px var(--ps-line); opacity:0; pointer-events:none; transition:opacity 240ms var(--ps-ease), transform 320ms var(--ps-ease)}
.wt-stage[data-card] .wt-card{opacity:1; transform:translate(-50%,-50%)}
.wt-stage[data-card]::after{content:''; position:absolute; inset:0; background:rgb(10 11 13 / .34)}
.wt-card .wt-n{background:var(--ps-primary); color:var(--ps-primary-i)}
.wt-card p{margin:2px 0 0; font:400 15px/1.5 var(--ps-font); color:var(--ps-ink)}
.wt-card b{font-weight:500}
.wt-ctl{display:flex; align-items:center; gap:12px; margin:14px 0 0}
.wt-pp{display:grid; place-items:center; width:40px; height:40px; flex:none; padding:0; border:0; border-radius:50%; background:var(--ps-primary); color:var(--ps-primary-i); cursor:pointer;
  transition:background-color var(--ps-motion) var(--ps-ease)}
.wt-pp:hover{background:var(--ps-primary-h)}
.wt-pp svg.i{width:18px; height:18px}
.wt-pp svg.i path[d^="M8 5.5"]{fill:currentColor; stroke:none}
.wt-segs{display:flex; flex:1; gap:4px; min-width:0}
.wt-segs button{flex:1; height:20px; padding:0; border:0; background:none; cursor:pointer; display:flex; align-items:center}
.wt-segs i{position:relative; display:block; width:100%; height:4px; border-radius:var(--ps-pill); background:var(--ps-line); overflow:hidden}
.wt-segs i::after{content:''; position:absolute; inset:0; transform-origin:left; transform:scaleX(var(--p,0)); background:var(--ps-link)}
.wt-segs button[data-s="done"] i::after{background:var(--ps-good); transform:none}
.wt-segs button:hover i{background:var(--ps-ink-2)}
.wt-of{font:500 13px/1 var(--ps-font); color:var(--ps-ink-2); white-space:nowrap; font-variant-numeric:tabular-nums}
.wt-nv{display:grid; place-items:center; width:36px; height:36px; padding:0; border:0; border-radius:50%; background:var(--ps-fill); color:var(--ps-ink); cursor:pointer}
.wt-nv:hover{background:var(--ps-fill-h)}
.wt-steps{list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:4px; max-height:min(68vh, 560px); overflow:auto; scrollbar-width:thin; scrollbar-color:var(--ps-line) transparent}
.wt[data-text] .wt-steps{max-height:none; max-width:760px}
.wt-steps button{display:grid; grid-template-columns:26px minmax(0,1fr); gap:12px; width:100%; padding:12px; border:0; border-radius:14px; background:none; text-align:left; cursor:pointer;
  color:var(--ps-ink-2); transition:background-color var(--ps-motion) var(--ps-ease), color var(--ps-motion) var(--ps-ease)}
.wt-steps button:disabled{cursor:default; color:var(--ps-ink)}
.wt-steps button:not(:disabled):hover{background:var(--ps-fill)}
.wt-steps button[data-on]{background:var(--ps-card); box-shadow:inset 0 0 0 1px var(--ps-line); color:var(--ps-ink)}
.wt-steps button[data-on] .wt-n{background:var(--ps-fill-on); color:var(--ps-ink)}
.wt-steps button[data-done] .wt-n{background:var(--ps-good-q); color:var(--ps-good)}
.wt-t{font:400 15px/1.5 var(--ps-font)}
.wt-t b{font-weight:500; color:var(--ps-ink)}
.hp-more ul{margin:0; padding:0 0 0 20px; display:flex; flex-direction:column; gap:8px; max-width:72ch; font:400 15px/1.55 var(--ps-font); color:var(--ps-ink-2)}
.hp-more li::marker{color:var(--ps-dim)}
.hp-vid{aspect-ratio:16/9; border-radius:16px; overflow:hidden; background:var(--ps-stage)}
.hp-vid video,.hp-vid iframe{width:100%; height:100%; border:0; display:block}
@media (max-width:960px){
  .wt,.vm{grid-template-columns:minmax(0,1fr)}
  .wt-steps{max-height:none}
}
@media (max-width:640px){
  .hp-hd{margin-bottom:28px}
  .hp-q{flex:1 1 100%; min-width:0; margin-left:0}
  .hp-ra,.hp-row[data-lead] .hp-ra{grid-template-columns:88px minmax(0,1fr); gap:14px; padding:10px}
  .hp-an{font-size:24px}
  .hp .hp-go{display:none}
  .hp-row[data-lead] .hp-rt b{font-size:16px}
  .hp-bar{margin:0 -16px 24px; padding:10px 16px; top:0; position:relative}
  .hp-sw{max-width:100%; overflow-x:auto; scrollbar-width:none}
  .hp-sw button{padding:0 14px}
  .wt-of{display:none}
  .vm-pin{width:22px; height:22px; font-size:12.5px}
  .wt-tag{right:8px; bottom:8px}
}
@media (prefers-reduced-motion:reduce){ .wt-ring,.vm-ring,.wt-stage img,.wt-card,.vm-pin,.wt-cam{transition:none} }
`;
  var st = document.createElement('style'); st.id = 'help-css'; st.textContent = css; document.head.appendChild(st);
  loadFrames();
  window.providentHelp = { render: render, mount: mount, stop: stop, visible: function (cx) { return visible(cx).map(function (a) { return a.id; }); } };
})();
