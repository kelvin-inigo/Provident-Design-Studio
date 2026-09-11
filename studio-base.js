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
  mctx() { if (!this._m) this._m = document.createElement('canvas').getContext('2d'); return this._m; }
  meas(text, px, weight, serif, ls) {
    const m = this.mctx();
    m.font = `${weight} ${px}px ${window.providentFont || '"Google Sans Flex", sans-serif'}`;
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
  async loadRecents() {
    let rec = null;
    const rt = window.providentRuntime;
    if (rt && rt.get) { try { const raw = await rt.get(this.recentsKey()); if (raw) rec = JSON.parse(raw); } catch (e) {} }
    if (!rec) {
      // one-time migration from whatever localStorage still holds
      try { rec = JSON.parse(localStorage.getItem(this.legacyRecentsKey())) || null; } catch (e) {}
      if (rec && rec.length) await this.writeRecents(rec);
    }
    this._recents = rec || [];
    this.forceUpdate();
  }
  async writeRecents(rec) {
    this._recents = rec;
    const rt = window.providentRuntime;
    if (rt && rt.set) {
      try { await rt.set(this.recentsKey(), JSON.stringify(rec)); return true; } catch (e) {}
    }
    // No IndexedDB: keep the metadata rather than lose the list entirely.
    try { localStorage.setItem(this.legacyRecentsKey(), JSON.stringify(rec)); return true; }
    catch (e) {
      try { localStorage.setItem(this.legacyRecentsKey(), JSON.stringify(rec.map(r => ({ name: r.name, ts: r.ts, state: r.state, thumbs: r.thumbs })))); } catch (e2) {}
      return false;
    }
  }

  // Open Session picks the FOLDER, not the file: a file handle gives no access to
  // its parent, so this is the only way to adopt the project folder at the same time
  // as loading the session. Falls back to a file input where there is no picker.
  async openSessionFolder() {
    const f = this.folderApi();
    if (!f || !f.supported) { this.setState({ exportStatus: 'This browser cannot open folders. Chrome or Edge can open a project folder directly.' }); return; }
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
  expPickVals(pdfOn) {
    const K = StudioBase.EXPKINDS, avail = K.filter(k => k !== 'pdf' || pdfOn);
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
  reloadNow(url) {
    StudioBase.reloading = true;
    this.markSaved();
    if (url) location.href = url;
    else location.reload();
  }
  markDirty() { this._dirty = true; }
  markSaved() { this._dirty = false; }
  // One line for the native prompt and the in-app confirms, so they can't diverge.
  unsavedMsg() { return 'This project has unsaved changes. Save it before leaving?'; }
  confirmDiscard() {
    if (!this.isDirty()) return true;
    return window.confirm(this.unsavedMsg() + '\n\nOK leaves without saving. Cancel goes back so you can Save.');
  }
  loadSessionFile(file) {
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
      try {
        localStorage.setItem(spec.key, JSON.stringify(Object.assign(d.state, { exportStatus: '' })));
        localStorage.setItem(spec.resume, '1');
      } catch (e) {
        fail('"' + label + '" could not be opened — the browser refused to store it (' + (e && e.name || e) + '). Free some space and try again.');
        return;
      }
      if (n) {
        // Merge: clear only the target studio's slots so loading a session
        // cannot wipe the other studio's photos out of the shared store.
        let sidecar = {};
        try { const r = await fetch('.image-slots.state.json', { cache: 'no-store' }); if (r.ok) sidecar = await r.json(); } catch (e) {}
        Object.keys(sidecar).forEach(k => { if (spec.prefix.test(k)) delete sidecar[k]; });
        Object.assign(sidecar, imgs);
        let stored = false;
        try { stored = !!(await Promise.resolve(window.omelette.writeFile('.image-slots.state.json', JSON.stringify(sidecar)))); }
        catch (e) { stored = false; }
        // This used to be `.catch(() => {})`: a rejected write meant the project
        // reloaded with every photo missing and no hint as to why.
        if (!stored) {
          try {
            localStorage.setItem(spec.notice, 'Opened "' + label + '" but its ' + n + ' photo' +
              (n === 1 ? '' : 's') + ' could not be stored — the browser is out of space. Clear some recent projects, then load it again.');
          } catch (e2) {}
        }
      }
      // A file for the other studio is a hand-over, not an error. Its keys are
      // written above; all that is left is to open the document that reads them.
      // Same-studio files reload in place, exactly as before.
      this.reloadNow(spec === mine ? '' : spec.file);
    };
    try { rd.readAsText(file); }
    catch (e) { fail('Could not read "' + label + '" — ' + (e && e.message || e)); }
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
  // Write a set of files into the project folder. Names may contain one folder
  // segment ("Assets/qr.png"). Always reports what it is about to replace.
  async writeProject(files) {
    const f = this.folderApi();
    if (!f || !f.handle) return false;
    const clash = [];
    for (const fl of files) { if (await f.exists(fl.name)) clash.push(fl.name); }
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
  // Renders go to the folder root when there is one, otherwise a zip download.
  async deliver(files, name) {
    const f = this.folderApi();
    const h = await this.folderOpen(false);
    if (h) {
      const all = files.concat(await this.projectFiles(name));
      const ok = await this.writeProject(all);
      if (ok) this.setState({ exportStatus: 'Exported ' + files.length + ' file' + (files.length === 1 ? '' : 's') + ' into "' + f.name + '" · session + Assets refreshed' });
      return ok;
    }
    const blob = this.zip(files);
    // No project folder set, so ask where this should go rather than silently dropping it
    // in Downloads. A cancelled dialog leaves the project untouched and says so.
    const how = await this.saveAs(blob, name + '.zip', 'Zip archive', 'application/zip', '.zip');
    if (how === 'cancelled') { this.setState({ exportStatus: 'Export cancelled — nothing was saved.' }); return false; }
    this.setState({ exportStatus: 'Exported ' + files.length + ' files → ' + name + '.zip · ' +
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
