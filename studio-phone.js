/* studio-phone.js — CAS AND OPS ON A PHONE (2026-11-26, /impeccable critique of the phone view)
   Loaded by both studios, after web-app.js. Below 761px it turns the editor into a phone app:

     ONE TOP BAR   back (to Home) · Ad set | Design or Guided | All controls · Undo / Redo · More.
                   The bar's other controls (Projects, Source folder, Save, Share, the theme,
                   Preview, the step that moves the work on) are in More's sheet. They stay in the
                   studio's own markup, hidden by the phone stylesheet, and More presses them.
     GUIDED FIRST  a project opens in Ad set (CAS) or Guided (OPS); Design / All controls is one tap.
     SHEETS        the Components / Component / Layout (CAS) and Template / Slide (OPS) panels
                   are bottom sheets: drag the grabber down to close, up for the full height.
                   The variant docks (CAS) and Post look (OPS) are a fourth tab and a sheet of
                   their own, so nothing floats over the artwork.

   NOTHING HERE IS INSIDE THE STUDIO'S RENDER TREE: the back and More buttons, the dock tab and the
   sheets are appended to <body> and positioned over the bars, so a re-render can never drop them
   or trip over them. Chrome only; no canvas op is touched. Above 760px it does nothing. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(max-width:760px)') : { matches: false };
  var phone = function () { return mq.matches; };
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var CAS = /Campaign/i.test(d.title) || /Campaign/.test(location.pathname);
  var icon = function (p) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + p + '"/></svg>'; };
  var I = {
    back: 'M15 5l-7 7 7 7',
    more: 'M5.5 12h.01M12 12h.01M18.5 12h.01',
    chev: 'M9 6l6 6-6 6',
    go: 'M5 12h14M13 6l6 6-6 6',
    eye: 'M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z',
    share: 'M12 3.5v11M7.5 8 12 3.5 16.5 8M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13',
    save: 'M5 4h11l3 3v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4zM8 4v5h7V4M8 20v-6h8v6',
    folder: 'M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    sun: 'M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6zM12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4',
    layers: 'M12 4 3 8.5l9 4.5 9-4.5L12 4zM3 13l9 4.5 9-4.5'
  };

  // ── the elements of our own, outside the studio's tree ───────────────────────────────────
  var back, more, dockBtn, sheet, sheetP, sheetB, dockBack;
  function build() {
    if (back) return;
    back = d.createElement('button'); back.type = 'button'; back.className = 'php-back'; back.setAttribute('aria-label', 'Home');
    back.innerHTML = icon(I.back) + '<span>Home</span>';
    more = d.createElement('button'); more.type = 'button'; more.className = 'php-more'; more.setAttribute('aria-label', 'More'); more.setAttribute('aria-haspopup', 'dialog');
    more.innerHTML = icon(I.more);
    dockBtn = d.createElement('button'); dockBtn.type = 'button'; dockBtn.className = 'php-dockbtn';
    dockBtn.innerHTML = icon(I.layers) + '<span>' + (CAS ? 'Variants' : 'Look') + '</span>';
    dockBack = d.createElement('div'); dockBack.className = 'php-dsheet'; dockBack.setAttribute('aria-hidden', 'true');
    sheet = d.createElement('div'); sheet.className = 'php-sht'; sheet.hidden = true;
    sheet.innerHTML = '<div class="php-sht-s"></div><div class="php-sht-p" role="dialog" aria-modal="true" aria-labelledby="php-sht-h" tabindex="-1"><span class="php-sht-g" aria-hidden="true"></span><div class="php-sht-b"></div></div>';
    sheetP = $('.php-sht-p', sheet); sheetB = $('.php-sht-b', sheet);
    [back, more, dockBtn, dockBack, sheet].forEach(function (n) { d.body.appendChild(n); });
    back.addEventListener('click', function () { var wm = $('.p-top > .p-wm'); if (wm) wm.click(); });
    more.addEventListener('click', openMore);
    dockBtn.addEventListener('click', function () { setDock(!root.hasAttribute('data-phdock-on')); });
    sheet.addEventListener('click', function (e) {
      if (e.target.classList.contains('php-sht-s')) { closeSheet(); return; }
      var b = e.target.closest('[data-php]'); if (!b) return;
      var k = b.getAttribute('data-php'), tgt = targets()[k];
      if (k === 'light' || k === 'dark') {
        var light = root.getAttribute('data-theme') === 'light';
        if ((k === 'light') !== light && tgt) tgt.click();
        setTimeout(openMore, 60); return;
      }
      closeSheet(true);
      if (tgt) setTimeout(function () { tgt.click(); }, 30);
    });
    drag(sheetP, function () { return true; }, function (dy) { sheetP.style.setProperty('--dy', dy + 'px'); },
      function (dy, fast) { if (dy > 110 || fast) closeSheet(); else sheetP.style.removeProperty('--dy'); });
    d.addEventListener('keydown', function (e) {
      if (sheet.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); closeSheet(); return; }
      if (e.key === 'Tab') trap(e, sheetP);
    });
  }

  // ── the bar's controls, found by what they are, each time (the studio re-renders them) ──────
  function targets() {
    var top = $('.p-top'); if (!top) return {};
    var q = function (s) { return $(s, top); };
    var byTitle = function (re) { return [].slice.call(top.querySelectorAll('.p-tgrp:not(.p-tgrp-h) button')).filter(function (b) { return re.test(b.title || ''); })[0]; };
    var theme = q(':scope > .p-ico-o');
    return {
      flow: q('.p-flow .p-flow-go') || q('.p-flow .p-flow-fin'),
      preview: q(':scope > .p-prev'),
      share: q('.p-share > button'),
      save: byTitle(/^Save/), folder: byTitle(/folder/i), projects: byTitle(/^Projects/),
      light: theme, dark: theme
    };
  }
  var label = function (el, fb) { var t = el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : ''; return t || fb; };
  function row(k, ic, text, sub, primary) {
    return '<button type="button" class="php-r' + (primary ? ' php-r-p' : '') + '" data-php="' + k + '">' + icon(ic) +
      '<span class="php-t">' + text + (sub ? '<small>' + sub + '</small>' : '') + '</span>' + icon(I.chev) + '</button>';
  }
  function openMore() {
    var t = targets(), light = root.getAttribute('data-theme') === 'light';
    // the name: the canvas bar is gone on a phone, so its field is here, and writes through to it
    var nin = $('.p-cvname input'), nv = nin ? nin.value : '', ph = nin ? nin.placeholder : '';
    var flowSeen = t.flow && t.flow.offsetParent !== null && getComputedStyle($('.p-top > .p-flow')).display !== 'none';
    var h = '<h2 class="php-h" id="php-sht-h">' + esc(nv || ph || 'This project') + '</h2>';
    if (nin) h += '<label class="php-name"><span>' + esc(nin.getAttribute('aria-label') || 'Name') + '</span><input type="text" value="' + esc(nv) + '" placeholder="' + esc(ph) + '" spellcheck="false" enterkeyhint="done" data-kbkeep></label>';
    if (t.flow && !flowSeen) h += '<div class="php-l">' + row('flow', I.go, esc(label(t.flow, 'Next step')), esc(label($('.p-top > .p-flow .p-flow-t b') || $('.p-top > .p-flow .p-flow-at'), '')), true) + '</div>';
    h += '<div class="php-l">' +
      (t.preview ? row('preview', I.eye, 'Preview', CAS ? 'The ad in Meta’s placements' : '') : '') +
      (t.share ? row('share', I.share, CAS ? 'Share and export' : 'Share and export') : '') + '</div>';
    h += '<div class="php-l">' +
      (t.save ? row('save', I.save, 'Save', /•/.test(t.save.title || '') ? 'Unsaved changes' : '') : '') +
      (t.folder ? row('folder', I.folder, 'Source folder') : '') +
      (t.projects ? row('projects', I.grid, 'Projects') : '') + '</div>';
    if (t.light) h += '<div class="php-l"><div class="php-r php-r-v">' + icon(I.sun) + '<span class="php-t">Appearance</span><span class="php-seg" role="group" aria-label="Appearance">' +
      '<button type="button" data-php="light" aria-pressed="' + light + '">Light</button><button type="button" data-php="dark" aria-pressed="' + !light + '">Dark</button></span></div></div>';
    openSheet(h.replace(/<div class="php-l"><\/div>/g, ''));
    var mine = $('.php-name input', sheet);
    if (mine && nin) {
      var setV = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      mine.addEventListener('input', function () {
        var src = $('.p-cvname input'); if (!src) return;
        setV.call(src, mine.value); src.dispatchEvent(new Event('input', { bubbles: true })); src.dispatchEvent(new Event('change', { bubbles: true }));
        $('#php-sht-h', sheet).textContent = mine.value || mine.placeholder || 'This project';
      });
      mine.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); mine.blur(); } });
    }
  }
  // the keyboard's focus stays inside an open sheet (it is modal)
  function trap(e, box) {
    var f = [].filter.call(box.querySelectorAll('button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'), function (x) { return !x.disabled && x.offsetParent !== null; });
    if (!f.length) return;
    var a = f[0], z = f[f.length - 1];
    if (e.shiftKey && (d.activeElement === a || d.activeElement === box)) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && d.activeElement === z) { e.preventDefault(); a.focus(); }
  }
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var shLast = null, shT = 0;
  function openSheet(html) {
    build(); clearTimeout(shT); setDock(false); closePanel();
    sheetB.innerHTML = html; sheetP.style.removeProperty('--dy');
    if (sheet.hidden) { shLast = d.activeElement; sheet.hidden = false; void sheetP.offsetWidth; }
    sheet.setAttribute('data-on', '');
    try { sheetP.focus({ preventScroll: true }); } catch (e) {}
  }
  function closeSheet(now) {
    if (!sheet || sheet.hidden) return;
    sheet.removeAttribute('data-on'); clearTimeout(shT);
    shT = setTimeout(function () { sheet.hidden = true; sheetB.innerHTML = ''; }, now ? 0 : 320);
    if (shLast && shLast.focus && d.contains(shLast)) try { shLast.focus({ preventScroll: true }); } catch (e) {}
  }

  // ── a drag on a sheet's top edge ──────────────────────────────────────────────────────────
  function drag(el, ok, move, end) {
    var y0 = null, dy = 0, t0 = 0;
    el.addEventListener('pointerdown', function (e) {
      if (e.button || !ok() || e.clientY - el.getBoundingClientRect().top > 30 || el.scrollTop > 0) return;
      if (e.target.closest && e.target.closest('button,a,input,select,textarea,summary,label')) return;
      y0 = e.clientY; dy = 0; t0 = Date.now(); el.style.transition = 'none';
      try { el.setPointerCapture(e.pointerId); } catch (x) {}
    });
    el.addEventListener('pointermove', function (e) { if (y0 === null) return; dy = e.clientY - y0; move(dy); });
    var fin = function () {
      if (y0 === null) return; y0 = null; el.style.transition = '';
      end(dy, Math.abs(dy) > 40 && Date.now() - t0 < 220);
    };
    el.addEventListener('pointerup', fin); el.addEventListener('pointercancel', fin);
  }

  // ── the panels: bottom sheets with a half-height and a full-height stop ────────────────────
  var RAILS = '.p-rail, .gd[data-mode="editor"] .gd-in-zone';
  function openRail() { return $('.p-rail[data-open]') || $('.gd[data-mode="editor"] .gd-in-zone[data-open]'); }
  function closePanel() { var r = openRail(), v = $('.p-veil'); if (r && v) v.click(); root.removeAttribute('data-phsl'); }
  var railsWired = new WeakSet();
  function wireRails() {
    [].forEach.call(d.querySelectorAll(RAILS), function (r) {
      if (railsWired.has(r)) return; railsWired.add(r);
      drag(r, function () { return phone() && r.hasAttribute('data-open'); },
        function (dy) { r.style.setProperty('--ph-dy', Math.max(-200, dy) + 'px'); },
        function (dy, fast) {
          r.style.removeProperty('--ph-dy');
          var big = root.hasAttribute('data-phsl');
          if (dy < -50 || (fast && dy < 0)) root.setAttribute('data-phsl', '');
          else if (dy > 90 || (fast && dy > 0)) { if (big && dy < 260) root.removeAttribute('data-phsl'); else closePanel(); }
        });
    });
  }

  // ── the docks: a fourth tab and a sheet of their own ──────────────────────────────────────
  function setDock(on) {
    if (!dockBtn) return;
    if (on) { closePanel(); root.setAttribute('data-phdock-on', ''); } else root.removeAttribute('data-phdock-on');
    dockBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  // ── keep it all in step with the studio ───────────────────────────────────────────────────
  var guided = false, lastSplash = true, want = 0, chose = false, ours = false, lastTry = 0;
  d.addEventListener('click', function (e) { if (!ours && e.target.closest && e.target.closest('.p-top > .p-seg-mode')) chose = true; }, true);
  function sync() {
    var on = phone() && !!$('.p-shell .p-top');
    root.toggleAttribute('data-phs', on);
    if (!on) { if (back) { setDock(false); closeSheet(true); } return; }
    build(); wireRails();
    var splash = !!$('.p-over-split');
    root.toggleAttribute('data-phsplash', splash);
    if (splash) { lastSplash = true; guided = false; want = 0; chose = false; setDock(false); }
    // GUIDED FIRST: a project that opens lands in Ad set (CAS) or Guided (OPS). A project still
    // loading can put the studio back in its own mode, so it is asked again for four seconds,
    // never after the person has picked a mode themselves.
    var seg = $('.p-top > .p-seg-mode');
    if (!splash && seg && lastSplash && !guided) { guided = true; lastSplash = false; want = Date.now(); chose = false; }
    if (want && seg && !chose) {
      var inFirst = CAS ? $('.p-shell').getAttribute('data-screen') === 'copy' : !!$('.gd[data-mode="guide"]');
      var first = seg.querySelector('button');
      if (inFirst && Date.now() - want > 1500) want = 0;
      else if (Date.now() - want > 4000) want = 0;
      else if (!inFirst && first && Date.now() - lastTry > 600) { lastTry = Date.now(); ours = true; first.click(); ours = false; }
    } else if (chose) want = 0;
    // the dock tab shows with the panel bar, and only when there is a dock to show
    var pb = $('.p-panelbar'), dk = $('.p-dock');
    var pbOn = pb && getComputedStyle(pb).display !== 'none' && pb.getBoundingClientRect().height > 0;
    var hasDock = !!(pbOn && dk);
    root.toggleAttribute('data-phdock', hasDock);
    if (!hasDock) setDock(false);
    if (openRail() && root.hasAttribute('data-phdock-on')) setDock(false);
    if (!openRail()) root.removeAttribute('data-phsl');
  }
  var raf = 0;
  var kick = function () { if (!raf) raf = requestAnimationFrame(function () { raf = 0; sync(); }); };
  d.addEventListener('click', function () { setTimeout(kick, 40); setTimeout(kick, 400); }, true);
  window.addEventListener('resize', kick);
  if (mq.addEventListener) mq.addEventListener('change', kick);
  setInterval(kick, 500);
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', kick); else kick();

  // ── our elements' own look (the studio markup's phone rules are in each studio's sheet) ─────
  var css = '\
.php-back,.php-more,.php-dockbtn,.php-dsheet{display:none}\
:root[data-phs] .php-back,:root[data-phs] .php-more{display:inline-flex;position:fixed;top:4px;z-index:170;height:44px;align-items:center;justify-content:center;\
  border:0;background:none;color:var(--ps-ink);font:400 16px/1 var(--font-sans,system-ui);cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}\
:root[data-phs] .php-back{left:max(2px,env(safe-area-inset-left,0px));width:44px;padding:0}\
:root[data-phs] .php-back span{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}\
:root[data-phs] .php-more{right:max(4px,env(safe-area-inset-right,0px));width:44px}\
.php-back svg,.php-more svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}\
.php-more svg{stroke-width:3.2}\
:root[data-phsplash] .php-back,:root[data-phsplash] .php-more,:root[data-phsplash] .php-dockbtn{display:none !important}\
.php-back:active,.php-more:active,.php-dockbtn:active{opacity:.6;transform:scale(.94)}\
:root[data-phs][data-phdock] .php-dockbtn{display:flex;position:fixed;right:max(10px,env(safe-area-inset-right,0px));bottom:calc(4px + env(safe-area-inset-bottom,0px));z-index:75;\
  width:calc((100vw - 20px) / 4);height:47px;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:0;border-radius:10px;background:none;\
  color:var(--ps-ink-2);font:400 11px/1.1 var(--font-sans,system-ui);cursor:pointer;touch-action:manipulation;transition:transform 90ms,opacity 90ms}\
.php-dockbtn svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linejoin:round}\
.php-dockbtn[aria-pressed="true"]{background:var(--ps-fill-on);color:var(--ps-link)}\
:root[data-phs][data-phdock-on] .php-dsheet{display:block;position:fixed;left:0;right:0;bottom:var(--ps-pbh,56px);height:var(--php-dh,132px);z-index:29;\
  border-radius:18px 18px 0 0;background:var(--ps-sb);box-shadow:0 -10px 40px rgba(0,0,0,.16);\
  background-image:linear-gradient(var(--ps-line),var(--ps-line));background-size:36px 5px;background-position:center 8px;background-repeat:no-repeat}\
.php-sht{position:fixed;inset:0;z-index:200}\
.php-sht[hidden]{display:none}\
.php-sht-s{position:absolute;inset:0;background:rgba(8,10,14,.34);opacity:0;transition:opacity 300ms cubic-bezier(.2,0,0,1)}\
.php-sht[data-on] .php-sht-s{opacity:1}\
.php-sht-p{position:absolute;left:0;right:0;bottom:0;max-height:calc(100dvh - 44px);overflow-y:auto;overscroll-behavior:contain;box-sizing:border-box;outline:none;\
  padding:8px 16px calc(20px + env(safe-area-inset-bottom,0px));border-radius:20px 20px 0 0;background:var(--ps-sb);color:var(--ps-ink);\
  box-shadow:0 -10px 40px rgba(0,0,0,.16);transform:translateY(calc(100% + 24px));transition:transform 420ms cubic-bezier(.32,.72,0,1);font-family:var(--font-sans,system-ui)}\
.php-sht[data-on] .php-sht-p{transform:translateY(max(0px,var(--dy,0px)))}\
.php-sht-g{display:block;width:36px;height:5px;margin:0 auto 10px;border-radius:3px;background:var(--ps-line)}\
.php-h{margin:4px 2px 14px;font:600 20px/1.2 var(--font-sans,system-ui);letter-spacing:-.015em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
.php-name{display:flex;flex-direction:column;gap:6px;margin:0 0 14px}\
.php-name span{font:500 13px/1 var(--font-sans,system-ui);color:var(--ps-dim);padding-left:2px}\
.php-name input{height:46px;box-sizing:border-box;padding:0 14px;border:0;border-radius:12px;background:var(--ps-fill);color:var(--ps-ink);font:400 16px/1 var(--font-sans,system-ui);outline:none}\
.php-name input:focus{box-shadow:inset 0 0 0 2px var(--ps-line)}\
.php-l{margin:0 0 14px;border-radius:14px;background:var(--ps-fill);overflow:hidden}\
.php-r{position:relative;display:flex;align-items:center;gap:14px;width:100%;min-height:52px;box-sizing:border-box;padding:0 14px;border:0;background:none;\
  color:var(--ps-ink);text-align:left;font:400 16px/1.25 var(--font-sans,system-ui);cursor:pointer;-webkit-user-select:none;user-select:none;touch-action:manipulation}\
.php-r + .php-r::before{content:"";position:absolute;left:50px;right:0;top:0;height:1px;background:var(--ps-line)}\
.php-r:active{background:var(--ps-fill-h)}\
.php-r > svg{width:22px;height:22px;flex:none;fill:none;stroke:var(--ps-ink-2);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}\
.php-r > svg:last-child{width:16px;height:16px;stroke:var(--ps-dim);stroke-width:2}\
.php-t{flex:1;min-width:0}\
.php-t small{display:block;margin-top:2px;font-size:13px;color:var(--ps-dim)}\
.php-r-p{background:var(--ps-navy-2,#1A2942);color:#fff}\
.php-r-p > svg{stroke:#fff !important}.php-r-p small{color:rgba(255,255,255,.78)}\
.php-r-p:active{background:var(--ps-navy-2,#1A2942);opacity:.85}\
.php-r-v{cursor:default}.php-r-v:active{background:none}\
.php-seg{display:inline-flex;padding:2px;gap:2px;border-radius:9px;background:var(--ps-fill-h)}\
.php-seg button{height:32px;min-width:64px;padding:0 12px;border:0;border-radius:7px;background:none;color:var(--ps-ink-2);font:500 14px/1 var(--font-sans,system-ui);cursor:pointer}\
.php-seg button[aria-pressed="true"]{background:var(--ps-sb);color:var(--ps-ink);box-shadow:0 1px 3px rgba(0,0,0,.12)}\
@media (prefers-reduced-motion:reduce){.php-sht-p,.php-sht-s{transition:none}}';
  var st = d.createElement('style'); st.id = 'php-css'; st.textContent = css;
  (d.head || root).appendChild(st);
})();
