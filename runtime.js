// Provident Design Studio — browser runtime support.
//
// Must be a parser-inserted script in <head>, BEFORE support.js: the helmet
// mounts its <script src> tags with createElement, which leaves them async, so
// image-slot.js can execute at any time. Everything here has to already exist
// when it does.
//
// Four jobs:
//
//   1. Storage. image-slot.js gates ALL editing — upload, Replace, double-click
//      reframe — on window.omelette.writeFile, which only the Design Cursor
//      runtime provides. In a plain browser every slot is read-only. We install
//      an IndexedDB-backed stand-in and teach fetch() to read it back, so the
//      studio is fully editable in Chrome and Safari and unchanged inside
//      Design Cursor (where this whole block no-ops).
//
//   2. Capability detection + fallbacks. Safari silently fails at three things
//      the export path depends on, and every call site sits in a try/catch that
//      swallows it — so exports would quietly stop matching the canvas.
//
//   3. One image encoder. A single export-grade copy per image, in the smallest
//      format the browser can actually write.
//
//   4. Background removal, when the local rembg service is running. A capability
//      the document opts into per slot, never a requirement — see section 4.

(function () {
  'use strict';

  var W = window;

  // ── 1. Capabilities ───────────────────────────────────────────────────────
  var probe = document.createElement('canvas');
  probe.width = probe.height = 1;
  var pctx = probe.getContext('2d');

  var caps = {
    // Safari < 16.4 returns a PNG data URL instead — detect, don't assume.
    webp: (function () {
      try { return probe.toDataURL('image/webp').indexOf('data:image/webp') === 0; }
      catch (e) { return false; }
    })(),
    // Chrome-only. Safari drops tracking silently, so tracked caps (eyebrows,
    // the wordmark, spec labels) would export narrower than they render.
    letterSpacing: (function () {
      try { pctx.letterSpacing = '10px'; return pctx.letterSpacing === '10px'; }
      catch (e) { return false; }
    })(),
    roundRect: typeof pctx.roundRect === 'function',
    idb: !!W.indexedDB
  };
  W.providentCaps = caps;

  // Safari < 16.4: every pill, chip, glass card and QR clip goes through
  // roundRect. Without this the whole export throws.
  if (!caps.roundRect && W.CanvasRenderingContext2D) {
    W.CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      var v = Array.isArray(r) ? r : [r || 0];
      var tl = v[0] || 0, tr = v.length > 1 ? v[1] : tl;
      var br = v.length > 2 ? v[2] : tl, bl = v.length > 3 ? v[3] : tr;
      var max = Math.min(Math.abs(w), Math.abs(h)) / 2;
      tl = Math.min(tl, max); tr = Math.min(tr, max);
      br = Math.min(br, max); bl = Math.min(bl, max);
      this.moveTo(x + tl, y);
      this.lineTo(x + w - tr, y);
      this.arcTo(x + w, y, x + w, y + tr, tr);
      this.lineTo(x + w, y + h - br);
      this.arcTo(x + w, y + h, x + w - br, y + h, br);
      this.lineTo(x + bl, y + h);
      this.arcTo(x, y + h, x, y + h - bl, bl);
      this.lineTo(x, y + tl);
      this.arcTo(x, y, x + tl, y, tl);
      this.closePath();
    };
  }

  // ---- ONE font string for measuring, previewing and exporting ---------------
  // Google Sans Flex is a variable font with an optical-size axis, so its glyphs are
  // ~6% wider per em at 37px than at 92px. Every path that lays out or draws the design
  // has to name the font identically AND be handed the same pixel size, or the preview
  // and the export shape differently. The size half of that is handled by laying the
  // preview box out at true canvas units (see canvasStyle in both engines); this is the
  // name half. Don't inline the family anywhere in a measure or render path.
  W.providentFontFam = 'Google Sans Flex';
  W.providentFont = '"Google Sans Flex", sans-serif';

  // Tracked text that renders identically everywhere. Advances per character by
  // measureText + ls, which is exactly how meas() computes the width the layout
  // engine already reserved — so wrapping and centring stay in agreement.
  W.providentFillText = function (ctx, text, x, y, ls) {
    text = String(text == null ? '' : text);
    if (!ls) { ctx.fillText(text, x, y); return; }
    if (caps.letterSpacing) {
      try {
        ctx.letterSpacing = ls + 'px';
        ctx.fillText(text, x, y);
        ctx.letterSpacing = '0px';
        return;
      } catch (e) { /* fall through to manual */ }
    }
    var cx = x;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      ctx.fillText(ch, cx, y);
      cx += ctx.measureText(ch).width + ls;
    }
  };

  // ── 2. One image encoder ──────────────────────────────────────────────────
  // A single export-grade copy per image, shared by canvas and export, so the
  // two can't disagree. 3840px is 2x the longest canvas edge (16:9 at
  // 3840x2160), so no export ever upscales its source.
  var CAP_LONG = 3840;
  var BUDGET = 2500000; // ~2.5MB before we start trading quality for size

  W.providentEncodeCanvas = function (canvas, opts) {
    opts = opts || {};
    var alpha = !!opts.alpha;
    // Alpha rules out the lossy formats we'd otherwise prefer: cutout overlays,
    // QR codes and logos need their transparency intact.
    if (alpha) {
      if (caps.webp) {
        var w1 = canvas.toDataURL('image/webp', 0.95);
        var p1 = canvas.toDataURL('image/png');
        return w1.length < p1.length ? w1 : p1;
      }
      return canvas.toDataURL('image/png');
    }
    var type = caps.webp ? 'image/webp' : 'image/jpeg';
    var ladder = caps.webp ? [0.9, 0.86, 0.82, 0.78] : [0.92, 0.88, 0.84, 0.8];
    var out = '';
    for (var i = 0; i < ladder.length; i++) {
      out = canvas.toDataURL(type, ladder[i]);
      if (out.length * 0.75 <= BUDGET) return out;
    }
    return out;
  };

  // A PASSED-THROUGH ORIGINAL KEEPS NO METADATA. The pass-through below keeps a small file's
  // bytes exactly — and it used to keep its EXIF with them, GPS included. The iOS photo picker
  // hands a photo over with "Location Included" by default, and its Large size lands under the
  // cap, so where a headshot was taken travelled into the photo store, every session file, the
  // Assets folder and the recents. (A render is drawn through a canvas and never carried it.)
  //
  // Only the segments that carry metadata go; every byte of the picture stays, so this is still
  // the byte-exact copy the pass-through exists for. JPEG loses APP1 (EXIF, XMP), APP13 (IPTC)
  // and COM, and keeps APP0, the ICC profile in APP2 and APP14, which the decoder needs. PNG
  // loses its text chunks. A file whose metadata changes how it DRAWS — an EXIF rotation, which
  // the browser applies — returns null and is re-encoded instead, which bakes the rotation in.
  // So does anything malformed and any other format. Returns a Blob, or null.
  function u8cat(parts) {
    var n = 0, i, o;
    for (i = 0; i < parts.length; i++) n += parts[i].length;
    var out = new Uint8Array(n);
    for (i = 0, o = 0; i < parts.length; i++) { out.set(parts[i], o); o += parts[i].length; }
    return out;
  }
  function exifOrientation(seg) {           // seg: a whole APP1 segment, marker included
    var t = 10;                              // FF E1, length, "Exif\0\0", then the TIFF header
    if (seg.length < t + 8 || seg[4] !== 0x45 || seg[5] !== 0x78 || seg[6] !== 0x69 || seg[7] !== 0x66) return 0;
    var le = seg[t] === 0x49;
    var u16 = function (p) { return le ? seg[p] | (seg[p + 1] << 8) : (seg[p] << 8) | seg[p + 1]; };
    var u32 = function (p) { return le ? (seg[p] | (seg[p + 1] << 8) | (seg[p + 2] << 16)) + seg[p + 3] * 16777216
                                       : ((seg[p + 1] << 16) | (seg[p + 2] << 8) | seg[p + 3]) + seg[p] * 16777216; };
    var ifd = t + u32(t + 4);
    if (ifd + 2 > seg.length) return 0;
    for (var k = 0, n = u16(ifd); k < n; k++) {
      var e = ifd + 2 + k * 12;
      if (e + 12 > seg.length) return 0;
      if (u16(e) === 0x0112) return u16(e + 8);
    }
    return 0;
  }
  // Entropy-coded bytes run until a real marker: FF followed by anything but 00 (stuffing),
  // FF (fill) or D0–D7 (restarts). A segment's own payload may hold FF D9, so the file is
  // WALKED, never searched.
  function scanEnd(u8, p) {
    for (var n = u8.length; p + 1 < n; p++) {
      if (u8[p] !== 0xFF) continue;
      var b = u8[p + 1];
      if (b !== 0x00 && b !== 0xFF && !(b >= 0xD0 && b <= 0xD7)) return p;
    }
    return -1;
  }
  // The main image ends at its EOI and nothing after it is kept: an iPhone JPEG can carry
  // SECONDARY images there (an HDR gain map, by MPF) with metadata of their own, and the
  // canvas, which is all the studio draws with, never reads them.
  function jpegClean(u8) {
    if (u8[0] !== 0xFF || u8[1] !== 0xD8) return null;
    var out = [u8.subarray(0, 2)], i = 2, n = u8.length, scanned = false;
    while (i + 2 <= n) {
      if (u8[i] !== 0xFF) return null;
      var m = u8[i + 1];
      if (m === 0xFF) { i++; continue; }                          // fill byte
      if (m === 0xD9) {                                            // EOI: the end of the picture
        if (!scanned) return null;
        out.push(u8.subarray(i, i + 2));
        return u8cat(out);
      }
      if (m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { out.push(u8.subarray(i, i + 2)); i += 2; continue; }
      if (i + 4 > n) return null;
      var len = (u8[i + 2] << 8) | u8[i + 3];
      if (len < 2 || i + 2 + len > n) return null;
      var seg = u8.subarray(i, i + 2 + len);
      i += 2 + len;
      if (m === 0xDA) {                                            // a scan: header, then its data
        var e = scanEnd(u8, i);
        if (e < 0) return null;
        out.push(seg, u8.subarray(i, e));
        i = e; scanned = true;
        continue;
      }
      if (m === 0xE1) { if (exifOrientation(seg) > 1) return null; }  // dropped, unless it rotates
      else if (m !== 0xED && m !== 0xFE) out.push(seg);                // APP13, COM: dropped
    }
    return null;                                                     // no EOI: malformed
  }
  function pngClean(u8) {
    var sig = [137, 80, 78, 71, 13, 10, 26, 10];
    for (var k = 0; k < 8; k++) if (u8[k] !== sig[k]) return null;
    var out = [u8.subarray(0, 8)], i = 8, n = u8.length;
    while (i + 12 <= n) {
      var len = u8[i] * 16777216 + ((u8[i + 1] << 16) | (u8[i + 2] << 8) | u8[i + 3]);
      var type = String.fromCharCode(u8[i + 4], u8[i + 5], u8[i + 6], u8[i + 7]);
      var end = i + 12 + len;
      if (end > n) return null;
      if (type === 'eXIf') return null;                              // it can rotate too
      if (type !== 'tEXt' && type !== 'zTXt' && type !== 'iTXt') out.push(u8.subarray(i, end));
      i = end;
      if (type === 'IEND') return u8cat(out);
    }
    return null;
  }
  function hasBytes(u8, s) {
    var c0 = s.charCodeAt(0), n = u8.length - s.length;
    for (var i = 0; i <= n; i++) {
      if (u8[i] !== c0) continue;
      for (var k = 1; k < s.length && u8[i + k] === s.charCodeAt(k); k++);
      if (k === s.length) return true;
    }
    return false;
  }
  W.providentStripMeta = async function (file) {
    var u8 = new Uint8Array(await file.arrayBuffer());
    // By MAGIC, never by MIME: a file dragged out of Finder often arrives with an empty type,
    // and a PNG misread as "not a PNG" would be re-encoded opaque and lose its transparency.
    var jpg = u8[0] === 0xFF && u8[1] === 0xD8;
    var png = u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4E && u8[3] === 0x47;
    if (jpg || png) {
      var out = jpg ? jpegClean(u8) : pngClean(u8);
      return out ? new Blob([out], { type: jpg ? 'image/jpeg' : 'image/png' }) : null;
    }
    // WebP and AVIF are not cleaned in place: they pass through as they always did while they
    // carry no EXIF or XMP (WebP's `EXIF` chunk, AVIF's `Exif` item, XMP's packet), and are
    // re-encoded when they do. A false positive only costs a re-encode.
    return (hasBytes(u8, 'EXIF') || hasBytes(u8, 'Exif') || hasBytes(u8, 'xmpmeta')) ? null : file;
  };

  // file -> export-grade data URL. Downscales only when the source exceeds the
  // cap; never upscales, never re-encodes something already small enough.
  W.providentEncodeFile = async function (file) {
    var alpha = /png|gif|svg|webp/i.test(file.type || '');
    if (/svg/i.test(file.type || '') || /\.svg$/i.test(file.name || '')) {
      var txt = W.providentSizeSvg(await file.text());
      return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(txt)));
    }
    var bmp = await createImageBitmap(file);
    try {
      var long = Math.max(bmp.width, bmp.height);
      // Small originals that are already lean pass through untouched — the
      // bytes on the canvas are then literally the bytes the user handed us.
      if (long <= CAP_LONG && file.size <= BUDGET) {
        var clean = await W.providentStripMeta(file);
        if (clean) {
          return await new Promise(function (res, rej) {
            var rd = new FileReader();
            rd.onload = function () { res(rd.result); };
            rd.onerror = function () { rej(rd.error); };
            rd.readAsDataURL(clean);
          });
        }
        // null: metadata that changes how the file DRAWS, or a format this cannot clean —
        // re-encoded below, which bakes the rotation in and carries no metadata at all
      }
      var k = Math.min(1, CAP_LONG / long);
      var cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(bmp.width * k));
      cv.height = Math.max(1, Math.round(bmp.height * k));
      var cx = cv.getContext('2d');
      cx.imageSmoothingEnabled = true;
      try { cx.imageSmoothingQuality = 'high'; } catch (e) {}
      cx.drawImage(bmp, 0, 0, cv.width, cv.height);
      return W.providentEncodeCanvas(cv, { alpha: alpha });
    } finally {
      if (bmp.close) bmp.close();
    }
  };

  // An SVG with only a viewBox has no intrinsic size: naturalWidth reads 0, and the
  // export then scales it from a fallback of 1px. Derive width/height from the
  // viewBox so every consumer gets real dimensions.
  W.providentSizeSvg = function (src) {
    var s = String(src);
    var open = s.match(/<svg\b[^>]*>/i);
    if (!open) return s;
    var tag = open[0];
    var hasW = /\swidth\s*=/i.test(tag), hasH = /\sheight\s*=/i.test(tag);
    if (hasW && hasH) return s;
    var vb = tag.match(/viewBox\s*=\s*["']\s*[-\d.eE]+[\s,]+[-\d.eE]+[\s,]+([-\d.eE]+)[\s,]+([-\d.eE]+)/i);
    if (!vb) return s;
    var w = parseFloat(vb[1]), h = parseFloat(vb[2]);
    if (!(w > 0 && h > 0)) return s;
    var add = (hasW ? '' : ' width="' + w + '"') + (hasH ? '' : ' height="' + h + '"');
    return s.replace(tag, tag.replace(/^<svg/i, '<svg' + add));
  };

  // ── 3. IndexedDB helpers ──────────────────────────────────────────────────
  // Defined before the storage shim's early returns so the project-folder module
  // below is available in every mode, Design Cursor included.
  var DB = 'provident-design-studio', STORE = 'files', VER = 1;
  var dbP = null;
  function db() {
    if (!dbP) {
      dbP = new Promise(function (res, rej) {
        var q = W.indexedDB.open(DB, VER);
        q.onupgradeneeded = function () {
          if (!q.result.objectStoreNames.contains(STORE)) q.result.createObjectStore(STORE);
        };
        q.onsuccess = function () { res(q.result); };
        q.onerror = function () { rej(q.error); };
      });
    }
    return dbP;
  }
  function idbGet(key) {
    if (!caps.idb) return Promise.resolve(undefined);
    return db().then(function (d) {
      return new Promise(function (res) {
        var r = d.transaction(STORE).objectStore(STORE).get(key);
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { res(undefined); };
      });
    }).catch(function () { return undefined; });
  }
  function idbSet(key, val) {
    if (!caps.idb) return Promise.reject(new Error('no indexeddb'));
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var tr = d.transaction(STORE, 'readwrite');
        tr.objectStore(STORE).put(val, key);
        // Resolve on transaction completion, not request success: callers reload
        // the page straight after writeFile and the write must have landed.
        tr.oncomplete = function () { res(true); };
        tr.onerror = function () { rej(tr.error); };
        tr.onabort = function () { rej(tr.error); };
      });
    });
  }
  function idbDel(key) {
    if (!caps.idb) return Promise.resolve(false);
    return db().then(function (d) {
      return new Promise(function (res) {
        var tr = d.transaction(STORE, 'readwrite');
        tr.objectStore(STORE)['delete'](key);
        tr.oncomplete = function () { res(true); };
        tr.onerror = function () { res(false); };
      });
    }).catch(function () { return false; });
  }
  function idbKeys() {
    if (!caps.idb) return Promise.resolve([]);
    return db().then(function (d) {
      return new Promise(function (res) {
        var r = d.transaction(STORE).objectStore(STORE).getAllKeys();
        r.onsuccess = function () { res(r.result || []); };
        r.onerror = function () { res([]); };
      });
    }).catch(function () { return []; });
  }

  // ── 4. Project folder (File System Access API — Chrome / Edge only) ───────
  // The studio saves its session, its source assets and its renders into one
  // folder the user picks once. The handle is kept in IndexedDB, so later saves
  // overwrite in place instead of prompting again. Safari has no equivalent
  // picker, so `supported` is false there and callers fall back to downloads.
  var FKEY = 'project-dir';
  var folder = {
    supported: typeof W.showDirectoryPicker === 'function',
    handle: null,
    pending: null,        // restored handle still needing a user gesture
    askBeforeOverwrite: true,
    get name() { return folder.handle ? folder.handle.name : (folder.pending ? folder.pending.name : ''); },
    // Open WHERE the user expects: inside the folder already in use if there is one, and
    // in Documents otherwise, rather than wherever the browser last happened to be.
    // `id` must NOT be sent on the Documents path — a remembered path for an id WINS over
    // `startIn`, so once any folder had been picked the picker would reopen there forever
    // and never honour Documents. `startIn` takes a handle or a well-known name; a browser
    // that rejects either still has to show a picker, so the call is retried bare.
    async pick() {
      if (!folder.supported) return null;
      var cur = folder.handle || folder.pending;
      var opts = cur
        ? { mode: 'readwrite', id: 'provident-studio', startIn: cur }
        : { mode: 'readwrite', startIn: 'documents' };
      var h = null;
      try { h = await W.showDirectoryPicker(opts); }
      catch (e) {
        if (e && e.name === 'AbortError') throw e;      // the user dismissed it
        h = await W.showDirectoryPicker({ mode: 'readwrite' });
      }
      folder.handle = h; folder.pending = null;
      try { await idbSet(FKEY, h); } catch (e) {}
      return h;
    },
    async forget() { folder.handle = null; folder.pending = null; try { await idbDel(FKEY); } catch (e) {} },
    // Load the saved handle. Returns it only when permission is already granted;
    // otherwise it is parked on `pending` for ensure() to re-request.
    async restore() {
      if (!folder.supported || folder.handle) return folder.handle;
      var h = await idbGet(FKEY);
      if (!h) return null;
      var p = 'prompt';
      try { p = await h.queryPermission({ mode: 'readwrite' }); } catch (e) { p = 'denied'; }
      if (p === 'granted') { folder.handle = h; return h; }
      folder.pending = h;
      return null;
    },
    // Call from a click: re-grants a parked handle, or returns null so the caller
    // can offer the picker.
    async ensure() {
      if (folder.handle) return folder.handle;
      var h = folder.pending || await idbGet(FKEY);
      if (!h) return null;
      var p = 'denied';
      try { p = await h.requestPermission({ mode: 'readwrite' }); } catch (e) {}
      if (p === 'granted') { folder.handle = h; folder.pending = null; return h; }
      return null;
    },
    async dirFor(path, create) {
      var h = folder.handle;
      if (!h) return null;
      var parts = String(path).split('/');
      parts.pop();
      for (var i = 0; i < parts.length; i++) {
        if (!parts[i]) continue;
        h = await h.getDirectoryHandle(parts[i], { create: create !== false });
      }
      return h;
    },
    async exists(path) {
      try {
        var d = await folder.dirFor(path, false);
        if (!d) return false;
        await d.getFileHandle(String(path).split('/').pop());
        return true;
      } catch (e) { return false; }
    },
    async write(path, data) {
      var d = await folder.dirFor(path, true);
      if (!d) throw new Error('No project folder');
      var fh = await d.getFileHandle(String(path).split('/').pop(), { create: true });
      var ws = await fh.createWritable();
      try { await ws.write(data); } finally { await ws.close(); }
      return true;
    }
  };
  W.providentFolder = folder;
  folder.restore();

  // ── 4. Background removal, through a local service ────────────────────────
  // Agent photos on the Organic templates are CUT-OUTS: the ranking card stands
  // the portrait above its own ground, texture and numeral, so a rectangular
  // photo covers all three. Asking a non-designer to supply a transparent PNG is
  // the single biggest thing the guided run cannot do for them.
  //
  // The model that does it is ~1.1GB and needs an ONNX runtime, so it cannot
  // live in a single-file document that opens off the disk with no build step.
  // It runs as a loopback service instead — tools/rembg/serve.sh — and this is
  // the whole of the studio's side of that contract:
  //
  //   * If the service is up, an agent photo is cut out on its way into the
  //     store, and nothing downstream knows the difference: what lands in
  //     providentEncodeFile is an ordinary PNG with alpha.
  //   * If it is not, the upload behaves exactly as it always did. This is a
  //     CAPABILITY, never a requirement — the studio must keep working offline
  //     with nothing installed, which is the reason it is a single file.
  //
  // WHICH slots get cut out is not decided here. The document marks them with
  // `data-cutout` and image-slot.js reads it, so the runtime stays a provider
  // and Campaign — which mounts no such slot — is untouched.
  var CUT_URL = 'http://127.0.0.1:7311';
  try {
    var over = W.localStorage && W.localStorage.getItem('provident-cutout-url');
    if (over) CUT_URL = String(over).replace(/\/+$/, '');
  } catch (e) {}

  // A probe is one request per 15s at most: the rail asks on every render, and
  // a dead port would otherwise mean a connection refused per keystroke.
  var cutAt = 0, cutPending = null;
  var CUT_TTL = 15000;

  function withTimeout(ms) {
    // AbortController rather than Promise.race: a racing timeout leaves the
    // request running, and a 12s inference held open per keystroke would queue
    // behind the lock in the server and make every later upload slower.
    var c = new AbortController();
    var t = setTimeout(function () { c.abort(); }, ms);
    return { signal: c.signal, done: function () { clearTimeout(t); } };
  }

  var cutout = {
    // 'unknown' until the first probe answers — the UI says nothing rather than
    // claiming the feature is missing while it is still being looked for.
    state: 'unknown',
    url: CUT_URL,
    info: null,

    probe: function (force) {
      var now = Date.now();
      if (!force && cutPending && now - cutAt < CUT_TTL) return cutPending;
      cutAt = now;
      var to = withTimeout(2500);
      cutPending = fetch(CUT_URL + '/health', { signal: to.signal, cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          to.done();
          var on = !!(j && j.ok);
          cutout.info = j;
          setState(on ? 'on' : 'off');
          return on;
        })
        .catch(function () { to.done(); setState('off'); return false; });
      return cutPending;
    },

    // file -> File (PNG with alpha). Throws Error(message) with something a
    // person can act on; the caller keeps the original on failure.
    run: function (file) {
      var to = withTimeout(180000); // a cold first request can be slow
      return fetch(CUT_URL + '/cutout', {
        method: 'POST', body: file, signal: to.signal, cache: 'no-store'
      }).then(function (r) {
        if (r.ok) return r.blob().then(function (b) {
          return { blob: b, note: r.headers.get('X-Cutout') || 'cutout' };
        });
        return r.json().catch(function () { return {}; }).then(function (j) {
          throw new Error(j.error || ('Background removal failed (' + r.status + ').'));
        });
      }).then(function (o) {
        to.done();
        setState('on');
        var name = String(file.name || 'photo').replace(/\.[^.]+$/, '');
        return new File([o.blob], name + '-cutout.png', { type: 'image/png' });
      }, function (e) {
        to.done();
        if (e && e.name === 'AbortError') throw new Error('Background removal timed out.');
        // A refused connection is the service being off, not a broken upload —
        // re-probe so the UI stops offering it.
        if (e instanceof TypeError) { setState('off'); throw new Error('OFFLINE'); }
        throw e;
      });
    }
  };

  function setState(s) {
    if (cutout.state === s) return;
    cutout.state = s;
    try {
      document.dispatchEvent(new CustomEvent('provident-cutout', { detail: { state: s } }));
    } catch (e) {}
  }

  // A NATIVE SHELL BRINGS ITS OWN. The iOS app (ios/) injects `providentNativeCutout` before
  // this file runs — the same contract (state, probe, run), with Apple's Vision subject lifting
  // underneath instead of a loopback service a phone does not have. A browser never has one.
  W.providentCutout = W.providentNativeCutout || cutout;

  // ── 5. Storage stand-in ───────────────────────────────────────────────────
  // Inside Design Cursor the real thing already exists — leave it alone.
  if (W.omelette && W.omelette.writeFile) {
    W.providentRuntime = { mode: 'omelette', caps: caps, folder: folder };
    return;
  }
  if (!caps.idb) {
    W.providentRuntime = { mode: 'readonly', caps: caps, folder: folder };
    return;
  }

  // Safari evicts IndexedDB from sites it considers idle. Asking marks the
  // origin as worth keeping; it's best-effort and silent if refused.
  try {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
  } catch (e) {}

  // In-memory mirror so the patched fetch can answer without waiting on IDB
  // once a path has been touched this session.
  var mirror = Object.create(null);

  W.omelette = W.omelette || {};
  W.omelette.writeFile = function (path, text) {
    var key = base(path);
    mirror[key] = String(text);
    return idbSet(key, mirror[key]);
  };

  function base(p) {
    var s = String(p || '');
    try { s = decodeURIComponent(s); } catch (e) {}
    s = s.split('?')[0].split('#')[0];
    var parts = s.split('/');
    return parts[parts.length - 1] || s;
  }

  var realFetch = W.fetch ? W.fetch.bind(W) : null;
  if (realFetch) {
    W.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var key = base(url);
      // Only ever intercept paths the app has actually asked us to store.
      if (key !== '.image-slots.state.json') return realFetch(input, init);
      var served = function (body) {
        return new Response(body, {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };
      if (mirror[key] != null) return Promise.resolve(served(mirror[key]));
      return idbGet(key).then(function (stored) {
        if (stored != null) { mirror[key] = stored; return served(stored); }
        // Nothing stored yet: seed from the file shipped alongside the studio,
        // so photos saved in Design Cursor still show up on first open here.
        return realFetch(input, init).then(function (r) {
          if (!r.ok) return served('{}');
          return r.text().then(function (t) {
            mirror[key] = t;
            idbSet(key, t).catch(function () {});
            return served(t);
          });
        }).catch(function () { return served('{}'); });
      });
    };
  }

  W.providentRuntime = {
    mode: 'indexeddb',
    caps: caps,
    folder: folder,
    get: idbGet,
    set: idbSet,
    del: idbDel,
    keys: idbKeys,
    // Bytes currently held, so the UI can warn before a quota failure.
    usage: function () {
      try {
        if (navigator.storage && navigator.storage.estimate) return navigator.storage.estimate();
      } catch (e) {}
      return Promise.resolve(null);
    }
  };
})();
