/* Generative fill — CAS's Firefly modal. STAGED PROTOTYPE (branch `cas-genfill`, 2026-11-20).
 *
 * A photo dropped on a variant rarely has the shape of every size it feeds. This modal puts the photo in
 * the size's frame, snapped edge to edge on the axis that fits (a square in a 9:16 fills the WIDTH and
 * leaves bands above and below; a square in a 1.91:1 fills the HEIGHT and leaves bands left and right),
 * lets the user say what must stay in view (the focal crosshair) and where it sits (drag the photo), and
 * asks Adobe Firefly's Generative Expand to paint the bands. The original pixels are pasted back over the
 * middle, so the photo itself cannot drift.
 *
 * CHROME ONLY. Every colour is a --ps-* token or a CAS chrome class (p-seg, p-btn, p-ghost). Nothing here
 * paints artwork: the result goes into the photo store like any upload, and the canvas draws it as it
 * draws every photo.
 *
 * The transport is tools/genfill/serve.py on 127.0.0.1:7315 (override: localStorage 'provident-genfill-url').
 * A capability, never a requirement: with the helper off the modal still opens, shows the layout, and
 * says how to start it.
 *
 * window.ProvidentGenfill.open({ src, sizes: [{key, label, W, H, pad}], start, onApply(key, dataUrl) })
 */
(function () {
  'use strict';
  var W = window;
  var URL0 = 'http://127.0.0.1:7315';
  try { var o = W.localStorage && W.localStorage.getItem('provident-genfill-url'); if (o) URL0 = String(o).replace(/\/+$/, ''); } catch (e) {}
  var MAX_SIDE = 4096;          // Generative Expand takes at most 4096 px per side; the frame is capped there
  var STORE_LONG = 3840;        // what goes into the photo store: the 9:16's 2x export height

  var CSS = [
    '.gf-ov [hidden]{display:none!important}',
    '.gf-ov{position:fixed;inset:0;z-index:4100;display:flex;align-items:center;justify-content:center;padding:24px;background:color-mix(in srgb,var(--ps-app) 62%,transparent);font-family:var(--ps-font)}',
    '.gf-in{width:min(1120px,100%);height:min(760px,calc(100vh - 48px));display:grid;grid-template-columns:minmax(0,1fr) 320px;grid-template-rows:auto minmax(0,1fr);border-radius:16px;background:var(--ps-card);color:var(--ps-ink);box-shadow:0 0 0 1px var(--ps-hair),0 24px 64px rgba(0,0,0,.28);overflow:hidden}',
    '.gf-hd{grid-column:1/-1;display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid var(--ps-hair)}',
    '.gf-hd h2{margin:0;font:400 20px/1.2 var(--ps-font);color:var(--ps-ink)}',
    '.gf-hd p{margin:2px 0 0;font:300 13px/1.4 var(--ps-font);color:var(--ps-ink-2)}',
    '.gf-hd .gf-tt{flex:1;min-width:0}',
    '.gf-x{width:36px;height:36px;border-radius:var(--ps-pill);border:none;background:transparent;color:var(--ps-ink-2);display:grid;place-items:center;cursor:pointer}',
    '.gf-x:hover{background:var(--ps-fill-h);color:var(--ps-ink)}',
    '.gf-x svg,.gf-i{width:20px;height:20px;fill:currentColor}',
    '.gf-st{position:relative;background:var(--ps-stage);display:flex;align-items:center;justify-content:center;padding:28px;min-height:0;overflow:hidden}',
    '.gf-fr{position:relative;box-shadow:0 0 0 1px var(--ps-hair);border-radius:4px;overflow:hidden;touch-action:none;user-select:none}',
    '.gf-fr canvas{display:block;width:100%;height:100%}',
    '.gf-ph{position:absolute;outline:1.5px dashed rgba(255,255,255,.9);outline-offset:-1px;box-shadow:0 0 0 1px rgba(0,0,0,.35);cursor:grab}',
    '.gf-ph[data-drag]{cursor:grabbing}',
    '.gf-ph[data-fixed]{cursor:default}',
    '.gf-fp{position:absolute;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.45),inset 0 0 0 1px rgba(0,0,0,.35);cursor:move;touch-action:none}',
    '.gf-fp::before,.gf-fp::after{content:"";position:absolute;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.35)}',
    '.gf-fp::before{left:50%;top:-9px;bottom:-9px;width:2px;margin-left:-1px}',
    '.gf-fp::after{top:50%;left:-9px;right:-9px;height:2px;margin-top:-1px}',
    '.gf-mg{position:absolute;pointer-events:none;outline:1px solid rgba(255,255,255,.55);outline-offset:-1px;box-shadow:0 0 0 9999px rgba(0,0,0,.12)}',
    '.gf-band{position:absolute;pointer-events:none;display:flex;align-items:center;justify-content:center}',
    '.gf-band span{font:500 11px/1 var(--ps-font);letter-spacing:.08em;text-transform:uppercase;color:#fff;background:rgba(10,11,13,.55);padding:6px 10px;border-radius:var(--ps-pill);white-space:nowrap}',
    '.gf-rl{display:flex;flex-direction:column;min-height:0;border-left:1px solid var(--ps-hair)}',
    '.gf-sc{flex:1;overflow:auto;padding:16px 20px;display:grid;gap:18px;align-content:start}',
    '.gf-sec{display:grid;gap:8px}',
    '.gf-lb{font:500 11px/1.2 var(--ps-font);letter-spacing:.08em;text-transform:uppercase;color:var(--ps-ink-2)}',
    '.gf-tx{margin:0;font:300 13px/1.45 var(--ps-font);color:var(--ps-ink-2)}',
    '.gf-tx b{font-weight:500;color:var(--ps-ink)}',
    '.gf-in .p-seg{flex-wrap:wrap;width:max-content;max-width:100%}',
    '.gf-rg{display:flex;align-items:center;gap:10px}',
    '.gf-rg input{flex:1;accent-color:var(--ps-accent)}',
    '.gf-rg output{font:400 13px/1 var(--ps-font);color:var(--ps-ink);min-width:88px;text-align:right}',
    '.gf-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}',
    '.gf-ft{padding:14px 20px 18px;border-top:1px solid var(--ps-hair);display:grid;gap:10px}',
    '.gf-ft .p-btn{width:100%;height:40px;border:none;border-radius:var(--ps-pill);font:500 14px/1 var(--ps-font);cursor:pointer}',
    '.gf-ft .gf-two{display:flex;gap:8px}.gf-ft .gf-two>*{flex:1}',
    '.gf-ft .p-ghost{height:40px;font-size:13px}',
    '.gf-bar{height:4px;border-radius:2px;background:var(--ps-line);overflow:hidden;position:relative}',
    '.gf-bar i{position:absolute;top:0;bottom:0;width:36%;border-radius:2px;background:var(--ps-accent);animation:gfbar 1.4s var(--ps-ease,ease) infinite}',
    '@keyframes gfbar{0%{left:-36%}100%{left:100%}}',
    '@media (prefers-reduced-motion:reduce){.gf-bar i{animation:none;left:0;width:100%;opacity:.5}}',
    '.gf-msg{margin:0;font:300 13px/1.4 var(--ps-font);color:var(--ps-ink-2)}',
    '.gf-msg[data-bad]{color:var(--ps-bad)}',
    '.gf-msg code{font:400 12px/1.4 ui-monospace,Menlo,monospace;background:var(--ps-fill);padding:1px 5px;border-radius:4px;color:var(--ps-ink)}',
    '.gf-vs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}',
    '.gf-v{padding:0;border:none;border-radius:8px;overflow:hidden;background:var(--ps-fill);cursor:pointer;box-shadow:0 0 0 1px var(--ps-hair);aspect-ratio:1/1}',
    '.gf-v img{width:100%;height:100%;object-fit:contain;display:block;background:var(--ps-stage)}',
    '.gf-v[data-on]{box-shadow:0 0 0 2px var(--ps-accent)}',
    '.gf-v:focus-visible,.gf-x:focus-visible,.gf-fp:focus-visible{outline:2px solid var(--ps-focus);outline-offset:2px}',
    '@media (max-width:820px){.gf-in{grid-template-columns:1fr;grid-template-rows:auto minmax(260px,1fr) auto;height:calc(100vh - 32px)}.gf-rl{border-left:none;border-top:1px solid var(--ps-hair);max-height:48vh}.gf-ov{padding:16px}}'
  ].join('\n');

  var ICON_X = '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M480-437.85 277.08-234.92q-8.31 8.3-20.89 8.5-12.57.19-21.27-8.5-8.69-8.7-8.69-21.08 0-12.38 8.69-21.08L437.85-480 234.92-682.92q-8.3-8.31-8.5-20.89-.19-12.57 8.5-21.27 8.7-8.69 21.08-8.69 12.38 0 21.08 8.69L480-522.15l202.92-202.93q8.31-8.3 20.89-8.5 12.57-.19 21.27 8.5 8.69 8.7 8.69 21.08 0 12.38-8.69 21.08L522.15-480l202.93 202.92q8.3 8.31 8.5 20.89.19 12.57-8.5 21.27-8.7 8.69-21.08 8.69-12.38 0-21.08-8.69L480-437.85Z"/></svg>';
  var ICON_SPARK = '<svg class="gf-i" viewBox="0 -960 960 960" aria-hidden="true"><path d="M767.69-645.38q-4.61 0-8.07-2.85-3.47-2.85-4.85-7.46l-15.31-57.08-57.07-15.31q-4.62-1.38-7.47-4.84-2.84-3.47-2.84-8.08t2.84-8.08q2.85-3.46 7.47-4.84l57.07-15.31 15.31-57.08q1.38-4.61 4.85-7.46 3.46-2.84 8.07-2.84 4.62 0 8.08 2.84 3.46 2.85 4.85 7.46l15.3 57.08 57.08 15.31q4.62 1.38 7.46 4.84 2.85 3.47 2.85 8.08t-2.85 8.08q-2.84 3.46-7.46 4.84l-57.08 15.31-15.3 57.08q-1.39 4.61-4.85 7.46-3.46 2.85-8.08 2.85ZM767.69-120q-4.61 0-8.07-2.85-3.47-2.84-4.85-7.46l-15.31-57.07-57.07-15.31q-4.62-1.39-7.47-4.85-2.84-3.46-2.84-8.08 0-4.61 2.84-8.07 2.85-3.46 7.47-4.85l57.07-15.31 15.31-57.07q1.38-4.62 4.85-7.46 3.46-2.85 8.07-2.85 4.62 0 8.08 2.85 3.46 2.84 4.85 7.46l15.3 57.07 57.08 15.31q4.62 1.39 7.46 4.85 2.85 3.46 2.85 8.07 0 4.62-2.85 8.08-2.84 3.46-7.46 4.85l-57.08 15.31-15.3 57.07q-1.39 4.62-4.85 7.46-3.46 2.85-8.08 2.85ZM360-235.39q-7.92 0-14.35-4.65-6.42-4.65-9.27-12.19l-37.15-97.08-97.08-37.15q-7.54-2.85-12.19-9.27-4.65-6.43-4.65-14.35 0-7.92 4.65-14.35 4.65-6.42 12.19-9.27l97.08-37.15 37.15-97.08q2.85-7.54 9.27-12.19 6.43-4.65 14.35-4.65 7.92 0 14.35 4.65 6.42 4.65 9.27 12.19l37.15 97.08 97.08 37.15q7.54 2.85 12.19 9.27 4.65 6.43 4.65 14.35 0 7.92-4.65 14.35-4.65 6.42-12.19 9.27l-97.08 37.15-37.15 97.08q-2.85 7.54-9.27 12.19-6.43 4.65-14.35 4.65Z"/></svg>';

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function loadImg(src) { return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { rej(new Error('The photo could not be read.')); }; i.src = src; }); }
  function ratioLabel(w, h) { var r = w / h; return r > 1 ? r.toFixed(2).replace(/0$/, '') + ':1' : '1:' + (1 / r).toFixed(2).replace(/0$/, ''); }

  var helper = {
    state: 'unknown', info: null,
    probe: function () {
      var c = new AbortController(); var t = setTimeout(function () { c.abort(); }, 2500);
      return fetch(URL0 + '/health', { signal: c.signal, cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { clearTimeout(t); helper.info = j; helper.state = j && j.ok ? 'on' : 'off'; return helper.state; })
        .catch(function () { clearTimeout(t); helper.state = 'off'; return 'off'; });
    },
    expand: function (body) {
      return fetch(URL0 + '/expand', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || ('The helper said ' + r.status)); return j.job; }); });
    },
    job: function (id) { return fetch(URL0 + '/job/' + id, { cache: 'no-store' }).then(function (r) { return r.json(); }); }
  };

  // ── geometry ────────────────────────────────────────────────────────────────────────────────────
  // All in FRAME px (the size's own canvas, e.g. 1080 x 1920). `scale` 1 = edge to edge on the fitting
  // axis; below 1 the photo shrinks and every side is generated. The focus (fx, fy: 0-1 of the photo)
  // sits at the anchor (ax, ay: 0-1 of the frame), clamped so the photo never leaves the frame.
  function layout(st) {
    var F = st.size, k0 = Math.min(F.W / st.pw, F.H / st.ph), k = k0 * st.scale;
    var dw = st.pw * k, dh = st.ph * k;
    var ox = clamp(F.W * st.ax - st.fx * dw, Math.min(0, F.W - dw), Math.max(0, F.W - dw));
    var oy = clamp(F.H * st.ay - st.fy * dh, Math.min(0, F.H - dh), Math.max(0, F.H - dh));
    // snap sub-pixel slivers so "edge to edge" really is
    if (Math.abs(dw - F.W) < 0.5) { dw = F.W; ox = 0; }
    if (Math.abs(dh - F.H) < 0.5) { dh = F.H; oy = 0; }
    var r = st.pw / dw;                                   // source px per frame px
    var ex = { left: ox * r, right: (F.W - ox - dw) * r, top: oy * r, bottom: (F.H - oy - dh) * r };
    var fw = F.W * r, fh = F.H * r;                       // the frame in source px
    var down = Math.min(1, MAX_SIDE / Math.max(fw, fh));  // shrink the upload if the frame would pass 4096
    // round the FRAME first and give the far side the remainder, so the result is exactly the frame's shape
    var sw = Math.round(st.pw * down), sh = Math.round(st.ph * down);
    var ow = Math.max(sw, Math.round(fw * down)), oh = Math.max(sh, Math.round(fh * down));
    ex.left = Math.round(ex.left * down); ex.right = Math.max(0, ow - sw - ex.left);
    ex.top = Math.round(ex.top * down); ex.bottom = Math.max(0, oh - sh - ex.top);
    return { k: k, dw: dw, dh: dh, ox: ox, oy: oy, ex: ex, down: down, sw: sw, sh: sh, ow: sw + ex.left + ex.right, oh: sh + ex.top + ex.bottom };
  }

  function sidesText(ex) {
    var p = [];
    ['top', 'bottom', 'left', 'right'].forEach(function (s) { if (ex[s] > 0) p.push(ex[s] + ' px ' + s); });
    return p.length ? p.join(' · ') : 'Nothing — the photo already fills this frame';
  }

  // ── the modal ───────────────────────────────────────────────────────────────────────────────────
  function open(opts) {
    if (!document.getElementById('gf-css')) { var s = el('style'); s.id = 'gf-css'; s.textContent = CSS; document.head.appendChild(s); }
    var sizes = opts.sizes || [];
    var prevFocus = document.activeElement;
    var ov = el('div', 'gf-ov');
    ov.innerHTML =
      '<div class="gf-in" role="dialog" aria-modal="true" aria-labelledby="gf-h">' +
        '<div class="gf-hd"><div class="gf-tt"><h2 id="gf-h">Generative fill</h2>' +
        '<p>Firefly paints what the frame is missing. Your photo stays exactly as it is.</p></div>' +
        '<button type="button" class="gf-x" data-k="close" aria-label="Close">' + ICON_X + '</button></div>' +
        '<div class="gf-st"><div class="gf-fr"><canvas></canvas><div class="gf-mg" hidden></div><div class="gf-ph"></div><div class="gf-fp" tabindex="0" role="slider" aria-label="Focal point"></div></div></div>' +
        '<div class="gf-rl"><div class="gf-sc">' +
          '<div class="gf-sec"><div class="gf-lb" id="gf-lsz">Size</div><div class="p-seg" role="group" aria-labelledby="gf-lsz" data-k="sizes"></div></div>' +
          '<div class="gf-sec"><div class="gf-lb">Photo size</div><div class="gf-rg"><input type="range" min="50" max="100" step="1" value="100" data-k="scale" aria-label="Photo size"><output data-k="scaleOut">Edge to edge</output></div>' +
            '<p class="gf-tx" data-k="scaleTx"></p></div>' +
          '<div class="gf-sec"><div class="gf-lb">Focus</div><p class="gf-tx">Drag the <b>crosshair</b> onto what must stay in view. Drag the <b>photo</b> to choose where it sits in the frame.</p>' +
            '<div class="gf-row"><button type="button" class="p-ghost" data-k="centre">Centre the focus</button>' +
            '<button type="button" class="p-ghost" data-k="margins" aria-pressed="false">Show copy margins</button></div></div>' +
          '<div class="gf-sec"><div class="gf-lb" id="gf-lvr">Variations</div><div class="p-seg" role="group" aria-labelledby="gf-lvr" data-k="vars">' +
            '<button type="button" data-n="1" data-on="1">1</button><button type="button" data-n="2">2</button><button type="button" data-n="3">3</button></div>' +
            '<p class="gf-tx">Each variation is one Firefly generation on your Adobe account.</p></div>' +
          '<div class="gf-sec"><div class="gf-lb">What Firefly adds</div><p class="gf-tx" data-k="adds"></p></div>' +
          '<div class="gf-sec" data-k="resSec" hidden><div class="gf-lb">Results</div><div class="gf-vs" data-k="res"></div></div>' +
        '</div><div class="gf-ft">' +
          '<div data-k="busy" hidden><div class="gf-bar"><i></i></div></div>' +
          '<p class="gf-msg" data-k="msg" role="status" aria-live="polite"></p>' +
          '<button type="button" class="p-btn" data-k="go">' + ICON_SPARK + '<span>Generate</span></button>' +
          '<div class="gf-two" data-k="useRow" hidden><button type="button" class="p-ghost" data-k="again">Generate again</button><button type="button" class="p-btn" data-k="use">Use on 9:16</button></div>' +
        '</div></div>' +
      '</div>';
    document.body.appendChild(ov);
    var q = function (k) { return ov.querySelector('[data-k="' + k + '"]'); };
    var fr = ov.querySelector('.gf-fr'), cv = fr.querySelector('canvas'), ph = fr.querySelector('.gf-ph'), fp = fr.querySelector('.gf-fp'), mg = fr.querySelector('.gf-mg');
    var stage = ov.querySelector('.gf-st');

    var st = { img: null, pw: 1, ph: 1, size: null, scale: 1, fx: 0.5, fy: 0.5, ax: 0.5, ay: 0.5, vars: 1, margins: false,
      results: [], pick: 0, busy: false, job: null, closed: false, blur: null, per: {} };

    // Per size, the user's framing is remembered while the modal is open, so switching sizes and back keeps it.
    function saveSize() { if (st.size) st.per[st.size.key] = { scale: st.scale, fx: st.fx, fy: st.fy, ax: st.ax, ay: st.ay, results: st.results, pick: st.pick }; }
    function useSize(key) {
      saveSize();
      st.size = sizes.find(function (z) { return z.key === key; }) || sizes[0];
      var p = st.per[st.size.key];
      if (p) { st.scale = p.scale; st.ax = p.ax; st.ay = p.ay; st.results = p.results; st.pick = p.pick; }
      else { st.scale = 1; st.ax = 0.5; st.ay = 0.5; st.results = []; st.pick = 0; }
      // the focus is a property of the PHOTO, so it carries across sizes
      [].forEach.call(q('sizes').children, function (b) { if (b.dataset.key === st.size.key) b.setAttribute('data-on', '1'); else b.removeAttribute('data-on'); });
      q('use').textContent = 'Use on ' + st.size.label;
      q('scale').value = Math.round(st.scale * 100);
      fit(); draw(); panel();
    }

    sizes.forEach(function (z) {
      var b = el('button'); b.type = 'button'; b.dataset.key = z.key; b.textContent = z.label;
      b.title = z.W + ' × ' + Math.round(z.H) + ' (' + ratioLabel(z.W, z.H) + ')';
      b.onclick = function () { if (!st.busy) useSize(z.key); };
      q('sizes').appendChild(b);
    });

    // Fit the frame into the stage at its own aspect.
    function fit() {
      var F = st.size, r = stage.getBoundingClientRect(), pad = 56;
      var s = Math.min((r.width - pad) / F.W, (r.height - pad) / F.H);
      st.view = s;
      fr.style.width = Math.round(F.W * s) + 'px'; fr.style.height = Math.round(F.H * s) + 'px';
      cv.width = Math.round(F.W * s * (W.devicePixelRatio || 1)); cv.height = Math.round(F.H * s * (W.devicePixelRatio || 1));
    }

    // The preview: the bands are a blurred, dimmed stretch of the photo (a stand-in until Firefly answers),
    // the photo sharp on top. With a result picked, the result is drawn instead.
    function draw() {
      if (!st.img) return;
      var F = st.size, L = layout(st), c = cv.getContext('2d'), s = cv.width / F.W;
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
      var res = st.results[st.pick];
      if (res && res.img) {
        c.drawImage(res.img, 0, 0, cv.width, cv.height);
      } else {
        var cover = Math.max(F.W / st.pw, F.H / st.ph);
        c.save(); c.filter = 'blur(' + Math.round(28 * s * 2) + 'px) saturate(.85) brightness(.82)';
        var cw = st.pw * cover * 1.12, ch = st.ph * cover * 1.12;
        c.drawImage(st.img, (F.W - cw) / 2 * s, (F.H - ch) / 2 * s, cw * s, ch * s);
        c.restore();
        c.drawImage(st.img, L.ox * s, L.oy * s, L.dw * s, L.dh * s);
      }
      // overlays in CSS px
      var v = st.view;
      ph.style.left = (L.ox * v) + 'px'; ph.style.top = (L.oy * v) + 'px'; ph.style.width = (L.dw * v) + 'px'; ph.style.height = (L.dh * v) + 'px';
      ph.style.display = res ? 'none' : '';
      var free = (L.dw < F.W - 0.5) || (L.dh < F.H - 0.5);
      if (free) ph.removeAttribute('data-fixed'); else ph.setAttribute('data-fixed', '1');
      fp.style.left = ((L.ox + st.fx * L.dw) * v) + 'px'; fp.style.top = ((L.oy + st.fy * L.dh) * v) + 'px';
      fp.setAttribute('aria-valuetext', Math.round(st.fx * 100) + '% across, ' + Math.round(st.fy * 100) + '% down');
      fp.style.display = res ? 'none' : '';
      // band labels
      fr.querySelectorAll('.gf-band').forEach(function (b) { b.remove(); });
      if (!res) {
        var bands = [];
        if (L.oy > 1) bands.push([0, 0, F.W, L.oy]);
        if (F.H - L.oy - L.dh > 1) bands.push([0, L.oy + L.dh, F.W, F.H - L.oy - L.dh]);
        if (L.ox > 1) bands.push([0, L.oy, L.ox, L.dh]);
        if (F.W - L.ox - L.dw > 1) bands.push([L.ox + L.dw, L.oy, F.W - L.ox - L.dw, L.dh]);
        bands.forEach(function (b) {
          if (b[2] * v < 70 || b[3] * v < 26) return;
          var d = el('div', 'gf-band', '<span>Firefly fills this</span>');
          d.style.left = b[0] * v + 'px'; d.style.top = b[1] * v + 'px'; d.style.width = b[2] * v + 'px'; d.style.height = b[3] * v + 'px';
          fr.appendChild(d);
        });
      }
      if (st.margins && F.pad) {
        mg.hidden = false;
        mg.style.top = F.pad[0] * v + 'px'; mg.style.right = F.pad[1] * v + 'px'; mg.style.bottom = F.pad[2] * v + 'px'; mg.style.left = F.pad[3] * v + 'px';
      } else mg.hidden = true;
    }

    function panel() {
      var L = layout(st), pct = Math.round(st.scale * 100);
      q('scaleOut').textContent = pct === 100 ? 'Edge to edge' : pct + '%';
      var F = st.size, wide = st.pw / st.ph > F.W / F.H;
      q('scaleTx').textContent = pct === 100
        ? (Math.abs(st.pw / st.ph - F.W / F.H) < 0.01 ? 'The photo already has this shape.' : 'The photo spans the full ' + (wide ? 'width' : 'height') + '; Firefly fills ' + (wide ? 'above and below' : 'the left and right') + '.')
        : 'Smaller than the frame: Firefly fills every side.';
      var none = !(L.ex.left || L.ex.right || L.ex.top || L.ex.bottom);
      q('adds').innerHTML = sidesText(L.ex) + (none ? '' : '<br>Result <b>' + L.ow + ' × ' + L.oh + '</b> px' + (L.down < 1 ? ' (the upload is reduced to stay inside Firefly’s 4096 px limit)' : ''));
      var has = st.results.length > 0;
      q('resSec').hidden = !has;
      q('go').hidden = has; q('useRow').hidden = !has;
      q('go').disabled = st.busy || none || helper.state !== 'on';
      q('again').disabled = st.busy; q('use').disabled = st.busy || !has;
      q('busy').hidden = !st.busy;
      [].forEach.call(ov.querySelectorAll('.gf-rl input, .gf-rl .p-seg button, [data-k="centre"]'), function (b) { b.disabled = st.busy; });
      if (!st.busy) {
        if (helper.state === 'off') msg('Generate needs the helper on this computer. In Terminal, from the PDS folder: <code>python3 tools/genfill/serve.py</code>', true, true);
        else if (helper.state === 'unknown') msg('Looking for the generative fill helper…');
        else if (none) msg('This photo already fills the frame. Pick another size, or make the photo smaller.');
        else if (!has) msg('');
      }
      var box = q('res'); box.innerHTML = '';
      st.results.forEach(function (r, i) {
        var b = el('button', 'gf-v'); b.type = 'button'; b.setAttribute('aria-label', 'Variation ' + (i + 1));
        if (i === st.pick) b.setAttribute('data-on', '1');
        var im = el('img'); im.alt = ''; im.src = r.url; b.appendChild(im);
        b.onclick = function () { st.pick = i; draw(); panel(); };
        box.appendChild(b);
      });
    }
    function msg(t, bad, html) { var m = q('msg'); if (html) m.innerHTML = t; else m.textContent = t; if (bad) m.setAttribute('data-bad', '1'); else m.removeAttribute('data-bad'); }

    // ── gestures (pointer events, never native DnD) ──
    function frameXY(e) { var r = fr.getBoundingClientRect(); return { x: (e.clientX - r.left) / st.view, y: (e.clientY - r.top) / st.view }; }
    function drag(target, onMove) {
      target.addEventListener('pointerdown', function (e) {
        if (st.busy || st.results[st.pick]) return;
        e.preventDefault(); e.stopPropagation();
        target.setPointerCapture(e.pointerId); target.setAttribute('data-drag', '1');
        var start = frameXY(e), L0 = layout(st), s0 = { fx: st.fx, fy: st.fy, ax: st.ax, ay: st.ay };
        function mv(ev) { onMove(frameXY(ev), start, L0, s0); draw(); panel(); }
        function up() { target.removeEventListener('pointermove', mv); target.removeEventListener('pointerup', up); target.removeEventListener('pointercancel', up); target.removeAttribute('data-drag'); }
        target.addEventListener('pointermove', mv); target.addEventListener('pointerup', up); target.addEventListener('pointercancel', up);
      });
    }
    // crosshair: moves the focus over the photo; the photo keeps the focus at the anchor
    drag(fp, function (p, s, L0) {
      st.fx = clamp((p.x - L0.ox) / L0.dw, 0, 1); st.fy = clamp((p.y - L0.oy) / L0.dh, 0, 1);
      // keep the photo still while dragging: re-derive the anchor from where the focus now is
      var F = st.size; st.ax = (L0.ox + st.fx * L0.dw) / F.W; st.ay = (L0.oy + st.fy * L0.dh) / F.H;
    });
    // photo: moves the photo along its free axis (the anchor follows the focus)
    drag(ph, function (p, s, L0, s0) {
      var F = st.size;
      st.ax = clamp(s0.ax + (p.x - s.x) / F.W, 0, 1); st.ay = clamp(s0.ay + (p.y - s.y) / F.H, 0, 1);
      var L = layout(st); st.ax = (L.ox + st.fx * L.dw) / F.W; st.ay = (L.oy + st.fy * L.dh) / F.H;   // store the clamped place
    });
    fp.addEventListener('keydown', function (e) {
      var d = e.shiftKey ? 0.05 : 0.01, k = e.key;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(k) < 0 || st.busy) return;
      e.preventDefault();
      if (k === 'ArrowLeft') st.fx = clamp(st.fx - d, 0, 1); if (k === 'ArrowRight') st.fx = clamp(st.fx + d, 0, 1);
      if (k === 'ArrowUp') st.fy = clamp(st.fy - d, 0, 1); if (k === 'ArrowDown') st.fy = clamp(st.fy + d, 0, 1);
      draw(); panel();
    });

    q('scale').addEventListener('input', function (e) { st.scale = e.target.value / 100; draw(); panel(); });
    q('centre').onclick = function () { st.ax = 0.5; st.ay = 0.5; draw(); panel(); };
    q('margins').onclick = function () { st.margins = !st.margins; q('margins').setAttribute('aria-pressed', String(st.margins)); q('margins').textContent = st.margins ? 'Hide copy margins' : 'Show copy margins'; draw(); };
    [].forEach.call(q('vars').children, function (b) {
      b.onclick = function () { st.vars = +b.dataset.n; [].forEach.call(q('vars').children, function (x) { if (x === b) x.setAttribute('data-on', '1'); else x.removeAttribute('data-on'); }); };
    });

    // ── generate ──
    function generate() {
      var L = layout(st);
      var c = document.createElement('canvas'); c.width = L.sw; c.height = L.sh;
      c.getContext('2d').drawImage(st.img, 0, 0, L.sw, L.sh);
      var data = c.toDataURL('image/jpeg', 0.95);
      st.busy = true; st.results = []; st.pick = 0; st.genL = L; panel(); draw();
      msg('Sending the photo to Firefly…');
      var t0 = Date.now();
      helper.expand({ image: data, w: L.sw, h: L.sh, expand: L.ex, variations: st.vars }).then(function (id) {
        st.job = id;
        return new Promise(function (res, rej) {
          (function poll() {
            if (st.closed) return rej(new Error('closed'));
            helper.job(id).then(function (j) {
              if (j.state === 'done') return res(j);
              if (j.state === 'failed') return rej(new Error(j.error || 'Firefly could not fill this photo.'));
              msg((j.step || 'Working') + '… ' + Math.round((Date.now() - t0) / 1000) + 's');
              setTimeout(poll, 1500);
            }, function () { rej(new Error('The helper stopped answering. Is it still running?')); });
          })();
        });
      }).then(function (j) {
        return Promise.all(j.results.map(function (u) { return finish(u, L); }));
      }).then(function (list) {
        st.busy = false; st.results = list; st.pick = 0;
        msg('Done in ' + Math.round((Date.now() - t0) / 1000) + 's. Pick a variation, then use it.');
        draw(); panel();
        try { q('use').focus(); } catch (e) {}
      }).catch(function (e) {
        if (st.closed) return;
        st.busy = false; panel(); msg(e.message || String(e), true);
      });
    }

    // The result is checked for size, the original photo is pasted back over the middle (so its pixels
    // cannot drift), and it is stored at most STORE_LONG on the long side as a JPEG.
    function finish(url, L) {
      return loadImg(url).then(function (gen) {
        var F = st.size, aspect = F.W / F.H;
        var outW = gen.naturalWidth, outH = gen.naturalHeight;
        if (Math.abs(outW / outH - aspect) > 0.02) throw new Error('Firefly returned ' + outW + ' × ' + outH + ', not the frame’s shape.');
        var sc = Math.min(1, STORE_LONG / Math.max(outW, outH));
        var w = Math.round(outW * sc), h = Math.round(outH * sc);
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        var x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
        x.drawImage(gen, 0, 0, w, h);
        var gx = outW / L.ow;   // Firefly may answer at a different resolution than asked
        x.drawImage(st.img, L.ex.left * gx * sc, L.ex.top * gx * sc, L.sw * gx * sc, L.sh * gx * sc);
        var out = c.toDataURL('image/jpeg', 0.92);
        return loadImg(out).then(function (im) { return { url: out, img: im, w: w, h: h }; });
      });
    }

    q('go').onclick = generate;
    q('again').onclick = generate;
    q('use').onclick = function () {
      var r = st.results[st.pick]; if (!r) return;
      try { opts.onApply && opts.onApply(st.size.key, r.url, { w: r.w, h: r.h }); } catch (e) { msg('Could not place it: ' + e.message, true); return; }
      close();
    };
    function close() {
      st.closed = true; ov.remove(); W.removeEventListener('resize', onResize); document.removeEventListener('keydown', onKey, true);
      try { prevFocus && prevFocus.focus && prevFocus.focus(); } catch (e) {}
    }
    q('close').onclick = function () { if (!st.busy || confirm('Firefly is still working. Close anyway?')) close(); };
    ov.addEventListener('pointerdown', function (e) { if (e.target === ov && !st.busy) close(); });
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); if (!st.busy) close(); }
      if (e.key === 'Tab') {   // keep focus inside the dialog
        var f = [].filter.call(ov.querySelectorAll('button,input,[tabindex="0"]'), function (n) { return !n.disabled && n.offsetParent; });
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    }
    function onResize() { fit(); draw(); }
    document.addEventListener('keydown', onKey, true);
    W.addEventListener('resize', onResize);

    loadImg(opts.src).then(function (img) {
      st.img = img; st.pw = img.naturalWidth; st.ph = img.naturalHeight;
      // open on the requested size, else the first in PRIORITY whose shape is not the photo's (the 9:16 Story first)
      var start = opts.start;
      if (!start) {
        var pa = st.pw / st.ph;
        var pick = ['st', 'ls', 'pt', 'bn', 'sq'].map(function (k) { return sizes.find(function (z) { return z.key === k; }); })
          .filter(Boolean).find(function (z) { return Math.abs(Math.log((z.W / z.H) / pa)) > 0.02; });
        start = pick && pick.key;
      }
      useSize(start || sizes[0].key);
      helper.probe().then(function () { panel(); });
      try { fp.focus(); } catch (e) {}
    }, function (e) { msg(e.message, true); });

    return { close: close };
  }

  W.ProvidentGenfill = { open: open, helper: helper, layout: layout };
})();
