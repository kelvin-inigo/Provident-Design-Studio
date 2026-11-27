/* web-app.js — PDS ON A PHONE'S HOME SCREEN (2026-11-26)
   Loaded by the home page and both studios. It draws nothing: it tells the stylesheets what a
   native app would know, as attributes and one variable on <html>, and each document's own PHONE
   block does the rest.

     data-standalone   opened from the home-screen icon (no browser bar, no back button)
     data-kb           the on-screen keyboard is up;  --kb is its height in px
     data-scrolled     the page's main scroller has left the top (> 12px)
     data-past         … and is past the page's big title (> 96px)
     data-sdir="down"  the last real movement was down the page; removed on the way back up

   NOT the iOS app shell that was deleted on 2026-10-21 (docs/notes/architecture.md): there is no
   native wrapper here and nothing native is called. This is the web page, behaving.

   Nothing in here touches a canvas, a store or a studio's state. Remove the script tag and the
   pages are exactly what they were. */
(function () {
  'use strict';
  var d = document, root = d.documentElement, vv = window.visualViewport || null;
  var mm = function (q) { try { return window.matchMedia(q).matches; } catch (e) { return false; } };
  var standalone = navigator.standalone === true || mm('(display-mode: standalone)');
  var coarse = mm('(pointer:coarse)');
  var set = function (k, v) {
    if (v === null || v === false || v === undefined) { if (root.hasAttribute(k)) root.removeAttribute(k); }
    else if (root.getAttribute(k) !== String(v)) root.setAttribute(k, v);
  };
  if (standalone) set('data-standalone', '1');

  // iOS paints :active only when the document listens for touches at all
  d.addEventListener('touchstart', function () {}, { passive: true });

  // ── THE KEYBOARD ─────────────────────────────────────────────────────────────────────────
  // iOS does not shrink the page for the keyboard, it slides over it: only the visual viewport
  // knows. Bars pinned to the foot stand down while it is up, and the field being typed in is
  // kept clear of it.
  var isField = function (el) {
    if (!el || el === d.body) return false;
    if (el.isContentEditable) return true;
    var t = el.tagName;
    if (t === 'TEXTAREA') return true;
    if (t !== 'INPUT') return false;
    return !/^(button|submit|reset|checkbox|radio|range|color|file|image|hidden)$/i.test(el.type || 'text');
  };
  var maxH = window.innerHeight, kbOn = false, kbT = 0;
  var locked = function () { return root.scrollHeight <= window.innerHeight + 2; };
  var reveal = function () {
    var el = d.activeElement; if (!isField(el) || !vv) return;
    var r = el.getBoundingClientRect(), top = vv.offsetTop + 56, foot = vv.offsetTop + vv.height - 12;
    if (r.bottom > foot || r.top < top) { try { el.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (e) {} }
  };
  var kbRead = function () {
    var h = 0;
    if (vv) h = Math.max(0, window.innerHeight - vv.height);
    var typing = isField(d.activeElement);
    // a browser that resizes the page instead (Android) shows as a page shorter than it has been
    var on = typing && (h > 120 || (coarse && maxH - window.innerHeight > 120));
    if (!typing && window.innerHeight > maxH) maxH = window.innerHeight;
    root.style.setProperty('--kb', (on ? Math.round(h) : 0) + 'px');
    if (on !== kbOn) {
      kbOn = on; set('data-kb', on ? '1' : null);
      // twice: iOS is still sliding the keyboard up at 90 ms, and the first look can be early
      if (on) { clearTimeout(kbT); kbT = setTimeout(reveal, 90); setTimeout(reveal, 420); }
      // the keyboard leaves a fixed-height screen pushed up; put it back
      else if (locked() && (window.scrollY || (vv && vv.offsetTop))) window.scrollTo(0, 0);
    }
  };
  if (vv) { vv.addEventListener('resize', kbRead); vv.addEventListener('scroll', kbRead); }
  window.addEventListener('resize', function () { if (!kbOn && !isField(d.activeElement)) maxH = window.innerHeight; kbRead(); });
  d.addEventListener('focusin', function () { setTimeout(kbRead, 60); setTimeout(kbRead, 360); }, true);
  // THE FIELD YOU ARE IN STAYS IN VIEW (2026-11-27, by request): moving to the next field with the
  // keyboard already up, the keyboard changing height (its suggestions bar), and a textarea growing
  // under your typing all bring the field back above the keyboard
  var kbH = 0;
  d.addEventListener('focusin', function () { if (kbOn) setTimeout(reveal, 120); }, true);
  if (vv) vv.addEventListener('resize', function () { var h = Math.round(window.innerHeight - vv.height); if (kbOn && Math.abs(h - kbH) > 24) setTimeout(reveal, 60); kbH = h; });
  d.addEventListener('input', function (e) { if (kbOn && e.target && e.target.tagName === 'TEXTAREA') reveal(); }, true);
  d.addEventListener('focusout', function () { setTimeout(kbRead, 60); setTimeout(kbRead, 360); }, true);
  // a tap on the page itself puts the keyboard away, as it does in an app; a tap on a control
  // is left alone, so a button beside the field still works with the keyboard up
  var tap = null;
  d.addEventListener('touchstart', function (e) {
    var t = e.touches[0]; tap = kbOn && e.touches.length === 1 ? { x: t.clientX, y: t.clientY, el: e.target } : null;
  }, { passive: true, capture: true });
  d.addEventListener('touchend', function (e) {
    if (!tap) return;
    var t = e.changedTouches[0], el = tap.el, moved = Math.abs(t.clientX - tap.x) + Math.abs(t.clientY - tap.y) > 10; tap = null;
    if (moved || !el || !el.closest) return;
    if (el.closest('input,textarea,select,button,a,label,summary,[contenteditable],[role="button"],[role="option"],[role="menuitem"],[tabindex],[data-kbkeep]')) return;
    var a = d.activeElement; if (isField(a)) a.blur();
  }, { passive: true, capture: true });

  // ── WHERE THE PAGE IS ────────────────────────────────────────────────────────────────────
  // One scroller counts at a time: the document on the home page, the big pane on a studio
  // screen. The bars compact on the way down and come back on the way up, as Safari's do.
  var sc = null, last = 0, acc = 0, hold = 0, raf = 0;
  var isMain = function (el) {
    if (el === d || el === root || el === d.body || el === d.scrollingElement) return true;
    if (!el || !el.getBoundingClientRect || el.scrollHeight <= el.clientHeight + 40) return false;
    // a panel, a sheet or a menu is never the page (a panel's scroll once hid the studio's bar)
    if (el.closest && el.closest('.p-rail,.gd-in-zone,.sht-p,.php-sht-p,.pm,.p-share-m,.p-dock-b')) return false;
    return el.clientHeight > window.innerHeight * 0.5 && el.clientWidth > window.innerWidth * 0.8;
  };
  var topOf = function (el) {
    if (el === d) { var m = Math.max(0, root.scrollHeight - window.innerHeight); return Math.min(m, Math.max(0, window.scrollY)); }
    return Math.min(Math.max(0, el.scrollHeight - el.clientHeight), Math.max(0, el.scrollTop));
  };
  var paint = function () {
    raf = 0;
    if (!sc || (sc !== d && !sc.isConnected)) { sc = null; set('data-scrolled', null); set('data-past', null); set('data-sdir', null); return; }
    var y = topOf(sc), dy = y - last, now = Date.now(); last = y;
    set('data-scrolled', y > 12 ? '1' : null);
    set('data-past', y > 96 ? '1' : null);
    if (y <= 24) { acc = 0; if (root.hasAttribute('data-sdir')) { set('data-sdir', null); hold = now + 260; } return; }
    // a bar that changes height moves the content under the finger: wait that out
    if (now < hold) { acc = 0; return; }
    if ((dy > 0) !== (acc > 0)) acc = 0;
    acc += dy;
    if (acc > 28 && y > 72 && !root.hasAttribute('data-sdir')) { set('data-sdir', 'down'); hold = now + 260; acc = 0; }
    else if (acc < -18 && root.hasAttribute('data-sdir')) { set('data-sdir', null); hold = now + 260; acc = 0; }
  };
  d.addEventListener('scroll', function (e) {
    var el = e.target === root || e.target === d.body ? d : e.target;
    if (!isMain(el)) return;
    if (el !== sc) { sc = el; last = topOf(el); acc = 0; }
    if (!raf) raf = requestAnimationFrame(paint);
  }, { passive: true, capture: true });
  // a screen that was swapped for another starts at its top
  var recheck = function () { setTimeout(function () { if (sc && !raf) raf = requestAnimationFrame(paint); }, 140); };
  d.addEventListener('click', recheck, true);
  // a new page starts with its bars out
  window.addEventListener('hashchange', function () { sc = null; acc = 0; set('data-sdir', null); set('data-past', null); set('data-scrolled', null); recheck(); });

  // ── OPENED FROM THE HOME SCREEN ──────────────────────────────────────────────────────────
  if (standalone) {
    // no pinch zoom in an app (the canvases' own two-finger gestures are pointer events, untouched)
    d.addEventListener('gesturestart', function (e) { if (!(e.target && e.target.closest && e.target.closest('[data-zoomok]'))) e.preventDefault(); }, { passive: false });
    // a link to another PDS page that asks for a new tab would open a browser sheet over the
    // app; here it opens in the app. Another site's link is left to iOS.
    d.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button) return;
      var a = e.target && e.target.closest ? e.target.closest('a[target="_blank"][href]') : null;
      if (!a || a.hasAttribute('download')) return;
      var u; try { u = new URL(a.href, location.href); } catch (x) { return; }
      if (u.origin !== location.origin || !/(\.html$|\/$)/.test(u.pathname)) return;
      e.preventDefault(); location.assign(u.href);
    }, false);
  }

  // ── THE STATUS BAR'S COLOUR FOLLOWS THE THEME ────────────────────────────────────────────
  var tc = function () {
    var m = d.querySelector('meta[name="theme-color"]'); if (!m) return;
    var c = ''; try { c = getComputedStyle(root).getPropertyValue('--ps-app').trim(); } catch (e) {}
    if (!c) c = root.getAttribute('data-theme') === 'light' ? '#FFFFFF' : '#131519';
    if (m.getAttribute('content') !== c) m.setAttribute('content', c);
  };
  try { new MutationObserver(tc).observe(root, { attributes: true, attributeFilter: ['data-theme'] }); } catch (e) {}
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', tc); else tc();
  window.addEventListener('load', tc);

  window.providentWebApp = { standalone: standalone, keyboard: function () { return kbOn; } };
})();
