/* Generative fill — CAS's fill-the-frame editor. Added 2026-11-20; engines and redesign the same day.
 * Notes: docs/notes/cas-genfill.md.
 *
 * A photo dropped on a variant rarely has the shape of every size it feeds. This editor puts the photo in
 * the size's frame, snapped edge to edge on the axis that fits (a square in a 9:16 fills the WIDTH and
 * leaves bands above and below; a square in a 1.91:1 fills the HEIGHT and leaves bands left and right),
 * lets the user say what must stay in view (the focal crosshair) and where it sits (drag the photo), and
 * has a model paint the bands. The original pixels are pasted back over the middle, so the photo itself
 * cannot drift.
 *
 * TWO ENGINES (by request, "give option to choose from higgsfield or firefly"):
 *   nano     Nano Banana 2.1 (Google) through Higgsfield. The default. CAS composes the WHOLE frame
 *            (photo placed, bands roughed in) at the nearest shape the model makes, plus a mask of the
 *            bands; the model repaints only the mask; CAS crops back to the frame. Priced in credits
 *            before anything is spent: the button carries the price (/quote).
 *   firefly  Photoshop's Generative Expand (Adobe Firefly), through the Adobe connector.
 *
 * CHROME ONLY. Every colour is a --ps-* token. Nothing here paints artwork: the result goes into the photo
 * store like any upload, and the canvas draws it as it draws every photo.
 *
 * The transport is tools/genfill/serve.py on 127.0.0.1:7315 (override: localStorage 'provident-genfill-url').
 * A capability, never a requirement: with the helper off the editor still opens, shows the layout, and
 * says how to start it.
 *
 * window.ProvidentGenfill.open({ src, sizes: [{key, label, W, H, pad}], start, onApply(key, dataUrl) })
 */
(function () {
  'use strict';
  var W = window;
  var URL0 = 'http://127.0.0.1:7315';
  try { var o = W.localStorage && W.localStorage.getItem('provident-genfill-url'); if (o) URL0 = String(o).replace(/\/+$/, ''); } catch (e) {}
  var ENGINE_LS = 'provident-genfill-engine';
  var MAX_SIDE = 4096;          // Generative Expand takes at most 4096 px per side; the frame is capped there
  var STORE_LONG = 3840;        // what goes into the photo store: the 9:16's 2x export height
  var NANO_UP = 2048;           // the frame Nano Banana is sent, long side
  var NANO_RES = '2k';
  // the shapes Nano Banana makes; a frame between them is composed at the nearest and cropped back
  var NANO_RATIOS = [[1, 1], [3, 2], [2, 3], [4, 3], [3, 4], [4, 5], [5, 4], [9, 16], [16, 9], [21, 9]];

  var ENGINES = {
    nano: { name: 'Nano Banana 2.1', by: 'Google, through Higgsfield', short: 'Nano Banana' },
    firefly: { name: 'Firefly', by: 'Adobe Generative Expand, on your Adobe account', short: 'Firefly' }
  };

  var CSS = [
    '.gf-ov [hidden]{display:none!important}',
    '.gf-ov{position:fixed;inset:0;z-index:4100;display:flex;align-items:center;justify-content:center;padding:24px;background:color-mix(in srgb,var(--ps-app) 64%,transparent);font-family:var(--ps-font);-webkit-font-smoothing:antialiased}',
    '.gf-in{width:min(1180px,100%);height:min(800px,calc(100vh - 48px));display:grid;grid-template-columns:minmax(0,1fr) 352px;grid-template-rows:auto minmax(0,1fr);border-radius:var(--ps-r);background:var(--ps-card);color:var(--ps-ink);box-shadow:0 0 0 1px var(--ps-hair),0 24px 64px rgba(0,0,0,.28);overflow:hidden}',
    '.gf-in ::selection{background:var(--ps-accent);color:var(--ps-accent-i)}',
    '.gf-hd{grid-column:1/-1;display:flex;align-items:flex-start;gap:12px;padding:18px 20px 16px 24px;border-bottom:1px solid var(--ps-hair)}',
    '.gf-hd .gf-tt{flex:1;min-width:0}',
    '.gf-hd h2{margin:0;font:500 18px/1.3 var(--ps-font);letter-spacing:-.005em;color:var(--ps-ink)}',
    '.gf-hd p{margin:3px 0 0;font:400 14px/1.45 var(--ps-font);color:var(--ps-ink-2)}',
    '.gf-x{width:36px;height:36px;margin:-4px -4px 0 0;border-radius:var(--ps-pill);border:none;background:transparent;color:var(--ps-ink-2);display:grid;place-items:center;cursor:pointer;transition:background var(--ps-motion) var(--ps-ease),color var(--ps-motion) var(--ps-ease)}',
    '.gf-x:hover{background:var(--ps-fill-h);color:var(--ps-ink)}',
    '.gf-x svg,.gf-i{width:20px;height:20px;fill:currentColor;flex:none}',
    // stage
    '.gf-st{position:relative;background:var(--ps-stage);display:flex;align-items:center;justify-content:center;min-height:0;overflow:hidden}',
    '.gf-fr{position:relative;box-shadow:0 0 0 1px var(--ps-hair);border-radius:4px;overflow:hidden;touch-action:none;user-select:none}',
    '.gf-fr canvas{display:block;width:100%;height:100%}',
    '.gf-ph{position:absolute;outline:1.5px dashed rgba(255,255,255,.92);outline-offset:-1px;box-shadow:0 0 0 1px rgba(0,0,0,.35);cursor:grab}',
    '.gf-ph[data-drag]{cursor:grabbing}',
    '.gf-ph[data-fixed]{cursor:default}',
    '.gf-fp{position:absolute;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.45),inset 0 0 0 1px rgba(0,0,0,.35);cursor:move;touch-action:none}',
    '.gf-fp::before,.gf-fp::after{content:"";position:absolute;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.35)}',
    '.gf-fp::before{left:50%;top:-9px;bottom:-9px;width:2px;margin-left:-1px}',
    '.gf-fp::after{top:50%;left:-9px;right:-9px;height:2px;margin-top:-1px}',
    '.gf-mg{position:absolute;pointer-events:none;outline:1px solid rgba(255,255,255,.6);outline-offset:-1px;box-shadow:0 0 0 9999px rgba(0,0,0,.14)}',
    '.gf-band{position:absolute;pointer-events:none;display:flex;align-items:center;justify-content:center}',
    '.gf-band span{display:inline-flex;align-items:center;gap:6px;font:500 12.5px/1 var(--ps-font);color:#fff;background:rgba(10,11,13,.6);padding:7px 11px 7px 9px;border-radius:var(--ps-pill);white-space:nowrap;box-shadow:0 0 0 1px rgba(255,255,255,.14)}',
    '.gf-band svg{width:14px;height:14px;fill:currentColor}',
    '.gf-cap{position:absolute;left:16px;bottom:14px;font:400 12.5px/1 var(--ps-font);color:var(--ps-dim);font-variant-numeric:tabular-nums;pointer-events:none}',
    // rail
    '.gf-rl{display:flex;flex-direction:column;min-height:0;border-left:1px solid var(--ps-hair)}',
    '.gf-sc{flex:1;overflow:auto;padding:20px 20px 24px;display:grid;gap:26px;align-content:start;scrollbar-width:thin;scrollbar-color:var(--ps-line) transparent}',
    '.gf-sec{display:grid;gap:10px}',
    '.gf-lb{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin:0;font:600 14px/1.3 var(--ps-font);color:var(--ps-ink)}',
    '.gf-lb small{font:400 12.5px/1 var(--ps-font);color:var(--ps-dim)}',
    '.gf-tx{margin:0;font:400 13px/1.45 var(--ps-font);color:var(--ps-ink-2);max-width:62ch}',
    '.gf-tx b{font-weight:500;color:var(--ps-ink)}',
    // engine options
    '.gf-eng{display:grid;gap:8px}',
    '.gf-eo{position:relative;display:grid;grid-template-columns:18px minmax(0,1fr) auto;gap:2px 12px;align-items:start;width:100%;padding:12px 14px 12px 12px;border:none;border-radius:var(--ps-r);background:var(--ps-card);box-shadow:inset 0 0 0 1px var(--ps-hair);color:var(--ps-ink);text-align:left;font-family:var(--ps-font);cursor:pointer;transition:background var(--ps-motion) var(--ps-ease),box-shadow var(--ps-motion) var(--ps-ease)}',
    '.gf-eo:hover{box-shadow:inset 0 0 0 1px var(--ps-line)}',
    '.gf-eo[aria-checked="true"]{background:var(--ps-accent);box-shadow:none}',
    '.gf-eo .gf-dot{grid-row:1/3;width:18px;height:18px;margin-top:1px;border-radius:50%;box-shadow:inset 0 0 0 2px var(--ps-dim);display:grid;place-items:center}',
    '.gf-eo[aria-checked="true"] .gf-dot{box-shadow:inset 0 0 0 2px var(--ps-accent-i)}',
    '.gf-eo[aria-checked="true"] .gf-dot::after{content:"";width:8px;height:8px;border-radius:50%;background:var(--ps-accent-i)}',
    '.gf-eo b{font:500 15px/1.3 var(--ps-font);color:var(--ps-ink)}',
    '.gf-eo[aria-checked="true"] b{color:var(--ps-accent-i)}',
    '.gf-eo .gf-by{grid-column:2/4;font:400 13px/1.35 var(--ps-font);color:var(--ps-ink-2)}',
    '.gf-eo .gf-pr{font:500 12.5px/1 var(--ps-font);color:var(--ps-ink-2);background:var(--ps-fill);padding:5px 8px;border-radius:var(--ps-pill);white-space:nowrap;font-variant-numeric:tabular-nums}',
    '.gf-eo[aria-checked="true"] .gf-pr{background:var(--ps-card);color:var(--ps-ink)}',
    '.gf-eo .gf-why{grid-column:2/4;margin-top:6px;font:400 12.5px/1.4 var(--ps-font);color:var(--ps-ink-2)}',
    '.gf-eo .gf-why code,.gf-msg code{font:400 12px/1.4 ui-monospace,Menlo,monospace;background:var(--ps-fill);padding:1px 5px;border-radius:4px;color:var(--ps-ink);user-select:all}',
    '.gf-eo[data-off] b{color:var(--ps-ink-2)}',
    // segmented (the kit's switch)
    '.gf-seg{display:flex;width:max-content;max-width:100%;flex-wrap:wrap;gap:2px;padding:4px;border-radius:var(--ps-pill);background:var(--ps-fill)}',
    '.gf-seg button{height:32px;min-width:40px;padding:0 14px;border:none;border-radius:var(--ps-pill);background:transparent;color:var(--ps-ink-2);font:600 14px/1 var(--ps-font);letter-spacing:.16px;font-variant-numeric:tabular-nums;cursor:pointer;transition:background var(--ps-motion) var(--ps-ease),color var(--ps-motion) var(--ps-ease)}',
    '.gf-seg button:hover:not([data-on]):not(:disabled){background:var(--ps-fill-h);color:var(--ps-ink)}',
    '.gf-seg button[data-on]{background:var(--ps-accent);color:var(--ps-accent-i)}',
    '.gf-seg button:disabled{cursor:default}',
    // framing
    '.gf-rg{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:12px}',
    '.gf-rg label{font:500 13px/1 var(--ps-font);color:var(--ps-ink)}',
    '.gf-rg input{width:100%;accent-color:var(--ps-link);margin:0}',
    '.gf-rg output{font:400 13px/1 var(--ps-font);color:var(--ps-ink-2);min-width:80px;text-align:right;font-variant-numeric:tabular-nums}',
    '.gf-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}',
    '.gf-gh{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 16px;border:none;border-radius:var(--ps-pill);background:var(--ps-fill);color:var(--ps-ink);font:600 14px/1 var(--ps-font);letter-spacing:.16px;cursor:pointer;transition:background var(--ps-motion) var(--ps-ease)}',
    '.gf-gh:hover:not(:disabled){background:var(--ps-fill-h)}',
    '.gf-gh[aria-pressed="true"]{background:var(--ps-accent);color:var(--ps-accent-i)}',
    '.gf-gh:disabled,.gf-seg button:disabled,.gf-eo:disabled{opacity:.5}',
    // prompt
    '.gf-ta{width:100%;box-sizing:border-box;min-height:84px;resize:vertical;padding:12px 14px;border:none;border-radius:var(--ps-r-field);background:var(--ps-fill);color:var(--ps-ink);font:400 14px/1.5 var(--ps-font);caret-color:var(--ps-link)}',
    '.gf-ta::placeholder{color:var(--ps-dim)}',
    // results
    '.gf-vs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}',
    '.gf-v{position:relative;padding:0;border:none;border-radius:var(--ps-r-sm);overflow:hidden;background:var(--ps-stage);cursor:pointer;box-shadow:inset 0 0 0 1px var(--ps-hair);aspect-ratio:1/1}',
    '.gf-v img{width:100%;height:100%;object-fit:contain;display:block}',
    '.gf-v[data-on]{box-shadow:0 0 0 2px var(--ps-link)}',
    '.gf-v span{position:absolute;left:6px;top:6px;min-width:20px;height:20px;padding:0 6px;box-sizing:border-box;border-radius:var(--ps-pill);background:rgba(10,11,13,.6);color:#fff;font:600 12px/20px var(--ps-font);text-align:center;font-variant-numeric:tabular-nums}',
    '.gf-v[data-on] span{background:var(--ps-link);color:var(--ps-card)}',
    // footer
    '.gf-ft{padding:14px 20px 18px;border-top:1px solid var(--ps-hair);display:grid;gap:12px;background:var(--ps-card)}',
    '.gf-sum{margin:0;font:400 13px/1.4 var(--ps-font);color:var(--ps-ink-2);font-variant-numeric:tabular-nums}',
    '.gf-sum b{font-weight:500;color:var(--ps-ink)}',
    '.gf-go,.gf-use{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;height:44px;border:none;border-radius:var(--ps-pill);background:var(--ps-primary);color:#fff;font:600 15px/1 var(--ps-font);letter-spacing:.16px;cursor:pointer;transition:background var(--ps-motion) var(--ps-ease)}',
    '.gf-go:hover:not(:disabled),.gf-use:hover:not(:disabled){background:var(--ps-primary-h)}',
    '.gf-go:disabled,.gf-use:disabled{background:var(--ps-fill);color:var(--ps-dim);cursor:default}',
    '.gf-go em{font-style:normal;font-weight:400;opacity:.86}',
    '.gf-two{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px}',
    '.gf-two .gf-gh{height:44px}',
    '.gf-bar{height:4px;border-radius:2px;background:var(--ps-fill);overflow:hidden;position:relative}',
    '.gf-bar i{position:absolute;top:0;bottom:0;width:36%;border-radius:2px;background:var(--ps-link);animation:gfbar 1.4s var(--ps-ease) infinite}',
    '@keyframes gfbar{0%{left:-36%}100%{left:100%}}',
    '.gf-msg{margin:0;font:400 13px/1.45 var(--ps-font);color:var(--ps-ink-2)}',
    '.gf-msg:empty{display:none}',
    '.gf-msg[data-bad]{color:var(--ps-bad)}',
    '.gf-v:focus-visible,.gf-x:focus-visible,.gf-fp:focus-visible,.gf-eo:focus-visible,.gf-seg button:focus-visible,.gf-gh:focus-visible,.gf-go:focus-visible,.gf-use:focus-visible,.gf-ta:focus-visible,.gf-rg input:focus-visible{outline:2px solid var(--ps-focus);outline-offset:2px}',
    '@media (prefers-reduced-motion:reduce){.gf-bar i{animation:none;left:0;width:100%;opacity:.5}.gf-in *{transition:none!important}}',
    '@media (max-width:860px){.gf-ov{padding:12px}.gf-in{grid-template-columns:1fr;grid-template-rows:auto minmax(240px,1fr) auto;height:calc(100vh - 24px)}.gf-rl{border-left:none;border-top:1px solid var(--ps-hair);max-height:54vh}.gf-hd{padding:14px 16px}.gf-hd p{font-size:13px}.gf-sc{padding:16px}.gf-ft{padding:12px 16px 14px}}'
  ].join('\n');

  var ICON_X = '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M480-437.85 277.08-234.92q-8.31 8.3-20.89 8.5-12.57.19-21.27-8.5-8.69-8.7-8.69-21.08 0-12.38 8.69-21.08L437.85-480 234.92-682.92q-8.3-8.31-8.5-20.89-.19-12.57 8.5-21.27 8.7-8.69 21.08-8.69 12.38 0 21.08 8.69L480-522.15l202.92-202.93q8.31-8.3 20.89-8.5 12.57-.19 21.27 8.5 8.69 8.7 8.69 21.08 0 12.38-8.69 21.08L522.15-480l202.93 202.92q8.3 8.31 8.5 20.89.19 12.57-8.5 21.27-8.7 8.69-21.08 8.69-12.38 0-21.08-8.69L480-437.85Z"/></svg>';
  var ICON_SPARK = '<svg class="gf-i" viewBox="0 -960 960 960" aria-hidden="true"><path d="M767.69-645.38q-4.61 0-8.07-2.85-3.47-2.85-4.85-7.46l-15.31-57.08-57.07-15.31q-4.62-1.38-7.47-4.84-2.84-3.47-2.84-8.08t2.84-8.08q2.85-3.46 7.47-4.84l57.07-15.31 15.31-57.08q1.38-4.61 4.85-7.46 3.46-2.84 8.07-2.84 4.62 0 8.08 2.84 3.46 2.85 4.85 7.46l15.3 57.08 57.08 15.31q4.62 1.38 7.46 4.84 2.85 3.47 2.85 8.08t-2.85 8.08q-2.84 3.46-7.46 4.84l-57.08 15.31-15.3 57.08q-1.39 4.61-4.85 7.46-3.46 2.85-8.08 2.85ZM767.69-120q-4.61 0-8.07-2.85-3.47-2.84-4.85-7.46l-15.31-57.07-57.07-15.31q-4.62-1.39-7.47-4.85-2.84-3.46-2.84-8.08 0-4.61 2.84-8.07 2.85-3.46 7.47-4.85l57.07-15.31 15.31-57.07q1.38-4.62 4.85-7.46 3.46-2.85 8.07-2.85 4.62 0 8.08 2.85 3.46 2.84 4.85 7.46l15.3 57.07 57.08 15.31q4.62 1.39 7.46 4.85 2.85 3.46 2.85 8.07 0 4.62-2.85 8.08-2.84 3.46-7.46 4.85l-57.08 15.31-15.3 57.07q-1.39 4.62-4.85 7.46-3.46 2.85-8.08 2.85ZM360-235.39q-7.92 0-14.35-4.65-6.42-4.65-9.27-12.19l-37.15-97.08-97.08-37.15q-7.54-2.85-12.19-9.27-4.65-6.43-4.65-14.35 0-7.92 4.65-14.35 4.65-6.42 12.19-9.27l97.08-37.15 37.15-97.08q2.85-7.54 9.27-12.19 6.43-4.65 14.35-4.65 7.92 0 14.35 4.65 6.42 4.65 9.27 12.19l37.15 97.08 97.08 37.15q7.54 2.85 12.19 9.27 4.65 6.43 4.65 14.35 0 7.92-4.65 14.35-4.65 6.42-12.19 9.27l-97.08 37.15-37.15 97.08q-2.85 7.54-9.27 12.19-6.43 4.65-14.35 4.65Z"/></svg>';

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function loadImg(src) { return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { rej(new Error('The picture could not be read.')); }; i.src = src; }); }
  function ratioLabel(w, h) { var r = w / h; return r > 1 ? r.toFixed(2).replace(/0$/, '') + ':1' : '1:' + (1 / r).toFixed(2).replace(/0$/, ''); }
  function credits(n) { return (Math.round(n * 10) / 10) + (n === 1 ? ' credit' : ' credits'); }

  var helper = {
    state: 'unknown', info: null, quotes: {},
    probe: function () {
      var c = new AbortController(); var t = setTimeout(function () { c.abort(); }, 4000);
      return fetch(URL0 + '/health', { signal: c.signal, cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { clearTimeout(t); helper.info = j; helper.state = j && j.ok ? 'on' : 'off'; return helper.state; })
        .catch(function () { clearTimeout(t); helper.state = 'off'; return 'off'; });
    },
    // what an engine needs: ok, or the sentence that says why not
    ready: function (eng) {
      if (helper.state === 'unknown') return { ok: false, why: 'Looking for the generative fill helper…', wait: true };
      if (helper.state !== 'on') return { ok: false, off: true, why: 'Needs the helper on this computer. In Terminal, from the PDS folder, once: <code>sh tools/genfill/install.sh</code> — it then starts with the Mac.' };
      var i = helper.info || {};
      if (eng === 'nano') {
        if (i.higgsfield === 'ok') return { ok: true };
        if (i.higgsfield === 'signin') return { ok: false, why: 'Higgsfield is not signed in here. In Terminal: <code>higgsfield auth login</code>' };
        return { ok: false, why: 'Higgsfield’s tool is not on this computer. In Terminal: <code>npm i -g @higgsfield/cli</code>' };
      }
      return i.claude ? { ok: true } : { ok: false, why: 'Needs Claude Code on this computer, signed in, with the Adobe connector.' };
    },
    quote: function (n) {
      var k = NANO_RES + ':' + n;
      if (helper.quotes[k]) return Promise.resolve(helper.quotes[k]);
      return fetch(URL0 + '/quote?n=' + n + '&res=' + NANO_RES, { cache: 'no-store' }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'No price.'); helper.quotes[k] = j; return j; }); });
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

  // Nano Banana makes a fixed set of shapes. The frame is composed at the nearest one, the extra room split
  // evenly around it (also generated), and cropped back to the frame afterwards. In layout() px.
  function nanoPlan(L) {
    var r = L.ow / L.oh, best = null;
    NANO_RATIOS.forEach(function (q) { var d = Math.abs(Math.log((q[0] / q[1]) / r)); if (!best || d < best.d) best = { q: q, d: d }; });
    var R = best.q[0] / best.q[1], cw = L.ow, ch = L.oh;
    if (best.d > 0.004) { if (R > r) cw = Math.round(L.oh * R); else ch = Math.round(L.ow / R); }
    return { aspect: best.q[0] + ':' + best.q[1], cw: cw, ch: ch, px: Math.floor((cw - L.ow) / 2), py: Math.floor((ch - L.oh) / 2), fade: true };
  }

  function sidesText(ex) {
    var p = [], words = { top: 'above', bottom: 'below', left: 'on the left', right: 'on the right' };
    ['top', 'bottom', 'left', 'right'].forEach(function (s) { if (ex[s] > 0) p.push('<b>' + ex[s].toLocaleString() + ' px</b> ' + words[s]); });
    return p.join(' · ');
  }

  // ── the editor ──────────────────────────────────────────────────────────────────────────────────
  function open(opts) {
    if (!document.getElementById('gf-css')) { var s = el('style'); s.id = 'gf-css'; s.textContent = CSS; document.head.appendChild(s); }
    var sizes = opts.sizes || [];
    var prevFocus = document.activeElement;
    var engine = 'nano';
    try { var se = W.localStorage.getItem(ENGINE_LS); if (ENGINES[se]) engine = se; } catch (e) {}
    var ov = el('div', 'gf-ov');
    ov.innerHTML =
      '<div class="gf-in" role="dialog" aria-modal="true" aria-labelledby="gf-h" aria-describedby="gf-hp">' +
        '<div class="gf-hd"><div class="gf-tt"><h2 id="gf-h">Generative fill</h2>' +
        '<p id="gf-hp">Paints what the frame is missing around your photo. The photo itself is never changed.</p></div>' +
        '<button type="button" class="gf-x" data-k="close" aria-label="Close">' + ICON_X + '</button></div>' +
        '<div class="gf-st"><div class="gf-fr"><canvas></canvas><div class="gf-mg" hidden></div><div class="gf-ph"></div><div class="gf-fp" tabindex="0" role="slider" aria-label="Focal point"></div></div><div class="gf-cap" data-k="cap"></div></div>' +
        '<div class="gf-rl"><div class="gf-sc" data-k="scroll">' +
          '<div class="gf-sec" data-k="resSec" hidden><h3 class="gf-lb">Results<small data-k="resN"></small></h3><div class="gf-vs" data-k="res"></div></div>' +
          '<div class="gf-sec"><h3 class="gf-lb" id="gf-leng">Engine</h3><div class="gf-eng" role="radiogroup" aria-labelledby="gf-leng" data-k="eng">' +
            Object.keys(ENGINES).map(function (k) {
              var E = ENGINES[k];
              return '<button type="button" class="gf-eo" role="radio" data-eng="' + k + '" aria-checked="false"><span class="gf-dot"></span><b>' + E.name + '</b>' +
                (k === 'nano' ? '<span class="gf-pr" data-k="each">…</span>' : '<span></span>') +
                '<span class="gf-by">' + E.by + '</span><span class="gf-why" data-why hidden></span></button>';
            }).join('') + '</div></div>' +
          '<div class="gf-sec"><h3 class="gf-lb" id="gf-lsz">Size</h3><div class="gf-seg" role="group" aria-labelledby="gf-lsz" data-k="sizes"></div></div>' +
          '<div class="gf-sec"><h3 class="gf-lb">Framing</h3>' +
            '<div class="gf-rg"><label for="gf-scale">Photo size</label><input id="gf-scale" type="range" min="50" max="100" step="1" value="100" data-k="scale"><output for="gf-scale" data-k="scaleOut">Edge to edge</output></div>' +
            '<p class="gf-tx" data-k="scaleTx"></p>' +
            '<p class="gf-tx">Drag the <b>crosshair</b> onto what must stay in view. Drag the <b>photo</b> to choose where it sits.</p>' +
            '<div class="gf-row"><button type="button" class="gf-gh" data-k="centre">Centre the focus</button>' +
            '<button type="button" class="gf-gh" data-k="margins" aria-pressed="false">Copy margins</button></div></div>' +
          '<div class="gf-sec" data-k="guideSec"><h3 class="gf-lb"><label for="gf-guide">Describe the surroundings</label><small>Optional</small></h3>' +
            '<textarea id="gf-guide" class="gf-ta" data-k="guide" maxlength="400" placeholder="More sky, the lagoon running on to the horizon, no people"></textarea></div>' +
          '<div class="gf-sec"><h3 class="gf-lb" id="gf-lvr">Variations</h3><div class="gf-seg" role="group" aria-labelledby="gf-lvr" data-k="vars">' +
            '<button type="button" data-n="1" data-on="1" aria-label="1 variation">1</button><button type="button" data-n="2" aria-label="2 variations">2</button><button type="button" data-n="3" aria-label="3 variations">3</button></div>' +
            '<p class="gf-tx" data-k="varsTx"></p></div>' +
        '</div><div class="gf-ft">' +
          '<p class="gf-sum" data-k="sum"></p>' +
          '<div data-k="busy" hidden><div class="gf-bar"><i></i></div></div>' +
          '<p class="gf-msg" data-k="msg" role="status" aria-live="polite"></p>' +
          '<button type="button" class="gf-go" data-k="go">' + ICON_SPARK + '<span data-k="goTx">Generate</span></button>' +
          '<div class="gf-two" data-k="useRow" hidden><button type="button" class="gf-gh" data-k="again">Try again</button><button type="button" class="gf-use" data-k="use">Use on 9:16</button></div>' +
        '</div></div>' +
      '</div>';
    document.body.appendChild(ov);
    var q = function (k) { return ov.querySelector('[data-k="' + k + '"]'); };
    var fr = ov.querySelector('.gf-fr'), cv = fr.querySelector('canvas'), ph = fr.querySelector('.gf-ph'), fp = fr.querySelector('.gf-fp'), mg = fr.querySelector('.gf-mg');
    var stage = ov.querySelector('.gf-st');

    var st = { img: null, pw: 1, ph: 1, size: null, scale: 1, fx: 0.5, fy: 0.5, ax: 0.5, ay: 0.5, vars: 1, margins: false,
      results: [], pick: 0, busy: false, job: null, closed: false, per: {}, engine: engine, quote: null };

    // Per size, the framing and results are remembered while the editor is open.
    function saveSize() { if (st.size) st.per[st.size.key] = { scale: st.scale, ax: st.ax, ay: st.ay, results: st.results, pick: st.pick }; }
    function useSize(key) {
      saveSize();
      st.size = sizes.find(function (z) { return z.key === key; }) || sizes[0];
      var p = st.per[st.size.key];
      if (p) { st.scale = p.scale; st.ax = p.ax; st.ay = p.ay; st.results = p.results; st.pick = p.pick; }
      else { st.scale = 1; st.ax = 0.5; st.ay = 0.5; st.results = []; st.pick = 0; }
      // the focus is a property of the PHOTO, so it carries across sizes
      [].forEach.call(q('sizes').children, function (b) { if (b.dataset.key === st.size.key) { b.setAttribute('data-on', '1'); b.setAttribute('aria-pressed', 'true'); } else { b.removeAttribute('data-on'); b.setAttribute('aria-pressed', 'false'); } });
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

    function setEngine(k) {
      st.engine = k;
      try { W.localStorage.setItem(ENGINE_LS, k); } catch (e) {}
      [].forEach.call(q('eng').children, function (b) { var on = b.dataset.eng === k; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
      draw(); panel(); refreshQuote();
    }
    [].forEach.call(q('eng').children, function (b) {
      b.onclick = function () { if (!st.busy) setEngine(b.dataset.eng); };
      b.onkeydown = function (e) {
        if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) < 0 || st.busy) return;
        e.preventDefault(); var ks = Object.keys(ENGINES), i = ks.indexOf(st.engine);
        setEngine(ks[(i + ks.length + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1)) % ks.length]);
        q('eng').querySelector('[aria-checked="true"]').focus();
      };
    });

    // The price comes from Higgsfield itself, never a number kept here.
    function refreshQuote() {
      if (!helper.ready('nano').ok) { st.quote = null; panel(); return; }   // priced even while Firefly is picked, so the choice is informed
      var n = st.vars;
      helper.quote(n).then(function (j) { if (n === st.vars) { st.quote = j; panel(); } }, function () { st.quote = { err: true }; panel(); });
    }

    // Fit the frame into the stage at its own aspect.
    function fit() {
      var F = st.size, r = stage.getBoundingClientRect(), pad = 64;
      var s = Math.min((r.width - pad) / F.W, (r.height - pad) / F.H);
      st.view = s;
      fr.style.width = Math.round(F.W * s) + 'px'; fr.style.height = Math.round(F.H * s) + 'px';
      cv.width = Math.round(F.W * s * (W.devicePixelRatio || 1)); cv.height = Math.round(F.H * s * (W.devicePixelRatio || 1));
    }

    // The bands roughed in: a blurred, dimmed stretch of the photo. Used by the preview and, for Nano
    // Banana, as the starting picture under the mask (it gives the model the colours to continue).
    function rough(c, w, h, px, py, fw, fh, L, blurPx) {
      var cover = Math.max(fw / st.pw, fh / st.ph) * 1.12;
      c.save(); c.filter = 'blur(' + blurPx + 'px) saturate(.85) brightness(.82)';
      c.drawImage(st.img, px + (fw - st.pw * cover) / 2, py + (fh - st.ph * cover) / 2, st.pw * cover, st.ph * cover);
      c.restore();
    }

    function draw() {
      if (!st.img) return;
      var F = st.size, L = layout(st), c = cv.getContext('2d'), s = cv.width / F.W;
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
      var res = st.results[st.pick];
      if (res && res.img) {
        c.drawImage(res.img, 0, 0, cv.width, cv.height);
      } else {
        rough(c, cv.width, cv.height, 0, 0, F.W * s, F.H * s, L, Math.round(56 * s));
        c.drawImage(st.img, L.ox * s, L.oy * s, L.dw * s, L.dh * s);
      }
      var v = st.view;
      ph.style.left = (L.ox * v) + 'px'; ph.style.top = (L.oy * v) + 'px'; ph.style.width = (L.dw * v) + 'px'; ph.style.height = (L.dh * v) + 'px';
      ph.style.display = res ? 'none' : '';
      var free = (L.dw < F.W - 0.5) || (L.dh < F.H - 0.5);
      if (free) ph.removeAttribute('data-fixed'); else ph.setAttribute('data-fixed', '1');
      fp.style.left = ((L.ox + st.fx * L.dw) * v) + 'px'; fp.style.top = ((L.oy + st.fy * L.dh) * v) + 'px';
      fp.setAttribute('aria-valuetext', Math.round(st.fx * 100) + '% across, ' + Math.round(st.fy * 100) + '% down');
      fp.style.display = res ? 'none' : '';
      fr.querySelectorAll('.gf-band').forEach(function (b) { b.remove(); });
      if (!res) {
        var bands = [];
        if (L.oy > 1) bands.push([0, 0, F.W, L.oy]);
        if (F.H - L.oy - L.dh > 1) bands.push([0, L.oy + L.dh, F.W, F.H - L.oy - L.dh]);
        if (L.ox > 1) bands.push([0, L.oy, L.ox, L.dh]);
        if (F.W - L.ox - L.dw > 1) bands.push([L.ox + L.dw, L.oy, F.W - L.ox - L.dw, L.dh]);
        bands.forEach(function (b) {
          if (b[2] * v < 150 || b[3] * v < 34) return;
          var d = el('div', 'gf-band', '<span>' + ICON_SPARK.replace('class="gf-i" ', '') + ENGINES[st.engine].short + ' fills this</span>');
          d.style.left = b[0] * v + 'px'; d.style.top = b[1] * v + 'px'; d.style.width = b[2] * v + 'px'; d.style.height = b[3] * v + 'px';
          fr.appendChild(d);
        });
      }
      if (st.margins && F.pad) {
        mg.hidden = false;
        mg.style.top = F.pad[0] * v + 'px'; mg.style.right = F.pad[1] * v + 'px'; mg.style.bottom = F.pad[2] * v + 'px'; mg.style.left = F.pad[3] * v + 'px';
      } else mg.hidden = true;
      q('cap').textContent = st.size.label + ' · ' + F.W + ' × ' + Math.round(F.H) + (res ? ' · variation ' + (st.pick + 1) : '');
    }

    function panel() {
      var L = layout(st), pct = Math.round(st.scale * 100), F = st.size, E = ENGINES[st.engine], nano = st.engine === 'nano';
      var wide = st.pw / st.ph > F.W / F.H, same = Math.abs(st.pw / st.ph - F.W / F.H) < 0.01;
      q('scaleOut').textContent = pct === 100 ? 'Edge to edge' : pct + '%';
      q('scaleTx').textContent = pct === 100
        ? (same ? 'The photo already has this shape.' : 'The photo spans the full ' + (wide ? 'width' : 'height') + '. ' + E.short + ' fills ' + (wide ? 'above and below' : 'the left and right') + '.')
        : 'Smaller than the frame, so ' + E.short + ' fills every side.';
      var none = !(L.ex.left || L.ex.right || L.ex.top || L.ex.bottom);
      // engines: availability on each option
      [].forEach.call(q('eng').children, function (b) {
        var rd = helper.ready(b.dataset.eng), w = b.querySelector('[data-why]');
        if (rd.ok || rd.wait || rd.off) { w.hidden = true; b.removeAttribute('data-off'); } else { w.hidden = false; w.innerHTML = rd.why; b.setAttribute('data-off', '1'); }
        b.disabled = st.busy;
      });
      var qe = q('each');
      qe.textContent = st.quote && st.quote.each != null ? credits(st.quote.each) + ' each' : st.quote && st.quote.err ? 'Price unavailable' : helper.ready('nano').ok ? 'Pricing…' : 'Credits';
      q('guideSec').hidden = !nano;
      q('varsTx').textContent = nano ? 'Each variation is its own Nano Banana generation, priced on the button.' : 'Each variation is one Firefly generation on your Adobe account.';
      q('sum').innerHTML = none ? 'The photo already fills this frame.' :
        'Adds ' + sidesText(L.ex) + (nano ? '' : ' · <b>' + L.ow.toLocaleString() + ' × ' + L.oh.toLocaleString() + '</b> px' + (L.down < 1 ? ', reduced to Firefly’s 4096 px limit' : ''));
      var has = st.results.length > 0, rd = helper.ready(st.engine);
      q('resSec').hidden = !has;
      q('resN').textContent = has ? E.short + ' · ' + st.results.length + (st.results.length === 1 ? ' variation' : ' variations') : '';
      q('go').hidden = has; q('useRow').hidden = !has;
      var priced = !nano || (st.quote && st.quote.credits != null);
      q('goTx').innerHTML = nano ? (st.quote && st.quote.credits != null ? 'Generate <em>· ' + credits(st.quote.credits) + '</em>' : 'Generate') : 'Generate with Firefly';
      q('again').textContent = nano && st.quote && st.quote.credits != null ? 'Again · ' + credits(st.quote.credits) : 'Try again';
      q('go').disabled = st.busy || none || !rd.ok || !priced;
      q('again').disabled = st.busy || !rd.ok || !priced; q('use').disabled = st.busy || !has;
      q('busy').hidden = !st.busy;
      [].forEach.call(ov.querySelectorAll('.gf-rl input, .gf-seg button, [data-k="centre"], .gf-ta'), function (b) { b.disabled = st.busy; });
      if (!st.busy) {
        // a message about the editor's own state is replaced as the state changes; a run's outcome stays
        if (rd.off || rd.wait) msg(rd.why, rd.off, true, 1);
        else if (!rd.ok) msg('Pick the other engine, or set this one up as its card says.', false, false, 1);
        else if (none) msg('Pick another size, or make the photo smaller.', false, false, 1);
        else if (st.msgState) msg('', false, false, 1);
      }
      var box = q('res'); box.innerHTML = '';
      st.results.forEach(function (r, i) {
        var b = el('button', 'gf-v'); b.type = 'button'; b.setAttribute('aria-label', 'Variation ' + (i + 1)); b.setAttribute('aria-pressed', String(i === st.pick));
        if (i === st.pick) b.setAttribute('data-on', '1');
        var im = el('img'); im.alt = ''; im.src = r.url; b.appendChild(im); b.appendChild(el('span', '', String(i + 1)));
        b.onclick = function () { st.pick = i; draw(); panel(); };
        box.appendChild(b);
      });
    }
    function msg(t, bad, html, state) { var m = q('msg'); if (html) m.innerHTML = t; else m.textContent = t; if (bad) m.setAttribute('data-bad', '1'); else m.removeAttribute('data-bad'); st.msgState = !!state; }

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
    // crosshair: moves the focus over the photo; the photo stays still
    drag(fp, function (p, s, L0) {
      st.fx = clamp((p.x - L0.ox) / L0.dw, 0, 1); st.fy = clamp((p.y - L0.oy) / L0.dh, 0, 1);
      var F = st.size; st.ax = (L0.ox + st.fx * L0.dw) / F.W; st.ay = (L0.oy + st.fy * L0.dh) / F.H;
    });
    // photo: moves the photo along its free axis (the anchor follows the focus)
    drag(ph, function (p, s, L0, s0) {
      var F = st.size;
      st.ax = clamp(s0.ax + (p.x - s.x) / F.W, 0, 1); st.ay = clamp(s0.ay + (p.y - s.y) / F.H, 0, 1);
      var L = layout(st); st.ax = (L.ox + st.fx * L.dw) / F.W; st.ay = (L.oy + st.fy * L.dh) / F.H;
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
    q('margins').onclick = function () { st.margins = !st.margins; q('margins').setAttribute('aria-pressed', String(st.margins)); draw(); };
    q('margins').title = 'Show where the ad’s copy sits on this size';
    [].forEach.call(q('vars').children, function (b) {
      b.onclick = function () {
        st.vars = +b.dataset.n;
        [].forEach.call(q('vars').children, function (x) { if (x === b) x.setAttribute('data-on', '1'); else x.removeAttribute('data-on'); x.setAttribute('aria-pressed', String(x === b)); });
        refreshQuote(); panel();
      };
      b.setAttribute('aria-pressed', String(b.dataset.n === '1'));
    });

    // ── generate ──
    function body(L) {
      if (st.engine !== 'nano') {
        var c = document.createElement('canvas'); c.width = L.sw; c.height = L.sh;
        c.getContext('2d').drawImage(st.img, 0, 0, L.sw, L.sh);
        return { req: { image: c.toDataURL('image/jpeg', 0.95), w: L.sw, h: L.sh, expand: L.ex, variations: st.vars },
          plan: { cw: L.ow, ch: L.oh, px: 0, py: 0 } };
      }
      // The whole frame at the model's nearest shape, the photo placed, and a mask of what to paint.
      // The bands are PREFILLED BY SMEARING THE PHOTO'S OUTER PIXELS outward: the model gets the colours
      // to continue and no scene to copy. (A blurred copy of the whole photo here came back as a second,
      // sharpened lagoon, 2026-11-20.) The mask reaches a little into the photo on each generated side
      // (OVERLAP) so the model blends across the edge; finish() fades the original over that strip.
      var P = nanoPlan(L), u = Math.min(1, NANO_UP / Math.max(P.cw, P.ch));
      var w = Math.round(P.cw * u), h = Math.round(P.ch * u);
      var x0 = (P.px + L.ex.left) * u, y0 = (P.py + L.ex.top) * u, pw = L.sw * u, phh = L.sh * u;
      var cnv = document.createElement('canvas'); cnv.width = w; cnv.height = h;
      var cx = cnv.getContext('2d'); cx.imageSmoothingQuality = 'high';
      smear(cx, w, h, x0, y0, pw, phh);
      var ov = overlap(L, u), msk = document.createElement('canvas'); msk.width = w; msk.height = h;
      var mx = msk.getContext('2d'); mx.fillStyle = '#fff'; mx.fillRect(0, 0, w, h);
      mx.fillStyle = '#000';
      mx.fillRect(Math.ceil(x0 + ov.l), Math.ceil(y0 + ov.t), Math.floor(pw - ov.l - ov.r) - 1, Math.floor(phh - ov.t - ov.b) - 1);
      return { req: { engine: 'nano', canvas: cnv.toDataURL('image/jpeg', 0.94), mask: msk.toDataURL('image/png'), aspect: P.aspect,
        resolution: NANO_RES, prompt: q('guide').value.trim(), variations: st.vars }, plan: P };
    }

    // How far the model may paint into the photo on each generated side (and how wide the fade is), in
    // the units given by k: 3% of the photo's side, at least 8 px at 1x.
    function overlap(L, k) {
      var o = function (n, d) { return n > 0 ? Math.max(8, d * 0.03) * k : 0; };
      return { l: o(L.ex.left, L.sw), r: o(L.ex.right, L.sw), t: o(L.ex.top, L.sh), b: o(L.ex.bottom, L.sh) };
    }

    // The prefill: the photo, its outer rows and columns stretched to the canvas edges (softened), and the
    // photo's average colour under the corners.
    function smear(cx, w, h, x0, y0, pw, phh) {
      var a = document.createElement('canvas'); a.width = a.height = 1;
      var ac = a.getContext('2d'); ac.drawImage(st.img, 0, 0, 1, 1); var d = ac.getImageData(0, 0, 1, 1).data;
      cx.fillStyle = 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')'; cx.fillRect(0, 0, w, h);
      var I = st.img, sx = I.naturalWidth / pw, sy = I.naturalHeight / phh, e = 2;   // the 2 outermost display px
      cx.save(); cx.filter = 'blur(' + Math.max(2, Math.round(Math.max(w, h) / 220)) + 'px)';
      if (y0 > 0) cx.drawImage(I, 0, 0, I.naturalWidth, e * sy, x0, 0, pw, y0 + 1);
      if (y0 + phh < h) cx.drawImage(I, 0, I.naturalHeight - e * sy, I.naturalWidth, e * sy, x0, y0 + phh - 1, pw, h - y0 - phh + 1);
      if (x0 > 0) cx.drawImage(I, 0, 0, e * sx, I.naturalHeight, 0, y0, x0 + 1, phh);
      if (x0 + pw < w) cx.drawImage(I, I.naturalWidth - e * sx, 0, e * sx, I.naturalHeight, x0 + pw - 1, y0, w - x0 - pw + 1, phh);
      cx.restore();
      cx.drawImage(I, x0, y0, pw, phh);
    }

    function generate() {
      var L = layout(st), B = body(L), E = ENGINES[st.engine], eng = st.engine;
      st.busy = true; st.results = []; st.pick = 0; panel(); draw();
      msg('Sending the frame to ' + E.short + '…');
      var t0 = Date.now();
      helper.expand(B.req).then(function (id) {
        st.job = id;
        return new Promise(function (res, rej) {
          (function poll() {
            if (st.closed) return rej(new Error('closed'));
            helper.job(id).then(function (j) {
              if (j.state === 'done') return res(j);
              if (j.state === 'failed') return rej(new Error(j.error || E.short + ' could not fill this photo.'));
              msg((j.step || 'Working') + '… ' + Math.round((Date.now() - t0) / 1000) + 's');
              setTimeout(poll, 1500);
            }, function () { rej(new Error('The helper stopped answering. Is it still running?')); });
          })();
        });
      }).then(function (j) {
        return Promise.all(j.results.map(function (u) { return finish(u, L, B.plan, E); }));
      }).then(function (list) {
        st.busy = false; st.results = list; st.pick = 0;
        msg('Done in ' + Math.round((Date.now() - t0) / 1000) + 's. Pick a variation, then use it.');
        draw(); panel();
        q('scroll').scrollTop = 0;
        try { q('use').focus(); } catch (e) {}
        if (eng === 'nano') helper.quotes = {};   // the balance moved; a fresh quote next time
      }).catch(function (e) {
        if (st.closed) return;
        st.busy = false; panel(); msg(e.message || String(e), true);
      });
    }

    // The result is checked for shape, cropped from the composed shape back to the frame, the original
    // photo pasted back over the middle (so its pixels cannot drift), and stored at most STORE_LONG on
    // the long side as a JPEG.
    function finish(url, L, P, E) {
      return loadImg(url).then(function (gen) {
        var gw = gen.naturalWidth, gh = gen.naturalHeight;
        if (Math.abs(Math.log((gw / gh) / (P.cw / P.ch))) > 0.02) throw new Error(E.short + ' returned ' + gw + ' × ' + gh + ', not the shape it was asked for.');
        var g = gw / P.cw;                                  // result px per layout px
        var outW = L.ow * g, outH = L.oh * g, sc = Math.min(1, STORE_LONG / Math.max(outW, outH));
        var w = Math.round(outW * sc), h = Math.round(outH * sc);
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        var x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
        x.drawImage(gen, P.px * g, P.py * g, outW, outH, 0, 0, w, h);
        var k = g * sc, rx = L.ex.left * k, ry = L.ex.top * k, rw = L.sw * k, rh = L.sh * k;
        if (P.cw === L.ow && P.ch === L.oh && !P.fade) {
          x.drawImage(st.img, rx, ry, rw, rh);              // Firefly: its expand keeps the pixels; a hard paste
        } else {
          // Nano Banana: the original, faded over the strip the model was allowed to blend into
          var o = overlap(L, k), t = document.createElement('canvas'); t.width = Math.ceil(rw); t.height = Math.ceil(rh);
          var tc = t.getContext('2d'); tc.imageSmoothingQuality = 'high'; tc.drawImage(st.img, 0, 0, rw, rh);
          tc.globalCompositeOperation = 'destination-in';
          [['l', 0, 0, o.l, 0], ['r', rw, 0, rw - o.r, 0], ['t', 0, 0, 0, o.t], ['b', 0, rh, 0, rh - o.b]].forEach(function (z) {
            if (!o[z[0]]) return;
            var gr = tc.createLinearGradient(z[1], z[2], z[3], z[4]); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
            tc.fillStyle = gr; tc.fillRect(0, 0, rw, rh);
          });
          x.drawImage(t, rx, ry);
        }
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
    function askClose() { if (!st.busy || confirm(ENGINES[st.engine].short + ' is still working' + (st.engine === 'nano' ? ' and the credits are already spent' : '') + '. Close anyway?')) close(); }
    q('close').onclick = askClose;
    ov.addEventListener('pointerdown', function (e) { if (e.target === ov && !st.busy) close(); });
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); if (!st.busy) close(); }
      if (e.key === 'Tab') {   // keep focus inside the dialog
        var f = [].filter.call(ov.querySelectorAll('button,input,textarea,[tabindex="0"]'), function (n) { return !n.disabled && n.offsetParent && n.tabIndex >= 0; });
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
      setEngine(st.engine);
      helper.probe().then(function () { panel(); refreshQuote(); });
      try { fp.focus(); } catch (e) {}
    }, function (e) { msg(e.message, true); });

    return { close: close };
  }

  W.ProvidentGenfill = { open: open, helper: helper, layout: layout, nanoPlan: nanoPlan };
})();
