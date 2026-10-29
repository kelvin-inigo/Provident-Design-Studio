/* ════════════════════════════════════════════════════════════════════════
   StudioBase — the code the two studios genuinely share.

   Loaded as a plain classic script from BOTH `Provident Campaign Studio.dc.html`
   and `Provident Organic Studio.dc.html`, after runtime.js / support.js and before
   either studio's `<script type="text/x-dc">` block. A top-level `class` in a
   classic script creates a global binding, so `class CampaignStudio extends
   StudioBase` resolves with no import and no build step.

   It was inline in the old combined file. It lives here because the two studios are
   now separate documents and a mirrored copy would be a second place for every fix
   to land — the one duplication this split refuses to accept. Everything else the
   two studios have in common (the `.p-*` chrome CSS, the canvas renderers) is still
   mirrored, because its cascade order and its per-studio drift are load-bearing.

   Nothing in here is DC-specific: `StudioBase` is a plain class that mimics the
   DCLogic surface (`state` / `setState` / `props` / `forceUpdate`) over one slice of
   the shell's state. It touches only browser globals plus the `window.provident*`
   helpers runtime.js installs, and it touches all of them lazily — no static
   initialiser calls out to anything, so load order beyond "after runtime.js" is free.

   `autoGrow()` looks for `.gd-bigta`, which only exists in the Organic studio. A
   querySelectorAll that matches nothing is a no-op, so this stays shared rather than
   forking the method.
   ════════════════════════════════════════════════════════════════════════ */

class StudioBase {
  // THE ICON PICKER'S KEYWORD INDEX, LOADED ON DEMAND (2026-10-20). icon-tags.js is 270 KB, so
  // it is fetched the first time a search is typed rather than on every page load. Returns the
  // index once it is here; until then null, and `done` is called (once per caller) when it lands.
  static iconTags(done) {
    if (window.providentIconTags) return window.providentIconTags;
    const W = StudioBase;
    if (done) (W._tagWait = W._tagWait || []).push(done);
    if (!W._tagReq) {
      W._tagReq = true;
      const s = document.createElement('script');
      s.src = './icon-tags.js';
      s.onload = () => { const f = W._tagWait || []; W._tagWait = []; f.forEach(fn => { try { fn(); } catch (e) {} }); };
      s.onerror = () => { W._tagReq = false; W._tagWait = []; };
      document.head.appendChild(s);
    }
    return null;
  }
  constructor(host, key) { this.host = host; this.key = key; }

  // ---------- DCLogic surface, backed by host.state[this.key] ----------
  get props() { return this.host.props; }
  get state() { return this.host.state[this.key] || {}; }
  setState(update, cb) {
    const k = this.key;
    this.host.setState(prev => {
      const cur = prev[k] || {};
      const patch = typeof update === 'function' ? update(cur) : update;
      return { [k]: Object.assign({}, cur, patch) };
    }, cb);
  }
  forceUpdate() { this.host.forceUpdate(); }
  componentDidMount() {}
  componentWillUnmount() {}
  renderVals() { return {}; }

  // Promote data-src to src on every <img> that carries one.
  //
  // No image whose URL comes from an interpolation may write it into `src` in the
  // markup. The raw `{{ ... }}` text reaches the DOM twice over — the browser's
  // preload scanner reads it straight out of the file before any script runs, and DC
  // mounts the markup once more before it interpolates — so each one used to cost a
  // 404 on every load (`GET /%7B%7B%20gdCard.src%20%7D%7D`). An <sc-if> around it does
  // not help: at parse time sc-if is an unknown element and its children are ordinary
  // DOM nodes, and `hint-placeholder-val` deliberately renders them anyway.
  // `data-src` is never fetched, so the interpolation lands somewhere inert and this
  // copies it across once it is real.
  //
  // PLACEHOLDER GUARD: an un-interpolated value still reads `{{ x }}`, and copying
  // that into src is precisely the fetch this exists to prevent — from the rAF tick it
  // fires every frame rather than once. Anything still carrying braces is skipped, and
  // no `_pSrc` is recorded, so the real value is picked up on a later pass.
  //
  // React never sees `src` (it only manages the data-src attribute), so it has no
  // reason to clobber it. Called from the shell's componentDidMount/DidUpdate, which
  // run after the DOM is updated but before paint — so there is no blank frame — and
  // again from each engine's rAF tick, to catch any render that does not route
  // through the shell.
  // Grow a textarea with its content, to a ceiling, then let it scroll. Height has to be
  // reset to auto first or scrollHeight only ever reports the current (larger) height and
  // the field can grow but never shrink.
  static GD_TA_MAX = 8;              // lines before it scrolls
  static autoGrow(root) {
    const els = (root || document).querySelectorAll('textarea.gd-bigta');
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      const cs = getComputedStyle(el);
      const line = parseFloat(cs.lineHeight) || (parseFloat(cs.fontSize) || 16) * 1.5;
      const pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0)
        + (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
      const max = Math.round(line * StudioBase.GD_TA_MAX + pad);
      el.style.height = 'auto';
      const want = Math.min(el.scrollHeight, max);
      const h = Math.round(want) + 'px';
      if (el.style.height !== h) el.style.height = h;
      el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
    }
  }
  // ---------- the photo store ----------
  // The ONE read of the photo store (`.image-slots.state.json`). runtime.js keeps it parsed
  // and re-parses only after a write, so a keystroke no longer rebuilds 60MB of photos.
  // A shallow copy: add or delete slots before a write, never edit a record in place.
  static sidecar() {
    if (window.providentSidecar) return window.providentSidecar();
    return fetch('.image-slots.state.json', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : {}).then(o => o || {}, () => ({}));
  }
  // A decoded picture per URL, kept for the session, so a render re-uses the photo it
  // decoded last time instead of decoding every photo in the project again. Resolves to
  // the Image, or null if it would not load. Never set anything on the Image it returns.
  // A Map, not an object: an object key of a multi-megabyte data URL gets interned and is
  // never freed. The oldest go first past IMG_MAX.
  static IMG_MAX = 48;
  static img(u) {
    if (!u) return Promise.resolve(null);
    const M = StudioBase._imgs || (StudioBase._imgs = new Map());
    let p = M.get(u);
    if (p) { M.delete(u); M.set(u, p); return p; }
    p = new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = u; });
    M.set(u, p);
    p.then(im => { if (!im) M.delete(u); });   // a failed load is tried again next time
    while (M.size > StudioBase.IMG_MAX) M.delete(M.keys().next().value);
    return p;
  }
  static promoteImgs(root) {
    const els = (root || document).querySelectorAll('img[data-src]');
    for (let i = 0; i < els.length; i++) {
      const el = els[i], want = el.getAttribute('data-src') || '';
      if (want.indexOf('{{') >= 0) continue;
      if (el._pSrc === want) continue;
      el._pSrc = want;
      if (want) el.setAttribute('src', want); else el.removeAttribute('src');
    }
  }

  // ---------- canvas typeface ----------
  // Readex Pro is the Arabic face: a variable font whose bundled subsets are cut to
  // `font-weight: 300 500`, which is exactly Light / Regular / Medium — the three
  // weights the canvas already uses. The file itself therefore enforces the range,
  // in the DOM preview and on canvas alike, so neither path can drift outside it.
  //
  // Google Sans Flex stays FIRST in nothing and LAST in the Arabic stack: Readex has
  // no Latin fallback worth losing, but if its subset has not arrived yet the run
  // must still be measured and drawn with the same face by every path.
  static FONTS = {
    latin:  { fam: 'Google Sans Flex', stack: "'Google Sans Flex',sans-serif", label: 'Google Sans Flex' },
    arabic: { fam: 'Readex Pro', stack: "'Readex Pro','Google Sans Flex',sans-serif", label: 'Readex Pro' }
  };
  static fontKey(state) { return (state && state.font === 'arabic') ? 'arabic' : 'latin'; }
  // The ONE place the active face is published. Every measure and render path reads
  // `window.providentFont` — see the note in runtime.js — so flipping it here flips
  // meas(), all four renderers, both canvasStyles and the thumbnail helper together,
  // which is what keeps the preview and the export naming the same font.
  static applyFont(state) {
    const f = StudioBase.FONTS[StudioBase.fontKey(state)];
    window.providentFontFam = f.fam;
    window.providentFont = f.stack;
    return f;
  }
  // A webfont is only downloaded when the DOM uses it — CANVAS USE DOES NOT TRIGGER IT.
  // So every weight has to be asked for explicitly, and with Arabic text as well as
  // Latin, or the arabic subset (a separate file, selected by unicode-range) never
  // arrives and Arabic copy silently draws in the fallback face.
  static ensureFont(key) {
    const f = StudioBase.FONTS[key];
    if (!f || key === 'latin' || !document.fonts) return Promise.resolve();
    StudioBase._fontP = StudioBase._fontP || {};
    if (StudioBase._fontP[key]) return StudioBase._fontP[key];
    const probes = [];
    [300, 400, 500].forEach(w => {
      probes.push(document.fonts.load(w + ' 16px "' + f.fam + '"'));
      probes.push(document.fonts.load(w + ' 16px "' + f.fam + '"', 'ابجد'));
    });
    return (StudioBase._fontP[key] = Promise.all(probes).catch(() => {}));
  }

  // ---------- brand copy rules ----------
  // Small words stay lowercase after the first word, because the brand's own fixed
  // headline is "New Listings Available this Week". The first word is always
  // capitalised, so "in dubai marina" still opens on a capital.
  // `from` belongs here for the same reason `for`, `by` and `of` already do — it is a
  // preposition, and without it the one-line price read "Starting From AED 6.7M".
  static SMALLWORDS = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'if', 'in',
    'nor', 'of', 'on', 'or', 'per', 'so', 'the', 'to', 'up', 'via', 'vs', 'yet'];
  // AN ALL-CAPS WORD IS KEPT EXACTLY AS TYPED, and that is the one exception to Title Case.
  // It was lower-casing the tail of every word unconditionally, so "Blakely Tower, JLT" came
  // out "Jlt" and "Tower A" came out "Tower a" — this market is full of acronyms (JLT, DIFC,
  // JVC, MBR City, UAE) and lettered towers, and an acronym re-cased is simply wrong rather
  // than merely restyled. It also means a user who deliberately types a word in capitals gets
  // capitals on the canvas, which is what was asked for on the Community / building field.
  //
  // The test is `w === w.toUpperCase() && w !== w.toLowerCase()`: the second half is what
  // says the word contains at least one CASED character, so "1361" and "-" fall through to
  // the normal path (where they are unchanged anyway) and an accented "ÉCOLE" is caught the
  // same as an ASCII one. A word that is all caps is never looked up in SMALLWORDS either:
  // somebody who types "PALM JUMEIRAH IN DUBAI" meant all of it.
  static toTitle(t) {
    let first = true;
    return String(t || '').replace(/\S+/g, w => {
      const wasFirst = first; first = false;
      if (w === w.toUpperCase() && w !== w.toLowerCase()) return w;
      const low = w.toLowerCase();
      const cap = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      return (!wasFirst && StudioBase.SMALLWORDS.indexOf(low) >= 0) ? low : cap;
    });
  }

  // ---------- bidirectional text ----------
  // The base direction of a run, by the FIRST STRONG CHARACTER — the same rule
  // `dir="auto"` uses. Digits are not strong, so "4.85 مليون درهم" is correctly RTL
  // and "AED 2.6M" stays LTR.
  //
  // This is not cosmetic. A canvas defaults to an LTR base direction, and measured
  // against a rendered image that is provably wrong for any Arabic run that leads
  // with a number or embeds a Latin one: "4.85 مليون درهم" and "فلل من AED 2.6M في
  // دبي" both come out differently under an LTR base than an RTL one. Arabic that
  // both starts and ends in Arabic happens to be identical either way, which is why
  // this only shows up on some strings.
  static RTL_RE = /[֐-׿؀-ۿ܀-ݏݐ-ݿހ-޿ࢠ-ࣿיִ-﷿ﹰ-﻿]/;
  static STRONG_RE = /[֐-׿؀-ۿ܀-ݏݐ-ݿހ-޿ࢠ-ࣿיִ-﷿ﹰ-﻿]|[A-Za-zÀ-ɏͰ-ԯ]/;
  static dirOf(text) {
    const m = StudioBase.STRONG_RE.exec(String(text == null ? '' : text));
    return (m && StudioBase.RTL_RE.test(m[0])) ? 'rtl' : 'ltr';
  }

  // ---------- shared text metrics ----------
  // textRendering: see renderOpsToCanvas — 'auto' measures hinted, wider widths at some sizes.
  mctx() {
    if (!this._m) { this._m = document.createElement('canvas').getContext('2d'); try { this._m.textRendering = 'optimizeLegibility'; } catch (e) {} }
    return this._m;
  }
  meas(text, px, weight, serif, ls) {
    const m = this.mctx();
    // serif === 'hd' measures in the HEADLINE face, which only Campaign's unbranded look
    // sets apart from the body face (window.providentFontHead); everywhere else they are one.
    m.font = `${weight} ${px}px ${(serif === 'hd' && window.providentFontHead) || window.providentFont || '"Google Sans Flex", sans-serif'}`;
    let w = m.measureText(text).width;
    // One ls per character, INCLUDING the last. Both things that actually draw tracked
    // text add a trailing unit — CSS letter-spacing in the preview and ctx.letterSpacing
    // in the export (measured: 25 units for a 25-character eyebrow, both paths) — so
    // reserving ls*(len-1) left every tracked run one unit short. Centred eyebrows sat
    // half a unit off, and a run could be judged to fit when the drawn glyphs would not.
    if (ls) w += ls * text.length;
    return w;
  }
  wrapRuns(runs, maxW) {
    const words = [];
    runs.forEach(r => (r.text || '').split(/\s+/).forEach(t => { if (t) words.push({ t, r }); }));
    const lines = []; let line = [], w = 0;
    const sp = r => this.meas(' ', r.px, r.weight, r.serif, 0);
    words.forEach(word => {
      const ww = this.meas(word.t, word.r.px, word.r.weight, word.r.serif, 0);
      const add = line.length ? sp(word.r) + ww : ww;
      if (line.length && w + add > maxW) { lines.push({ parts: line, width: w }); line = [word]; w = ww; }
      else { line.push(word); w += add; }
    });
    if (line.length) lines.push({ parts: line, width: w });
    return lines;
  }

  // ---------- shared writers: zip, pdf, download ----------
  static crcTable = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = StudioBase.crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  zip(files) {
    const enc = new TextEncoder();
    const parts = [], central = [];
    let offset = 0;
    files.forEach(f => {
      const name = enc.encode(f.name), data = f.data;
      const crc = this.crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, 0, true); lh.setUint16(12, 0, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
      lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    });
    let cdSize = 0; central.forEach(p => cdSize += p.length);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
  }
  // minimal PDF writer — one page per rendered canvas, JPEG-embedded
  buildPdf(pages) {
    const enc = new TextEncoder();
    const chunks = [];
    let len = 0;
    const push = d => { const b = typeof d === 'string' ? enc.encode(d) : d; chunks.push(b); len += b.length; };
    const offsets = {};
    const obj = (n, dict, stream) => {
      offsets[n] = len;
      push(n + ' 0 obj\n' + dict + '\n');
      if (stream) { push('stream\n'); push(stream); push('\nendstream\n'); }
      push('endobj\n');
    };
    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    const kids = pages.map((p, i) => (3 + i * 3) + ' 0 R').join(' ');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Count ' + pages.length + ' /Kids [' + kids + '] >>');
    pages.forEach((p, i) => {
      const pn = 3 + i * 3, cn = pn + 1, xn = pn + 2;
      obj(pn, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + p.w + ' ' + p.h + '] /Resources << /XObject << /Im0 ' + xn + ' 0 R >> >> /Contents ' + cn + ' 0 R >>');
      const cs = 'q ' + p.w + ' 0 0 ' + p.h + ' 0 0 cm /Im0 Do Q';
      obj(cn, '<< /Length ' + cs.length + ' >>', enc.encode(cs));
      obj(xn, '<< /Type /XObject /Subtype /Image /Width ' + p.pw + ' /Height ' + p.ph + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.data.length + ' >>', p.data);
    });
    const maxN = 2 + pages.length * 3;
    const xref = len;
    let x = 'xref\n0 ' + (maxN + 1) + '\n0000000000 65535 f \n';
    for (let n = 1; n <= maxN; n++) x += String(offsets[n]).padStart(10, '0') + ' 00000 n \n';
    push(x);
    push('trailer\n<< /Size ' + (maxN + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
    return new Blob(chunks, { type: 'application/pdf' });
  }
  // One raster encode for both studios. PNG is lossless but enormous at 2x
  // (a 16:9 frame is 3840x2160); JPEG q0.94 is visually indistinguishable on
  // photographic ads and a fraction of the bytes, which is what Meta ingests.
  async rasterFile(built, kind, scale) {
    const c = this.renderOpsToCanvas(built, scale == null ? 2 : scale);
    const jpg = kind === 'jpg';
    const blob = await new Promise(res => c.toBlob(res, jpg ? 'image/jpeg' : 'image/png', jpg ? 0.94 : undefined));
    return { ext: jpg ? 'jpg' : 'png', data: new Uint8Array(await blob.arrayBuffer()), w: c.width, h: c.height };
  }
  static sizeLabel(bytes) {
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }
  // ---------- recents ----------
  // IndexedDB, not localStorage: a single project's embedded images run ~1.5MB and
  // five recents blew the ~5MB cap, after which the old fallback re-saved without
  // thumbnails or images. renderVals needs a synchronous read, so the list is
  // cached in memory and refreshed on mount.
  recentsKey() { return 'recents:' + this.key; }
  // How many projects the splash remembers. They carry embedded thumbnails, which is
  // why this is capped at all — the list lives in IndexedDB, not localStorage.
  // The reel's pace: a short beat so the first variant arrives as soon as you hover,
  // then each design is HELD before it slides on. The slide itself keeps the 0.45s that
  // was tuned earlier — fast enough to read as a flick-through, not a slideshow.
  // DWELL IS 3s BY REQUEST, down from 6. It is the whole reason the reel can now be shown
  // on a six-slide carousel at all: at 6s a six-frame card took 30s to reach the last
  // slide, which is longer than anyone hovers, so the frames past the second were
  // unreachable in practice. At 3 the same card lands on its last slide in ~15s and each
  // step is still a beat rather than a flick. One value, so the recents cards and the
  // splash's template cards step at the same pace.
  static REEL_LEAD = .35;
  static REEL_DWELL = 3;
  static REEL_SLIDE = .45;
  // One @keyframes per frame count, built once and cached. The stops cannot be expressed
  // generically: where a hold ends and a slide begins is a different percentage for every
  // count, which is exactly why the old single from/to pair could only pan continuously.
  static _kf = {};
  static reelKeyframes(n) {
    if (StudioBase._kf[n]) return StudioBase._kf[n];
    const L = StudioBase.REEL_LEAD, D = StudioBase.REEL_DWELL, S = StudioBase.REEL_SLIDE;
    let t = L + S;
    const stops = [[0, 0], [L, 0], [t, 1]];
    for (let i = 1; i <= n - 2; i++) { t += D; stops.push([t, i]); t += S; stops.push([t, i + 1]); }
    const T = t || 1;
    const body = stops.map(p => (+(p[0] / T * 100).toFixed(3)) + '%{transform:translateX(' +
      (+(-p[1] / n * 100).toFixed(4)) + '%)}').join('');
    const name = 'pcSlide' + n;
    try {
      let el = document.getElementById('pc-reel-kf');
      if (!el) { el = document.createElement('style'); el.id = 'pc-reel-kf'; document.head.appendChild(el); }
      el.appendChild(document.createTextNode('@keyframes ' + name + '{' + body + '}'));
    } catch (e) {}
    StudioBase._kf[n] = { name, dur: T };
    return StudioBase._kf[n];
  }
  static reelTiming(n) {
    const k = StudioBase.reelKeyframes(Math.max(2, n || 2));
    return { '--n': String(n || 1), '--kf': k.name,
      animationDuration: (+k.dur.toFixed(2)) + 's',
      // eases every segment; a hold has equal endpoints, so only the slides show it
      animationTimingFunction: 'ease-in-out' };
  }
  static RECENT_MAX = 10;
  readRecents() { return this._recents || []; }
  // RECENTS ARE SAVED PROJECTS, AND NOTHING ELSE. They used to be written when you LEFT a
  // project for another one — picking a template, starting a new one, opening a recent —
  // so a project that was only ever opened sat on the splash beside the ones that had
  // been saved, and a project that WAS saved did not appear until something else was
  // opened. An entry is written by a save now (`recordSaved`) and by opening a session
  // file, which is a save someone already made. Entries written by the old rule carry
  // no `saved` flag and are hidden, not deleted: nothing can tell a saved one apart
  // among them, and the session files themselves are still in their folders.
  savedRecents() { return this.readRecents().filter(r => r && r.saved); }
  // A project's identity across saves, renames and sessions — so saving again replaces
  // its card instead of adding a second one, and two projects that happen to share a
  // name ("Untitled") are two cards. It rides in the state and in the session file.
  // The Content Hub post a project belongs to: `hubCardId` (or `card_id`) when it is a card id,
  // as a string, else ''. Read by both studios' Send (the X-Card-Id header) and normState.
  static hubCardOf(o) {
    const v = o && (o.hubCardId != null ? o.hubCardId : o.card_id);
    const t = v == null ? '' : String(v).trim();
    return /^\d{1,20}$/.test(t) ? t : '';
  }
  static newPid() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  ensurePid() {
    if (this.state.pid) return Promise.resolve(this.state.pid);
    const pid = StudioBase.newPid();
    return new Promise(res => this.setState({ pid }, () => {
      const sp = StudioBase.SESSIONS[this.sessionApp()];
      try { if (sp) localStorage.setItem(sp.key, JSON.stringify(this.state)); } catch (e) {}
      this.bindFolder();
      res(pid);
    }));
  }
  // The Source folder is remembered PER PROJECT (by pid), so reopening a project — in a new
  // tab, from Recent or Continue last — brings its folder back, while a new campaign still
  // starts with none. See `bind` in runtime.js.
  bindFolder() {
    const f = window.providentFolder;
    if (!f || !f.bind) return;
    Promise.resolve(f.bind(this.state && this.state.pid)).then(ch => { if (ch) this.forceUpdate(); }).catch(() => {});
  }
  // One-shot: a session file opened in this browser is recorded as a saved project on
  // the load that follows it. The loader cannot do it itself — it ends in a reload, and
  // the thumbnail has to be rendered by the engine the file is opened into.
  recSavedKey(sp) { sp = sp || StudioBase.SESSIONS[this.sessionApp()]; return sp ? sp.key + ':recsave' : ''; }
  // A canvas never pulls a webfont, so a thumbnail rendered before the face has landed
  // is drawn in the fallback and cached that way.
  async warmFaces() {
    const fam = window.providentFontFam || 'Google Sans Flex';
    const safe = f => { try { return document.fonts.load(f).catch(() => null); } catch (e) { return Promise.resolve(null); } };
    try { await Promise.all(['300 41px', '400 59px', '300 92px', '500 24px', '400 50px', '300 34px', '400 30px'].map(w => safe(w + ' "' + fam + '"'))); } catch (e) {}
    try { await document.fonts.ready; } catch (e) {}
  }
  // Write the CURRENT project into recents as a saved one — first in the list, replacing
  // its own earlier card — and refresh the splash's copy of the list at once, so going
  // to Projects straight after a save shows it without a reload.
  async recordSaved() {
    if (!this.recentEntry) return;
    const pid = await this.ensurePid();
    await this.warmFaces();
    let entry;
    try { entry = await this.recentEntry(); } catch (e) { console.warn('[provident] recent entry failed', e); return; }
    if (!entry) return;
    entry.saved = true; entry.pid = pid; entry.ts = Date.now();
    if (entry.state) entry.state.pid = pid;
    // Re-read before writing: every tab shares one list, and another tab may have saved
    // since this one loaded it — writing the cached copy would drop that tab's card.
    let rec = this.readRecents();
    const rt = window.providentRuntime;
    if (rt && rt.get) {
      try { const raw = await (rt.getStrict || rt.get)(this.recentsKey()); if (raw) rec = JSON.parse(raw) || rec; }
      catch (e) {
        // The stored list could not be read: writing now would replace it with this tab's copy.
        if (this._recFail) { console.warn('[provident] recents unreadable; this save is not added to Recent', e); return; }
      }
    }
    const next = [entry].concat(rec.filter(r => r && r.saved && r.pid !== pid)).slice(0, StudioBase.RECENT_MAX)
      .concat(rec.filter(r => r && !r.saved));
    await this.writeRecents(next);
    this.forceUpdate();
  }
  async loadRecents() {
    let rec = null;
    const rt = window.providentRuntime;
    this._recFail = false;
    if (rt && rt.get) {
      // A read that FAILED is not an empty list: falling back to the old localStorage copy
      // here is what showed an empty Recent and then wrote that copy over the real one.
      try { const raw = await (rt.getStrict || rt.get)(this.recentsKey()); if (raw) rec = JSON.parse(raw); }
      catch (e) { this._recFail = true; console.warn('[provident] recents could not be read', e); }
    }
    if (!rec && !this._recFail) {
      // one-time migration from whatever localStorage still holds
      try { rec = JSON.parse(localStorage.getItem(this.legacyRecentsKey())) || null; } catch (e) {}
      if (rec && rec.length) await this.writeRecents(rec);
    }
    this._recents = rec || [];
    // An older list still carries photos in its cards: move them out once.
    if (this._recents.some(r => r && r.images) && rt && rt.set) await this.writeRecents(this._recents);
    this.forceUpdate();
    this.bindFolder();
    const k = this.recSavedKey();
    let pend = false;
    try { pend = !!k && localStorage.getItem(k) === '1'; if (pend) localStorage.removeItem(k); } catch (e) {}
    if (pend) this.recordSaved();
  }
  // A RECENT CARD'S PHOTOS LIVE UNDER THEIR OWN KEY, never in the list. The list is read
  // whole on every load and rewritten whole on every save, and with export-grade photos in
  // each card it grew past 200 MB — at which point the write failed silently and every new
  // save vanished from the splash. `recImgKey` holds one card's photo map; an entry with
  // photos still inline (an older list) is moved out on its first write. A legacy card with
  // no `saved` flag is never shown, so it keeps its metadata and loses its photos.
  recImgKey(pid) { return this.recentsKey() + ':img:' + pid; }
  async recentImages(r) {
    if (!r) return {};
    if (r.images) return r.images;
    const rt = window.providentRuntime;
    if (r.pid && rt && rt.get) { try { return (await rt.get(this.recImgKey(r.pid))) || {}; } catch (e) {} }
    return {};
  }
  async writeRecents(rec) {
    const rt = window.providentRuntime;
    if (rt && rt.set) {
      const prev = this._recents || [];
      const out = [];
      for (const r of rec) {
        if (!r) continue;
        if (!r.images) { out.push(r); continue; }
        const { images, ...meta } = r;
        if (r.saved && r.pid) {
          try { await rt.set(this.recImgKey(r.pid), images); out.push(meta); continue; } catch (e) {}
          out.push(r);   // could not move them out: keep them rather than lose the photos
        } else out.push(meta);
      }
      rec = out;
      this._recents = rec;
      const keep = new Set(rec.filter(r => r.saved && r.pid).map(r => r.pid));
      prev.forEach(r => { if (r && r.pid && !keep.has(r.pid) && rt.del) rt.del(this.recImgKey(r.pid)).catch(() => {}); });
      try { await rt.set(this.recentsKey(), JSON.stringify(rec)); return true; } catch (e) { console.warn('[provident] recents not saved', e); }
    }
    this._recents = rec;
    // No IndexedDB: keep the metadata rather than lose the list entirely.
    try { localStorage.setItem(this.legacyRecentsKey(), JSON.stringify(rec)); return true; }
    catch (e) {
      try { localStorage.setItem(this.legacyRecentsKey(), JSON.stringify(rec.map(r => ({ name: r.name, ts: r.ts, state: r.state, thumbs: r.thumbs, saved: r.saved, pid: r.pid })))); } catch (e2) {}
      return false;
    }
  }

  // Open Session picks the FOLDER, not the file: a file handle gives no access to
  // its parent, so this is the only way to adopt the project folder at the same time
  // as loading the session. Falls back to a file input where there is no picker.
  // A session file chosen on its own, for a browser with no folder picker. `.json` and its
  // MIME type rather than the studios' double extensions: a phone's picker maps `accept` to a
  // file type, and `.smpstudio.json` is not one it knows.
  pickSessionFile() {
    if (typeof document === 'undefined') return;
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.style.display = 'none';
    inp.addEventListener('change', () => {
      const file = inp.files && inp.files[0];
      inp.remove();
      if (file) this.loadSessionFile(file);
    });
    document.body.appendChild(inp);
    inp.click();
  }
  async openSessionFolder() {
    const f = this.folderApi();
    // NO DIRECTORY PICKER — a phone, a tablet, Safari, Firefox — used to be a dead end: "This
    // browser cannot open folders", so a project saved on one computer could not be opened on
    // a phone at all. It falls back to choosing the session FILE, which is exactly what Save
    // session hands over on those browsers. Only adopting the folder is lost, and that half
    // does not exist without the API. Synchronous up to the picker, so the click that got
    // here still counts as the user's gesture.
    if (!f || !f.supported) { this.pickSessionFile(); return; }
    let h = null;
    // A dismissed picker is not a failure and says nothing; anything else has to be
    // reported, or the button looks dead.
    try { h = await f.pick(); }
    catch (e) {
      if (!(e && e.name === 'AbortError')) this.setState({ exportStatus: 'The folder could not be opened — ' + ((e && e.message) || e) + '.' });
      return;
    }
    if (!h) return;
    // EITHER studio's session file counts. This used to match only the current
    // studio's extension, so opening a folder that held a Campaign project while
    // standing in Organic reported "No .smpstudio.json here" and refused — even
    // though loadSessionFile treats a file for the other studio as a hand-over and
    // opens it perfectly well. Matching one extension also meant a folder holding
    // both could never offer the newer of the two. Still true across the split: the
    // hand-over now navigates to the other studio's document instead of reloading.
    const T = StudioBase.SESSIONS;
    const exts = Object.keys(T).map(k => T[k].ext);
    // Collect EVERY session file, not the first one the directory happens to
    // yield. A folder accumulates one .json per campaign name — renaming a
    // campaign and saving writes a new file and leaves the old one behind — and
    // `h.values()` has no defined order, so "first match" opened an arbitrary,
    // often stale project. Newest wins, and say which one it was.
    const hits = [];
    try {
      for await (const entry of h.values()) {
        if (entry.kind !== 'file') continue;
        const lower = entry.name.toLowerCase();
        if (!exts.some(x => lower.endsWith(x))) continue;
        let fl = null;
        try { fl = await entry.getFile(); } catch (e) { continue; }
        hits.push({ name: entry.name, file: fl, ts: fl.lastModified || 0 });
      }
    } catch (e) {}
    if (!hits.length) {
      this.setState({ exportStatus: 'No session file in "' + h.name + '" (looked for ' +
        exts.join(' or ') + ') — folder mapped, so Save session will write one there.' });
      return;
    }
    hits.sort((a, b) => b.ts - a.ts);
    const pick = hits[0];
    const others = hits.length > 1
      ? ' (newest of ' + hits.length + ': ' + hits.slice(1).map(x => x.name).join(', ') + ' left alone)'
      : '';
    this.setState({ exportStatus: 'Opening ' + pick.name + ' from "' + h.name + '"…' + others });
    this.loadSessionFile(pick.file);
  }

  // ── Session files ────────────────────────────────────────────────────────
  // One loader for both studios, driven by this table. Each studio used to have
  // its own copy that rejected anything not carrying its own `app` tag, so
  // handing the Campaign studio a perfectly good Organic post produced "Not a
  // valid session file." — it now recognises the other studio's file and hands
  // the project over instead.
  //
  // `file` is what makes the hand-over work now that the two studios are separate
  // documents: the loader writes the other studio's localStorage keys and then
  // NAVIGATES to its file, where it used to write the keys and reload in place.
  // Relative, so both studios have to sit in the same folder — which they already do
  // for runtime.js, image-slot.js, fonts/ and the shared photo store.
  static SESSIONS = {
    'provident-ad-studio': {
      studio: 'campaign', label: 'Campaign Ad Studio', ext: '.adstudio.json',
      file: 'Provident Campaign Studio.dc.html',
      key: 'provident-ad-studio-v2', resume: 'adstudio-resume', notice: 'adstudio-notice',
      prefix: /^adstudio-/,
      shape: st => !!(st.variants || st.modules)
    },
    'provident-smp-studio': {
      studio: 'organic', label: 'Organic Post Studio', ext: '.smpstudio.json',
      file: 'Provident Organic Studio.dc.html',
      key: 'provident-smp-studio-v2', resume: 'smp-resume', notice: 'smp-notice',
      prefix: /^smp-/,
      shape: st => !!st.slides
    }
  };
  // A message that has to survive the reload loadSessionFile ends with. One-shot:
  // load() reads it and clears it, so it can never resurface on a later reload
  // the way a status persisted into the saved state would.
  static takeNotice(key) {
    try { const v = localStorage.getItem(key); if (v) localStorage.removeItem(key); return v || ''; } catch (e) { return ''; }
  }
  sessionApp() { return null; }   // each engine names its own

  // A canvas op places a run by its BASELINE; CSS places a line box by its top. To put
  // the two in the same place the preview needs the font's ascent, which is a font
  // metric no arithmetic can guess — so measure it once off a canvas and cache it.
  // With line-height = px * (2 - a + d) the baseline lands exactly `px` below the box
  // top, which is where the ops put it.
  static _asc = null;
  static fontAsc() {
    // Keyed by the face, not cached once: the ascent is a metric of the FONT, so a
    // single global cache would hand Readex Pro's baselines Google Sans Flex's ascent
    // and every preview run would sit off its op by the difference.
    const key = window.providentFont || 'sans-serif';
    StudioBase._asc = StudioBase._asc || {};
    if (StudioBase._asc[key]) return StudioBase._asc[key];
    let a = .75, d = .25;
    try {
      const x = document.createElement('canvas').getContext('2d');
      x.font = '400 100px ' + key;
      const m = x.measureText('Hxpg');
      if (m.fontBoundingBoxAscent) { a = m.fontBoundingBoxAscent / 100; d = m.fontBoundingBoxDescent / 100; }
    } catch (e) {}
    return (StudioBase._asc[key] = { a, d });
  }
  // The line-height that puts a run's baseline `px` below its box top.
  static baseLH(px) { const f = StudioBase.fontAsc(); return px * (2 - f.a + f.d); }

  // ── Shrinking the canvas preview to its plate: a TRANSFORM, in every engine ─────
  // The preview box is laid out at the CANVAS's own size (1080 wide), so every run is set at
  // the pixel size buildOps measures, and is then shrunk to its plate. It used to be shrunk
  // with `zoom`, and zoom sets text at its ON-SCREEN size — which this font cannot survive,
  // because its optical-size axis makes a glyph wider the smaller it is set. Measured against
  // the export, run by run, at a plate's scale of ~.33-.41:
  //
  //   WebKit to 26 (Safari, the iOS app)  a zoomed rect reads UN-zoomed, a cqw font zooms twice
  //   WebKit 27                           98px headlines 6% wide, 16px tracked caps 81% wide —
  //                                       the 9px minimum font size inflates anything under it
  //   Chrome 152                          exact, EXCEPT Light 27px runs (the listed title, the
  //                                       review quote): 10-12% wide, set at opsz 11 — the
  //                                       on-screen size — where every other run keeps its own
  //
  // A transform lays the text out at canvas size and only paints it smaller: 98 of 98 runs
  // within 0.3% in WebKit 27 and in Chrome alike. The negative margins collapse the layout box
  // to the on-screen size, which is what `zoom` did on its own — the A/B in Chrome moved no
  // plate, canvas, bar or scroll extent by more than 0.6px. offsetWidth stays in canvas units
  // and getBoundingClientRect reports the on-screen rect, exactly as under Chrome's zoom, so no
  // gesture changes; the canvas also becomes a stacking context, which confines its own
  // z-indexed layers to it.
  static scaleBox(z, W, H) {
    return { transform: 'scale(' + z + ')', transformOrigin: '0 0',
      marginRight: ((z - 1) * W).toFixed(2) + 'px', marginBottom: ((z - 1) * H).toFixed(2) + 'px' };
  }

  // ── Co-brand lockup: `provident.` | partner mark ───────────────────────────────
  // Every measurement is a multiple of tk.logo, which is what "proportional to the
  // provident logo" has to mean: the partner then scales with the wordmark across all
  // three canvases AND across the Scaling control, with no second set of numbers.
  static CO = {
    gap: .52,     // clear space either side of the divider   x tk.logo
    rule: .055,   // divider thickness                        x tk.logo
    ruleH: 1.02,  // divider height                           x tk.logo
    h: .78,       // partner INK height                       x tk.logo
    maxW: .42,    // ceiling on the partner's ink width       x innerW
    cy: .30       // lockup centre, above the wordmark baseline, x tk.logo
  };
  // The ink box of an uploaded mark, normalised 0..1 of the file, plus the aspect of
  // that ink in real pixels. Measured by alpha-scanning a small copy, and cached per
  // URL because both the export and the preview ask for it.
  //
  // This is what makes an arbitrary upload line up: brand sheets are routinely padded
  // (the supplied SOBHA artwork is a 2000x340 canvas with the mark in the right half),
  // and scaling by the FILE box would set the mark far from the divider, at a fraction
  // of the height asked for, with a wide transparent gap nobody can see or delete.
  static _ink = {};
  static inkBox(img, url) {
    if (url && StudioBase._ink[url]) return StudioBase._ink[url];
    const iw = img.naturalWidth || 1, ih = img.naturalHeight || 1;
    let out = { x: 0, y: 0, w: 1, h: 1, aspect: iw / ih };
    try {
      const N = 240, s = Math.min(1, N / Math.max(iw, ih));
      const w = Math.max(1, Math.round(iw * s)), h = Math.max(1, Math.round(ih * s));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(img, 0, 0, w, h);
      const d = x.getImageData(0, 0, w, h).data;
      let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          if (d[(py * w + px) * 4 + 3] > 8) {
            if (px < x0) x0 = px;
            if (px > x1) x1 = px;
            if (py < y0) y0 = py;
            if (py > y1) y1 = py;
          }
        }
      }
      if (x1 >= x0 && y1 >= y0) {
        const bw = (x1 - x0 + 1) / w, bh = (y1 - y0 + 1) / h;
        out = { x: x0 / w, y: y0 / h, w: bw, h: bh, aspect: (bw * iw) / (bh * ih) };
      }
    } catch (e) {}
    if (url) StudioBase._ink[url] = out;
    return out;
  }
  // ── Where is the face? ────────────────────────────────────────────────────────────
  // The brief is "always get the focal point on their face", so a headshot, a half-body
  // and a full-body upload all have to render as the SAME framing. There is no face
  // detector to ask: Chrome's FaceDetector was never shipped without a flag, and no
  // library can be loaded — the studio runs offline, off the disk.
  //
  // A cut-out on transparency does not need one. Measure the ink's WIDTH row by row and
  // the body announces itself: the head and hair are narrow, the width JUMPS at the
  // shoulders, and the narrowest row between the head's widest point and that jump is the
  // neck. Three things this had to get right, each of which broke a real case:
  //
  //  - The steepest-widening row sits MID-RAMP, so "the widest row above it" already
  //    contains the shoulders. The jump is judged from the head measured well above the
  //    ramp against the body well below it.
  //  - The window has to run to 85% of the ink, not half of it. A full-body shot puts the
  //    shoulders 13% down and a tight headshot puts them at 78% — capping the search at
  //    the halfway mark found the head's own top edge on the headshot and nothing else.
  //  - Take the ARGMAX of the widening, never the first row over a threshold. The head's
  //    own top edge is a steep widening too; it is always shallower than the shoulders,
  //    but on long hair it clears a relative threshold and the head collapses to nothing.
  //
  // Returns the head normalised to the FILE box — `cx` its centre, `y0` its top, `h` its
  // height — or **null** when the picture will not support the reading (no transparency,
  // so the ink is the whole rectangle; or no real jump, so the guess would be a guess).
  // Every caller falls back to ink-box placement on null rather than framing at random.
  //
  // Verified against seven cut-outs — half-body, full-body, tight headshot, one padded
  // and off-centre in its file, long hair with no neck notch, arms held away from the
  // body, and an opaque photo — every head within a few pixels of the truth, and the two
  // opaque cases correctly null.
  static _head = {};
  static headBox(img, url) {
    if (url && StudioBase._head[url] !== undefined) return StudioBase._head[url];
    let out = null;
    try {
      const iw = img.naturalWidth || 1, ih = img.naturalHeight || 1;
      const N = 240, s = Math.min(1, N / Math.max(iw, ih));
      const w = Math.max(1, Math.round(iw * s)), h = Math.max(1, Math.round(ih * s));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(img, 0, 0, w, h);
      const d = x.getImageData(0, 0, w, h).data;
      // the ink's left and right edge on every row
      const L = new Int32Array(h).fill(-1), R = new Int32Array(h).fill(-1);
      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          if (d[(py * w + px) * 4 + 3] > 24) { if (L[py] < 0) L[py] = px; R[py] = px; }
        }
      }
      let top = -1, bot = -1;
      for (let py = 0; py < h; py++) if (L[py] >= 0) { if (top < 0) top = py; bot = py; }
      const inkH = bot - top + 1;
      if (top < 0 || inkH < 12) throw 0;
      const ext = py => (L[py] < 0 ? 0 : R[py] - L[py] + 1);
      // A photo with a background has ink edge to edge on every row — there is nothing to
      // read, so say so rather than measuring noise.
      let full = 0;
      for (let py = top; py <= bot; py++) if (ext(py) >= w * .98) full++;
      if (full > inkH * .8) throw 0;
      // the steepest widening anywhere in the ink's top 85% — the shoulder ramp
      const dd = Math.max(1, Math.round(inkH * .02));
      let sh = -1, best = 0;
      for (let py = top + Math.round(inkH * .06); py <= top + Math.round(inkH * .85); py++) {
        const g = ext(Math.min(bot, py + dd)) - ext(Math.max(top, py - dd));
        if (g > best) { best = g; sh = py; }
      }
      if (sh < 0) throw 0;
      // the head above the ramp against the body below it: a real jump, or this is a
      // logo, a torso, or a crop that starts at the shoulders
      let hw = 0, hy = top;
      for (let py = top; py <= Math.max(top, sh - dd * 3); py++) if (ext(py) > hw) { hw = ext(py); hy = py; }
      let bw = 0;
      for (let py = Math.min(bot, sh + dd); py <= Math.min(bot, sh + Math.round(inkH * .25)); py++) bw = Math.max(bw, ext(py));
      if (!hw || bw < hw * 1.35) throw 0;
      // the neck: the narrowest row between the head's widest point and the ramp
      let neck = sh, nw = Infinity;
      for (let py = hy; py <= sh; py++) if (ext(py) <= nw) { nw = ext(py); neck = py; }
      const hh = neck - top + 1;
      if (hh < inkH * .05 || hh > inkH * .85) throw 0;
      // centre on the head's own union extent, never the body's
      let hx0 = w, hx1 = -1;
      for (let py = top; py <= neck; py++) if (L[py] >= 0) { hx0 = Math.min(hx0, L[py]); hx1 = Math.max(hx1, R[py]); }
      out = { cx: ((hx0 + hx1 + 1) / 2) / w, y0: top / h, h: hh / h };
    } catch (e) { out = null; }
    if (url) StudioBase._head[url] = out;
    return out;
  }
  // Lays the lockup out. `dw/dh` is the box the WHOLE file is drawn at and `ox/oy` is
  // where its ink starts inside that box — no renderer has a source-rect, so the art
  // is drawn entire and its transparent surround simply hangs outside the ink box.
  static coBox(state, tk, innerW, ink) {
    const c = (state && state.colog) || {};
    const k = (c.scale == null ? 100 : c.scale) / 100;
    const CO = StudioBase.CO;
    const I = ink || { x: 0, y: 0, w: 1, h: 1, aspect: 1 };
    const gap = tk.logo * CO.gap, rw = Math.max(1, tk.logo * CO.rule), rh = tk.logo * CO.ruleH;
    let th = tk.logo * CO.h * k, tw = th * (I.aspect || 1);
    const cap = innerW * CO.maxW;
    if (tw > cap) { tw = cap; th = tw / (I.aspect || 1); }
    const dw = tw / Math.max(1e-6, I.w), dh = th / Math.max(1e-6, I.h);
    return { gap, rw, rh, tw, th, dw, dh, ox: dw * I.x, oy: dh * I.y };
  }

  // Export is PICK, then EXPORT — not a dropdown. The four formats are always on
  // screen, one is always selected, and the primary button runs that one; clicking a
  // row only chooses it. Built once here because both engines render the same rows,
  // and two copies of a list like this drift.
  static EXPKINDS = ['jpg', 'png', 'svg', 'pdf'];
  static EXPNAMES = { jpg: 'JPEG 2×', png: 'PNG 2×', svg: 'SVG', pdf: 'PDF' };
  // `noSvg` drops the SVG row too — Campaign's YouTube Demand Gen takes JPEG or PNG only.
  // Organic never passes it, so its picker is unchanged.
  expPickVals(pdfOn, noSvg) {
    const K = StudioBase.EXPKINDS, avail = K.filter(k => (k !== 'pdf' || pdfOn) && (k !== 'svg' || !noSvg));
    // PDF is the one row that can disappear, so a stored 'pdf' has to fall back
    // rather than leave the button pointing at a format with no row.
    let sel = this.state.exportKind || 'jpg';
    if (avail.indexOf(sel) < 0) sel = avail[0];
    // Inline styles beat the theme block, so the selected state is set here on the
    // style object — a [data-on] CSS rule could never win against it.
    // A rounded RECT, not a pill: these rows are two lines tall (format over its
    // description), so a capsule reads as a lozenge rather than as a button. The
    // primary Export button beneath them is the pill. Tokens, not literals, so both
    // themes work — the old #4E7A9E / #fff pair was invisible on a light panel.
    const row = on => ({
      display: 'flex', flexDirection: 'column', gap: '1px', alignItems: 'flex-start',
      textAlign: 'left', background: on ? 'var(--ps-accent-q)' : 'transparent',
      border: '1px solid ' + (on ? 'var(--ps-link)' : 'transparent'),
      borderRadius: '8px', padding: '8px 12px', color: 'var(--ps-ink)', cursor: 'pointer'
    });
    const o = {
      exportSel: sel,
      exportMainLabel: 'Export ' + StudioBase.EXPNAMES[sel],
      exportMainBtnStyle: { width: '100%', background: 'var(--ps-accent-h)', color: 'var(--ps-primary-i)', border: 'none', borderRadius: '999px', padding: '10px 16px', fontWeight: 500, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
      runExport: () => this.doExport(sel)
    };
    K.forEach(k => {
      const C = k[0].toUpperCase() + k.slice(1);
      o['pick' + C] = () => this.setState({ exportKind: k });
      o['export' + C + 'Style'] = row(sel === k);
      // '1' or undefined, never a boolean — data-on="false" matches [data-on].
      o[(k === 'pdf' ? 'exportPdfSelOn' : 'export' + C + 'On')] = sel === k ? '1' : undefined;
    });
    return o;
  }

  // Everything openSessionFolder and loadSessionFile report goes into `exportStatus`,
  // which the editor shows in its Share panel and the splash rendered NOWHERE — and
  // the splash is the only place Open Session lives. So picking a folder with no
  // session in it, or one whose file failed to parse, looked like a dead button: no
  // project opened and nothing said why. The project browser shows the same message.
  splashNoteVals() {
    const t = (this.state.exportStatus || '').trim();
    return { splashNote: t, splashNoteOn: !!t && t !== 'Ready.' };
  }

  // ── Placement preview ──────────────────────────────────────────────────────
  // The mockup shows the REAL export, not a second rendering of the design: each
  // placement is buildOps -> renderOpsToCanvas at a fraction of export scale, so
  // what the phone frame shows is byte-for-byte what Meta would ingest, only
  // smaller. Anything else would be a third renderer to keep in parity.
  mockPlan() { return { feed: 'sq', reel: 'st', story: 'st' }; }
  mockScale() { return 0.72; }          // 1080 -> ~780px, 2x the on-screen width
  async mockRenderAll() { return {}; }  // each engine knows its own asset loader
  mockCopy() { return { brand: 'provident.', primary: '', headline: '', desc: '', cta: 'Learn more' }; }
  // Identity of what is on screen, so a re-render only happens when the design
  // actually changed — this is called from the shell's componentDidUpdate.
  mockKey() { return ''; }
  async mockSync() {
    if (this._mockBusy) return;
    const key = this.mockKey();
    if (this._mockKey === key && this._mockShots) return;
    this._mockBusy = true;
    try {
      const shots = await this.mockRenderAll();
      this._mockKey = key;
      this._mockShots = shots;
    } catch (e) {
      console.warn('[provident] placement preview failed', e);
      this._mockShots = this._mockShots || {};
      this._mockKey = key;
    }
    this._mockBusy = false;
    this.forceUpdate();
  }
  mockShots() { return this._mockShots || {}; }
  // The platform-safe margins for a placement, as percentages of the frame, read
  // straight off PXT so the overlay can never disagree with what the engine lays out.
  mockSafeBox(kind) {
    const key = this.mockPlan()[kind];
    const t = this.constructor.PXT[key];
    if (!t || !t.pad) return null;
    const [pT, pR, pB, pL] = t.pad;
    return {
      position: 'absolute', pointerEvents: 'none',
      top: (pT / t.H * 100).toFixed(2) + '%', bottom: (pB / t.H * 100).toFixed(2) + '%',
      left: (pL / t.W * 100).toFixed(2) + '%', right: (pR / t.W * 100).toFixed(2) + '%',
      border: '1px dashed rgba(78,122,158,.95)', borderRadius: '2px'
    };
  }
  // …but those percentages are of the CREATIVE, and a cover-cropped placement renders
  // the creative LARGER than its media box and centred — so on a Reel the box above
  // drew the side margins ~47px too far in, understating exactly the width the crop
  // eats. This wrapper IS the creative's rendered box: full height, its own aspect,
  // centred, free to overflow (the media clips). The aspect is read off PXT so it
  // cannot drift, and the height comes from CSS so no constant is duplicated here.
  mockSafeWrap(kind) {
    const t = this.constructor.PXT[this.mockPlan()[kind]];
    if (!t) return null;
    return {
      position: 'absolute', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)',
      aspectRatio: t.W + ' / ' + t.H, pointerEvents: 'none'
    };
  }
  // A project that has never been written anywhere is the one worth guarding: the
  // studio keeps its state in localStorage, so a reload is safe, but closing the
  // tab or switching studios loses nothing the user can point at on disk. `_dirty`
  // is set by every edit and cleared the moment a save lands.
  isDirty() { return !!this._dirty; }
  // The studio reloads itself on purpose whenever it swaps projects — opening a
  // recent, picking a template, starting a new campaign, loading a session file.
  // Those are deliberate navigations, so the beforeunload guard must stand down for
  // them; otherwise every one of them raised Chrome's "Changes you made may not be
  // saved" over an action the user had just chosen. All of them route through here.
  // `url` is for the cross-studio hand-over: the two studios are separate documents,
  // so opening the other one's session file is a navigation rather than a reload. It
  // has to stand the beforeunload guard down the same way, which is the whole reason
  // it goes through here instead of assigning location.href at the call site.
  static reloading = false;
  static loadingSession = false;  // loadSessionFile: a project is being opened; the studios do not save over it
  reloadNow(url) {
    StudioBase.reloading = true;
    this.markSaved();
    // Every project swap comes through here, and a swap ends any AD SET link this tab was
    // following (share-link.js resumes one from sessionStorage on every load): otherwise the
    // designer opening their own project from Recent landed back in the review window. A
    // project's own edit link is untouched; it only resumes for the project whose pid it holds.
    try { sessionStorage.removeItem('provident-share:rs'); sessionStorage.removeItem('provident-share:adsets'); } catch (e) {}
    // A hand-over to the other studio stays in the same private workspace.
    if (url && window.providentWorkspace) url += (url.indexOf('?') < 0 ? '?' : '&') + 'ws=' + encodeURIComponent(window.providentWorkspace);
    if (url) location.href = url;
    else location.reload();
  }
  markDirty() { this._dirty = true; window.providentWorkspaceFresh = false; }
  markSaved() { this._dirty = false; }
  // One line for the native prompt and the in-app confirms, so they can't diverge.
  unsavedMsg() { return 'This project has unsaved changes. Save it before leaving?'; }
  confirmDiscard() {
    if (!this.isDirty()) return true;
    return window.confirm(this.unsavedMsg() + '\n\nOK leaves without saving. Cancel goes back so you can Save.');
  }
  // `opt.clean`: the file IS the whole project, so a delivery that carried no photos also clears this
  // studio's slots — otherwise it opened over whatever photos the store held from the last project.
  loadSessionFile(file, opt) {
    const label = (file && file.name) || 'that file';
    const fail = msg => this.setState({ exportStatus: msg });
    const rd = new FileReader();
    // Without this a failed read was a total no-op: the button did nothing and
    // said nothing.
    rd.onerror = () => fail('Could not read "' + label + '" — ' + ((rd.error && rd.error.message) || 'the file could not be opened') + '.');
    rd.onload = async () => {
      let d;
      try { d = JSON.parse(rd.result); }
      catch (e) { fail('"' + label + '" is not valid JSON — ' + (e && e.message || e)); return; }
      if (!d || typeof d !== 'object' || !d.state || typeof d.state !== 'object') {
        fail('"' + label + '" carries no project data, so there is nothing to open.');
        return;
      }
      // The Content Hub's design-job draft carries its post id at the TOP level beside `state`;
      // only `state` is kept from here on, so lift it in or Send could not attach the pages.
      if (d.state.hubCardId == null && StudioBase.hubCardOf(d)) d.state.hubCardId = StudioBase.hubCardOf(d);
      const T = StudioBase.SESSIONS;
      const mine = T[this.sessionApp()];
      // Identify by the app tag, then fall back to the shape of the state
      // itself, so a hand-edited file or one written before the tag existed
      // still opens instead of being called invalid.
      let spec = typeof d.app === 'string' ? T[d.app] : null;
      if (!spec) spec = Object.keys(T).map(k => T[k]).find(sp => { try { return sp.shape(d.state); } catch (e) { return false; } });
      if (!spec) { fail('"' + label + '" does not look like a studio session — no variants, components or slides in it.'); return; }
      // An empty project is not a project. `shape` only asks whether the key exists,
      // and `!![]` is true, so a file carrying `variants: []` or `slides: []` passed
      // straight through and opened a studio with nothing in it and no message. Only
      // an explicitly empty array is refused — a missing key is an old file that
      // migrates fine.
      const arr = spec.studio === 'campaign' ? d.state.variants : d.state.slides;
      if (Array.isArray(arr) && !arr.length) {
        fail('"' + label + '" holds an empty project — no ' + (spec.studio === 'campaign' ? 'variants' : 'slides') + ' in it, so there is nothing to open.');
        return;
      }
      const imgs = d.images || {};
      const n = Object.keys(imgs).length;
      if (n && !(window.omelette && window.omelette.writeFile)) {
        fail('This view cannot store photos, so the session was not loaded. Open the studio over http:// rather than by double-clicking the file, then try again.');
        return;
      }
      // The page keeps running while the photos are stored (seconds, for big ones), and a save of
      // whatever is on screen in that time would overwrite the project being opened, so the reload
      // came back on the old one. loadingSession stops the studios' own saves (upd, restore,
      // persist) until the reload, and the project is written again just before it.
      const savedState = JSON.stringify(Object.assign(d.state, { exportStatus: '' }));
      try {
        localStorage.setItem(spec.key, savedState);
        localStorage.setItem(spec.resume, '1');
        localStorage.setItem(this.recSavedKey(spec), '1');
        StudioBase.loadingSession = true;
      } catch (e) {
        fail('"' + label + '" could not be opened — the browser refused to store it (' + (e && e.name || e) + '). Free some space and try again.');
        return;
      }
      if (n || (opt && opt.clean && window.omelette && window.omelette.writeFile)) {
        // Merge: clear only the target studio's slots so loading a session
        // cannot wipe the other studio's photos out of the shared store.
        let sidecar = {};
        try { sidecar = await StudioBase.sidecar(); } catch (e) {}
        Object.keys(sidecar).forEach(k => { if (spec.prefix.test(k)) delete sidecar[k]; });
        Object.assign(sidecar, imgs);
        let stored = false;
        try { stored = !!(await Promise.resolve(window.omelette.writeFile('.image-slots.state.json', JSON.stringify(sidecar)))); }
        catch (e) { stored = false; }
        // This used to be `.catch(() => {})`: a rejected write meant the project
        // reloaded with every photo missing and no hint as to why.
        if (!stored && n) {
          try {
            localStorage.setItem(spec.notice, 'Opened "' + label + '" but its ' + n + ' photo' +
              (n === 1 ? '' : 's') + ' could not be stored — the browser is out of space. Clear some recent projects, then load it again.');
          } catch (e2) {}
        }
      }
      try { localStorage.setItem(spec.key, savedState); localStorage.setItem(spec.resume, '1'); } catch (e) {}
      // A file for the other studio is a hand-over, not an error. Its keys are
      // written above; all that is left is to open the document that reads them.
      // Same-studio files reload in place, exactly as before.
      this.reloadNow(spec === mine ? '' : spec.file);
    };
    try { rd.readAsText(file); }
    catch (e) { fail('Could not read "' + label + '" — ' + (e && e.message || e)); }
  }

  // ---------- From the hub ----------
  // The project browser's "From the hub" view: what the Content Hub has RECEIVED (every
  // Share › Send lands at its /api/imports), read back and opened as a project. The hub keeps
  // each delivery as the project's own session .json (`content`, photos embedded as they were in
  // the store at send time) plus the RENDERED images Send attached. Opening goes through
  // loadSessionFile, so a delivery for the other studio hands over exactly as a session file does.
  // The rendered images are NOT put back into the project: they are finished exports with the
  // copy baked in, not the photos a canvas draws. They are the card's thumbnails only.
  // Read-only: nothing here ever deletes or changes an import.
  static HUB_KEYS = ['provident-cas-endpoint', 'provident-ops-endpoint'];
  static HUB_THUMBS = 3;
  // The Send endpoint IS the list (…/api/imports). Own studio's URL and token first; with no
  // token there, the other studio's (one hub, one token, two studios on one computer).
  hubCfg() {
    const own = (typeof this.epCfg === 'function' && this.epCfg()) || {};
    let url = own.url || '', key = own.key || '';
    if (!key) for (const k of StudioBase.HUB_KEYS) {
      try { const c = JSON.parse(localStorage.getItem(k) || '{}') || {}; if (c.key && (!c.url || c.url === url)) { key = c.key; break; } } catch (e) {}
    }
    return { url: String(url).trim().replace(/\/+$/, ''), key };
  }
  static hubHost(u) { try { return new URL(u).host; } catch (e) { return u || 'the hub'; } }
  // Same Local Network Access dance as Send (epPost): an https page reading an http:// office
  // address is mixed content unless the request says it is for the local network.
  async hubFetch(url, ms, cache) {
    const c = this.hubCfg();
    const headers = {};
    if (c.key) headers.Authorization = 'Bearer ' + c.key;
    const ac = new AbortController(), to = setTimeout(() => ac.abort(), ms || 30000);
    const opts = { headers, signal: ac.signal, mode: 'cors', credentials: 'omit', cache: cache || 'no-store' };
    try {
      const lan = (() => { try { const x = new URL(url); return x.protocol === 'http:' && !/^(localhost|127\.|\[::1\])/.test(x.hostname); } catch (e) { return false; } })();
      if (lan) for (const sp of ['local', 'private']) {
        try { return await fetch(url, Object.assign({}, opts, { targetAddressSpace: sp })); }
        catch (e) { if (!(e instanceof TypeError) || /fetch|network|load/i.test(e.message || '')) throw e; }
      }
      return await fetch(url, opts);
    } finally { clearTimeout(to); }
  }
  hubWhy(e, url) {
    const host = StudioBase.hubHost(url);
    if (e && e.name === 'AbortError') return 'The hub at ' + host + ' took too long to answer. Try Refresh.';
    if (location.protocol === 'https:' && /^http:/i.test(url)) return 'The browser blocked the hub at ' + host + ': this page is https and the hub is plain http. In Chrome, press Allow when it asks to access devices on your local network (the address bar’s site settings if you dismissed it), and on a Mac allow Chrome in System Settings › Privacy & Security › Local Network. Safari and Firefox cannot read the hub from the website — open the studio from this Mac instead.';
    return 'Could not reach the hub at ' + host + ' — check you are on the office network and the hub is up.';
  }
  hubRefused(r, url) {
    if (r.status === 401 || r.status === 403) return 'The hub at ' + StudioBase.hubHost(url) + ' refused the token — set the Import token in Share › Import hub.';
    if (r.status === 404) return 'Nothing answers at ' + url + ' — the Endpoint URL in Share › Import hub should end in /api/imports.';
    return 'The hub at ' + StudioBase.hubHost(url) + ' answered HTTP ' + r.status + '.';
  }
  // Which studio a delivery is for, from its file names alone (the list carries no app tag, and
  // fetching every project just to label it would pull megabytes per card). A hint, nothing more.
  static hubKind(it) {
    const n = (it.assets || []).map(a => a.original_name || a.name).join('\n');
    if (/_(feed|story|portrait_3x4|landscape_1\.91x1|eventbrite_banner)/i.test(n)) return 'campaign';
    if (/_(3x4|9x16)\./i.test(n)) return 'organic';
    return '';
  }
  hubDrop() {
    const h = this._hub;
    if (h && h.urls) h.urls.forEach(u => { try { URL.revokeObjectURL(u); } catch (e) {} });
  }
  async hubLoad() {
    if (this._hub && this._hub.busy) return;
    const c = this.hubCfg(), gen = (this._hubGen = (this._hubGen || 0) + 1);
    const prev = this._hub || {};
    this._hub = Object.assign({}, prev, { busy: true, msg: '' });
    this.forceUpdate();
    const done = o => { if (gen !== this._hubGen) return; this._hub = Object.assign({ busy: false, items: [], thumbs: {}, urls: [] }, o); this.forceUpdate(); };
    const ok = this.constructor.epUrlOk ? this.constructor.epUrlOk(c.url) : /^https?:\/\//.test(c.url);
    if (!ok) { this.hubDrop(); return done({ msg: 'The Endpoint URL in Share › Import hub is not usable (' + (c.url || 'empty') + ').' }); }
    let r;
    try { r = await this.hubFetch(c.url, 20000); }
    catch (e) { this.hubDrop(); return done({ msg: this.hubWhy(e, c.url) }); }
    if (!r.ok) { this.hubDrop(); return done({ msg: this.hubRefused(r, c.url) }); }
    let list;
    try { list = await r.json(); } catch (e) { list = null; }
    if (!Array.isArray(list)) { this.hubDrop(); return done({ msg: StudioBase.hubHost(c.url) + ' answered, but not with a list of deliveries — is the Endpoint URL in Share › Import hub the hub’s /api/imports?' }); }
    this.hubDrop();
    done({ ok: true, base: c.url, items: list.filter(it => it && it.id).slice(0, 40), at: Date.now() });
    this.hubThumbs(gen);
  }
  // Small WebP copies of the first few renders, four at a time: a full export is ~1-2 MB and
  // 2160 px, and forty cards of those is a lot of decoded pixels for a 70px thumbnail.
  async hubThumbs(gen) {
    const h = this._hub;
    if (!h || !h.ok) return;
    const jobs = [];
    h.items.forEach(it => (it.assets || []).slice(0, StudioBase.HUB_THUMBS).forEach(a => jobs.push([it.id, a.name])));
    let i = 0, tick = 0;
    const one = async () => {
      while (i < jobs.length && gen === this._hubGen) {
        const [id, name] = jobs[i++];
        try {
          const r = await this.hubFetch(h.base + '/' + encodeURIComponent(id) + '/assets/' + encodeURIComponent(name), 30000, 'default');
          if (!r.ok) continue;
          let blob = await r.blob();
          try {
            const bm = await createImageBitmap(blob, { resizeHeight: 240, resizeQuality: 'medium' });
            (h.ar = h.ar || {})[id + '/' + name] = bm.width / bm.height;
            const cv = document.createElement('canvas'); cv.width = bm.width; cv.height = bm.height;
            cv.getContext('2d').drawImage(bm, 0, 0); bm.close && bm.close();
            blob = await new Promise(res => cv.toBlob(b => res(b || blob), 'image/webp', .82));
          } catch (e) {}
          if (gen !== this._hubGen) return;
          const u = URL.createObjectURL(blob);
          h.urls.push(u); h.thumbs[id + '/' + name] = u;
          if (++tick % 3 === 0 || i >= jobs.length) this.forceUpdate();
        } catch (e) {}
      }
    };
    await Promise.all([one(), one(), one(), one()]);
    if (gen === this._hubGen) this.forceUpdate();
  }
  // The Content Hub's "Open in OPS" button opens the studio at #hubopen=<base64url URL>: the hub's
  // GET /api/items/<id>/studio, which answers with the post's current design version (the project
  // .json OPS sent, photos and all) or a draft from the copy. #hubdraft=<base64url JSON> carries the
  // draft itself (the first form of the button). The hash is dropped BEFORE loading, because
  // loadSessionFile ends in a reload and would otherwise open it again forever. The project carries
  // hubCardId, so Send adds the next version to that post.
  hubHashOpen() {
    const m = /^#(hubdraft|hubopen)=([A-Za-z0-9_-]+)$/.exec(location.hash || '');
    if (!m) return false;
    history.replaceState(null, '', location.pathname + location.search);
    let raw;
    try {
      const b = atob(m[2].replace(/-/g, '+').replace(/_/g, '/'));
      raw = new TextDecoder().decode(Uint8Array.from(b, c => c.charCodeAt(0)));
    } catch (e) { this.setState({ exportStatus: 'The hub link could not be read.' }); return false; }
    if (m[1] === 'hubopen') { this.hubLinkOpen(raw); return true; }
    let doc;
    try { doc = JSON.parse(raw); } catch (e) { this.setState({ exportStatus: 'The hub link did not carry a readable draft.' }); return false; }
    const st = doc && doc.state;
    if (!st || !Array.isArray(st.slides) || !st.slides.length) { this.setState({ exportStatus: 'The hub draft has no pages.' }); return false; }
    this.hubDraftOpen(doc);
    return true;
  }
  async hubLinkOpen(url) {
    if (!/^https?:\/\/[^/]+\/api\/items\/\d+\/studio(\?[A-Za-z0-9=&_-]*)?$/.test(url)) { this.setState({ exportStatus: 'The hub link does not point at a hub post.' }); return; }
    this.setState({ exportStatus: 'Opening the post from the hub…' });
    let doc;
    try {
      const r = await this.hubFetch(url, 120000);
      if (!r.ok) { this.setState({ exportStatus: 'The hub refused to open the post — HTTP ' + r.status + '.' }); return; }
      doc = await r.json();
    } catch (e) { this.setState({ exportStatus: this.hubWhy(e, url) }); return; }
    if (!doc || !doc.state || !Array.isArray(doc.state.slides) || !doc.state.slides.length) { this.setState({ exportStatus: 'The hub sent a post with no pages.' }); return; }
    this.hubDraftOpen(doc);
  }
  // The brief's pictures travel as URLs (`hubImages`) — a photo is far too big for a URL hash —
  // and are fetched here, encoded as an upload would be, and placed as the backgrounds of the
  // pages that take a photo, in order. A picture that fails is skipped (logged to the console);
  // the copy still opens. More pictures than pages: the extra ones are not placed. `hub` (the
  // post, its brief, the change notes, the next version) is kept as state.hubPost for the bar.
  async hubDraftOpen(doc) {
    const st = doc.state, urls = (Array.isArray(doc.hubImages) ? doc.hubImages : []).filter(u => typeof u === 'string');
    delete doc.hubImages;
    if (doc.hub && typeof doc.hub === 'object') { st.hubPost = doc.hub; if (doc.hub.card) st.hubCardId = String(doc.hub.card); }
    delete doc.hub;
    st.screen = 'editor';
    doc.images = (doc.images && typeof doc.images === 'object') ? doc.images : {};
    let placed = 0;
    if (urls.length) {
      const C = this.constructor;
      const pages = st.slides.filter(sl => sl && sl.id && (typeof C.photoUsed !== 'function' || C.photoUsed(sl.kind)));
      const want = urls.slice(0, pages.length);
      this.setState({ exportStatus: 'Loading ' + want.length + ' brief picture' + (want.length === 1 ? '' : 's') + ' from the hub…' });
      const got = await Promise.all(want.map(async u => {
        try {
          const r = await this.hubFetch(u, 60000, 'default');
          if (!r.ok) throw new Error('HTTP ' + r.status);
          const blob = await r.blob();
          const name = decodeURIComponent(u.split('/').pop() || 'brief');
          return await window.providentEncodeFile(new File([blob], name, { type: blob.type }));
        } catch (e) { console.warn('brief picture', u, e); return null; }
      }));
      got.forEach((d, i) => { if (d) { doc.images['smp-bg-' + pages[i].id] = d; placed++; } });
    }
    const fname = String(st.customName || 'Hub post').replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 80) + '.json';
    this.loadSessionFile(new File([JSON.stringify(doc)], fname, { type: 'application/json' }), { clean: true });
    return placed;
  }
  async hubOpenItem(it) {
    const h = this._hub || {};
    if (!h.base || !this.confirmDiscard()) return;
    const title = (it.title || 'the delivery').trim();
    const fail = msg => this.setState({ exportStatus: msg });
    fail('Opening “' + title + '” from the hub…');
    let doc;
    try {
      const r = await this.hubFetch(h.base + '/' + encodeURIComponent(it.id), 180000);
      if (!r.ok) return fail(this.hubRefused(r, h.base));
      doc = await r.json();
    } catch (e) { return fail(this.hubWhy(e, h.base)); }
    const content = doc && doc.content;
    if (!content || typeof content !== 'object' || !content.state || typeof content.state !== 'object')
      return fail('“' + title + '” was sent by ' + (it.source || 'another system') + ' and carries no studio project, so there is nothing to open. Its images are on the hub’s Received page.');
    const fname = title.replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 80) + '.json';
    this.loadSessionFile(new File([JSON.stringify(content)], fname, { type: 'application/json' }), { clean: true });
  }
  static hubWhen(s) {
    const d = new Date(String(s || '').replace(/([+-]\d\d)(\d\d)$/, '$1:$2'));
    if (isNaN(d)) return '';
    const t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const day = new Date(); day.setHours(0, 0, 0, 0);
    const diff = Math.round((day - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
    return diff === 0 ? 'Today ' + t : diff === 1 ? 'Yesterday ' + t : d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + t;
  }
  // The day a delivery came in, for the view's group headings.
  static hubDay(s) {
    const d = new Date(String(s || '').replace(/([+-]\d\d)(\d\d)$/, '$1:$2'));
    if (isNaN(d)) return { key: 'x', label: 'Undated' };
    const day = new Date(); day.setHours(0, 0, 0, 0);
    const diff = Math.round((day - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
    return { key: d.toDateString(), label: diff === 0 ? 'Today' : diff === 1 ? 'Yesterday'
      : d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }), d };
  }
  // The renders sit side by side on the stage at ONE height, each at its own aspect, as large as
  // the stage allows: a width share of a/S of the row, scaled down by f only when the row would
  // run taller than the stage (R is the stage's inner height over width, a little under 4:3's).
  static hubRow(ars) {
    const R = .7, S = ars.reduce((t, a) => t + a, 0) || 1, f = Math.min(1, R * S);
    const g = (ars.length - 1) * 8;
    return ars.map(a => 'calc((100% - ' + g + 'px) * ' + (a / S * f).toFixed(4) + ')');
  }
  hubVals(on) {
    const h = this._hub || {};
    // Off screen, only the sidebar's count is read: building every card on every render cost
    // the editor a full pass over the deliveries on each keystroke.
    if (!on) return { hubCount: h.ok ? String((h.items || []).length) : '', hubCountOn: h.ok ? true : undefined };
    const mine = this.sessionApp() === 'provident-ad-studio' ? 'campaign' : 'organic';
    const NAME = { campaign: 'Campaign', organic: 'Organic' };
    const seen = new Set(), groups = [], byDay = {};
    const items = (h.items || []).map(it => {
      const kind = StudioBase.hubKind(it), n = (it.assets || []).length;
      const shown = (it.assets || []).slice(0, StudioBase.HUB_THUMBS);
      const ars = shown.map(a => (h.ar && h.ar[it.id + '/' + a.name]) || (kind === 'campaign' ? 1 : .75));
      const ws = StudioBase.hubRow(ars);
      const th = shown.map((a, k) => {
        const u = h.thumbs && h.thumbs[it.id + '/' + a.name];
        const st = { width: ws[k], aspectRatio: String(ars[k]) };
        if (u) st.backgroundImage = 'url(' + u + ')';
        return { style: st, wait: u ? undefined : '1' };
      });
      const title = (it.title || '').trim() || 'Untitled delivery';
      // Newest first, so a title already seen means a NEWER send of the same post exists.
      const tkey = title.toLowerCase(), older = seen.has(tkey); seen.add(tkey);
      const other = kind && kind !== mine;
      const d = StudioBase.hubDay(it.received_at);
      const time = d.d ? d.d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const src = (it.source || '').trim();
      const v = {
        title,
        meta: [time, n + ' image' + (n === 1 ? '' : 's'), src && !/^design (system|studio)/i.test(src) ? 'from ' + src : ''].filter(Boolean).join(' · '),
        kindLabel: kind ? NAME[kind] : 'Not a project', kindOn: true,
        kind: kind || 'none', other: other ? '1' : undefined,
        moreOn: n > shown.length ? true : undefined, more: '+' + (n - shown.length),
        olderOn: older ? true : undefined,
        openLabel: !kind ? 'Try to open' : other ? 'Open in ' + NAME[kind] : 'Open',
        thumbs: th, thumbsOn: th.length ? true : undefined,
        tip: (older ? 'A newer send of this post is further up. ' : '') + 'Open this delivery as a project'
          + (other ? ' — it opens in the ' + NAME[kind] + ' studio' : '') + '. The hub keeps its copy.',
        open: () => this.hubOpenItem(it)
      };
      if (!byDay[d.key]) { byDay[d.key] = { label: d.label, items: [] }; groups.push(byDay[d.key]); }
      byDay[d.key].items.push(v);
      return v;
    });
    groups.forEach(g => { g.count = g.items.length + (g.items.length === 1 ? ' delivery' : ' deliveries'); });
    const ago = h.at ? Math.round((Date.now() - h.at) / 60000) : null;
    const st = h.busy ? 'busy' : h.msg ? 'bad' : h.ok ? 'ok' : 'idle';
    return {
      hubOn: on ? true : undefined,
      hubCount: h.ok ? String((h.items || []).length) : '',
      hubCountOn: h.ok ? true : undefined,
      hubItems: items, hubGroups: groups,
      hubBusy: h.busy ? true : undefined,
      hubMsg: h.msg || '', hubMsgOn: h.msg ? true : undefined,
      hubEmptyOn: h.ok && !h.busy && !items.length ? true : undefined,
      hubHost: StudioBase.hubHost(this.hubCfg().url),
      hubWhere: StudioBase.hubHost(this.hubCfg().url) + (st === 'ok' && ago != null ? ' \u00b7 ' + (ago < 1 ? 'updated just now' : 'updated ' + ago + ' min ago') : ''),
      hubSt: st,
      hubStLabel: st === 'busy' ? 'Checking the hub' : st === 'bad' ? 'Not reachable' : st === 'ok' ? 'Connected' : 'Content Hub',
      hubAgo: st === 'ok' && ago != null ? (ago < 1 ? 'updated just now' : 'updated ' + ago + ' min ago') : '',
      hubRefresh: () => this.hubLoad(),
      hubRefreshLabel: h.busy ? 'Loading…' : 'Refresh'
    };
  }

  // ---------- the usage folder (Component usage's source) ----------
  // A folder — on this computer or in Google Drive — where the team keeps its saved projects.
  // Component usage counts every project of THIS studio in it (and up to four folders down)
  // instead of only the last few saved on this computer. It replaced the Projects folder view
  // (2026-10-26), which listed the same files and only opened them — something Open session,
  // Recent and From the hub already did.
  //
  // The folder is remembered per COMPUTER (`provident-lib` for which kind, the local handle in
  // IndexedDB as `lib:dir`). It is only ever READ. It is scanned when Component usage opens (or
  // Refresh is pressed), never at boot. Each file is reduced to what the count needs —
  // `libUses(state)`, the engine's own summary — and that summary is kept per file with its
  // modified time in `lib:uses`, so the next scan only reads the files that changed.
  static LIB_SKIP = /^(\.|assets$|copy$|photoshop$|edits$|brief$|carousel$|variant [a-z]$|eventbrite banners$|yt demand gen$|node_modules$)/i;
  static LIB_DEPTH = 4;
  static LIB_MAX = 2000;
  static LIB_FRESH = 120000;      // a scan younger than this is reused when the view reopens
  libMark() { try { return JSON.parse(localStorage.getItem('provident-lib') || 'null'); } catch (e) { return null; } }
  libSetMark(m) { try { m ? localStorage.setItem('provident-lib', JSON.stringify(m)) : localStorage.removeItem('provident-lib'); } catch (e) {} }
  libSet(o) { this._lib = Object.assign({}, this._lib || {}, o); this.forceUpdate(); }
  // what a file says about the count; the engine overrides it (CampaignStudio.usePlacements)
  libUses(state) { return null; }
  static libKeyOf(m) { return m ? (m.kind === 'drive' ? 'drive:' + m.id : 'local:' + m.name) : ''; }
  // Opening the view: count straight away when the folder is still reachable, else say what one
  // click will do. Never opens a picker or a popup — those need the click.
  async libLoad(force) {
    const m = this.libMark(), F = window.providentFolder, l = this._lib;
    if (!m) { this._lib = { st: 'none' }; this.forceUpdate(); return; }
    if (l && l.st === 'busy') return;
    if (!force && l && l.st === 'ok' && l.key === StudioBase.libKeyOf(m) && Date.now() - (l.at || 0) < StudioBase.LIB_FRESH) return;
    if (m.kind === 'drive') {
      const D = window.providentDrive;
      if (!D || !(await D.ensure())) return this.libSet({ st: 'ask', mark: m });
      return this.libScan(D.dir(m.id, m.name), m);
    }
    let h = null;
    try { h = F && F.libGet ? await F.libGet() : null; } catch (e) {}
    if (!h) { this.libSetMark(null); this._lib = { st: 'none' }; this.forceUpdate(); return; }
    let p = 'prompt';
    try { p = await h.queryPermission({ mode: 'read' }); } catch (e) {}
    if (p !== 'granted') return this.libSet({ st: 'ask', mark: m, handle: h });
    this.libScan(h, m);
  }
  // The "Reconnect" / "Sign in" button: the one gesture a remembered folder needs.
  async libConnect() {
    const l = this._lib || {}, m = l.mark || this.libMark();
    if (!m) return;
    try {
      if (m.kind === 'drive') { await window.providentDrive.signIn(); return this.libScan(window.providentDrive.dir(m.id, m.name), m); }
      const h = l.handle || await window.providentFolder.libGet();
      const p = h ? await h.requestPermission({ mode: 'read' }) : 'denied';
      if (p !== 'granted') return this.libSet({ st: 'ask', msg: 'The browser did not allow reading “' + m.name + '”. Choose the folder again.' });
      this.libScan(h, m);
    } catch (e) { this.libSet({ st: 'ask', msg: (e && e.message) || String(e) }); }
  }
  async libPickLocal() {
    if (typeof window.showDirectoryPicker !== 'function') return this.libSet({ msg: 'This browser cannot open a folder on this computer — use a Google Drive folder link, or Chrome or Edge on a computer.' });
    let h;
    try { h = await window.showDirectoryPicker({ mode: 'read', id: 'provident-lib', startIn: 'documents' }); }
    catch (e) { if (!(e && e.name === 'AbortError')) this.libSet({ msg: 'The folder could not be opened — ' + ((e && e.message) || e) + '.' }); return; }
    const m = { kind: 'local', name: h.name };
    try { await window.providentFolder.libSet(h); } catch (e) {}
    this.libSetMark(m);
    this.libScan(h, m);
  }
  async libUseDrive(e) {
    const box = e && e.currentTarget && e.currentTarget.closest('[data-lib]');
    const inp = box && box.querySelector('[data-lib-in]');
    const D = window.providentDrive;
    try {
      if (!D.id(inp && inp.value)) throw new Error('That is not a Google Drive folder link. Open the folder in Drive and copy the address from the browser — it contains /folders/.');
      await D.signIn();                 // first: the popup needs the click's activation
      const f = await D.folderOf(inp.value);
      const m = { kind: 'drive', id: f.id, name: f.name };
      try { await window.providentFolder.libSet(null); } catch (er) {}
      this.libSetMark(m);
      this.libScan(D.dir(f.id, f.name), m);
    } catch (er) { this.libSet({ msg: (er && er.message) || String(er) }); }
  }
  libDriveKey(e) { if (e.key === 'Enter') { e.preventDefault(); this.libUseDrive(e); } }
  // Back to counting Recent: the folder and its remembered summaries are forgotten.
  async libForget() {
    this._libGen = (this._libGen || 0) + 1;
    this.libSetMark(null);
    try { await window.providentFolder.libSet(null); } catch (e) {}
    try { const rt = window.providentRuntime; if (rt && rt.del) await rt.del('lib:uses'); } catch (e) {}
    this._lib = { st: 'none' }; this.forceUpdate();
  }
  // A saved session's state, read from the head of the file: the studios write
  // {app, v, state, images}, so everything up to ,"images": is the project without its photos.
  static libState(text) {
    for (let i = text.indexOf(',"images":'); i > 0; i = text.indexOf(',"images":', i + 1)) {
      try { const d = JSON.parse(text.slice(0, i) + '}'); if (d && d.state) return d; } catch (e) {}
    }
    try { return JSON.parse(text); } catch (e) { return null; }
  }
  // The state of one file: a growing head (256 KB, then 4 MB), then the whole file. A state
  // with a long copy history can outgrow the first read; the photos after it never matter.
  static async libRead(h) {
    for (const n of [262144, 4194304, 0]) {
      let text, whole = false;
      if (h.drive) {
        if (n && (!h.size || h.size > n)) text = await h.head(n);
        else { text = await (await h.getFile()).text(); whole = true; }
      } else {
        const f = await h.getFile();
        whole = !n || f.size <= n;
        text = await (whole ? f : f.slice(0, n)).text();
      }
      const d = StudioBase.libState(text);
      if (d && d.state) return d.state;
      if (whole) return null;
    }
    return null;
  }
  async libScan(root, m) {
    const gen = (this._libGen = (this._libGen || 0) + 1);
    const prev = this._lib && this._lib.key === StudioBase.libKeyOf(m) ? this._lib.items : null;
    this._lib = { st: 'busy', mark: m, root, key: StudioBase.libKeyOf(m), items: prev || null, found: 0, read: 0 };
    this.forceUpdate();
    const ext = (StudioBase.SESSIONS[this.sessionApp()] || {}).ext;
    const items = [];
    const rt = window.providentRuntime;
    let cache = null;
    try { cache = rt && rt.get ? await rt.get('lib:uses') : null; } catch (e) {}
    if (!cache || cache.key !== this._lib.key) cache = { key: this._lib.key, files: {} };
    const keep = {};
    try {
      // breadth first, four folders at a time, so a Drive folder is not listed one call at a time
      let level = [{ dir: root, path: [] }];
      for (let d = 0; d <= StudioBase.LIB_DEPTH && level.length && items.length < StudioBase.LIB_MAX; d++) {
        const next = [];
        let i = 0;
        const one = async () => {
          while (i < level.length && gen === this._libGen) {
            const { dir, path } = level[i++];
            const dirs = [];
            try {
              for await (const [name, h] of dir.entries()) {
                if (h.kind === 'directory') { if (!StudioBase.LIB_SKIP.test(name)) dirs.push([name, h]); }
                else if (ext && name.toLowerCase().endsWith(ext) && items.length < StudioBase.LIB_MAX) items.push({ name, h, path });
              }
            } catch (e) { if (e && e.gdAuth) throw e; continue; }
            dirs.forEach(([n, h]) => next.push({ dir: h, path: path.concat(n) }));
          }
        };
        await Promise.all([one(), one(), one(), one()]);
        if (gen !== this._libGen) return;
        this._lib.found = items.length; this.forceUpdate();
        level = next;
      }
      // each file's summary, four at a time; one unchanged since the last scan is not read again
      let k = 0;
      const meta = async () => {
        while (k < items.length && gen === this._libGen) {
          const it = items[k++], id = it.path.concat(it.name).join('/');
          try {
            it.ts = it.h.drive ? (it.h.modified || 0) : ((await it.h.getFile()).lastModified || 0);
            const c = cache.files[id];
            if (c && c.ts === it.ts && it.ts) { it.uses = c.uses; it.title = c.title; }
            else {
              const st = await StudioBase.libRead(it.h);
              it.uses = st ? this.libUses(st) : null;
              it.title = String((st && (st.campaign || st.customName)) || '').trim();
            }
          } catch (e) { if (e && e.gdAuth) throw e; it.uses = null; }
          if (!it.title) it.title = it.name.replace(/\.(adstudio|smpstudio)\.json$/i, '');
          if (it.uses) keep[id] = { ts: it.ts, uses: it.uses, title: it.title };
          this._lib.read = k;
          if (k % 10 === 0) this.forceUpdate();
        }
      };
      await Promise.all([meta(), meta(), meta(), meta()]);
    } catch (e) {
      if (gen !== this._libGen) return;
      return this.libSet({ st: e && e.gdAuth ? 'ask' : 'bad', msg: (e && e.message) || String(e) });
    }
    if (gen !== this._libGen) return;
    items.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    try { if (rt && rt.set) await rt.set('lib:uses', { key: cache.key, files: keep }); } catch (e) {}
    this.libSet({ st: 'ok', items, at: Date.now(), msg: '' });
  }
  // The source panel at the top of Component usage. Off screen it costs nothing.
  libVals(on) {
    if (!on) return {};
    const l = this._lib || {}, m = l.mark || this.libMark();
    const st = l.st || (m ? 'ask' : 'none');
    const drive = m && m.kind === 'drive';
    const ago = l.at ? Math.round((Date.now() - l.at) / 60000) : null;
    const D = window.providentDrive;
    if (D && D.clientId()) D.load().catch(() => {});      // warm it, so the click's popup is not blocked
    const items = l.items || [], counted = items.filter(it => it.uses).length, skipped = items.length - counted;
    const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
    return {
      libNoneOn: st === 'none' ? true : undefined,
      libSrcOn: st !== 'none' ? true : undefined,
      libAskOn: st === 'ask' ? true : undefined,
      libAskLabel: drive ? 'Sign in to Google' : 'Reconnect the folder',
      libAskNote: drive ? 'Sign in with your Provident Google account to count the projects in “' + (m && m.name) + '”.'
        : 'The browser asks again after a restart before the studio may read “' + (m && m.name) + '”.',
      libSt: st === 'busy' ? 'busy' : st === 'bad' ? 'bad' : st === 'ok' ? 'ok' : 'idle',
      libStLabel: st === 'busy' ? (l.read ? 'Reading ' + l.read + ' of ' + l.found + '…' : l.found ? 'Found ' + l.found + '…' : 'Looking…')
        : st === 'bad' ? 'Not reachable' : (drive ? 'Google Drive' : 'This computer'),
      libWhere: (m ? m.name : '') + (st === 'ok' ? ' · ' + plural(counted, 'project') + (skipped ? ' (' + skipped + ' could not be read)' : '')
        + (ago != null ? ' · ' + (ago < 1 ? 'updated just now' : 'updated ' + ago + ' min ago') : '') : ''),
      libMsg: l.msg || '', libMsgOn: l.msg ? true : undefined,
      libLocalOk: typeof window.showDirectoryPicker === 'function' ? true : undefined,
      libLocalNo: typeof window.showDirectoryPicker === 'function' ? undefined : true,
      libPick: () => this.libPickLocal(),
      libGd: e => this.libUseDrive(e), libGdKey: e => this.libDriveKey(e),
      libConnect: () => this.libConnect(),
      libRefresh: () => { const mm = this.libMark(); if (l.root && mm) this.libScan(l.root, mm); else this.libLoad(true); },
      libRefreshLabel: st === 'busy' ? 'Reading…' : 'Refresh',
      libChange: () => this.libForget()
    };
  }

  // ---------- project folder ----------
  // One folder holds the session, its source assets and its renders. Picked once,
  // then overwritten in place. Chrome/Edge only — Safari has no directory picker,
  // so everything below falls back to the download path.
  folderApi() { return window.providentFolder || null; }
  folderSupported() { const f = this.folderApi(); return !!(f && f.supported); }
  folderName() { const f = this.folderApi(); return f ? f.name : ''; }
  // Re-grants a remembered folder, or opens the picker. Must run from a click.
  async folderOpen(askIfMissing) {
    const f = this.folderApi();
    if (!f || !f.supported) return null;
    let h = f.handle || await f.ensure();
    if (!h && askIfMissing) { try { h = await f.pick(); } catch (e) { h = null; } }
    return h;
  }
  static extOf(u) {
    const m = /^data:image\/([a-z0-9+]+)/i.exec(String(u || ''));
    const s = (m ? m[1] : 'png').toLowerCase();
    return s === 'jpeg' ? 'jpg' : (s === 'svg+xml' ? 'svg' : s);
  }
  static bytesOf(u) {
    const i = String(u).indexOf(',');
    const b = atob(String(u).slice(i + 1));
    const a = new Uint8Array(b.length);
    for (let k = 0; k < b.length; k++) a[k] = b.charCodeAt(k);
    return a;
  }
  static slug(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 28) || 'item';
  }
  static urlOf(v) { return v ? (typeof v === 'string' ? v : v.u) : null; }
  // Write a set of files into the project folder. A name may carry folders — "Assets/qr.png",
  // or CAS's "Variant A/Eventbrite Banners/…" — and the folder API creates each level. It
  // reports what it is about to replace, unless the caller asks it to overwrite: CAS's
  // export does, by request, because it replaces the same files every time. OPS passes
  // nothing and keeps the prompt exactly as it was.
  async writeProject(files, opt) {
    const f = this.folderApi();
    if (!f || !f.handle) return false;
    const overwrite = !!(opt && opt.overwrite);
    // An ad set review keeps each project as <name>.adstudio.json in the ad set's Drive folder.
    // When the Source folder IS that folder (synced to the Mac by Google Drive), the session
    // file has the same name and used to be written over it, cutting the project off from its
    // ad set. A session file never carries `review`, so one that does is left alone and the
    // session goes beside it as "<name> (session).adstudio.json".
    files = await Promise.all(files.map(async fl => {
      const m = /^(.*)(\.(?:adstudio|smpstudio)\.json)$/.exec(fl.name || '');
      if (!m) return fl;
      try {
        const d = await f.dirFor(fl.name, false);
        const file = d && await (await d.getFileHandle(fl.name.split('/').pop())).getFile();
        if (!file || file.size > 8e6) return fl;
        const doc = JSON.parse(await file.text());
        if (doc && doc.review && typeof doc.review === 'object') return Object.assign({}, fl, { name: m[1] + ' (session)' + m[2] });
      } catch (e) {}
      return fl;
    }));
    const clash = [];
    if (!overwrite) for (const fl of files) { if (await f.exists(fl.name)) clash.push(fl.name); }
    if (clash.length && f.askBeforeOverwrite) {
      const shown = clash.slice(0, 12).join('\n');
      const more = clash.length > 12 ? '\n… and ' + (clash.length - 12) + ' more' : '';
      const ok = window.confirm('Replace ' + clash.length + ' file' + (clash.length === 1 ? '' : 's') +
        ' in "' + f.name + '"?\n\n' + shown + more + '\n\nOK replaces them. Cancel keeps what is there.');
      if (!ok) { this.setState({ exportStatus: 'Cancelled — nothing was replaced in "' + f.name + '".' }); return false; }
    }
    // Name the file that failed and say what to do about it. A folder handle survives in
    // IndexedDB but the FOLDER does not: rename, move or delete it and every write throws
    // NotFoundError — "A requested file or directory could not be found at the time an
    // operation was processed", which as a bare message tells the user nothing and looks
    // like the export itself is broken. Files written before the failure are still there.
    let done = 0;
    for (const fl of files) {
      try { await f.write(fl.name, fl.data); done++; }
      catch (e) {
        const gone = e && (e.name === 'NotFoundError' || /could not be found/i.test(e.message || ''));
        this.setState({ exportStatus: gone
          ? 'Source folder "' + f.name + '" is no longer where it was — renamed, moved or deleted. ' +
            done + ' of ' + files.length + ' file' + (files.length === 1 ? '' : 's') +
            ' written. Pick it again with Source folder.'
          : 'Could not write "' + fl.name + '" into "' + f.name + '" — ' + ((e && e.message) || e) +
            '. ' + done + ' of ' + files.length + ' written.' });
        return false;
      }
    }
    return true;
  }
  // THE SESSION FILE WITHOUT A FOLDER, for both studios. The project is recorded in Recent
  // first — on a phone that IS the save, kept on the device, and the file is a copy, then a download. "Pick a source folder" is advice only where there is a folder picker.
  async saveSessionCopy(name, ext, data) {
    this.markSaved();
    this.recordSaved();
    const blob = new Blob([data], { type: 'application/json' });
    this.download(blob, name + ext);
    this.setState({ exportStatus: 'Saved ' + name + ext + (this.folderSupported() ? ' \u2014 pick a source folder to keep Assets alongside it.' : '.') });
  }
  // THE FIRST WORD OF AN EXPORT ROW, read off the same three branches `deliver` takes, so the
  // row cannot promise a zip the export does not write: a source folder gets the files flat,
  // anything else gets a zip.
  deliverWord() {
    const f = this.folderApi();
    if (f && f.supported && (f.handle || f.pending)) return 'Into the folder';
    return 'Zip';
  }
  // Renders go into the folder when there is one, otherwise a zip download. A render's name
  // may carry folders (CAS's per-variant organisation); the zip keeps them as paths, so it
  // unpacks into the same layout the source folder gets. `opt.overwrite` skips the replace
  // prompt (writeProject).
  async deliver(files, name, opt) {
    const f = this.folderApi();
    const h = await this.folderOpen(false);
    // the folders the renders went into, for the status line — none for a flat export,
    // so OPS's message is unchanged
    const dirs = [...new Set(files.map(fl => String(fl.name).split('/')).filter(p => p.length > 1).map(p => p[0]))];
    const inDirs = dirs.length ? ' — ' + dirs.join(', ') : '';
    if (h) {
      await this.ensurePid();
      const all = files.concat(await this.projectFiles(name));
      const ok = await this.writeProject(all, opt);
      // it rewrote the session file beside the renders, so it IS a save
      if (ok) { this.markSaved(); this.recordSaved(); this.setState({ exportStatus: 'Exported ' + files.length + ' file' + (files.length === 1 ? '' : 's') + ' into "' + f.name + '"' + inDirs + ' · session + Assets refreshed' }); }
      return ok;
    }
    const blob = this.zip(files);
    // No project folder set, so ask where this should go rather than silently dropping it
    // in Downloads. A cancelled dialog leaves the project untouched and says so.
    const how = await this.saveAs(blob, name + '.zip', 'Zip archive', 'application/zip', '.zip');
    if (how === 'cancelled') { this.setState({ exportStatus: 'Export cancelled — nothing was saved.' }); return false; }
    this.setState({ exportStatus: 'Exported ' + files.length + ' files → ' + name + '.zip' + inDirs + ' · ' +
      this.constructor.sizeLabel(blob.size) + (how === 'saved' ? ' · saved where you chose' : '') });
    return true;
  }
  download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  // Ask WHERE to put the file instead of dropping it in Downloads. showSaveFilePicker
  // gives the real OS save dialog, so the user picks the folder and can rename in place.
  // It must be called from a user gesture — the export buttons are clicks, so that holds.
  // Chrome/Edge only; Safari and Firefox fall back to the ordinary download, which is the
  // behaviour everything had before. A cancelled dialog is NOT an error: it returns false
  // so the caller can say "cancelled" rather than reporting a failed export.
  async saveAs(blob, name, desc, mime, ext) {
    if (!window.showSaveFilePicker) { this.download(blob, name); return 'downloaded'; }
    let handle;
    try {
      handle = await window.showSaveFilePicker({
        suggestedName: name,
        types: [{ description: desc || 'File', accept: { [mime || blob.type || 'application/octet-stream']: [ext || ('.' + String(name).split('.').pop())] } }]
      });
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
      this.download(blob, name); return 'downloaded';   // picker unavailable/blocked
    }
    try {
      const ws = await handle.createWritable();
      try { await ws.write(blob); } finally { await ws.close(); }
      return 'saved';
    } catch (e) {
      this.download(blob, name); return 'downloaded';
    }
  }
}

// ══ GOOGLE DRIVE, SHARED BY BOTH STUDIOS (2026-10-23) ═══════════════════════════════════════
// Google Identity Services, token model — no secret, no server. The OAuth client ID is public
// by design (an INTERNAL app, so only Provident accounts sign in). One token per page: CAS's
// Ad sets and both studios' Projects folder view all read this object, so one sign-in serves
// them all. The token is kept in memory only. docs/google-drive-setup.md has the admin steps.
window.providentDrive = {
  CLIENT: '210522580023-ajcrfmscqohgbdq36t6ph4mrhnk9u5s3.apps.googleusercontent.com',
  SCOPE: 'https://www.googleapis.com/auth/drive',
  FOLDER: 'application/vnd.google-apps.folder',
  MIME: { json: 'application/json', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml', pdf: 'application/pdf', txt: 'text/plain' },
  tok: null, lib: null,
  // Where the Drive API answers: Google, or (tests only) localStorage['provident-drive-base'],
  // which tools/share-dev/serve.py answers with an in-memory stand-in.
  base() { let v = ''; try { v = localStorage.getItem('provident-drive-base') || ''; } catch (e) {} return /^https?:\/\/[^/]+$/.test(v) ? v : 'https://www.googleapis.com'; },
  clientId() { let v = ''; try { v = localStorage.getItem('provident-drive-client') || ''; } catch (e) {} return this.CLIENT || v; },
  load() {
    if (this.lib) return this.lib;
    return (this.lib = new Promise((res, rej) => {
      if (window.google && google.accounts && google.accounts.oauth2) return res();
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = () => res(); s.onerror = () => { this.lib = null; rej(new Error('Google sign-in could not load — check the connection.')); };
      document.head.appendChild(s);
    }));
  },
  // SIGN IN ONCE PER COMPUTER. The token is kept in localStorage (shared by every tab and both
  // studios) until Google expires it, about an hour; the ACCOUNT is remembered for good
  // (WHO), so the next sign-in passes it as login_hint with no prompt — Google's popup opens
  // and closes by itself, with no account chooser and no consent screen. A token can only be
  // renewed from a click (the popup), which is why an expired session still asks for one.
  TOK: 'provident-drive-tok', WHO: 'provident-drive-who',
  valid() {
    const ok = t => !!(t && t.at && t.exp > Date.now() + 60000);
    if (!ok(this.tok)) {
      let t = null;
      try { t = JSON.parse(localStorage.getItem(this.TOK) || 'null'); } catch (e) {}
      if (!ok(t)) { try { t = JSON.parse(sessionStorage.getItem(this.TOK) || 'null'); } catch (e) {} }   // a tab signed in before this
      if (ok(t)) { this.tok = t; this.keep(); }
    }
    return ok(this.tok);
  },
  keep() { try { localStorage.setItem(this.TOK, JSON.stringify(this.tok)); } catch (e) {} },
  drop() { this.tok = null; try { localStorage.removeItem(this.TOK); sessionStorage.removeItem(this.TOK); } catch (e) {} },
  // The account that signed in on this computer: { email, name, first }.
  who() { try { const w = JSON.parse(localStorage.getItem(this.WHO) || 'null'); return w && w.email ? w : null; } catch (e) { return null; } },
  // A short name for review logs: the account's first name, else its email alias.
  alias(w) {
    w = w || this.who(); if (!w) return '';
    const first = String(w.name || '').trim().split(/\s+/)[0];
    if (first) return first;
    const a = String(w.email || '').split('@')[0].split(/[._+-]/)[0].replace(/\d+$/, '');
    return a ? a.charAt(0).toUpperCase() + a.slice(1) : '';
  },
  // Who the token belongs to, read from Drive itself (no extra scope).
  async whoFetch() {
    try {
      const r = await this.fetch(this.base() + '/drive/v3/about?fields=user(displayName,emailAddress)');
      const u = ((await r.json()) || {}).user || {};
      if (!u.emailAddress) return null;
      const w = { email: u.emailAddress, name: u.displayName || '' };
      try { localStorage.setItem(this.WHO, JSON.stringify(w)); } catch (e) {}
      return w;
    } catch (e) { return null; }
  },
  // ---- SILENT RENEWAL (api/gauth.py) ----
  // Where the site has the OAuth client secret, sign-in is the authorisation-code flow: the
  // server keeps a refresh token in an HttpOnly cookie and hands out a new access token on
  // request, so an expired hour renews with no popup and no click. KEPT marks a computer whose
  // cookie holds one (page scripts cannot see an HttpOnly cookie). Off the site — a file opened
  // from disk, a deployment without the secret — everything falls back to the token model.
  KEPT: 'provident-drive-srv',
  srvOn() {
    if (this._srv) return this._srv;
    if (!/^https?:$/.test(location.protocol)) return (this._srv = Promise.resolve(false));
    return (this._srv = fetch('/api/gauth?op=status', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null).then(d => !!(d && d.on)).catch(() => false));
  },
  kept() { try { return !!localStorage.getItem(this.KEPT); } catch (e) { return false; } },
  async gpost(op, body) {
    const r = await fetch('/api/gauth?op=' + op, { method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-Provident': '1' }, body: JSON.stringify(body || {}) });
    let d = {}; try { d = await r.json(); } catch (e) {}
    return { ok: r.ok, status: r.status, d };
  },
  took(at, sec) {
    this.tok = { at, exp: Date.now() + (Number(sec) || 3600) * 1000 };
    this.keep();
    try { window.dispatchEvent(new Event('provident-drive-signed')); } catch (e) {}
    return at;
  },
  // A new access token from the server's refresh token, with no popup. One at a time.
  renew() {
    if (this._renew) return this._renew;   // shared only while it is in flight
    const p = (async () => {
      try {
        if (!this.kept() || !(await this.srvOn())) return false;
        const r = await this.gpost('refresh');
        if (r.ok && r.d.access_token) { this.took(r.d.access_token, r.d.expires_in); return true; }
        if (r.status === 401) { try { localStorage.removeItem(this.KEPT); } catch (e) {} }
        return false;
      } catch (e) { return false; }
    })();
    this._renew = p;
    p.then(() => { if (this._renew === p) this._renew = null; });   // runs before any awaiting caller resumes
    return p;
  },
  // valid, or made valid without asking anyone
  async ensure() { return this.valid() || (await this.renew()); },
  // Renew in the background a few minutes before the hour is up, so a session never lapses
  // while someone is working.
  watch() {
    if (this._watch) return; this._watch = true;
    this.srvOn();
    if (this.valid() && !this.who()) this.whoFetch();   // a token with no remembered account
    setInterval(() => {
      if (!this.kept() || document.visibilityState !== 'visible') return;
      const t = this.tok || (() => { try { return JSON.parse(localStorage.getItem(this.TOK) || 'null'); } catch (e) { return null; } })();
      if (!t || t.exp - Date.now() < 5 * 60000) this.renew();
    }, 60000);
  },
  // The code flow's popup, then the server's exchange. First time on this computer it asks for
  // consent, which is what makes Google hand over a refresh token.
  codeIn(id, w) {
    return new Promise((res, rej) => {
      const cc = google.accounts.oauth2.initCodeClient({
        client_id: id, scope: this.SCOPE, ux_mode: 'popup',
        login_hint: w ? w.email : undefined, select_account: !w, prompt: this.kept() ? '' : 'consent',
        callback: async r => {
          if (!r || r.error || !r.code) return rej(new Error(r && r.error === 'access_denied' ? 'Google sign-in was cancelled.' : 'Google sign-in failed' + (r && r.error ? ' (' + r.error + ')' : '') + '.'));
          try {
            const x = await this.gpost('exchange', { code: r.code });
            if (!x.ok || !x.d.access_token) return rej(new Error(x.d.error || 'Google sign-in could not finish.'));
            if (x.d.kept) { try { localStorage.setItem(this.KEPT, '1'); } catch (e) {} }
            this.tok = { at: x.d.access_token, exp: Date.now() + (Number(x.d.expires_in) || 3600) * 1000 };
            this.keep();
            const done = () => { try { window.dispatchEvent(new Event('provident-drive-signed')); } catch (e) {} res(x.d.access_token); };
            (w ? Promise.resolve() : this.whoFetch()).then(done, done);
            if (w) this.whoFetch();
          } catch (e) { rej(new Error('Google sign-in could not finish — check the connection.')); }
        },
        error_callback: e => rej(new Error(e && e.type === 'popup_closed' ? 'Google sign-in was closed before it finished.' : 'Google sign-in could not open — allow pop-ups for this site.'))
      });
      cc.requestCode();
    });
  },
  // Must be called from a click: Google opens its sign-in popup — unless the server can renew.
  async signIn() {
    // a token from an earlier sign-in, before the account was remembered: learn the account
    // too, or a caller asking "who is this?" gets nothing and the sign-in looks like it failed
    if (this.valid() || (await this.renew())) { if (!this.who()) await this.whoFetch(); return this.tok.at; }
    const id = this.clientId();
    if (!id) throw new Error('Google Drive is not set up on this computer yet — paste the OAuth client ID your admin gave you.');
    await this.load();
    if (await this.srvOn()) return this.codeIn(id, this.who());
    return new Promise((res, rej) => {
      const w = this.who();
      const tc = google.accounts.oauth2.initTokenClient({
        // the remembered account goes straight through; a first sign-in picks one
        client_id: id, scope: this.SCOPE, prompt: w ? '' : 'select_account', login_hint: w ? w.email : undefined,
        callback: r => {
          if (!r || r.error || !r.access_token) return rej(new Error(r && r.error === 'access_denied' ? 'Google sign-in was cancelled.' : 'Google sign-in failed' + (r && r.error ? ' (' + r.error + ')' : '') + '.'));
          this.tok = { at: r.access_token, exp: Date.now() + (Number(r.expires_in) || 3600) * 1000 };
          this.keep();
          // learn the account (first sign-in, or another account picked) before saying signed in
          const done = () => { try { window.dispatchEvent(new Event('provident-drive-signed')); } catch (e) {} res(r.access_token); };
          const fresh = !w;
          (fresh ? this.whoFetch() : Promise.resolve()).then(done, done);
          if (!fresh) this.whoFetch();   // keeps a changed display name current, in the background
        },
        error_callback: e => rej(new Error(e && e.type === 'popup_closed' ? 'Google sign-in was closed before it finished.' : 'Google sign-in could not open — allow pop-ups for this site.'))
      });
      tc.requestAccessToken();
    });
  },
  // Forget the session AND the account, so the next sign-in shows Google's account chooser.
  signOut() {
    const t = this.tok; this.drop();
    try { localStorage.removeItem(this.WHO); } catch (e) {}
    if (this.kept()) { try { localStorage.removeItem(this.KEPT); } catch (e) {} this.gpost('signout').catch(() => {}); }
    try { if (t && window.google && google.accounts) google.accounts.oauth2.revoke(t.at, () => {}); } catch (e) {}
  },
  async fetch(url, opt) {
    const expired = () => { const e = new Error('Your Google sign-in has expired — sign in again.'); e.gdAuth = true; return e; };
    if (!this.valid() && !(await this.renew())) throw expired();
    if (!this.tok) throw expired();
    opt = Object.assign({}, opt || {}); opt.headers = Object.assign({ Authorization: 'Bearer ' + this.tok.at }, opt.headers || {});
    if (!opt.cache) opt.cache = 'no-store';   // a Drive read must never come from the browser's HTTP cache
    const r = await fetch(url, opt);
    if (r.status === 401) {
      // a token Google ended early: renew once and repeat the request
      this.drop();
      if (!opt._again && (await this.renew())) return this.fetch(url, Object.assign({}, opt, { _again: true, headers: Object.assign({}, opt.headers, { Authorization: 'Bearer ' + this.tok.at }) }));
      throw expired();
    }
    if (!r.ok) {
      let m = 'Google Drive answered ' + r.status;
      try { const d = await r.json(); if (d && d.error && d.error.message) m = d.error.message; } catch (e) {}
      if (r.status === 404) m = 'Drive cannot find that folder, or your account has no access to it.';
      throw new Error(m);
    }
    return r;
  },
  notFound() { const e = new Error('Not found'); e.name = 'NotFoundError'; return e; },
  // The folder id from any shape of Drive folder link, or a bare id.
  id(t) {
    t = String(t || '').trim();
    const m = /\/folders\/([\w-]{10,})/.exec(t) || /[?&]id=([\w-]{10,})/.exec(t);
    if (m) return m[1];
    return /^[\w-]{20,}$/.test(t) ? t : '';
  },
  // Resolves a folder link to {id, name}; throws a readable message for a file or no access.
  async folderOf(link) {
    const id = this.id(link);
    if (!id) throw new Error('That is not a Google Drive folder link. Open the folder in Drive and copy the address from the browser — it contains /folders/.');
    const r = await this.fetch(this.base() + '/drive/v3/files/' + id + '?fields=id,name,mimeType,shortcutDetails&supportsAllDrives=true');
    const f = await r.json(), sc = f.shortcutDetails;
    if (f.mimeType !== this.FOLDER && !(sc && sc.targetMimeType === this.FOLDER)) throw new Error('That link is a file, not a folder. Link the folder that holds the saved projects.');
    return { id: sc && sc.targetId ? sc.targetId : f.id, name: f.name };
  },
  // A Drive folder as a directory stand-in (kind, name, entries(), getDirectoryHandle(), a
  // file's getFile(), head(n) and `modified`), plus createWritable() — which uploads a new
  // revision of THAT file, so its id and share link never change. Listings are held for 3s.
  dir(id, name) {
    const D = this, api = D.base() + '/drive/v3/files', up = D.base() + '/upload/drive/v3/files';
    let kids = null, at = 0;
    const list = () => {
      if (kids && Date.now() - at < 3000) return kids;
      at = Date.now();
      return (kids = (async () => {
        const out = []; let tok = '';
        do {
          const q = encodeURIComponent("'" + id + "' in parents and trashed=false");
          const r = await D.fetch(api + '?q=' + q + '&fields=nextPageToken,files(id,name,mimeType,modifiedTime,size,shortcutDetails)&pageSize=1000'
            + '&supportsAllDrives=true&includeItemsFromAllDrives=true' + (tok ? '&pageToken=' + tok : ''));
          const d = await r.json();
          out.push(...(d.files || [])); tok = d.nextPageToken || '';
        } while (tok);
        return out;
      })().catch(e => { kids = null; throw e; }));
    };
    const isDir = f => f.mimeType === D.FOLDER || (f.shortcutDetails && f.shortcutDetails.targetMimeType === D.FOLDER);
    const node = f => {
      const sc = f.shortcutDetails;
      if (isDir(f)) return D.dir(sc ? sc.targetId : f.id, f.name);
      const fid = sc ? sc.targetId : f.id, lm = Date.parse(f.modifiedTime) || 0;
      return { kind: 'file', name: f.name, modified: lm, size: Number(f.size) || 0, drive: true,
        getFile: async () => {
          const r = await D.fetch(api + '/' + fid + '?alt=media&supportsAllDrives=true');
          const b = await r.blob();
          return new File([b], f.name, { type: b.type || f.mimeType || '', lastModified: lm });
        },
        head: async n => {
          const r = await D.fetch(api + '/' + fid + '?alt=media&supportsAllDrives=true', { headers: { Range: 'bytes=0-' + (n - 1) } });
          return r.text();
        },
        createWritable: async () => {
          const parts = [];
          return {
            write: async d => { parts.push(d && d.data !== undefined ? d.data : d); },
            close: async () => {
              const ext = (f.name.split('.').pop() || '').toLowerCase();
              const type = D.MIME[ext] || f.mimeType || 'application/octet-stream';
              await D.fetch(up + '/' + fid + '?uploadType=media&supportsAllDrives=true',
                { method: 'PATCH', headers: { 'Content-Type': type }, body: new Blob(parts, { type }) });
              kids = null;
            }
          };
        } };
    };
    return { kind: 'directory', name, drive: true,
      queryPermission: async () => D.valid() ? 'granted' : 'prompt',
      requestPermission: async () => { try { await D.signIn(); return 'granted'; } catch (e) { return 'denied'; } },
      async *entries() { for (const f of await list()) yield [f.name, node(f)]; },
      async getDirectoryHandle(n) { const f = (await list()).find(x => x.name === n && isDir(x)); if (!f) throw D.notFound(); return node(f); } };
  }
};
try { window.providentDrive.watch(); } catch (e) {}
