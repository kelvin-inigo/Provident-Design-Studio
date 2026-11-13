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
    // 2026-11-13, by request: the thumbnail's leading is too tight on a wrapped headline at the smaller
    // sizes. Per text (`lead`); unset = Normal at Small and Medium, Tight (the thumbnail's) above.
    leads: { tight: 158 / 168, normal: 1.1, open: 1.26 },
    // 2026-11-13, by request: Small was too big. Now steps of the x1.2 scale (59.7, 86, 123.8), with
    // the Reel thumbnail's 168 kept as the top size. Was 116.7 / 140 / 168 / 201.6.
    sizes: { Small: 59.7, Medium: 86, Large: 123.8, Jumbo: 168 },
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
  const MOVE_BASE = 'Photorealistic real estate footage from this exact photograph. Camera: {move}. Keep the architecture, layout, furniture, materials and proportions exactly as in the image. Do not add people, objects, text or logos, and do not warp or morph anything. Only gentle natural motion: light, foliage, water, curtains. Stable, smooth, cinematic, no cuts. Add natural sound of the environment in each scene, every interaction with the environment, accurate sound details.';   // the sound line: user, 2026-11-13
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

  let cv = $('#cv'), cx = cv.getContext('2d');   // let: the preview paints the Square into its own canvas through the same draw() (pvSquare)
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
  // ── shot markers: where the picture cuts INSIDE one continuous video ─────────────────────
  // The file is played once, muted and fast, into a 36x64 canvas; a frame that differs from the
  // one before by far more than the video's usual motion is a cut. Kept on the media record
  // (`cuts`, in the file's own seconds) so it is found once. Other layers and the playhead snap
  // to these (edges()), which is the point: text and sound can be lined up with the edit.
  async function findCuts(rec) {
    if (!rec || rec.kind !== 'video' || (rec.cuts && rec.cutsV === 2) || rec._cutting || exporting) return;   // never scan during an export: it plays the file
    rec._cutting = true;
    try {
      const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.src = rec.url;
      v.style.cssText = 'position:fixed;left:0;bottom:0;width:2px;height:2px;opacity:.01;pointer-events:none'; document.body.appendChild(v);
      await once(v, 'canplay');
      if (!v.requestVideoFrameCallback) { v.remove(); rec.cuts = []; rec.cutsV = 2; return; }
      const c = document.createElement('canvas'); c.width = 36; c.height = 64; const x = c.getContext('2d', { willReadFrequently: true });
      let prev = null; const d = [];
      const cb = (now, meta) => {
        x.drawImage(v, 0, 0, 36, 64); const px = x.getImageData(0, 0, 36, 64).data;
        if (prev) { let sum = 0; for (let i = 0; i < px.length; i += 4) sum += Math.abs(px[i] - prev[i]) + Math.abs(px[i + 1] - prev[i + 1]) + Math.abs(px[i + 2] - prev[i + 2]); d.push([meta.mediaTime, sum / (36 * 64 * 3)]); }
        prev = px.slice(); if (!v.ended) v.requestVideoFrameCallback(cb);
      };
      v.requestVideoFrameCallback(cb); v.playbackRate = 2;   // at 3x one real cut of ten was missed
      const done = new Promise(r => { v.onended = r; setTimeout(r, Math.max(8000, (rec.dur || 30) / 2 * 1000 * 2.5)); });
      await v.play(); await done; v.pause(); v.remove();
      const vals = d.map(e => e[1]).sort((p1, p2) => p1 - p2), med = vals[vals.length >> 1] || 0, thr = Math.max(40, med * 5), cuts = [];
      d.forEach(e => { if (e[1] < thr) return; const last = cuts[cuts.length - 1]; if (last && e[0] - last.t < .5) { if (e[1] > last.v) { last.t = e[0]; last.v = e[1]; } } else cuts.push({ t: e[0], v: e[1] }); });
      rec.cutsV = 2; rec.cuts = cuts.map(k => Math.round(k.t * 100) / 100).filter(t => t > .2 && t < (rec.dur || 1e9) - .2);
      DB.put({ id: rec.id, kind: rec.kind, name: rec.name, blob: rec.blob, dur: rec.dur, w: rec.w, h: rec.h, poster: rec.poster, cuts: rec.cuts, cutsV: 2 });
      renderTimeline();
    } catch (e) {} finally { rec._cutting = false; }
  }
  // marker times on the timeline: each cut that falls inside the part of a clip that is used
  function markers() {
    const out = [], st = clipStarts();
    P.clips.forEach((c, i) => { const m = media[c.mid]; if (m && m.cuts) m.cuts.forEach(t => { if (t > c.in + .05 && t < c.out - .05) out.push(st[i] + t - c.in); }); });
    return out;
  }
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
      if (tg.kind === 'audio') { nb.in = it.in + d * (it.rate || 1); it.fo = 0; nb.fi = 0; }
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
      // just finished: hold its last frame, the next clip's transition draws it underneath
      if (!on && T >= st[i] + len && T - (st[i] + len) < 1.6 && !el.seeking && Math.abs(el.currentTime - (c.out - .04)) > .15) el.currentTime = Math.max(c.in, c.out - .04);
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
      const r = a.rate || 1;                 // speed: the timeline length covers dur * rate seconds of the file, pitch kept
      if (el.playbackRate !== r) { el.playbackRate = r; try { el.preservesPitch = true; } catch (e) {} }
      drive(el, a.in + rel * r, on && playing, g);
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
    markers().forEach(t => c.push(t));
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
      if (tx.eyebrow) { setFont(eb, 500, .1); y += eb; rows.push({ s: plain(tx.eyebrow).toUpperCase(), px: eb, wt: 500, tr: .1, y }); y += Math.max(px * .2, eb * .8); }   // 2026-11-13: was px * .16, which closed up at the smaller sizes
      if (tx.text) {
        setFont(px, 400, ART.headTrack);
        wrapHi(tx.text, maxW).forEach((ln, i) => { y += i ? px * ART.leads[leadOf(tx)] : px * .8; rows.push(Object.assign(ln, { px, wt: 400, tr: ART.headTrack, y, head: 1 })); });
      }
      if (tx.sub) {
        setFont(sb, 300, 0); y += Math.max(px * .26, sb * .7);   // was px * .22
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
  // A graphic has its own place and size in each size. x / y / w are the 9:16's; the Square's live in
  // `sq` once it is moved or resized there. Until then the Square derives them: the same place, at
  // 1080/1920 of the width, so two graphics stacked on the Reel do not land on each other (their gap
  // is a share of the HEIGHT, which is 56% as tall on the Square, while widths stayed the same).
  const SQW = 1080 / 1920;
  function lgeo(l) { return P.size === '1x1' ? (l.sq || { x: l.x, y: l.y, w: l.w * SQW }) : l; }                    // to read
  function lgeoW(l) { if (P.size !== '1x1') return l; if (!l.sq) l.sq = { x: l.x, y: l.y, w: Math.round(l.w * SQW * 10) / 10 }; return l.sq; }   // to write
  function drawLogo(l) {
    const m = media[l.mid]; if (!m) return;
    const im = imgFor(m); if (!im.complete || !im.naturalWidth) return;
    const g = G(), q = lgeo(l), rel = T - l.at, w = g.w * q.w / 100, h = w * im.naturalHeight / im.naturalWidth;
    const x = g.w * q.x / 100 - w / 2, y = g.h * q.y / 100 - h / 2;
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

  // ── captions: a voiceover's script, a few words at a time, in step with the speech ──────────
  // No transcription service. The script is the user's; the timing comes from the audio's own
  // loudness (media.peaks, 40 a second): words are spread across the SPOKEN stretches in
  // proportion to their length, so pauses hold the caption and fast passages speed it up. It is
  // an estimate, usually within a word; capShift nudges it. Times are in the file's own seconds.
  function leadOf(tx) { return ART.leads[tx.lead] ? tx.lead : (tx.size === 'Small' || tx.size === 'Medium' ? 'normal' : 'tight'); }
  const CAP = { sizes: { S: 34.6, M: 41.5, L: 49.8 }, wt: 500, tr: .02, lead: 1.18, padX: 26, padY: 14, r: 18, pill: .78 };
  const capCache = {};
  function capTiming(a) {
    const m = media[a.mid], txt = String(a.cap || '').trim(); if (!m || !txt) return null;
    const n = Math.max(1, Math.min(3, +a.capN || 2)), sig = a.mid + '|' + n + '|' + (m.peaks ? m.peaks.length : 0) + '|' + txt;
    const c = capCache[a.id]; if (c && c.sig === sig) return c;
    const words = txt.split(/\s+/).filter(Boolean), dur = m.dur || 1;
    const pk = m.peaks && m.peaks.length > 8 ? m.peaks : null, N = pk ? pk.length : Math.ceil(dur * 40), per = dur / N;
    let voiced = new Array(N).fill(true);
    if (pk) {
      const srt = pk.slice().sort((x, y) => x - y), thr = Math.max(.03, srt[Math.floor(N * .95)] * .14);
      voiced = pk.map(v => v > thr);
      for (let i = 0, gap = 0; i < N; i++) {                      // a breath shorter than 0.15 s is still speech
        if (voiced[i]) { if (gap && gap <= 6 && i - gap - 1 >= 0) for (let j = i - gap; j < i; j++) voiced[j] = true; gap = 0; } else gap++;
      }
      if (!voiced.some(Boolean)) voiced.fill(true);
    }
    const cum = [0]; for (let i = 0; i < N; i++) cum.push(cum[i] + (voiced[i] ? 1 : 0));
    // seconds where fraction f of the speech between samples a and b has been spoken
    const at = (a, b, f) => {
      const want = cum[a] + f * (cum[b] - cum[a]); let lo = a, hi = b; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid + 1] > want) hi = mid; else lo = mid + 1; }
      return Math.min(b, lo + (voiced[lo] ? want - cum[lo] : 0)) * per;
    };
    const wOf = w => Math.max(2, w.replace(/[^\p{L}\p{N}]/gu, '').length) + 1;
    // sentences are anchored to the voice's own pauses: with S sentence breaks in the script, the S
    // longest silences are taken as those breaks, unless that would squeeze a sentence absurdly
    const sents = []; let sc = [];
    words.forEach(w => { sc.push(w); if (/[.!?…]["')\]]?$/.test(w)) { sents.push(sc); sc = []; } }); if (sc.length) sents.push(sc);
    let cuts = [];
    if (pk && sents.length > 1) {
      const gaps = []; let st = -1; const first = voiced.indexOf(true), last = voiced.lastIndexOf(true);
      for (let i = first; i <= last; i++) { if (!voiced[i]) { if (st < 0) st = i; } else if (st >= 0) { gaps.push([st, i]); st = -1; } }
      const pick = gaps.filter(g2 => g2[1] - g2[0] >= 12).sort((x, y) => (y[1] - y[0]) - (x[1] - x[0])).slice(0, sents.length - 1).sort((x, y) => x[0] - y[0]);
      if (pick.length === sents.length - 1) {
        const b = [0, ...pick.map(g2 => (g2[0] + g2[1]) >> 1), N], totW = words.reduce((x, w) => x + wOf(w), 0);
        const sane = sents.every((se, k) => { const share = se.reduce((x, w) => x + wOf(w), 0) / totW, got = (cum[b[k + 1]] - cum[b[k]]) / (cum[N] || 1); return got > share / 2.5 && got < share * 2.5; });
        if (sane) cuts = b;
      }
    }
    const ws = [];
    (cuts.length ? sents : [words]).forEach((se, k) => {
      const a0 = cuts.length ? cuts[k] : 0, b0 = cuts.length ? cuts[k + 1] : N, tot = se.reduce((x, w) => x + wOf(w), 0); let acc = 0;
      se.forEach(w => { const t0 = at(a0, b0, acc / tot); acc += wOf(w); ws.push({ w, t0, t1: at(a0, b0, Math.min(1, acc / tot) - 1e-9) }); });
    });
    const groups = []; let cur = [];
    ws.forEach(w => { cur.push(w); if (cur.length >= n || /[.!?…]$/.test(w.w)) { groups.push(cur); cur = []; } });
    if (cur.length) groups.push(cur);
    return capCache[a.id] = { sig, groups: groups.map((g, i) => ({ ws: g, t0: g[0].t0, t1: g[g.length - 1].t1 })) };
  }
  function drawCaption(a) {
    if (!a.capOn || T < a.at || T >= a.at + a.dur) return;
    const c = capTiming(a); if (!c) return;
    const t = a.in + (T - a.at) * (a.rate || 1) - (+a.capShift || 0);
    let gi = -1; for (let i = 0; i < c.groups.length; i++) { if (c.groups[i].t0 <= t) gi = i; else break; }
    if (gi < 0) return;
    const grp = c.groups[gi], nx = c.groups[gi + 1];
    if (t > grp.t1 + .35 && (!nx || nx.t0 - grp.t1 > .8)) return;   // a real pause: clear the screen
    const g = G(), caps = a.capCase !== 'as', words = grp.ws.map(w => { const d = w.w.replace(/[.,;:…]+$/, '') || w.w; return caps ? d.toUpperCase() : d; });   // full stops and commas are not shown
    let px = (CAP.sizes[a.capSize] || CAP.sizes.M), maxW = g.w - g.l - g.r - (a.capStyle === 'pill' ? CAP.padX * 2 : 0);
    setFont(px, CAP.wt, CAP.tr); const sp = () => cx.measureText(' ').width;
    let ww = words.map(w => cx.measureText(w).width), W = ww.reduce((x, y) => x + y, 0) + sp() * (words.length - 1);
    if (W > maxW) { px = px * maxW / W; setFont(px, CAP.wt, CAP.tr); ww = words.map(w => cx.measureText(w).width); W = ww.reduce((x, y) => x + y, 0) + sp() * (words.length - 1); }
    const y0 = g.t, y1 = g.h - g.b, cy = y0 + (y1 - y0) * (a.capY == null ? 90 : +a.capY) / 100, x0 = (g.w - W) / 2;
    cx.save(); cx.textBaseline = 'middle'; cx.textAlign = 'left';
    if (a.capStyle === 'pill') {
      const h = px * CAP.lead + CAP.padY * 2; cx.fillStyle = 'rgba(' + ART.wash + ',' + CAP.pill + ')';
      cx.beginPath(); cx.roundRect(x0 - CAP.padX, cy - h / 2, W + CAP.padX * 2, h, CAP.r); cx.fill();
    } else { cx.shadowColor = 'rgba(' + ART.wash + ',.7)'; cx.shadowBlur = 18; cx.shadowOffsetY = 2; }
    let x = x0; const gap = sp();
    words.forEach((w, i) => {
      const on = a.capHi !== false && a.capHi !== 'false' && t >= grp.ws[i].t0 && (i === words.length - 1 || t < grp.ws[i + 1].t0);
      cx.fillStyle = on && words.length > 1 ? ART.brass : ART.ink; cx.fillText(w, x, cy + px * .04); x += ww[i] + gap;
    });
    cx.restore(); try { cx.letterSpacing = '0px'; } catch (e) {}
  }
  // what a clip shows right now, if it can be drawn: { src, w, h, c }
  function picOf(c) {
    const m = c && media[c.mid]; if (!m) return null;
    if (m.kind === 'video') {
      const el = vel[c.id];
      if (el && (el.readyState >= 2 || (el.seeking && el.videoWidth && el._shown))) { el._shown = 1; return { src: el, w: el.videoWidth, h: el.videoHeight, c }; }
      return null;
    }
    const im = imgFor(m); return im.complete && im.naturalWidth ? { src: im, w: im.naturalWidth, h: im.naturalHeight, c } : null;
  }
  const TRANS = [['cut', 'Cut'], ['fade', 'Fade'], ['wipe', 'Wipe'], ['slats', 'Slats'], ['dip', 'Dip to navy']];

  // ── callouts: small explainer graphics that draw themselves on. They live on the Text track
  // (a text item with `call`), white only: gold is not on the list of recorded exemptions. ──
  // x, y, w, h are % of the canvas. `rel` seconds since the item began.
  const CALL = { line: 3, tick: 14, num: 86, label: 28.8, wtNum: 300, wtLab: 500, trLab: .16 };
  function drawCallout(t) {
    const g = G(), still = !playing && sel && sel.id === t.id, rel = still ? 99 : T - t.at;
    const out = still ? 1 : ease((t.dur - rel) / .3), k = g.k || 1;
    const X = g.w * t.x / 100, Y = g.h * t.y / 100, num = CALL.num * k * (t.scale || 100) / 100, lab = CALL.label * k * (t.scale || 100) / 100;
    cx.save(); cx.globalAlpha = out; cx.strokeStyle = ART.ink; cx.fillStyle = ART.ink; cx.lineWidth = CALL.line; cx.lineCap = 'round';
    cx.shadowColor = 'rgba(' + ART.wash + ',.55)'; cx.shadowBlur = 14;
    const label = String(t.label || '').toUpperCase();
    if (t.call === 'ruler') {                                   // a vertical measure that grows upward, then its figure
      const H = g.h * (t.h || 40) / 100, p = ease(rel / .9), top = Y - H * p, side = t.side === 'left' ? -1 : 1;
      cx.beginPath(); cx.moveTo(X, Y); cx.lineTo(X, top);
      for (let i = 0; i <= 10; i++) { const yy = Y - H * i / 10; if (yy < top - .5) break; const w = (i % 5 === 0 ? CALL.tick : CALL.tick * .55); cx.moveTo(X, yy); cx.lineTo(X - side * w, yy); }
      cx.stroke();
      const a2 = ease((rel - .5) / .5); cx.globalAlpha = out * a2; cx.textAlign = side > 0 ? 'right' : 'left'; cx.textBaseline = 'alphabetic';
      const tx = X - side * (CALL.tick + 22), ty = Y - H * .55;
      setFont(num, CALL.wtNum, -.02); cx.fillText(t.value || '', tx, ty);
      if (label) { setFont(lab, CALL.wtLab, CALL.trLab); cx.fillText(label, tx, ty + lab * 1.5); }
    } else if (t.call === 'count') {                            // a figure that counts up, with a label under it
      const p = ease(rel / 1.1), raw = String(t.value || '0'), m = raw.match(/-?[\d,]*\.?\d+/);
      let shown = raw;
      if (m) { const end = parseFloat(m[0].replace(/,/g, '')), dec = (m[0].split('.')[1] || '').length, v = end * p; shown = raw.replace(m[0], m[0].indexOf(',') >= 0 ? Number(v.toFixed(dec)).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : v.toFixed(dec)); }
      cx.globalAlpha = out * ease(rel / .3); cx.textAlign = 'center'; cx.textBaseline = 'alphabetic';
      setFont(num * 1.4, CALL.wtNum, -.03); cx.fillText(shown, X, Y);
      if (label) { setFont(lab, CALL.wtLab, CALL.trLab); cx.fillText(label, X, Y + lab * 1.7); }
    } else {                                                    // box: an outline that draws round, with a label inside
      const W = g.w * (t.w || 60) / 100, H = g.h * (t.h || 12) / 100, x0 = X - W / 2, y0 = Y - H / 2, r = 14, per = 2 * (W + H), p = ease(rel / .9);
      cx.setLineDash([per * p, per]); cx.beginPath(); cx.roundRect(x0, y0, W, H, r); cx.stroke(); cx.setLineDash([]);
      if (label) { cx.globalAlpha = out * ease((rel - .45) / .4); cx.textAlign = 'center'; cx.textBaseline = 'middle'; setFont(lab * 1.25, CALL.wtLab, CALL.trLab); cx.fillText(label, X, Y + 2); }
    }
    cx.restore(); try { cx.letterSpacing = '0px'; } catch (e) {} cx.textAlign = 'left';
  }
  // ── end card: OPS's CTA page as a video overlay ───────────────────────────────────────
  // A frosted panel in the middle of the frame: the brass overline (a recorded exemption, as on
  // the carousel), one Light line, the Regular headline, an outlined pill and the wordmark. The
  // corner wordmark is hidden while it shows (draw()), so the logo appears once. Every word is
  // the user's; an empty field drops its row.
  const CTA = { w: .76, r: 44, pad: 72, rule: [84, 4], line: 41.5, head: 86, btn: 36, mark: 62, glass: 46 };
  // A navy wash over the whole picture while the end card shows, so the card reads on a bright
  // shot. Painted before the captions (draw()), so they stay at full strength on top of it.
  function ctaWash(t) {
    const g = G(), still = !playing && sel && sel.id === t.id, rel = still ? 99 : T - t.at;
    const env = Math.min(ease(rel / .5), still ? 1 : ease((t.dur - rel) / .3)), a = clamp((t.wash == null ? 45 : +t.wash) / 100, 0, 1) * env;
    if (a > 0) { cx.fillStyle = 'rgba(' + ART.wash + ',' + a + ')'; cx.fillRect(0, 0, g.w, g.h); }
  }
  function drawCta(t) {
    const g = G(), k = g.k < 1 ? .86 : 1, still = !playing && sel && sel.id === t.id, rel = still ? 99 : T - t.at;
    const env = Math.min(ease(rel / .5), still ? 1 : ease((t.dur - rel) / .3)), rise = (1 - ease(rel / .6)) * 40;
    const W = g.w * CTA.w, maxW = W - CTA.pad * 2, cxm = g.w / 2;
    // measure first: rows are [kind, height, lines/px]
    const rows = []; let px;
    rows.push(['rule', CTA.rule[1], 0, 64 * k]);
    if (t.line) { px = CTA.line * k; setFont(px, 300, 0); const ls = wrap(t.line, maxW); rows.push(['line', ls.length * px * 1.3, { ls, px }, 30 * k]); }
    if (t.head) { px = CTA.head * k; setFont(px, 400, -.02); let ls = wrap(t.head, maxW); while (ls.length > 2 && px > 50) { px *= .9; setFont(px, 400, -.02); ls = wrap(t.head, maxW); } rows.push(['head', ls.length * px * 1.12, { ls, px }, 54 * k]); }
    if (t.btn) { px = CTA.btn * k; setFont(px, 400, 0); rows.push(['btn', px * 2.7, { px, w: cx.measureText(t.btn).width + px * 2.6 }, 0]); }
    if (t.mark !== false && t.mark !== 'false') rows.push(['mark', CTA.mark * k, 0, 0]);
    const markGap = 96 * k;
    let H = CTA.pad * 2; rows.forEach((r, i) => { H += r[1] + (i < rows.length - 1 ? (rows[i + 1][0] === 'mark' ? markGap : r[3]) : 0); });
    // kept inside the safe area wherever it is put; the box is a hit target so it can be dragged up and down
    const x0 = cxm - W / 2, yTop = clamp(g.h * (t.y == null ? 50 : t.y) / 100 - H / 2, g.t, Math.max(g.t, g.h - g.b - H)), y0 = yTop + rise;
    hits[t.id] = { kind: 'text', x: x0, y: yTop, w: W, h: H };
    cx.save(); cx.globalAlpha = env;
    // the glass: the picture already on the canvas, blurred inside the panel, under a navy veil
    cx.save(); cx.beginPath(); cx.roundRect(x0, y0, W, H, CTA.r); cx.clip();
    if (t.glass !== 'plain' && 'filter' in cx) { try { cx.filter = 'blur(' + CTA.glass + 'px)'; cx.drawImage(cv, 0, 0); cx.filter = 'none'; } catch (e) {} }
    cx.fillStyle = 'rgba(' + ART.wash + ',' + (t.glass === 'plain' ? .82 : .34) + ')'; cx.fillRect(x0, y0, W, H);
    cx.fillStyle = 'rgba(255,255,255,.10)'; cx.fillRect(x0, y0, W, H);
    cx.restore();
    cx.strokeStyle = 'rgba(255,255,255,.28)'; cx.lineWidth = 1.5; cx.beginPath(); cx.roundRect(x0, y0, W, H, CTA.r); cx.stroke();
    cx.textAlign = 'center'; cx.textBaseline = 'alphabetic'; cx.fillStyle = ART.ink;
    let y = y0 + CTA.pad;
    rows.forEach((r, i) => {
      const d = r[2];
      if (r[0] === 'rule') { cx.fillStyle = ART.brass; cx.fillRect(cxm - CTA.rule[0] / 2, y, CTA.rule[0], CTA.rule[1]); cx.fillStyle = ART.ink; }
      else if (r[0] === 'line') { setFont(d.px, 300, 0); d.ls.forEach((ln, j) => cx.fillText(ln, cxm, y + d.px * (j * 1.3 + .95))); }
      else if (r[0] === 'head') { setFont(d.px, 400, -.02); d.ls.forEach((ln, j) => cx.fillText(ln, cxm, y + d.px * (j * 1.12 + .9))); }
      else if (r[0] === 'btn') { cx.strokeStyle = ART.ink; cx.lineWidth = 2; cx.beginPath(); cx.roundRect(cxm - d.w / 2, y, d.w, r[1], r[1] / 2); cx.stroke(); setFont(d.px, 400, 0); cx.textBaseline = 'middle'; cx.fillText(t.btn, cxm, y + r[1] / 2 + 2); cx.textBaseline = 'alphabetic'; }
      else { setFont(r[1], 300, ART.logoTrack); cx.fillText('provident.', cxm, y + r[1] * .8); }
      y += r[1] + (i < rows.length - 1 ? (rows[i + 1][0] === 'mark' ? markGap : r[3]) : 0);
    });
    cx.restore(); cx.textAlign = 'left'; try { cx.letterSpacing = '0px'; } catch (e) {}
  }
  function addCta() {
    mark();
    const end = total(), dur = Math.min(4, Math.max(2, end || 4));
    const t = { id: uid(), at: Math.max(0, (videoEnd() || end) - dur), dur, call: 'cta', line: 'What this means for properties around DIFC?', head: 'Read the full story', btn: 'Link in bio', mark: true, glass: 'glass', y: 50 };
    P.texts.push(t); sel = { kind: 'text', id: t.id }; seek(t.at + 1); renderAll();
  }
  function addCallout(kind) {
    mark();
    const t = Object.assign({ id: uid(), at: T, dur: 3, call: kind, scale: 100 }, {
      ruler: { x: 86, y: 62, h: 38, value: '380 m', label: 'Tall', side: 'right' },
      count: { x: 50, y: 48, value: '73', label: 'Floors' },
      box: { x: 50, y: 50, w: 70, h: 10, label: 'One home' }
    }[kind]);
    P.texts.push(t); sel = { kind: 'text', id: t.id }; renderAll();
  }

  function draw() {
    dirty = false;
    const g = G();
    for (const k in hits) delete hits[k];
    const a = clipAt(T) || (T > 0 && T >= videoEnd() - 1e-6 && P.clips.length ? { c: P.clips[P.clips.length - 1] } : null);
    // the picture: the clip under the playhead, and for the length of its transition the clip
    // before it underneath (held on its last frame; sync() parks that video there)
    const pic = a ? picOf(a.c) : null;
    if (a && !pic && media[a.c.mid] && media[a.c.mid].kind === 'video' && draw._had) return;   // nothing decoded yet: leave the last frame up; 'seeked' repaints
    cx.fillStyle = ART.ground; cx.fillRect(0, 0, g.w, g.h);
    if (pic) {
      const tr = a.i > 0 && a.c.tr && a.c.tr !== 'cut' ? a.c.tr : '', D = tr ? Math.min(a.c.trD || .5, clipLen(a.c)) : 0, p = tr ? (T - a.start) / D : 1;
      const put = q => drawCover(q.src, q.w, q.h, q.c);
      if (!tr || p >= 1) put(pic);
      else {
        const was = picOf(P.clips[a.i - 1]), e = p * p * (3 - 2 * p);          // smoothstep
        if (tr === 'dip') {                                                     // out to navy, in from navy
          if (p < .5) { if (was) put(was); cx.fillStyle = 'rgba(' + ART.wash + ',' + Math.min(1, p * 2) + ')'; }
          else { put(pic); cx.fillStyle = 'rgba(' + ART.wash + ',' + Math.min(1, (1 - p) * 2) + ')'; }
          cx.fillRect(0, 0, g.w, g.h);
        } else {
          if (was) put(was);
          cx.save();
          if (tr === 'fade') cx.globalAlpha = e;
          else { cx.beginPath(); if (tr === 'wipe') cx.rect(0, 0, g.w * e, g.h); else { const n = 12, sw = g.w / n; for (let k = 0; k < n; k++) cx.rect(k * sw, 0, sw * e, g.h); } cx.clip(); }
          put(pic); cx.restore();
        }
      }
    }
    draw._had = !!a;
    P.texts.forEach(t => { if (T >= t.at && T < t.at + t.dur && t.call !== 'cta') (t.call ? drawCallout : drawText)(t); });
    P.logos.forEach(l => { if (T >= l.at && T < l.at + l.dur) drawLogo(l); });
    // the end card goes over everything and carries the wordmark itself, so the corner lockup rests
    const ctas = P.texts.filter(t => t.call === 'cta' && T >= t.at && T < t.at + t.dur);
    ctas.forEach(ctaWash);
    if (!ctas.some(t => t.capHide === 'hide')) P.audio.forEach(drawCaption);
    if (ctas.length) ctas.forEach(drawCta); else drawBrand();
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
          const name = kind === 'text' ? (it.call ? ({ ruler: 'Measure', count: 'Count', box: 'Box', cta: 'End card' }[it.call] + ' · ' + (it.value || it.label || it.head || '')) : plain(it.text || it.eyebrow || it.sub || 'Text').split('\n')[0]) : (m.name || kind);
          body += '<div class="vs-it" data-kind="' + kind + '" data-id="' + it.id + '"' + on(kind, it.id) + (it.track === 'sfx' ? ' data-sfx="1"' : '') +
            ' style="left:' + (LBL + it.at * pps) + 'px;width:' + Math.max(6, it.dur * pps - 1) + 'px;top:' + (4 + ln.map[it.id] * (ih + 4)) + 'px">' +
            (kind === 'audio' ? '<canvas data-wave="' + it.id + '"></canvas>' : '') + hd + '<span class="n">' + esc(name) + '</span></div>';
        });
      }
      h += '<div class="vs-trk" data-trk="' + tr.id + '" style="height:' + rowH + 'px"><div class="vs-trk-l">' + ico(tr.icon) + tr.name + '</div>' + body + '</div>';
    });
    CASN.forEach((n, i) => { if (!n.done) h += '<i class="vs-nt" style="left:' + (LBL + clamp(+n.t || 0, 0, total()) * pps) + 'px" title="' + esc((n.by || 'Comment') + ' at ' + fmt(+n.t || 0) + ': ' + n.text) + '"><b>' + (i + 1) + '</b></i>'; });
    markers().forEach(t => { h += '<i class="vs-mk" style="left:' + (LBL + t * pps) + 'px" title="Shot change at ' + fmt(t) + '. Layers and the playhead snap here."></i>'; });
    P.clips.forEach(c => findCuts(media[c.mid]));
    h += '<div class="vs-ph" id="ph" title="Drag to scrub"></div>';
    tlin.style.width = W + 'px'; tlin.innerHTML = h;
    tlin.querySelectorAll('canvas[data-wave]').forEach(c => {
      const a = P.audio.find(x => x.id === c.dataset.wave), m = a && media[a.mid]; if (!m || !m.peaks) return;
      const w = c.width = Math.max(2, Math.min(4000, Math.round(a.dur * pps))), hh = c.height = 36, x = c.getContext('2d');
      x.fillStyle = '#fff';
      for (let i = 0; i < w; i++) { const p = m.peaks[Math.floor((a.in + i / w * a.dur * (a.rate || 1)) * 40)] || 0, bh = Math.max(1, p * hh * .9); x.fillRect(i, (hh - bh) / 2, 1, bh); }
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
        const rt = isA ? (o.rate || 1) : 1;
        let nat = clamp(snapT(o.at + d, it.id), Math.max(0, isA ? o.at - o.in / rt : 0), o.at + o.dur - .2);
        it.at = nat; it.dur = o.dur - (nat - o.at); if (isA) it.in = o.in + (nat - o.at) * rt;
      } else it.dur = clamp(snapT(o.at + o.dur + d, it.id) - o.at, .2, isA ? (lim - o.in) / (o.rate || 1) : lim);
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
    if (hit.kind === 'logo') { const l = find(sel), q = lgeo(l); cdrag = { p, x: q.x, y: q.y, snap: JSON.stringify(P), moved: false }; cv.setPointerCapture(e.pointerId); }
    else { const t = find(sel), h = hits[hit.id]; if (t && t.call === 'cta') { cdrag = { p, cta: true, y: (h.y + h.h / 2) / G().h * 100, snap: JSON.stringify(P), moved: false }; cv.setPointerCapture(e.pointerId); } }
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
    if (cdrag.cta) {                          // the end card moves up and down only, inside the safe area
      const g = G(), hb = hits[l.id] || { h: 0 }, half = hb.h / g.h * 50, lo = g.t / g.h * 100 + half, hi = (g.h - g.b) / g.h * 100 - half;
      let y = cdrag.y + (p.y - cdrag.p.y) / g.h * 100, ly = false;
      if (!e.altKey && Math.abs(y - 50) < 9 * cv.width / (cv.getBoundingClientRect().width || cv.width) / g.h * 100) { y = 50; ly = true; }
      l.y = Math.round(clamp(y, Math.min(lo, hi), Math.max(lo, hi))); guideLock(false, ly); dirty = true; return;
    }
    const g = G(), hb = hits[l.id] || { w: g.w * lgeo(l).w / 100, h: 0 };
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
    const q = lgeoW(l); q.x = clamp(x, 0, 100); q.y = clamp(y, 0, 100);
    guideLock(lx, ly); dirty = true;
  });
  const cEnd = () => { const m = cdrag && cdrag.moved; cdrag = null; guideHide(); if (m) renderAll(); };
  cv.addEventListener('pointerup', cEnd); cv.addEventListener('pointercancel', cEnd);

  // ── left rail ────────────────────────────────────────────────────────────────────────
  function devLib() {
    let own = []; try { own = JSON.parse(localStorage.getItem(LKEY) || '[]'); } catch (e) {}
    return (window.providentDevLogos || []).concat(own.map(o => Object.assign({ own: 1 }, o)));
  }
  // ── make a voiceover: a script, a voice, and it lands on the Sound track with captions on ──
  // Mac voices are free (the local server runs `say`); Higgsfield voices cost credits, so they are
  // priced first and need a yes. Both need the local server.
  // an audio item can play 25% slower to 35% faster with its pitch kept; beyond that it sounds wrong
  const RATE = [.75, 1.35], PACE = 2.5;                    // PACE: natural speech, words a second
  function rateNote(a, asked) {
    const r = a.rate || 1, pct = Math.round(r * 100);
    const lim = asked != null && Math.abs(a.dur - asked) > .05 ? ' <b>That is as far as it goes:</b> ' + a.dur.toFixed(1) + ' s. To reach ' + (+asked).toFixed(1) + ' s, ' + (asked < a.dur ? 'shorten' : 'lengthen') + ' the script or trim the audio.' : '';
    return (pct === 100 ? 'Playing at natural speed.' : 'Playing at ' + pct + '% speed, pitch kept.') + lim;
  }
  function voHint() {
    const w = VO.text.trim().split(/\s+/).filter(Boolean).length, nat = w / PACE, tg = parseFloat(VO.target);
    if (!w) return 'About 2.5 words fit in a second of natural speech.';
    let h = w + ' words, about ' + nat.toFixed(1) + ' s at a natural pace.';
    if (tg > 0) {
      const r = nat / tg;
      h += r > RATE[1] ? ' <b>Too long for ' + tg + ' s:</b> cut about ' + Math.ceil(w - tg * PACE * RATE[1]) + ' words, or it will overrun.'
        : r < RATE[0] ? ' <b>Too short for ' + tg + ' s:</b> add about ' + Math.ceil(tg * PACE * RATE[0] - w) + ' words, or it will end early.'
        : ' Fits ' + tg + ' s' + (r > 1.08 ? ', spoken a little fast.' : r < .92 ? ', spoken a little slowly.' : '.');
    }
    return h;
  }
  const VO = { text: '', voice: '', list: null, busy: '', quote: null, target: '' };
  function voHtml() {
    if (!VO.list) { VO.list = { mac: [], hf: [] }; api('/api/voice/list').then(r => { VO.list = r; if (!VO.voice) VO.voice = r.mac && r.mac[0] ? 'mac:' + r.mac[0] : ''; renderLib(); }).catch(() => { VO.list = { mac: [], hf: [], note: 'off' }; renderLib(); }); }
    const L = VO.list, opt = (v, t) => '<option value="' + esc(v) + '"' + (VO.voice === v ? ' selected' : '') + '>' + esc(t) + '</option>';
    const mine = (L.hf || []).filter(v => v.type !== 'preset'), pre = (L.hf || []).filter(v => v.type === 'preset');
    return '<div class="vs-sec"><span class="vs-h">Make a voiceover</span>' +
      '<div class="vs-f"><label>Script</label><textarea class="p-in" id="voText" rows="5" placeholder="Type what the voice should say"' + (VO.busy ? ' disabled' : '') + '>' + esc(VO.text) + '</textarea></div>' +
      '<div class="vs-f"><label>Length, in seconds (optional)</label><input class="p-in" type="number" id="voTarget" min="1" step="0.5" placeholder="Leave empty for natural speed" value="' + esc(VO.target) + '"' + (VO.busy ? ' disabled' : '') + '></div>' +
      '<span class="vs-note" id="voHint">' + voHint() + '</span>' +
      '<div class="vs-f"><label>Voice</label><select class="p-in" id="voVoice" style="width:100%"' + (VO.busy ? ' disabled' : '') + '>' +
        ((L.mac || []).length ? '<optgroup label="On this Mac, free">' + L.mac.map(v => opt('mac:' + v, v)).join('') + '</optgroup>' : '') +
        (mine.length ? '<optgroup label="Your Higgsfield voices">' + mine.map(v => opt('hf:' + v.type + ':' + v.id, v.name)).join('') + '</optgroup>' : '') +
        (pre.length ? '<optgroup label="Higgsfield voices">' + pre.map(v => opt('hf:' + v.type + ':' + v.id, v.name + (v.gender ? ' · ' + v.gender : ''))).join('') + '</optgroup>' : '') +
      '</select></div>' +
      '<button class="p-ghost p-sm" id="voHear"' + (VO.busy ? ' disabled' : '') + '>' + (VO.playing ? 'Stop' : 'Hear this voice') + '</button>' +
      (VO.busy ? '<span class="vs-note"><b>' + VO.busy + '</b></span>'
        : VO.quote != null ? '<span class="vs-note"><b>This will spend ' + VO.quote + ' credits</b> from your Higgsfield balance.</span><button class="p-btn p-sm" id="voGo">Make it</button><button class="p-ghost p-sm" id="voCancel">Cancel</button>'
        : '<button class="p-btn p-sm" id="voBtn">Make voiceover</button>') +
      '<span class="vs-note">' + (L.note === 'off' ? 'The local server is not running, so voiceovers cannot be made here.' : 'It lands on the Sound track at the playhead with captions already on. Mac voices are free; Higgsfield voices show their cost first.') + '</span></div>';
  }
  // a short sample of the chosen voice: Higgsfield's own preview clip (free), or a Mac voice
  // reading one line (free). Nothing is added to the project.
  // ── make music: a description becomes an instrumental bed under the whole video ──
  // Higgsfield only (credits), so it is always priced first. Sonilo is the cheaper model.
  const MU = { text: '', len: '', model: 'sonilo', busy: '', quote: null };
  function muHtml() {
    const dis = MU.busy ? ' disabled' : '', end = videoEnd();
    return '<div class="vs-sec"><span class="vs-h">Make music</span>' +
      '<div class="vs-f"><label>Describe it</label><textarea class="p-in" id="muText" rows="3" placeholder="Calm cinematic piano with soft strings, slow build"' + dis + '>' + esc(MU.text) + '</textarea></div>' +
      '<div class="vs-f"><label>Length, in seconds</label><input class="p-in" type="number" id="muLen" min="5" max="180" step="1" placeholder="' + (end > 0 ? Math.ceil(end) + ' (your video)' : '30') + '" value="' + esc(MU.len) + '"' + dis + '></div>' +
      '<div class="vs-f"><label>Model</label><div class="vs-seg">' + [['sonilo', 'Sonilo'], ['elevenlabs', 'ElevenLabs']].map(o => '<button data-mum="' + o[0] + '"' + (MU.model === o[0] ? ' data-on="1"' : '') + dis + '>' + o[1] + '</button>').join('') + '</div></div>' +
      (MU.busy ? '<span class="vs-note"><b>' + MU.busy + '</b></span>'
        : MU.quote != null ? '<span class="vs-note"><b>This will spend ' + MU.quote + ' credits</b> from your Higgsfield balance.</span><button class="p-btn p-sm" id="muGo">Make it</button><button class="p-ghost p-sm" id="muCancel">Cancel</button>'
        : '<button class="p-btn p-sm" id="muBtn">Make music</button>') +
      '<span class="vs-note">Instrumental only. It lands as the music bed from 0:00, trimmed to the video. The cost is shown first.</span></div>';
  }
  async function muMake(confirmed) {
    const text = MU.text.trim(); if (!text) { toast('Describe the music first.'); return; }
    const duration = clamp(parseFloat(MU.len) || Math.ceil(videoEnd()) || 30, 5, 180), body = { text, duration, model: MU.model };
    try {
      if (!confirmed) {
        MU.busy = 'Asking Higgsfield for the price…'; renderLib();
        const q = await api('/api/music/cost', Object.assign({ id: uid() + 'mu' }, body)); MU.busy = '';
        if (q.error) { toast(q.error); renderLib(); return; }
        MU.quote = q.credits; renderLib(); return;
      }
      MU.quote = null; MU.busy = 'Making the music… this can take a minute or two.'; renderLib();
      const r = await api('/api/music/make', Object.assign({ id: uid() + 'mu' }, body));
      if (r.error) throw new Error(r.error);
      const blob = await (await fetch('/_animate/' + r.file)).blob(), ext = r.file.split('.').pop(), name = 'Music ' + text.split(/\s+/).slice(0, 3).join(' ') + ' ' + uid().slice(0, 3);
      await addFiles([new File([blob], name + '.' + ext, { type: ext === 'wav' ? 'audio/wav' : ext === 'm4a' ? 'audio/mp4' : 'audio/mpeg' })], 'audio');
      const m = Object.values(media).filter(x => x.kind === 'audio' && x.name === name).pop();
      if (!m) throw new Error('the audio could not be read');
      addAudio(m.id, 'music'); MU.busy = ''; save(); renderAll(); toast('The music is on the Music track.');
    } catch (e) { MU.busy = ''; renderLib(); toast('The music could not be made (' + e.message + ').'); }
  }
  async function voHear() {
    if (VO.playing) { try { VO.playing.pause(); } catch (e) {} VO.playing = null; renderLib(); return; }
    const v = VO.voice.split(':'); let src = '';
    if (v[0] === 'hf') { src = ((VO.list.hf || []).find(x => x.id === v[2]) || {}).preview || ''; if (!src) { toast('There is no sample for that voice.'); return; } }
    else if (v[0] === 'mac') {
      try { const r = await api('/api/voice/make', { id: uid() + 'pv', text: 'This is how I sound reading your script.', mac: v[1] }); if (r.error) throw new Error(r.error); src = '/_animate/' + r.file; }
      catch (e) { toast('The sample could not be made (' + e.message + ').'); return; }
    } else return;
    const a = new Audio(src); VO.playing = a; a.onended = a.onerror = () => { if (VO.playing === a) { VO.playing = null; renderLib(); } };
    renderLib(); a.play().catch(() => { VO.playing = null; renderLib(); toast('The sample could not be played.'); });
  }
  async function voMake(confirmed) {
    const text = VO.text.trim(), v = VO.voice.split(':'); if (!text) { toast('Type the script first.'); return; }
    if (!v[0]) { toast('Pick a voice.'); return; }
    const tg = parseFloat(VO.target) > 0 ? parseFloat(VO.target) : 0, words = text.split(/\s+/).filter(Boolean).length;
    // a Mac voice can be asked for a pace directly (words a minute); a Higgsfield voice cannot, so it is fitted afterwards
    const body = v[0] === 'mac' ? { text, mac: v[1], wpm: tg ? Math.round(clamp(words / tg * 60 * 1.12, 110, 300)) : 0 } : { text, voice_type: v[1], voice_id: v[2] };
    try {
      if (v[0] === 'hf' && !confirmed) {
        VO.busy = 'Asking Higgsfield for the price…'; renderLib();
        const q = await api('/api/voice/cost', Object.assign({ id: uid() + 'vo' }, body)); VO.busy = '';
        if (q.error) { toast(q.error); renderLib(); return; }
        VO.quote = q.credits; renderLib(); return;
      }
      VO.quote = null; VO.busy = 'Making the voiceover…'; renderLib();
      const r = await api('/api/voice/make', Object.assign({ id: uid() + 'vo' }, body));
      if (r.error) throw new Error(r.error);
      const blob = await (await fetch('/_animate/' + r.file)).blob(), ext = r.file.split('.').pop();
      const name = 'Voiceover ' + (v[0] === 'mac' ? v[1] : ((VO.list.hf || []).find(x => x.id === v[2]) || {}).name || 'Higgsfield') + ' ' + uid().slice(0, 3);
      await addFiles([new File([blob], name + '.' + ext, { type: ext === 'wav' ? 'audio/wav' : 'audio/mpeg' })], 'audio');
      const m = Object.values(media).filter(x => x.kind === 'audio' && x.name === name).pop();
      if (!m) throw new Error('the audio could not be read');
      addAudio(m.id, 'sfx');
      const a = P.audio[P.audio.length - 1];
      Object.assign(a, { capOn: true, cap: text, capN: '2', capStyle: 'plain', capSize: 'M', capCase: 'caps', capHi: true });
      let msg = 'The voiceover is on the Sound track, with captions.';
      if (tg) {                                            // land on the asked length exactly, within what still sounds natural
        a.rate = clamp(m.dur / tg, RATE[0], RATE[1]); a.dur = m.dur / a.rate;
        msg = Math.abs(a.dur - tg) < .05 ? 'The voiceover is exactly ' + tg + ' s (' + Math.round(a.rate * 100) + '% speed).' : 'The voice took ' + m.dur.toFixed(1) + ' s; the closest natural fit is ' + a.dur.toFixed(1) + ' s. Edit the script to reach ' + tg + ' s.';
      }
      VO.busy = ''; save(); renderAll(); toast(msg);
    } catch (e) { VO.busy = ''; renderLib(); toast('The voiceover could not be made (' + e.message + ').'); }
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
      h += voHtml() + muHtml();
      h += '<div class="vs-sec"><span class="vs-h">Your audio</span>' + (a.length ? a.map(m =>
        '<div class="vs-arow"><div class="n"><b>' + esc(m.name) + '</b><s>' + fmt(m.dur) + '</s></div><button class="p-ghost p-sm" data-addaudio="' + m.id + '" data-trk="music" title="Add as the music bed, from the start">Music</button><button class="p-ghost p-sm" data-addaudio="' + m.id + '" data-trk="sfx" title="Add as a sound at the playhead">Sound</button><span class="vs-x" data-rm="' + m.id + '" title="Remove">' + ico('close') + '</span></div>').join('') +
        '<span class="vs-note">Music starts at 0:00 and is trimmed to the video. Sound lands at the playhead.</span>'
        : '<span class="vs-note">Nothing uploaded yet.</span>') + '</div>';
    } else if (tab === 'text') {
      const pre = [['headline', 'Headline', 'Regular 400, bottom left, rises in'], ['full', 'Eyebrow, headline and line', 'Tracked caps over the headline, a Light line under'], ['caption', 'Caption', 'A small line at the bottom, fades'], ['centre', 'Centre stage', 'Large, centred, revealed line by line'], ['number', 'Big number', 'Jumbo figure under an eyebrow, word by word']];
      h += '<div class="vs-sec"><span class="vs-h">Add a callout at the playhead</span>' + [['ruler', 'Measure line', 'A line that grows, with a figure: 380 m tall'], ['count', 'Counting figure', 'A number that counts up over a label'], ['box', 'Outline box', 'An outline that draws round a label'], ['cta', 'End card', 'A frosted panel at the end: your message, a button and the wordmark']].map(p2 => '<button class="vs-pre" data-addcall="' + p2[0] + '"><b>' + p2[1] + '</b><s>' + p2[2] + '</s></button>').join('') + '</div>';
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
  $('#lib').addEventListener('input', e => { if (e.target.id === 'muText') MU.text = e.target.value; else if (e.target.id === 'muLen') { MU.len = e.target.value; MU.quote = null; } else if (e.target.id === 'voText' || e.target.id === 'voTarget') { VO[e.target.id === 'voText' ? 'text' : 'target'] = e.target.value; const hn = document.getElementById('voHint'); if (hn) hn.innerHTML = voHint(); } else if (e.target.id === 'voVoice') { VO.voice = e.target.value; VO.quote = null; renderLib(); } });
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
    else if (e.target.closest('#voHear')) voHear();
    else if (e.target.closest('#muBtn')) muMake(false);
    else if (e.target.closest('#muGo')) muMake(true);
    else if (e.target.closest('#muCancel')) { MU.quote = null; renderLib(); }
    else if ((el = q('data-mum'))) { MU.model = el.dataset.mum; MU.quote = null; renderLib(); }
    else if (e.target.closest('#voBtn')) voMake(false);
    else if (e.target.closest('#voGo')) voMake(true);
    else if (e.target.closest('#voCancel')) { VO.quote = null; renderLib(); }
    else if ((el = q('data-addtext'))) addText(el.dataset.addtext);
    else if ((el = q('data-addcall'))) (el.dataset.addcall === 'cta' ? addCta() : addCallout(el.dataset.addcall));
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
        '<span class="vs-note">Select anything on the timeline to edit it here.</span></div>' + casNotesHtml() +
        '<div class="vs-sec"><span class="vs-h">How to cut</span><span class="vs-note">Move the playhead and press <b>S</b> (or the scissors) to cut the clip under it. Drag a clip\'s edge to trim, drag its body to reorder, <b>⌫</b> to delete. The video track closes its own gaps.</span></div>' +
        '<div class="vs-sec"><span class="vs-h">Keys</span><span class="vs-note">Space play · S cut · ⌫ delete · ⌘D duplicate · ⌘Z undo · ← → one frame (⇧ one second) · ⌘ scroll to zoom the timeline</span></div>' +
        '<div class="vs-sec"><button class="p-ghost" id="clearBtn">Start a new video</button></div>';
    } else if (sel.kind === 'clip') {
      const m = media[it.mid] || {}, vid = m.kind === 'video';
      h = '<div class="vs-sec"><span class="vs-h">' + (vid ? 'Video clip' : 'Photo clip') + '</span><span class="vs-note">' + esc(m.name) + ' · ' + fmt(clipLen(it)) + (vid ? ' of ' + fmt(m.dur) : '') + '</span></div>';
      if (P.clips.indexOf(it) > 0) h += '<div class="vs-sec"><span class="vs-h">Transition in</span><select class="p-in" data-s="tr" style="width:100%">' + TRANS.map(o => '<option value="' + o[0] + '"' + ((it.tr || 'cut') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>' + (it.tr && it.tr !== 'cut' ? rng('i', 'trD', 'Lasts', it.trD || .5, .2, 1.5, 's', .1) : '') + '<span class="vs-note">How this clip arrives from the one before it.</span></div>';
      if (vid) h += '<div class="vs-sec"><span class="vs-h">Sound</span>' + seg('mute', [[false, 'On'], [true, 'Muted']]) + (it.mute ? '' : rng('i', 'vol', 'Volume', Math.round(it.vol * 100), 0, 150, '%')) + '</div>';
      else {
        h += '<div class="vs-sec"><span class="vs-h">Timing</span>' + f('Lasts', '<input class="p-in" type="number" data-n="out" min="0.2" step="0.1" value="' + it.out.toFixed(2) + '">') + '</div>';
        const j = it.job, busy = j && (j.status === 'queued' || j.status === 'working' || j.status === 'confirm');
        h += '<div class="vs-sec"><span class="vs-h">Animate with Higgsfield</span>' +
          '<div class="vs-mvs" role="radiogroup" aria-label="Camera move">' + MOVES.map(m => '<button class="vs-mv" role="radio" data-mv="' + m[0] + '"' + (it.move === m[0] ? ' data-on="1"' : '') + (busy ? ' disabled' : '') + '>' + m[1] + '</button>').join('') + '</div>' +
          f('Length', '<div class="vs-seg">' + [5, 8, 10].map(d => '<button data-gd="' + d + '"' + ((it.genDur || 5) === d ? ' data-on="1"' : '') + (busy ? ' disabled' : '') + '>' + d + ' s</button>').join('') + '</div>') +
          f('Model', '<div class="vs-seg">' + GEN_MODELS.map(q => '<button data-gm="' + q[0] + '"' + ((it.genModel || 'seedance') === q[0] ? ' data-on="1"' : '') + (busy ? ' disabled' : '') + '>' + q[1] + '</button>').join('') + '</div>') +
          f('Quality', '<div class="vs-seg">' + [['std', 'Draft 720p'], ['pro', 'Full 1080p']].map(q => '<button data-gq="' + q[0] + '"' + ((it.genMode || 'std') === q[0] ? ' data-on="1"' : '') + (busy ? ' disabled' : '') + '>' + q[1] + '</button>').join('') + '</div>') +
          '<span class="vs-note">About ' + (genCredits(it)) + ' credits. The exact cost is shown before anything is spent.</span>' +
          f('Extra direction', '<input class="p-in" data-s="moveNote" value="' + esc(it.moveNote || '') + '" placeholder="Optional, e.g. golden hour light"' + (busy ? ' disabled' : '') + '>') +
          (j && j.status === 'confirm' ? '<span class="vs-note"><b>This will spend ' + (j.credits == null ? 'credits' : j.credits + ' credits') + '</b> from your Higgsfield balance.</span><button class="p-btn p-sm" id="animGo">Generate</button><button class="p-ghost p-sm" id="animCancel">Cancel</button>' : (busy ? '<span class="vs-note"><b>' + (j.status === 'working' ? 'Generating…' : 'In the queue.') + '</b> ' + (j.status === 'working' ? 'The clip swaps in here when it is ready.' : 'Run <b>/animate-photos</b> in Claude to generate it.') + '</span><button class="p-ghost p-sm" id="animCancel">Take it off the queue</button>'
            : (j && j.status === 'failed' ? '<span class="vs-note"><b>That did not work:</b> ' + esc(j.error || 'no reason given') + '</span>' : '') +
              '<button class="p-btn p-sm" id="animNow"' + (it.move ? '' : ' disabled') + '>Generate now</button>' +
              '<button class="p-ghost p-sm" id="animBtn"' + (it.move ? '' : ' disabled') + '>Send to the animate queue</button>' +
              '<span class="vs-note">' + (it.move ? '<b>Generate now</b> uses Higgsfield\'s tool on this computer and shows the cost first. <b>Send to the animate queue</b> waits for <b>/animate-photos</b> in Claude.' : 'Pick a camera move first.') + '</span>')) +
          '</div>';
      }
      h += '<div class="vs-sec"><span class="vs-h">Framing</span>' + seg('fit', [['fill', 'Fill the frame'], ['fit', 'Fit inside']]) +
        rng('i', 'z', 'Zoom', it.z, 100, 300, '%') + rng('i', 'fx', 'Left to right', it.fx, 0, 100, '') + rng('i', 'fy', 'Top to bottom', it.fy, 0, 100, '') + '</div>';
    } else if (sel.kind === 'audio') {
      const m = media[it.mid] || {};
      h = '<div class="vs-sec"><span class="vs-h">Audio</span><span class="vs-note">' + esc(m.name) + '</span>' + seg('track', [['music', 'Music'], ['sfx', 'Sound']]) + '</div>' +
        '<div class="vs-sec"><span class="vs-h">Level</span>' + rng('i', 'vol', 'Volume', Math.round(it.vol * 100), 0, 150, '%') +
        rng('i', 'fi', 'Fade in', it.fi, 0, 5, 's', .1) + rng('i', 'fo', 'Fade out', it.fo, 0, 5, 's', .1) + '</div>' +
        '<div class="vs-sec"><span class="vs-h">Speed</span>' + f('Fit to exactly (seconds)', '<input class="p-in" type="number" data-n="fit" min="0.2" step="0.1" value="' + it.dur.toFixed(2) + '">') +
          '<span class="vs-note" id="rateNote">' + rateNote(it) + '</span>' + ((it.rate || 1) !== 1 ? '<button class="p-ghost p-sm" id="rateReset">Back to natural speed</button>' : '') + '</div>' +
        '<div class="vs-sec"><span class="vs-h">Captions</span>' + seg('capOn', [[false, 'Off'], [true, 'On']]) +
        (it.capOn ? f('Voiceover script', '<textarea class="p-in" data-s="cap" rows="6" placeholder="Paste exactly what is said in this audio">' + esc(it.cap || '') + '</textarea>') +
          f('Words at a time', seg('capN', [['1', 'One'], ['2', 'Two'], ['3', 'Three']])) +
          f('Style', seg('capStyle', [['plain', 'Plain'], ['pill', 'Navy pill']])) +
          f('Size', seg('capSize', [['S', 'Small'], ['M', 'Medium'], ['L', 'Large']])) +
          f('Letters', seg('capCase', [['caps', 'Capitals'], ['as', 'As typed']])) +
          f('Spoken word in brass', seg('capHi', [[true, 'On'], [false, 'Off']])) +
          rng('i', 'capY', 'Height', it.capY == null ? 90 : it.capY, 0, 100, '%') +
          rng('i', 'capShift', 'Earlier / later', it.capShift || 0, -1.5, 1.5, 's', .05) +
          '<span class="vs-note">The words are timed from the loudness of the speech, not from a transcript, so they are an estimate. If they run ahead or behind, nudge them with Earlier / later. Music under the voice makes the timing less accurate.</span>' : '') +
        '</div>' + timing();
    } else if (sel.kind === 'text' && it.call === 'cta') {
      h = '<div class="vs-sec"><span class="vs-h">End card</span>' +
        f('Line above', '<textarea class="p-in" data-s="line" rows="2" placeholder="Optional">' + esc(it.line || '') + '</textarea>') +
        f('Headline', '<textarea class="p-in" data-s="head" rows="2">' + esc(it.head || '') + '</textarea>') +
        f('Button', '<input class="p-in" data-s="btn" value="' + esc(it.btn || '') + '" placeholder="Leave empty for no button">') +
        f('Provident wordmark', seg('mark', [[true, 'Shown'], [false, 'Hidden']])) +
        f('Panel', seg('glass', [['glass', 'Frosted glass'], ['plain', 'Navy']])) +
        f('Position', '<div class="vs-seg">' + [[32, 'Higher'], [50, 'Middle'], [62, 'Lower']].map(o => '<button data-k="y" data-v="' + o[0] + '"' + (+(it.y == null ? 50 : it.y) === o[0] ? ' data-on="1"' : '') + '>' + o[1] + '</button>').join('') + '</div>') +
        rng('i', 'y', 'Up or down', it.y == null ? 50 : it.y, 15, 85, '%') +
        rng('i', 'wash', 'Background wash', it.wash == null ? 45 : it.wash, 0, 80, '%') +
        f('Captions while it shows', '<div class="vs-seg">' + [['show', 'Shown'], ['hide', 'Hidden']].map(o => '<button data-k="capHide" data-v="' + o[0] + '"' + ((it.capHide || 'show') === o[0] ? ' data-on="1"' : '') + '>' + o[1] + '</button>').join('') + '</div>') +
        '<span class="vs-note">Drag the card on the picture to move it up or down. It stays inside the safe area. The corner logo hides while the end card is showing, so the wordmark appears once.</span></div>' + timing();
    } else if (sel.kind === 'text' && it.call) {
      const nm = { ruler: 'Measure line', count: 'Counting figure', box: 'Outline box' }[it.call];
      h = '<div class="vs-sec"><span class="vs-h">' + nm + '</span>' +
        (it.call !== 'box' ? f(it.call === 'count' ? 'Figure it counts to' : 'Figure', '<input class="p-in" data-s="value" value="' + esc(it.value || '') + '">') : '') +
        f('Label', '<input class="p-in" data-s="label" value="' + esc(it.label || '') + '" placeholder="Set in capitals">') +
        (it.call === 'ruler' ? f('Figure sits', seg('side', [['right', 'Left of the line'], ['left', 'Right of the line']])) : '') + '</div>' +
        '<div class="vs-sec"><span class="vs-h">Place and size</span>' + rng('i', 'x', 'Across', it.x, 0, 100, '%') + rng('i', 'y', 'Down', it.y, 0, 100, '%') +
        (it.call === 'box' ? rng('i', 'w', 'Width', it.w, 10, 100, '%') : '') + (it.call !== 'count' ? rng('i', 'h', it.call === 'ruler' ? 'Line length' : 'Height', it.h, 4, 90, '%') : '') +
        rng('i', 'scale', 'Type size', it.scale || 100, 50, 200, '%') + '</div>' + timing();
    } else if (sel.kind === 'text') {
      h = '<div class="vs-sec"><span class="vs-h">Text</span>' +
        f('Eyebrow', '<input class="p-in" data-s="eyebrow" value="' + esc(it.eyebrow) + '" placeholder="Optional, set in caps">') +
        '<div class="vs-f"><label>Headline <button class="vs-hi" data-hi="text" title="Paint the selected words, or the word under the caret, in brass. Press again to remove."><i></i>Brass highlight</button></label><textarea class="p-in" data-s="text" rows="3">' + esc(it.text) + '</textarea></div>' +
        f('Line under it', '<textarea class="p-in" data-s="sub" rows="2" placeholder="Optional">' + esc(it.sub) + '</textarea>') + '</div>' +
        '<div class="vs-sec"><span class="vs-h">Layout</span>' + f('Size', seg('size', ART.order.map(s => [s, s]))) +
        f('Line spacing', '<div class="vs-seg">' + [['tight', 'Tight'], ['normal', 'Normal'], ['open', 'Open']].map(o => '<button data-k="lead" data-v="' + o[0] + '"' + (leadOf(it) === o[0] ? ' data-on="1"' : '') + '>' + o[1] + '</button>').join('') + '</div>') +
        f('Position', seg('pos', [['top', 'Top'], ['centre', 'Centre'], ['bottom', 'Bottom']])) + f('Alignment', seg('align', [['left', 'Left'], ['centre', 'Centre']])) +
        rng('i', 'scrim', 'Wash under the text', it.scrim, 0, 100, '%') + '</div>' +
        '<div class="vs-sec"><span class="vs-h">Effect</span><select class="p-in" data-s="anim" style="width:100%">' + ANIMS.map(a => '<option value="' + a[0] + '"' + (it.anim === a[0] ? ' selected' : '') + '>' + a[1] + '</option>').join('') + '</select>' +
        '<button class="p-ghost p-sm" id="previewBtn">Play this text</button></div>' + timing();
    } else {
      const m = media[it.mid] || {};
      h = '<div class="vs-sec"><span class="vs-h">Graphic</span><span class="vs-note">' + esc(m.name) + ' — drag it on the canvas to move it. Reel and Square each keep their own place and size.</span>' +
        rng('i', 'w', 'Size', Math.round(lgeo(it).w), 3, 100, '%') + rng('i', 'op', 'Opacity', it.op, 10, 100, '%') +
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
      if (sel.kind === 'logo' && (k === 'w' || k === 'x' || k === 'y')) lgeoW(it)[k] = v;
      else it[k] = k === 'vol' ? v / 100 : v;
    } else if (d.s) { it[d.s] = e.target.value; if (d.s === 'tr') { dirty = true; save(); renderAll(); return; } }
    else if (d.n) {
      const v = parseFloat(e.target.value); if (!isFinite(v)) return;
      const m = media[it.mid];
      if (d.n === 'at') it.at = Math.max(0, v);
      else if (d.n === 'dur') it.dur = clamp(v, .2, sel.kind === 'audio' && m ? (m.dur - it.in) / (it.rate || 1) : 600);
      else if (d.n === 'fit' && sel.kind === 'audio') {      // play the same stretch of the file in exactly v seconds
        const span = it.dur * (it.rate || 1); it.rate = clamp(span / Math.max(.2, v), RATE[0], RATE[1]); it.dur = span / it.rate;
        const o = insp.querySelector('#rateNote'); if (o) o.innerHTML = rateNote(it, v);
      }
      else if (d.n === 'out') it.out = clamp(v, .2, 120);
    } else return;
    dirty = true; save(); renderTimeline();
  });
  insp.addEventListener('click', e => {
    const it = find(sel), b = e.target.closest('button'); if (!b) return;
    if (b.dataset.nt != null) { if (playing) pause(); seek(+b.dataset.nt); return; }
    if (b.id === 'clearBtn') {
      if (!total() || confirm('Clear the timeline and start a new video? Uploaded files stay in the library.')) { mark(); const keep = P.size; P = fresh(); P.size = keep; sel = null; T = 0; partnerLoad(); renderAll(); }
      return;
    }
    if (!it) return;
    if (b.dataset.mv) { mark(); it.move = b.dataset.mv; renderAll(); return; }
    if (b.dataset.gd) { mark(); it.genDur = +b.dataset.gd; renderAll(); return; }
    if (b.dataset.gm) { mark(); it.genModel = b.dataset.gm; renderAll(); return; }
    if (b.dataset.gq) { mark(); it.genMode = b.dataset.gq; renderAll(); return; }
    if (b.id === 'rateReset') { mark(); const span = it.dur * (it.rate || 1); it.rate = 1; it.dur = span; save(); renderAll(); return; }
    if (b.id === 'animBtn') return animSend(it);
    if (b.id === 'animNow') return animSend(it, true);
    if (b.id === 'animGo') return animRun(it);
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
      const q = lgeoW(it);
      if (b.dataset.place === 'corner') { q.x = (g.w - g.r) / g.w * 100 - q.w / 2; q.y = (g.h - g.b) / g.h * 100 - 4; } else { q.x = 50; q.y = 50; }
      renderAll(); return;
    }
    if (b.dataset.k) {
      mark(); const v = b.dataset.v; it[b.dataset.k] = v === 'true' ? true : v === 'false' ? false : v;
      if (b.dataset.k === 'capOn' && it.capOn) { if (!it.capN) it.capN = '2'; if (!it.capStyle) it.capStyle = 'plain'; if (!it.capSize) it.capSize = 'M'; if (!it.capCase) it.capCase = 'caps'; if (it.capHi == null) it.capHi = true; }
      renderAll();
    }
  });

  // ── export: the canvas and the mix are recorded as the video plays ───────────────────
  let rec = null, recDest = null, recCancel = false;
  // `cb` (Send to CAS): the recorded file is handed to it instead of being downloaded; null = nothing recorded.
  function exportVideo(cb) {
    if (typeof cb !== 'function') cb = null;
    if (!total()) { toast('Add a video first.'); if (cb) cb(null); return; }
    if (!window.MediaRecorder || !cv.captureStream) { toast('This browser cannot record video. Use Chrome.'); if (cb) cb(null); return; }
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
        if (recCancel) { if (cb) cb(null); return; }
        const blob = new Blob(chunks, { type: mime.split(';')[0] });
        const ext = mime.indexOf('mp4') > 0 ? 'mp4' : 'webm', a = document.createElement('a'), want = total();
        a.href = URL.createObjectURL(blob);
        a.download = 'provident-video_' + P.size + '.' + ext;
        // 2026-11-13: two exports of four came out 1.6 s and 2.9 s long from a 32 s video (the sound
        // engine was suspended; see ready() below). Never hand over a short file silently: measure it.
        const chk = document.createElement('video'); chk.muted = true; chk.preload = 'metadata';
        const give = () => { if (cb) { URL.revokeObjectURL(a.href); return cb(blob); } document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000); toast('Saved ' + a.download + ' to Downloads.'); };
        let settled = false; const settle = ok => { if (settled) return; settled = true; chk.removeAttribute('src'); if (ok) give(); else { URL.revokeObjectURL(a.href); toast('That export came out short, so it was not saved. Press Export video again.'); if (cb) cb(null); } };
        chk.onloadedmetadata = () => settle(!isFinite(chk.duration) || chk.duration >= want * .9);
        chk.onerror = () => settle(true); setTimeout(() => settle(true), 5000);
        chk.src = a.href;
      };
      exporting = true; rec.start(500); play();
    };
    // wait for the first frame to be decoded before recording
    let n = 0; const wait = () => { sync(); const a = clipAt(0), el = a && vel[a.c.id]; if (!el || (el.readyState >= 2 && !el.seeking) || n++ > 80) { draw(); start(); } else setTimeout(wait, 50); };
    // The sound engine must be RUNNING before anything is recorded. Suspended (the browser has not
    // seen a real click on this page yet), the recording's sound track carries no time, the file
    // comes out a few seconds long, and the videos refuse to play so the timeline crawls. That was
    // the cause of the short exports of 2026-11-13 (the test pressed Export from a script).
    const stop = () => { delete $('#ov').dataset.on; toast('The sound could not start, so nothing was exported. Click anywhere on the page, then press Export video again.'); if (cb) cb(null); };
    let m = 0; const ready = () => { if (actx.state === 'running') return wait(); if (m++ > 30) return stop(); const p = actx.resume(); if (p && p.catch) p.catch(() => {}); setTimeout(ready, 50); };
    ready();
  }
  function finishExport() { setTimeout(() => { if (rec && rec.state !== 'inactive') rec.stop(); }, 200); }
  setInterval(() => { if (exporting) $('#ovP').style.width = (T / Math.max(.01, total()) * 100) + '%'; }, 120);
  $('#ovX').addEventListener('click', () => { recCancel = true; casStop = true; pause(); if (rec && rec.state !== 'inactive') rec.stop(); else { exporting = false; delete $('#ov').dataset.on; } });
  // ── Send to CAS ──────────────────────────────────────────────────────────────────────
  // The editor stays on this computer; CAS on the website holds the Google sign-in and the ad
  // sets. So CASV records BOTH sizes (Reel, then Square: twice the video's length), parks them with
  // a poster in the local server's outbox, and CAS's "Add video" fetches them from this computer
  // and uploads them into the ad set's Drive folder. `P.cas` remembers the outbox id, so sending
  // again replaces the same video and the reviewers' comments find their way back (casNotes).
  let casStop = false, casBusy = false;
  const CAS_SITE = () => { try { return localStorage.getItem('provident-casv-site') || 'https://provident-design-studio.vercel.app/'; } catch (e) { return 'https://provident-design-studio.vercel.app/'; } };
  const recordOnce = () => new Promise(res => exportVideo(res));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  async function sendToCas() {
    if (casBusy || exporting) return;
    if (!total()) { toast('Add a video first.'); return; }
    const first = P.texts.find(t => !t.call && t.text), def = (P.cas && P.cas.title) || (first ? plain(first.text).replace(/\s+/g, ' ').slice(0, 60) : 'Video');
    const title = prompt('Send this video to CAS.\n\nCASV records the Reel 9:16 and then the Square 1:1, which takes twice the video\'s length. Keep this tab in front until it finishes.\n\nName of the video:', def);
    if (title == null) return;
    const keep = P.size, id = (P.cas && P.cas.id) || uid() + uid().slice(0, 2), out = {};
    casBusy = true; casStop = false;
    try {
      const up = async (part, blob) => { const r = await fetch('/api/outbox/file?id=' + id + '&part=' + part, { method: 'PUT', body: blob }); if (!r.ok) throw new Error('outbox'); };
      for (const size of ['9x16', '1x1']) {
        P.size = size; pTint = null; fitCanvas(); renderAll();
        if (size === '9x16') {                // the poster: a frame a third of the way in, before anything is recorded
          seek(Math.min(total() * .33, 4)); await wait(900); sync(); draw(); await wait(250); draw();
          const jpg = await new Promise(r => cv.toBlob(r, 'image/jpeg', .82));
          if (jpg) await up('poster', jpg);
        }
        $('#ovT').textContent = size === '9x16' ? 'Recording the Reel 9:16 (1 of 2)' : 'Recording the Square 1:1 (2 of 2)';
        const blob = await recordOnce();
        if (!blob || casStop) throw new Error('stopped');
        if (blob.type.indexOf('mp4') < 0) throw new Error('mp4');
        await up(size, blob);
        out[size] = { bytes: blob.size, w: SIZES[size].w, h: SIZES[size].h };
      }
      const r = await fetch('/api/outbox/meta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, title: title.trim() || 'Video', dur: Math.round(total() * 100) / 100, sizes: out }) });
      if (!r.ok) throw new Error('outbox');
      P.cas = { id, title: title.trim() || 'Video', at: Date.now() };
      casDone();
    } catch (e) {
      toast(e.message === 'mp4' ? 'This browser did not record an MP4. Use Chrome.' : e.message === 'outbox' ? 'Could not reach the local server, so nothing was sent. Is serve.py running?' : 'Nothing was sent to CAS.');
    } finally {
      P.size = keep; pTint = null; fitCanvas(); $('#ovT').textContent = 'Exporting the video'; casBusy = false; save(); renderAll();
    }
  }
  // Comments a reviewer left on the video's timeline in CAS. CAS posts them to the local server when
  // the designer opens the video there ("Send comments to CASV"); they show as numbered pins on the
  // ruler and as a list while nothing is selected. Read-only here: they are answered in CAS.
  let CASN = [];
  function casNotesHtml() {
    if (!P.cas) return '';
    const open = CASN.filter(n => !n.done);
    return '<div class="vs-sec"><span class="vs-h">Comments from CAS</span>' + (CASN.length
      ? CASN.map((n, i) => '<button class="vs-pre" data-nt="' + (+n.t || 0) + '"' + (n.done ? ' style="opacity:.55"' : '') + '><b>' + (i + 1) + ' · ' + fmt(+n.t || 0) + (n.by ? ' · ' + esc(n.by) : '') + (n.done ? ' · done' : '') + '</b><s>' + esc(n.text) + '</s></button>').join('') +
        '<span class="vs-note">' + open.length + ' open. Click one to jump to it. Send the video to CAS again once they are dealt with.</span>'
      : '<span class="vs-note">“' + esc(P.cas.title) + '” was sent to CAS. Comments left on its timeline there appear here.</span>') + '</div>';
  }
  async function casNotes() {
    if (!P.cas || document.hidden || exporting) return;
    try {
      const r = await fetch('/api/outbox/notes?id=' + P.cas.id), j = await r.json(), n = Array.isArray(j.notes) ? j.notes : [];
      if (JSON.stringify(n) !== JSON.stringify(CASN)) { CASN = n; renderTimeline(); if (!sel) renderInspector(); }
    } catch (e) {}
  }
  setInterval(casNotes, 15000); setTimeout(casNotes, 1200);
  function casDone() {
    const d = document.createElement('div'); d.className = 'vs-ov'; d.dataset.on = '1';
    d.innerHTML = '<div class="vs-dlg"><b>Ready for CAS</b><span class="vs-note" style="display:block;margin:8px 0 14px">The Reel 9:16 and the Square 1:1 are waiting on this computer. In CAS, open the ad set, press <b>Add video</b> on the audience and choose <b>From CASV on this computer</b>.</span>' +
      '<div class="vs-two"><button class="p-btn" data-go="1">Open CAS</button><button class="p-ghost" data-go="0">Close</button></div></div>';
    d.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (!b && e.target !== d) return; if (b && b.dataset.go === '1') window.open(CAS_SITE(), '_blank', 'noopener'); d.remove(); });
    document.body.appendChild(d);
  }
  function saveFrame() {
    sync(); draw();
    cv.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'provident-video_' + P.size + '_frame.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 30000); }, 'image/png');
  }

  // ── animate queue: a photo clip goes out as the frame it shows; the finished video comes back ──
  // The local server keeps the queue in `_animate/`; the animate-photos skill (Claude, talking to
  // Higgsfield) works through it. The studio never talks to Higgsfield itself.
  const api = (path, body) => fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined).then(r => r.json());
  // [key, label, Higgsfield model id, credits per second Draft, Full] — measured 2026-11-13, sound ON (clips are generated with their own sound since the same day)
  const GEN_MODELS = [['seedance', 'Seedance 2.5', 'seedance_2_5', 7, 16], ['kling', 'Kling 3.0', 'kling3_0', 1.75, 2], ['cinema', 'Cinema Studio', 'cinematic_studio_video_v2', 1.5, 2]];
  function genModel(c) { return GEN_MODELS.find(m => m[0] === c.genModel) || GEN_MODELS[0]; }
  function genCredits(c) { return +((c.genDur || 5) * genModel(c)[c.genMode === 'pro' ? 4 : 3]).toFixed(2); }
  async function animSend(c, now) {
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
      const r = await api('/api/animate/job', { id, name: m.name, move: mv[1], prompt, duration: c.genDur || 5, model: genModel(c)[2], mode: c.genMode === 'pro' ? 'pro' : 'std', aspect: P.size === '1x1' ? '1:1' : '9:16', photo: k.toDataURL('image/jpeg', .92) });
      if (r.error) throw new Error(r.error);
      mark(); c.job = { id, status: 'queued' }; renderAll();
      if (!now) { animWatch(); toast('Queued. Run /animate-photos in Claude to generate it.'); return; }
      // Generate now: Higgsfield's command-line tool on this computer, no Claude. Price first, then a yes.
      const q = await api('/api/animate/cost', { id });
      if (q.error) { await api('/api/animate/cancel', { id }).catch(() => {}); delete c.job; renderAll(); toast(q.error); return; }
      c.job = { id, status: 'confirm', credits: q.credits }; renderAll();
    } catch (e) { toast('Could not reach the local server\'s animate queue (' + e.message + ').'); }
  }
  async function animRun(c) {
    if (!c.job || c.job.status !== 'confirm') return;
    try {
      const r = await api('/api/animate/run', { id: c.job.id });
      if (r.error) throw new Error(r.error);
      c.job = { id: c.job.id, status: 'working' }; renderAll(); animWatch();
    } catch (e) { toast('Could not start the generation (' + e.message + ').'); }
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
          Object.assign(c, { mid: rec.id, in: 0, out: rec.dur, fit: 'fill', z: 100, fx: 50, fy: 50, mute: false });   // generated with natural sound, so it plays
          delete c.job; changed = true;
          api('/api/animate/placed', { id: j.id }).catch(() => {});
          toast('The animated clip is on the timeline.');
        } catch (e) { c.job = { id: j.id, status: 'failed', error: 'the finished video could not be loaded' }; changed = true; }
      } else if (j.status !== c.job.status && !(c.job.status === 'confirm' && j.status === 'queued')) {
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
    // all three placements, whichever size the video is. 2026-11-13, by request: the Feed phone shows
    // the SQUARE version of the video (pvSquare), not a 4:5 crop of the 9:16, which cut the headline
    // off; a 1:1 in Reels and Stories sits in the middle of the screen
    const phones = [['feed', 'Feed', sq ? '1:1 · 1080 × 1080' : 'The Square 1:1 version'], ['reel', 'Reels', sq ? '1:1 centred' : '9:16 · 1080 × 1920'], ['story', 'Story', sq ? '1:1 centred' : '9:16 · 1080 × 1920']];
    const seg = (cur, opts, k) => opts.map(o => '<button data-pv="' + k + '" data-v="' + o[0] + '"' + (cur === o[0] ? ' data-on="1"' : '') + ' role="radio">' + o[1] + '</button>').join('');
    pv.innerHTML = '<div class="mk-bar"><b>Placement preview</b>' +
      '<div class="p-seg mk-seg" role="radiogroup" aria-label="Platform">' + seg(pvPlat, [['fb', 'Facebook'], ['ig', 'Instagram']], 'plat') + '</div>' +
      '<s>' + (sq ? 'Feed 1:1 · centred in Reels and Story' : 'Reels and Story 9:16 · Feed shows the Square 1:1') + '</s>' +
      '<div class="p-seg mk-seg" role="radiogroup" aria-label="Phone appearance" title="The phone\'s own appearance. Reels and Stories stay dark in both apps.">' + seg(pvMode, [['light', 'Light'], ['dark', 'Dark']], 'mode') + '</div>' +
      '<span class="vs-sp"></span><button class="p-ghost" data-pv="play">' + ico(playing ? 'pause' : 'play_arrow') + (playing ? 'Pause' : 'Play') + '</button>' +
      '<button class="p-ghost" data-pv="close">Close ' + ico('close') + '</button></div>' +
      '<div class="mk-stage"><div class="mk-row">' + phones.map(p =>
        '<figure class="mk-fig"><figcaption><b>' + p[1] + '</b><s>' + p[2] + '</s></figcaption>' +
        (PV[pvPlat + ':' + p[0]] || '').replace(/\[\[([a-z]+)\]\]/g, (m, k) => esc(c[k] || '')) + '</figure>').join('') + '</div>' +
      '<div class="mk-note">The video plays here exactly as it exports, only smaller. A Reel is cover-cropped and loses a little of its width at each side; a Story is shown whole; the Feed shows the Square 1:1 version, so check it there before exporting Square. The app chrome is drawn here, with no Meta logo art.</div></div>';
    pvShots = Array.from(pv.querySelectorAll('canvas.mk-shot'));
    pvShots.forEach(k => {
      const feed = !!k.closest('[data-view="feed"]');
      k.width = 540; k.height = feed ? 540 : 960; k._feed = feed;
    });
    pvMirror();
  }
  // The same frame as the Square 1:1 would paint it: draw() run once more into an offscreen canvas
  // with the size switched, then everything put back. Synchronous, so nothing sees the switch.
  let pvSq = null, pvBusy = false;
  function pvSquare() {
    if (!pvSq) { pvSq = document.createElement('canvas'); pvSq.width = SIZES['1x1'].w; pvSq.height = SIZES['1x1'].h; }
    const keep = { cv, cx, size: P.size, hits: Object.assign({}, hits), tint: pTint, dirty, had: draw._had };
    pvBusy = true;
    try { cv = pvSq; cx = pvSq.getContext('2d'); P.size = '1x1'; draw(); }
    catch (e) {}
    finally {
      cv = keep.cv; cx = keep.cx; P.size = keep.size; pTint = keep.tint; dirty = keep.dirty; draw._had = keep.had;
      for (const k in hits) delete hits[k]; Object.assign(hits, keep.hits); pvBusy = false;
    }
    return pvSq;
  }
  function pvMirror() {
    if (!pvOn || pvBusy) return;
    const sqPic = P.size === '9x16' && pvShots.some(k => k._feed) ? pvSquare() : null;
    pvShots.forEach(k => {
      if (k._feed && sqPic) { k.getContext('2d').drawImage(sqPic, 0, 0, k.width, k.height); return; }
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
  $('#exportBtn').addEventListener('click', () => exportVideo()); $('#sendBtn').innerHTML = ico('send') + 'Send to CAS'; $('#sendBtn').addEventListener('click', sendToCas); $('#frameBtn').addEventListener('click', saveFrame);
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
