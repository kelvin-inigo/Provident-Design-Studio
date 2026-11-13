/* Provident Video Studio — PROTOTYPE (branch video-studio, local only).
   A small timeline editor: a magnetic Video track that is cut and trimmed, free Music and
   Sound tracks, a Text track whose overlays follow OPS's Reel thumbnail type (headline scale on
   the minor third, tracked-caps eyebrow, a wash under the copy only), a Logos track, and the
   CAS co-brand lockup: provident. | partner, laid out with StudioBase.CO's ratios from the
   partner mark's INK box.

   Canvas and chrome are separate systems here too: everything painted on the canvas reads ART;
   the chrome reads the kit's --ps-* tokens. */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const IC = window.providentVideoIcons || {};
  const ico = n => '<i class="vs-i"><svg viewBox="0 -960 960 960" aria-hidden="true"><path d="' + (IC[n] || '') + '"/></svg></i>';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const ease = p => 1 - Math.pow(1 - clamp(p, 0, 1), 3);

  // ── ARTWORK constants (never a chrome token) ─────────────────────────────────────────
  const ART = {
    ink: '#FFFFFF', navy: '#1A2942', brass: '#B0905C', ground: '#0A0B0D', wash: '26,41,66',   // the wash is the brand navy
    font: "'Google Sans Flex', system-ui, sans-serif",
    logoPx: 41, logoTrack: .04,               // the wordmark, as on the Reel thumbnail
    headTrack: -.046, headLead: 158 / 168,    // RCV.headTrack / RCV.headLead
    sizes: { Small: 140 / 1.2, Medium: 140, Large: 168, Jumbo: 168 * 1.2 },
    order: ['Small', 'Medium', 'Large', 'Jumbo'],
    eyebrow: 28.8, sub: 41.5,                 // steps of the x1.2 scale from the 24px floor
    maxBlock: .42                             // copy covers at most ~40% of the canvas
  };
  // StudioBase.CO — the co-brand lockup as multiples of the wordmark size
  const CO = { gap: .52, rule: .055, ruleH: 1.02, h: .78, maxW: .42, cy: .30 };
  // margins: 9:16 is the Reels safe area (100 / 260 / 100 / 460); 1:1 is 80 all round
  const SIZES = {
    '9x16': { w: 1080, h: 1920, t: 260, r: 100, b: 460, l: 100, k: 1, name: 'Reel 9:16' },
    '1x1': { w: 1080, h: 1080, t: 80, r: 80, b: 80, l: 80, k: .62, name: 'Square 1:1' }
  };
  const TRACKS = [
    { id: 'text', name: 'Text', icon: 'title' },
    { id: 'logo', name: 'Graphics', icon: 'image' },
    { id: 'clip', name: 'Video', icon: 'movie' },
    { id: 'music', name: 'Music', icon: 'music_note' },
    { id: 'sfx', name: 'Sound', icon: 'graphic_eq' }
  ];
  // Camera moves for turning a photo into video (Higgsfield Cinema Studio). The move is a phrase
  // in the prompt; the studio writes the WHOLE prompt, so the skill that runs it decides nothing.
  const MOVES = [
    ['push_in', 'Push in', 'slow, steady dolly push-in toward the centre of the frame'],
    ['pull_back', 'Pull back', 'slow, steady dolly pull-back that reveals more of the space'],
    ['pan_left', 'Pan left', 'smooth, slow camera pan to the left'],
    ['pan_right', 'Pan right', 'smooth, slow camera pan to the right'],
    ['tilt_up', 'Tilt up', 'smooth, slow camera tilt upward'],
    ['tilt_down', 'Tilt down', 'smooth, slow camera tilt downward'],
    ['crane_up', 'Crane up', 'crane shot rising smoothly straight up'],
    ['orbit', 'Orbit', 'slow orbit, the camera arcing gently to the right around the subject'],
    ['slide', 'Slide', 'slow lateral tracking move to the right, parallel to the subject'],
    ['hold', 'Hold', 'locked-off camera with no camera movement']
  ];
  const MOVE_BASE = 'Photorealistic real estate footage from this exact photograph. Camera: {move}. Keep the architecture, layout, furniture, materials and proportions exactly as in the image. Do not add people, objects, text or logos, and do not warp or morph anything. Only gentle natural motion: light, foliage, water, curtains. Stable, smooth, cinematic, no cuts.';
  const ANIMS = [['none', 'None'], ['fade', 'Fade'], ['rise', 'Rise'], ['lines', 'Line by line'], ['words', 'Word by word']];
  const LBL = 92;

  // ── state ────────────────────────────────────────────────────────────────────────────
  const PKEY = 'provident-video-project', LKEY = 'provident-video-dev-logos', TKEY = 'provident-video-theme';
  function fresh() {
    return {
      v: 1, size: '9x16', clips: [], audio: [], texts: [], logos: [],
      brand: { on: true, align: 'left', vpos: 'top', scale: 100, wash: 40, partner: null, pScale: 100, tint: 'match', ink: 'white' }
    };
  }
  let P = fresh();
  try { const s = JSON.parse(localStorage.getItem(PKEY) || 'null'); if (s && s.v === 1) { P = Object.assign(fresh(), s); P.brand = Object.assign(fresh().brand, s.brand); } } catch (e) {}
  if (!SIZES[P.size]) P.size = '9x16';
  const media = {};                 // id -> { id, kind, name, url, dur, w, h, poster, peaks }
  let sel = null;                   // { kind: 'clip'|'audio'|'text'|'logo', id }
  let T = 0, playing = false, exporting = false, dirty = true;
  let pps = 60, tab = 'media';
  const undo = [], redo = [];
  const vel = {}, ael = {}, imgs = {};
  let actx = null, master = null;
  const stats = { seeked: 0 };       // for measuring scrub rate from the console
  const hits = {};                  // id -> { kind, x, y, w, h } of what was last painted

  const cv = $('#cv'), cx = cv.getContext('2d');
  const tl = $('#tl'), tlin = $('#tlin');

  // ── storage: project JSON in localStorage, media files in IndexedDB ──────────────────
  const DB = {
    _p: null,
    open() {
      return this._p || (this._p = new Promise((res, rej) => {
        const r = indexedDB.open('provident-video', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('media', { keyPath: 'id' });
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      }));
    },
    async tx(mode, fn) {
      const db = await this.open();
      return new Promise((res, rej) => { const t = db.transaction('media', mode); const q = fn(t.objectStore('media')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); });
    },
    put(rec) { return this.tx('readwrite', s => s.put(rec)).catch(() => {}); },
    del(id) { return this.tx('readwrite', s => s.delete(id)).catch(() => {}); },
    all() { return this.tx('readonly', s => s.getAll()).catch(() => []); }
  };
  let saveT = 0;
  function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(PKEY, JSON.stringify(P)); } catch (e) {} }, 250); }
  function mark() { const s = JSON.stringify(P); if (undo[undo.length - 1] !== s) { undo.push(s); if (undo.length > 80) undo.shift(); redo.length = 0; } }
  function restore(from, to) {
    if (!from.length) return;
    to.push(JSON.stringify(P)); P = JSON.parse(from.pop());
    if (sel && !find(sel)) sel = null;
    partnerLoad(); fitCanvas(); renderAll();
  }

  // ── model helpers ────────────────────────────────────────────────────────────────────
  const clipLen = c => c.out - c.in;
  function clipStarts() { let t = 0; return P.clips.map(c => { const s = t; t += clipLen(c); return s; }); }
  function videoEnd() { return P.clips.reduce((a, c) => a + clipLen(c), 0); }
  function total() {
    let d = videoEnd();
    [P.audio, P.texts, P.logos].forEach(L => L.forEach(i => { d = Math.max(d, i.at + i.dur); }));
    return d;
  }
  function listOf(kind) { return kind === 'clip' ? P.clips : kind === 'audio' ? P.audio : kind === 'text' ? P.texts : P.logos; }
  function find(s) { return s ? listOf(s.kind).find(i => i.id === s.id) : null; }
  function span(kind, it) {
    if (kind !== 'clip') return [it.at, it.at + it.dur];
    const st = clipStarts()[P.clips.indexOf(it)]; return [st, st + clipLen(it)];
  }
  function clipAt(t) {
    const st = clipStarts();
    for (let i = 0; i < P.clips.length; i++) if (t >= st[i] && t < st[i] + clipLen(P.clips[i]) - 1e-6) return { c: P.clips[i], start: st[i], i };
    return null;
  }
  const fmt = t => { t = Math.max(0, t); const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); };
  function toast(msg) { const el = $('#toast'); el.textContent = msg; el.dataset.on = '1'; clearTimeout(toast._t); toast._t = setTimeout(() => delete el.dataset.on, 3800); }

  // ── media import ─────────────────────────────────────────────────────────────────────
  const once = (el, ok, bad) => new Promise((res, rej) => {
    el.addEventListener(ok, () => res(), { once: true });
    el.addEventListener(bad || 'error', () => rej(new Error('load')), { once: true });
  });
  async function probe(rec) {
    rec.url = URL.createObjectURL(rec.blob);
    if (rec.kind === 'video') {
      if (rec.dur && rec.poster) return rec;
      const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = rec.url;
      await once(v, 'loadedmetadata');
      if (!v.videoWidth) throw new Error('no video track');
      rec.dur = v.duration; rec.w = v.videoWidth; rec.h = v.videoHeight;
      try {
        v.currentTime = Math.min(.2, rec.dur / 2); await once(v, 'seeked');
        const c = document.createElement('canvas'); c.height = 92; c.width = Math.round(92 * rec.w / rec.h);
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); rec.poster = c.toDataURL('image/jpeg', .7);
      } catch (e) {}
      v.removeAttribute('src'); v.load();
    } else if (rec.kind === 'audio') {
      if (rec.dur) return rec;
      const a = document.createElement('audio'); a.preload = 'metadata'; a.src = rec.url;
      await once(a, 'loadedmetadata'); rec.dur = a.duration;
      try {                                   // peaks for the waveform, 40 a second
        const AC = window.AudioContext || window.webkitAudioContext, c = new AC();
        const buf = await c.decodeAudioData(await rec.blob.arrayBuffer()); c.close();
        const d = buf.getChannelData(0), n = Math.max(1, Math.ceil(buf.duration * 40)), step = Math.floor(d.length / n) || 1, pk = [];
        for (let i = 0; i < n; i++) { let m = 0; for (let j = i * step, e = Math.min(d.length, j + step); j < e; j += 8) { const a2 = Math.abs(d[j]); if (a2 > m) m = a2; } pk.push(Math.round(m * 100) / 100); }
        rec.peaks = pk;
      } catch (e) {}
    } else {
      const im = new Image(); im.src = rec.url; await once(im, 'load');
      rec.w = im.naturalWidth; rec.h = im.naturalHeight; rec.dur = 0;
    }
    return rec;
  }
  async function addFiles(files, want) {
    let added = 0, firstVideo = !P.clips.length;
    for (const f of Array.from(files)) {
      const ty = f.type || '';
      let kind = ty.startsWith('video') ? 'video' : ty.startsWith('audio') ? 'audio' : ty.startsWith('image') ? (want === 'logo' ? 'logo' : 'image') : null;
      if (!kind && /\.(mov|mp4|m4v|webm)$/i.test(f.name)) kind = 'video';
      if (!kind && /\.(mp3|wav|m4a|aac|ogg)$/i.test(f.name)) kind = 'audio';
      if (!kind) { toast(f.name + ' is not a video, audio or image file.'); continue; }
      const rec = { id: uid(), kind, name: f.name.replace(/\.[^.]+$/, ''), blob: f };
      try { await probe(rec); } catch (e) {
        toast(kind === 'video' ? 'This browser cannot play ' + f.name + '. Try an MP4 (H.264).' : 'Could not read ' + f.name + '.'); continue;
      }
      media[rec.id] = rec; added++;
      DB.put({ id: rec.id, kind: rec.kind, name: rec.name, blob: rec.blob, dur: rec.dur, w: rec.w, h: rec.h, poster: rec.poster, peaks: rec.peaks });
      // the first video dropped goes straight onto the timeline; so does anything dropped on the stage
      if (kind === 'image' && want === 'stage' && P.clips.length) addLogo(rec.id, true);
      else if ((kind === 'video' || kind === 'image') && (firstVideo || want === 'stage')) { addClip(rec.id, true); firstVideo = false; }
      if (kind === 'audio' && want === 'stage') addAudio(rec.id, 'music', true);
    }
    if (added) {
      const k = Object.values(media).pop().kind;
      if (want !== 'stage') tab = k === 'audio' ? 'audio' : k === 'logo' ? 'logos' : 'media';
      renderAll();
    }
  }
  function removeMedia(id) {
    mark();
    P.clips = P.clips.filter(c => c.mid !== id); P.audio = P.audio.filter(c => c.mid !== id); P.logos = P.logos.filter(c => c.mid !== id);
    if (media[id]) URL.revokeObjectURL(media[id].url);
    delete media[id]; DB.del(id);
    if (sel && !find(sel)) sel = null;
    renderAll();
  }

  // ── adding things to the timeline ────────────────────────────────────────────────────
  function addClip(mid, quiet) {
    const m = media[mid]; if (!m) return;
    if (!quiet) mark();
    const c = { id: uid(), mid, in: 0, out: m.kind === 'image' ? 3 : m.dur, vol: 1, mute: false, fit: 'fill', z: 100, fx: 50, fy: 50 };
    P.clips.push(c); sel = { kind: 'clip', id: c.id };
    if (!quiet) renderAll();
  }
  function addAudio(mid, track, quiet) {
    const m = media[mid]; if (!m) return;
    if (!quiet) mark();
    const end = videoEnd(), at = track === 'music' ? 0 : T;
    const dur = track === 'music' && end > 0 ? Math.min(m.dur, end) : m.dur;
    const a = { id: uid(), mid, at, dur, in: 0, vol: track === 'music' ? .8 : 1, fi: 0, fo: track === 'music' ? 1 : 0, track };
    P.audio.push(a); sel = { kind: 'audio', id: a.id };
    if (!quiet) renderAll();
  }
  function addText(preset) {
    mark();
    const base = { id: uid(), at: T, dur: 3, eyebrow: '', text: 'Your Headline Here', sub: '', size: 'Medium', pos: 'bottom', align: 'left', anim: 'rise', scrim: 55 };
    const pre = {
      headline: {},
      full: { eyebrow: 'New launch', sub: 'One supporting line under the headline.' },
      caption: { text: 'A short caption', size: 'Small', anim: 'fade' },
      centre: { pos: 'centre', align: 'centre', size: 'Large', anim: 'lines' },
      number: { eyebrow: 'Starting from', text: 'AED 2.4M', size: 'Jumbo', anim: 'words' }
    }[preset] || {};
    const t = Object.assign(base, pre);
    P.texts.push(t); sel = { kind: 'text', id: t.id }; renderAll();
  }
  function addLogo(mid, quiet) {
    if (!media[mid]) return;
    if (!quiet) mark();
    // never past the end of the video: at the very end it steps back so it is on screen
    const end = total(); let at = T, dur = 5;
    if (end > 0) { if (end - at < 1) at = Math.max(0, end - 3); dur = Math.min(5, end - at); }
    const l = { id: uid(), mid, at, dur, x: 50, y: 50, w: 30, op: 100, fade: true, tint: P.brand.tint === 'match' ? 'match' : 'orig' };
    P.logos.push(l); sel = { kind: 'logo', id: l.id };
    if (at !== T) T = at;
    if (!quiet) renderAll();
  }

  // ── cut, duplicate, delete ───────────────────────────────────────────────────────────
  function split() {
    let tg = null;
    if (sel) { const it = find(sel), sp = it && span(sel.kind, it); if (sp && T > sp[0] + .05 && T < sp[1] - .05) tg = { kind: sel.kind, it }; }
    if (!tg) { const a = clipAt(T); if (a && T > a.start + .05 && T < a.start + clipLen(a.c) - .05) tg = { kind: 'clip', it: a.c }; }
    if (!tg) { toast('Move the playhead inside a clip to cut it.'); return; }
    mark();
    const it = tg.it, L = listOf(tg.kind), nb = Object.assign({}, it, { id: uid() });
    if (tg.kind === 'clip') {
      const st = span('clip', it)[0]; nb.in = it.in + (T - st); it.out = nb.in;
    } else {
      const d = T - it.at; nb.at = T; nb.dur = it.dur - d; it.dur = d;
      if (tg.kind === 'audio') { nb.in = it.in + d; it.fo = 0; nb.fi = 0; }
    }
    L.splice(L.indexOf(it) + 1, 0, nb);
    sel = { kind: tg.kind, id: nb.id }; renderAll();
  }
  function del() {
    const it = find(sel); if (!it) return;
    mark(); const L = listOf(sel.kind); L.splice(L.indexOf(it), 1); sel = null;
    T = Math.min(T, total()); renderAll();
  }
  function dup() {
    const it = find(sel); if (!it) return;
    mark(); const L = listOf(sel.kind), nb = Object.assign({}, it, { id: uid() });
    if (sel.kind !== 'clip') nb.at = it.at + it.dur;
    L.splice(L.indexOf(it) + 1, 0, nb); sel = { kind: sel.kind, id: nb.id }; renderAll();
  }

  // ── audio graph: every element runs through a gain so volume, fades and export share one path ──
  function ensureCtx() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      actx = new AC(); master = actx.createGain(); master.connect(actx.destination);
    }
    if (actx.state === 'suspended') actx.resume();
  }
  function wire(el) {
    if (!actx || el._g) return;
    try { const s = actx.createMediaElementSource(el); el._g = actx.createGain(); s.connect(el._g); el._g.connect(master); } catch (e) {}
  }
  function setVol(el, v) { wire(el); if (el._g) { el._g.gain.value = v; el.volume = 1; } else el.volume = clamp(v, 0, 1); }
  function elFor(map, id, tag, url) {
    let el = map[id];
    if (!el) {
      el = map[id] = document.createElement(tag); el.preload = 'auto'; el.playsInline = true; el.src = url;
      el.addEventListener('seeked', () => { dirty = true; stats.seeked++; });
      el.addEventListener('loadeddata', () => { dirty = true; });
    }
    return el;
  }
  function imgFor(m) {
    let im = imgs[m.id];
    if (!im) { im = imgs[m.id] = new Image(); im.onload = () => { dirty = true; }; im.src = m.url; }
    return im;
  }
  // Slave every media element to the timeline clock.
  function drive(el, want, on, vol) {
    if (!on) { if (!el.paused) el.pause(); return; }
    const end = isFinite(el.duration) ? el.duration - .03 : want;
    want = clamp(want, 0, Math.max(0, end));
    setVol(el, vol);
    if (playing) {
      if (el.paused) { if (Math.abs(el.currentTime - want) > .05) el.currentTime = want; const p = el.play(); if (p && p.catch) p.catch(() => {}); }
      else if (Math.abs(el.currentTime - want) > .3) el.currentTime = want;
    } else {
      if (!el.paused) el.pause();
      if (!el.seeking && Math.abs(el.currentTime - want) > .02) el.currentTime = want;
    }
  }
  function sync() {
    const st = clipStarts(); let hold = false;
    const live = {};
    P.clips.forEach((c, i) => {
      const m = media[c.mid]; if (!m || m.kind !== 'video') return;
      live[c.id] = 1;
      const el = elFor(vel, c.id, 'video', m.url), len = clipLen(c);
      const on = T >= st[i] && T < st[i] + len;
      drive(el, c.in + (T - st[i]), on, c.mute ? 0 : c.vol);
      if (on && playing && (el.seeking || el.readyState < 2)) hold = true;
      // pre-roll the next clip so the cut lands on a decoded frame
      if (!on && st[i] > T && st[i] - T < 1.2 && !el.seeking && Math.abs(el.currentTime - c.in) > .02) el.currentTime = c.in;
    });
    Object.keys(vel).forEach(id => { if (!live[id]) { vel[id].pause(); vel[id].removeAttribute('src'); delete vel[id]; } });
    const liveA = {};
    P.audio.forEach(a => {
      const m = media[a.mid]; if (!m) return;
      liveA[a.id] = 1;
      const el = elFor(ael, a.id, 'audio', m.url), rel = T - a.at, on = rel >= 0 && rel < a.dur;
      let g = a.vol;
      if (a.fi > 0) g *= clamp(rel / a.fi, 0, 1);
      if (a.fo > 0) g *= clamp((a.dur - rel) / a.fo, 0, 1);
      drive(el, a.in + rel, on && playing, g);
    });
    Object.keys(ael).forEach(id => { if (!liveA[id]) { ael[id].pause(); ael[id].removeAttribute('src'); delete ael[id]; } });
    return hold;
  }

  // ── transport ────────────────────────────────────────────────────────────────────────
  let lastNow = 0;
  function play() {
    if (!total()) return;
    ensureCtx();
    if (T >= total() - .02) T = 0;
    playing = true; lastNow = performance.now(); paintTransport();
  }
  function pause() { playing = false; sync(); paintTransport(); }
  function seek(t) { T = clamp(t, 0, Math.max(0, total())); dirty = true; paintPlayhead(); }
  // Scrubbing lands on whole frames, and locks onto the start and end of whatever is near.
  function edges(skipId) {
    const c = [0]; let acc = 0; P.clips.forEach(k => { acc += clipLen(k); c.push(acc); });
    [P.audio, P.texts, P.logos].forEach(L => L.forEach(i => { if (i.id !== skipId) c.push(i.at, i.at + i.dur); }));
    return c;
  }
  function magnet(t) {
    const tol = 9 / pps; let best = null, bd = tol;
    edges().forEach(v => { const d = Math.abs(v - t); if (d < bd) { bd = d; best = v; } });
    return best == null ? Math.round(t * 30) / 30 : best;
  }
  function tick(now) {
    if (playing) {
      const hold = sync();
      if (!hold) T += (now - lastNow) / 1000;
      lastNow = now;
      const end = total();
      if (T >= end) { T = end; playing = false; sync(); paintTransport(); if (exporting) finishExport(); }
      draw(); paintPlayhead();
    } else if (dirty) {
      // PAINT FIRST, then ask for the next frame. The other way round, a scrub that keeps moving
      // starts a new seek before the frame that just arrived is painted, and the picture only
      // catches up when the pointer stops.
      draw(); sync(); paintPlayhead();
    }
    requestAnimationFrame(tick);
  }

  // ── painting the frame ───────────────────────────────────────────────────────────────
  const G = () => SIZES[P.size];
  function setFont(px, wt, track) {
    cx.font = wt + ' ' + px + 'px ' + ART.font;
    try { cx.letterSpacing = (track * px).toFixed(2) + 'px'; } catch (e) {}
  }
  function wrap(str, maxW) {
    const out = [];
    String(str || '').split('\n').forEach(par => {
      const words = par.split(/\s+/).filter(Boolean); let line = '';
      if (!words.length) { out.push(''); return; }
      words.forEach(w => {
        const tr = line ? line + ' ' + w : w;
        if (line && cx.measureText(tr).width > maxW) { out.push(line); line = w; } else line = tr;
      });
      out.push(line);
    });
    return out;
  }
  // `**like this**` marks a brass highlight. It can start and stop inside a word, and runs on
  // across line breaks. Returns lines of { s: plain text, words: [{ s, runs: [{ s, hi }] }], hi }.
  const plain = s => String(s || '').replace(/\*\*/g, '');
  function wrapHi(str, maxW) {
    const out = []; let hi = false;
    String(str || '').split('\n').forEach(par => {
      const words = []; let cur = null;
      par.split(/(\*\*|\s+)/).forEach(part => {
        if (part === '**') hi = !hi;
        else if (!part || /^\s+$/.test(part)) cur = null;
        else { if (!cur) { cur = { s: '', runs: [] }; words.push(cur); } cur.s += part; cur.runs.push({ s: part, hi }); }
      });
      if (!words.length) { out.push({ s: '', words: [] }); return; }
      let line = [];
      const flush = () => { out.push({ s: line.map(w => w.s).join(' '), words: line, hi: line.some(w => w.runs.some(r => r.hi)) }); line = []; };
      words.forEach(w => {
        if (line.length && cx.measureText(line.map(x => x.s).join(' ') + ' ' + w.s).width > maxW) flush();
        line.push(w);
      });
      flush();
    });
    return out;
  }
  // one word at x, in its own colours; returns where the next word starts
  function putWord(w, x, y, sp) {
    w.runs.forEach(r => { cx.fillStyle = r.hi ? ART.brass : ART.ink; cx.fillText(r.s, x, y); x += cx.measureText(r.s).width; });
    cx.fillStyle = ART.ink; return x + sp;
  }
  function putRow(r, x, y) {
    if (!r.hi) { cx.fillText(r.s, x, y); return; }
    const sp = cx.measureText(' ').width; r.words.forEach(w => { x = putWord(w, x, y, sp); });
  }
  function drawCover(src, sw, sh, c) {
    const g = G(); if (!sw || !sh) return;
    const fill = c.fit !== 'fit', s = (fill ? Math.max(g.w / sw, g.h / sh) : Math.min(g.w / sw, g.h / sh)) * (c.z || 100) / 100;
    const dw = sw * s, dh = sh * s;
    cx.drawImage(src, (g.w - dw) * (c.fx == null ? 50 : c.fx) / 100, (g.h - dh) * (c.fy == null ? 50 : c.fy) / 100, dw, dh);
  }
  // The copy block: eyebrow (tracked caps 500), headline (Regular 400 on the thumbnail scale),
  // sub line (Light 300). The headline steps DOWN the scale to fit; it never shrinks off it.
  function layoutText(tx) {
    const g = G(), maxW = g.w - g.l - g.r, k = g.k;
    let idx = Math.max(0, ART.order.indexOf(tx.size)), L = null;
    for (; idx >= 0; idx--) {
      const rows = []; let y = 0;
      const px = ART.sizes[ART.order[idx]] * k, eb = Math.max(24, ART.eyebrow * (k < 1 ? .85 : 1)), sb = Math.max(24, ART.sub * (k < 1 ? .8 : 1));
      if (tx.eyebrow) { setFont(eb, 500, .1); y += eb; rows.push({ s: plain(tx.eyebrow).toUpperCase(), px: eb, wt: 500, tr: .1, y }); y += px * .16; }
      if (tx.text) {
        setFont(px, 400, ART.headTrack);
        wrapHi(tx.text, maxW).forEach((ln, i) => { y += i ? px * ART.headLead : px * .8; rows.push(Object.assign(ln, { px, wt: 400, tr: ART.headTrack, y, head: 1 })); });
      }
      if (tx.sub) {
        setFont(sb, 300, 0); y += px * .22;
        wrapHi(tx.sub, maxW).forEach((ln, i) => { y += i ? sb * 1.3 : sb * 1.05; rows.push(Object.assign(ln, { px: sb, wt: 300, tr: 0, y })); });
      }
      const last = rows[rows.length - 1];
      L = { rows, h: last ? y + last.px * .22 : 0 };
      if (L.h <= g.h * ART.maxBlock) break;
    }
    const b = P.brand, lg = ART.logoPx * (b.scale / 100) * 2.4;
    let top;
    if (tx.pos === 'top') top = g.t + (b.on && b.vpos === 'top' ? lg : 0);
    else if (tx.pos === 'centre') top = (g.h - L.h) / 2;
    else top = g.h - g.b - L.h - (b.on && b.vpos === 'bottom' ? lg : 0);
    L.top = top; L.x = tx.align === 'centre' ? g.w / 2 : g.l; L.maxW = maxW;
    return L;
  }
  function drawText(tx) {
    // paused on the selected item: show it finished, so what is being edited is never mid-effect
    const still = !playing && sel && sel.id === tx.id;
    const g = G(), rel = still ? 99 : T - tx.at, L = layoutText(tx);
    if (!L.rows.length) return;
    const out = tx.anim === 'none' || still ? 1 : ease((tx.dur - rel) / .3), inn = tx.anim === 'none' ? 1 : ease(rel / .45);
    const env = Math.min(inn, out);
    // the wash covers the text area only, plus breathing room, and fades out beyond it
    if (tx.scrim > 0) {
      const a = tx.scrim / 100 * env, y0 = L.top - 20, y1 = L.top + L.h + 20, f = 320;
      let gr;
      if (tx.pos === 'top') { gr = cx.createLinearGradient(0, 0, 0, y1 + f); gr.addColorStop(0, 'rgba(' + ART.wash + ',' + a + ')'); gr.addColorStop(y1 / (y1 + f), 'rgba(' + ART.wash + ',' + a * .8 + ')'); gr.addColorStop(1, 'rgba(' + ART.wash + ',0)'); cx.fillStyle = gr; cx.fillRect(0, 0, g.w, y1 + f); }
      else if (tx.pos === 'centre') { gr = cx.createLinearGradient(0, y0 - f, 0, y1 + f); const n = f / (y1 - y0 + 2 * f); gr.addColorStop(0, 'rgba(' + ART.wash + ',0)'); gr.addColorStop(n, 'rgba(' + ART.wash + ',' + a * .8 + ')'); gr.addColorStop(1 - n, 'rgba(' + ART.wash + ',' + a * .8 + ')'); gr.addColorStop(1, 'rgba(' + ART.wash + ',0)'); cx.fillStyle = gr; cx.fillRect(0, y0 - f, g.w, y1 - y0 + 2 * f); }
      else { gr = cx.createLinearGradient(0, y0 - f, 0, g.h); gr.addColorStop(0, 'rgba(' + ART.wash + ',0)'); gr.addColorStop(f / (g.h - y0 + f), 'rgba(' + ART.wash + ',' + a * .8 + ')'); gr.addColorStop(1, 'rgba(' + ART.wash + ',' + a + ')'); cx.fillStyle = gr; cx.fillRect(0, y0 - f, g.w, g.h - y0 + f); }
    }
    cx.fillStyle = ART.ink; cx.textBaseline = 'alphabetic';
    let wi = 0;
    L.rows.forEach((r, i) => {
      setFont(r.px, r.wt, r.tr);
      const y = L.top + r.y, w = cx.measureText(r.s).width, x0 = tx.align === 'centre' ? L.x - w / 2 : L.x;
      cx.textAlign = 'left';
      const p = ease((rel - i * .08) / .5);
      cx.save();
      if (tx.anim === 'rise') { cx.globalAlpha = p * out; putRow(r, x0, y + (1 - p) * 46); }
      else if (tx.anim === 'lines') {
        cx.globalAlpha = out; cx.beginPath(); cx.rect(0, y - r.px * .95, g.w, r.px * 1.25); cx.clip();
        putRow(r, x0, y + (1 - p) * r.px * 1.25);
      } else if (tx.anim === 'words' && r.head) {
        let x = x0; const sp = cx.measureText(' ').width;
        r.words.forEach(wd => {
          const q = ease((rel - wi * .11) / .4); wi++;
          cx.globalAlpha = q * out; x = putWord(wd, x, y + (1 - q) * 18, sp);
        });
      } else { cx.globalAlpha = env; putRow(r, x0, y); }
      cx.restore();
    });
    try { cx.letterSpacing = '0px'; } catch (e) {}
    hits[tx.id] = { kind: 'text', x: g.l, y: L.top, w: L.maxW, h: L.h };
  }
  function drawLogo(l) {
    const m = media[l.mid]; if (!m) return;
    const im = imgFor(m); if (!im.complete || !im.naturalWidth) return;
    const g = G(), rel = T - l.at, w = g.w * l.w / 100, h = w * im.naturalHeight / im.naturalWidth;
    const x = g.w * l.x / 100 - w / 2, y = g.h * l.y / 100 - h / 2;
    cx.save(); cx.globalAlpha = (l.op / 100) * (l.fade && !(!playing && sel && sel.id === l.id) ? Math.min(ease(rel / .35), ease((l.dur - rel) / .3)) : 1);
    const tint = l.tint === 'match' ? (P.brand.ink === 'navy' ? ART.navy : ART.ink) : l.tint === 'navy' ? ART.navy : l.tint === 'white' ? ART.ink : null;
    cx.drawImage(tint ? flat(im, m.id, tint) : im, x, y, w, h); cx.restore();
    hits[l.id] = { kind: 'logo', x, y, w, h };
  }
  // One flat ink over a mark, keeping its own alpha (CAS's tintFlat). Cached per file and colour.
  const flats = {};
  function flat(im, id, colour) {
    const k = id + colour; if (flats[k]) return flats[k];
    const src = keyed(im, id) || im, sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
    const s = Math.min(1, 1600 / Math.max(sw, sh)), c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(sw * s)); c.height = Math.max(1, Math.round(sh * s));
    const x = c.getContext('2d'); x.drawImage(src, 0, 0, c.width, c.height);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = colour; x.fillRect(0, 0, c.width, c.height);
    return (flats[k] = c);
  }
  // A logo saved on a flat background (a JPG, or a PNG with no transparency) has no shape to
  // tint: the whole rectangle is ink. When every edge is opaque and the four corners agree, the
  // background colour is keyed out so the mark itself can be painted. Null when the file has its
  // own transparency, or when the edge is a picture rather than a flat colour.
  const keys = {};
  function keyed(im, id) {
    if (id in keys) return keys[id];
    let out = null;
    try {
      const iw = im.naturalWidth, ih = im.naturalHeight, s = Math.min(1, 1400 / Math.max(iw, ih));
      const w = Math.max(2, Math.round(iw * s)), h = Math.max(2, Math.round(ih * s)), c = document.createElement('canvas');
      c.width = w; c.height = h;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, w, h);
      const id2 = x.getImageData(0, 0, w, h), d = id2.data, at = (px, py) => (py * w + px) * 4;
      let opaque = true;
      for (let i = 0; i < w && opaque; i += 3) if (d[at(i, 0) + 3] < 250 || d[at(i, h - 1) + 3] < 250) opaque = false;
      for (let j = 0; j < h && opaque; j += 3) if (d[at(0, j) + 3] < 250 || d[at(w - 1, j) + 3] < 250) opaque = false;
      if (opaque) {
        const cs = [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)], b = [0, 1, 2].map(k => cs.reduce((a, o) => a + d[o + k], 0) / 4);
        const flatBg = cs.every(o => Math.max(Math.abs(d[o] - b[0]), Math.abs(d[o + 1] - b[1]), Math.abs(d[o + 2] - b[2])) < 26);
        if (flatBg) {
          for (let i = 0; i < d.length; i += 4) {
            const dist = Math.max(Math.abs(d[i] - b[0]), Math.abs(d[i + 1] - b[1]), Math.abs(d[i + 2] - b[2]));
            d[i + 3] = Math.round(clamp((dist - 14) / 46, 0, 1) * 255);
          }
          x.putImageData(id2, 0, 0); out = c;
        }
      }
    } catch (e) {}
    return (keys[id] = out);
  }
  // ── the co-brand lockup: provident. | partner ────────────────────────────────────────
  let pImg = null, pInk = null, pTint = null, pKey = null, pKeyInk = null, pSeq = 0;
  function inkBox(img) {                      // StudioBase.inkBox, minus the cache
    const iw = img.naturalWidth || img.width || 1, ih = img.naturalHeight || img.height || 1;
    let out = { x: 0, y: 0, w: 1, h: 1, aspect: iw / ih };
    try {
      const s = Math.min(1, 240 / Math.max(iw, ih)), w = Math.max(1, Math.round(iw * s)), h = Math.max(1, Math.round(ih * s));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, w, h);
      const d = x.getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) if (d[(py * w + px) * 4 + 3] > 8) { if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; }
      if (x1 >= x0 && y1 >= y0) { const bw = (x1 - x0 + 1) / w, bh = (y1 - y0 + 1) / h; out = { x: x0 / w, y: y0 / h, w: bw, h: bh, aspect: (bw * iw) / (bh * ih) }; }
    } catch (e) {}
    return out;
  }
  function partnerLoad() {
    const p = P.brand.partner; pTint = null;
    if (!p) { pImg = null; pInk = null; pKey = null; dirty = true; return; }
    if (pImg && pImg._u === p.u) return;
    const im = new Image(); im._u = p.u;
    im.onload = () => { pInk = inkBox(im); pKey = keyed(im, 'partner' + (++pSeq)); pKeyInk = pKey ? inkBox(pKey) : null; pTint = null; dirty = true; };
    pImg = im; pInk = null; pKey = null; im.src = p.u;
  }
  function drawBrand() {
    const b = P.brand; if (!b.on) return;
    const g = G(), L = ART.logoPx * (b.scale / 100), innerW = g.w - g.l - g.r;
    setFont(L, 300, ART.logoTrack);
    const wm = cx.measureText('provident.').width - L * ART.logoTrack;
    const has = pImg && pInk && pImg.complete && pImg.naturalWidth;
    // Match wordmark on a file with a flat background paints the keyed mark, measured by its own ink
    const useK = b.tint === 'match' && pKey && pKeyInk, pSrc = useK ? pKey : pImg, I = useK ? pKeyInk : pInk;
    const gap = L * CO.gap, rw = Math.max(1, L * CO.rule), rh = L * CO.ruleH;
    let th = L * CO.h * (b.pScale / 100), tw = has ? th * I.aspect : 0;
    if (has && tw > innerW * CO.maxW) { tw = innerW * CO.maxW; th = tw / I.aspect; }
    const totalW = wm + (has ? gap + rw + gap + tw : 0);
    const x0 = b.align === 'centre' ? (g.w - totalW) / 2 : g.l;
    const base = b.vpos === 'top' ? g.t + L * .8 : g.h - g.b - L * .35;
    if (b.wash > 0) {                         // a short wash behind the lockup only
      const a = b.wash / 100, reach = L * 4.2; let gr;
      if (b.vpos === 'top') { gr = cx.createLinearGradient(0, 0, 0, base + reach); gr.addColorStop(0, 'rgba(' + ART.wash + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + ART.wash + ',0)'); cx.fillStyle = gr; cx.fillRect(0, 0, g.w, base + reach); }
      else { gr = cx.createLinearGradient(0, base - reach, 0, g.h); gr.addColorStop(0, 'rgba(' + ART.wash + ',0)'); gr.addColorStop(1, 'rgba(' + ART.wash + ',' + a + ')'); cx.fillStyle = gr; cx.fillRect(0, base - reach, g.w, g.h - base + reach); }
    }
    const ink = b.ink === 'navy' ? ART.navy : ART.ink;
    cx.fillStyle = ink; cx.textAlign = 'left'; cx.textBaseline = 'alphabetic';
    setFont(L, 300, ART.logoTrack);
    cx.fillText('provident.', x0, base);
    try { cx.letterSpacing = '0px'; } catch (e) {}
    if (has) {
      const cy = base - L * CO.cy, rx = x0 + wm + gap;
      cx.fillRect(rx, cy - rh / 2, rw, rh);
      const px = rx + rw + gap, py = cy - th / 2;
      const nw = pSrc.naturalWidth || pSrc.width, nh = pSrc.naturalHeight || pSrc.height;
      const sx = I.x * nw, sy = I.y * nh, sw = I.w * nw, sh = I.h * nh;
      if (b.tint === 'match') {               // one flat ink, keeping the mark's own alpha
        const key = Math.ceil(tw) + 'x' + Math.ceil(th) + ink;
        if (!pTint || pTint._k !== key) {
          const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(tw * 2)); c.height = Math.max(1, Math.ceil(th * 2)); c._k = key;
          const x = c.getContext('2d'); x.drawImage(pSrc, sx, sy, sw, sh, 0, 0, c.width, c.height);
          x.globalCompositeOperation = 'source-in'; x.fillStyle = ink; x.fillRect(0, 0, c.width, c.height); pTint = c;
        }
        cx.drawImage(pTint, px, py, tw, th);
      } else cx.drawImage(pImg, sx, sy, sw, sh, px, py, tw, th);
    }
  }
  function draw() {
    dirty = false;
    const g = G();
    for (const k in hits) delete hits[k];
    const a = clipAt(T) || (T > 0 && T >= videoEnd() - 1e-6 && P.clips.length ? { c: P.clips[P.clips.length - 1] } : null);
    let painted = false;
    if (a) {
      const m = media[a.c.mid];
      if (m && m.kind === 'video') {
        const el = vel[a.c.id];
        if (el && (el.readyState >= 2 || (el.seeking && el.videoWidth && el._shown))) { el._shown = 1; cx.fillStyle = ART.ground; cx.fillRect(0, 0, g.w, g.h); drawCover(el, el.videoWidth, el.videoHeight, a.c); painted = true; }
        else if (el && draw._had) { return; }                    // nothing decoded yet: leave the last frame up; 'seeked' repaints
      } else if (m) {
        const im = imgFor(m);
        if (im.complete && im.naturalWidth) { cx.fillStyle = ART.ground; cx.fillRect(0, 0, g.w, g.h); drawCover(im, im.naturalWidth, im.naturalHeight, a.c); painted = true; }
      }
    }
    if (!painted) { cx.fillStyle = ART.ground; cx.fillRect(0, 0, g.w, g.h); }
    draw._had = !!a;
    P.texts.forEach(t => { if (T >= t.at && T < t.at + t.dur) drawText(t); });
    P.logos.forEach(l => { if (T >= l.at && T < l.at + l.dur) drawLogo(l); });
    drawBrand();
    pvMirror();
  }
  function fitCanvas() {
    const g = G(), box = $('#cvw');
    if (cv.width !== g.w || cv.height !== g.h) { cv.width = g.w; cv.height = g.h; }
    const s = Math.min((box.clientWidth - 36) / g.w, (box.clientHeight - 36) / g.h);
    cv.style.width = Math.max(40, Math.floor(g.w * s)) + 'px'; cv.style.height = Math.max(40, Math.floor(g.h * s)) + 'px';
    if (showSafe) guideShow();
    dirty = true;
  }

  // ── timeline ─────────────────────────────────────────────────────────────────────────
  function lanes(items) {                     // overlapping items step down a lane
    const ends = [], map = {};
    items.slice().sort((a, b) => a.at - b.at).forEach(i => {
      let n = ends.findIndex(e => e <= i.at + 1e-6); if (n < 0) n = ends.length;
      ends[n] = i.at + i.dur; map[i.id] = n;
    });
    return { map, n: Math.max(1, ends.length) };
  }
  function renderTimeline() {
    const end = total(), W = LBL + Math.max(tl.clientWidth - LBL, (end + 4) * pps + 80);
    let h = '<div class="vs-ruler" style="margin-left:' + LBL + 'px">';
    const step = [.5, 1, 2, 5, 10, 15, 30, 60].find(s => s * pps >= 64) || 60;
    for (let t = 0; t * pps < W - LBL; t += step) h += '<span class="vs-tick" style="left:' + (t * pps) + 'px">' + (step < 1 ? t.toFixed(1) : Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0')) + '</span>';
    h += '</div>';
    const on = (k, id) => sel && sel.kind === k && sel.id === id ? ' data-on="1"' : '';
    const hd = '<span class="vs-hd l" data-h="l"></span><span class="vs-hd r" data-h="r"></span>';
    TRACKS.forEach(tr => {
      let body = '', rowH = 38;
      if (tr.id === 'clip') {
        rowH = 54; const st = clipStarts();
        P.clips.forEach((c, i) => {
          const m = media[c.mid] || {};
          body += '<div class="vs-it" data-kind="clip" data-id="' + c.id + '"' + on('clip', c.id) + ' style="left:' + (LBL + st[i] * pps) + 'px;width:' + Math.max(6, clipLen(c) * pps - 1) + 'px;top:4px;' +
            (m.poster || m.kind === 'image' ? "background-image:url('" + (m.poster || m.url) + "')" : '') + '">' + hd + '<span class="n">' + esc(m.name || 'Clip') + (c.mute ? ' · muted' : '') + (c.job && c.job.status === 'working' ? ' · generating…' : c.job && c.job.status === 'queued' ? ' · queued' : '') + '</span></div>';
        });
      } else {
        const kind = tr.id === 'text' ? 'text' : tr.id === 'logo' ? 'logo' : 'audio';
        const items = kind === 'audio' ? P.audio.filter(a => a.track === tr.id) : listOf(kind);
        const ln = lanes(items), ih = kind === 'audio' ? 36 : 30;
        rowH = ln.n * (ih + 4) + 4;
        items.forEach(it => {
          const m = media[it.mid] || {};
          const name = kind === 'text' ? plain(it.text || it.eyebrow || it.sub || 'Text').split('\n')[0] : (m.name || kind);
          body += '<div class="vs-it" data-kind="' + kind + '" data-id="' + it.id + '"' + on(kind, it.id) + (it.track === 'sfx' ? ' data-sfx="1"' : '') +
            ' style="left:' + (LBL + it.at * pps) + 'px;width:' + Math.max(6, it.dur * pps - 1) + 'px;top:' + (4 + ln.map[it.id] * (ih + 4)) + 'px">' +
            (kind === 'audio' ? '<canvas data-wave="' + it.id + '"></canvas>' : '') + hd + '<span class="n">' + esc(name) + '</span></div>';
        });
      }
      h += '<div class="vs-trk" data-trk="' + tr.id + '" style="height:' + rowH + 'px"><div class="vs-trk-l">' + ico(tr.icon) + tr.name + '</div>' + body + '</div>';
    });
    h += '<div class="vs-ph" id="ph" title="Drag to scrub"></div>';
    tlin.style.width = W + 'px'; tlin.innerHTML = h;
    tlin.querySelectorAll('canvas[data-wave]').forEach(c => {
      const a = P.audio.find(x => x.id === c.dataset.wave), m = a && media[a.mid]; if (!m || !m.peaks) return;
      const w = c.width = Math.max(2, Math.min(4000, Math.round(a.dur * pps))), hh = c.height = 36, x = c.getContext('2d');
      x.fillStyle = '#fff';
      for (let i = 0; i < w; i++) { const p = m.peaks[Math.floor((a.in + i / w * a.dur) * 40)] || 0, bh = Math.max(1, p * hh * .9); x.fillRect(i, (hh - bh) / 2, 1, bh); }
    });
    paintPlayhead();
  }
  function paintPlayhead() {
    const ph = $('#ph'); if (ph) ph.style.left = (LBL + T * pps) + 'px';
    $('#time').innerHTML = fmt(T) + ' <s>/ ' + fmt(total()) + '</s>';
    if (playing && ph) {                      // keep the playhead in view
      const x = LBL + T * pps;
      if (x > tl.scrollLeft + tl.clientWidth - 40 || x < tl.scrollLeft + LBL) tl.scrollLeft = Math.max(0, x - LBL - 40);
    }
  }
  function paintTransport() {
    $('#playBtn').innerHTML = ico(playing ? 'pause' : 'play_arrow');
    $('#playBtn').setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }
  const xToT = e => (e.clientX - tlin.getBoundingClientRect().left - LBL) / pps;
  function snapT(t, skipId) {
    const c = edges(skipId).concat([T]), tol = 8 / pps;
    let best = t, bd = tol; c.forEach(v => { const d = Math.abs(v - t); if (d < bd) { bd = d; best = v; } });
    return best;
  }
  let drag = null;
  tl.addEventListener('pointerdown', e => {
    if (e.button) return;
    const itEl = e.target.closest('.vs-it');
    if (e.target.closest('.vs-trk-l')) return;
    if (e.target.closest('.vs-ph')) { drag = { mode: 'seek' }; if (playing) pause(); }
    else if (itEl) {
      const kind = itEl.dataset.kind, id = itEl.dataset.id, h = e.target.closest('.vs-hd');
      sel = { kind, id }; const it = find(sel);
      drag = { mode: h ? 'trim' + h.dataset.h : 'move', kind, id, x0: e.clientX, o: Object.assign({}, it), moved: false, snap: JSON.stringify(P), t: xToT(e) };
      renderAll();
    } else {
      drag = { mode: 'seek' };
      if (e.target.closest('.vs-trk') && sel) { sel = null; renderAll(); }
      if (playing) pause();
      seek(magnet(xToT(e)));
    }
    tl.setPointerCapture(e.pointerId); e.preventDefault();
  });
  tl.addEventListener('pointermove', e => {
    if (!drag) return;
    if (drag.mode === 'seek') {
      seek(magnet(xToT(e)));
      const r = tl.getBoundingClientRect();     // scrubbing past an edge scrolls the timeline
      if (e.clientX > r.right - 30) tl.scrollLeft += 14; else if (e.clientX < r.left + LBL + 20) tl.scrollLeft -= 14;
      return;
    }
    const dx = e.clientX - drag.x0;
    if (!drag.moved) { if (Math.abs(dx) < 3) return; drag.moved = true; undo.push(drag.snap); redo.length = 0; }
    const it = find(drag), o = drag.o, d = dx / pps, m = media[it.mid];
    if (drag.kind === 'clip') {
      const lim = m && m.kind === 'video' ? m.dur : 120;
      if (drag.mode === 'triml') it.in = clamp(o.in + d, 0, o.out - .2);
      else if (drag.mode === 'trimr') it.out = clamp(o.out + d, o.in + .2, lim);
      else {                                  // reorder: the clip lands before every clip whose middle is past the pointer
        const t = xToT(e), rest = P.clips.filter(c => c !== it); let acc = 0, idx = rest.length;
        for (let i = 0; i < rest.length; i++) { const L = clipLen(rest[i]); if (t < acc + L / 2) { idx = i; break; } acc += L; }
        rest.splice(idx, 0, it); P.clips = rest;
      }
    } else {
      const isA = drag.kind === 'audio', lim = isA && m ? m.dur : 600;
      if (drag.mode === 'move') {
        let at = Math.max(0, o.at + d); const s1 = snapT(at, it.id), s2 = snapT(at + o.dur, it.id);
        if (s1 !== at) at = s1; else if (s2 !== at + o.dur) at = Math.max(0, s2 - o.dur);
        it.at = at;
      } else if (drag.mode === 'triml') {
        let nat = clamp(snapT(o.at + d, it.id), Math.max(0, isA ? o.at - o.in : 0), o.at + o.dur - .2);
        it.at = nat; it.dur = o.dur - (nat - o.at); if (isA) it.in = o.in + (nat - o.at);
      } else it.dur = clamp(snapT(o.at + o.dur + d, it.id) - o.at, .2, isA ? lim - o.in : lim);
    }
    dirty = true; renderTimeline();
  });
  const endDrag = () => {
    if (drag && drag.moved) renderAll();
    else if (drag && drag.kind) {             // a plain click on an item also brings the playhead to it
      const it = find(drag), sp = it && span(drag.kind, it);
      if (sp && (drag.kind === 'clip' || T < sp[0] || T >= sp[1])) { if (playing) pause(); seek(clamp(magnet(drag.t), sp[0], Math.max(sp[0], sp[1] - 1 / 30))); }
    }
    drag = null;
  };
  tl.addEventListener('pointerup', endDrag); tl.addEventListener('pointercancel', endDrag);
  tl.addEventListener('wheel', e => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault(); pps = clamp(pps * (e.deltaY < 0 ? 1.12 : .89), 8, 240); $('#zoom').value = pps; renderTimeline();
  }, { passive: false });

  // ── canvas gestures: click selects, a logo drags ─────────────────────────────────────
  let cdrag = null;
  const cvPt = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; };
  cv.addEventListener('pointerdown', e => {
    const p = cvPt(e); let hit = null;
    Object.keys(hits).forEach(id => { const h = hits[id]; if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h && (!hit || h.kind === 'logo')) hit = { id, kind: h.kind }; });
    if (!hit) { if (sel) { sel = null; renderAll(); } return; }
    sel = { kind: hit.kind, id: hit.id }; renderAll();
    if (hit.kind === 'logo') { const l = find(sel); cdrag = { p, x: l.x, y: l.y, snap: JSON.stringify(P), moved: false }; cv.setPointerCapture(e.pointerId); }
  });
  // ── drag guides (chrome only, never painted on the canvas, so never exported) ────────
  // While a graphic is dragged: the safe area, the Reel interface in x-ray over the 9:16,
  // and a centre line each way that lights when the graphic locks onto it.
  const guide = document.createElement('div'); guide.className = 'vs-guide'; $('#cvw').appendChild(guide);
  function guideShow() {
    const g = G(), pc = (v, of) => (v / of * 100).toFixed(3) + '%';
    let h = '<i class="vs-g-band" style="left:0;right:0;top:0;height:' + pc(g.t, g.h) + '"></i>' +
      '<i class="vs-g-band" style="left:0;right:0;bottom:0;height:' + pc(g.b, g.h) + '"></i>' +
      '<i class="vs-g-band" style="left:0;width:' + pc(g.l, g.w) + ';top:' + pc(g.t, g.h) + ';bottom:' + pc(g.b, g.h) + '"></i>' +
      '<i class="vs-g-band" style="right:0;width:' + pc(g.r, g.w) + ';top:' + pc(g.t, g.h) + ';bottom:' + pc(g.b, g.h) + '"></i>' +
      '<i class="vs-g-safe" style="left:' + pc(g.l, g.w) + ';right:' + pc(g.r, g.w) + ';top:' + pc(g.t, g.h) + ';bottom:' + pc(g.b, g.h) + '"><b>Safe area</b></i>';
    if (P.size === '9x16') {                  // the Reel interface, traced off a phone screenshot
      const box = (x, y, w, hh, r, cls) => '<i class="vs-g-ui' + (cls ? ' ' + cls : '') + '" style="left:' + x + '%;top:' + y + '%;width:' + w + '%;height:' + hh + '%;border-radius:' + (r || 0) + 'px"></i>';
      h += box(5, 7.2, 3, 2.2, 3) + box(11, 7.2, 16, 2.2, 4) + box(80, 7.2, 5, 2.6, 99) + box(89, 7, 7, 3.9, 99) +   // back, Reels, search, profile
        box(88.5, 48, 8, 4.5, 99) + box(88.5, 55.5, 8, 4.5, 99) + box(88.5, 63, 8, 4.5, 99) + box(90.5, 70.3, 4, 1, 99) + // like, comment, share, more
        box(4.5, 72.5, 9.5, 5.3, 99) + box(16.5, 72.8, 54, 1.9, 4) + box(16.5, 75.4, 20, 1.4, 4) +                      // avatar, name, Sponsored
        box(4.5, 78.4, 66, 1.6, 4) + box(4.5, 80.5, 22, 1.6, 4) +                                                       // caption
        box(4.5, 83.2, 91, 4.7, 8, 'cta') + box(4.5, 89, 91, .25, 2) +                                                  // button, progress
        box(0, 90.6, 100, 9.4, 0, 'nav');
    }
    h += '<i class="vs-g-cx" data-cx></i><i class="vs-g-cy" data-cy></i>';
    guide.innerHTML = h;
    guide.style.left = cv.offsetLeft + 'px'; guide.style.top = cv.offsetTop + 'px';
    guide.style.width = cv.offsetWidth + 'px'; guide.style.height = cv.offsetHeight + 'px';
    guide.dataset.on = '1';
  }
  function guideLock(x, y) {
    const a = guide.querySelector('[data-cx]'), b = guide.querySelector('[data-cy]');
    if (a) { if (x) a.dataset.on = '1'; else delete a.dataset.on; }
    if (b) { if (y) b.dataset.on = '1'; else delete b.dataset.on; }
  }
  let showSafe = false;
  const guideHide = () => { if (showSafe) guideLock(false, false); else delete guide.dataset.on; };
  cv.addEventListener('pointermove', e => {
    if (!cdrag) return; const l = find(sel); if (!l) return;
    const p = cvPt(e);
    if (!cdrag.moved) {
      if (Math.abs(p.x - cdrag.p.x) + Math.abs(p.y - cdrag.p.y) < 4) return;
      cdrag.moved = true; undo.push(cdrag.snap); redo.length = 0; guideShow();
    }
    const g = G(), hb = hits[l.id] || { w: g.w * l.w / 100, h: 0 };
    let x = cdrag.x + (p.x - cdrag.p.x) / g.w * 100, y = cdrag.y + (p.y - cdrag.p.y) / g.h * 100;
    // magnetic: the centre first, then the graphic's edges against the safe area (Alt frees it)
    const pull = 9 * cv.width / (cv.getBoundingClientRect().width || cv.width);   // 9px on screen, whatever the zoom
    const tx = pull / g.w * 100, ty = pull / g.h * 100, hw = hb.w / g.w * 50, hh = hb.h / g.h * 50;
    let lx = false, ly = false;
    if (!e.altKey) {
      const L = g.l / g.w * 100, R = (g.w - g.r) / g.w * 100, Tp = g.t / g.h * 100, B = (g.h - g.b) / g.h * 100;
      if (Math.abs(x - 50) < tx) { x = 50; lx = true; }
      else if (Math.abs(x - hw - L) < tx) x = L + hw; else if (Math.abs(x + hw - R) < tx) x = R - hw;
      if (Math.abs(y - 50) < ty) { y = 50; ly = true; }
      else if (Math.abs(y - hh - Tp) < ty) y = Tp + hh; else if (Math.abs(y + hh - B) < ty) y = B - hh;
    }
    l.x = clamp(x, 0, 100); l.y = clamp(y, 0, 100);
    guideLock(lx, ly); dirty = true;
  });
  const cEnd = () => { const m = cdrag && cdrag.moved; cdrag = null; guideHide(); if (m) renderAll(); };
  cv.addEventListener('pointerup', cEnd); cv.addEventListener('pointercancel', cEnd);

  // ── left rail ────────────────────────────────────────────────────────────────────────
  function devLib() {
    let own = []; try { own = JSON.parse(localStorage.getItem(LKEY) || '[]'); } catch (e) {}
    return (window.providentDevLogos || []).concat(own.map(o => Object.assign({ own: 1 }, o)));
  }
  function renderLib() {
    $('#tabs').querySelectorAll('button').forEach(b => { if (b.dataset.tab === tab) b.dataset.on = '1'; else delete b.dataset.on; });
    const M = Object.values(media); let h = '';
    const drop = (want, label, sub) => '<button class="vs-drop" data-up="' + want + '">' + ico('upload') + '<span>' + label + '</span><span class="vs-note">' + sub + '</span></button>';
    if (tab === 'media') {
      const v = M.filter(m => m.kind === 'video' || m.kind === 'image');
      h += '<div class="vs-sec">' + drop('media', 'Upload video or photos', 'MP4, MOV, WebM, JPG, PNG') + '</div>';
      h += '<div class="vs-sec"><span class="vs-h">Your media</span>' + (v.length ? '<div class="vs-grid">' + v.map(m =>
        '<button class="vs-tile" data-addclip="' + m.id + '" title="Add to the end of the video track" style="background-image:url(\'' + (m.poster || m.url) + '\')"><s>' + (m.kind === 'image' ? 'Photo' : fmt(m.dur)) + '</s><b>' + esc(m.name) + '</b><span class="vs-x" data-rm="' + m.id + '" title="Remove">' + ico('close') + '</span></button>').join('') + '</div><span class="vs-note">Click a tile to add it to the end of the video track.</span>'
        : '<span class="vs-note">Nothing uploaded yet.</span>') + '</div>';
    } else if (tab === 'audio') {
      const a = M.filter(m => m.kind === 'audio');
      h += '<div class="vs-sec">' + drop('audio', 'Upload music or sound', 'MP3, WAV, M4A') + '</div>';
      h += '<div class="vs-sec"><span class="vs-h">Your audio</span>' + (a.length ? a.map(m =>
        '<div class="vs-arow"><div class="n"><b>' + esc(m.name) + '</b><s>' + fmt(m.dur) + '</s></div><button class="p-ghost p-sm" data-addaudio="' + m.id + '" data-trk="music" title="Add as the music bed, from the start">Music</button><button class="p-ghost p-sm" data-addaudio="' + m.id + '" data-trk="sfx" title="Add as a sound at the playhead">Sound</button><span class="vs-x" data-rm="' + m.id + '" title="Remove">' + ico('close') + '</span></div>').join('') +
        '<span class="vs-note">Music starts at 0:00 and is trimmed to the video. Sound lands at the playhead.</span>'
        : '<span class="vs-note">Nothing uploaded yet.</span>') + '</div>';
    } else if (tab === 'text') {
      const pre = [['headline', 'Headline', 'Regular 400, bottom left, rises in'], ['full', 'Eyebrow, headline and line', 'Tracked caps over the headline, a Light line under'], ['caption', 'Caption', 'A small line at the bottom, fades'], ['centre', 'Centre stage', 'Large, centred, revealed line by line'], ['number', 'Big number', 'Jumbo figure under an eyebrow, word by word']];
      h += '<div class="vs-sec"><span class="vs-h">Add text at the playhead</span>' + pre.map(p => '<button class="vs-pre" data-addtext="' + p[0] + '"><b>' + p[1] + '</b><s>' + p[2] + '</s></button>').join('') +
        '<span class="vs-note">The type follows the Reel thumbnail: one typeface, the headline on the brand scale, a wash under the copy only.</span></div>';
    } else {
      const b = P.brand, lib = devLib();
      const seg = (k, opts) => '<div class="vs-seg">' + opts.map(o => '<button data-bk="' + k + '" data-bv="' + o[0] + '"' + (String(b[k]) === String(o[0]) ? ' data-on="1"' : '') + '>' + o[1] + '</button>').join('') + '</div>';
      h += '<div class="vs-sec"><span class="vs-h">Provident wordmark</span>' + seg('on', [[true, 'Shown'], [false, 'Hidden']]) +
        '<div class="vs-two">' + seg('align', [['left', 'Left'], ['centre', 'Centre']]) + seg('vpos', [['top', 'Top'], ['bottom', 'Bottom']]) + '</div>' +
        '<div class="vs-f"><label>Colour</label>' + seg('ink', [['white', 'White'], ['navy', 'Navy']]) + '</div>' +
        rng('b', 'scale', 'Size', b.scale, 60, 200, '%') + rng('b', 'wash', 'Wash behind it', b.wash, 0, 100, '%') + '</div>';
      h += '<div class="vs-sec"><span class="vs-h">Collaboration logo</span><div class="vs-lgs">' +
        '<button class="vs-lg" data-partner=""' + (!b.partner ? ' data-on="1"' : '') + '>None</button>' +
        lib.map(l => '<button class="vs-lg" data-partner="' + esc(l.id) + '" title="' + esc(l.name) + '"' + (b.partner && b.partner.id === l.id ? ' data-on="1"' : '') + '><i class="m" style="-webkit-mask-image:url(\'' + l.u + '\');mask-image:url(\'' + l.u + '\')"></i>' + (l.own ? '<span class="vs-x" data-rmdev="' + esc(l.id) + '" title="Remove from this computer">' + ico('close') + '</span>' : '') + '</button>').join('') +
        '<button class="vs-lg" data-up="partner" title="Add a developer logo">' + ico('add') + '</button></div>' +
        (b.partner ? rng('b', 'pScale', 'Size', b.pScale, 60, 160, '%') : '') +
        '<span class="vs-note">Prints provident. | partner beside the wordmark, for the whole video. A logo you add stays on this computer.</span></div>';
      h += '<div class="vs-sec"><span class="vs-h">Logo colour</span>' + seg('tint', [['match', 'Match wordmark'], ['orig', 'Original']]) +
        '<span class="vs-note">Match wordmark paints the collaboration logo and every graphic you place in the wordmark\'s colour. Original keeps each file\'s own colours. A logo saved on a flat background has that background removed.</span></div>';
      const lg = M.filter(m => m.kind === 'logo' || m.kind === 'image');
      h += '<div class="vs-sec"><span class="vs-h">Graphics and other logos</span>' + drop('logo', 'Upload a graphic or logo', 'PNG or SVG with a clear background') +
        (lg.length ? '<div class="vs-grid">' + lg.map(m => '<button class="vs-tile" data-addlogo="' + m.id + '" title="Place at the playhead" style="background-image:url(\'' + m.url + '\');background-size:70%"><b>' + esc(m.name) + '</b><span class="vs-x" data-rm="' + m.id + '" title="Remove">' + ico('close') + '</span></button>').join('') + '</div><span class="vs-note">Click one to place it at the playhead, then drag it on the canvas.</span>' : '<span class="vs-note">Upload one, or drop an image on the video.</span>') + '</div>';
    }
    $('#lib').innerHTML = h;
  }
  function rng(scope, k, label, v, min, max, unit, step) {
    return '<div class="vs-f"><label>' + label + ' <s data-out="' + k + '">' + v + (unit || '') + '</s></label><input type="range" data-' + scope + 'r="' + k + '" data-unit="' + (unit || '') + '" min="' + min + '" max="' + max + '" step="' + (step || 1) + '" value="' + v + '"></div>';
  }
  let upWant = 'media';
  $('#lib').addEventListener('click', e => {
    const q = a => e.target.closest('[' + a + ']');
    let el;
    if ((el = q('data-rm'))) { e.stopPropagation(); removeMedia(el.dataset.rm); }
    else if ((el = q('data-rmdev'))) {
      e.stopPropagation();
      let own = []; try { own = JSON.parse(localStorage.getItem(LKEY) || '[]'); } catch (x) {}
      localStorage.setItem(LKEY, JSON.stringify(own.filter(o => o.id !== el.dataset.rmdev))); renderLib();
    }
    else if ((el = q('data-up'))) {
      upWant = el.dataset.up; const fi = $('#fileIn');
      fi.accept = upWant === 'media' ? 'video/*,image/*,.mov' : upWant === 'audio' ? 'audio/*' : 'image/*';
      fi.multiple = upWant !== 'partner'; fi.value = ''; fi.click();
    }
    else if ((el = q('data-addclip'))) addClip(el.dataset.addclip);
    else if ((el = q('data-addaudio'))) addAudio(el.dataset.addaudio, el.dataset.trk);
    else if ((el = q('data-addtext'))) addText(el.dataset.addtext);
    else if ((el = q('data-addlogo'))) addLogo(el.dataset.addlogo);
    else if ((el = q('data-partner'))) {
      mark(); const l = devLib().find(x => x.id === el.dataset.partner);
      P.brand.partner = l ? { id: l.id, name: l.name, u: l.u } : null; if (l) P.brand.on = true;
      partnerLoad(); renderAll();
    }
    else if ((el = q('data-bk'))) {
      mark(); const v = el.dataset.bv; P.brand[el.dataset.bk] = v === 'true' ? true : v === 'false' ? false : v;
      if (el.dataset.bk === 'tint') P.logos.forEach(l => { l.tint = v; });   // the one switch reaches every placed graphic
      pTint = null; renderAll();
    }
  });
  $('#lib').addEventListener('pointerdown', e => { if (e.target.matches('input[type=range]')) mark(); });
  $('#lib').addEventListener('input', e => {
    const k = e.target.dataset.br; if (!k) return;
    P.brand[k] = +e.target.value; pTint = null;
    const o = $('#lib [data-out="' + k + '"]'); if (o) o.textContent = e.target.value + (e.target.dataset.unit || '');
    dirty = true; save();
  });
  $('#fileIn').addEventListener('change', e => {
    const files = e.target.files; if (!files.length) return;
    if (upWant === 'partner') {
      const f = files[0], rd = new FileReader();
      rd.onload = () => {
        const l = { id: 'own-' + uid(), name: f.name.replace(/\.[^.]+$/, ''), u: rd.result };
        let own = []; try { own = JSON.parse(localStorage.getItem(LKEY) || '[]'); } catch (x) {}
        own.push(l); try { localStorage.setItem(LKEY, JSON.stringify(own)); } catch (x) { toast('That logo is too large to keep in the list; it is used for this video only.'); }
        mark(); P.brand.partner = l; P.brand.on = true; partnerLoad(); renderAll();
      };
      rd.readAsDataURL(f);
    } else addFiles(files, upWant);
  });
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; renderLib(); } });

  // ── right rail: the selected item ────────────────────────────────────────────────────
  function renderInspector() {
    const it = find(sel), el = $('#insp'); let h = '';
    const seg = (k, opts) => '<div class="vs-seg">' + opts.map(o => '<button data-k="' + k + '" data-v="' + o[0] + '"' + (String(it[k]) === String(o[0]) ? ' data-on="1"' : '') + '>' + o[1] + '</button>').join('') + '</div>';
    const f = (label, body) => '<div class="vs-f"><label>' + label + '</label>' + body + '</div>';
    const timing = () => '<div class="vs-sec"><span class="vs-h">Timing</span><div class="vs-two">' +
      f('Starts at', '<input class="p-in" type="number" data-n="at" min="0" step="0.1" value="' + it.at.toFixed(2) + '">') +
      f('Lasts', '<input class="p-in" type="number" data-n="dur" min="0.2" step="0.1" value="' + it.dur.toFixed(2) + '">') + '</div></div>';
    if (!it) {
      h = '<div class="vs-sec"><span class="vs-h">' + G().name + ' · ' + G().w + ' × ' + G().h + '</span>' +
        '<span class="vs-note">Select anything on the timeline to edit it here.</span></div>' +
        '<div class="vs-sec"><span class="vs-h">How to cut</span><span class="vs-note">Move the playhead and press <b>S</b> (or the scissors) to cut the clip under it. Drag a clip\'s edge to trim, drag its body to reorder, <b>⌫</b> to delete. The video track closes its own gaps.</span></div>' +
        '<div class="vs-sec"><span class="vs-h">Keys</span><span class="vs-note">Space play · S cut · ⌫ delete · ⌘D duplicate · ⌘Z undo · ← → one frame (⇧ one second) · ⌘ scroll to zoom the timeline</span></div>' +
        '<div class="vs-sec"><button class="p-ghost" id="clearBtn">Start a new video</button></div>';
    } else if (sel.kind === 'clip') {
      const m = media[it.mid] || {}, vid = m.kind === 'video';
      h = '<div class="vs-sec"><span class="vs-h">' + (vid ? 'Video clip' : 'Photo clip') + '</span><span class="vs-note">' + esc(m.name) + ' · ' + fmt(clipLen(it)) + (vid ? ' of ' + fmt(m.dur) : '') + '</span></div>';
      if (vid) h += '<div class="vs-sec"><span class="vs-h">Sound</span>' + seg('mute', [[false, 'On'], [true, 'Muted']]) + (it.mute ? '' : rng('i', 'vol', 'Volume', Math.round(it.vol * 100), 0, 150, '%')) + '</div>';
      else {
        h += '<div class="vs-sec"><span class="vs-h">Timing</span>' + f('Lasts', '<input class="p-in" type="number" data-n="out" min="0.2" step="0.1" value="' + it.out.toFixed(2) + '">') + '</div>';
        const j = it.job, busy = j && (j.status === 'queued' || j.status === 'working');
        h += '<div class="vs-sec"><span class="vs-h">Animate with Higgsfield</span>' +
          '<div class="vs-mvs" role="radiogroup" aria-label="Camera move">' + MOVES.map(m => '<button class="vs-mv" role="radio" data-mv="' + m[0] + '"' + (it.move === m[0] ? ' data-on="1"' : '') + (busy ? ' disabled' : '') + '>' + m[1] + '</button>').join('') + '</div>' +
          f('Length', '<div class="vs-seg">' + [5, 8, 10].map(d => '<button data-gd="' + d + '"' + ((it.genDur || 5) === d ? ' data-on="1"' : '') + (busy ? ' disabled' : '') + '>' + d + ' s</button>').join('') + '</div>') +
          f('Model', '<div class="vs-seg">' + [['cinema', 'Cinema Studio'], ['seedance', 'Seedance 2.5']].map(q => '<button data-gm="' + q[0] + '"' + ((it.genModel || 'cinema') === q[0] ? ' data-on="1"' : '') + (busy ? ' disabled' : '') + '>' + q[1] + '</button>').join('') + '</div>') +
          f('Quality', '<div class="vs-seg">' + [['std', 'Draft 720p'], ['pro', 'Full 1080p']].map(q => '<button data-gq="' + q[0] + '"' + ((it.genMode || 'std') === q[0] ? ' data-on="1"' : '') + (busy ? ' disabled' : '') + '>' + q[1] + '</button>').join('') + '</div>') +
          '<span class="vs-note">About ' + ((it.genDur || 5) * (it.genModel === 'seedance' ? (it.genMode === 'pro' ? 16 : 7) : (it.genMode === 'pro' ? 1.5 : 1))) + ' credits. Claude confirms the exact cost before it generates.</span>' +
          f('Extra direction', '<input class="p-in" data-s="moveNote" value="' + esc(it.moveNote || '') + '" placeholder="Optional, e.g. golden hour light"' + (busy ? ' disabled' : '') + '>') +
          (busy ? '<span class="vs-note"><b>' + (j.status === 'working' ? 'Generating…' : 'In the queue.') + '</b> ' + (j.status === 'working' ? 'The clip swaps in here when it is ready.' : 'Run <b>/animate-photos</b> in Claude to generate it.') + '</span><button class="p-ghost p-sm" id="animCancel">Take it off the queue</button>'
            : (j && j.status === 'failed' ? '<span class="vs-note"><b>That did not work:</b> ' + esc(j.error || 'no reason given') + '</span>' : '') +
              '<button class="p-btn p-sm" id="animBtn"' + (it.move ? '' : ' disabled') + '>Send to the animate queue</button>' +
              '<span class="vs-note">' + (it.move ? 'Sends the photo as it is framed here. Then run <b>/animate-photos</b> in Claude; it spends Higgsfield credits and shows the cost first.' : 'Pick a camera move first.') + '</span>') +
          '</div>';
      }
      h += '<div class="vs-sec"><span class="vs-h">Framing</span>' + seg('fit', [['fill', 'Fill the frame'], ['fit', 'Fit inside']]) +
        rng('i', 'z', 'Zoom', it.z, 100, 300, '%') + rng('i', 'fx', 'Left to right', it.fx, 0, 100, '') + rng('i', 'fy', 'Top to bottom', it.fy, 0, 100, '') + '</div>';
    } else if (sel.kind === 'audio') {
      const m = media[it.mid] || {};
      h = '<div class="vs-sec"><span class="vs-h">Audio</span><span class="vs-note">' + esc(m.name) + '</span>' + seg('track', [['music', 'Music'], ['sfx', 'Sound']]) + '</div>' +
        '<div class="vs-sec"><span class="vs-h">Level</span>' + rng('i', 'vol', 'Volume', Math.round(it.vol * 100), 0, 150, '%') +
        rng('i', 'fi', 'Fade in', it.fi, 0, 5, 's', .1) + rng('i', 'fo', 'Fade out', it.fo, 0, 5, 's', .1) + '</div>' + timing();
    } else if (sel.kind === 'text') {
      h = '<div class="vs-sec"><span class="vs-h">Text</span>' +
        f('Eyebrow', '<input class="p-in" data-s="eyebrow" value="' + esc(it.eyebrow) + '" placeholder="Optional, set in caps">') +
        '<div class="vs-f"><label>Headline <button class="vs-hi" data-hi="text" title="Paint the selected words, or the word under the caret, in brass. Press again to remove."><i></i>Brass highlight</button></label><textarea class="p-in" data-s="text" rows="3">' + esc(it.text) + '</textarea></div>' +
        f('Line under it', '<textarea class="p-in" data-s="sub" rows="2" placeholder="Optional">' + esc(it.sub) + '</textarea>') + '</div>' +
        '<div class="vs-sec"><span class="vs-h">Layout</span>' + f('Size', seg('size', ART.order.map(s => [s, s]))) +
        f('Position', seg('pos', [['top', 'Top'], ['centre', 'Centre'], ['bottom', 'Bottom']])) + f('Alignment', seg('align', [['left', 'Left'], ['centre', 'Centre']])) +
        rng('i', 'scrim', 'Wash under the text', it.scrim, 0, 100, '%') + '</div>' +
        '<div class="vs-sec"><span class="vs-h">Effect</span><select class="p-in" data-s="anim" style="width:100%">' + ANIMS.map(a => '<option value="' + a[0] + '"' + (it.anim === a[0] ? ' selected' : '') + '>' + a[1] + '</option>').join('') + '</select>' +
        '<button class="p-ghost p-sm" id="previewBtn">Play this text</button></div>' + timing();
    } else {
      const m = media[it.mid] || {};
      h = '<div class="vs-sec"><span class="vs-h">Graphic</span><span class="vs-note">' + esc(m.name) + ' — drag it on the canvas to move it.</span>' +
        rng('i', 'w', 'Size', it.w, 5, 100, '%') + rng('i', 'op', 'Opacity', it.op, 10, 100, '%') +
        f('Colour', seg('tint', [['match', 'Match wordmark'], ['orig', 'Original']])) +
        f('Fades in and out', seg('fade', [[true, 'Yes'], [false, 'No']])) +
        '<div class="vs-two"><button class="p-ghost p-sm" data-place="50,50">Centre it</button><button class="p-ghost p-sm" data-place="corner">Bottom corner</button></div></div>' + timing();
    }
    if (it) h += '<div class="vs-sec"><div class="vs-two"><button class="p-ghost p-sm" id="iDup">Duplicate</button><button class="p-danger p-sm" id="iDel">Delete</button></div></div>';
    el.innerHTML = h;
  }
  const insp = $('#insp');
  insp.addEventListener('pointerdown', e => { if (e.target.matches('input[type=range]')) mark(); });
  insp.addEventListener('focusin', e => { if (e.target.matches('input:not([type=range]),textarea,select')) mark(); });
  insp.addEventListener('input', e => {
    const it = find(sel), d = e.target.dataset; if (!it) return;
    if (d.ir) {
      let v = +e.target.value; const k = d.ir;
      const o = insp.querySelector('[data-out="' + k + '"]'); if (o) o.textContent = e.target.value + (d.unit || '');
      it[k] = k === 'vol' ? v / 100 : v;
    } else if (d.s) { it[d.s] = e.target.value; }
    else if (d.n) {
      const v = parseFloat(e.target.value); if (!isFinite(v)) return;
      const m = media[it.mid];
      if (d.n === 'at') it.at = Math.max(0, v);
      else if (d.n === 'dur') it.dur = clamp(v, .2, sel.kind === 'audio' && m ? m.dur - it.in : 600);
      else if (d.n === 'out') it.out = clamp(v, .2, 120);
    } else return;
    dirty = true; save(); renderTimeline();
  });
  insp.addEventListener('click', e => {
    const it = find(sel), b = e.target.closest('button'); if (!b) return;
    if (b.id === 'clearBtn') {
      if (!total() || confirm('Clear the timeline and start a new video? Uploaded files stay in the library.')) { mark(); const keep = P.size; P = fresh(); P.size = keep; sel = null; T = 0; partnerLoad(); renderAll(); }
      return;
    }
    if (!it) return;
    if (b.dataset.mv) { mark(); it.move = b.dataset.mv; renderAll(); return; }
    if (b.dataset.gd) { mark(); it.genDur = +b.dataset.gd; renderAll(); return; }
    if (b.dataset.gm) { mark(); it.genModel = b.dataset.gm; renderAll(); return; }
    if (b.dataset.gq) { mark(); it.genMode = b.dataset.gq; renderAll(); return; }
    if (b.id === 'animBtn') return animSend(it);
    if (b.id === 'animCancel') return animCancel(it);
    if (b.dataset.hi) {                       // wrap the selection (or the word under the caret) in the marker, or unwrap it
      const ta = insp.querySelector('[data-s="' + b.dataset.hi + '"]'), v = ta.value; let a = ta.selectionStart, z = ta.selectionEnd;
      if (a === z) { while (a > 0 && !/[\s*]/.test(v[a - 1])) a--; while (z < v.length && !/[\s*]/.test(v[z])) z++; }
      if (a === z) return;
      mark(); let nv, na, nz;
      if (v.slice(a - 2, a) === '**' && v.slice(z, z + 2) === '**') { nv = v.slice(0, a - 2) + v.slice(a, z) + v.slice(z + 2); na = a - 2; nz = z - 2; }
      else if (v.slice(a, a + 2) === '**' && v.slice(z - 2, z) === '**' && z - a >= 4) { nv = v.slice(0, a) + v.slice(a + 2, z - 2) + v.slice(z); na = a; nz = z - 4; }
      else { nv = v.slice(0, a) + '**' + v.slice(a, z) + '**' + v.slice(z); na = a + 2; nz = z + 2; }
      it[b.dataset.hi] = nv; ta.value = nv; ta.focus(); ta.setSelectionRange(na, nz);
      dirty = true; save(); renderTimeline(); return;
    }
    if (b.id === 'iDel') return del();
    if (b.id === 'iDup') return dup();
    if (b.id === 'previewBtn') { seek(it.at); play(); const stopAt = it.at + it.dur; const iv = setInterval(() => { if (!playing || T >= stopAt) { clearInterval(iv); if (playing) pause(); } }, 40); return; }
    if (b.dataset.place) {
      mark(); const g = G();
      if (b.dataset.place === 'corner') { it.x = (g.w - g.r) / g.w * 100 - it.w / 2; it.y = (g.h - g.b) / g.h * 100 - 4; } else { it.x = 50; it.y = 50; }
      renderAll(); return;
    }
    if (b.dataset.k) {
      mark(); const v = b.dataset.v; it[b.dataset.k] = v === 'true' ? true : v === 'false' ? false : v;
      renderAll();
    }
  });

  // ── export: the canvas and the mix are recorded as the video plays ───────────────────
  let rec = null, recDest = null, recCancel = false;
  function exportVideo() {
    if (!total()) { toast('Add a video first.'); return; }
    if (!window.MediaRecorder || !cv.captureStream) { toast('This browser cannot record video. Use Chrome.'); return; }
    const mime = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
    ensureCtx(); pause(); sel = null; renderAll(); seek(0); recCancel = false;
    $('#ov').dataset.on = '1'; $('#ovP').style.width = '0';
    const start = () => {
      const stream = cv.captureStream(30); recDest = actx.createMediaStreamDestination(); master.connect(recDest);
      recDest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
      const chunks = []; rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12000000, audioBitsPerSecond: 192000 });
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        try { master.disconnect(recDest); } catch (e) {}
        stream.getTracks().forEach(t => t.stop());
        exporting = false; delete $('#ov').dataset.on; rec = null;
        if (recCancel) return;
        const ext = mime.indexOf('mp4') > 0 ? 'mp4' : 'webm', a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(chunks, { type: mime.split(';')[0] }));
        a.download = 'provident-video_' + P.size + '.' + ext; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 60000);
        toast('Saved ' + a.download + ' to Downloads.');
      };
      exporting = true; rec.start(500); play();
    };
    // wait for the first frame to be decoded before recording
    let n = 0; const wait = () => { sync(); const a = clipAt(0), el = a && vel[a.c.id]; if (!el || (el.readyState >= 2 && !el.seeking) || n++ > 80) { draw(); start(); } else setTimeout(wait, 50); };
    wait();
  }
  function finishExport() { setTimeout(() => { if (rec && rec.state !== 'inactive') rec.stop(); }, 200); }
  setInterval(() => { if (exporting) $('#ovP').style.width = (T / Math.max(.01, total()) * 100) + '%'; }, 120);
  $('#ovX').addEventListener('click', () => { recCancel = true; pause(); if (rec && rec.state !== 'inactive') rec.stop(); else { exporting = false; delete $('#ov').dataset.on; } });
  function saveFrame() {
    sync(); draw();
    cv.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'provident-video_' + P.size + '_frame.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 30000); }, 'image/png');
  }

  // ── animate queue: a photo clip goes out as the frame it shows; the finished video comes back ──
  // The local server keeps the queue in `_animate/`; the animate-photos skill (Claude, talking to
  // Higgsfield) works through it. The studio never talks to Higgsfield itself.
  const api = (path, body) => fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined).then(r => r.json());
  async function animSend(c) {
    const m = media[c.mid], mv = MOVES.find(x => x[0] === c.move); if (!m || !mv) return;
    const im = imgFor(m); if (!im.complete || !im.naturalWidth) { toast('The photo is still loading. Try again in a moment.'); return; }
    // the start frame is the photo exactly as this clip frames it, at the video's size
    const g = G(), k = document.createElement('canvas'); k.width = g.w; k.height = g.h;
    const x = k.getContext('2d'); x.fillStyle = ART.ground; x.fillRect(0, 0, g.w, g.h);
    const fill = c.fit !== 'fit', sc = (fill ? Math.max(g.w / im.naturalWidth, g.h / im.naturalHeight) : Math.min(g.w / im.naturalWidth, g.h / im.naturalHeight)) * (c.z || 100) / 100;
    const dw = im.naturalWidth * sc, dh = im.naturalHeight * sc;
    x.drawImage(im, (g.w - dw) * (c.fx == null ? 50 : c.fx) / 100, (g.h - dh) * (c.fy == null ? 50 : c.fy) / 100, dw, dh);
    const id = uid() + uid().slice(0, 3);
    const prompt = MOVE_BASE.replace('{move}', mv[2]) + (c.moveNote ? ' ' + String(c.moveNote).trim() : '');
    try {
      const r = await api('/api/animate/job', { id, name: m.name, move: mv[1], prompt, duration: c.genDur || 5, model: c.genModel === 'seedance' ? 'seedance_2_5' : 'cinematic_studio_video_v2', mode: c.genMode === 'pro' ? 'pro' : 'std', aspect: P.size === '1x1' ? '1:1' : '9:16', photo: k.toDataURL('image/jpeg', .92) });
      if (r.error) throw new Error(r.error);
      mark(); c.job = { id, status: 'queued' }; renderAll(); animWatch();
      toast('Queued. Run /animate-photos in Claude to generate it.');
    } catch (e) { toast('Could not reach the local server\'s animate queue (' + e.message + ').'); }
  }
  async function animCancel(c) {
    if (!c.job) return;
    try { await api('/api/animate/cancel', { id: c.job.id }); } catch (e) {}
    delete c.job; renderAll();
  }
  let animT = 0;
  function animWatch() {
    clearTimeout(animT);
    if (!P.clips.some(c => c.job && (c.job.status === 'queued' || c.job.status === 'working'))) return;
    animT = setTimeout(animPoll, 4000);
  }
  async function animPoll() {
    let jobs = [];
    try { jobs = (await api('/api/animate/jobs')).jobs || []; } catch (e) { return animWatch(); }
    let changed = false;
    for (const c of P.clips) {
      if (!c.job || c.job.status === 'failed') continue;
      const j = jobs.find(x => x.id === c.job.id);
      if (!j) { delete c.job; changed = true; continue; }                   // taken off the queue elsewhere
      if (j.status === 'done' && j.video) {
        try {
          const blob = await (await fetch('/_animate/' + j.video)).blob();
          const rec = { id: uid(), kind: 'video', name: (media[c.mid] ? media[c.mid].name : 'Photo') + ' · ' + (j.move || 'animated'), blob: new File([blob], j.video, { type: 'video/mp4' }) };
          await probe(rec); media[rec.id] = rec;
          DB.put({ id: rec.id, kind: rec.kind, name: rec.name, blob: rec.blob, dur: rec.dur, w: rec.w, h: rec.h, poster: rec.poster });
          // the video takes the photo's place on the timeline, whole and unreframed (it was generated at this size)
          Object.assign(c, { mid: rec.id, in: 0, out: rec.dur, fit: 'fill', z: 100, fx: 50, fy: 50, mute: true });
          delete c.job; changed = true;
          api('/api/animate/placed', { id: j.id }).catch(() => {});
          toast('The animated clip is on the timeline.');
        } catch (e) { c.job = { id: j.id, status: 'failed', error: 'the finished video could not be loaded' }; changed = true; }
      } else if (j.status !== c.job.status) {
        c.job = j.status === 'failed' ? { id: j.id, status: 'failed', error: j.error } : { id: j.id, status: j.status }; changed = true;
      }
    }
    if (changed) renderAll();
    animWatch();
  }

  // ── placement preview (CAS's phone frames and app chrome; see tools/video-dev/build-preview.py) ──
  const PV = window.providentVideoPreview || {};
  let pvOn = false, pvPlat = 'fb', pvMode = 'dark', pvShots = [];
  const pv = document.createElement('div'); pv.className = 'mk-ov'; pv.hidden = true; document.body.appendChild(pv);
  function pvCopy() {
    const t = P.texts[0] || {}, fb = pvPlat === 'fb';
    return {
      page: 'Provident Real Estate', handle: 'providentestate', domain: 'providentestate.com',
      primary: plain(t.sub || t.text || 'Your primary text sits here, above the video.').replace(/\n+/g, ' '),
      headline: plain(t.text || 'Headline').replace(/\n+/g, ' '), desc: 'providentestate.com', cta: 'Learn more',
      story: fb ? 'Provident Real Estate' : 'providentestate', mode: pvMode
    };
  }
  function pvRender() {
    const g = G(), c = pvCopy(), sq = P.size === '1x1';
    // all three placements, whichever size the video is: a 9:16 in the feed is cropped to 4:5, as Meta
    // does; a 1:1 in Reels and Stories sits in the middle of the screen
    const phones = [['feed', 'Feed', sq ? '1:1 · 1080 × 1080' : '4:5 crop of the 9:16'], ['reel', 'Reels', sq ? '1:1 centred' : '9:16 · 1080 × 1920'], ['story', 'Story', sq ? '1:1 centred' : '9:16 · 1080 × 1920']];
    const seg = (cur, opts, k) => opts.map(o => '<button data-pv="' + k + '" data-v="' + o[0] + '"' + (cur === o[0] ? ' data-on="1"' : '') + ' role="radio">' + o[1] + '</button>').join('');
    pv.innerHTML = '<div class="mk-bar"><b>Placement preview</b>' +
      '<div class="p-seg mk-seg" role="radiogroup" aria-label="Platform">' + seg(pvPlat, [['fb', 'Facebook'], ['ig', 'Instagram']], 'plat') + '</div>' +
      '<s>' + (sq ? 'Feed 1:1 · centred in Reels and Story' : 'Reels and Story 9:16 · Feed crops to 4:5') + '</s>' +
      '<div class="p-seg mk-seg" role="radiogroup" aria-label="Phone appearance" title="The phone\'s own appearance. Reels and Stories stay dark in both apps.">' + seg(pvMode, [['light', 'Light'], ['dark', 'Dark']], 'mode') + '</div>' +
      '<span class="vs-sp"></span><button class="p-ghost" data-pv="play">' + ico(playing ? 'pause' : 'play_arrow') + (playing ? 'Pause' : 'Play') + '</button>' +
      '<button class="p-ghost" data-pv="close">Close ' + ico('close') + '</button></div>' +
      '<div class="mk-stage"><div class="mk-row">' + phones.map(p =>
        '<figure class="mk-fig"><figcaption><b>' + p[1] + '</b><s>' + p[2] + '</s></figcaption>' +
        (PV[pvPlat + ':' + p[0]] || '').replace(/\[\[([a-z]+)\]\]/g, (m, k) => esc(c[k] || '')) + '</figure>').join('') + '</div>' +
      '<div class="mk-note">The video plays here exactly as it exports, only smaller. A Reel is cover-cropped and loses a little of its width at each side; a Story is shown whole; a 9:16 video in the feed is cropped to 4:5. The app chrome is drawn here, with no Meta logo art.</div></div>';
    pvShots = Array.from(pv.querySelectorAll('canvas.mk-shot'));
    pvShots.forEach(k => {
      const feed = !!k.closest('[data-view="feed"]');
      k.width = 540; k.height = feed ? (sq ? 540 : 675) : 960;
    });
    pvMirror();
  }
  function pvMirror() {
    if (!pvOn) return;
    pvShots.forEach(k => {
      const x = k.getContext('2d'), s = Math.max(k.width / cv.width, k.height / cv.height), fit = Math.min(k.width / cv.width, k.height / cv.height);
      if (k.height < 900) { const w = cv.width * s, h = cv.height * s; x.drawImage(cv, (k.width - w) / 2, (k.height - h) / 2, w, h); }   // feed: cover
      else { const w = cv.width * fit, h = cv.height * fit; if (h < k.height) { x.fillStyle = '#000'; x.fillRect(0, 0, k.width, k.height); } x.drawImage(cv, (k.width - w) / 2, (k.height - h) / 2, w, h); }
    });
  }
  function pvOpen() { if (!total()) { toast('Add a video first.'); return; } pvOn = true; pv.hidden = false; sel = null; renderAll(); pvRender(); }
  function pvClose() { pvOn = false; pv.hidden = true; if (playing) pause(); }
  pv.addEventListener('click', e => {
    const b = e.target.closest('[data-pv]'); if (!b) return;
    const k = b.dataset.pv;
    if (k === 'close') return pvClose();
    if (k === 'play') { playing ? pause() : play(); }
    else if (k === 'plat') pvPlat = b.dataset.v; else if (k === 'mode') pvMode = b.dataset.v;
    pvRender();
  });

  // ── chrome wiring ────────────────────────────────────────────────────────────────────
  function renderAll() {
    $('#sizeSeg').querySelectorAll('button').forEach(b => { if (b.dataset.size === P.size) b.dataset.on = '1'; else delete b.dataset.on; });
    $('#empty').style.display = total() ? 'none' : '';
    $('#undoBtn').disabled = !undo.length; $('#redoBtn').disabled = !redo.length;
    $('#delBtn').disabled = $('#dupBtn').disabled = !find(sel);
    T = clamp(T, 0, Math.max(0, total()));
    renderLib(); renderInspector(); renderTimeline(); dirty = true; save();
  }
  $('#undoBtn').innerHTML = ico('undo'); $('#redoBtn').innerHTML = ico('redo'); $('#splitBtn').innerHTML = ico('content_cut');
  $('#dupBtn').innerHTML = ico('content_copy'); $('#delBtn').innerHTML = ico('delete'); $('#homeBtn').innerHTML = ico('skip_previous');
  $('#safeBtn').innerHTML = ico('smartphone');
  $('#safeBtn').addEventListener('click', () => { showSafe = !showSafe; $('#safeBtn').setAttribute('aria-pressed', showSafe); if (showSafe) guideShow(); else guideHide(); });
  $('#zoIc').innerHTML = ico('zoom_out'); $('#ziIc').innerHTML = ico('zoom_in');
  $('#frameBtn').innerHTML = ico('photo_camera') + 'Save frame'; $('#exportBtn').innerHTML = ico('download') + 'Export video';
  function paintTheme() { const light = document.documentElement.dataset.theme === 'light'; $('#themeBtn').innerHTML = ico(light ? 'dark_mode' : 'light_mode'); }
  if (localStorage.getItem(TKEY) === 'light') document.documentElement.dataset.theme = 'light';
  $('#themeBtn').addEventListener('click', () => {
    const r = document.documentElement; if (r.dataset.theme === 'light') delete r.dataset.theme; else r.dataset.theme = 'light';
    localStorage.setItem(TKEY, r.dataset.theme || 'dark'); paintTheme();
  });
  $('#sizeSeg').addEventListener('click', e => { const b = e.target.closest('[data-size]'); if (b && b.dataset.size !== P.size) { mark(); P.size = b.dataset.size; pTint = null; fitCanvas(); renderAll(); } });
  $('#undoBtn').addEventListener('click', () => restore(undo, redo)); $('#redoBtn').addEventListener('click', () => restore(redo, undo));
  $('#splitBtn').addEventListener('click', split); $('#delBtn').addEventListener('click', del); $('#dupBtn').addEventListener('click', dup);
  $('#homeBtn').addEventListener('click', () => { seek(0); tl.scrollLeft = 0; });
  $('#playBtn').addEventListener('click', () => (playing ? pause() : play()));
  $('#previewBtn2').innerHTML = ico('visibility') + 'Preview'; $('#previewBtn2').addEventListener('click', pvOpen);
  $('#exportBtn').addEventListener('click', exportVideo); $('#frameBtn').addEventListener('click', saveFrame);
  $('#zoom').addEventListener('input', e => { pps = +e.target.value; renderTimeline(); });
  window.addEventListener('resize', () => { fitCanvas(); renderTimeline(); });
  document.addEventListener('keydown', e => {
    if (exporting) return;
    const tg = e.target, typing = tg.matches && tg.matches('input:not([type=range]),textarea,select');
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? restore(redo, undo) : restore(undo, redo); return; }
    if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); dup(); return; }
    if (typing || mod) return;
    if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
    else if (e.key.toLowerCase() === 's') split();
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); del(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); if (playing) pause(); seek(T + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 1 : 1 / 30)); }
    else if (e.key === 'Home') seek(0);
    else if (e.key === 'Escape' && pvOn) pvClose();
    else if (e.key === 'Escape' && sel) { sel = null; renderAll(); }
  });
  // files dropped anywhere on the page
  const stage = $('#cvw');
  document.addEventListener('dragover', e => { if (e.dataTransfer && Array.from(e.dataTransfer.types).indexOf('Files') >= 0) e.preventDefault(); });
  document.addEventListener('drop', e => {
    if (!e.dataTransfer || !e.dataTransfer.files.length) return;
    e.preventDefault();
    addFiles(e.dataTransfer.files, stage.contains(e.target) || tl.contains(e.target) ? 'stage' : (tab === 'logos' ? 'logo' : tab));
  });

  // ── boot ─────────────────────────────────────────────────────────────────────────────
  (async function boot() {
    paintTheme(); paintTransport(); fitCanvas(); partnerLoad(); renderAll();
    const recs = await DB.all();
    for (const r of recs || []) { try { await probe(r); media[r.id] = r; } catch (e) {} }
    const ok = i => !!media[i.mid];
    P.clips = P.clips.filter(ok); P.audio = P.audio.filter(ok); P.logos = P.logos.filter(ok);
    if (document.fonts && document.fonts.load) { try { await Promise.all([300, 400, 500].map(w => document.fonts.load(w + " 40px 'Google Sans Flex'"))); } catch (e) {} }
    fitCanvas(); renderAll(); animWatch();
    requestAnimationFrame(tick);
  })();

  // a small handle for tests and the console
  window.VideoStudio = { get project() { return P; }, get time() { return T; }, media, stats, addFiles, seek, play, pause, split, total, draw: () => { sync(); draw(); } };
})();
