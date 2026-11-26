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
  // the few icons the Material file does not carry, drawn on a 24 grid at the same weight
  const ICS = {
    keyboard: '<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M7 10h.01M10.3 10h.01M13.7 10h.01M17 10h.01M7 14h.01M17 14h.01M10 14h4"/>',
    add_box: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/>',
    folder: '<path d="M3.5 8V6.5a2 2 0 0 1 2-2h3.6l2 2.2h7.4a2 2 0 0 1 2 2V17.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><path d="M3.5 10h17"/>',
    flag: '<path d="M6 20.5V4.5"/><path d="M6 5.5h11l-2.2 3.5 2.2 3.5H6"/>',
    timer: '<circle cx="12" cy="13.5" r="7"/><path d="M12 10v3.5l2.2 2.2"/><path d="M9.5 3.5h5"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    star: '<path d="m12 3.8 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z"/>',
    folder: '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.2h7a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
    folder_add: '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.2h7a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><path d="M12 11.3v5M9.5 13.8h5"/>',
    more: '<circle cx="6" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="18" cy="12" r="1.2" fill="currentColor"/>',
    grid: '<rect x="4.5" y="4.5" width="6" height="6" rx="1.5"/><rect x="13.5" y="4.5" width="6" height="6" rx="1.5"/><rect x="4.5" y="13.5" width="6" height="6" rx="1.5"/><rect x="13.5" y="13.5" width="6" height="6" rx="1.5"/>',
    list: '<path d="M9 7h11M9 12h11M9 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01"/>',
    edit: '<path d="m5 19 1-4L16.5 4.5l3 3L9 18z"/>',
    script: '<path d="M7 3.5h7.5l3.5 3.5v13.5H7z"/><path d="M14.5 3.5V7H18M9.8 11h5.4M9.8 14h5.4M9.8 17h3.4"/>'
  };
  const sico = n => '<i class="vs-i vs-is"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICS[n] || '') + '</svg></i>';
  const CHEV = '<svg class="vs-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  // a section head: the title, and what it holds in the quiet ink beside it
  const H = (t, meta) => '<div class="vs-h"><b>' + t + '</b>' + (meta ? '<s>' + meta + '</s>' : '') + '</div>';
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
    { id: 'logo', name: 'Motion graphics', icon: 'image' },
    { id: 'clip', name: 'Video', icon: 'movie' },
    { id: 'music', name: 'Music', icon: 'music_note' },
    { id: 'sfx', name: 'Sound', icon: 'graphic_eq' }
  ];
  // Camera moves for turning a photo into video (Higgsfield). The move is the CAMERA line of the
  // prompt. The prompt itself is the photo-to-video-prompt framework's 14 sections (2026-11-19):
  // promptFor() fills them from what the studio knows; Claude can rewrite them from the photo.
  const MOVES = [
    ['push_in', 'Push in', 'Slow dolly in at 1 km/h toward the centre of the frame, steady'],
    ['pull_back', 'Pull back', 'Slow dolly out at 1 km/h, revealing more of the space, steady'],
    ['pan_left', 'Pan left', 'Slow pan to camera-left on a fluid head, steady'],
    ['pan_right', 'Pan right', 'Slow pan to camera-right on a fluid head, steady'],
    ['tilt_up', 'Tilt up', 'Slow tilt up, steady'],
    ['tilt_down', 'Tilt down', 'Slow tilt down, steady'],
    ['crane_up', 'Crane up', 'Slow crane up, rising straight up, steady, no shake'],
    ['orbit', 'Orbit', 'Slow orbit to camera-right around the subject, about 15 degrees in total, smooth'],
    ['slide', 'Slide', 'Slow lateral slide to camera-right at 1 km/h, parallel to the subject, gimbal-smooth, parallax on foreground objects'],
    ['hold', 'Hold', 'Locked-off camera, no camera movement']
  ];
  const SOUND = 'Natural sound of the environment in each scene, every interaction with the environment, accurate sound details.';   // the sound line: user, 2026-11-13
  const PMAX = 2500;                // Kling's prompt cap; every model gets the same prompt
  const beatT = d => [0, .3, .7, 1].map(f => (Math.round(d * f * 10) / 10).toFixed(1));
  // the 14 sections, filled without seeing the photo (Claude's version, written from it, replaces this)
  function promptFor(c) {
    const mv = MOVES.find(x => x[0] === c.move); if (!mv) return '';
    const d = genDurOf(c), t = beatT(d), ppl = !!c.people, hold = c.move === 'hold', note = String(c.moveNote || '').trim();
    return [
      ['SCENE CONTEXT', 'Photoreal real estate film made from this exact photograph.' + (ppl ? ' The people in it stay calm and natural.' : ' No people in frame.') + (note ? ' Direction: ' + note.replace(/\.?$/, '.') : '')],
      ['ACTIVE REFERENCES', '@Image 1 = start frame: the photograph exactly as framed, every room, building, view, object and material in it' + (ppl ? ', and every person with their face, hair and clothing' : '') + '. 100% matches the reference.'],
      ['LOCATION MAP', 'Camera at the photograph\'s own height and position. Foreground, midground and background stay exactly where they are in @Image 1.'],
      ['FIRST FRAME / BLOCKING', 'Opens on the exact framing of @Image 1' + (ppl ? '; everyone in the pose and gaze of @Image 1' : '') + '.'],
      ['FORMAT MODE', 'One continuous shot, the camera does not cut on its own.'],
      ['OPTICS', 'The photograph\'s own lens and depth of field; no zoom, no lens change.'],
      ['CAMERA', mv[2] + '. Soft highlight roll-off, true-to-life colour.'],
      ['ACTION', t[0] + 's to ' + t[1] + 's: ' + (hold ? 'the frame holds on the exact framing of @Image 1' : 'the camera begins its move from the exact framing of @Image 1') + '.\n' +
        t[1] + 's to ' + t[2] + 's: ' + (hold ? 'the frame stays still' : 'the move continues evenly') + '; gentle natural motion where it already exists: light, leaves, water, curtains' + (ppl ? '; the people make only small natural movements, a breath, a blink, a slight turn of the head' : '') + '.\n' +
        t[2] + 's to ' + t[3] + 's: ' + (hold ? 'everything settles' : 'the move eases out and the frame comes to rest') + (ppl ? '; everyone holds still' : '') + '.'],
      ['PERFORMANCE', ppl ? 'Restraint: small movements, relaxed shoulders, a single slow blink, living eyes with catch-lights, pore-level skin realism.' : 'No people in frame; none appear.'],
      ['PHYSICS', 'Only natural motion that already exists in @Image 1; nothing warps or morphs.'],
      ['LIGHTING', 'Light stays as in @Image 1: same direction, colour and shadows.'],
      ['AUDIO', SOUND],
      ['STYLE', 'Photoreal editorial luxury film, fine natural grain.'],
      ['POSITIVE LOCKS', (ppl ? 'Faces, hair and outfits stay 100% as in @Image 1. ' : '') + 'Architecture, layout, furniture, materials and proportions stay 100% as in @Image 1. Any text, sign or logo stays sharp and unchanged. No new people, objects, text or logos appear.']
    ].map(s => s[0] + '\n' + s[1]).join('\n\n');
  }
  // what a written prompt was written for; when these change, the prompt is flagged (not dropped)
  const promptSig = c => [c.move, genDurOf(c), P.size, c.people ? 1 : 0].concat(c.genExt !== false && wideOf(c) ? ['ext'] : []).join('|');
  // EXTEND FIRST (2026-11-20, by request: a landscape photo was cropped to 9:16 before Higgsfield
  // saw it). A photo wider than the video is sent whole, full width and centred, with flat grey
  // bands above and below; the server has Nano Banana 2.1 paint those bands (more sky, more ground),
  // pastes the original photo back over the middle so it cannot drift, and animates that. On by
  // default for wide photos; Fill the frame, Zoom and the sliders do not apply to it.
  const EXT_CR = 2;                                   // Nano Banana 2.1 at 2k, priced 2026-11-20
  const EXT_GREY = '#808080';                         // a working file for the model, never artwork
  function photoAspect(c) { const m = media[c.mid], im = m && imgFor(m); return im && im.naturalWidth ? im.naturalWidth / im.naturalHeight : 0; }
  const wideOf = c => { const g = G(), a = photoAspect(c); return a > g.w / g.h * 1.03; };
  const extOn = c => wideOf(c) && c.genExt !== false;
  function extBox(c) { const g = G(), h = Math.round(g.w / photoAspect(c)); return { y: Math.round((g.h - h) / 2), h }; }
  const promptOf = c => c.genPromptBy && c.genPrompt ? c.genPrompt : promptFor(c);
  const ANIMS = [['none', 'None'], ['fade', 'Fade'], ['rise', 'Rise'], ['lines', 'Line by line'], ['words', 'Word by word']];
  const LBL = 92;

  // ── state ────────────────────────────────────────────────────────────────────────────
  const PKEY = 'provident-video-project', LKEY = 'provident-video-dev-logos', TKEY = 'provident-video-theme';
  function fresh() {
    return {
      v: 1, id: uid() + uid(), size: '9x16', clips: [], audio: [], texts: [], logos: [],
      brand: { on: true, align: 'left', vpos: 'top', scale: 100, wash: 40, partner: null, pScale: 100, tint: 'match', ink: 'white', qr: null, qrPos: 'bl', qrScale: 100 }
    };
  }
  let P = fresh();
  // ── NOTHING IS KEPT IN THE BROWSER (2026-11-26, by request). The project, the last video, the
  // developer logos and the library's folders live in the working folder on this Mac, written by
  // the local helper (/api/work/state); media files go there too (DB below). Save then sends them
  // to the ad set's Drive folder. Read once, synchronously, because the project is needed before
  // the first paint. What an older version left in the browser is moved over once and removed.
  // A helper started before this change has no such routes: the browser is used as before.
  const WS = (() => {
    const KEYS = { [PKEY]: 'project', 'provident-video-project-prev': 'prev', [LKEY]: 'logos', 'provident-video-lib': 'lib' };
    let st = {}, ok = false, q = Promise.resolve();
    try { const x = new XMLHttpRequest(); x.open('GET', '/api/work/state', false); x.send(); if (x.status === 200) { st = JSON.parse(x.responseText).state || {}; ok = true; } } catch (e) {}
    const post = (key, value) => (q = q.then(() => fetch('/api/work/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) }).then(r => r.ok, () => false)));
    if (ok) Object.keys(KEYS).forEach(k => { try { const v = localStorage.getItem(k); if (v == null) return;
      if (st[KEYS[k]] == null) { st[KEYS[k]] = v; post(KEYS[k], v).then(done => { if (done) localStorage.removeItem(k); }); } else localStorage.removeItem(k); } catch (e) {} });
    return { ok,
      getItem: k => ok ? (st[KEYS[k]] == null ? null : st[KEYS[k]]) : localStorage.getItem(k),
      setItem(k, v) { if (!ok) return localStorage.setItem(k, v); st[KEYS[k]] = String(v); post(KEYS[k], String(v)); },
      removeItem(k) { if (!ok) return localStorage.removeItem(k); delete st[KEYS[k]]; post(KEYS[k], null); },
      flush: () => q };
  })();
  try { const s = JSON.parse(WS.getItem(PKEY) || 'null'); if (s && s.v === 1) { P = Object.assign(fresh(), s); P.brand = Object.assign(fresh().brand, s.brand); } } catch (e) {}
  // ── THE LIBRARY BELONGS TO ITS VIDEO (2026-11-26, standing instruction: "assets are only related
  // to the sessions"). Every media file carries `pid`, the id of the video it was added to, and the
  // library lists only the open video's. A new video starts with an empty library; Reopen the last
  // video, Open project and Open from an ad set bring that video's own files back. A file with no
  // pid (from before this rule) belongs to whichever video is open when it is first seen.
  const ownV = m => { if (!m) return false; if (!m.pid) m.pid = P.id; return m.pid === P.id; };
  if (!SIZES[P.size]) P.size = '9x16';
  const media = {};                 // id -> { id, kind, name, url, dur, w, h, poster, peaks }
  let sel = null;                   // { kind: 'clip'|'audio'|'text'|'logo', id }
  // SEVERAL TEXTS AT ONCE (2026-11-17, by request): Shift- or Cmd-click on the Text track adds a
  // text to the group. `sel` stays the one last clicked; `multi` holds every id in the group and
  // only counts while `sel` is a text inside it (renderAll drops it otherwise). Dragging an end of
  // any member stretches or shrinks the whole group about its far end, so the spacing between the
  // texts scales with them; dragging a body moves them together; Delete removes them all.
  const multi = new Set();
  // VIDEO CLIPS TOO (2026-11-18, by request): the same Shift- or Cmd-click on the Video track.
  // Clips sit end to end, so an end of any member scales every member's length by one factor
  // (the right end moves each clip's end, the left end its start); a body moves them as a block.
  const GK = { text: 1, clip: 1 };
  const group = () => sel && GK[sel.kind] && multi.size > 1 && multi.has(sel.id) ? listOf(sel.kind).filter(t => multi.has(t.id)) : null;
  let T = 0, playing = false, exporting = false, dirty = true;
  let pps = 60, tab = 'media';
  const undo = [], redo = [];
  const vel = {}, ael = {}, imgs = {}, gvel = {};   // gvel: the motion graphics' own videos
  let actx = null, master = null;
  const stats = { seeked: 0 };       // for measuring scrub rate from the console
  const hits = {};                  // id -> { kind, x, y, w, h } of what was last painted

  let cv = $('#cv'), cx = cv.getContext('2d');   // let: the preview paints the Square into its own canvas through the same draw() (pvSquare)
  const tl = $('#tl'), tlin = $('#tlin');

  // ── storage: the working folder on this Mac (WS above, DB below). IDB is the browser store an
  // older version used: read once at boot to move its files over, then deleted.
  const IDB = {
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
      return new Promise((res, rej) => { const t = db.transaction('media', mode); const q = fn(t.objectStore('media')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('aborted')); });
    },
    put(rec) { if (!rec.pid) rec.pid = P.id; return this.tx('readwrite', s => s.put(rec)).catch(() => {}); },
    putStrict(rec) { if (!rec.pid) rec.pid = P.id; return this.tx('readwrite', s => s.put(rec)); },
    del(id) { return this.tx('readwrite', s => s.delete(id)).catch(() => {}); },
    all() { return this.tx('readonly', s => s.getAll()).catch(() => []); },
    idle() { return Promise.resolve(); }
  };
  // One file per media item in the working folder: its bytes once, its facts on every change.
  // Writes for one item run in order, so an older set of facts never lands on a newer one.
  const DB = !WS.ok ? IDB : {
    _up: {}, _q: {},
    putStrict(rec) {
      if (!rec.pid) rec.pid = P.id; if (!rec.at) rec.at = Date.now();
      const run = async () => {
        if (this._up[rec.id] !== rec.blob) {
          const r = await fetch('/api/work/media?id=' + rec.id, { method: 'PUT', body: rec.blob });
          if (!r.ok) throw new Error('work');
          this._up[rec.id] = rec.blob;
        }
        const meta = {}; Object.keys(rec).forEach(k => { if (k !== 'blob' && k !== 'url' && typeof rec[k] !== 'function' && !(rec[k] instanceof Element)) meta[k] = rec[k]; });
        meta.type = rec.blob.type || '';
        const r = await fetch('/api/work/meta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: rec.id, meta }) });
        if (!r.ok) throw new Error('work');
      };
      const p = (this._q[rec.id] || Promise.resolve()).catch(() => {}).then(run);
      this._q[rec.id] = p; return p;
    },
    put(rec) { return this.putStrict(rec).catch(() => {}); },
    del(id) { delete this._up[id]; const p = (this._q[id] || Promise.resolve()).catch(() => {}).then(() => fetch('/api/work/del', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })).catch(() => {}); this._q[id] = p; return p; },
    async all() {
      let list = []; try { list = (await (await fetch('/api/work/list')).json()).media || []; } catch (e) { return []; }
      const out = []; let i = 0;
      const one = async () => { while (i < list.length) { const m = list[i++];
        try { const b = await (await fetch('/api/work/media?id=' + m.id)).blob(), rec = Object.assign({}, m, { blob: new Blob([b], { type: m.type || b.type }) }); if (!rec.at && m.mtime) rec.at = Math.round(m.mtime * 1000); delete rec.type; delete rec.size; delete rec.mtime; this._up[m.id] = rec.blob; out.push(rec); } catch (e) {} } };
      await Promise.all([one(), one(), one(), one()]);
      const at = {}; list.forEach((m, n) => { at[m.id] = n; }); return out.sort((a, b) => at[a.id] - at[b.id]);
    },
    idle() { return Promise.all(Object.keys(this._q).map(k => this._q[k].catch(() => {}))); }
  };
  let saveT = 0;
  let loading = false;               // a project from CAS is being put in place: nothing may save over it
  function save() { if (loading) return; clearTimeout(saveT); saveT = setTimeout(() => { if (loading) return; try { WS.setItem(PKEY, JSON.stringify(P)); } catch (e) {} drivePaint(); }, 250); }
  function mark() { const s = JSON.stringify(P); if (undo[undo.length - 1] !== s) { undo.push(s); if (undo.length > 80) undo.shift(); redo.length = 0; } }
  function restore(from, to) {
    if (!from.length) return;
    to.push(JSON.stringify(P)); P = JSON.parse(from.pop());
    if (sel && !find(sel)) sel = null;
    partnerLoad(); fitCanvas(); renderAll();
  }

  // ── model helpers ────────────────────────────────────────────────────────────────────
  const clipLen = c => (c.out - c.in) / (c.rate || 1);        // rate: time stretch. The clip covers out - in seconds of the file, played rate times as fast
  const VRATE = [.25, 4], ARATE = [.5, 2];                    // how far a video clip, and a sound, can be stretched
  // ── shot markers: where the picture cuts INSIDE one continuous video ─────────────────────
  // The file is played once, muted and fast, into a 36x64 canvas; a frame that differs from the
  // one before by far more than the video's usual motion is a cut. Kept on the media record
  // (`cuts`, in the file's own seconds) so it is found once. Other layers and the playhead snap
  // to these (edges()), which is the point: text and sound can be lined up with the edit.
  // SPEED (2026-11-26): one scan at a time (each renderTimeline used to start one per uncut
  // video, all playing at once), never beside a filmstrip being built, and paused while the
  // pointer is down on the timeline or the video plays: the decoder is the scrubber's.
  const bgBusy = () => playing || exporting || !!drag;
  let cutBusy = false;
  const nextCut = () => { const m = P.clips.map(k => media[k.mid]).find(x => x && x.kind === 'video' && !(x.cuts && x.cutsV === 2)); if (m) setTimeout(() => findCuts(m), 300); };
  async function findCuts(rec) {
    if (!rec || rec.kind !== 'video' || (rec.cuts && rec.cutsV === 2) || rec._cutting || exporting || cutBusy || stripBusy) return;   // never scan during an export: it plays the file
    rec._cutting = true; cutBusy = true; let hold = 0;
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
      let left = Math.max(8000, (rec.dur || 30) / 2 * 1000 * 2.5);
      const done = new Promise(r => { v.onended = r; hold = setInterval(() => {
        if (bgBusy()) { if (!v.paused) v.pause(); return; }
        if (v.paused && !v.ended) v.play().catch(() => {});
        if ((left -= 250) <= 0) r();
      }, 250); });
      await v.play(); await done; clearInterval(hold); v.pause(); v.remove();
      const vals = d.map(e => e[1]).sort((p1, p2) => p1 - p2), med = vals[vals.length >> 1] || 0, thr = Math.max(40, med * 5), cuts = [];
      d.forEach(e => { if (e[1] < thr) return; const last = cuts[cuts.length - 1]; if (last && e[0] - last.t < .5) { if (e[1] > last.v) { last.t = e[0]; last.v = e[1]; } } else cuts.push({ t: e[0], v: e[1] }); });
      rec.cutsV = 2; rec.cuts = cuts.map(k => Math.round(k.t * 100) / 100).filter(t => t > .2 && t < (rec.dur || 1e9) - .2);
      DB.put(dbRec(rec));
      if (!drag) renderTimeline();
      if (sel && sel.kind === 'clip' && (find(sel) || {}).mid === rec.id) renderInspector();   // its Cut at scene changes count
    } catch (e) {} finally { clearInterval(hold); rec._cutting = false; cutBusy = false; }
    nextCut();
  }
  // ── filmstrips: a video clip on the timeline shows ITS OWN stretch of the file ─────────────
  // 2026-11-13, by request: every piece of a split clip showed the file's first frame, so the
  // pieces could not be told apart. Each video file gets one sprite of small frames, taken every
  // `step` seconds by seeking a spare <video> (in the page, or nothing is decoded), and
  // paintStrips() lays the frames that fall inside a clip's in..out along it. Kept in memory
  // only, built one file at a time, and never while the video plays or exports.
  let stripBusy = false;
  async function buildStrip(rec) {
    if (!rec || rec.kind !== 'video' || rec.strip || !rec.dur || stripBusy) return;
    // a strip built before is kept on the file (stripU, a JPEG) and only drawn back in
    if (rec.stripU && rec.stripM) {
      const S = rec.stripM, c = document.createElement('canvas'); c.width = S.fw * S.n; c.height = S.fh;
      const st = rec.strip = { c, step: S.step, n: S.n, fw: S.fw, fh: S.fh, got: new Uint8Array(S.n) };
      const im = new Image(); im.onload = () => { c.getContext('2d').drawImage(im, 0, 0); st.got.fill(1); paintStrips(); }; im.src = rec.stripU;
      return;
    }
    if (cutBusy) { setTimeout(() => buildStrip(rec), 1500); return; }
    stripBusy = true;
    const fh = 92, fw = Math.max(8, Math.round(fh * (rec.w || 9) / (rec.h || 16))), step = Math.max(.5, rec.dur / 120), n = Math.max(1, Math.ceil(rec.dur / step));
    const c = document.createElement('canvas'); c.width = fw * n; c.height = fh;
    const st = rec.strip = { c, step, n, fw, fh, got: new Uint8Array(n) }, x = c.getContext('2d');
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = rec.url;
    v.style.cssText = 'position:fixed;left:0;bottom:0;width:2px;height:2px;opacity:.01;pointer-events:none'; document.body.appendChild(v);
    try {
      await once(v, 'loadeddata');
      for (let i = 0; i < n; i++) {
        while (bgBusy()) await new Promise(r => setTimeout(r, 300));
        if (!media[rec.id]) break;            // removed from the library meanwhile
        v.currentTime = Math.min(rec.dur - .05, i * step + step / 2); await once(v, 'seeked');
        x.drawImage(v, i * fw, 0, fw, fh); st.got[i] = 1;
        if (i % 8 === 7 || i === n - 1) paintStrips();
      }
      if (st.got.every(Boolean)) { try { rec.stripU = c.toDataURL('image/jpeg', .7); rec.stripM = { step, n, fw, fh }; DB.put(dbRec(rec)); } catch (e) {} }
    } catch (e) {} finally { v.removeAttribute('src'); v.load(); v.remove(); stripBusy = false; }
    const next = P.clips.map(k => media[k.mid]).find(m => m && m.kind === 'video' && !m.strip); if (next) buildStrip(next); else nextCut();
  }
  function paintStrips() {
    tlin.querySelectorAll('canvas[data-strip]').forEach(k => {
      const c = P.clips.find(q => q.id === k.dataset.strip), m = c && media[c.mid], st = m && m.strip; if (!st) return;
      const wpx = Math.max(6, clipLen(c) * pps - 1), sc = Math.min(2, 8000 / wpx), tw = 46 * st.fw / st.fh;   // 46: the clip's height on the timeline
      k.width = Math.max(2, Math.round(wpx * sc)); k.height = Math.round(46 * sc);
      const x = k.getContext('2d');
      for (let px = 0; px < wpx; px += tw) {
        const i = Math.max(0, Math.min(st.n - 1, Math.floor((c.in + (px + tw / 2) / pps * (c.rate || 1)) / st.step)));
        if (st.got[i]) x.drawImage(st.c, i * st.fw, 0, st.fw, st.fh, px * sc, 0, tw * sc, k.height);
      }
    });
  }
  // marker times on the timeline: each cut that falls inside the part of a clip that is used
  // ── MARKERS, FOUR KINDS, EACH WITH ITS OWN SWITCH (2026-11-13, by request) ───────────────
  // scene: a shot change inside one video file (findCuts) · cut: where two clips meet, so a split
  // shows too · voice: where the voice stops (a pause, from the loudness) on the Sound track ·
  // beat: the music's beat or every fourth one (findBeats) on the Music track. The playhead and
  // anything dragged snap to whichever are on. The choice is kept per computer, not in the project.
  const MKEY = 'provident-video-markers';
  const MK = Object.assign({ scene: true, cut: true, voice: true, beat: 'bar' }, (() => { try { return JSON.parse(localStorage.getItem(MKEY) || '{}') || {}; } catch (e) { return {}; } })());
  const MKT = { scene: 'Scene change', cut: 'Clip cut', voice: 'Voice pause', beat: 'Beat' };
  // where the voice stops: 0.2 s or more of speech followed by 0.3 s of quiet, or by the end of the file
  function voiceStops(m) {
    if (!m || !m.peaks || m.peaks.length < 9) return [];
    if (m._stops && m._stopsN === m.peaks.length) return m._stops;
    const pk = m.peaks, N = pk.length, per = (m.dur || N / 40) / N, srt = pk.slice().sort((x, y) => x - y), thr = Math.max(.03, srt[Math.floor(N * .95)] * .14);
    const v = pk.map(x => x > thr);
    for (let i = 0, gap = 0; i < N; i++) { if (v[i]) { if (gap && gap <= 6 && i - gap - 1 >= 0) for (let j = i - gap; j < i; j++) v[j] = true; gap = 0; } else gap++; }
    const out = []; let run = 0;
    for (let i = 0; i <= N; i++) {
      if (i < N && v[i]) { run++; continue; }
      if (run >= 8) { let g = 0; while (i + g < N && !v[i + g]) g++; if (g >= 12 || i + g >= N) out.push(i * per); }
      run = 0;
    }
    m._stopsN = N; return m._stops = out;
  }
  // the music's beat: the rise in loudness 100 times a second, the tempo from its autocorrelation
  // (70 to 180 beats a minute, leaning to 120), then the period and the phase tuned so a grid of
  // beats sits on the rises. A track with no steady pulse gets none. In memory only.
  function beatGrid(d, sr) {
    const none = { all: [], bars: [], bpm: 0 };
    const hop = Math.max(1, Math.round(sr / 100)), N = Math.floor(d.length / hop), fr = sr / hop;
    if (N < fr * 4) return none;
    const e = new Float32Array(N), f = new Float32Array(N), g = new Float32Array(N), ps = new Float64Array(N + 1);
    for (let i = 0; i < N; i++) { let q = 0; for (let j = i * hop, z = j + hop; j < z; j += 2) q += d[j] * d[j]; e[i] = Math.log(1 + 1000 * Math.sqrt(q / (hop / 2))); }
    for (let i = 1; i < N; i++) f[i] = Math.max(0, e[i] - e[i - 1]);
    for (let i = 0; i < N; i++) ps[i + 1] = ps[i] + f[i];
    const W = Math.round(fr); let mean = 0;
    for (let i = 0; i < N; i++) { const a = Math.max(0, i - W), b = Math.min(N, i + W); g[i] = Math.max(0, f[i] - (ps[b] - ps[a]) / (b - a)); mean += g[i]; }
    mean /= N; if (!(mean > 1e-6)) return none;
    const lo = Math.round(fr * 60 / 180), hi = Math.round(fr * 60 / 70); let bestL = lo, bs = -1;
    for (let L = lo; L <= hi; L++) { let r = 0; for (let i = 0; i + L < N; i++) r += g[i] * g[i + L]; r = r / (N - L) * Math.exp(-.5 * Math.pow(Math.log2(L / (fr * .5)) / .8, 2)); if (r > bs) { bs = r; bestL = L; } }
    const at = x => { const i = Math.floor(x); return i < 0 || i + 1 >= N ? 0 : g[i] + (g[i + 1] - g[i]) * (x - i); };
    const comb = (p, ph) => { let q = 0, n = 0; for (let x = ph; x < N - 1; x += p) { q += at(x); n++; } return n ? q / n : 0; };
    let bp = bestL, bph = 0, bsc = -1;
    for (let p = bestL - 1; p <= bestL + 1; p += .02) for (let ph = 0; ph < p; ph += 1) { const q = comb(p, ph); if (q > bsc) { bsc = q; bp = p; bph = ph; } }
    for (let ph = Math.max(0, bph - 1), z = bph + 1; ph <= z; ph += .1) { const q = comb(bp, ph); if (q > bsc) { bsc = q; bph = ph; } }
    if (bsc < mean * 1.4) return none;
    const all = []; for (let x = bph; x < N; x += bp) all.push(Math.round(x / fr * 1000) / 1000);
    let bo = 0, bb = -1;                        // the bar starts on whichever of the four beats is loudest on average
    for (let o = 0; o < 4; o++) { let q = 0, n = 0; for (let k = o; k < all.length; k += 4) { q += at(all[k] * fr); n++; } q = n ? q / n : 0; if (q > bb) { bb = q; bo = o; } }
    return { all, bars: all.filter((t, k) => k % 4 === bo), bpm: Math.round(60 * fr / bp) };
  }
  async function findBeats(rec) {
    if (!rec || (rec.kind !== 'audio' && !rec.peaks) || rec.beats || rec._beating || exporting) return;
    rec._beating = true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext, c = new AC();
      const buf = await c.decodeAudioData(await rec.blob.arrayBuffer()); c.close();
      rec.beats = beatGrid(buf.getChannelData(0), buf.sampleRate);
    } catch (e) { rec.beats = { all: [], bars: [], bpm: 0 }; } finally { rec._beating = false; }
    renderTimeline(); mkPaint();
  }
  function markersAll() {
    const out = [], st = clipStarts();
    if (MK.scene) P.clips.forEach((c, i) => { const m = media[c.mid]; if (m && m.cuts) m.cuts.forEach(t => { if (t > c.in + .05 && t < c.out - .05) out.push({ t: st[i] + (t - c.in) / (c.rate || 1), k: 'scene' }); }); });
    if (MK.cut) st.forEach((t, i) => { if (i) out.push({ t, k: 'cut' }); });
    P.audio.forEach(a => {
      const m = media[a.mid]; if (!m) return;
      const end = a.at + a.dur, map = ft => a.at + (ft - a.in) / (a.rate || 1);
      if (a.track === 'sfx' && MK.voice) voiceStops(m).forEach(ft => { const t = map(ft); if (t > a.at + .05 && t <= end + 1e-3) out.push({ t, k: 'voice' }); });
      if (a.track === 'music' && MK.beat !== 'off' && m.beats) (MK.beat === 'bar' ? m.beats.bars : m.beats.all).forEach(ft => { const t = map(ft); if (t >= a.at && t < end) out.push({ t, k: 'beat' }); });
    });
    return out;
  }
  function markers() { return markersAll().map(x => x.t); }
  const spdTag = x => (x.rate || 1) !== 1 ? ' · ' + Math.round(x.rate * 100) + '%' : '';
  // CLIP LENGTHS (2026-11-25, by request): each piece on the timeline can carry its length. Always on
  // the piece being resized or stretched, so the figure is read as it changes; on every piece when the
  // toggle in the timeline bar is on (remembered per browser).
  const LENKEY = 'provident-video-lens';
  let LENS = false; try { LENS = localStorage.getItem(LENKEY) === '1'; } catch (e) {}
  const lenFmt = t => t < 60 ? (Math.round(t * 10) / 10).toFixed(1) + ' s' : fmt(t).replace(/\.\d+$/, '');
  const lenTag = (id, t) => LENS || (drag && drag.moved && !drag.done && drag.mode !== 'move' && drag.mode !== 'seek' && (drag.id === id || (drag.g && drag.g.some(x => x.id === id)))) ? '<em class="vs-len">' + lenFmt(t) + '</em>' : '';
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
  // THE SCRUBBER SHOWS WHAT IT LANDS ON (2026-11-13, by request): scrubbing or stepping onto a
  // video clip selects it, so its options are in the right rail without a click. It never takes
  // the selection from a text, graphic or sound being worked on, and never runs during playback.
  function landOn() {
    if (playing || exporting || (sel && sel.kind !== 'clip')) return;
    const a = clipAt(T), id = a && a.c.id;
    if (id && (!sel || sel.id !== id)) { sel = { kind: 'clip', id }; selPaint(); renderInspector(); }
  }
  // SPEED (2026-11-26): the selection ring alone, without rebuilding the timeline (renderAll cost
  // ~37 ms on a 17-clip video, and the scrubber ran it at every clip it crossed)
  function selPaint() {
    tlin.querySelectorAll('.vs-it').forEach(el => { const on = !!sel && sel.kind === el.dataset.kind && sel.id === el.dataset.id; if (on) el.dataset.on = '1'; else delete el.dataset.on; });
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
      // SPEED (2026-11-26): a photo is read for its size and a 92px poster once; the library and the
      // timeline show the poster, never the full file (renders run to 5504px, ten of them in view
      // were decoded at full size on every library paint)
      if (rec.w && rec.h && rec.poster) { rec.dur = 0; return rec; }
      const im = new Image(); im.decoding = 'async'; im.src = rec.url; await once(im, 'load');
      rec.w = im.naturalWidth; rec.h = im.naturalHeight; rec.dur = 0;
      if (!/svg/.test(rec.blob.type || '')) try {
        const c = document.createElement('canvas'); c.height = 92; c.width = Math.max(8, Math.round(92 * rec.w / rec.h));
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); rec.poster = c.toDataURL('image/jpeg', .72); rec._newPoster = true;
      } catch (e) {}
    }
    return rec;
  }
  async function addFiles(files, want, pl) {
    let added = 0, firstVideo = !P.clips.length, marked = false, at = pl ? pl.t : 0, ci = pl ? pl.i : 0;
    for (const f of Array.from(files)) {
      const ty = f.type || '';
      let kind = ty.startsWith('video') ? 'video' : ty.startsWith('audio') ? 'audio' : ty.startsWith('image') ? (want === 'logo' ? 'logo' : 'image') : null;
      if (!kind && /\.(mov|mp4|m4v|webm)$/i.test(f.name)) kind = 'video';
      if (!kind && /\.(mp3|wav|m4a|aac|ogg)$/i.test(f.name)) kind = 'audio';
      if (!kind) { toast(f.name + ' is not a video, audio or image file.'); continue; }
      const rec = { id: uid(), at: Date.now(), kind, name: f.name.replace(/\.[^.]+$/, ''), blob: f };
      if (kind === 'video' && (want === 'logo' || want === 'cmrep' || (want === 'place' && pl && pl.trk === 'logo'))) rec.gfx = 1;
      // a Claude Motion export (picked up from Downloads, or dropped here while CASV waits for one)
      const cmx = kind === 'video' && rec.gfx && CMW ? CMW : null;
      if (cmx) { rec.cm = cmx.url; if (cmx.rep && media[cmx.rep]) rec.name = media[cmx.rep].name; cmStop(); }
      try { await probe(rec); } catch (e) {
        if (kind !== 'video') { toast('Could not read ' + f.name + '.'); continue; }
        // a video Chrome cannot play (a ProRes .mov, often with a transparent background): this Mac
        // converts it to HEVC with alpha, which keeps the transparency (2026-11-26)
        try {
          if (rec.url) URL.revokeObjectURL(rec.url);
          toast('Converting ' + f.name + ' so the browser can play it…');
          const r = await fetch('/api/convert?id=' + rec.id, { method: 'PUT', body: f });
          if (!r.ok) { let m = ''; try { m = (await r.json()).error || ''; } catch (x) {} throw new Error(m || 'convert'); }
          rec.blob = new File([await r.blob()], f.name.replace(/\.[^.]+$/, '') + '.mov', { type: 'video/quicktime' });
          await probe(rec);
          toast(r.headers.get('X-CASV-Alpha') === 'opaque'
            ? f.name + ' is converted, but the file has no transparent background (ProRes 422, or exported as RGB only). For transparency, export ProRes 4444 with RGB + Alpha, or a WebM.'
            : f.name + ' is converted and in the library. Its transparency is kept.');
        } catch (e2) {
          toast(e2 && e2.message && e2.message !== 'convert' && e2.message !== 'load' ? e2.message : 'This browser cannot play ' + f.name + ', and this Mac could not convert it. Try an MP4 (H.264), or a WebM for transparency.'); continue;
        }
      }
      media[rec.id] = rec; added++; delete rec._newPoster;
      if (P.casBg) (P.casBg.media = P.casBg.media || []).push(rec.id);
      DB.put(dbRec(rec));
      if (cmx && cmx.rep) {                   // Update from Claude Motion: the new export takes the old one's places
        mark(); let n = 0; P.logos.forEach(l => { if (l.mid === cmx.rep) { l.mid = rec.id; n++; } });
        // the old export goes: its star and folder pass to the new one, which takes its name
        if (LIB.meta[cmx.rep]) { LIB.meta[rec.id] = LIB.meta[cmx.rep]; libSave(); }
        removeMedia(cmx.rep); save();
        toast(rec.name + ' is updated from Claude Motion' + (n ? ' on the timeline (' + n + (n === 1 ? ' place).' : ' places).') : '.'));
        continue;
      }
      if (want === 'place') {                 // dropped on the timeline: where the marker showed
        if (!marked) { mark(); marked = true; }
        if (kind === 'audio') {
          const tk = pl.trk === 'sfx' ? 'sfx' : 'music', keep = T; T = at; addAudio(rec.id, tk, true); T = keep;
          const a = P.audio[P.audio.length - 1]; if (a && a.mid === rec.id) { a.at = at; at += a.dur; }
        } else if ((kind === 'image' || kind === 'video') && pl.trk === 'logo' && P.clips.length) {
          const keep = T; T = at; addLogo(rec.id, true); T = keep;
          const l = P.logos[P.logos.length - 1]; if (l && l.mid === rec.id) { l.at = at; at += l.dur; }
        } else if (kind === 'video' || kind === 'image') {
          addClip(rec.id, true); const c = P.clips.pop(); P.clips.splice(Math.min(ci, P.clips.length), 0, c); ci++;
        }
        continue;
      }
      // the first video dropped goes straight onto the timeline; so does anything dropped on the stage
      if (rec.gfx) { if (P.clips.length) addLogo(rec.id, true); }
      else if (kind === 'image' && want === 'stage' && P.clips.length) addLogo(rec.id, true);
      else if ((kind === 'video' || kind === 'image') && (firstVideo || want === 'stage')) { addClip(rec.id, true); firstVideo = false; }
      if (kind === 'audio' && want === 'stage') addAudio(rec.id, 'music', true);
    }
    if (added) {
      const k = Object.values(media).pop().kind;
      if (want !== 'stage' && want !== 'place') tab = k === 'audio' ? 'audio' : k === 'logo' || want === 'logo' || want === 'cmrep' ? 'logos' : 'media';
      renderAll();
    }
  }
  function removeMedia(id) {
    if (hear && hear.id === id) hearStop();
    if (LIB.meta[id]) { delete LIB.meta[id]; libSave(); }
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
  // Detach audio: the clip's own sound becomes a piece on the Music track (the same file, no copy),
  // lined up under the clip and at its speed, and the clip is muted. The loudness read doubles
  // as the test that the file has any sound at all.
  async function detachAudio(c) {
    const m = c && media[c.mid]; if (!m || m.kind !== 'video' || m._det) return;
    if (!m.peaks) {
      m._det = true; toast('Reading the sound…');
      try {
        const AC = window.AudioContext || window.webkitAudioContext, x = new AC();
        const buf = await x.decodeAudioData(await m.blob.arrayBuffer()); x.close();
        const d = buf.getChannelData(0), n = Math.max(1, Math.ceil(buf.duration * 40)), step = Math.floor(d.length / n) || 1, pk = [];
        for (let i = 0; i < n; i++) { let q = 0; for (let j = i * step, e = Math.min(d.length, j + step); j < e; j += 8) { const v = Math.abs(d[j]); if (v > q) q = v; } pk.push(Math.round(q * 100) / 100); }
        m.peaks = pk; DB.put({ id: m.id, kind: m.kind, name: m.name, blob: m.blob, dur: m.dur, w: m.w, h: m.h, poster: m.poster, peaks: pk, cuts: m.cuts, cutsV: m.cutsV });
      } catch (e) {} finally { m._det = false; }
    }
    const i = P.clips.indexOf(c);
    if (i < 0) return;
    if (!m.peaks || !m.peaks.some(v => v > .01)) { toast('This clip has no sound to detach.'); return; }
    mark();
    const a = { id: uid(), mid: c.mid, at: clipStarts()[i], dur: clipLen(c), in: c.in, vol: c.mute ? 1 : c.vol, fi: 0, fo: 0, track: 'music' };
    if (c.rate && c.rate !== 1) a.rate = c.rate;
    c.mute = true; P.audio.push(a); sel = { kind: 'audio', id: a.id };
    save(); renderAll(); toast('Sound moved to the Music track. The clip itself is now muted.');
    return a;
  }
  // EXTEND PHOTO (2026-11-25): CAS's Generative fill editor (genfill.js, the helper on :7315), opened on
  // a photo clip. It fills the frame around the photo with Firefly or Nano Banana; the result is a
  // NEW photo in the media list and the clip is pointed at it, so Undo and the original both remain.
  // Firefly is the engine it opens on here until the user picks another (asked for by name).
  function extendPhoto(c) {
    const m = c && media[c.mid], G = window.ProvidentGenfill; if (!G || !m || m.kind !== 'image') return;
    try { if (!localStorage.getItem('provident-genfill-engine')) localStorage.setItem('provident-genfill-engine', 'firefly'); } catch (e) {}
    const sizes = [{ key: '9x16', label: '9:16', W: 1080, H: 1920, pad: [260, 100, 460, 100] }, { key: '1x1', label: '1:1', W: 1080, H: 1080, pad: [80, 80, 80, 80] }];
    G.open({ src: m.url, sizes, start: P.size, onApply: (key, url) => {
      (async () => {
        const blob = await (await fetch(url)).blob();
        const rec = { id: uid(), kind: 'image', name: (m.name || 'Photo') + ' extended ' + (key === '1x1' ? '1x1' : '9x16'), blob: new File([blob], 'extended.jpg', { type: blob.type || 'image/jpeg' }) };
        await probe(rec); media[rec.id] = rec;
        if (P.casBg) (P.casBg.media = P.casBg.media || []).push(rec.id);
        DB.put(dbRec(rec));
        if (P.clips.indexOf(c) < 0) { renderAll(); toast('The extended photo is in Your media.'); return; }
        mark(); c.mid = rec.id; c.fit = 'fill'; c.z = 100; c.fx = 50; c.fy = 50;
        save(); renderAll(); toast('Photo extended. The original is still in Your media.');
      })().catch(() => toast('The extended photo could not be added.'));
    } });
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
    const mm = media[mid], vid = mm.kind === 'video', want0 = vid ? Math.max(.2, mm.dur || 5) : 5;
    const end = total(); let at = T, dur = want0;
    if (end > 0) { if (end - at < 1) at = Math.max(0, end - 3); dur = Math.min(want0, end - at); }
    const frameLike = vid && mm.w && mm.h && Math.abs(mm.w / mm.h - G().w / G().h) < .04;
    const l = { id: uid(), mid, at, dur, x: 50, y: 50, w: vid ? (frameLike ? 100 : 60) : 30, op: 100, fade: !vid, tint: vid ? 'orig' : P.brand.tint === 'match' ? 'match' : 'orig' };
    if (vid) l.in = 0;
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
      const st = span('clip', it)[0]; nb.in = it.in + (T - st) * (it.rate || 1); it.out = nb.in;
    } else {
      const d = T - it.at; nb.at = T; nb.dur = it.dur - d; it.dur = d;
      if (tg.kind === 'audio') { nb.in = it.in + d * (it.rate || 1); it.fo = 0; nb.fi = 0; }
    }
    L.splice(L.indexOf(it) + 1, 0, nb);
    sel = { kind: tg.kind, id: nb.id }; renderAll();
  }
  // CUT AT MARKERS (2026-11-24): a video clip is cut at each scene change found in its file, a
  // voiceover piece (Sound track) at each voice pause. File times, so speed and trims hold; a cut
  // nearer than 0.2 s to an end or to the cut before it is skipped. The pieces stay where they were.
  const sceneCuts = c => { const m = media[c.mid], r = c.rate || 1, out = []; if (!m || m.kind !== 'video' || !m.cuts) return out;
    m.cuts.slice().sort((x, y) => x - y).forEach(t => { if (t > (out.length ? out[out.length - 1] : c.in) + .2 * r && t < c.out - .2 * r) out.push(t); }); return out; };
  const voiceCuts = a => { const m = media[a.mid], r = a.rate || 1, end = a.in + a.dur * r, out = []; if (a.track !== 'sfx' || !m) return out;
    voiceStops(m).forEach(t => { if (t > (out.length ? out[out.length - 1] : a.in) + .2 * r && t < end - .2 * r) out.push(t); }); return out; };
  function cutAtMarkers(kind, one) {
    const L = kind === 'clip' ? P.clips : P.audio, cutsOf = kind === 'clip' ? sceneCuts : voiceCuts;
    const jobs = (one ? [one] : L.slice()).map(it => [it, cutsOf(it)]).filter(j => j[1].length);
    if (!jobs.length) {
      const wait = kind === 'clip' && (one ? [one] : P.clips).some(c => { const m = media[c.mid]; return m && m.kind === 'video' && !m.cuts; });
      toast(wait ? 'Still looking for scene changes. Try again in a moment.' : kind === 'clip' ? 'No scene changes were found to cut at.' : 'No voice pauses were found to cut at.'); return 0;
    }
    mark(); let made = 0;
    jobs.forEach(([it, cuts]) => {
      const r = it.rate || 1, parts = [it], end = kind === 'clip' ? it.out : it.in + it.dur * r, fo = it.fo;
      cuts.forEach(t => { const nb = Object.assign({}, parts[parts.length - 1], { id: uid(), in: t }); if (kind === 'clip') delete nb.tr; else nb.fi = 0; parts.push(nb); });
      parts.forEach((p, i) => { const to = i + 1 < parts.length ? parts[i + 1].in : end;
        if (kind === 'clip') p.out = to; else { if (i) p.at = it.at + (p.in - it.in) / r; p.dur = (to - p.in) / r; p.fo = i + 1 < parts.length ? 0 : fo; } });
      L.splice.apply(L, [L.indexOf(it) + 1, 0].concat(parts.slice(1))); made += cuts.length;
    });
    save(); renderAll();
    toast((made === 1 ? '1 cut' : made + ' cuts') + ' made at ' + (kind === 'clip' ? 'scene changes.' : 'voice pauses.'));
    return made;
  }
  function del() {
    const it = find(sel); if (!it) return;
    const g = group();
    mark(); if (g && sel.kind === 'clip') P.clips = P.clips.filter(t => !multi.has(t.id)); else if (g) P.texts = P.texts.filter(t => !multi.has(t.id)); else { const L = listOf(sel.kind); L.splice(L.indexOf(it), 1); } sel = null;
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
    const tail = want >= end;                 // the last frames of the file: nothing left to play
    want = clamp(want, 0, Math.max(0, end));
    setVol(el, vol);
    if (playing) {
      // THE END OF A FILE RESTS ON ITS LAST FRAME (2026-11-17). A video that has run out is
      // "ended", which reads as paused, and play() on an ended video starts it again from 0. So a
      // clip that used its file to the very end flashed its first frame, was sought back, ran out
      // again, and the clock (held while a clip seeks) never reached the next clip.
      if (tail || el.ended) { if (!el.paused) el.pause(); if (!tail && !el.seeking) el.currentTime = want; return; }
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
      const vr = c.rate || 1;
      if (el.playbackRate !== vr) { el.playbackRate = vr; try { el.preservesPitch = true; } catch (e) {} }
      drive(el, c.in + (T - st[i]) * vr, on, c.mute ? 0 : c.vol);
      if (on && playing && (el.seeking || el.readyState < 2)) hold = true;
      // pre-roll the next clip so the cut lands on a decoded frame
      if (!on && st[i] > T && st[i] - T < 1.2 && !el.seeking && Math.abs(el.currentTime - c.in) > .02) el.currentTime = c.in;
      // just finished: hold its last frame, the next clip's transition draws it underneath
      if (!on && T >= st[i] + len && T - (st[i] + len) < 1.6 && !el.seeking && Math.abs(el.currentTime - (c.out - .04)) > .15) el.currentTime = Math.max(c.in, c.out - .04);
    });
    Object.keys(vel).forEach(id => { if (!live[id]) { vel[id].pause(); vel[id].removeAttribute('src'); delete vel[id]; } });
    const liveG = {};
    P.logos.forEach(l => {
      const m = media[l.mid]; if (!m || m.kind !== 'video') return;
      liveG[l.id] = 1;
      const el = elFor(gvel, l.id, 'video', m.url); el.muted = true;
      const rel = T - l.at, on = rel >= 0 && rel < l.dur;
      drive(el, (l.in || 0) + rel, on, 0);
      if (on && playing && (el.seeking || el.readyState < 2)) hold = true;
      if (!on && l.at > T && l.at - T < 1.2 && !el.seeking && Math.abs(el.currentTime - (l.in || 0)) > .02) el.currentTime = l.in || 0;   // pre-roll
    });
    Object.keys(gvel).forEach(id => { if (!liveG[id]) { gvel[id].pause(); gvel[id].removeAttribute('src'); delete gvel[id]; } });
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
    ensureCtx(); if (hearStop()) renderLib();
    if (T >= total() - .02) T = 0;
    playing = true; lastNow = performance.now(); paintTransport();
  }
  function pause() { playing = false; sync(); paintTransport(); }
  function seek(t) { T = clamp(t, 0, Math.max(0, total())); dirty = true; paintPlayhead(); }
  // Scrubbing lands on whole frames, and locks onto the start and end of whatever is near.
  function edges(skipId) {
    const c = [0]; let acc = 0; P.clips.forEach(k => { acc += clipLen(k); c.push(acc); });
    [P.audio, P.texts, P.logos].forEach(L => L.forEach(i => { if (!(skipId instanceof Set ? skipId.has(i.id) : i.id === skipId)) c.push(i.at, i.at + i.dur); }));
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
  // the navy wash behind a graphic: the whole frame, the brand navy (ART.wash), at the graphic's
  // own fade and opacity
  function drawWash(l) {
    if (!l.washOn) return;
    const g = G(), rel = T - l.at, k = (l.fade && !(!playing && sel && sel.id === l.id) ? Math.min(ease(rel / .35), ease((l.dur - rel) / .3)) : 1);
    cx.save(); cx.globalAlpha = 1; cx.fillStyle = 'rgba(' + ART.wash + ',' + ((l.wash == null ? 40 : l.wash) / 100 * k * (l.op / 100)).toFixed(3) + ')'; cx.fillRect(0, 0, g.w, g.h); cx.restore();
  }
  function drawLogo(l) {
    const m = media[l.mid]; if (!m) return;
    if (m.kind === 'video') {                 // a motion graphic: its own frame, its own colours
      const el = gvel[l.id]; if (!el || !el.videoWidth || (el.readyState < 2 && !el._shown)) return; el._shown = 1;
      const g = G(), q = lgeo(l), rel = T - l.at, vw = el.videoWidth, vh = el.videoHeight;
      // A FULL-FRAME MOTION GRAPHIC COVERS EVERY SIZE (2026-11-26, by request: "overlay mograph should
      // crop on 1:1"): one made for the Reel (9:16, at full width there) fills the Square too,
      // centred and cropped top and bottom, instead of standing in it as a narrow column
      const full = Math.abs(vw / vh - 1080 / 1920) < .03 && l.w >= 99;
      let w = g.w * q.w / 100, h = w * vh / vw, x = g.w * q.x / 100 - w / 2, y = g.h * q.y / 100 - h / 2;
      if (full) { const sc = Math.max(g.w / vw, g.h / vh); w = vw * sc; h = vh * sc; x = (g.w - w) / 2; y = (g.h - h) / 2; }
      cx.save(); cx.globalAlpha = (l.op / 100) * (l.fade && !(!playing && sel && sel.id === l.id) ? Math.min(ease(rel / .35), ease((l.dur - rel) / .3)) : 1);
      cx.drawImage(el, x, y, w, h); cx.restore();
      hits[l.id] = { kind: 'logo', x, y, w, h }; return;
    }
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
  // THE QR CODE (2026-11-18, by request): one uploaded image for the whole video, a small rounded
  // square on a white plate (so it scans over any footage) in a bottom corner of the safe area, or
  // top right in the wordmark's row. qrBox is the one geometry. Bottom right keeps clear of the
  // Reels buttons (QR.rail, 9:16 only); a bottom wordmark lifts a bottom QR above its row; top
  // right needs the wordmark top left, otherwise it falls back to bottom left.
  const QR = { w: .16, pad: .07, r: .13, rail: 170, plate: '#ffffff' };
  let qImg = null;
  const qrTopOk = () => { const b = P.brand; return b.on && b.vpos === 'top' && b.align === 'left'; };
  function qrBox() {
    const b = P.brand, g = G(), S = g.w * QR.w * (b.qrScale || 100) / 100, pos = b.qrPos === 'tr' && !qrTopOk() ? 'bl' : b.qrPos || 'bl';
    const lift = b.on && b.vpos === 'bottom' ? ART.logoPx * (b.scale / 100) * 2.4 : 0;
    return { S, x: pos === 'bl' ? g.l : g.w - g.r - S - (pos === 'br' && P.size === '9x16' ? QR.rail : 0), y: pos === 'tr' ? g.t : g.h - g.b - S - lift };
  }
  function drawQr() {
    const q = P.brand.qr; if (!q) return;
    if (!qImg || qImg._u !== q.u) { const im = new Image(); im._u = q.u; im.onload = () => { dirty = true; }; qImg = im; im.src = q.u; }
    if (!qImg.complete || !qImg.naturalWidth) return;
    const k = qrBox(), pd = k.S * QR.pad;
    cx.save(); cx.fillStyle = QR.plate; cx.beginPath(); cx.roundRect(k.x, k.y, k.S, k.S, k.S * QR.r); cx.fill();
    cx.imageSmoothingEnabled = k.S - pd * 2 < qImg.naturalWidth; cx.drawImage(qImg, k.x + pd, k.y + pd, k.S - pd * 2, k.S - pd * 2); cx.restore();
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
    // a motion graphic's navy wash sits on the picture only: under every text and graphic (2026-11-26, by request)
    P.logos.forEach(l => { if (T >= l.at && T < l.at + l.dur) drawWash(l); });
    P.texts.forEach(t => { if (T >= t.at && T < t.at + t.dur && t.call !== 'cta') (t.call ? drawCallout : drawText)(t); });
    P.logos.forEach(l => { if (T >= l.at && T < l.at + l.dur) drawLogo(l); });
    // the end card goes over everything and carries the wordmark itself, so the corner lockup rests
    const ctas = P.texts.filter(t => t.call === 'cta' && T >= t.at && T < t.at + t.dur);
    ctas.forEach(ctaWash);
    if (!ctas.some(t => t.capHide === 'hide')) P.audio.forEach(drawCaption);
    if (ctas.length) ctas.forEach(drawCta); else { drawBrand(); drawQr(); }
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
    const grp = group(), on = (k, id) => sel && sel.kind === k && (sel.id === id || (grp && multi.has(id))) ? ' data-on="1"' : '';
    const hd = '<span class="vs-hd l" data-h="l"></span><span class="vs-hd r" data-h="r"></span>';
    TRACKS.forEach(tr => {
      let body = '', rowH = 38;
      if (tr.id === 'clip') {
        rowH = 54; const st = clipStarts();
        P.clips.forEach((c, i) => {
          const m = media[c.mid] || {};
          body += '<div class="vs-it" data-kind="clip" data-id="' + c.id + '" tabindex="0" role="button" aria-label="' + esc((m.name || 'Clip') + ', ' + (m.kind === 'video' ? 'video' : 'photo') + ' clip') + '"' + on('clip', c.id) + ' style="left:' + (LBL + st[i] * pps) + 'px;width:' + Math.max(6, clipLen(c) * pps - 1) + 'px;top:4px;' +
            (m.poster || m.kind === 'image' ? "background-image:url('" + (m.poster || m.url) + "')" : '') + '">' + (m.kind === 'video' ? '<canvas data-strip="' + c.id + '"></canvas>' : '') + hd + '<span class="n">' + esc(m.name || 'Clip') + spdTag(c) + (c.mute ? ' · muted' : '') + (c.job && c.job.status === 'working' ? ' · generating…' : c.job && c.job.status === 'queued' ? ' · queued' : '') + '</span>' + lenTag(c.id, clipLen(c)) + '</div>';
        });
      } else {
        const kind = tr.id === 'text' ? 'text' : tr.id === 'logo' ? 'logo' : 'audio';
        const items = kind === 'audio' ? P.audio.filter(a => a.track === tr.id) : listOf(kind);
        const ln = lanes(items), ih = kind === 'audio' ? 36 : 30;
        rowH = ln.n * (ih + 4) + 4;
        items.forEach(it => {
          const m = media[it.mid] || {};
          const name = kind === 'text' ? (it.call ? ({ ruler: 'Measure', count: 'Count', box: 'Box', cta: 'End card' }[it.call] + ' · ' + (it.value || it.label || it.head || '')) : plain(it.text || it.eyebrow || it.sub || 'Text').split('\n')[0]) : (m.name || kind);
          body += '<div class="vs-it" data-kind="' + kind + '" data-id="' + it.id + '" tabindex="0" role="button" aria-label="' + esc(name + ', ' + (kind === 'audio' ? 'sound' : kind === 'text' ? 'text' : 'graphic')) + '"' + on(kind, it.id) + (it.track === 'sfx' ? ' data-sfx="1"' : '') +
            ' style="left:' + (LBL + it.at * pps) + 'px;width:' + Math.max(6, it.dur * pps - 1) + 'px;top:' + (4 + ln.map[it.id] * (ih + 4)) + 'px">' +
            (kind === 'audio' ? '<canvas data-wave="' + it.id + '"></canvas>' : '') + hd + '<span class="n">' + esc(name) + (kind === 'audio' ? spdTag(it) : '') + '</span>' + lenTag(it.id, it.dur) + '</div>';
        });
      }
      h += '<div class="vs-trk" data-trk="' + tr.id + '" style="height:' + rowH + 'px"><div class="vs-trk-l">' + ico(tr.icon) + tr.name + '</div>' + body + '</div>';
    });
    CASN.forEach((n, i) => { if (!n.done) h += '<i class="vs-nt" style="left:' + (LBL + clamp(+n.t || 0, 0, total()) * pps) + 'px" title="' + esc((n.by || 'Comment') + ' at ' + fmt(+n.t || 0) + ': ' + n.text) + '"><b>' + (i + 1) + '</b></i>'; });
    markersAll().forEach(x => { h += '<i class="vs-mk" data-k="' + x.k + '" style="left:' + (LBL + x.t * pps) + 'px" title="' + MKT[x.k] + ' at ' + fmt(x.t) + '. Layers and the playhead snap here."></i>'; });
    if (MK.beat !== 'off') P.audio.forEach(a => { if (a.track === 'music') findBeats(media[a.mid]); });
    if (!drag) { P.clips.forEach(c => buildStrip(media[c.mid])); nextCut(); }
    h += '<div class="vs-ph" id="ph" title="Drag to scrub"></div>';
    tlin.style.width = W + 'px'; tlin.innerHTML = h;
    tlin.querySelectorAll('canvas[data-wave]').forEach(c => {
      const a = P.audio.find(x => x.id === c.dataset.wave), m = a && media[a.mid]; if (!m || !m.peaks) return;
      const w = c.width = Math.max(2, Math.min(4000, Math.round(a.dur * pps))), hh = c.height = 36, x = c.getContext('2d');
      x.fillStyle = getComputedStyle(c).color;
      for (let i = 0; i < w; i++) { const p = m.peaks[Math.floor((a.in + i / w * a.dur * (a.rate || 1)) * 40)] || 0, bh = Math.max(1, p * hh * .9); x.fillRect(i, (hh - bh) / 2, 1, bh); }
    });
    paintStrips();
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
  // The playhead wins (2026-11-26, by request): an end within 14px of it lands on it, before any
  // other edge or marker (8px) is looked at. Alt frees the drag from every snap.
  let snapFree = false;
  function snapT(t, skipId) {
    if (snapFree) return t;
    if (Math.abs(T - t) * pps <= 14) return T;
    const c = edges(skipId), tol = 8 / pps;
    let best = t, bd = tol; c.forEach(v => { const d = Math.abs(v - t); if (d < bd) { bd = d; best = v; } });
    return best;
  }
  let drag = null;
  // KEYBOARD (2026-11-25, from the audit: nothing on the timeline could be reached by Tab). Every
  // piece is a tab stop; Enter or Space selects it, then S, Delete and Cmd-D act on it as ever.
  tl.addEventListener('keydown', e => {
    const el = e.target.closest && e.target.closest('.vs-it'); if (!el || e.target !== el || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault(); e.stopPropagation();
    multi.clear(); sel = { kind: el.dataset.kind, id: el.dataset.id }; rtab = 'sel'; renderAll();
    const again = tl.querySelector('.vs-it[data-id="' + el.dataset.id + '"]'); if (again) again.focus({ preventScroll: true });
  });
  tl.addEventListener('pointerdown', e => {
    if (e.button) return;
    const itEl = e.target.closest('.vs-it');
    if (e.target.closest('.vs-trk-l')) return;
    if (e.target.closest('.vs-ph')) { drag = { mode: 'seek' }; if (playing) pause(); }
    else if (itEl) {
      const kind = itEl.dataset.kind, id = itEl.dataset.id, h = e.target.closest('.vs-hd');
      const add = !!GK[kind] && (e.shiftKey || e.metaKey);
      if (add) {
        if (sel && sel.kind === kind) multi.add(sel.id); else multi.clear();
        if (multi.has(id) && multi.size > 1 && !h) {          // a second Shift-click takes it back out
          multi.delete(id); sel = { kind, id: [...multi].pop() }; renderAll(); e.preventDefault(); return;
        }
        multi.add(id);
      } else if (!(sel && sel.kind === kind && multi.has(id))) multi.clear();
      sel = { kind, id }; const it = find(sel), g = group();
      drag = { mode: h ? 'trim' + h.dataset.h : 'move', kind, id, st: !!(h && e.altKey && (kind === 'audio' || (kind === 'clip' && (media[it.mid] || {}).kind === 'video'))), x0: e.clientX, o: Object.assign({}, it), moved: false, snap: JSON.stringify(P), t: xToT(e), add,
        g: g && g.map(t => ({ id: t.id, at: t.at, dur: t.dur, in: t.in, out: t.out })) };
      renderAll();
    } else {
      drag = { mode: 'seek' };
      if (e.target.closest('.vs-trk') && sel) { sel = null; renderAll(); }
      if (playing) pause();
      seek(magnet(xToT(e))); landOn();
    }
    tl.setPointerCapture(e.pointerId); e.preventDefault();
  });
  tl.addEventListener('pointermove', e => {
    if (!drag) return;
    if (drag.mode === 'seek') {
      seek(magnet(xToT(e))); landOn();
      const r = tl.getBoundingClientRect();     // scrubbing past an edge scrolls the timeline
      if (e.clientX > r.right - 30) tl.scrollLeft += 14; else if (e.clientX < r.left + LBL + 20) tl.scrollLeft -= 14;
      return;
    }
    snapFree = e.altKey && !drag.st;
    const dx = e.clientX - drag.x0;
    if (!drag.moved) { if (Math.abs(dx) < 3) return; drag.moved = true; undo.push(drag.snap); redo.length = 0; }
    const it = find(drag), o = drag.o, d = dx / pps, m = media[it.mid];
    if (drag.st && !(drag.kind === 'clip' && drag.g)) {   // Option-drag an end: TIME STRETCH. The same stretch of the file, faster or slower
      const lim = drag.kind === 'clip' ? VRATE : ARATE, r0 = o.rate || 1, len0 = drag.kind === 'clip' ? (o.out - o.in) / r0 : o.dur, span = len0 * r0;
      // the end being dragged snaps to the playhead and the other edges, like every other resize
      let want = len0 + (drag.mode === 'trimr' ? d : -d);
      if (drag.kind === 'clip') { const s0 = clipStarts()[P.clips.indexOf(it)] || 0; want = snapT(s0 + want, it.id) - s0; }
      else if (drag.mode === 'trimr') want = snapT(o.at + want, it.id) - o.at;
      else want = o.at + o.dur - snapT(o.at + o.dur - want, it.id);
      const len = clamp(want, span / lim[1], span / lim[0]);
      it.rate = +(span / len).toFixed(4); if (Math.abs(it.rate - 1) < .015) it.rate = 1;
      if (drag.kind === 'audio') { it.dur = span / it.rate; if (drag.mode === 'triml') it.at = Math.max(0, o.at + o.dur - it.dur); }
    } else if (drag.kind === 'clip' && drag.g) {     // several clips: every length by one factor, or the block moves
      const g = drag.g, L = g.reduce((a, x) => a + (x.out - x.in), 0), least = .2 / Math.min(...g.map(x => x.out - x.in));
      if (drag.mode === 'move') {
        const ids = new Set(g.map(x => x.id)), blk = P.clips.filter(c => ids.has(c.id)), rest = P.clips.filter(c => !ids.has(c.id));
        const t = xToT(e); let acc = 0, idx = rest.length;
        for (let i = 0; i < rest.length; i++) { const l = clipLen(rest[i]); if (t < acc + l / 2) { idx = i; break; } acc += l; }
        rest.splice(idx, 0, ...blk); P.clips = rest;
      } else {
        const f = Math.max(least, (L + (drag.mode === 'trimr' ? d : -d)) / L);
        g.forEach(x => { const c = P.clips.find(q => q.id === x.id), cm = c && media[c.mid]; if (!c) return;
          const len = (x.out - x.in) * f, lim = cm && cm.kind === 'video' ? cm.dur : 120;
          if (drag.mode === 'trimr') c.out = clamp(x.in + len, x.in + .2, lim); else c.in = clamp(x.out - len, 0, x.out - .2); });
      }
    } else if (drag.kind === 'clip') {
      const lim = m && m.kind === 'video' ? m.dur : 120;
      const r = o.rate || 1;                 // the pointer moves timeline seconds; the file moves r times as far
      // clips sit end to end, so either handle moves this clip's END on the timeline: that end snaps
      // to the playhead and to the other edges (2026-11-25, by request)
      const s0 = drag.mode === 'move' ? 0 : clipStarts()[P.clips.indexOf(it)] || 0, len0 = (o.out - o.in) / r;
      if (drag.mode === 'triml') it.in = clamp(o.out - (snapT(s0 + len0 - d, it.id) - s0) * r, 0, o.out - .2 * r);
      else if (drag.mode === 'trimr') it.out = clamp(o.in + (snapT(s0 + len0 + d, it.id) - s0) * r, o.in + .2 * r, lim);
      else {                                  // reorder: the clip lands before every clip whose middle is past the pointer
        const t = xToT(e), rest = P.clips.filter(c => c !== it); let acc = 0, idx = rest.length;
        for (let i = 0; i < rest.length; i++) { const L = clipLen(rest[i]); if (t < acc + L / 2) { idx = i; break; } acc += L; }
        rest.splice(idx, 0, it); P.clips = rest;
      }
    } else if (drag.g) {                      // the group: one span, scaled about its far end
      const g = drag.g, ids = new Set(g.map(x => x.id)), a0 = Math.min(...g.map(x => x.at)), e0 = Math.max(...g.map(x => x.at + x.dur));
      const L = e0 - a0, least = L * .2 / Math.min(...g.map(x => x.dur)), put = (x, at, dur) => { const t = P.texts.find(q => q.id === x.id); if (t) { t.at = Math.max(0, at); t.dur = dur; } };
      if (drag.mode === 'move') {
        let dd = Math.max(-a0, d); const s1 = snapT(a0 + dd, ids), s2 = snapT(e0 + dd, ids);
        if (s1 !== a0 + dd) dd = s1 - a0; else if (s2 !== e0 + dd) dd = Math.max(-a0, s2 - e0);
        g.forEach(x => put(x, x.at + dd, x.dur));
      } else if (drag.mode === 'trimr') {
        const f = (clamp(snapT(e0 + d, ids), a0 + least, 600) - a0) / L;
        g.forEach(x => put(x, a0 + (x.at - a0) * f, x.dur * f));
      } else {
        const f = (e0 - clamp(snapT(a0 + d, ids), 0, e0 - least)) / L;
        g.forEach(x => put(x, e0 - (e0 - x.at) * f, x.dur * f));
      }
    } else {
      const isA = drag.kind === 'audio' || (drag.kind === 'logo' && m && m.kind === 'video'), lim = isA && m ? m.dur : 600;
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
    dirty = true; tlGeomSoon();
    // ACROSS TRACKS (2026-11-26, by request): a photo or video clip dragged up onto Motion graphics
    // becomes a motion graphic there, and one dragged down onto Video becomes a clip in the gap
    // nearest the pointer. The track lights while it would; the change happens on release.
    drag.x = null;
    if (drag.mode === 'move' && !drag.g && m && (m.kind === 'video' || m.kind === 'image')) {
      const ov = document.elementFromPoint(e.clientX, e.clientY), row = ov && ov.closest && ov.closest('.vs-trk'), trk = row && row.dataset.trk;
      if (drag.kind === 'clip' && trk === 'logo' && P.clips.length > 1) drag.x = { trk: 'logo', t: snapT(Math.max(0, xToT(e))) };
      else if (drag.kind === 'logo' && trk === 'clip') drag.x = planFor(m.kind, ov, e);
    }
    dropPaint(drag.x);
    const sp = drag.mode !== 'move' && !drag.g && span(drag.kind, it);   // the playhead lights while an end sits on it
    tl.toggleAttribute('data-snapped', !!sp && (Math.abs(sp[0] - T) < 1e-4 || Math.abs(sp[1] - T) < 1e-4));
  });
  // SPEED (2026-11-26): a drag used to rebuild the whole timeline (waveforms, filmstrips, every
  // marker) on each pointer move. Now the boxes are moved in place, once a frame; the full
  // render runs on release. A piece that changes lane while moving lands in it on release.
  let geomQ = 0;
  function tlGeomSoon() { if (!geomQ) geomQ = requestAnimationFrame(() => { geomQ = 0; tlGeom(); }); }
  function tlGeom() {
    const st = clipStarts(), W = LBL + Math.max(tl.clientWidth - LBL, (total() + 4) * pps + 80);
    if (parseFloat(tlin.style.width) < W) tlin.style.width = W + 'px';
    tlin.querySelectorAll('.vs-it').forEach(el => {
      const k = el.dataset.kind, it = find({ kind: k, id: el.dataset.id }); if (!it) return;
      const at = k === 'clip' ? st[P.clips.indexOf(it)] : it.at, len = k === 'clip' ? clipLen(it) : it.dur;
      el.style.left = (LBL + at * pps) + 'px'; el.style.width = Math.max(6, len * pps - 1) + 'px';
      const tag = lenTag(it.id, len); let em = el.querySelector('.vs-len');
      if (tag && !em) { el.insertAdjacentHTML('beforeend', tag); em = el.querySelector('.vs-len'); }
      if (em) { if (tag) em.textContent = lenFmt(len); else em.remove(); }
    });
    paintPlayhead();
  }
  const endDrag = () => {
    snapFree = false; tl.removeAttribute('data-snapped');
    if (drag && drag.x && drag.moved) {    // released over the other track: undo the slide, then move it across
      const x = drag.x, kind = drag.kind, id = drag.id; dropPaint(null); drag = null;
      P = JSON.parse(undo[undo.length - 1]);
      const keep = T;
      if (kind === 'clip') {
        const c = P.clips.find(q => q.id === id); if (!c) { renderAll(); return; }
        const len = clipLen(c), isV = (media[c.mid] || {}).kind === 'video';
        P.clips = P.clips.filter(q => q !== c);
        T = x.t; addLogo(c.mid, true); T = keep;
        const l = P.logos[P.logos.length - 1]; if (l && l.mid === c.mid) { l.at = x.t; l.dur = len; if (isV) l.in = c.in || 0; sel = { kind: 'logo', id: l.id }; }
      } else {
        const l = P.logos.find(q => q.id === id); if (!l) { renderAll(); return; }
        const isV = (media[l.mid] || {}).kind === 'video';
        P.logos = P.logos.filter(q => q !== l);
        addClip(l.mid, true); const c = P.clips.pop();
        if (isV) { c.in = l.in || 0; c.out = Math.min(media[l.mid].dur, c.in + l.dur); } else { c.in = 0; c.out = l.dur; }
        P.clips.splice(Math.min(x.i, P.clips.length), 0, c); sel = { kind: 'clip', id: c.id };
      }
      dirty = true; save(); renderAll(); return;
    }
    dropPaint(null);
    if (drag) drag.done = true;            // the length tag of a resize goes with the release
    if (drag && drag.moved) renderAll();
    else if (drag && drag.kind) {
      if (drag.g && !drag.add) { multi.clear(); renderAll(); }   // a plain click on one of the group goes back to that one             // a plain click on an item also brings the playhead to it
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
    let own = []; try { own = JSON.parse(WS.getItem(LKEY) || '[]'); } catch (e) {}
    return (window.providentDevLogos || []).concat(own.map(o => Object.assign({ own: 1 }, o)));
  }
  // ── make a voiceover: a script, a voice, and it lands on the Sound track with captions on ──
  // Mac voices are free (the local server runs `say`); Higgsfield voices cost credits, so they are
  // priced first and need a yes. Both need the local server.
  // an audio item can play 25% slower to 35% faster with its pitch kept; beyond that it sounds wrong
  const RATE = [.75, 1.35], PACE = 2.5;                    // PACE: natural speech, words a second
  // Speed, for a video clip and a sound: a slider, an exact length, and the way back. Option-drag an end on the timeline does the same.
  function speedSec(it, len, lim) {
    return rng('i', 'spd', 'Plays at', Math.round((it.rate || 1) * 100), lim[0] * 100, lim[1] * 100, '%') +
      '<span class="vs-note" id="rateNote">' + rateNote(it) + '</span>' +
      acc('fit', 'Fit to a length', 'seconds', '<div class="vs-f"><label>Fit to exactly <s>seconds</s></label><input class="p-in" type="number" data-n="fit" min="0.2" step="0.1" value="' + len.toFixed(2) + '"></div>') +
      ((it.rate || 1) !== 1 ? '<div class="vs-acts"><button class="p-ghost p-sm" id="rateReset">Back to natural speed</button></div>' : '');
  }
  // one place sets a speed: a sound keeps the same stretch of its file, so its length follows; a clip's length is worked out from its rate
  function setRate(it, kind, r) {
    const lim = kind === 'clip' ? VRATE : ARATE; r = clamp(r, lim[0], lim[1]);
    if (kind === 'audio') { const span = it.dur * (it.rate || 1); it.rate = r; it.dur = span / r; } else it.rate = r;
    if (it.rate === 1 && kind === 'clip') delete it.rate;
  }
  function rateNote(a, asked) {
    const r = a.rate || 1, pct = Math.round(r * 100);
    const lim = asked != null && Math.abs(a.dur - asked) > .05 ? ' <b>That is as far as it goes:</b> ' + a.dur.toFixed(1) + ' s. To reach ' + (+asked).toFixed(1) + ' s, ' + (asked < a.dur ? 'shorten' : 'lengthen') + ' the script or trim the audio.' : '';
    const far = !a.out && (r < RATE[0] - .005 || r > RATE[1] + .005) ? ' A voice sounds natural between 75% and 135%.' : '';
    return (pct === 100 ? '' : 'Pitch is kept.') + far + lim;
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
  // the generators live in the right rail's Generate panel (genHtml), one tab each
  const gsec = body => '<div class="vs-sec">' + body + '</div>';
  function voHtml() {
    if (!VO.list) { VO.list = { mac: [], hf: [] }; api('/api/voice/list').then(r => { VO.list = r; if (!VO.voice) VO.voice = r.mac && r.mac[0] ? 'mac:' + r.mac[0] : ''; renderGen(); }).catch(() => { VO.list = { mac: [], hf: [], note: 'off' }; renderGen(); }); }
    const L = VO.list, opt = (v, t) => '<option value="' + esc(v) + '"' + (VO.voice === v ? ' selected' : '') + '>' + esc(t) + '</option>';
    const mine = (L.hf || []).filter(v => v.type !== 'preset'), pre = (L.hf || []).filter(v => v.type === 'preset');
    return gsec(
      '<div class="vs-f"><label>Script</label><textarea class="p-in" id="voText" rows="5" placeholder="Type what the voice should say"' + (VO.busy ? ' disabled' : '') + '>' + esc(VO.text) + '</textarea></div>' +
      '<div class="vs-f"><label>Length <s>seconds, optional</s></label><input class="p-in" type="number" id="voTarget" min="1" step="0.5" placeholder="Leave empty for natural speed" value="' + esc(VO.target) + '"' + (VO.busy ? ' disabled' : '') + '></div>' +
      '<span class="vs-note" id="voHint">' + voHint() + '</span>' +
      '<div class="vs-f"><label>Voice</label><select class="p-in" id="voVoice"' + (VO.busy ? ' disabled' : '') + '>' +
        ((L.mac || []).length ? '<optgroup label="On this Mac, free">' + L.mac.map(v => opt('mac:' + v, v)).join('') + '</optgroup>' : '') +
        (mine.length ? '<optgroup label="Your Higgsfield voices">' + mine.map(v => opt('hf:' + v.type + ':' + v.id, v.name)).join('') + '</optgroup>' : '') +
        (pre.length ? '<optgroup label="Higgsfield voices">' + pre.map(v => opt('hf:' + v.type + ':' + v.id, v.name + (v.gender ? ' · ' + v.gender : ''))).join('') + '</optgroup>' : '') +
      '</select></div>' +
      (VO.busy ? '<span class="vs-note"><b>' + VO.busy + '</b></span>'
        : VO.quote != null ? '<span class="vs-note"><b>This will spend ' + VO.quote + ' credits</b> from your Higgsfield balance.</span><div class="vs-acts"><button class="p-ghost p-sm" id="voCancel">Cancel</button><button class="p-btn p-sm" id="voGo">Make it</button></div>'
        : '<div class="vs-acts"><button class="p-ghost p-sm" id="voHear">' + (VO.playing ? 'Stop' : 'Hear this voice') + '</button><button class="p-btn p-sm" id="voBtn">Make voiceover</button></div>') +
      '<span class="vs-note">' + (L.note === 'off' ? 'The local server is not running, so voiceovers cannot be made here.' : 'It lands on the Sound track at the playhead with captions already on. Mac voices are free; Higgsfield voices show their cost first.') + '</span>');
  }
  // a short sample of the chosen voice: Higgsfield's own preview clip (free), or a Mac voice
  // reading one line (free). Nothing is added to the project.
  // ── make music: a description becomes an instrumental bed under the whole video ──
  // Higgsfield only (credits), so it is always priced first. Sonilo is the cheaper model.
  const MU = { text: '', len: '', model: 'sonilo', busy: '', quote: null };
  function muHtml() {
    const dis = MU.busy ? ' disabled' : '', end = videoEnd();
    return gsec(
      '<div class="vs-f"><label>Describe it</label><textarea class="p-in" id="muText" rows="3" placeholder="Calm cinematic piano with soft strings, slow build"' + dis + '>' + esc(MU.text) + '</textarea></div>' +
      '<div class="vs-f"><label>Length <s>seconds</s></label><input class="p-in" type="number" id="muLen" min="5" max="180" step="1" placeholder="' + (end > 0 ? Math.ceil(end) + ' (your video)' : '30') + '" value="' + esc(MU.len) + '"' + dis + '></div>' +
      '<div class="vs-row"><span>Model</span><div class="vs-seg">' + [['sonilo', 'Sonilo'], ['elevenlabs', 'ElevenLabs']].map(o => '<button data-mum="' + o[0] + '"' + (MU.model === o[0] ? ' data-on="1"' : '') + dis + '>' + o[1] + '</button>').join('') + '</div></div>' +
      (MU.busy ? '<span class="vs-note"><b>' + MU.busy + '</b></span>'
        : MU.quote != null ? '<span class="vs-note"><b>This will spend ' + MU.quote + ' credits</b> from your Higgsfield balance.</span><div class="vs-acts"><button class="p-ghost p-sm" id="muCancel">Cancel</button><button class="p-btn p-sm" id="muGo">Make it</button></div>'
        : '<div class="vs-acts"><button class="p-btn p-sm" id="muBtn">Make music</button></div>') +
      '<span class="vs-note">Instrumental only. It lands as the music bed from 0:00, trimmed to the video. The cost is shown first.</span>');
  }
  async function muMake(confirmed) {
    const text = MU.text.trim(); if (!text) { toast('Describe the music first.'); return; }
    const duration = clamp(parseFloat(MU.len) || Math.ceil(videoEnd()) || 30, 5, 180), body = { text, duration, model: MU.model };
    try {
      if (!confirmed) {
        MU.busy = 'Asking Higgsfield for the price…'; renderGen();
        const q = await api('/api/music/cost', Object.assign({ id: uid() + 'mu' }, body)); MU.busy = '';
        if (q.error) { toast(q.error); renderGen(); return; }
        MU.quote = q.credits; renderGen(); return;
      }
      MU.quote = null; MU.busy = 'Making the music… this can take a minute or two.'; renderGen();
      const r = await api('/api/music/make', Object.assign({ id: uid() + 'mu' }, body));
      if (r.error) throw new Error(r.error);
      const blob = await (await fetch('/_animate/' + r.file)).blob(), ext = r.file.split('.').pop(), name = 'Music ' + text.split(/\s+/).slice(0, 3).join(' ') + ' ' + uid().slice(0, 3);
      await addFiles([new File([blob], name + '.' + ext, { type: ext === 'wav' ? 'audio/wav' : ext === 'm4a' ? 'audio/mp4' : 'audio/mpeg' })], 'audio');
      const m = Object.values(media).filter(x => x.kind === 'audio' && x.name === name).pop();
      if (!m) throw new Error('the audio could not be read');
      addAudio(m.id, 'music'); MU.busy = ''; save(); renderAll(); toast('The music is on the Music track.');
    } catch (e) { MU.busy = ''; renderGen(); toast('The music could not be made (' + e.message + ').'); }
  }
  async function voHear() {
    if (VO.playing) { try { VO.playing.pause(); } catch (e) {} VO.playing = null; renderGen(); return; }
    const v = VO.voice.split(':'); let src = '';
    if (v[0] === 'hf') { src = ((VO.list.hf || []).find(x => x.id === v[2]) || {}).preview || ''; if (!src) { toast('There is no sample for that voice.'); return; } }
    else if (v[0] === 'mac') {
      try { const r = await api('/api/voice/make', { id: uid() + 'pv', text: 'This is how I sound reading your script.', mac: v[1] }); if (r.error) throw new Error(r.error); src = '/_animate/' + r.file; }
      catch (e) { toast('The sample could not be made (' + e.message + ').'); return; }
    } else return;
    const a = new Audio(src); VO.playing = a; a.onended = a.onerror = () => { if (VO.playing === a) { VO.playing = null; renderGen(); } };
    renderGen(); a.play().catch(() => { VO.playing = null; renderGen(); toast('The sample could not be played.'); });
  }
  async function voMake(confirmed) {
    const text = VO.text.trim(), v = VO.voice.split(':'); if (!text) { toast('Type the script first.'); return; }
    if (!v[0]) { toast('Pick a voice.'); return; }
    const tg = parseFloat(VO.target) > 0 ? parseFloat(VO.target) : 0, words = text.split(/\s+/).filter(Boolean).length;
    // a Mac voice can be asked for a pace directly (words a minute); a Higgsfield voice cannot, so it is fitted afterwards
    const body = v[0] === 'mac' ? { text, mac: v[1], wpm: tg ? Math.round(clamp(words / tg * 60 * 1.12, 110, 300)) : 0 } : { text, voice_type: v[1], voice_id: v[2] };
    try {
      if (v[0] === 'hf' && !confirmed) {
        VO.busy = 'Asking Higgsfield for the price…'; renderGen();
        const q = await api('/api/voice/cost', Object.assign({ id: uid() + 'vo' }, body)); VO.busy = '';
        if (q.error) { toast(q.error); renderGen(); return; }
        VO.quote = q.credits; renderGen(); return;
      }
      VO.quote = null; VO.busy = 'Making the voiceover…'; renderGen();
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
    } catch (e) { VO.busy = ''; renderGen(); toast('The voiceover could not be made (' + e.message + ').'); }
  }
  // THE LEFT RAIL IS WHAT CAN BE ADDED, and nothing else (2026-11-13 redesign, after CAS's
  // "Add a component"): uploads and the library as tiles, text and callouts as specimen tiles,
  // the two generators folded away. What is set once for the whole video (the wordmark, the
  // collaboration logo, the logo colour) moved to the right rail's Whole video (docHtml).
  // LISTEN TO A FILE IN THE LIBRARY (2026-11-17): one player, outside the timeline's audio graph,
  // so it never reaches an export. Playing the video, or removing the file, stops it.
  let hear = null;                  // { id, el }
  function hearStop() { if (hear) { hear.el.pause(); hear = null; return true; } return false; }
  function hearToggle(id) {
    const same = hear && hear.id === id; hearStop();
    if (!same && media[id]) {
      if (playing) pause();
      const el = new Audio(media[id].url); hear = { id, el };
      el.addEventListener('ended', () => { if (hear && hear.el === el) { hear = null; renderLib(); } });
      const p = el.play(); if (p && p.catch) p.catch(() => {});
    }
    renderLib();
  }
  // ── THE LIBRARY, ORGANISED (2026-11-17, by request: "how should I know which is which") ──
  // Search, filters, stars, folders, a name of your own, and a grid or list view. What a person
  // adds to a file (star, folder) lives in localStorage beside the project, keyed by the file's
  // id; a new name is written to the file's own record, so the timeline shows it too. Folders are
  // one list shared by Media, Audio and Graphics. The search and filter are per tab, per session.
  const LIBKEY = 'provident-video-lib';
  const LIB = Object.assign({ meta: {}, folders: [], view: 'grid' }, (() => { try { return JSON.parse(WS.getItem(LIBKEY)) || {}; } catch (e) { return {}; } })());
  const libSave = () => { try { WS.setItem(LIBKEY, JSON.stringify(LIB)); } catch (e) {} };
  const lm = id => LIB.meta[id] || {};
  const lset = (id, k, v) => { const o = LIB.meta[id] = LIB.meta[id] || {}; if (v) o[k] = v; else delete o[k]; if (!Object.keys(o).length) delete LIB.meta[id]; libSave(); };
  const LQ = { media: { q: '', f: 'all', dir: '' }, audio: { q: '', f: 'all', dir: '' }, logos: { q: '', f: 'all', dir: '' } };
  const LKIND = { media: ['video', 'image'], audio: ['audio'], logos: ['logo', 'image'] };
  const LNAME = { media: 'Your media', audio: 'Your audio', logos: 'Your motion graphics' };
  const libUses = (key, id) => (key === 'media' ? P.clips : key === 'audio' ? P.audio : P.logos).filter(x => x.mid === id).length;
  // MOTION GRAPHICS (2026-11-26, by request): the Graphics track takes videos too. A video added
  // from this tab (or dropped on the track) is marked `gfx` and lists here, not under Media; any
  // video placed on the track lists here as well.
  const libAll = (key, M) => M.filter(m => key === 'logos' ? m.kind === 'logo' || ((m.kind === 'image' || m.kind === 'video') && (m.gfx || P.logos.some(l => l.mid === m.id)))   // a photo shows here only once it is placed as one
    : key === 'media' && m.gfx ? false : LKIND[key].indexOf(m.kind) >= 0);
  // SORT (2026-11-26, by request): newest, oldest, name, length; kept per computer with the library's view
  const SORTS = [['new', 'Newest first'], ['old', 'Oldest first'], ['az', 'Name A–Z'], ['za', 'Name Z–A'], ['long', 'Longest first'], ['short', 'Shortest first']];
  const byName = (a, b) => String(a.name).localeCompare(String(b.name), undefined, { numeric: true, sensitivity: 'base' });
  function libSort(list) {
    const k = LIB.sort || 'new', at = m => m.at || 0, len = m => m.kind === 'image' || m.kind === 'logo' ? 0 : (m.dur || 0);
    const f = { new: (a, b) => at(b) - at(a) || byName(a, b), old: (a, b) => at(a) - at(b) || byName(a, b), az: byName, za: (a, b) => byName(b, a),
      long: (a, b) => len(b) - len(a) || byName(a, b), short: (a, b) => len(a) - len(b) || byName(a, b) }[k] || null;
    return f ? list.slice().sort(f) : list;
  }
  function libPick(key, M) {
    const st = LQ[key], q = st.q.trim().toLowerCase();
    return libSort(libAll(key, M)).filter(m => {
      const x = lm(m.id), u = libUses(key, m.id);
      if (q && String(m.name).toLowerCase().indexOf(q) < 0 && String(x.dir || '').toLowerCase().indexOf(q) < 0) return false;
      if (st.dir === '~' ? x.dir : st.dir && x.dir !== st.dir) return false;
      return st.f === 'star' ? !!x.star : st.f === 'used' ? u > 0 : st.f === 'free' ? !u : st.f === 'video' ? m.kind === 'video' : st.f === 'photo' ? m.kind === 'image' : true;
    });
  }
  const libM = () => { const used = P.casBg && !P.casBg.all ? JSON.stringify([P.clips, P.audio, P.logos]) : ''; return Object.values(media).filter(ownV).filter(m => !used || (P.casBg.media || []).indexOf(m.id) >= 0 || used.indexOf(m.id) >= 0); };
  const sBtn = (id, cls) => { const on = !!lm(id).star; return '<span class="vs-st' + (cls || '') + '" role="button" tabindex="0" data-star="' + id + '"' + (on ? ' data-on="1"' : '') + ' aria-pressed="' + on + '" aria-label="' + (on ? 'Remove the star' : 'Star') + '" title="' + (on ? 'Starred' : 'Star') + '">' + sico('star') + '</span>'; };
  const mBtn = id => '<span class="vs-mo" role="button" tabindex="0" data-more="' + id + '" aria-haspopup="menu" aria-label="Rename, move or remove" title="Rename, move or remove">' + sico('more') + '</span>';
  function libList(key, M) {
    const v = libPick(key, M), all = libAll(key, M).length, st = LQ[key];
    if (!all) return '<div class="vs-none"><b>Nothing here yet</b>' + (key === 'media' ? 'Videos and photos you upload stay in this list, ready to add again.' : key === 'audio' ? 'Upload a track or a voiceover, or make one above.' : 'Upload one, or drop an image on the video.') + '</div>';
    if (!v.length) return '<div class="vs-none"><b>No file matches</b>' + (st.q.trim() ? 'Nothing is named “' + esc(st.q.trim()) + '”' + (st.f !== 'all' || st.dir ? ' in this view.' : '.') : 'Nothing fits this filter or folder.') + '<button class="vs-link" data-libclear="1">Show every file</button></div>';
    const dirTag = m => { const d = lm(m.id).dir; return d && !st.dir ? '<span class="vs-dir">' + sico('folder') + esc(d) + '</span>' : ''; };
    const usedTxt = u => u ? 'In video' + (u > 1 ? ' ×' + u : '') : '';
    if (key === 'audio') return v.map(m => { const u = libUses(key, m.id), on = hear && hear.id === m.id; return (
      '<div class="vs-arow"' + (on ? ' data-on="1"' : '') + '><button class="mk" data-hear="' + m.id + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Stop ' : 'Play ') + esc(m.name) + '" title="' + (on ? 'Stop' : 'Listen') + '">' + ico(on ? 'pause' : 'play_arrow') + '</button>' +
      '<div class="n"><b title="' + esc(m.name) + '">' + esc(m.name) + '</b>' + dirTag(m) + '</div>' +
      '<div class="a"><s' + (u ? ' title="On the timeline' + (u > 1 ? ' ' + u + ' times' : '') + '"' : '') + '>' + fmt(m.dur).slice(0, -3) + (u ? ' · used' + (u > 1 ? ' ×' + u : '') : '') + '</s><button class="vs-mini" data-addaudio="' + m.id + '" data-trk="music" title="Add as the music bed, from the start">Music</button><button class="vs-mini" data-addaudio="' + m.id + '" data-trk="sfx" title="Add as a sound at the playhead">Sound</button></div>' +
      '<span class="vs-rt">' + sBtn(m.id) + mBtn(m.id) + '</span></div>'); }).join('');
    const add = key === 'media' ? 'data-addclip' : 'data-addlogo', tip = key === 'media' ? 'Click to add it to the end of the video track.' : 'Click to place it at the playhead.';
    const bg = m => "background-image:url('" + (m.poster || m.url) + "')", kindTxt = m => m.kind === 'video' ? fmt(m.dur) : key === 'media' ? 'Photo' : '';
    if (key === 'media' && LIB.view === 'list') return '<div class="vs-ml">' + v.map(m => { const u = libUses(key, m.id); return (
      '<button class="vs-mr" ' + add + '="' + m.id + '" title="' + esc(m.name) + '. ' + tip + '"><i style="' + bg(m) + '"></i><span class="n"><b>' + esc(m.name) + '</b><s>' + [m.kind === 'video' ? 'Video · ' + fmt(m.dur).slice(0, -3) : 'Photo', usedTxt(u), lm(m.id).dir && !st.dir ? esc(lm(m.id).dir) : ''].filter(Boolean).join(' · ') + '</s></span>' +
      '<span class="vs-rt">' + sBtn(m.id) + mBtn(m.id) + '</span></button>'); }).join('') + '</div>';
    return '<div class="vs-grid"' + (key === 'media' ? ' data-m="1"' : '') + '>' + v.map(m => { const u = libUses(key, m.id), k = kindTxt(m); return (
      '<button class="vs-t" data-pic="' + (key === 'media' ? '1' : 'fit') + '" ' + add + '="' + m.id + '" title="' + esc(m.name) + '. ' + tip + '"><i style="' + bg(m) + '">' +
      (u && key === 'media' ? '<q>' + usedTxt(u) + '</q>' : '') + (k ? '<s>' + k + '</s>' : '') + '<em>' + ico('add') + '</em>' + sBtn(m.id) + mBtn(m.id) + '</i><b>' + esc(m.name) + '</b>' + dirTag(m) + '</button>'); }).join('') + '</div>';
  }
  function libSec(key, M) {
    const st = LQ[key], all = libAll(key, M), n = libPick(key, M).length;
    const chip = (f, label) => '<button class="vs-fc" data-libf="' + f + '" aria-pressed="' + (st.f === f) + '">' + label + '</button>';
    const dirs = LIB.folders, inDir = st.dir && st.dir !== '~';
    const tools = !all.length ? '' :
      '<div class="vs-lt"><label class="vs-q">' + sico('search') + '<input class="p-in" type="search" id="libQ" placeholder="Search by name" aria-label="Search ' + LNAME[key].toLowerCase() + '" value="' + esc(st.q) + '"></label>' +
        (key === 'media' ? '<span class="vs-vw" role="group" aria-label="View"><button data-libview="grid" aria-pressed="' + (LIB.view !== 'list') + '" title="Grid" aria-label="Grid view">' + sico('grid') + '</button><button data-libview="list" aria-pressed="' + (LIB.view === 'list') + '" title="List" aria-label="List view">' + sico('list') + '</button></span>' : '') + '</div>' +
      '<div class="vs-fl">' + chip('all', 'All') + chip('star', 'Starred') + chip('used', 'In video') + chip('free', 'Not used') + (key === 'media' ? chip('video', 'Videos') + chip('photo', 'Photos') : '') + '</div>' +
      '<div class="vs-lt"><select class="p-in" id="libDir" aria-label="Folder"><option value="">All folders</option><option value="~"' + (st.dir === '~' ? ' selected' : '') + '>Not in a folder</option>' +
        dirs.map(d => '<option value="' + esc(d) + '"' + (st.dir === d ? ' selected' : '') + '>' + esc(d) + '</option>').join('') + '</select>' +
        (inDir ? '<button class="vs-sq" data-dirren="1" title="Rename this folder" aria-label="Rename this folder">' + sico('edit') + '</button><button class="vs-sq" data-dirdel="1" title="Delete this folder. Its files stay in the library." aria-label="Delete this folder">' + ico('delete') + '</button>' : '') +
        '<button class="vs-sq" data-dirnew="1" title="New folder" aria-label="New folder">' + sico('folder_add') + '</button></div>' +
      '<div class="vs-lt"><select class="p-in" id="libSort" aria-label="Sort by" title="Sort the library">' + SORTS.map(o => '<option value="' + o[0] + '"' + ((LIB.sort || 'new') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div>';
    return '<div class="vs-sec">' + '<div class="vs-h"><b>' + LNAME[key] + '</b><s id="libN">' + libCount(n, all.length) + '</s></div>' + tools +
      '<div id="libList">' + libList(key, M) + '</div></div>';
  }
  const libCount = (n, all) => !all ? '' : n === all ? all + (all === 1 ? ' file' : ' files') : n + ' of ' + all;
  const libKey = () => tab === 'media' || tab === 'audio' ? tab : 'logos';
  function libRefresh() {                     // the list and its count only, so the search field keeps its caret
    const key = libKey(), M = libM(), box = $('#libList'), n = $('#libN');
    if (!box) return renderLib();
    box.innerHTML = libList(key, M); if (n) n.textContent = libCount(libPick(key, M).length, libAll(key, M).length);
  }
  const dbRec = r => ({ id: r.id, at: r.at || Date.now(), pid: ownV(r) ? P.id : r.pid, kind: r.kind, name: r.name, blob: r.blob, dur: r.dur, w: r.w, h: r.h, poster: r.poster, peaks: r.peaks, cuts: r.cuts, cutsV: r.cutsV, stripU: r.stripU, stripM: r.stripM, gfx: r.gfx, cm: r.cm });
  async function libRename(id) {
    const m = media[id]; if (!m) return;
    const v = await ask('Rename', 'A name you will recognise. It shows here and on the timeline.', 'Rename', m.name);
    const name = v && String(v).trim().slice(0, 80); if (!name || name === m.name) return;
    m.name = name; DB.put(dbRec(m)); renderAll();
  }
  async function dirNew(forId) {
    const v = await ask('New folder', forId ? 'The file moves into it.' : 'Folders are shared by Media, Audio and Graphics.', 'Create', '');
    const name = v && String(v).trim().slice(0, 40); if (!name || name === '~') return;
    if (LIB.folders.indexOf(name) < 0) { LIB.folders.push(name); LIB.folders.sort((a, b) => a.localeCompare(b)); }
    if (forId) lset(forId, 'dir', name); else { LQ[libKey()].dir = name; libSave(); }
    renderLib();
  }
  async function dirRename() {
    const st = LQ[libKey()], old = st.dir, v = await ask('Rename folder', 'Its files stay in it.', 'Rename', old);
    const name = v && String(v).trim().slice(0, 40); if (!name || name === old || name === '~' || LIB.folders.indexOf(name) >= 0) return;
    LIB.folders = LIB.folders.map(d => d === old ? name : d).sort((a, b) => a.localeCompare(b));
    Object.keys(LIB.meta).forEach(id => { if (LIB.meta[id].dir === old) LIB.meta[id].dir = name; });
    Object.keys(LQ).forEach(k => { if (LQ[k].dir === old) LQ[k].dir = name; }); libSave(); renderLib();
  }
  async function dirDelete() {
    const st = LQ[libKey()], old = st.dir;
    if (!(await ask('Delete the folder “' + old + '”?', 'Its files stay in the library, outside any folder.', 'Delete folder'))) return;
    LIB.folders = LIB.folders.filter(d => d !== old);
    Object.keys(LIB.meta).forEach(id => { if (LIB.meta[id].dir === old) lset(id, 'dir', ''); });
    Object.keys(LQ).forEach(k => { if (LQ[k].dir === old) LQ[k].dir = ''; }); libSave(); renderLib();
  }
  // the per-file menu: one popover, filled when it opens
  const lmenu = document.createElement('div'); lmenu.className = 'vs-pop vs-menu'; lmenu.id = 'libMenu'; lmenu.setAttribute('popover', ''); lmenu.setAttribute('role', 'menu'); document.body.appendChild(lmenu);
  function libMenu(id, btn) {
    const m = media[id]; if (!m) return; const x = lm(id);
    const it = (attr, label, icon, on) => '<button role="menuitem" ' + attr + (on ? ' data-on="1"' : '') + '>' + icon + '<span>' + label + '</span></button>';
    lmenu.dataset.id = id;
    lmenu.innerHTML = '<b title="' + esc(m.name) + '">' + esc(m.name) + '</b>' + it('data-mrename="1"', 'Rename', sico('edit')) + it('data-mstar="1"', x.star ? 'Remove the star' : 'Star', sico('star')) +
      '<s>Move to</s>' + it('data-mdir=""', 'No folder', sico('folder'), !x.dir) + LIB.folders.map(d => it('data-mdir="' + esc(d) + '"', esc(d), sico('folder'), x.dir === d)).join('') + it('data-mdirnew="1"', 'New folder', sico('folder_add')) +
      '<hr>' + it('data-mremove="1"', 'Remove from the library', ico('delete'));
    try { lmenu.showPopover(); } catch (e) { return; }
    const r = btn.getBoundingClientRect(), w = lmenu.offsetWidth, hh = lmenu.offsetHeight;
    lmenu.style.left = clamp(r.left, 8, innerWidth - w - 8) + 'px'; lmenu.style.top = clamp(r.bottom + 6, 8, Math.max(8, innerHeight - hh - 8)) + 'px';
    const f = lmenu.querySelector('button'); if (f) f.focus();
  }
  lmenu.addEventListener('click', e => {
    const b = e.target.closest('button'), id = lmenu.dataset.id; if (!b) return;
    try { lmenu.hidePopover(); } catch (er) {}
    if (b.dataset.mrename) libRename(id);
    else if (b.dataset.mstar) { lset(id, 'star', lm(id).star ? 0 : 1); renderLib(); }
    else if (b.dataset.mdirnew) dirNew(id);
    else if (b.dataset.mremove) removeMedia(id);
    else if ('mdir' in b.dataset) { lset(id, 'dir', b.dataset.mdir); renderLib(); }
  });
  lmenu.addEventListener('keydown', e => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const bs = [...lmenu.querySelectorAll('button')], i = bs.indexOf(document.activeElement); e.preventDefault();
    bs[(i + (e.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length].focus();
  });
  function renderLib() {
    $('#tabs').querySelectorAll('button').forEach(b => { const on = b.dataset.tab === tab; if (on) b.dataset.on = '1'; else delete b.dataset.on; b.setAttribute('aria-selected', on); });
    // A VIDEO CAS STARTED (Edit in CASV) is a fresh canvas: the library shows only what this video
    // brought or uses, so nothing from earlier sessions is in the way; one click shows everything.
    const M = libM(); let h = '';
    const count = c => c ? c + (c === 1 ? ' file' : ' files') : '';
    const drop = (want, label, sub) => '<button class="vs-drop" data-up="' + want + '">' + ico('upload') + '<span>' + label + '</span><s>' + sub + '</s></button>';
    const rm = id => '<span class="vs-x" data-rm="' + id + '" title="Remove from the library and the timeline">' + ico('close') + '</span>';
    const none = (t, body) => '<div class="vs-none"><b>' + t + '</b>' + body + '</div>';
    if (tab === 'media' || tab === 'audio') {
      h += '<div class="vs-sec">' + (tab === 'media' ? drop('media', 'Drop video or photos', 'MP4, MOV, WebM, JPG or PNG') + '<button class="vs-link" data-hf="1" title="Browse the videos you made on Higgsfield and import them">Or import from Higgsfield</button>' : drop('audio', 'Drop music or sound', 'MP3, WAV or M4A') + '<button class="vs-link" data-mk="vo" title="Voiceover and music are made in the Generate tab on the right">Or generate a voiceover or music</button>') + '</div>';
      h += libSec(tab, M) + (tab === 'media' && P.casBg ? '<div class="vs-sec"><button class="vs-mini" data-liball="1">' + (P.casBg.all ? 'Show only this video\'s media' : 'Show everything in the library') + '</button></div>' : '');
    } else if (tab === 'text') {
      // each tile is a specimen of what it adds, in the chrome's ink; the full description is its tooltip
      const tile = (attr, o) => '<button class="vs-t" ' + attr + '="' + o[0] + '" title="' + o[2] + '"><i>' + o[3] + '</i><b>' + o[1] + '</b></button>';
      const pre = [
        ['headline', 'Headline', 'Headline: Regular 400, bottom left, rises in', '<span class="vs-m"><em>Skyline</em></span>'],
        ['full', 'Three lines', 'Eyebrow, headline and line: tracked caps over the headline, a Light line under', '<span class="vs-m"><small>LAUNCH</small><em style="font-size:11px">Skyline</em><u class="t" style="width:34px"></u></span>'],
        ['caption', 'Caption', 'Caption: a small line at the bottom, fades', '<span class="vs-m" data-a="b"><q>Now selling</q></span>'],
        ['centre', 'Centred', 'Centre stage: large, centred, revealed line by line', '<span class="vs-m" data-a="c"><u style="width:40px"></u><u style="width:26px"></u></span>'],
        ['number', 'Big number', 'Big number: a Jumbo figure under an eyebrow, word by word', '<span class="vs-m"><small>HOMES</small><em style="font-size:16px">73</em></span>']
      ];
      const call = [
        ['ruler', 'Measure', 'Measure line: a line that grows, with a figure, such as 380 m tall', '<span class="vs-m" data-a="c"><span class="r"><i></i><q>380 m</q></span></span>'],
        ['count', 'Count up', 'Counting figure: a number that counts up over a label', '<span class="vs-m" data-a="c"><span class="n">71 72 <em>73</em></span></span>'],
        ['box', 'Outline box', 'Outline box: an outline that draws round a label', '<span class="vs-m" data-a="c"><span class="o"><small>HOME</small></span></span>'],
        ['cta', 'End card', 'End card: a frosted panel at the end with your message, a button and the wordmark', '<span class="vs-m" data-a="c"><span class="k"><u style="width:26px"></u><u class="t" style="width:18px"></u><b></b></span></span>']
      ];
      h += '<div class="vs-sec">' + H('Add text', 'at the playhead') + '<div class="vs-grid">' + pre.map(o => tile('data-addtext', o)).join('') + '</div></div>';
      h += '<div class="vs-sec">' + H('Add a callout', 'at the playhead') + '<div class="vs-grid">' + call.map(o => tile('data-addcall', o)).join('') + '</div></div>';
    } else {
      h += '<div class="vs-sec">' + drop('logo', 'Drop a motion graphic or logo', 'Video, PNG or SVG · WebM keeps transparency') +
        (CMW ? cmWaitHtml() : '<button class="vs-link" data-cm="1" title="Paste a Claude Motion link; CASV adds its export by itself">Or bring one from Claude Motion</button>') + '</div>';
      h += libSec('logos', M);
      h += '<div class="vs-sec"><button class="vs-link" data-go="doc" title="The Provident wordmark and the collaboration logo are set once for the whole video">The wordmark and partner logo are in Brand</button></div>';
    }
    $('#lib').innerHTML = h;
  }
  // THE RIGHT RAIL'S "WHOLE VIDEO": what is set once (CAS's Layout column). Comments from CAS
  // first when the video has been sent, then the wordmark, the collaboration logo, the logo colour.
  function docHtml() {
    const b = P.brand, lib = devLib(), g = G();
    const seg = (k, opts, cls) => '<div class="vs-seg' + (cls ? ' ' + cls : '') + '">' + opts.map(o => '<button data-bk="' + k + '" data-bv="' + o[0] + '"' + (String(b[k]) === String(o[0]) ? ' data-on="1"' : '') + '>' + o[1] + '</button>').join('') + '</div>';
    const row = (label, body) => '<div class="vs-row"><span>' + label + '</span>' + body + '</div>';
    return '<div class="vs-cap"><b>Brand</b><s>' + g.name + (total() ? ' · ' + fmt(total()) : '') + '</s></div>' + casNotesHtml() + scriptHtml() +
      '<div class="vs-sec">' + H('Provident wordmark') + row('Show', seg('on', [[true, 'Shown'], [false, 'Hidden']], 's')) +
        (b.on ? row('Align', seg('align', [['left', 'Left'], ['centre', 'Centre']])) + row('Position', seg('vpos', [['top', 'Top'], ['bottom', 'Bottom']])) +
          row('Colour', seg('ink', [['white', 'White'], ['navy', 'Navy']])) +
          rng('b', 'scale', 'Size', b.scale, 60, 200, '%') + rng('b', 'wash', 'Wash behind it', b.wash, 0, 100, '%') : '') + '</div>' +
      '<div class="vs-sec">' + H('Collaboration logo', b.partner ? esc(b.partner.name) : 'None') + '<div class="vs-grid">' +
        '<button class="vs-t" data-partner=""' + (!b.partner ? ' data-on="1"' : '') + ' title="No collaboration logo"><i><span class="vs-m" data-a="c"><u class="t" style="width:14px"></u></span></i><b>None</b></button>' +
        lib.map(l => '<button class="vs-t" data-partner="' + esc(l.id) + '" title="' + esc(l.name) + '"' + (b.partner && b.partner.id === l.id ? ' data-on="1"' : '') + '><i><u style="-webkit-mask-image:url(\'' + l.u + '\');mask-image:url(\'' + l.u + '\')"></u></i><b>' + esc(l.name) + '</b>' + (l.own ? '<span class="vs-x" data-rmdev="' + esc(l.id) + '" title="Remove from this computer">' + ico('close') + '</span>' : '') + '</button>').join('') +
        '<button class="vs-t" data-up="partner" title="Add a developer logo from this computer"><i>' + ico('add') + '</i><b>Add a logo</b></button></div>' +
        (b.partner ? rng('b', 'pScale', 'Size', b.pScale, 60, 160, '%') : '') +
        '</div>' +
      '<div class="vs-sec">' + H('QR code', b.qr ? esc(b.qr.name) : 'None') +
        (b.qr ? '<div class="vs-f"><label>Position</label><div class="vs-seg">' + [['bl', 'Bottom left'], ['br', 'Bottom right'], ['tr', 'Top right']].map(o => { const off = o[0] === 'tr' && !qrTopOk(), cur = b.qrPos === 'tr' && !qrTopOk() ? 'bl' : b.qrPos || 'bl';
            return '<button data-bk="qrPos" data-bv="' + o[0] + '"' + (cur === o[0] ? ' data-on="1"' : '') + (off ? ' disabled title="Top right shares the wordmark\'s row: show the wordmark at the top left first"' : '') + '>' + o[1] + '</button>'; }).join('') + '</div></div>' +
            rng('b', 'qrScale', 'Size', b.qrScale || 100, 60, 160, '%') +
            '<div class="vs-acts"><button class="p-ghost p-sm" data-qrrm="1">Remove</button><button class="p-ghost p-sm" data-up="qr">Replace</button></div>'
          : '<div class="vs-acts"><button class="p-btn p-sm" data-up="qr">Upload a QR code</button></div>') +
        '</div>' +
      '<div class="vs-sec">' + H('Logo colour') + seg('tint', [['match', 'Match wordmark'], ['orig', 'Original']]) +
        '</div>';
  }
  function rng(scope, k, label, v, min, max, unit, step) {
    return '<div class="vs-f"><label>' + label + ' <s data-out="' + k + '">' + v + (unit || '') + '</s></label><input type="range" class="p-range" data-' + scope + 'r="' + k + '" data-unit="' + (unit || '') + '" min="' + min + '" max="' + max + '" step="' + (step || 1) + '" value="' + v + '"></div>';
  }
  let upWant = 'media';
  function pickFiles(want) {
    upWant = want; const fi = $('#fileIn');
    fi.accept = want === 'media' ? 'video/*,image/*,.mov' : want === 'audio' ? 'audio/*' : want === 'script' ? '.md,.markdown,text/markdown,.pdf,application/pdf' : want === 'logo' ? 'image/*,video/*,.mov,.webm' : 'image/*';
    fi.multiple = want !== 'partner' && want !== 'qr'; fi.value = ''; fi.click();
  }
  // the wordmark, collaboration logo and logo colour controls, wherever they are drawn
  function brandClick(e) {
    const q = a => e.target.closest('[' + a + ']'); let el;
    if ((el = q('data-rmdev'))) {
      e.stopPropagation();
      let own = []; try { own = JSON.parse(WS.getItem(LKEY) || '[]'); } catch (x) {}
      WS.setItem(LKEY, JSON.stringify(own.filter(o => o.id !== el.dataset.rmdev))); renderInspector(); return true;
    }
    if ((el = q('data-up')) && (el.dataset.up === 'partner' || el.dataset.up === 'qr')) { pickFiles(el.dataset.up); return true; }
    if (q('data-qrrm')) { mark(); P.brand.qr = null; renderAll(); return true; }
    if ((el = q('data-partner'))) {
      mark(); const l = devLib().find(x => x.id === el.dataset.partner);
      P.brand.partner = l ? { id: l.id, name: l.name, u: l.u } : null; if (l) P.brand.on = true;
      partnerLoad(); renderAll(); return true;
    }
    if ((el = q('data-bk'))) {
      mark(); const v = el.dataset.bv; P.brand[el.dataset.bk] = v === 'true' ? true : v === 'false' ? false : v;
      if (el.dataset.bk === 'tint') P.logos.forEach(l => { l.tint = v; });   // the one switch reaches every placed graphic
      pTint = null; renderAll(); return true;
    }
    return false;
  }
  $('#lib').addEventListener('keydown', e => {      // the star and the menu are spans inside a tile that is itself a button
    const el = e.target.closest('[data-star],[data-more]');
    if (el && e.target === el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); el.click(); }
  });
  $('#lib').addEventListener('change', e => { if (e.target.id === 'libDir') { LQ[libKey()].dir = e.target.value; renderLib(); } else if (e.target.id === 'libSort') { LIB.sort = e.target.value; libSave(); renderLib(); } });
  $('#lib').addEventListener('input', e => { if (e.target.id === 'libQ') { LQ[libKey()].q = e.target.value; libRefresh(); return; } });
  $('#lib').addEventListener('click', e => {
    const q = a => e.target.closest('[' + a + ']');
    let el;
    if ((el = q('data-rm'))) { e.stopPropagation(); removeMedia(el.dataset.rm); }
    else if ((el = q('data-star'))) { e.stopPropagation(); lset(el.dataset.star, 'star', lm(el.dataset.star).star ? 0 : 1); libRefresh(); }
    else if ((el = q('data-more'))) { e.stopPropagation(); libMenu(el.dataset.more, el); }
    else if ((el = q('data-libf'))) { LQ[libKey()].f = el.dataset.libf; renderLib(); }
    else if ((el = q('data-libview'))) { LIB.view = el.dataset.libview; libSave(); renderLib(); }
    else if ((el = q('data-libclear'))) { LQ[libKey()] = { q: '', f: 'all', dir: '' }; renderLib(); }
    else if ((el = q('data-dirnew'))) dirNew();
    else if ((el = q('data-dirren'))) dirRename();
    else if ((el = q('data-dirdel'))) dirDelete();
    else if ((el = q('data-liball')) && P.casBg) { P.casBg.all = !P.casBg.all; save(); renderLib(); }
    else if ((el = q('data-up'))) pickFiles(el.dataset.up);
    else if ((el = q('data-go'))) { rtab = el.dataset.go; document.body.dataset.pane = 'edit'; paintPane(); renderInspector(); }
    else if ((el = q('data-addclip'))) addClip(el.dataset.addclip);
    else if ((el = q('data-hear'))) hearToggle(el.dataset.hear);
    else if ((el = q('data-addaudio'))) addAudio(el.dataset.addaudio, el.dataset.trk);
    else if ((el = q('data-addtext'))) addText(el.dataset.addtext);
    else if ((el = q('data-addcall'))) (el.dataset.addcall === 'cta' ? addCta() : addCallout(el.dataset.addcall));
    else if ((el = q('data-addlogo'))) addLogo(el.dataset.addlogo);
  });
  $('#fileIn').addEventListener('change', e => {
    const files = e.target.files; if (!files.length) return;
    if (upWant === 'script') { importScript(Array.from(files)); return; }
    if (upWant === 'qr') {                    // kept in the project itself, at most 600 px, so it travels with it
      const f = files[0], im = new Image(), url = URL.createObjectURL(f);
      im.onload = () => {
        const sc = Math.min(1, 600 / Math.max(im.naturalWidth, im.naturalHeight)), k = document.createElement('canvas');
        k.width = Math.max(1, Math.round(im.naturalWidth * sc)); k.height = Math.max(1, Math.round(im.naturalHeight * sc));
        const x = k.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, k.width, k.height); x.imageSmoothingEnabled = sc < 1; x.drawImage(im, 0, 0, k.width, k.height);
        URL.revokeObjectURL(url); mark(); P.brand.qr = { name: f.name.replace(/\.[^.]+$/, ''), u: k.toDataURL('image/png') }; renderAll();
      };
      im.onerror = () => { URL.revokeObjectURL(url); toast('That file could not be read as an image.'); };
      im.src = url;
    } else if (upWant === 'partner') {
      const f = files[0], rd = new FileReader();
      rd.onload = () => {
        const l = { id: 'own-' + uid(), name: f.name.replace(/\.[^.]+$/, ''), u: rd.result };
        let own = []; try { own = JSON.parse(WS.getItem(LKEY) || '[]'); } catch (x) {}
        own.push(l); try { WS.setItem(LKEY, JSON.stringify(own)); } catch (x) { toast('That logo is too large to keep in the list; it is used for this video only.'); }
        mark(); P.brand.partner = l; P.brand.on = true; partnerLoad(); renderAll();
      };
      rd.readAsDataURL(f);
    } else addFiles(files, upWant);
  });
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; renderLib(); } });

  // ── right rail: the selected item ────────────────────────────────────────────────────
  // TWO VIEWS BEHIND ONE SWITCH (2026-11-13 redesign): Selected is the item picked on the
  // timeline or the picture (CAS's "This component"); Whole video is what is set once (CAS's
  // Layout column). Picking something turns to Selected, dropping it turns back to Whole video,
  // and the switch lets either be opened by hand.
  let rtab = 'doc', selKey = '';
  const cutBtn = (kind, n, label, one) => '<button class="p-ghost p-sm" data-mkcut="' + kind + '"' + (one ? ' data-one="1"' : '') + (n ? '' : ' disabled') + '>' + label + (n ? ' · ' + n : '') + '</button>';
  function mkPaint() {
    const pop = $('#mkPop'); if (!pop) return;
    const seg = (k, opts, cls) => '<div class="vs-seg' + (cls ? ' ' + cls : '') + '">' + opts.map(o => '<button data-mk="' + k + '" data-v="' + o[0] + '"' + (String(MK[k]) === String(o[0]) ? ' data-on="1"' : '') + '>' + o[1] + '</button>').join('') + '</div>';
    const row = (k, label, body) => '<div class="vs-row"><span><i class="vs-mkd" data-k="' + k + '"></i>' + label + '</span>' + body + '</div>';
    const onoff = [[true, 'On'], [false, 'Off']];
    const mus = P.audio.filter(a => a.track === 'music').map(a => media[a.mid]).filter(Boolean);
    const beat = MK.beat === 'off' ? '' : !mus.length ? 'There is no music on the Music track yet. ' : mus.some(m => m._beating || !m.beats) ? 'Listening to the music… ' : mus.every(m => !m.beats.all.length) ? 'No steady beat was found in the music. ' : 'The music runs at about ' + mus.filter(m => m.beats.bpm).map(m => m.beats.bpm).join(' and ') + ' beats a minute. ';
    pop.innerHTML = '<b>Markers</b>' + row('scene', 'Scene changes', seg('scene', onoff, 's')) + row('cut', 'Clip cuts', seg('cut', onoff, 's')) +
      row('voice', 'Voice pauses', seg('voice', onoff, 's')) + row('beat', 'Music beats', seg('beat', [['off', 'Off'], ['bar', 'Bars'], ['beat', 'Beats']])) +
      '<p>' + beat + 'The playhead and anything you drag snap to the markers that are on. Voice pauses are read from the Sound track, beats from the Music track.</p>';
  }
  function paintPane() {
    const p = document.body.dataset.pane || 'add';
    $('#mseg').querySelectorAll('button').forEach(b => { const on = b.dataset.pane === p; if (on) b.dataset.on = '1'; else delete b.dataset.on; b.setAttribute('aria-selected', on); });
  }
  // APPLY TO ALL (2026-11-13, by request): what was set on one item, copied to every other item on
  // the same track, a group of settings at a time. Never the words, the file or the timing.
  const ALLG = {
    clip: [['Sound', ['vol', 'mute']], ['Transition', ['tr', 'trD']], ['Fit and zoom', ['fit', 'z', 'fx', 'fy']]],
    audio: [['Volume and fades', ['vol', 'fi', 'fo']], ['Caption style', ['capOn', 'capN', 'capStyle', 'capSize', 'capCase', 'capHi', 'capY']]],
    text: [['Size, place and effect', ['size', 'pos', 'align', 'anim', 'scrim', 'lead']]],
    call: [['Size', ['scale']]],
    logo: [['Size, opacity and colour', ['w', 'op', 'tint', 'fade']]]
  };
  function allOf(it) {
    const k = sel.kind;
    if (k === 'audio') return { g: ALLG.audio, peers: P.audio.filter(a => a !== it && a.track === it.track), word: it.track === 'music' ? 'music' : 'sound', track: it.track === 'music' ? 'Music' : 'Sound' };
    if (k === 'text') return it.call === 'cta' ? null : it.call ? { g: ALLG.call, peers: P.texts.filter(t => t !== it && t.call === it.call), word: 'callout of this kind', track: 'Text' }
      : { g: ALLG.text, peers: P.texts.filter(t => t !== it && !t.call), word: 'text', track: 'Text' };
    if (k === 'clip') return { g: ALLG.clip, peers: P.clips.filter(c => c !== it), word: 'clip', track: 'Video' };
    return { g: ALLG.logo, peers: P.logos.filter(l => l !== it), word: 'graphic', track: 'Motion graphics' };
  }
  function allHtml(it) {
    const a = allOf(it); if (!a || !a.peers.length) return '';
    return '<div class="vs-sec">' + acc('all', 'Apply to all', 'the other ' + a.peers.length + ' on ' + a.track,
      '<div class="vs-acts" style="flex-wrap:wrap">' + a.g.map((g, i) => '<button class="p-ghost p-sm" data-all="' + i + '" title="' + esc(g[0] + ': copy to every other ' + a.word + '. Words, files and timing are left alone.') + '">' + esc(g[0]) + '</button>').join('') + '</div>') + '</div>';
  }
  function allApply(it, i) {
    const a = allOf(it), g = a && a.g[+i]; if (!g || !a.peers.length) return;
    mark();
    a.peers.forEach(p2 => {
      g[1].forEach(k => {
        if (sel.kind === 'logo' && k === 'w') { lgeoW(p2).w = lgeo(it).w; return; }   // the size of the size being looked at
        if (it[k] === undefined) delete p2[k]; else p2[k] = it[k];
      });
    });
    pTint = null; dirty = true; save(); renderAll();
    toast(g[0] + ' applied to ' + a.peers.length + ' more on the ' + a.track + ' track. ⌘Z undoes it.');
  }
  let animOpen = true;              // Animate this photo is open by default (by request, 2026-11-18); folding it is remembered until reload
  function renderInspector() {
    const it = find(sel), el = $('#insp'); let h = '';
    const key = it ? sel.kind + ':' + sel.id : '';
    if (key !== selKey) { selKey = key; rtab = it ? 'sel' : 'doc'; if (it) { document.body.dataset.pane = 'edit'; paintPane(); } }
    $('#rtabs').querySelectorAll('button').forEach(b => { const on = b.dataset.rtab === rtab; if (on) b.dataset.on = '1'; else delete b.dataset.on; b.setAttribute('aria-selected', on); });
    genTab(); $('#gen').hidden = rtab !== 'gen'; el.hidden = rtab === 'gen';
    if (rtab === 'gen') { paintGen(); return; }
    if (rtab === 'doc') { el.innerHTML = docHtml(); return; }
    { const g = group(); if (g && sel.kind === 'clip') {
      const st = clipStarts(), ix = g.map(c => P.clips.indexOf(c)), a0 = Math.min(...ix.map(k => st[k])), L = g.reduce((a, c) => a + clipLen(c), 0);
      el.innerHTML = '<div class="vs-cap"><b>' + g.length + ' clips selected</b><s>' + fmt(L) + ' in all, from ' + fmt(a0) + '</s></div>' +
        '<div class="vs-sec"><div class="vs-none"><b>They change as one</b>Drag an end to resize them together, or drag one to move them all.</div></div>';
      return;
    } if (g) {
      const a0 = Math.min(...g.map(t => t.at)), e0 = Math.max(...g.map(t => t.at + t.dur));
      el.innerHTML = '<div class="vs-cap"><b>' + g.length + ' texts selected</b><s>' + fmt(a0) + ' to ' + fmt(e0) + '</s></div>' +
        '<div class="vs-sec"><div class="vs-none"><b>They move as one</b>Drag an end to resize them together, or drag one to move them all.</div></div>';
      return;
    } }
    const segv = (k, cur, opts, cls) => '<div class="vs-seg' + (cls ? ' ' + cls : '') + '">' + opts.map(o => '<button data-k="' + k + '" data-v="' + o[0] + '"' + (String(cur) === String(o[0]) ? ' data-on="1"' : '') + '>' + o[1] + '</button>').join('') + '</div>';
    const seg = (k, opts, cls) => segv(k, it[k], opts, cls);
    const f = (label, body) => '<div class="vs-f"><label>' + label + '</label>' + body + '</div>';
    const row = (label, body) => '<div class="vs-row"><span>' + label + '</span>' + body + '</div>';
    const cap = (t, meta) => '<div class="vs-cap"><b>' + t + '</b>' + (meta ? '<s title="' + meta + '">' + meta + '</s>' : '') + '</div>';
    const sec = (title, meta, body) => '<div class="vs-sec">' + H(title, meta) + body + '</div>';
    const timing = () => sec('Timing', 'seconds', '<div class="vs-two">' +
      f('Starts at', '<input class="p-in" type="number" data-n="at" min="0" step="0.1" value="' + it.at.toFixed(2) + '">') +
      f('Lasts', '<input class="p-in" type="number" data-n="dur" min="0.2" step="0.1" value="' + it.dur.toFixed(2) + '">') + '</div>');
    if (!it) {
      h = '<div class="vs-sec"><div class="vs-none"><b>Nothing selected</b>Click a clip, a text, a graphic or a sound on the timeline, or anything on the picture, to edit it here.<div class="vs-qa"><button class="p-ghost p-sm" data-ltab="media">Add footage</button><button class="p-ghost p-sm" data-ltab="text">Add text</button><button class="p-ghost p-sm" data-ltab="graphics">Add a graphic</button><button class="p-ghost p-sm" data-go2="doc">Logos and QR code</button></div></div></div>';
    } else if (sel.kind === 'clip') {
      const m = media[it.mid] || {}, vid = m.kind === 'video';
      h = cap(vid ? 'Video clip' : 'Photo clip', esc(m.name));
      if (vid) h += '<div class="vs-sec">' + row('Length', '<s>' + fmt(clipLen(it)) + ' of ' + fmt(m.dur) + '</s>') +
        row('Sound', seg('mute', [[false, 'On'], [true, 'Muted']], 's')) + (it.mute ? '' : rng('i', 'vol', 'Volume', Math.round(it.vol * 100), 0, 150, '%')) +
        '<div class="vs-acts"><button class="p-ghost p-sm" id="detachBtn" title="Put this clip\'s sound on the Music track as its own piece, and mute the clip">Detach audio</button>' + cutBtn('clip', sceneCuts(it).length, 'Cut at scene changes', 1) + '</div></div>' + sec('Speed', '', speedSec(it, clipLen(it), VRATE));
      else h += '<div class="vs-sec">' + row('Lasts', '<span class="vs-numw"><input class="p-in vs-num" type="number" data-n="out" min="0.2" step="0.1" value="' + it.out.toFixed(2) + '" aria-label="Lasts, seconds"><i>s</i></span>') +
        (window.ProvidentGenfill ? '<div class="vs-acts"><button class="p-ghost p-sm" id="extBtn" title="Fill the frame around this photo with Firefly or Nano Banana. The photo itself is kept.">Extend photo</button></div>' : '') + '</div>';
      if (P.clips.indexOf(it) > 0) h += sec('Transition in', 'from the clip before', row('Style', '<select class="p-in" data-s="tr">' + TRANS.map(o => '<option value="' + o[0] + '"' + ((it.tr || 'cut') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>') + (it.tr && it.tr !== 'cut' ? rng('i', 'trD', 'Lasts', it.trD || .5, .2, 1.5, 's', .1) : ''));
      h += sec('Framing', '', seg('fit', [['fill', 'Fill the frame'], ['fit', 'Fit inside']]) +
        rng('i', 'z', 'Zoom', it.z, 100, 300, '%') + rng('i', 'fx', 'Left to right', it.fx, 0, 100, '') + rng('i', 'fy', 'Top to bottom', it.fy, 0, 100, ''));
      if (!vid) { const open = animOpen || it.job;
        h += animHtml(it, (t, meta, body) => '<details class="vs-acc" data-acc="anim"' + (open ? ' open' : '') + '><summary><b>' + t + '</b><s>Turn it into video</s>' + CHEV + '</summary><div class="vs-acc-b">' + body + '</div></details>', f, row); }
    } else if (sel.kind === 'audio') {
      const m = media[it.mid] || {};
      h = cap('Audio', esc(m.name)) +
        '<div class="vs-sec">' + row('Track', seg('track', [['music', 'Music'], ['sfx', 'Sound']])) + rng('i', 'vol', 'Volume', Math.round(it.vol * 100), 0, 150, '%') +
        rng('i', 'fi', 'Fade in', it.fi, 0, 5, 's', .1) + rng('i', 'fo', 'Fade out', it.fo, 0, 5, 's', .1) +
        (it.track === 'sfx' ? '<div class="vs-acts">' + cutBtn('audio', voiceCuts(it).length, 'Cut at voice pauses', 1) + '</div>' : '') + '</div>' +
        sec('Speed', '', speedSec(it, it.dur, ARATE)) +
        sec('Captions', it.capOn ? '' : 'Off', row('Show', seg('capOn', [[true, 'On'], [false, 'Off']], 's')) +
        (it.capOn ? f('Voiceover script', '<textarea class="p-in" data-s="cap" rows="6" placeholder="Paste exactly what is said in this audio">' + esc(it.cap || '') + '</textarea>') +
          row('Words at a time', seg('capN', [['1', 'One'], ['2', 'Two'], ['3', 'Three']])) +
          row('Style', seg('capStyle', [['plain', 'Plain'], ['pill', 'Navy pill']])) +
          row('Size', seg('capSize', [['S', 'Small'], ['M', 'Medium'], ['L', 'Large']])) +
          acc('capfine', 'Fine-tune', 'Letters, highlight, height, timing', row('Letters', seg('capCase', [['caps', 'Capitals'], ['as', 'As typed']])) +
          row('Spoken word in brass', seg('capHi', [[true, 'On'], [false, 'Off']], 's')) +
          rng('i', 'capY', 'Height', it.capY == null ? 90 : it.capY, 0, 100, '%') +
          rng('i', 'capShift', 'Earlier / later', it.capShift || 0, -1.5, 1.5, 's', .05) +
          '<span class="vs-note">Timing is estimated from the loudness of the speech. Nudge it with Earlier / later.</span>') : '')) + timing();
    } else if (sel.kind === 'text' && it.call === 'cta') {
      h = cap('End card', esc(it.head || '')) + '<div class="vs-sec">' +
        f('Line above <s>optional</s>', '<textarea class="p-in" data-s="line" rows="2">' + esc(it.line || '') + '</textarea>') +
        f('Headline', '<textarea class="p-in" data-s="head" rows="2">' + esc(it.head || '') + '</textarea>') +
        f('Button', '<input class="p-in" data-s="btn" value="' + esc(it.btn || '') + '" placeholder="Leave empty for no button">') + '</div>' +
        sec('Look', '', row('Wordmark', seg('mark', [[true, 'Shown'], [false, 'Hidden']], 's')) +
        row('Panel', seg('glass', [['glass', 'Frosted glass'], ['plain', 'Navy']])) +
        rng('i', 'y', 'Up or down', it.y == null ? 50 : it.y, 15, 85, '%') +
        rng('i', 'wash', 'Background wash', it.wash == null ? 45 : it.wash, 0, 80, '%') +
        row('Captions under it', segv('capHide', it.capHide || 'show', [['show', 'Shown'], ['hide', 'Hidden']], 's')) +
        '') + timing();
    } else if (sel.kind === 'text' && it.call) {
      const nm = { ruler: 'Measure line', count: 'Counting figure', box: 'Outline box' }[it.call];
      h = cap(nm, esc(it.value || it.label || '')) + '<div class="vs-sec">' +
        (it.call !== 'box' ? f(it.call === 'count' ? 'Figure it counts to' : 'Figure', '<input class="p-in" data-s="value" value="' + esc(it.value || '') + '">') : '') +
        f('Label', '<input class="p-in" data-s="label" value="' + esc(it.label || '') + '" placeholder="Set in capitals">') +
        (it.call === 'ruler' ? f('Figure sits', seg('side', [['right', 'Left of the line'], ['left', 'Right of the line']])) : '') + '</div>' +
        sec('Place and size', '', rng('i', 'x', 'Across', it.x, 0, 100, '%') + rng('i', 'y', 'Down', it.y, 0, 100, '%') +
        (it.call === 'box' ? rng('i', 'w', 'Width', it.w, 10, 100, '%') : '') + (it.call !== 'count' ? rng('i', 'h', it.call === 'ruler' ? 'Line length' : 'Height', it.h, 4, 90, '%') : '') +
        rng('i', 'scale', 'Type size', it.scale || 100, 50, 200, '%')) + timing();
    } else if (sel.kind === 'text') {
      h = cap('Text', esc(plain(it.text || it.eyebrow || it.sub || '').split('\n')[0])) + '<div class="vs-sec">' +
        f('Eyebrow <s>optional</s>', '<input class="p-in" data-s="eyebrow" value="' + esc(it.eyebrow) + '" placeholder="Set in capitals">') +
        '<div class="vs-f"><label>Headline <button class="vs-hi" data-hi="text" title="Paint the selected words, or the word under the caret, in brass. Press again to remove."><i></i>Brass highlight</button></label><textarea class="p-in" data-s="text" rows="3">' + esc(it.text) + '</textarea></div>' +
        f('Line under it <s>optional</s>', '<textarea class="p-in" data-s="sub" rows="2">' + esc(it.sub) + '</textarea>') + '</div>' +
        sec('Layout', '', f('Size', seg('size', ART.order.map(s => [s, s]))) +
        row('Line spacing', segv('lead', leadOf(it), [['tight', 'Tight'], ['normal', 'Normal'], ['open', 'Open']])) +
        row('Position', seg('pos', [['top', 'Top'], ['centre', 'Centre'], ['bottom', 'Bottom']])) + row('Alignment', seg('align', [['left', 'Left'], ['centre', 'Centre']])) +
        rng('i', 'scrim', 'Wash under the text', it.scrim, 0, 100, '%')) +
        sec('Effect', 'how it arrives', '<select class="p-in" data-s="anim">' + ANIMS.map(a => '<option value="' + a[0] + '"' + (it.anim === a[0] ? ' selected' : '') + '>' + a[1] + '</option>').join('') + '</select>' +
        '<div class="vs-acts"><button class="p-ghost p-sm" id="previewBtn">' + ico('play_arrow') + 'Play this text</button></div>') + timing();
    } else {
      const m = media[it.mid] || {};
      h = cap('Graphic', esc(m.name)) + '<div class="vs-sec">' +
        rng('i', 'w', 'Size', Math.round(lgeo(it).w), 3, 100, '%') + rng('i', 'op', 'Opacity', it.op, 10, 100, '%') +
        ((media[it.mid] || {}).kind === 'video' ? '' : f('Colour', seg('tint', [['match', 'Match wordmark'], ['orig', 'Original']]))) +   // a motion graphic keeps its own colours
        row('Fades in and out', seg('fade', [[true, 'Yes'], [false, 'No']], 's')) +
        // NAVY WASH BEHIND IT (2026-11-26, by request): the brand navy over the whole picture while
        // the graphic is on screen, so a light graphic reads on a busy photo; intensity 10-90%
        row('Navy wash behind it', seg('washOn', [[true, 'On'], [false, 'Off']], 's')) +
        (it.washOn ? rng('i', 'wash', 'Wash intensity', it.wash == null ? 40 : it.wash, 10, 90, '%') : '') +
        '<div class="vs-acts"><button class="p-ghost p-sm" data-place="50,50">Centre it</button><button class="p-ghost p-sm" data-place="corner">Bottom corner</button></div>' +
        '</div>' + (m.cm ? sec('Claude Motion', 'where it was made',
          '<div class="vs-acts"><button class="p-ghost p-sm" data-cmopen="' + it.mid + '" title="' + esc(m.cm) + '">Open in Claude Motion</button><button class="p-ghost p-sm" data-cmup="' + it.mid + '" title="Open the film, Export it again, and the new file replaces this one wherever it is on the timeline">Update from Claude Motion</button></div>') : '') + timing();
    }
    if (it) h += allHtml(it);
    // the queue poll repaints this panel; the prompt being typed keeps its caret and scroll
    const a = document.activeElement, keep = a && a.id === 'genPrompt' && el.contains(a) && [a.selectionStart, a.selectionEnd, a.scrollTop], top = el.parentNode.scrollTop;
    el.innerHTML = h; labelFields(el);
    if (keep) { const b = document.getElementById('genPrompt'); if (b && !b.disabled) { b.focus({ preventScroll: true }); try { b.setSelectionRange(keep[0], keep[1]); } catch (e) {} b.scrollTop = keep[2]; } el.parentNode.scrollTop = top; }
  }
  // THE GENERATE PANEL (2026-11-18, by request): everything that is generated sits in one place,
  // the right rail's third tab, one inner tab each: the animate queue, the voiceover, the music.
  // It is its own container (#gen) beside #insp, so the inspector's handlers never see it.
  let gtab = 'anim';
  const jobClip = j => P.clips.find(x => (x.job && x.job.id === j.id) || x.descJob === j.id);
  const genN = () => JOBS.filter(j => jobActive(j) && jobClip(j)).length;        // this video's jobs only
  function genTab() { const b = $('#rtabs').querySelector('[data-rtab="gen"]'), n = genN(), t = 'Generate'; if (b && b.textContent !== t) b.textContent = t; }
  function genHtml() {
    // the animate queue moved to the take deck under the picture (2026-11-26, by request)
    if (VO.busy || VO.quote != null) gtab = 'vo'; else if (MU.busy || MU.quote != null) gtab = 'mu'; else if (gtab !== 'mu') gtab = 'vo';
    return '<div class="vs-sec"><div class="vs-seg" id="gtabs" role="tablist" aria-label="What to generate">' +
      [['vo', 'Voiceover'], ['mu', 'Music']].map(o => '<button role="tab" data-gtab="' + o[0] + '" aria-selected="' + (gtab === o[0]) + '"' + (gtab === o[0] ? ' data-on="1"' : '') + '>' + o[1] + '</button>').join('') + '</div></div>' +
      (gtab === 'mu' ? muHtml() : voHtml());
  }
  // repainting must not take the caret out of a script somebody is typing
  function paintGen() {
    const el = $('#gen'), a = document.activeElement, id = a && el.contains(a) && a.id, s0 = id && a.selectionStart, s1 = id && a.selectionEnd, top = el.parentNode.scrollTop;
    el.innerHTML = genHtml(); labelFields(el);
    if (id) { const b = document.getElementById(id); if (b) { b.focus(); try { if (s0 != null) b.setSelectionRange(s0, s1); } catch (e) {} } }
    el.parentNode.scrollTop = top;
  }
  function renderGen() { genTab(); if (rtab === 'gen') paintGen(); renderBar(); }
  const gen = $('#gen');
  // a field's visible label names it for assistive tech too (the helpers emit a sibling label with no `for`)
  function labelFields(root) {
    root.querySelectorAll('.vs-f').forEach(f => { const lb = f.querySelector(':scope > label'), c = f.querySelector('input,select,textarea'); if (!lb || !c || c.getAttribute('aria-label')) return;
      const t = [...lb.childNodes].filter(x => x.nodeType === 3 || (x.nodeType === 1 && x.tagName !== 'S' && x.tagName !== 'BUTTON')).map(x => x.textContent).join(' ').replace(/\s+/g, ' ').trim(); if (t) c.setAttribute('aria-label', t); });
    root.querySelectorAll('.vs-row').forEach(r => { const c = r.querySelector('select,input'), sp = r.querySelector(':scope > span'); if (c && sp && !c.getAttribute('aria-label')) c.setAttribute('aria-label', sp.textContent.trim()); });
  }
  gen.addEventListener('toggle', e => { const a = e.target.dataset && e.target.dataset.acc; if (a) ACC[a] = e.target.open; }, true);
  gen.addEventListener('keydown', e => { const el = e.target.closest('[data-qcancel],[data-qsel]'); if (el && e.target === el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); el.click(); } });
  gen.addEventListener('input', e => {
    const id = e.target.id;
    if (id === 'muText') MU.text = e.target.value; else if (id === 'muLen') { MU.len = e.target.value; MU.quote = null; }
    else if (id === 'voText' || id === 'voTarget') { VO[id === 'voText' ? 'text' : 'target'] = e.target.value; const hn = document.getElementById('voHint'); if (hn) hn.innerHTML = voHint(); }
    else if (id === 'voVoice') { VO.voice = e.target.value; VO.quote = null; renderGen(); }
  });
  gen.addEventListener('click', e => {
    const q = a => e.target.closest('[' + a + ']'); let el;
    if ((el = q('data-gtab'))) { gtab = el.dataset.gtab; renderGen(); }
    else if ((el = q('data-qcancel'))) { e.stopPropagation(); const id = el.dataset.qcancel, c = P.clips.find(x => x.job && x.job.id === id);
      if (c) animCancel(c); else api('/api/animate/cancel', { id }).catch(() => {}).then(() => { JOBS = JOBS.filter(j => j.id !== id); renderGen(); }); }
    else if (e.target.closest('#qClear')) { const ids = JOBS.filter(j => jobActive(j) && !jobClip(j) && jobStale(j)).map(j => j.id);
      Promise.all(ids.map(id => api('/api/animate/cancel', { id }).catch(() => {}))).then(() => { JOBS = JOBS.filter(j => ids.indexOf(j.id) < 0); renderGen(); toast(ids.length + (ids.length === 1 ? ' stalled job' : ' stalled jobs') + ' cleared.'); }); }
    else if ((el = q('data-qsel'))) { sel = { kind: 'clip', id: el.dataset.qsel }; rtab = 'sel'; const sp = span('clip', find(sel)); if (sp) seek(sp[0]); renderAll(); }
    else if (e.target.closest('#voHear')) voHear();
    else if (e.target.closest('#muBtn')) muMake(false);
    else if (e.target.closest('#muGo')) muMake(true);
    else if (e.target.closest('#muCancel')) { MU.quote = null; renderGen(); }
    else if ((el = q('data-mum'))) { MU.model = el.dataset.mum; MU.quote = null; renderGen(); }
    else if (e.target.closest('#voBtn')) voMake(false);
    else if (e.target.closest('#voGo')) voMake(true);
    else if (e.target.closest('#voCancel')) { VO.quote = null; renderGen(); }
  });
  const insp = $('#insp');
  insp.addEventListener('toggle', e => { const a = e.target.dataset && e.target.dataset.acc; if (a === 'anim') animOpen = e.target.open; else if (a === 'prompt') promptOpen = e.target.open; else if (a === 'more') moreOpen = e.target.open; else if (a) ACC[a] = e.target.open; }, true);
  insp.addEventListener('pointerdown', e => { if (e.target.matches('input[type=range]')) mark(); });
  insp.addEventListener('focusin', e => { if (e.target.matches('input:not([type=range]),textarea,select')) mark(); });
  insp.addEventListener('input', e => {
    const it = find(sel), d = e.target.dataset;
    if (d.br) {                               // a Whole video slider: the wordmark's or the partner's
      P.brand[d.br] = +e.target.value; pTint = null;
      const o = insp.querySelector('[data-out="' + d.br + '"]'); if (o) o.textContent = e.target.value + (d.unit || '');
      dirty = true; save(); return;
    }
    if (!it || rtab !== 'sel') return;
    if (e.target.id === 'genPrompt') {        // a prompt edited by hand is kept as it is, and remembers what it was written for
      const v = e.target.value, first = it.genPromptBy !== 'you';
      if (first) { it.genPromptBy = 'you'; if (!it.genPromptFor) it.genPromptFor = promptSig(it); }
      it.genPrompt = v;
      if (first) { dirty = true; save(); renderInspector(); return; }   // shows "Edited by you" and the way back; the caret is kept
      const n = document.getElementById('genPromptN'); if (n) { n.textContent = pCount(v); if (v.length > PMAX) n.dataset.over = '1'; else delete n.dataset.over; }
      dirty = true; save(); return;
    }
    if (d.ir) {
      let v = +e.target.value; const k = d.ir;
      const o = insp.querySelector('[data-out="' + k + '"]'); if (o) o.textContent = e.target.value + (d.unit || '');
      if (k === 'spd') {
        setRate(it, sel.kind, v / 100);
        const fi = insp.querySelector('[data-n="fit"]'), nt = insp.querySelector('#rateNote'); if (fi) fi.value = (sel.kind === 'clip' ? clipLen(it) : it.dur).toFixed(2); if (nt) nt.innerHTML = rateNote(it);
      }
      else if (sel.kind === 'logo' && (k === 'w' || k === 'x' || k === 'y')) lgeoW(it)[k] = v;
      else it[k] = k === 'vol' ? v / 100 : v;
      if (k === 'genDur') {                    // the price follows the slider; the prompt's beats are rewritten on release (change)
        const gb = insp.querySelector('#animNow'), gs = insp.querySelector('#genWhat'); if (gb && !gb.disabled) gb.textContent = 'Generate · ' + genCredits(it) + ' credits'; if (gs) gs.textContent = genWhat(it);
        dirty = true; save(); return;
      }
    } else if (d.s) { it[d.s] = e.target.value; if (d.s === 'tr') { dirty = true; save(); renderAll(); return; } }
    else if (d.n) {
      const v = parseFloat(e.target.value); if (!isFinite(v)) return;
      const m = media[it.mid];
      if (d.n === 'at') it.at = Math.max(0, v);
      else if (d.n === 'dur') it.dur = clamp(v, .2, sel.kind === 'audio' && m ? (m.dur - it.in) / (it.rate || 1) : 600);
      else if (d.n === 'fit') {                              // play the same stretch of the file in exactly v seconds
        const clip = sel.kind === 'clip', span = clip ? it.out - it.in : it.dur * (it.rate || 1); setRate(it, sel.kind, span / Math.max(.2, v));
        const o = insp.querySelector('#rateNote'), len = clip ? clipLen(it) : it.dur; if (o) o.innerHTML = rateNote(clip ? { rate: it.rate, dur: len, out: 1 } : it, v);
        const sl = insp.querySelector('[data-ir="spd"]'), so = insp.querySelector('[data-out="spd"]'), pc = Math.round((it.rate || 1) * 100); if (sl) sl.value = pc; if (so) so.textContent = pc + '%';
      }
      else if (d.n === 'out') it.out = clamp(v, .2, 120);
    } else return;
    dirty = true; save(); renderTimeline();
  });
  insp.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.ir === 'genDur') renderInspector(); });   // the prompt's beats follow the new length
  $('#rtabs').addEventListener('click', e => { const b = e.target.closest('[data-rtab]'); if (b) { rtab = b.dataset.rtab; renderInspector(); } });
  insp.addEventListener('click', e => {
    if (scriptClick(e) || brandClick(e)) return;
    const it = find(sel), b = e.target.closest('button'); if (!b) return;
    if (b.dataset.nt != null) { if (playing) pause(); seek(+b.dataset.nt); return; }
    if (b.dataset.all != null && it) return allApply(it, b.dataset.all);
    if (!it || rtab !== 'sel') return;
    if (b.dataset.mv) { mark(); it.move = b.dataset.mv; renderAll(); return; }
    if (b.dataset.gd) { mark(); it.genDur = +b.dataset.gd; renderAll(); return; }
    if (b.dataset.gm) { mark(); it.genModel = b.dataset.gm; it.genDur = genDurOf(it); renderAll(); return; }
    if (b.dataset.gq) { mark(); it.genMode = b.dataset.gq; delete it.genRes; delete it.genBit; renderAll(); return; }
    if (b.dataset.gr) { mark(); it.genRes = b.dataset.gr; it.genMode = /1080p|4k/.test(it.genRes) ? 'pro' : 'std'; renderAll(); return; }
    if (b.dataset.gb) { mark(); it.genBit = b.dataset.gb; renderAll(); return; }
    if (b.dataset.gp) { mark(); it.people = b.dataset.gp === '1'; renderAll(); return; }
    if (b.dataset.gx) { mark(); it.genExt = b.dataset.gx === '1'; renderAll(); return; }
    if (b.id === 'descBtn') return descSend(it);
    if (b.id === 'descCancel') { const id = it.descJob; mark(); delete it.descJob; JOBS = JOBS.filter(j => j.id !== id); api('/api/animate/cancel', { id }).catch(() => {}); renderAll(); return; }
    if (b.id === 'promptReset') { mark(); delete it.genPrompt; delete it.genPromptBy; delete it.genPromptFor; delete it.descErr; renderAll(); return; }
    if (b.dataset.mvall) { mvAll = true; renderInspector(); return; }
    if (b.id === 'detachBtn') return detachAudio(it);
    if (b.id === 'extBtn') return extendPhoto(it);
    if (b.dataset.mkcut) { cutAtMarkers(b.dataset.mkcut, it); return; }
    if (b.id === 'rateReset') { mark(); setRate(it, sel.kind, 1); save(); renderAll(); return; }
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
  setInterval(() => { if (exporting) { $('#ovP').style.width = (T / Math.max(.01, total()) * 100) + '%'; $('#ovC').textContent = fmt(T) + ' of ' + fmt(total()); } }, 120);
  $('#ovX').addEventListener('click', () => { recCancel = true; casStop = true; pause(); if (rec && rec.state !== 'inactive') rec.stop(); else { exporting = false; delete $('#ov').dataset.on; } });
  // ── Send to CAS ──────────────────────────────────────────────────────────────────────
  // The editor stays on this computer; CAS on the website holds the Google sign-in and the ad
  // sets. So CASV records BOTH sizes (Reel, then Square: twice the video's length), parks them with
  // a poster in the local server's outbox, and CAS's "Add video" fetches them from this computer
  // and uploads them into the ad set's Drive folder. `P.cas` remembers the outbox id, so sending
  // again replaces the same video and the reviewers' comments find their way back (casNotes).
  let casStop = false, casBusy = false;
  const CAS_SITE = () => { try { return localStorage.getItem('provident-casv-site') || 'https://design-studio.ngrok-free.dev/'; } catch (e) { return 'https://design-studio.ngrok-free.dev/'; } };
  // ── SAVE TO THE AD SET'S DRIVE FOLDER (2026-11-26, by request) ─────────────────────────
  // Google refuses a sign-in from this page's address (localhost), so Save opens a small window of
  // the Design Studio site (casv-save.html), which is signed in. That window reads the project and
  // its media from the working folder on this Mac (/api/work/…) and writes them to
  // <ad set folder>/Video: <name>.casv (the project) and <name> Assets/ (one file per media item,
  // named by its role: video-01.mp4, photo-01.jpg, music-01.mp3 …). The two talk by postMessage:
  // the window says `ready`, this page answers `go` once everything is written to the working
  // folder, the window answers `saved` with the ad set and the file names it gave.
  // P.drive = { set: { name, folder }, names: { mediaId: file }, at, sig }. `sig` is the project as
  // it was saved, so the button reads Saved until something changes.
  const hashOf = t => { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + '.' + t.length.toString(36); };
  const driveSig = () => { const o = Object.assign({}, P); delete o.drive; return hashOf(JSON.stringify(o)); };
  const siteOrigin = () => { try { return new URL(CAS_SITE()).origin; } catch (e) { return ''; } };
  let drivePend = '';
  function drivePaint() {
    const b = $('#saveBtn'); if (!b || !b.firstChild) return;
    const d = P.drive, saved = !!(d && d.sig && d.sig === driveSig()), l = b.querySelector('.vs-l2'), want = saved ? 'Saved' : 'Save';
    if (l.textContent !== want) l.textContent = want;
    if (saved) b.dataset.saved = '1'; else delete b.dataset.saved;
    b.disabled = !total();
    b.title = d && d.set ? (saved ? 'Saved in ' : 'Save to ') + d.set.name + ' › Video on Google Drive' + (d.at ? ' · last saved ' + new Date(d.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '')
      : 'Save this video and every file it uses to an ad set’s Google Drive folder';
    b.setAttribute('aria-label', want + (d && d.set ? ' to ' + d.set.name : ' to Google Drive'));
    const sb = $('#setBtn'); if (sb) sb.hidden = !(d && d.set);
  }
  async function driveGo(mode) {
    if (!WS.ok) { toast('Restart the Video Studio on this computer, then try again: it is running an older helper.'); return; }
    if (mode !== 'open') {
      if (!total()) { toast('Add a video first.'); return; }
      if (!P.name) {
        const n = await ask('Name this video', 'The name is used for its files in the ad set’s Google Drive folder.', 'Continue', (P.cas && P.cas.title) || '');
        if (n == null) return;
        if (!n.trim()) { toast('Name the video first.'); return; }
        P.name = n.trim().slice(0, 60); renderAll();
      }
      clearTimeout(saveT); WS.setItem(PKEY, JSON.stringify(P)); drivePend = driveSig();
    }
    const w = window.open(CAS_SITE().replace(/\/?$/, '/') + 'casv-save.html#' + mode + '.' + (location.port || '80'), 'casv-save', 'width=520,height=680');
    if (!w) toast('Allow pop-ups for this page, then press ' + (mode === 'open' ? 'Open' : 'Save') + ' again.');
  }
  window.addEventListener('message', async e => {
    const d = e.data, site = siteOrigin();
    if (!site || e.origin !== site || !d || d.casv !== 1) return;
    if (d.what === 'ready') { await WS.flush(); await DB.idle(); try { e.source.postMessage({ casv: 1, what: 'go' }, site); } catch (x) {} }
    else if (d.what === 'saved') driveSaved(d);
    else if (d.what === 'opened') casInbox();
  });
  function driveSaved(d) {
    if (!d || !d.set || !/^[\w-]{10,}$/.test(d.set.folder || '') || (P.drive && d.at && P.drive.at === d.at)) return;
    const names = {}; Object.keys(d.names || {}).slice(0, 500).forEach(k => { if (/^[a-z0-9]{4,16}$/.test(k) && /^[a-z]+-\d{2,3}\.[a-z0-9]{2,5}$/.test(d.names[k])) names[k] = d.names[k]; });
    P.drive = { set: { name: String(d.set.name || 'Ad set').slice(0, 120), folder: d.set.folder }, names, at: +d.at || Date.now(), sig: drivePend || driveSig() };
    save(); drivePaint(); toast('Saved to ' + P.drive.set.name + ' › Video on Google Drive');
  }
  // the save window also leaves its answer in the working folder, for a browser that cut the two
  // windows apart: read when this page is looked at again
  const driveAsk = async () => {
    if (!WS.ok) return;
    try {
      const v = ((await (await fetch('/api/work/state')).json()).state || {}).drive; if (!v) return;
      await fetch('/api/work/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'drive', value: null }) });
      driveSaved(JSON.parse(v));
    } catch (e) {}
  };
  window.addEventListener('focus', driveAsk);
  const recordOnce = () => new Promise(res => exportVideo(res));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  async function sendToCas() {
    if (casBusy || exporting) return;
    if (!total()) { toast('Add a video first.'); return; }
    const first = P.texts.find(t => !t.call && t.text), def = (P.cas && P.cas.title) || P.name || (first ? plain(first.text).replace(/\s+/g, ' ').slice(0, 60) : 'Video');
    const title = await ask('Send this video to CAS', 'CASV records the Reel 9:16 and then the Square 1:1, which takes twice the video\'s length. Keep this tab in front until it finishes.', 'Record and send', def);
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
      const cas = { id, title: title.trim() || 'Video', at: Date.now() };
      // the project and its media ride along, so CAS can keep them in the ad set's Drive folder
      let packed = 0;
      try { $('#ovT').textContent = 'Packing the project'; const pk = await casPack(Object.assign({}, P, { size: keep, cas })); await up('project', pk); packed = pk.size; } catch (e) {}
      const r = await fetch('/api/outbox/meta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, title: cas.title, dur: Math.round(total() * 100) / 100, sizes: out, project: packed }) });
      if (!r.ok) throw new Error('outbox');
      P.cas = cas;
      casDone(!!packed);
    } catch (e) {
      toast(e.message === 'mp4' ? 'This browser did not record an MP4. Use Chrome.' : e.message === 'outbox' ? 'Could not reach the local server, so nothing was sent. Is serve.py running?' : 'Nothing was sent to CAS.');
    } finally {
      P.size = keep; pTint = null; fitCanvas(); $('#ovT').textContent = 'Exporting the video'; casBusy = false; save(); renderAll();
    }
  }
  // SEND BACK TO CAS (2026-11-17): the video CAS asked for (Edit in CASV) is recorded once at 9:16 and
  // parked as the outbox part `bg` of the id CAS gave; CAS is watching for it and places it as the
  // design's video background (and saves it with the project on Drive). Sending again replaces it.
  async function sendBack() {
    if (casBusy || exporting || !P.casBg) return;
    if (!total()) { toast('Add a video first.'); return; }
    const keep = P.size; casBusy = true; casStop = false;
    try {
      P.size = '9x16'; pTint = null; fitCanvas(); renderAll();
      $('#ovT').textContent = 'Recording the 9:16 for CAS';
      const blob = await recordOnce();
      if (!blob || casStop) throw new Error('stopped');
      if (blob.type.indexOf('mp4') < 0) throw new Error('mp4');
      const r = await fetch('/api/outbox/file?id=' + P.casBg.id + '&part=bg', { method: 'PUT', body: blob });
      if (!r.ok) throw new Error('outbox');
      P.casBg.sent = Date.now();
      toast('Sent back to CAS. It plays behind the design there in a few seconds.');
    } catch (e) {
      toast(e.message === 'mp4' ? 'This browser did not record an MP4. Use Chrome.' : e.message === 'outbox' ? 'Could not reach the local server, so nothing was sent. Is serve.py running?' : 'Nothing was sent back to CAS.');
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
    return '<div class="vs-sec">' + H('Comments from CAS', CASN.length ? open.length + ' open' : '') + (CASN.length
      ? CASN.map((n, i) => '<button class="vs-cm" data-nt="' + (+n.t || 0) + '"' + (n.done ? ' data-done="1"' : '') + ' title="Jump to this moment"><i>' + (i + 1) + '</i><b>' + fmt(+n.t || 0) + (n.by ? ' · ' + esc(n.by) : '') + (n.done ? ' · done' : '') + '</b><s>' + esc(n.text) + '</s></button>').join('') +
        '<span class="vs-note">Click one to jump to it. Send the video to CAS again once they are dealt with.</span>'
      : '<div class="vs-none">“' + esc(P.cas.title) + '” was sent to CAS. Comments left on its timeline there appear here.</div>') + '</div>';
  }
  async function casNotes() {
    if (!P.cas || document.hidden || exporting) return;
    try {
      const r = await fetch('/api/outbox/notes?id=' + P.cas.id), j = await r.json(), n = Array.isArray(j.notes) ? j.notes : [];
      if (JSON.stringify(n) !== JSON.stringify(CASN)) { CASN = n; renderTimeline(); if (rtab === 'doc') renderInspector(); }
    } catch (e) {}
  }
  setInterval(casNotes, 15000); setTimeout(casNotes, 1200);
  // ONE FILE HOLDS THE PROJECT (2026-11-16): 'CASV', the header's length, the header (the project,
  // this computer's own logos, a row per media file), then the media files end to end. Only the
  // media the project uses goes in. CAS keeps the file in the ad set's Drive folder; casUnpack
  // reads it back on any computer.
  async function casPack(proj) {
    const used = JSON.stringify(proj), recs = ((await DB.all()) || []).filter(r => r.blob && used.indexOf('"' + r.id + '"') >= 0);
    let logos = []; try { logos = JSON.parse(WS.getItem(LKEY) || '[]'); } catch (e) {}
    const head = new TextEncoder().encode(JSON.stringify({ casv: 1, at: Date.now(), project: proj, logos,
      media: recs.map(r => ({ id: r.id, kind: r.kind, name: r.name, type: r.blob.type, size: r.blob.size, dur: r.dur, w: r.w, h: r.h, poster: r.poster, peaks: r.peaks, cuts: r.cuts, cutsV: r.cutsV })) }));
    const pre = new DataView(new ArrayBuffer(8)); pre.setUint32(0, 0x43415356); pre.setUint32(4, head.length);
    return new Blob([pre.buffer, head].concat(recs.map(r => r.blob)), { type: 'application/octet-stream' });
  }
  async function casUnpack(blob) {
    const pre = new DataView(await blob.slice(0, 8).arrayBuffer());
    if (blob.size < 8 || pre.getUint32(0) !== 0x43415356) throw new Error('not a project');
    const n = pre.getUint32(4), head = JSON.parse(await blob.slice(8, 8 + n).text()); let off = 8 + n;
    if (!head.project || head.project.v !== 1) throw new Error('not a project');
    const recs = (head.media || []).map(m => { const b = blob.slice(off, off + m.size, m.type); off += m.size; return { id: m.id, kind: m.kind, name: m.name, blob: b, dur: m.dur, w: m.w, h: m.h, poster: m.poster, peaks: m.peaks, cuts: m.cuts, cutsV: m.cutsV }; });
    if (off !== blob.size) throw new Error('cut short');
    return { head, recs };
  }
  // CAS's "Open in Video Studio" left a project on this computer (the local server's inbox). Opening
  // it REPLACES the project here, so it asks first. The new media is stored before anything old is
  // removed; if the browser has no room, nothing changes.
  const inboxSeen = {};
  async function casInbox() {
    if (document.hidden || exporting || casBusy || loading || $('#ask').open) return;
    let row = null;
    try { const j = await (await fetch('/api/inbox/list')).json(); row = (j.projects || []).find(p => !inboxSeen[p.id + ':' + p.at]); } catch (e) { return; }
    if (!row) return;
    inboxSeen[row.id + ':' + row.at] = 1;
    const done = () => fetch('/api/inbox/done', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id }) }).catch(() => {});
    // handed over by the Grok bot (row.from): like Open project, the video open here is kept as the last video
    if (row.from) {
      if (!(await ask('Open “' + row.title + '” from ' + row.from + '?', row.from + ' made this video and handed it over to you.' + (total() ? ' It replaces the video open here, which is kept: Reopen the last video brings it back.' : ''), 'Open it'))) { done(); return; }
      let u = null;
      try { u = await casUnpack(await (await fetch('/api/inbox/file?id=' + row.id)).blob()); } catch (e) { toast('That project could not be opened. Nothing was changed.'); return; }
      await putProject(u, done); return;
    }
    const yes = await ask('Open “' + row.title + '” from CAS', 'CAS sent this project from its ad set’s Drive folder. Opening it replaces the project that is open here now' + (total() ? ', which is not saved anywhere else unless you sent it to CAS' : '') + '.', 'Open it');
    if (!yes) { done(); return; }
    try {
      const u = await casUnpack(await (await fetch('/api/inbox/file?id=' + row.id)).blob());
      pidIn(u);
      const old = ((await DB.all()) || []).map(r => r.id), keep = {};
      for (const r of u.recs) { keep[r.id] = 1; await DB.putStrict(r); }
      loading = true; clearTimeout(saveT);
      WS.setItem(PKEY, JSON.stringify(u.head.project));
      try { const own = JSON.parse(WS.getItem(LKEY) || '[]'), have = {}; own.forEach(o => { have[o.id] = 1; }); (u.head.logos || []).forEach(o => { if (o && o.id && !have[o.id]) own.push(o); }); WS.setItem(LKEY, JSON.stringify(own)); } catch (e) {}
      for (const id of old) if (!keep[id]) await DB.del(id);
      await done(); await WS.flush();
      location.reload();
    } catch (e) { loading = false; toast(e && e.name === 'QuotaExceededError' ? 'This browser has no room for that project’s media. Nothing was changed.' : 'That project could not be opened. Nothing was changed.'); }
  }
  setInterval(casInbox, 15000); setTimeout(casInbox, 2500);
  // OPEN PROJECT (2026-11-19, by request: "theres casv made by grok bots"): a .casv file from disk,
  // by the top bar's button, the empty timeline's link or dropped on the window. Unlike the inbox it
  // keeps the replaced video as the last video (PREV) and deletes no media, so Reopen the last video
  // brings it back whole.
  const isCasv = f => !!f && /\.casv$/i.test(f.name || '');
  async function openProject(file) {
    if (!file || exporting || casBusy || loading || $('#ask').open) return;
    let u = null;
    try { u = await casUnpack(file); } catch (e) { toast('“' + (file.name || 'That file') + '” is not a Video Studio project (.casv). Nothing was changed.'); return; }
    const nm = (u.head.project.name || (u.head.project.cas && u.head.project.cas.title) || String(file.name || '').replace(/\.casv$/i, '') || 'this project').slice(0, 60);
    if (total() && !(await ask('Open “' + nm + '”?', 'It replaces the video open here. That one is kept: Reopen the last video brings it back' + (P.cas ? '' : ' — it has not been sent to CAS') + '.', 'Open it'))) return;
    await putProject(u);
  }
  function pidIn(u) {
    const pr = u.head.project; if (!pr.id) pr.id = uid() + uid();
    u.recs.forEach(r => { r.pid = pr.id; });
  }
  async function putProject(u, after) {
    pidIn(u);
    try {
      for (const r of u.recs) await DB.putStrict(r);
      loading = true; clearTimeout(saveT);
      if (total()) WS.setItem(PREV, JSON.stringify(P));
      WS.setItem(PKEY, JSON.stringify(u.head.project));
      try { const own = JSON.parse(WS.getItem(LKEY) || '[]'), have = {}; own.forEach(o => { have[o.id] = 1; }); (u.head.logos || []).forEach(o => { if (o && o.id && !have[o.id]) own.push(o); }); WS.setItem(LKEY, JSON.stringify(own)); } catch (e) {}
      if (after) await after();
      await WS.flush(); location.reload();
    } catch (e) { loading = false; toast(e && e.name === 'QuotaExceededError' ? 'This browser has no room for that project’s media. Nothing was changed.' : 'That project could not be opened. Nothing was changed.'); }
  }
  const projIn = document.createElement('input'); projIn.type = 'file'; projIn.accept = '.casv'; projIn.hidden = true; document.body.appendChild(projIn);
  projIn.addEventListener('change', () => { const f = projIn.files[0]; projIn.value = ''; openProject(f); });
  function casDone(packed) {
    const d = document.createElement('div'); d.className = 'vs-ov'; d.dataset.on = '1';
    d.innerHTML = '<div class="vs-dlg" role="dialog" aria-modal="true"><b>Ready for CAS</b><p>The Reel 9:16 and the Square 1:1 are waiting on this computer' + (packed ? ', with this project and its media' : '') + '. In CAS, open the ad set, press <b>Add video</b> on the audience and choose <b>From CASV on this computer</b>.' + (packed ? ' CAS saves the project in the ad set’s Drive folder with the video.' : ' The project could not be packed, so only the video goes to the ad set.') + '</p>' +
      '<div class="vs-dlg-a"><button class="p-ghost" data-go="0">Close</button><button class="p-btn" data-go="1">Open CAS</button></div></div>';
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
  // HIGGSFIELD'S OWN SETTINGS (2026-11-25, by request: "a built in higgs, specially the duration slider").
  // Limits and prices read from Higgsfield's tool that day with free quotes: Seedance 2.5 takes 4 to 30 s
  // and costs 3 / 7 / 16 / 28 credits a second at 480p / 720p / 1080p / 4K (bitrate does not change the
  // price); Kling 3.0 takes 3 to 15 s, Cinema Studio 3 to 12 s. The button's figure is this table; the
  // exact price is still asked of Higgsfield and confirmed before anything is spent.
  const GEN_LIM = { seedance: [4, 30, [4, 10, 15, 20, 30]], kling: [3, 15, [3, 5, 10, 15]], cinema: [3, 12, [3, 5, 8, 12]] };
  const GEN_RES = [['480p', '480p', 3], ['720p', '720p', 7], ['1080p', '1080p', 16], ['4k', '4K', 28]];
  function genLim(c) { return GEN_LIM[genModel(c)[0]]; }
  function genDurOf(c) { const l = genLim(c); return clamp(Math.round(c.genDur || 5), l[0], l[1]); }
  function genRes(c) { return GEN_RES.find(r => r[0] === c.genRes) || GEN_RES[c.genMode === 'pro' ? 2 : 1]; }
  function genBit(c) { return c.genBit || (c.genMode === 'pro' ? 'high' : 'standard'); }
  const genSeed = c => genModel(c)[0] === 'seedance';
  function genQ(c) { return genSeed(c) ? genRes(c)[1] + (genBit(c) === 'high' ? ' · high bitrate' : '') : c.genMode === 'pro' ? 'Pro' : 'Standard'; }
  function genWhat(c) { const mv = MOVES.find(m => m[0] === c.move); return [mv ? mv[1] : '', genDurOf(c) + ' s', genModel(c)[1], genQ(c)].filter(Boolean).join(' · '); }
  function genCredits(c) { return +(genDurOf(c) * (genSeed(c) ? genRes(c)[2] : genModel(c)[c.genMode === 'pro' ? 4 : 3]) + (extOn(c) ? EXT_CR : 0)).toFixed(2); }
  // THE ANIMATE PANEL, ONE STATE AT A TIME (2026-11-17, by request: "confusing to use"). With no
  // job the panel is the form, and the one thing still missing is said beside the buttons. Once a
  // job exists the form gives way to a status card: what was asked for, where it stands, how long
  // it has been, and what happens when it lands. The server gives no percentage, so the bar is an
  // honest "busy" bar beside a running clock, never a made-up number.
  let JOBS = [];                    // the server's queue as last polled (every job, any project)
  const jobActive = j => j.status === 'queued' || j.status === 'working' || j.status === 'describe';
  // the tool waits 25 minutes at most, so a job still "working" after 40 has lost its worker (the server was restarted)
  const jobStale = j => j.status === 'working' && Date.now() / 1000 - (j.started || j.at || 0) > 2400;
  const jobSince = j => { const t0 = (j.status === 'working' && j.started) || j.at || 0, d = Math.max(0, Math.floor(Date.now() / 1000 - t0)); return !t0 ? '' : d < 3600 ? Math.floor(d / 60) + ':' + String(d % 60).padStart(2, '0') : d < 172800 ? Math.round(d / 3600) + ' h' : Math.round(d / 86400) + ' days'; };
  const jobStep = j => ({ extending: 'Nano Banana is extending the photo to ' + (P.size === '1x1' ? '1:1' : '9:16'), sending:'Sending the photo to Higgsfield', rendering: 'Higgsfield is rendering the clip', downloading: 'Downloading the finished clip' })[j.step] || 'Higgsfield is rendering the clip';
  function queueLine(id) {            // "2nd of 3 waiting · 1 generating"
    const w = JOBS.filter(j => j.status === 'queued').sort((a, b) => (a.at || 0) - (b.at || 0)), g = JOBS.filter(j => j.status === 'working' && !jobStale(j)).length;
    const i = w.findIndex(j => j.id === id), ord = n => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');
    return [i >= 0 ? (w.length > 1 ? ord(i + 1) + ' of ' + w.length + ' waiting' : 'The only one waiting') : '', g ? g + ' generating' : ''].filter(Boolean).join(' · ');
  }
  // THE RIGHT PANEL KEEPS ONLY WHAT THE TAKE DECK DOES NOT HAVE (2026-11-26, by request: "remove
  // anything here that is already on the horizontal window"). Move, model, length, quality,
  // Generate, the price, the progress and the queue are the deck's; here: extend, the prompt,
  // extra direction, people, and queueing it for Claude. Hidden while a job is in hand.
  function animHtml(it, sec, f, row) {
    const st = it.job && it.job.status;
    if (st === 'confirm' || st === 'working' || st === 'queued' || st === 'describe') return '';
    return sec('Animate this photo', 'set the move under the picture',

      (wideOf(it) ? row('<span title="A photo wider than the video is not cropped: Nano Banana 2.1 adds more of the scene above and below first (' + EXT_CR + ' credits). No crops it to the frame.">Extend to ' + (P.size === '1x1' ? '1:1' : '9:16') + '</span>', '<div class="vs-seg">' + [[1, 'Yes'], [0, 'No']].map(q => '<button data-gx="' + q[0] + '"' + ((extOn(it) ? 1 : 0) === q[0] ? ' data-on="1"' : '') + '>' + q[1] + '</button>').join('') + '</div>') : '') +
      promptBox(it) +
      f('Extra direction <s>optional</s>', '<input class="p-in" data-s="moveNote" value="' + esc(it.moveNote || '') + '" placeholder="Golden hour light">') +
      row('People in it', '<div class="vs-seg">' + [[0, 'No'], [1, 'Yes']].map(q => '<button data-gp="' + q[0] + '"' + ((it.people ? 1 : 0) === q[0] ? ' data-on="1"' : '') + '>' + q[1] + '</button>').join('') + '</div>') +
        '<button class="vs-link" id="animBtn" title="Costs nothing until you run /animate-photos in Claude, which works through the queue"' + (it.move ? '' : ' disabled') + '>Add it to the queue for Claude instead</button>');
  }
  // THE PROMPT (2026-11-19, by request: "bake this skill in CASV"). The prompt is the
  // photo-to-video-prompt framework's 14 sections. The studio fills them without seeing the photo
  // (promptFor); "Have Claude write it from the photo" queues a free describe job that
  // /animate-photos answers by reading the start frame and writing all 14 from what it sees.
  // Edits by hand are kept. Either kind is flagged, not dropped, when the move, length, size or
  // People change after it was written.
  let promptOpen = false, moreOpen = false, mvAll = false;
  const ACC = {};                      // which of the inspector's small accordions are open
  const acc = (key, title, meta, body) => '<details class="vs-pr" data-acc="' + key + '"' + (ACC[key] ? ' open' : '') + '><summary><b>' + title + '</b><s>' + (meta || '') + '</s>' + CHEV + '</summary><div class="vs-pr-b">' + body + '</div></details>';
  const pCount = p => p.length.toLocaleString() + ' of ' + PMAX.toLocaleString() + ' characters';
  function promptBox(it) {
    if (!it.move) return '';
    const by = it.genPromptBy, wait = !!it.descJob, p = promptOf(it), stale = by && it.genPromptFor && it.genPromptFor !== promptSig(it);
    const who = wait ? 'Claude is writing it' : by === 'claude' ? 'Written by Claude from the photo' : by === 'you' ? 'Edited by you' : 'The studio\'s template';
    const fw = String(it.genPromptFor || '').split('|'), fm = MOVES.find(m => m[0] === fw[0]);
    const err = it.descErr ? esc(it.descErr).replace(/`([^`]+)`/g, '<b>$1</b>') : '';
    return '<div class="vs-f vs-prw">' +
      (wait ? '<div class="vs-jl"><span>Claude is reading the photo and writing the prompt</span><time>about a minute</time></div><div class="vs-busy"><i></i></div>' +
          '<button class="vs-link" id="descCancel">Stop</button>'
        : '<button class="p-ghost p-sm" id="descBtn" title="Free. Claude looks at the photo (people, room, light, what can move) and writes the prompt from what it sees.">' + (by === 'claude' ? 'Have Claude write it again' : 'Have Claude write it from the photo') + '</button>' +
          '') +
      (err ? '<span class="vs-note vs-bad">Claude could not write it: ' + err + '</span>' : '') + '</div>' +
      '<details class="vs-pr" data-acc="prompt"' + (promptOpen ? ' open' : '') + '><summary><b>Prompt</b><s>' + who + '</s>' + CHEV + '</summary><div class="vs-pr-b">' +
      '<textarea class="p-in" id="genPrompt" rows="10" spellcheck="false" aria-label="Prompt"' + (wait ? ' disabled' : '') + '>' + esc(p) + '</textarea>' +
      '<span class="vs-note" id="genPromptN"' + (p.length > PMAX ? ' data-over="1"' : '') + '>' + pCount(p) + '</span>' +
      (stale ? '<span class="vs-note vs-bad">Written for ' + esc([fm ? fm[1] : '', fw[1] ? fw[1] + ' s' : '', fw[3] === '1' ? 'people' : ''].filter(Boolean).join(' · ')) + '. The settings have changed since: write it again, or it is used as it is.</span>' : '') +
      (by && !wait ? '<button class="vs-link" id="promptReset">Back to the studio\'s template</button>' : '') +
      '</div></details>';
  }
  // the start frame: the photo exactly as this clip frames it, at the video's size
  // (or, when it is extended first, whole and centred between the grey bands)
  function frameFor(c) {
    const m = media[c.mid], im = m && imgFor(m); if (!im || !im.complete || !im.naturalWidth) return null;
    const g = G(), k = document.createElement('canvas'); k.width = g.w; k.height = g.h;
    if (extOn(c)) {
      const x = k.getContext('2d'), b = extBox(c); x.fillStyle = EXT_GREY; x.fillRect(0, 0, g.w, g.h);
      x.drawImage(im, 0, b.y, g.w, b.h); return k.toDataURL('image/jpeg', .92);
    }
    const x = k.getContext('2d'); x.fillStyle = ART.ground; x.fillRect(0, 0, g.w, g.h);
    const fill = c.fit !== 'fit', sc = (fill ? Math.max(g.w / im.naturalWidth, g.h / im.naturalHeight) : Math.min(g.w / im.naturalWidth, g.h / im.naturalHeight)) * (c.z || 100) / 100;
    const dw = im.naturalWidth * sc, dh = im.naturalHeight * sc;
    x.drawImage(im, (g.w - dw) * (c.fx == null ? 50 : c.fx) / 100, (g.h - dh) * (c.fy == null ? 50 : c.fy) / 100, dw, dh);
    return k.toDataURL('image/jpeg', .92);
  }
  // what every job carries so Claude can write the prompt for exactly these settings
  const jobBase = (c, mv) => ({ name: media[c.mid].name, move: mv[1], move_phrase: mv[2], duration: genDurOf(c), resolution: genRes(c)[0], bitrate: genBit(c), aspect: P.size === '1x1' ? '1:1' : '9:16',
    note: String(c.moveNote || '').trim(), people: !!c.people, sig: promptSig(c), model: genModel(c)[2], mode: c.genMode === 'pro' ? 'pro' : 'std',
    extend: extOn(c) || undefined, ext: extOn(c) ? extBox(c) : undefined });
  async function descSend(c) {
    const mv = MOVES.find(x => x[0] === c.move); if (!media[c.mid] || !mv) return;
    const photo = frameFor(c); if (!photo) { toast('The photo is still loading. Try again in a moment.'); return; }
    const id = uid() + uid().slice(0, 3);
    try {
      const r = await api('/api/animate/job', Object.assign(jobBase(c, mv), { id, kind: 'describe', prompt: promptFor(c), photo }));
      if (r.error) throw new Error(r.error);
      // a server from before 2026-11-19 drops `kind` and files it as a video to generate: take it back off
      if (r.status !== 'describe') { await api('/api/animate/cancel', { id }).catch(() => {}); toast('The local server is an older copy. Restart it (python3 tools/video-dev/serve.py), then try again.'); return; }
      mark(); c.descJob = id; delete c.descErr;
      JOBS.push({ id, kind: 'describe', status: 'describe', name: media[c.mid].name, move: mv[1], duration: genDurOf(c), photo: id + '.jpg', at: Math.floor(Date.now() / 1000) });
      renderAll(); animWatch(); toast('Claude is reading the photo. The prompt comes back here in about a minute.');
    } catch (e) { toast('Could not reach the local server\'s animate queue (' + e.message + ').'); }
  }
  // the queue, in the Generate panel's Animate tab: every job still waiting or generating, whichever video it is for
  function queueHtml() {
    const all = JOBS.filter(jobActive).sort((a, b) => (a.status === 'working' ? 0 : 1) - (b.status === 'working' ? 0 : 1) || (a.at || 0) - (b.at || 0));
    const act = all.filter(jobClip), oth = all.filter(j => !jobClip(j)), stale = oth.filter(jobStale).length;
    if (!all.length) return '';
    const g = act.filter(j => j.status === 'working' && !jobStale(j)).length, w = act.filter(j => j.status === 'queued').length, dn = act.filter(j => j.status === 'describe').length, x = act.length - g - w - dn;
    const rowOf = j => { const c = jobClip(j); return (
        '<div class="vs-qr" data-st="' + j.status + '"' + (c ? ' data-qsel="' + c.id + '" role="button" tabindex="0" title="Show this clip"' : '') + '><i style="background-image:url(\'/_animate/' + esc(j.photo || '') + '\')"></i>' +
        '<span class="n"><b>' + esc((c && (media[c.mid] || {}).name) || j.name || 'Photo') + '</b><s>' + esc(j.move || '') + ' · ' + (j.duration || 5) + ' s</s>' +
        (j.status === 'working' && !jobStale(j) ? '<div class="vs-busy"><i></i></div>' : '') +
        '<s class="t"' + (jobStale(j) ? ' title="No result came back. It has probably stopped; remove it and generate again."' : '') + '>' + (jobStale(j) ? 'Stalled' : j.status === 'working' ? 'Generating' : j.status === 'describe' ? 'Claude is writing the prompt · free' : j.read ? 'Waiting · Claude writes the prompt first' : 'Waiting') + ' · <time data-since="' + j.id + '">' + jobSince(j) + '</time></s></span>' +
        '<span class="vs-mo" role="button" tabindex="0" data-qcancel="' + j.id + '" aria-label="Remove from the queue" title="Remove from the queue">' + ico('close') + '</span></div>'); };
    return '<div class="vs-sec" id="animQ">' + (act.length ? '<div class="vs-h"><b>Animating</b><s>' + [g ? g + ' generating' : '', w ? w + ' waiting' : '', dn ? dn + (dn === 1 ? ' prompt' : ' prompts') + ' being written' : '', x ? x + ' stalled' : ''].filter(Boolean).join(' · ') + '</s></div>' +
      act.map(rowOf).join('') +
      (w ? '<span class="vs-note">Waiting clips start when you run <b>/animate-photos</b> in Claude, or press <b>Generate</b> on the photo.</span>' : '') : '') +
      (oth.length ? acc('qoth', 'Other videos', oth.length + (oth.length === 1 ? ' job' : ' jobs') + (stale ? ' · ' + stale + ' stalled' : ''), oth.map(rowOf).join('') +
        (stale ? '<div class="vs-acts"><button class="p-ghost p-sm" id="qClear" title="Remove every stalled job that is not in this video. Nothing is refunded or charged.">Clear ' + stale + ' stalled</button></div>' : '')) : '') + '</div>';
  }
  setInterval(() => { document.querySelectorAll('time[data-since]').forEach(t => { const j = JOBS.find(x => x.id === t.dataset.since); if (j) t.textContent = jobSince(j); }); barTick(); }, 1000);
  // ── THE GENERATION STRIP (2026-11-26, by request): under the picture, the selected photo's
  // Higgsfield settings in one row with its Generate button, the running job's progress and time,
  // and this video's queue. It drives the same job as the Generate tab (animSend, animRun,
  // animCancel), so the price is still asked for and confirmed before anything is spent.
  // Higgsfield reports no percentage: the bar is the time so far against how long that model has
  // taken on this computer (the median of its finished jobs), and it never claims to be done.
  const EST0 = { seedance_2_5: 200, kling3_0: 160, cinematic_studio_video_v2: 150 };
  function jobEst(j) {
    const ds = JOBS.filter(x => x.model === j.model && x.started && x.done_at && x.done_at > x.started).map(x => x.done_at - x.started).sort((a, b) => a - b);
    return Math.max(30, ds.length >= 3 ? ds[ds.length >> 1] : EST0[j.model] || 180);
  }
  const mmss = d => Math.floor(d / 60) + ':' + String(Math.floor(d % 60)).padStart(2, '0');
  function jobProg(j) {                // { pct, txt } for a job that is generating
    const t = Math.max(0, Date.now() / 1000 - (j.started || j.at || Date.now() / 1000)), e = jobEst(j);
    const pct = t <= e * .9 ? t / e * 100 : Math.min(99, 90 + 9 * (1 - Math.exp(-(t - e * .9) / e)));
    return { pct, txt: mmss(t) + (t <= e ? ' of about ' + mmss(e) : ' · taking longer than usual') };
  }
  const barSel = () => { const it = sel && sel.kind === 'clip' && find(sel), m = it && media[it.mid]; return m && m.kind === 'image' ? it : null; };
  const barSj = it => it && it.job && (JOBS.find(x => x.id === it.job.id) || it.job);
  // THE TAKE DECK (2026-11-26, /impeccable redesign). A console card floating on the stage under
  // the picture. Its thumbnail PLAYS the chosen camera move on this photo (the move tiles' own
  // keyframes), so the take is seen before credits are spent. One row: the take (preview, name,
  // what it will be), the settings as labelled pills, one navy action. The same card becomes the
  // confirmation, then the progress band, without moving. The queue sits at the deck's end as
  // 9:16 tiles that fill from below while they render. Folds to one line (per computer).
  let deckFold = false; try { deckFold = localStorage.getItem('provident-video-deck') === 'fold'; } catch (e) {}
  const FOLD = '<button class="vs-dk-fold" data-gba="fold" aria-expanded="' + '{X}' + '" aria-label="{L}" title="{L}">' + CHEV + '</button>';
  function barHtml() {
    const it = barSel(), q = JOBS.filter(j => jobClip(j) && (jobActive(j) || j.status === 'failed')).sort((a, b) => (a.at || 0) - (b.at || 0));
    if (!it && !q.length) return '';
    const fold = FOLD.replace('{X}', deckFold ? 'false' : 'true').replace(/\{L\}/g, deckFold ? 'Show the generation deck' : 'Fold the generation deck to one line');
    const m = it && media[it.mid], j = it && it.job, st = j && j.status, sj = it && barSj(it);
    const mv = it && MOVES.find(x => x[0] === it.move), photo = m ? (m.url || m.poster) : '';
    const what = it ? [mv ? mv[1] : '', genDurOf(it) + ' s', genModel(it)[1], genQ(it)].filter(Boolean).join(' · ') : '';
    const wk = q.filter(x => x.status === 'working' && !jobStale(x)), stale = q.filter(jobStale).length;
    if (deckFold) {                     // one line: what is happening, and how far along
      const lead = it && st === 'working' ? jobProg(sj) : wk[0] ? jobProg(wk[0]) : null, who = it && st === 'working' ? m.name : wk[0] ? ((jobClip(wk[0]) && (media[jobClip(wk[0]).mid] || {}).name) || wk[0].name) : '';
      return '<div class="vs-dk-line">' + (lead ? '<span class="vs-dk-dot" data-s="run"></span><b>Generating</b><span class="vs-dk-who">' + esc(who) + '</span><span class="vs-dk-mini"><i data-gbp="' + (it && st === 'working' ? j.id : wk[0].id) + '" style="transform:scaleX(' + (lead.pct / 100).toFixed(3) + ')"></i></span><time data-gbt="' + (it && st === 'working' ? j.id : wk[0].id) + '">' + lead.txt + '</time>'
        : it ? '<b>' + esc(m.name) + '</b><span class="vs-dk-who">' + esc(mv ? what : 'Choose a camera move to animate it') + '</span>' : '<b>Queue</b>') +
        (q.length ? '<span class="vs-dk-n">' + q.length + (q.length === 1 ? ' in the queue' : ' in the queue') + '</span>' : '') + fold + '</div>';
    }
    let h = '';
    if (it) {
      const pv = '<span class="vs-dk-pv' + (mv ? '' : ' is-still') + '" aria-hidden="true"><u' + (mv ? ' data-m="' + mv[0] + '"' : '') + ' style="background-image:url(\'' + photo + '\');background-position:' + (it.fx == null ? 50 : it.fx) + '% ' + (it.fy == null ? 50 : it.fy) + '%"></u></span>';
      const head = (sub, cls) => '<div class="vs-dk-id"><b title="' + esc(m.name) + '">' + esc(m.name) + '</b><span' + (cls ? ' class="' + cls + '"' : '') + '>' + sub + '</span></div>';
      h += '<div class="vs-dk-take" data-st="' + (st === 'working' ? 'run' : st === 'confirm' ? 'ask' : st === 'queued' || st === 'describe' ? 'wait' : 'set') + '">' + pv;
      if (st === 'working') {
        const pr = jobProg(sj), tx = pr.txt.split(' '), t0 = tx[0], rest = pr.txt.slice(t0.length).replace(/^ of /, 'of ').replace(/^ · /, '');
        h += '<div class="vs-dk-run">' + head(esc(jobStep(sj)) + ' · ' + esc(what)) +
          '<div class="vs-dk-track" role="progressbar" aria-label="Generating ' + esc(m.name) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(pr.pct) + '"><i data-gbp="' + j.id + '" style="transform:scaleX(' + (pr.pct / 100).toFixed(3) + ')"></i></div>' +
          '<div class="vs-dk-clock"><time data-gbt="' + j.id + '" data-part="t">' + t0 + '</time><span data-gbt="' + j.id + '" data-part="r">' + esc(rest) + '</span></div></div>' +
          '<div class="vs-dk-acts"><button class="vs-dk-q" data-gba="cancel" title="Stops waiting for this clip here. Higgsfield may already have charged for it.">Stop waiting</button></div>';
      } else if (st === 'confirm') {
        h += head('This comes out of your Higgsfield balance. Nothing has been spent yet.') .replace('<b ', '<b data-ask="1" ').replace('>' + esc(m.name) + '</b>', '>Spend ' + (j.credits == null ? 'credits' : j.credits + ' credits') + ' on this take?</b>') +
          '<div class="vs-dk-acts"><button class="p-ghost" data-gba="cancel">Cancel</button><button class="p-btn" data-gba="go">Generate' + (j.credits == null ? '' : ' · ' + j.credits + ' credits') + '</button></div>';
      } else if (st === 'queued' || st === 'describe') {
        h += head((st === 'describe' ? 'Claude is writing the prompt' : 'Waiting in the queue for /animate-photos in Claude') + ' · <time data-since="' + j.id + '">' + jobSince(sj) + '</time>') +
          '<div class="vs-dk-acts"><button class="vs-dk-q" data-gba="cancel">Take it off the queue</button></div>';
      } else {
        const opt = (v, l, on) => '<option value="' + v + '"' + (on ? ' selected' : '') + '>' + l + '</option>', lim = genLim(it), d = genDurOf(it);
        const pill = (k, lab, inner) => '<label class="vs-dk-pill" data-k="' + k + '"><span>' + lab + '</span>' + inner + '</label>';
        const sel2 = (k, lab, opts) => pill(k, lab, '<select data-gbs="' + k + '" aria-label="' + lab + '">' + opts + '</select>' + CHEV);
        h += head(st === 'failed' ? 'That take did not work: ' + esc(j.error || 'no reason was given') + '. Change anything and try again.' : mv ? esc(what) : 'Choose a camera move to see it play here', st === 'failed' ? 'is-bad' : '') +
          '<div class="vs-dk-set">' +
          sel2('move', 'Move', (it.move ? '' : '<option value="" selected disabled>Choose</option>') + MOVES.map(x => opt(x[0], x[1], it.move === x[0])).join('')) +
          sel2('model', 'Model', GEN_MODELS.map(x => opt(x[0], x[1], genModel(it)[0] === x[0])).join('')) +
          pill('dur', 'Length', '<input type="range" data-gbs="dur" min="' + lim[0] + '" max="' + lim[1] + '" step="1" value="' + d + '" aria-label="Length in seconds"><b data-gbo="1">' + d + ' s</b>') +
          sel2('q', 'Quality', genSeed(it) ? GEN_RES.map(x => opt(x[0], x[1], genRes(it)[0] === x[0])).join('') : opt('std', 'Standard', (it.genMode || 'std') === 'std') + opt('pro', 'Pro', it.genMode === 'pro')) +
          '</div><div class="vs-dk-acts"><button class="p-btn vs-gb-go" data-gba="now"' + (it.move && !it.descJob ? '' : ' disabled') + '>' + (st === 'failed' ? 'Try again' : 'Generate') + (it.move ? ' · ' + genCredits(it) + ' credits' : '') + '</button></div>';
      }
      h += '</div>';
    } else h += '<div class="vs-dk-take" data-st="none"><div class="vs-dk-id"><b>Generating for this video</b><span>Select a photo clip to set up its take.</span></div></div>';
    if (q.length) {
      h += '<div class="vs-dk-queue" role="list" aria-label="This video\'s queue"><span class="vs-dk-qh">Queue <s>' + q.length + '</s></span><div class="vs-dk-tiles">' + q.map(x => {
        const c = jobClip(x), w = x.status === 'working' && !jobStale(x), pr = w ? jobProg(x) : null, s2 = jobStale(x) ? 'stale' : x.status;
        const lab = s2 === 'stale' ? 'Stalled' : w ? pr.txt.split(' ')[0] : s2 === 'failed' ? 'Failed' : s2 === 'describe' ? 'Prompt' : 'Waiting';
        const cm = c && media[c.mid], img = (cm && (cm.poster || cm.url)) || (x.photo ? '/_animate/' + x.photo : '');
        return '<button class="vs-dk-tile" role="listitem" data-st="' + s2 + '"' + (c ? ' data-gbc="' + c.id + '"' : '') + (sel && c && sel.id === c.id ? ' aria-current="true"' : '') + ' title="' + esc(((cm && cm.name) || x.name || 'Photo') + ' · ' + (x.move || '') + ' · ' + (x.duration || 5) + ' s · ' + lab) + '">' +
          '<i style="background-image:url(\'' + esc(img) + '\')">' + (w ? '<em data-gbp="' + x.id + '" style="transform:scaleY(' + (pr.pct / 100).toFixed(3) + ')"></em>' : '') + '</i><span>' + lab + '</span></button>';
      }).join('') + '</div>' + (stale ? '<button class="vs-dk-q" data-gba="clear">Clear ' + stale + ' stalled</button>' : '') + '</div>';
    }
    return '<div class="vs-dk-body">' + h + '</div>' + fold;
  }
  let barShown = null;
  function renderBar() {
    const b = $('#genBar'); if (!b) return;
    if (b.contains(document.activeElement) && document.activeElement.matches('input[type=range]')) return;   // not while its slider is held
    const h = barHtml();
    if (b._h !== h) { b._h = h; b.innerHTML = h; }
    const on = !!h; b.hidden = !on; b.toggleAttribute('data-fold', deckFold);
    if (barShown !== on + '' + deckFold) { barShown = on + '' + deckFold; fitCanvas(); }
  }
  function barTick() {
    document.querySelectorAll('#genBar [data-gbp]').forEach(el => { const j = JOBS.find(x => x.id === el.dataset.gbp); if (j) el.style.transform = (el.tagName === 'EM' ? 'scaleY(' : 'scaleX(') + (jobProg(j).pct / 100).toFixed(3) + ')'; });
    document.querySelectorAll('#genBar [data-gbt]').forEach(el => { const j = JOBS.find(x => x.id === el.dataset.gbt); if (!j) return; const t = jobProg(j).txt, t0 = t.split(' ')[0];
      el.textContent = el.dataset.part === 't' ? t0 : el.dataset.part === 'r' ? t.slice(t0.length).replace(/^ of /, 'of ').replace(/^ · /, '') : t; });
    document.querySelectorAll('#genBar .vs-dk-tile[data-st=working] span').forEach(el => { const c = el.closest('[data-gbc]'), it = c && P.clips.find(x => x.id === c.dataset.gbc), j = it && it.job && JOBS.find(x => x.id === it.job.id); if (j) el.textContent = jobProg(j).txt.split(' ')[0]; });
  }
  { const b = $('#genBar');
    b.addEventListener('change', e => {
      const it = barSel(), k = e.target.dataset.gbs; if (!it || !k || k === 'dur') return;
      mark(); const v = e.target.value;
      if (k === 'move') it.move = v;
      else if (k === 'model') { it.genModel = v; it.genDur = genDurOf(it); }
      else if (k === 'q') { if (genSeed(it)) { it.genRes = v; it.genMode = /1080p|4k/.test(v) ? 'pro' : 'std'; } else { it.genMode = v; delete it.genRes; delete it.genBit; } }
      renderAll();
    });
    b.addEventListener('pointerdown', e => { if (e.target.matches('input[type=range]')) mark(); });
    b.addEventListener('input', e => {
      const it = barSel(); if (!it || e.target.dataset.gbs !== 'dur') return;
      it.genDur = +e.target.value; const o = b.querySelector('[data-gbo]'), g = b.querySelector('.vs-gb-go');
      if (o) o.textContent = it.genDur + ' s'; if (g && !g.disabled) g.textContent = g.textContent.split(' · ')[0] + ' · ' + genCredits(it) + ' credits';
      const sub = b.querySelector('.vs-dk-id span'); if (sub && it.move) sub.textContent = genWhat(it);
      dirty = true; save();
    });
    b.addEventListener('change', e => { if (e.target.dataset.gbs === 'dur') { e.target.blur(); renderAll(); } });
    b.addEventListener('click', e => {
      const c = e.target.closest('[data-gbc]');
      if (c) { const it = P.clips.find(x => x.id === c.dataset.gbc); if (!it) return; multi.clear(); sel = { kind: 'clip', id: it.id }; rtab = 'sel'; if (playing) pause(); seek(clipStarts()[P.clips.indexOf(it)] || 0); renderAll(); return; }
      const a = e.target.closest('[data-gba]'); if (!a) return;
      const it = barSel(), k = a.dataset.gba;
      if (k === 'fold') { deckFold = !deckFold; try { localStorage.setItem('provident-video-deck', deckFold ? 'fold' : 'open'); } catch (x) {} b._h = ''; renderBar(); fitCanvas(); const f = b.querySelector('[data-gba=fold]'); if (f) f.focus(); return; }
      if (k === 'clear') { const ids = JOBS.filter(j => jobClip(j) && jobStale(j)).map(j => j.id); Promise.all(ids.map(id => api('/api/animate/cancel', { id }).catch(() => {}))).then(() => { JOBS = JOBS.filter(j => ids.indexOf(j.id) < 0); P.clips.forEach(x => { if (x.job && ids.indexOf(x.job.id) >= 0) delete x.job; }); renderAll(); }); return; }
      if (!it) return;
      if (k === 'now') return animSend(it, true);
      if (k === 'go') return animRun(it);
      if (k === 'cancel') return animCancel(it);
    });
  }
  // a finished clip nobody on this timeline is waiting for (the photo was deleted, another video
  // asked for it, the page was closed) still comes home: into Your media, once per browser
  const GOTKEY = 'provident-video-anim-got';
  let GOT = {}; try { GOT = JSON.parse(localStorage.getItem(GOTKEY)) || {}; } catch (e) {}
  // ── THE HIGGSFIELD LIBRARY (2026-11-19): a pop-up of the account's finished videos, to play and
  // import. The local server lists them with Higgsfield's own tool (free, read-only) and fetches a
  // chosen file; the page never talks to Higgsfield except to show a thumbnail and play a preview.
  const HFL = { open: false, items: null, err: '', busy: false, more: false, size: 24, f: 'all', pick: new Set(), cur: null, imp: '' }, HFKEY = 'provident-video-hf';
  let HFGOT = {}; try { HFGOT = JSON.parse(localStorage.getItem(HFKEY) || '{}'); } catch (e) {}
  const hfAsp = x => x.aspect || (x.w && x.h ? (x.w === x.h ? '1:1' : x.w < x.h ? '9:16' : '16:9') : '');
  const hfWhen = x => { const d = new Date(x.at); return isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); };
  const hfHas = x => ownV(media[HFGOT[x.id]]);
  const hfShown = () => (HFL.items || []).filter(x => HFL.f === 'all' || hfAsp(x) === HFL.f);
  // CLAUDE MOTION (2026-11-26, by request): a CM film's link has no video in it; the file comes from
  // the film's own Export. "Or bring one from Claude Motion" takes the link, opens the film in a new
  // tab and waits: the helper reports video files landing in ~/Downloads (/api/cm/wait), and the
  // first one there after the film opened, its size steady, comes in as a motion graphic carrying
  // its link (`cm`). Its inspector then has Open in Claude Motion and Update from Claude Motion (the
  // new export replaces it wherever it sits). A file dropped on the tab while waiting counts too.
  let CMW = null;                              // { url, rep, since (s), t0, last: {name: size} }
  const CM_RE = /^https:\/\/claude\.ai\/(code\/)?artifact\/[A-Za-z0-9_-]{8,}/;
  function cmWaitHtml() {
    const s = Math.round((Date.now() - CMW.t0) / 1000);
    return '<div class="vs-cmw" role="status"><b>' + (CMW.rep ? 'Waiting for the new export' : 'Waiting for Claude Motion') + ' <s>' + Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2) + '</s></b>' +
      (CMW.msg ? '<span data-bad="1">' + esc(CMW.msg) + '</span>' : '<span>In the film’s tab press the download arrow (Export) and choose <b>MOV (overlay)</b> for a transparent background, or MP4. CASV adds the file when it lands in Downloads.</span>') +
      '<span class="vs-cmw-a"><a class="vs-link" href="' + esc(CMW.url) + '" target="_blank" rel="noopener">Open the film again</a><button class="vs-link" data-cmx="1">Stop waiting</button></span></div>';
  }
  async function cmStart(url, rep) {
    if (!url) {
      const v = await ask('From Claude Motion', 'Paste the film’s link (claude.ai/artifact/…). It opens in a new tab; Export it there and CASV brings the file in by itself.', 'Open the film', '');
      url = v && String(v).trim(); if (!url) return;
      if (!CM_RE.test(url)) { toast('That is not a Claude Motion link. It starts with https://claude.ai/artifact/'); return; }
    }
    window.open(url, '_blank', 'noopener');
    CMW = { url, rep: rep || '', since: Date.now() / 1000, t0: Date.now(), last: {}, msg: '' };
    tab = 'logos'; renderAll(); cmTick();
  }
  function cmStop() { if (CMW) clearTimeout(CMW.tm); CMW = null; }
  async function cmTick() {
    const w = CMW; if (!w) return;
    if (Date.now() - w.t0 > 20 * 60e3) { cmStop(); toast('Stopped waiting for Claude Motion after 20 minutes. Drop the exported file here instead.'); renderLib(); return; }
    try {
      const r = await fetch('/api/cm/wait?since=' + w.since, { cache: 'no-store' }), j = await r.json();
      w.msg = r.ok ? '' : (j.error || 'CASV could not look in Downloads.');
      const f = r.ok && !j.busy && (j.files || [])[0];
      if (f && w.last[f.name] === f.size && f.size > 0) {          // the same size twice: the download is done
        const b = await (await fetch('/api/cm/file?name=' + encodeURIComponent(f.name), { cache: 'no-store' })).blob();
        if (CMW !== w) return;
        await addFiles([new File([b], f.name, { type: b.type })], w.rep ? 'cmrep' : 'logo');
        return;
      }
      if (f) w.last[f.name] = f.size;
    } catch (e) { w.msg = 'CASV’s helper did not answer. Is it still running?'; }
    if (CMW !== w) return;
    const box = document.querySelector('.vs-cmw'); if (box && tab === 'logos') box.outerHTML = cmWaitHtml();
    w.tm = setTimeout(cmTick, 2000);
  }
  function hfOpen() { HFL.open = true; HFL.pick.clear(); HFL.imp = ''; $('#hfOv').dataset.on = '1'; if (playing) pause(); hfRender(); hfLoad(); $('#hfX').focus(); }
  function hfClose() { if (HFL.imp) return; HFL.open = false; delete $('#hfOv').dataset.on; $('#hfP').innerHTML = ''; }
  async function hfLoad() {
    HFL.busy = true; hfRender();
    try { const r = await api('/api/hf/list?size=' + HFL.size); if (r.error) HFL.err = r.error; else { HFL.items = r.items || []; HFL.more = !!r.more; HFL.err = ''; } }
    catch (e) { HFL.err = 'off'; }
    HFL.busy = false; if (HFL.open) hfRender();
  }
  function hfRender() {
    const none = (t, b) => '<div class="vs-none"><b>' + t + '</b>' + b + '</div>', v = hfShown();
    $('#hfF').innerHTML = [['all', 'All'], ['9:16', '9:16'], ['1:1', '1:1']].map(o => '<button data-hff="' + o[0] + '"' + (HFL.f === o[0] ? ' data-on="1"' : '') + ' aria-pressed="' + (HFL.f === o[0]) + '">' + o[1] + '</button>').join('');
    let g;
    if (HFL.err === 'off') g = none('The local server is not running', 'The library is read through the Video Studio server on this computer. Start it, then open this again.');
    else if (HFL.err === 'signin') g = none('Higgsfield is not signed in on this computer', 'Run <b>higgsfield auth login</b> in Terminal once, then open this again.');
    else if (HFL.err) g = none('Higgsfield did not answer', esc(HFL.err));
    else if (!HFL.items) g = none('Asking Higgsfield for your videos…', 'This takes a few seconds.');
    else if (!v.length) g = none(HFL.items.length ? 'No ' + HFL.f + ' videos here' : 'No finished videos yet', HFL.items.length ? 'Choose All to see the other sizes.' : 'Videos you generate on Higgsfield appear here.');
    else g = v.map(x => '<div class="vs-hft"' + (HFL.cur === x.id ? ' data-on="1"' : '') + '><button class="pv" data-hfpv="' + x.id + '" aria-label="Play ' + esc(x.model) + ', ' + esc(hfWhen(x)) + '"><img loading="lazy" alt="" data-src="' + esc(x.thumb) + '"></button>' +
        '<button class="ck" data-hfck="' + x.id + '" aria-pressed="' + HFL.pick.has(x.id) + '" aria-label="Select to import" title="Select to import"></button>' +
        '<s>' + [x.seconds ? x.seconds + ' s' : '', hfAsp(x)].filter(Boolean).join(' · ') + '<em>' + (hfHas(x) ? 'Imported' : esc(hfWhen(x))) + '</em></s></div>').join('') +
      (HFL.more ? '<div class="vs-hf-more"><button class="p-ghost p-sm" id="hfMore"' + (HFL.busy ? ' disabled' : '') + '>' + (HFL.busy ? 'Loading…' : 'Load more') + '</button></div>' : '');
    $('#hfG').innerHTML = g;
    $('#hfG').querySelectorAll('img[data-src]').forEach(i => { if (i.dataset.src) i.src = i.dataset.src; });
    hfFoot();
  }
  function hfIds() { return HFL.pick.size ? [...HFL.pick] : HFL.cur ? [HFL.cur] : []; }
  function hfFoot() {
    const n = hfIds().length;
    $('#hfN').textContent = HFL.imp || (n ? n + (n === 1 ? ' video chosen' : ' videos chosen') : HFL.items && HFL.items.length ? 'Click a video to play it. Tick several to import them together.' : '');
    $('#hfAdd').disabled = $('#hfAddT').disabled = !n || !!HFL.imp;
    $('#hfAdd').textContent = n > 1 ? 'Import ' + n : 'Import';
  }
  function hfShow(id) {
    const x = (HFL.items || []).find(q => q.id === id); HFL.cur = x ? id : null;
    $('#hfG').querySelectorAll('.vs-hft').forEach(t => { if (t.querySelector('.pv').dataset.hfpv === HFL.cur) t.dataset.on = '1'; else delete t.dataset.on; });
    const p = $('#hfP'); p.innerHTML = '';
    if (x) {
      const vd = document.createElement('video'); vd.controls = true; vd.loop = true; vd.playsInline = true; vd.autoplay = true; vd.src = x.url; p.appendChild(vd);
      const d = document.createElement('div');
      d.innerHTML = '<b>' + esc(x.model) + '</b><p>' + [hfWhen(x), x.seconds ? x.seconds + ' s' : '', hfAsp(x), x.w && x.h ? x.w + ' × ' + x.h : ''].filter(Boolean).map(esc).join(' · ') + (hfHas(x) ? ' · already in Media' : '') + '</p>' +
        (x.prompt ? '<p class="q">' + esc(x.prompt.replace(/\s+/g, ' ').slice(0, 220)) + (x.prompt.length > 220 ? '…' : '') + '</p>' : '');
      p.appendChild(d);
    }
    hfFoot();
  }
  async function hfImport(toTimeline) {
    const ids = hfIds(); if (!ids.length || HFL.imp) return;
    const pv = $('#hfP video'); if (pv) pv.pause();
    let ok = 0, marked = false; const bad = [];
    for (let i = 0; i < ids.length; i++) {
      const x = HFL.items.find(q => q.id === ids[i]); if (!x) continue;
      HFL.imp = 'Importing ' + (i + 1) + ' of ' + ids.length + '…'; hfFoot();
      try {
        let rec = media[HFGOT[x.id]];          // already in this video: use it again, never a second copy
        if (rec && !ownV(rec)) { const o = rec; rec = { id: uid(), kind: o.kind, name: o.name, blob: o.blob }; await probe(rec); media[rec.id] = rec; DB.put(dbRec(rec)); HFGOT[x.id] = rec.id; try { localStorage.setItem(HFKEY, JSON.stringify(HFGOT)); } catch (e) {} }
        if (!rec) {
          const r = await fetch('/api/hf/file?id=' + x.id); if (!r.ok) throw new Error('download');
          const blob = await r.blob(), ext = (blob.type.split('/')[1] || 'mp4').replace('quicktime', 'mov');
          rec = { id: uid(), kind: 'video', name: x.model + ' · ' + hfWhen(x), blob: new File([blob], 'higgsfield-' + x.id.slice(0, 8) + '.' + ext, { type: blob.type || 'video/mp4' }) };
          await probe(rec); media[rec.id] = rec; DB.put(dbRec(rec));
          if (P.casBg) (P.casBg.media = P.casBg.media || []).push(rec.id);
          HFGOT[x.id] = rec.id; try { localStorage.setItem(HFKEY, JSON.stringify(HFGOT)); } catch (e) {}
        }
        if (toTimeline) { if (!marked) { mark(); marked = true; } addClip(rec.id, true); }
        ok++;
      } catch (e) { bad.push(x.model); }
    }
    HFL.imp = ''; HFL.pick.clear();
    if (ok) { tab = 'media'; hfClose(); renderAll(); toast(ok + (ok === 1 ? ' video' : ' videos') + (toTimeline ? ' added to the timeline.' : ' imported into Media.') + (bad.length ? ' ' + bad.length + ' could not be downloaded.' : '')); }
    else { hfRender(); toast('The video could not be downloaded. Check the local server and try again.'); }
  }
  $('#hfX').innerHTML = ico('close');
  $('#hfX').addEventListener('click', hfClose);
  $('#hfOv').addEventListener('pointerdown', e => { if (e.target === e.currentTarget) hfClose(); });
  $('#hfOv').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.hff) { HFL.f = b.dataset.hff; hfRender(); }
    else if (b.dataset.hfck) { const id = b.dataset.hfck; if (HFL.pick.has(id)) HFL.pick.delete(id); else HFL.pick.add(id); b.setAttribute('aria-pressed', HFL.pick.has(id)); hfFoot(); }
    else if (b.dataset.hfpv) hfShow(b.dataset.hfpv);
    else if (b.id === 'hfMore') { HFL.size = Math.min(120, HFL.size + 24); hfLoad(); }
    else if (b.id === 'hfAdd') hfImport(false);
    else if (b.id === 'hfAddT') hfImport(true);
  });
  async function jobToMedia(j) {
    const blob = await (await fetch('/_animate/' + j.video)).blob();
    const rec = { id: uid(), kind: 'video', name: (j.name || 'Photo') + ' · ' + (j.move || 'animated'), blob: new File([blob], j.video, { type: 'video/mp4' }) };
    await probe(rec); media[rec.id] = rec; DB.put(dbRec(rec));
    if (P.casBg) (P.casBg.media = P.casBg.media || []).push(rec.id);
    GOT[j.id] = 1; try { localStorage.setItem(GOTKEY, JSON.stringify(GOT)); } catch (e) {}
    return rec;
  }
  async function animSend(c, now) {
    const m = media[c.mid], mv = MOVES.find(x => x[0] === c.move); if (!m || !mv) return;
    const photo = frameFor(c); if (!photo) { toast('The photo is still loading. Try again in a moment.'); return; }
    const id = uid() + uid().slice(0, 3), prompt = promptOf(c);
    if (prompt.length > PMAX) { toast('The prompt is ' + prompt.length + ' characters; Higgsfield takes ' + PMAX + '. Shorten it under Prompt.'); return; }
    try {
      // queued for Claude with the studio's template: Claude reads the photo and writes the prompt first (read)
      const r = await api('/api/animate/job', Object.assign(jobBase(c, mv), { id, prompt, read: !now && !c.genPromptBy, photo }));
      if (r.error) throw new Error(r.error);
      mark(); c.job = { id, status: 'queued' }; JOBS.push({ id, status: 'queued', name: m.name, move: mv[1], duration: genDurOf(c), photo: id + '.jpg', at: Math.floor(Date.now() / 1000) }); renderAll();
      if (!now) { animWatch(); toast('Added to the queue. Run /animate-photos in Claude to generate it.'); return; }
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
      const sj = JOBS.find(x => x.id === c.job.id); if (sj) Object.assign(sj, { status: 'working', started: Math.floor(Date.now() / 1000) });
      c.job = { id: c.job.id, status: 'working' }; renderAll(); animWatch();
    } catch (e) { toast('Could not start the generation (' + e.message + ').'); }
  }
  async function animCancel(c) {
    if (!c.job) return;
    try { await api('/api/animate/cancel', { id: c.job.id }); } catch (e) {}
    JOBS = JOBS.filter(j => j.id !== c.job.id); delete c.job; renderAll();
  }
  let animT = 0, animSig = '';
  function animWatch() {              // fast while anything is waiting or generating, slow otherwise (CAS or Claude may add a job)
    clearTimeout(animT);
    const busy = JOBS.some(jobActive) || P.clips.some(c => c.job && (c.job.status === 'queued' || c.job.status === 'working'));
    animT = setTimeout(animPoll, busy ? 4000 : 20000);
  }
  async function animPoll() {
    let jobs = [];
    try { jobs = (await api('/api/animate/jobs')).jobs || []; } catch (e) { return animWatch(); }
    JOBS = jobs.filter(j => j && j.id);
    let changed = false; const mine = {};
    for (const c of P.clips) {
      if (!c.job) continue; mine[c.job.id] = 1;
      if (c.job.status === 'failed') continue;
      const j = JOBS.find(x => x.id === c.job.id);
      if (!j) { delete c.job; changed = true; continue; }                   // taken off the queue elsewhere
      if (j.status === 'done' && j.video) {
        try {
          const rec = await jobToMedia(j);
          // the video takes the photo's place on the timeline, whole and unreframed (it was generated at this size);
          // a clip from a script keeps its scene's length, so the voiceover and texts stay on their cues
          const was = clipLen(c);
          delete c.rate; Object.assign(c, { mid: rec.id, in: 0, out: c.sc ? Math.min(rec.dur, was) : rec.dur, fit: 'fill', z: 100, fx: 50, fy: 50, mute: false });   // generated with natural sound, so it plays
          delete c.job; changed = true;
          api('/api/animate/placed', { id: j.id }).catch(() => {});
          toast('The animated clip is on the timeline and in Your media.');
        } catch (e) { c.job = { id: j.id, status: 'failed', error: 'the finished video could not be loaded' }; changed = true; }
      } else if (j.status !== c.job.status && !(c.job.status === 'confirm' && j.status === 'queued')) {
        c.job = j.status === 'failed' ? { id: j.id, status: 'failed', error: j.error } : { id: j.id, status: j.status }; changed = true;
      }
    }
    // a prompt Claude wrote from the photo comes back to its clip; the describe job is then cleared
    for (const c of P.clips) {
      if (!c.descJob) continue;
      const j = JOBS.find(x => x.id === c.descJob);
      if (!j) { delete c.descJob; changed = true; continue; }                // taken off the queue elsewhere
      if (j.status === 'described' && j.prompt) {
        Object.assign(c, { genPrompt: j.prompt, genPromptBy: 'claude', genPromptFor: j.sig || promptSig(c) }); delete c.descJob; delete c.descErr; changed = true; promptOpen = true;
        api('/api/animate/cancel', { id: j.id }).catch(() => {}); toast('Claude wrote the prompt from the photo.');
      } else if (j.status === 'failed') {
        c.descErr = j.error || 'no reason was given'; delete c.descJob; changed = true; api('/api/animate/cancel', { id: j.id }).catch(() => {});
      }
    }
    let got = 0;
    for (const j of JOBS) {
      if (j.status !== 'done' || !j.video || mine[j.id] || GOT[j.id]) continue;
      try { await jobToMedia(j); got++; } catch (e) { GOT[j.id] = 1; }      // a file that will not load is not asked for again
    }
    if (got) { changed = true; toast(got === 1 ? 'A finished clip was added to Your media.' : got + ' finished clips were added to Your media.'); }
    const sig = JOBS.filter(jobActive).map(j => j.id + j.status + (j.step || '')).join();
    if (changed) renderAll(); else if (sig !== animSig) { renderGen(); if (sel && sel.kind === 'clip' && rtab !== 'gen') renderInspector(); }
    animSig = sig;
    animWatch();
  }

  // ── START FROM A SCRIPT (2026-11-19, by request) ─────────────────────────────────────
  // The video-script skill writes a Markdown file: a header (Format, Total length, Music mood,
  // End card), Table 1 (# | Time | Voiceover | On-screen text) and Table 2, the image map
  // (# | Time | Scene | Image | PDF file | Page | Treatment). This turns it into a first cut: one
  // still per brochure page, cut to the scene's time and framed from the treatment's crop words,
  // its camera move chosen (nothing is queued or spent), the on-screen lines as texts, the end
  // card, the voiceover script and music mood filled into the Generate panel, and every
  // [NEED: …] kept visible. The pages are rendered here with pdf.js (vendor/pdfjs, 3.11.174).
  // The words come from the script verbatim; CASV writes none of its own.
  const NEEDRX = /\[NEED:[^\]]*\]/gi, NEED1 = /\[NEED:/i;
  const hasNeed = t => NEED1.test([t.eyebrow, t.text, t.sub, t.line, t.head, t.btn].join(' '));
  const mdPlain = s => String(s || '').replace(/\*\*|__|`/g, '').replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, '$1').trim();
  const secs = s => { const m = /(\d+):(\d+(?:\.\d+)?)/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : NaN; };
  function mdTable(lines, first) {                // the table whose header starts with these column names
    const i = lines.findIndex(l => { const c = l.split('|').map(x => mdPlain(x).toLowerCase()).filter(Boolean); return l.trim().startsWith('|') && first.every((f, k) => c[k] === f); });
    if (i < 0) return null;
    const cells = l => { const c = l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(x => x.trim()); return c; };
    const head = cells(lines[i]).map(x => mdPlain(x).toLowerCase()), rows = [];
    // each column is also kept under its first word, so "Image (what it shows)" reads as image
    for (let j = i + 2; j < lines.length && lines[j].trim().startsWith('|'); j++) { const c = cells(lines[j]), o = {}; head.forEach((h, k) => { o[h] = c[k] || ''; const w = h.split(/[\s(]/)[0]; if (!(w in o)) o[w] = c[k] || ''; }); rows.push(o); }
    return rows;
  }
  function parseScript(md) {
    const lines = String(md).replace(/\r/g, '').split('\n'), meta = {}, end = {};
    let inEnd = false;
    lines.forEach(l => {
      const m = /^-\s+\*\*([^*:]+):?\*\*:?\s*(.*)$/.exec(l.trim());
      if (m && !/^\s{2,}/.test(l)) { meta[m[1].trim().toLowerCase()] = mdPlain(m[2]); inEnd = /end card/i.test(m[1]); return; }
      const e = /^\s{2,}-\s+([^:]+):\s*(.*)$/.exec(l);
      if (e && inEnd) end[e[1].trim().toLowerCase()] = mdPlain(e[2]);
      else if (l.trim() && !/^\s{2,}-/.test(l)) inEnd = false;
    });
    const title = mdPlain((lines.find(l => /^#\s/.test(l)) || '').replace(/^#\s+/, ''));
    const open = []; { const i = lines.findIndex(l => /^##\s+open items/i.test(l)); if (i >= 0) for (let j = i + 1; j < lines.length && !/^#/.test(lines[j]); j++) if (/^-\s/.test(lines[j].trim())) open.push(mdPlain(lines[j].trim().slice(2))); }
    const t1 = mdTable(lines, ['#', 'time', 'voiceover']) || [], t2 = mdTable(lines, ['#', 'time', 'scene']) || [];
    const scenes = t1.map(r => {
      const n = parseInt(r['#'], 10), tm = (r.time || '').split(/[–—-]/), a = secs(tm[0]), b = secs(tm[1]);
      const im = t2.find(x => parseInt(x['#'], 10) === n) || {};
      // the page column: "19 (alt 17)", "28, 29, 30, 32, 34", "28–34"; an alternative is never used
      const pg = String(im.page || '').replace(/\(alt[^)]*\)/gi, ''), pages = [];
      pg.replace(/(\d+)\s*[–—-]\s*(\d+)|(\d+)/g, (s, x, y, z) => { if (z) pages.push(+z); else for (let k = +x; k <= +y && k - x < 40; k++) pages.push(k); return s; });
      const treat = mdPlain(im.treatment), textOnly = {}; treat.replace(/\bp(\d+) is text\b/gi, (s, p) => { textOnly[p] = 1; return s; });
      return { n, at: a, end: b, vo: mdPlain(r.voiceover), screen: mdPlain(r['on-screen text']), scene: mdPlain(im.scene), image: mdPlain(im.image), treat, pages: pages.filter(p => !textOnly[p]) };
    }).filter(s => s.n && isFinite(s.at) && isFinite(s.end) && s.end > s.at);
    const px = {}; String(md).replace(/\bp(\d+)\s[^()\n|]*\((\d+)\s*[x×]\s*(\d+)[,)]/g, (s0, p, w, h) => { px[p] = [+w, +h]; return s0; });   // the low-res notes
    const fmtKey = (meta.format || '').replace(/\s/g, '').replace(':', 'x');
    return {
      title, name: meta.project || title.split(/[·|]/)[0].trim() || 'Video from a script', developer: meta['developer (collab logo)'] || meta.developer || '',
      size: SIZES[fmtKey] ? fmtKey : '9x16', len: secs(meta['total length']) || (scenes.length ? scenes[scenes.length - 1].end : 0),
      px, voice: meta.voice || '', music: meta['music mood'] || '', pdf: (meta['pdf used'] || '').replace(/\s*\(.*$/, '').split('/').pop(),
      end: { line: end['line above'] || '', head: end.headline || '', btn: end.cta || '', legal: end.legal || '' }, open, scenes
    };
  }
  // a camera move from the treatment's words; "Hold" (or nothing) leaves the photo still
  function moveOf(s) {
    const a = /Animate this photo:\s*([^.]+)/i.exec(s || ''), t = (a ? a[1] : s || '').toLowerCase();
    if (/pull[- ]?back|pull out|reveal/.test(t)) return 'pull_back';
    if (/push[- ]?in|dolly in|zoom in/.test(t)) return 'push_in';
    if (/left to right/.test(t)) return 'pan_right';     // before "pan left": "Pan left to right" moves right
    if (/right to left|pan[- ]left/.test(t)) return 'pan_left';
    if (/pan[- ]right|\bpan\b/.test(t)) return 'pan_right';
    if (/tilt[- ]up/.test(t)) return 'tilt_up';
    if (/tilt[- ]down/.test(t)) return 'tilt_down';
    if (/crane/.test(t)) return 'crane_up';
    if (/orbit/.test(t)) return 'orbit';
    if (/slide|tracking/.test(t)) return 'slide';
    return null;
  }
  // where to centre the crop, as fractions of the page: "right 40%", "centre-left", "50% across, 45% down"
  function aimOf(s) {
    s = String(s || '').toLowerCase(); let x = .5, y = .5, m;
    if ((m = /(\d+)%\s*across/.exec(s))) x = +m[1] / 100;
    else if ((m = /\bright\s+(\d+)%/.exec(s))) x = 1 - +m[1] / 200;
    else if ((m = /\bleft\s+(\d+)%/.exec(s))) x = +m[1] / 200;
    else if (/centre-left|center-left/.test(s)) x = .38;
    else if (/centre-right|center-right/.test(s)) x = .62;
    else if (/left half/.test(s)) x = .25;
    else if (/right half/.test(s)) x = .75;
    if ((m = /(\d+)%\s*down/.exec(s))) y = +m[1] / 100;
    else if ((m = /\btop\s+(\d+)%/.exec(s))) y = +m[1] / 200;
    else if ((m = /\bbottom\s+(\d+)%/.exec(s))) y = 1 - +m[1] / 200;
    return { x, y };
  }
  // the clip's focus (fx, fy) that puts that point in the middle of a fill-cropped frame
  function focusFor(w, h, aim) {
    const g = G(), sc = Math.max(g.w / w, g.h / h), vx = g.w / (w * sc), vy = g.h / (h * sc);
    const f = (c, v) => v >= .999 ? 50 : Math.round(clamp((c - v / 2) / (1 - v), 0, 1) * 1000) / 10;
    return { fx: f(aim.x, vx), fy: f(aim.y, vy) };
  }
  // the words about one page inside a treatment that names several ("p18 crop right 45%, … p15 crop centre, …")
  function pageWords(treat, pages, p) {
    const main = treat.split(/\bAlt:/i)[0], re = /\bp(\d+)\b/gi, hits = []; let m;
    while ((m = re.exec(main))) hits.push({ p: +m[1], i: m.index });
    const i = hits.findIndex(h => h.p === p);
    if (i < 0) return pages.length > 1 && hits.length ? '' : main;
    return main.slice(hits[i].i, i + 1 < hits.length ? hits[i + 1].i : main.length);
  }
  let pdfjsP = null;
  const pdfjs = () => pdfjsP || (pdfjsP = new Promise((res, rej) => {
    if (window.pdfjsLib) return res(window.pdfjsLib);
    const s = document.createElement('script'); s.src = 'vendor/pdfjs/pdf.min.js';
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/pdf.worker.min.js'; res(window.pdfjsLib); };
    s.onerror = () => { pdfjsP = null; rej(new Error('pdf.js did not load')); }; document.head.appendChild(s);
  }));
  // THE PICTURE ON THE PAGE, NOT THE PAGE: brochure pages are spreads with type around the photo,
  // and the script means the photo (its image map quotes the photo's own pixel size). The page's
  // drawing list says where each image lands, and the script says which one it means: a pixel
  // size from its low-res notes ("p7 map (1840x1197)") wins, then "portrait" / "landscape" in its
  // words, then the biggest. (The Wilds p19: the biggest is a full-page paper texture; the photo
  // is the 2608x3376 portrait on it.) Strips of one photo lying edge to edge are joined. The
  // chosen picture is rendered alone at its own resolution. A page with no image covering 4% of
  // it is rendered whole.
  async function pageImage(doc, n, want) {
    want = want || {};
    const L = window.pdfjsLib, OPS = L.OPS, page = await doc.getPage(n), vp1 = page.getViewport({ scale: 1 });
    const ops = await page.getOperatorList(), mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
    let m = [1, 0, 0, 1, 0, 0]; const stack = [], ims = [];
    for (let i = 0; i < ops.fnArray.length; i++) {
      const f = ops.fnArray[i], a = ops.argsArray[i];
      if (f === OPS.save) stack.push(m);
      else if (f === OPS.restore) m = stack.pop() || [1, 0, 0, 1, 0, 0];
      else if (f === OPS.transform) m = mul(m, a);
      else if (f === OPS.paintFormXObjectBegin) { stack.push(m); if (a && a[0]) m = mul(m, a[0]); }
      else if (f === OPS.paintFormXObjectEnd) m = stack.pop() || [1, 0, 0, 1, 0, 0];
      else if (f === OPS.paintImageXObject || f === OPS.paintInlineImageXObject) {
        const pts = [[0, 0], [1, 0], [0, 1], [1, 1]].map(p => vp1.convertToViewportPoint(m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]));
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        const r = { x0: Math.max(0, Math.min(...xs)), y0: Math.max(0, Math.min(...ys)), x1: Math.min(vp1.width, Math.max(...xs)), y1: Math.min(vp1.height, Math.max(...ys)) };
        const nw = f === OPS.paintImageXObject ? +a[1] || 0 : (a[0] && a[0].width) || 0, nh = f === OPS.paintImageXObject ? +a[2] || 0 : (a[0] && a[0].height) || 0;
        if (r.x1 - r.x0 > 2 && r.y1 - r.y0 > 2) ims.push(Object.assign(r, { nw, nh, area: (r.x1 - r.x0) * (r.y1 - r.y0) }));
      }
    }
    ims.sort((p, q) => q.area - p.area);
    const big = ims.filter(r => r.area > .04 * vp1.width * vp1.height), tall = r => r.y1 - r.y0 > r.x1 - r.x0;
    const pick = (want.px && big.find(r => Math.abs(r.nw - want.px[0]) <= 2 && Math.abs(r.nh - want.px[1]) <= 2))
      || (want.orient && big.find(r => tall(r) === (want.orient === 'p'))) || big[0];
    let box = { x0: 0, y0: 0, x1: vp1.width, y1: vp1.height }, res = 0, whole = true;
    if (pick) {
      box = Object.assign({}, pick); res = Math.max(pick.nw / (pick.x1 - pick.x0), pick.nh / (pick.y1 - pick.y0)); whole = false;
      const near = (a, b) => Math.abs(a - b) <= 2;
      for (let grew = true; grew;) {              // strips: same width and touching above or below, or same height beside
        grew = false;
        big.forEach(r => { if (r.used || r === pick) return;
          if ((near(r.x0, box.x0) && near(r.x1, box.x1) && (near(r.y0, box.y1) || near(r.y1, box.y0))) || (near(r.y0, box.y0) && near(r.y1, box.y1) && (near(r.x0, box.x1) || near(r.x1, box.x0)))) {
            r.used = 1; grew = true; box = { x0: Math.min(box.x0, r.x0), y0: Math.min(box.y0, r.y0), x1: Math.max(box.x1, r.x1), y1: Math.max(box.y1, r.y1) }; } });
      }
    }
    const bw = box.x1 - box.x0, bh = box.y1 - box.y0;
    // the image's own resolution, but never less than fills the frame, and at most 4096 a side
    const need = Math.max(1920 / bh, 1080 / bw) * 1.1, sc = Math.min(Math.max(res, need), 4096 / Math.max(bw, bh), Math.sqrt(16e6 / (bw * bh)));
    const vp = page.getViewport({ scale: sc, offsetX: -box.x0 * sc, offsetY: -box.y0 * sc });
    const k = document.createElement('canvas'); k.width = Math.max(1, Math.round(bw * sc)); k.height = Math.max(1, Math.round(bh * sc));
    const x = k.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, k.width, k.height);
    await page.render({ canvasContext: x, viewport: vp }).promise; page.cleanup();
    return { blob: await new Promise(r => k.toBlob(r, 'image/jpeg', .9)), whole, native: pick ? pick.nw + 'x' + pick.nh : '' };
  }
  function pickOne(accept) {                     // a second file picker, for the brochure after the script
    return new Promise(res => {
      const fi = document.createElement('input'); fi.type = 'file'; fi.accept = accept;
      fi.onchange = () => res(fi.files[0] || null); fi.addEventListener('cancel', () => res(null)); fi.click();
    });
  }
  const needsOf = s => (String(s || '').match(NEEDRX) || []);
  function scriptProg(title, note, done, of) {
    $('#ovT').textContent = title; $('#ovN').textContent = note; $('#ovP').style.width = (of ? done / of * 100 : 0) + '%';
    $('#ovC').textContent = of ? done + ' of ' + of : ''; $('#ovX').hidden = true; $('#ov').dataset.on = '1';
  }
  function scriptProgEnd() { delete $('#ov').dataset.on; $('#ovX').hidden = false; $('#ovT').textContent = 'Exporting the video'; $('#ovN').textContent = 'The video is recorded as it plays, so this takes as long as the video. Keep this tab in front until it finishes.'; }
  async function importScript(files) {
    files = Array.from(files || []);
    const mdF = files.find(f => /\.(md|markdown|txt)$/i.test(f.name)); let pdfF = files.find(f => /\.pdf$/i.test(f.name));
    if (!mdF) { toast('Choose the video script (.md), with its brochure PDF if you have it.'); return; }
    let S; try { S = parseScript(await mdF.text()); } catch (e) { S = null; }
    if (!S || !S.scenes.length) { toast('No scene table was found in ' + mdF.name + '. It needs the # | Time | Voiceover | On-screen text table.'); return; }
    const want = [...new Set(S.scenes.flatMap(s => s.pages))], hint = {};
    S.scenes.forEach(s => s.pages.forEach(p => {   // which picture on the page: its size, or the words about it
      const w = (pageWords(s.treat, s.pages, p) || s.treat.split(/\bAlt:/i)[0]) + ' ' + (s.pages.length === 1 ? s.image : ''), lw = w.toLowerCase();
      if (!hint[p]) hint[p] = { px: S.px[p], orient: /portrait/.test(lw) ? 'p' : /landscape/.test(lw) ? 'l' : '' };
    }));
    if (!pdfF && want.length) {
      if (!(await ask('Now choose the brochure', 'The script takes its pictures from ' + (S.pdf || 'the brochure PDF') + ' (pages ' + want.slice(0, 8).join(', ') + (want.length > 8 ? ' …' : '') + '). Choose that PDF next.', 'Choose the PDF'))) return;
      pdfF = await pickOne('application/pdf,.pdf'); if (!pdfF) return;
    }
    if (!(await startNew(S.name, 'the script'))) return;
    P.size = S.size; fitCanvas();
    const pageMid = {}, missing = [], wholePages = [];
    if (pdfF) {
      try {
        scriptProg('Reading the brochure', 'Each page the script uses becomes a photo in Your media.', 0, want.length);
        const lib = await pdfjs(), doc = await lib.getDocument({ data: new Uint8Array(await pdfF.arrayBuffer()) }).promise;
        for (let i = 0; i < want.length; i++) {
          const n = want[i]; scriptProg('Reading the brochure', 'Page ' + n + ' of ' + doc.numPages + ' · each page the script uses becomes a photo in Your media.', i, want.length);
          if (n < 1 || n > doc.numPages) { missing.push(n); continue; }
          const pi = await pageImage(doc, n, hint[n]), nm = S.name + ' · p' + n;
          const rec = { id: uid(), kind: 'image', name: nm, blob: new File([pi.blob], nm + '.jpg', { type: 'image/jpeg' }) };
          if (pi.whole) wholePages.push(n);
          await probe(rec); media[rec.id] = rec; DB.put(dbRec(rec)); pageMid[n] = rec.id;
        }
        doc.destroy();
      } catch (e) { scriptProgEnd(); toast('The brochure could not be read (' + e.message + '). The script was not imported.'); return; }
      scriptProgEnd();
    }
    // the timeline: each scene's pages share its time equally; text and the end card ride on top
    const last = S.scenes[S.scenes.length - 1], hasEnd = !!(S.end.head || S.end.btn);
    S.scenes.forEach(s => {
      const pages = s.pages.filter(p => pageMid[p]), len = s.end - s.at, each = len / Math.max(1, pages.length);
      if (!pages.length) return;
      pages.forEach(p => {
        const m = media[pageMid[p]], words = pageWords(s.treat, s.pages, p), aim = aimOf(words || s.treat.split(/\bAlt:/i)[0]);
        const mv = moveOf(words || s.treat.split(/\bAlt:/i)[0]), f = focusFor(m.w, m.h, aim);
        const c = { id: uid(), mid: m.id, in: 0, out: Math.round(each * 1000) / 1000, vol: 1, mute: false, fit: 'fill', z: 100, fx: f.fx, fy: f.fy, sc: s.n };
        if (mv) { c.move = mv; c.genDur = clamp(Math.ceil(each - .05), 4, 30); }
        P.clips.push(c);
      });
    });
    S.scenes.forEach(s => {
      const len = s.end - s.at;
      if (s === last && hasEnd) {
        P.texts.push({ id: uid(), at: s.at, dur: len, call: 'cta', line: S.end.line, head: S.end.head, btn: S.end.btn, mark: true, glass: 'glass', y: 50 });
        if (S.end.legal) P.texts.push({ id: uid(), at: s.at, dur: len, eyebrow: '', text: S.end.legal, sub: '', size: 'Small', pos: 'bottom', align: 'centre', anim: 'fade', scrim: 0 });
        return;
      }
      const parts = s.screen.split(/\s+\/\s+/).map(x => x.trim()).filter(Boolean);
      if (!parts.length) return;
      const tx = parts.length >= 3 ? { eyebrow: parts[0], text: parts[1], sub: parts.slice(2).join(' · ') } : { eyebrow: '', text: parts[0], sub: parts[1] || '' };
      P.texts.push(Object.assign({ id: uid(), at: s.at, dur: len, size: 'Medium', pos: 'bottom', align: 'left', anim: 'rise', scrim: 55 }, tx));
    });
    // the collaboration logo, when this computer has the developer's
    const dev = S.developer && devLib().find(l => l.name.toLowerCase() === S.developer.toLowerCase()) || (S.developer && devLib().find(l => l.name.toLowerCase().indexOf(S.developer.toLowerCase()) >= 0));
    if (dev) { P.brand.partner = { id: dev.id, name: dev.name, u: dev.u }; P.brand.on = true; }
    const needs = [];
    if (S.developer && !dev) needs.push({ s: 0, t: S.developer + '\'s logo is not on this computer: add it under Collaboration logo.' });
    missing.forEach(n => needs.push({ s: 0, t: 'Page ' + n + ' is not in the PDF you chose.' }));
    S.scenes.forEach(s => s.pages.filter(p => wholePages.indexOf(p) >= 0).forEach(p => needs.push({ s: s.n, t: 'p' + p + ' has no photo on it, so the whole page was used.' })));
    S.scenes.forEach(s => {
      needsOf(s.image).forEach(t => needs.push({ s: s.n, t: t.replace(/^\[NEED:\s*/i, '').replace(/\]$/, '') }));
      if (s.pages.length && !s.pages.some(p => pageMid[p])) needs.push({ s: s.n, t: 'No picture: the brochure was not chosen.' });
      needsOf(s.screen + ' ' + s.vo + (s === last ? ' ' + S.end.legal : '')).forEach(t => needs.push({ s: s.n, t: 'On screen: ' + t }));
    });
    const seen = {}; for (let i = needs.length - 1; i >= 0; i--) { const k = needs[i].s + needs[i].t; if (seen[k]) needs.splice(i, 1); seen[k] = 1; }
    P.script = { file: mdF.name, pdf: pdfF ? pdfF.name : '', name: S.name, len: S.len, scenes: S.scenes.length, voice: S.voice, music: S.music, vo: S.scenes.map(s => s.vo).filter(Boolean).join(' '), needs, open: S.open };
    scriptFill(true);
    sel = null; T = 0; partnerLoad(); rtab = 'doc'; selKey = ''; renderAll(); save();
    const mv = P.clips.filter(c => c.move).length;
    toast(S.scenes.length + ' scenes on the timeline' + (mv ? ', ' + mv + ' camera moves chosen (not queued)' : '') + '. What is still needed is under Brand.');
  }
  // the voiceover and music forms take the script's words, unless something is typed there already
  function scriptFill(force) {
    const s = P.script; if (!s) return;
    if (force || !VO.text) { VO.text = s.vo || ''; VO.target = s.len ? String(Math.round(s.len * 10) / 10) : ''; }
    if (force || !MU.text) { MU.text = s.music || ''; MU.len = s.len ? String(Math.ceil(s.len)) : ''; }
  }
  const leftNeeds = () => P.texts.filter(hasNeed).length;
  function scriptHtml() {
    const s = P.script; if (!s) return '';
    const queued = P.clips.filter(c => c.move && !c.job), onTl = leftNeeds();
    const li = n => '<li>' + (n.s ? '<button class="vs-link" data-scn="' + n.s + '">Scene ' + n.s + '</button> ' : '') + esc(n.t) + '</li>';
    return '<div class="vs-sec">' + H('From the script', esc(s.file)) +
      '<span class="vs-note">' + s.scenes + ' scenes, ' + fmt(s.len || 0) + (s.pdf ? ', pictures from ' + esc(s.pdf) : '') + '. Words are the script\'s; check the framing of each photo.</span>' +
      (s.needs.length ? '<div class="vs-none vs-need"><b>Still needed</b><ul>' + s.needs.map(li).join('') + '</ul>' +
        (onTl ? '<span>' + onTl + (onTl === 1 ? ' text on the video still says' : ' texts on the video still say') + ' [NEED: …]. Export asks before it records them.</span>' : '') + '</div>' : '') +
      (s.open && s.open.length ? '<details class="vs-open"><summary>Open items from the script (' + s.open.length + ')</summary><ul>' + s.open.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul></details>' : '') +
      '<div class="vs-acts">' + '<button class="p-ghost p-sm" data-scgo="vo">Voiceover</button><button class="p-ghost p-sm" data-scgo="mu">Music</button>' +
        (queued.length ? '<button class="p-btn p-sm" data-scq="1">Queue ' + queued.length + ' camera move' + (queued.length === 1 ? '' : 's') + '</button>' : '') + '</div>' +
      (queued.length ? '<span class="vs-note">Queuing costs nothing. Run <b>/animate-photos</b> in Claude to generate them; each clip keeps its scene\'s length.</span>' : '') +
      (s.voice ? '<span class="vs-note">Voice in the script: ' + esc(s.voice) + '.</span>' : '') + '</div>';
  }
  function scriptClick(e) {
    const q = a => e.target.closest('[' + a + ']'); let el;
    if ((el = q('data-scn'))) { const st = clipStarts(), i = P.clips.findIndex(c => c.sc === +el.dataset.scn); if (i >= 0) { if (playing) pause(); seek(st[i] + .05); sel = { kind: 'clip', id: P.clips[i].id }; renderAll(); } return true; }
    if ((el = q('data-scgo'))) { scriptFill(false); gtab = el.dataset.scgo; rtab = 'gen'; renderInspector(); return true; }
    if ((el = q('data-scq'))) {
      el.disabled = true;
      (async () => {
        for (const c of P.clips.filter(x => x.move && !x.job)) { const m = media[c.mid]; if (m) { const im = imgFor(m); if (!im.complete) await once(im, 'load').catch(() => {}); } await animSend(c, false); }
        renderAll();
      })();
      return true;
    }
    return false;
  }
  async function needsOk() {
    if (!leftNeeds()) return true;
    return !!(await ask('Some text still says [NEED: …]', 'The video has placeholders the script could not fill. Fill them in first, or record anyway for a draft.', 'Record anyway'));
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
    $('#sizeSeg').querySelectorAll('button').forEach(b => { const on = b.dataset.size === P.size; if (on) b.dataset.on = '1'; else delete b.dataset.on; b.setAttribute('aria-checked', on); });
    const g = G(), nm = g.name.split(' '), has = total() > 0;
    $('#szName').textContent = nm[0]; $('#szRatio').textContent = nm[1] || ''; $('#szMeta').textContent = g.w + ' × ' + g.h + (has ? ' · ' + fmt(total()) : '');
    $('#empty').style.display = has ? 'none' : '';
    $('#exportBtn').disabled = $('#sendBtn').disabled = $('#frameBtn').disabled = $('#previewBtn2').disabled = $('#outBtn').disabled = !has;
    { const fn = $('#fileName'), nmv = P.name || (P.cas && P.cas.title) || '', fb = $('#fileBtn'); if (fn.firstChild == null || fn.dataset.v !== nmv) { fn.dataset.v = nmv; fn.textContent = nmv || 'Untitled video'; } if (nmv) delete fb.dataset.none; else fb.dataset.none = '1'; }
    drivePaint(); renderBar();
    { const l = $('#sendBtn').querySelector('.vs-l2'), want = P.casBg ? 'Send back to CAS' : 'Send to CAS'; if (l && l.textContent !== want) l.textContent = want;
      $('#sendBtn').title = P.casBg ? 'Records this video at 9:16 and places it behind the design in CAS' + (P.casBg.name ? ' (' + P.casBg.name + ')' : '') : ''; }
    $('#undoBtn').disabled = !undo.length; $('#redoBtn').disabled = !redo.length;
    $('#delBtn').disabled = $('#dupBtn').disabled = !find(sel);
    T = clamp(T, 0, Math.max(0, total()));
    if (!sel || !GK[sel.kind] || !multi.has(sel.id)) multi.clear();
    renderLib(); renderInspector(); renderTimeline(); dirty = true; save();
  }
  $('#undoBtn').innerHTML = ico('undo'); $('#redoBtn').innerHTML = ico('redo'); $('#splitBtn').innerHTML = ico('content_cut');
  $('#dupBtn').innerHTML = ico('content_copy'); $('#delBtn').innerHTML = ico('delete'); $('#homeBtn').innerHTML = ico('skip_previous');
  $('#safeBtn').innerHTML = ico('smartphone') + 'Safe zones';
  $('#newBtn').innerHTML = sico('add_box') + 'Start a new video'; $('#scriptBtn').innerHTML = sico('script') + 'Start from a video script'; $('#keysBtn').innerHTML = sico('keyboard'); $('#emptyUp').innerHTML = ico('upload') + 'Upload video or photos';
  $('#emptyUp').addEventListener('click', () => pickFiles('media'));
  // one small dialog for the questions the studio asks (the kit's card; Esc cancels). With `value`
  // it carries a field and answers with the text; without, it answers true. Cancelled, null.
  function ask(title, body, yes, value) {
    const d = $('#ask'), inp = $('#askIn');
    $('#askT').textContent = title; $('#askN').textContent = body; $('#askYes').textContent = yes;
    inp.hidden = value == null; inp.value = value || '';
    return new Promise(res => {
      d.onclose = () => res(d.returnValue === 'yes' ? (value == null ? true : inp.value) : null);
      d.returnValue = ''; d.showModal(); if (value != null) { inp.focus(); inp.select(); }
    });
  }
  $('#askYes').addEventListener('click', () => $('#ask').close('yes')); $('#askNo').addEventListener('click', () => $('#ask').close(''));
  $('#askIn').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#ask').close('yes'); } });
  // START NEW (2026-11-16): the video being replaced is kept as "the last video" (PREV), so a new
  // one never loses it: the empty timeline offers Reopen the last video. CAS's Make a new one in
  // CASV opens this page with #new=<ad set name>: the same question, and the name is what Send to
  // CAS suggests (P.name). A new video has no P.cas, so its Send to CAS is a new outbox video.
  const PREV = 'provident-video-project-prev';
  const prevOn = () => { let ok = false; try { ok = !!WS.getItem(PREV); } catch (e) {} $('#prevBtn').hidden = $('#prevBtn2').hidden = !ok; };
  async function startNew(name, from, quiet) {
    if (total() && !quiet && !(await ask(from ? 'Start a new video for ' + from + '?' : 'Start a new video?',
      'The timeline and the library are cleared for a new video. This one is kept, with its files: Reopen the last video brings it back' + (P.cas ? '' : ' — it has not been sent to CAS') + '.', 'Start new'))) return false;
    if (total()) { try { WS.setItem(PREV, JSON.stringify(P)); } catch (e) {} }
    mark(); const keep = P.size; P = fresh(); P.size = keep; if (name) P.name = String(name).slice(0, 60); sel = null; T = 0; partnerLoad(); renderAll(); prevOn(); save();
    return true;
  }
  $('#newBtn').addEventListener('click', () => startNew());
  $('#saveBtn').innerHTML = ico('upload') + '<span class="vs-l2">Save</span>'; $('#saveBtn').addEventListener('click', () => driveGo('save'));
  $('#openDriveBtn').innerHTML = sico('folder') + 'Open from an ad set<s>Google Drive</s>'; $('#openDriveBtn').addEventListener('click', () => { $('#filePop').hidePopover(); driveGo('open'); });
  $('#setBtn').innerHTML = ico('upload') + 'Save to another ad set'; $('#setBtn').addEventListener('click', () => { $('#filePop').hidePopover(); driveGo('pick'); });
  $('#openBtn').innerHTML = sico('folder') + 'Open a project file<s>.casv</s>'; $('#prevBtn2').innerHTML = ico('undo') + 'Reopen the last video'; $('#prevBtn2').addEventListener('click', () => $('#prevBtn').click()); $('#openBtn').addEventListener('click', () => projIn.click()); $('#emptyOpen').addEventListener('click', () => projIn.click());
  $('#scriptBtn').addEventListener('click', () => pickFiles('script')); $('#emptyScript').addEventListener('click', () => pickFiles('script'));
  scriptFill(false);
  $('#prevBtn').addEventListener('click', async () => {
    let old = null; try { old = JSON.parse(WS.getItem(PREV) || 'null'); } catch (e) {}
    if (!old || old.v !== 1) { prevOn(); return; }
    if (total() && !(await ask('Reopen the last video?', 'It swaps places with the video open now, which becomes the last video.', 'Reopen'))) return;
    try { if (total()) WS.setItem(PREV, JSON.stringify(P)); else WS.removeItem(PREV); } catch (e) {}
    mark(); P = Object.assign(fresh(), old); P.brand = Object.assign(fresh().brand, old.brand); if (!SIZES[P.size]) P.size = '9x16';
    if (!old.id) { const was = {}; [P.clips, P.audio, P.logos].forEach(l => (l || []).forEach(x => { was[x.mid] = 1; })); Object.keys(was).forEach(id => { const m = media[id]; if (m && m.pid !== P.id) { m.pid = P.id; DB.put(dbRec(m)); } }); }
    sel = null; T = 0; partnerLoad(); renderAll(); prevOn(); save();
  });
  prevOn();
  // CAS's Edit in CASV adds &photo=<id>: the ad's photo (parked by the local server in `_inbox/`)
  // goes onto the new video's timeline
  // &back=1 (2026-11-17): CAS's Edit in CASV, like Edit in Photoshop. A fresh canvas — no question,
  // the open video kept as the last one, no wordmark (the video goes BEHIND a CAS design), the
  // library showing only this video's media — and the top button becomes Send back to CAS.
  // &qr=<id> (2026-11-20): the ad set's QR code (CAS's Ad set settings), parked the same way —
  // the new video's QR code starts as it, kept in the project like an uploaded one
  { const m = /^#new=([^&]*)(?:&photo=([a-z0-9]{4,16}))?(?:&qr=([a-z0-9]{4,16}))?(&back=1)?$/.exec(location.hash || '');
    if (m) { history.replaceState(null, '', location.pathname + location.search); let nm = ''; try { nm = decodeURIComponent(m[1]); } catch (e) {}
      setTimeout(async () => {
        const back = !!(m[4] && m[2]);
        if (!(await startNew(nm, nm || 'CAS', back))) return;
        if (m[3]) try {
          const r = await fetch('/api/inbox/photo?id=' + m[3]); if (!r.ok) throw new Error(r.status);
          const u = await new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = no; r.blob().then(b => fr.readAsDataURL(b), no); });
          mark(); P.brand.qr = { name: (nm ? nm + ' ' : '') + 'QR code', u }; save(); renderAll();
        } catch (e) { toast('The ad set’s QR code from CAS could not be opened (' + e.message + ').'); }
        if (!m[2]) return;
        if (back) { P.casBg = { id: m[2], name: nm, media: [] }; P.brand.on = false; save(); renderAll(); }
        try {
          const r = await fetch('/api/inbox/photo?id=' + m[2]); if (!r.ok) throw new Error(r.status);
          await addFiles([new File([await r.blob()], (nm || 'CAS') + ' photo.jpg', { type: 'image/jpeg' })]);
        } catch (e) { toast('The photo from CAS could not be opened (' + e.message + ').'); }
      }, 600); } }
  // a card opens above its button (the shortcuts, the markers)
  const popAt = (pop, btn) => e => {
    const open = e.newState === 'open', r = btn.getBoundingClientRect();
    btn.setAttribute('aria-expanded', open);
    if (open) { pop.style.left = Math.max(12, Math.min(innerWidth - pop.offsetWidth - 12, r.right - pop.offsetWidth)) + 'px'; pop.style.top = Math.max(12, r.top - pop.offsetHeight - 8) + 'px'; }
  };
  $('#keys').addEventListener('toggle', popAt($('#keys'), $('#keysBtn')));
  // THE TOP BAR'S TWO MENUS (2026-11-19 redesign): the video's name opens what used to be three
  // unlabelled icons and the theme switch; Export holds the video and the single frame. The old
  // buttons keep their ids, so their handlers are untouched; a click on a row closes its menu.
  const popUnder = (pop, btn, left) => e => {
    const open = e.newState === 'open', r = btn.getBoundingClientRect();
    btn.setAttribute('aria-expanded', open);
    if (open) { pop.style.left = Math.max(12, Math.min(innerWidth - pop.offsetWidth - 12, left ? r.left : r.right - pop.offsetWidth)) + 'px'; pop.style.top = (r.bottom + 8) + 'px'; }
  };
  $('#fileBtn').insertAdjacentHTML('beforeend', CHEV);
  $('#filePop').addEventListener('toggle', e => { if (e.newState === 'open') $('#nameIn').value = P.name || (P.cas && P.cas.title) || ''; popUnder($('#filePop'), $('#fileBtn'), true)(e); });
  $('#outPop').addEventListener('toggle', popUnder($('#outPop'), $('#outBtn')));
  [$('#filePop'), $('#outPop')].forEach(p => p.addEventListener('click', e => { if (e.target.closest('.vs-mi')) p.hidePopover(); }));
  $('#nameIn').addEventListener('input', e => { P.name = e.target.value.slice(0, 60); if (!P.name) delete P.name; const fn = $('#fileName'); fn.dataset.v = P.name || ''; fn.textContent = P.name || 'Untitled video'; if (P.name) delete $('#fileBtn').dataset.none; else $('#fileBtn').dataset.none = '1'; save(); });
  $('#nameIn').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#filePop').hidePopover(); } e.stopPropagation(); });
  // shortcuts from the right rail's empty state and the Audio tab into the other rail
  document.addEventListener('click', e => {
    let el;
    if ((el = e.target.closest('[data-ltab]'))) { const b = document.querySelector('[data-tab="' + el.dataset.ltab + '"]'); if (b) b.click(); }
    else if (e.target.closest('[data-hf]')) hfOpen();
    else if (e.target.closest('[data-cm]')) cmStart();
    else if (e.target.closest('[data-cmx]')) { cmStop(); renderLib(); }
    else if (e.target.closest('[data-cmopen]')) { const m = media[e.target.closest('[data-cmopen]').dataset.cmopen]; if (m && m.cm) window.open(m.cm, '_blank', 'noopener'); }
    else if (e.target.closest('[data-cmup]')) { const id = e.target.closest('[data-cmup]').dataset.cmup; if (media[id] && media[id].cm) cmStart(media[id].cm, id); }
    else if ((el = e.target.closest('[data-go2]'))) { rtab = el.dataset.go2; renderInspector(); }
    else if ((el = e.target.closest('[data-mk]'))) { gtab = el.dataset.mk; rtab = 'gen'; document.body.dataset.pane = 'edit'; paintPane(); renderInspector(); }
  });
  $('#mkBtn').innerHTML = sico('flag') + '<span>Markers</span>'; $('#mkBtn').setAttribute('aria-label', 'Markers');
  const lenBtn = $('#lenBtn');
  const lenPaint = () => { lenBtn.setAttribute('aria-pressed', LENS); if (LENS) lenBtn.dataset.on = '1'; else delete lenBtn.dataset.on; };
  lenBtn.innerHTML = sico('timer') + '<span>Lengths</span>'; lenPaint();
  lenBtn.addEventListener('click', () => { LENS = !LENS; try { localStorage.setItem(LENKEY, LENS ? '1' : '0'); } catch (e) {} lenPaint(); renderTimeline(); });
  $('#mkPop').addEventListener('toggle', e => { if (e.newState === 'open') mkPaint(); popAt($('#mkPop'), $('#mkBtn'))(e); });
  $('#mkPop').addEventListener('click', e => {
    const b = e.target.closest('[data-mk]'); if (!b) return;
    const v = b.dataset.v; MK[b.dataset.mk] = v === 'true' ? true : v === 'false' ? false : v;
    try { localStorage.setItem(MKEY, JSON.stringify(MK)); } catch (x) {}
    renderTimeline(); mkPaint();
  });
  $('#mseg').addEventListener('click', e => { const b = e.target.closest('[data-pane]'); if (b) { document.body.dataset.pane = b.dataset.pane; paintPane(); } });
  paintPane();
  $('#safeBtn').addEventListener('click', () => { showSafe = !showSafe; $('#safeBtn').setAttribute('aria-pressed', showSafe); if (showSafe) guideShow(); else guideHide(); });
  $('#zoIc').innerHTML = ico('zoom_out'); $('#ziIc').innerHTML = ico('zoom_in');
  $('#frameBtn').innerHTML = ico('photo_camera') + 'Save this frame<s>PNG</s>'; $('#exportBtn').innerHTML = ico('download') + 'Export the video<s>MP4</s>'; $('#outBtn').innerHTML = ico('download') + '<span class="vs-l2">Export</span>' + CHEV;
  function paintTheme() { const light = document.documentElement.dataset.theme === 'light'; $('#themeBtn').innerHTML = ico(light ? 'dark_mode' : 'light_mode') + (light ? 'Switch to the dark theme' : 'Switch to the light theme'); }
  if (localStorage.getItem(TKEY) === 'light') document.documentElement.dataset.theme = 'light';
  $('#themeBtn').addEventListener('click', () => {
    const r = document.documentElement; if (r.dataset.theme === 'light') delete r.dataset.theme; else r.dataset.theme = 'light';
    localStorage.setItem(TKEY, r.dataset.theme || 'dark'); paintTheme(); renderTimeline();   // the waveforms take the theme's tint
  });
  $('#sizeSeg').addEventListener('click', e => { const b = e.target.closest('[data-size]'); if (b && b.dataset.size !== P.size) { mark(); P.size = b.dataset.size; pTint = null; fitCanvas(); renderAll(); } });
  $('#undoBtn').addEventListener('click', () => restore(undo, redo)); $('#redoBtn').addEventListener('click', () => restore(redo, undo));
  $('#splitBtn').addEventListener('click', split); $('#delBtn').addEventListener('click', del); $('#dupBtn').addEventListener('click', dup);
  $('#homeBtn').addEventListener('click', () => { seek(0); tl.scrollLeft = 0; });
  $('#playBtn').addEventListener('click', () => (playing ? pause() : play()));
  $('#previewBtn2').innerHTML = ico('visibility') + '<span class="vs-l">Preview</span>'; $('#previewBtn2').addEventListener('click', pvOpen);
  $('#exportBtn').addEventListener('click', async () => { if (await needsOk()) exportVideo(); }); $('#sendBtn').innerHTML = ico('send') + '<span class="vs-l2">Send to CAS</span>'; $('#sendBtn').addEventListener('click', async () => { if (await needsOk()) (P.casBg ? sendBack() : sendToCas()); }); $('#frameBtn').addEventListener('click', saveFrame);
  $('#zoom').addEventListener('input', e => { pps = +e.target.value; renderTimeline(); });
  // THE TIMELINE CAN BE PULLED TALLER (2026-11-13, by request): drag the top edge of its bar, or
  // focus it and use the arrow keys; double-click puts it back. Kept per computer.
  const HKEY = 'provident-video-tlh', rz = $('#tlRz');
  function setTlh(px, keep) {
    const root = document.documentElement;
    if (px == null) { root.style.removeProperty('--vs-tlh'); try { localStorage.removeItem(HKEY); } catch (e) {} }
    else {
      px = Math.round(clamp(px, 120, Math.max(160, innerHeight - 56 - 48 - 190)));
      root.style.setProperty('--vs-tlh', px + 'px'); if (keep) { try { localStorage.setItem(HKEY, px); } catch (e) {} }
    }
    fitCanvas(); renderTimeline();
  }
  { const h0 = parseFloat(localStorage.getItem(HKEY)); if (h0 > 0) setTlh(h0); }
  let rzD = null;
  rz.addEventListener('pointerdown', e => { if (e.button) return; rzD = { y: e.clientY, h: tl.offsetHeight }; rz.setPointerCapture(e.pointerId); rz.dataset.on = '1'; e.preventDefault(); });
  rz.addEventListener('pointermove', e => { if (rzD) setTlh(rzD.h + (rzD.y - e.clientY), true); });
  const rzEnd = () => { rzD = null; delete rz.dataset.on; };
  rz.addEventListener('pointerup', rzEnd); rz.addEventListener('pointercancel', rzEnd);
  rz.addEventListener('dblclick', () => setTlh(null));
  rz.addEventListener('keydown', e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); setTlh(tl.offsetHeight + (e.key === 'ArrowUp' ? 24 : -24), true); } });
  window.addEventListener('resize', () => { const h = parseFloat(document.documentElement.style.getPropertyValue('--vs-tlh')); if (h > 0) setTlh(h); else { fitCanvas(); renderTimeline(); } });
  // THE LIBRARY'S WIDTH IS THE USER'S (2026-11-17, by request): drag the rail's right edge. Kept
  // per browser; double-click puts the default back; the arrow keys move it while it has focus.
  const WKEY = 'provident-video-libw', lz = $('#libRz'), railL = document.querySelector('.vs-rail.l');
  function setLibW(px, keep) {
    const root = document.documentElement;
    if (px == null) { root.style.removeProperty('--vs-lw'); try { localStorage.removeItem(WKEY); } catch (e) {} }
    else {
      px = Math.round(clamp(px, 220, Math.max(240, Math.min(640, innerWidth - 332 - 380))));
      root.style.setProperty('--vs-lw', px + 'px'); if (keep) { try { localStorage.setItem(WKEY, px); } catch (e) {} }
    }
    fitCanvas();
  }
  { const w0 = parseFloat(localStorage.getItem(WKEY)); if (w0 > 0) setLibW(w0); }
  let lzD = null;
  lz.addEventListener('pointerdown', e => { if (e.button) return; lzD = { x: e.clientX, w: railL.offsetWidth }; lz.setPointerCapture(e.pointerId); lz.dataset.on = '1'; e.preventDefault(); });
  lz.addEventListener('pointermove', e => { if (lzD) setLibW(lzD.w + (e.clientX - lzD.x), true); });
  const lzEnd = () => { lzD = null; delete lz.dataset.on; };
  lz.addEventListener('pointerup', lzEnd); lz.addEventListener('pointercancel', lzEnd);
  lz.addEventListener('dblclick', () => setLibW(null));
  lz.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); setLibW(railL.offsetWidth + (e.key === 'ArrowRight' ? 24 : -24), true); } });
  window.addEventListener('resize', () => { const w = parseFloat(document.documentElement.style.getPropertyValue('--vs-lw')); if (w > 0) setLibW(w); });
  document.addEventListener('keydown', e => {
    if (exporting || $('#ask').open) return;
    if (document.querySelector('.gf-ov')) return;                 // Extend photo's editor is a modal with its own keys
    if (HFL.open) { if (e.key === 'Escape') hfClose(); return; }   // the library is a modal: no timeline shortcut reaches under it
    const tg = e.target, typing = tg.matches && tg.matches('input:not([type=range]),textarea,select');
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? restore(redo, undo) : restore(undo, redo); return; }
    if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); dup(); return; }
    if (typing || mod) return;
    if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
    else if (e.key.toLowerCase() === 's') split();
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); del(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); if (playing) pause(); seek(T + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 1 : 1 / 30)); landOn(); }
    else if (e.key === 'Home') seek(0);
    else if (e.key === 'Escape' && pvOn) pvClose();
    else if (e.key === 'Escape' && sel) { sel = null; renderAll(); }
  });
  // files dropped anywhere on the page
  const stage = $('#cvw');
  document.addEventListener('dragover', e => { if (e.dataTransfer && Array.from(e.dataTransfer.types).indexOf('Files') >= 0) e.preventDefault(); });
  let dragN = 0;
  const hasFiles = e => e.dataTransfer && Array.from(e.dataTransfer.types).indexOf('Files') >= 0;
  document.addEventListener('dragenter', e => { if (hasFiles(e)) { dragN++; document.body.dataset.drag = '1'; } });
  document.addEventListener('dragleave', e => { if (hasFiles(e) && --dragN <= 0) { dragN = 0; delete document.body.dataset.drag; } });
  // FROM FINDER ONTO THE TIMELINE (2026-11-26, by request). While files are dragged over the
  // timeline, the track they will land on lights and a marker shows where: a photo over the
  // Graphics track becomes a graphic at that moment, anywhere else on the timeline a clip on the
  // Video track, between the two clips nearest the pointer; a video always goes to Video; a sound
  // to Music, or to Sound when it is over the Sound track. The file type is known while dragging
  // (DataTransfer.items), the files themselves only on drop.
  function dropKind(dt) {
    const it = Array.from(dt.items || []).filter(i => i.kind === 'file'), t = it.map(i => i.type || '');
    if (t.some(x => x.startsWith('video'))) return 'video';
    if (t.some(x => x.startsWith('image'))) return 'image';
    if (t.some(x => x.startsWith('audio'))) return 'audio';
    return it.length ? 'video' : '';          // a .mov often reports no type
  }
  function dropPlan(e) { return planFor(dropKind(e.dataTransfer), e.target, e); }
  function planFor(kind, target, e) {
    if (!kind) return null;
    if (kind === 'logo') kind = 'image';
    const row = target && target.closest && target.closest('.vs-trk'), over = row && row.dataset.trk;
    const t = Math.max(0, xToT(e));
    if ((kind === 'image' || kind === 'video') && over === 'logo' && P.clips.length) return { trk: 'logo', t: snapT(t) };
    if (kind === 'audio') return { trk: over === 'sfx' ? 'sfx' : 'music', t: over === 'sfx' || over === 'music' ? snapT(t) : 0 };
    const st = clipStarts().concat([videoEnd()]); let i = 0, bd = 1e9;   // the gap nearest the pointer
    st.forEach((v, k) => { const d = Math.abs(v - t); if (d < bd) { bd = d; i = k; } });
    return { trk: 'clip', i, t: st[i] || 0 };
  }
  let dropMk = null;
  function dropPaint(pl) {
    tlin.querySelectorAll('.vs-trk[data-drop]').forEach(r => delete r.dataset.drop);
    if (!pl) { if (dropMk) { dropMk.remove(); dropMk = null; } return; }
    const row = tlin.querySelector('.vs-trk[data-trk="' + pl.trk + '"]'); if (!row) return;
    row.dataset.drop = '1';
    if (!dropMk) { dropMk = document.createElement('i'); dropMk.className = 'vs-dropmk'; }
    if (dropMk.parentNode !== row) row.appendChild(dropMk);
    dropMk.dataset.k = pl.trk === 'clip' ? 'gap' : 'at';
    dropMk.style.left = (LBL + pl.t * pps) + 'px';
    dropMk.style.width = pl.trk === 'clip' ? '' : Math.max(24, (pl.trk === 'logo' ? 3 : 4) * pps) + 'px';
  }
  // FROM THE LIBRARY ONTO THE TIMELINE (2026-11-26, by request: "let me drag the video on the
  // motion graphics section"). Any tile can be dragged (pointer events, never native DnD) onto a
  // track; the same light and marker as a Finder drop show where it lands: a photo or video over
  // Motion graphics becomes a motion graphic there, over anything else a clip in the nearest gap
  // on Video; a sound goes to Music, or Sound. A tile clicked without moving still adds as before.
  let lDrag = null, lGhost = null, lSwallow = false;
  function placeMid(mid, pl) {
    const m = media[mid]; if (!m || !pl) return;
    mark(); const keep = T;
    if (m.kind === 'audio') { T = pl.t; addAudio(mid, pl.trk === 'sfx' ? 'sfx' : 'music', true); T = keep; const a = P.audio[P.audio.length - 1]; if (a && a.mid === mid) a.at = pl.t; }
    else if (pl.trk === 'logo') { T = pl.t; addLogo(mid, true); T = keep; const l = P.logos[P.logos.length - 1]; if (l && l.mid === mid) l.at = pl.t; }
    else { addClip(mid, true); const c = P.clips.pop(); P.clips.splice(Math.min(pl.i, P.clips.length), 0, c); }
    renderAll();
  }
  $('#lib').addEventListener('pointerdown', e => {
    if (e.button || e.target.closest('[data-star],[data-more],input,select')) return;
    const t = e.target.closest('[data-addclip],[data-addlogo],[data-addaudio]'); if (!t) return;
    const mid = t.dataset.addclip || t.dataset.addlogo || t.dataset.addaudio; if (!media[mid]) return;
    lDrag = { mid, x0: e.clientX, y0: e.clientY, on: false, pl: null };
  });
  window.addEventListener('pointermove', e => {
    if (!lDrag) return;
    if (!lDrag.on) {
      if (Math.hypot(e.clientX - lDrag.x0, e.clientY - lDrag.y0) < 6) return;
      lDrag.on = true; const m = media[lDrag.mid];
      lGhost = document.createElement('i'); lGhost.className = 'vs-lghost'; lGhost.style.backgroundImage = "url('" + (m.poster || m.url) + "')"; document.body.appendChild(lGhost);
      document.body.dataset.ldrag = '1'; if (playing) pause();
    }
    lGhost.style.transform = 'translate(' + (e.clientX + 10) + 'px,' + (e.clientY + 10) + 'px)';
    const over = document.elementFromPoint(e.clientX, e.clientY), m = media[lDrag.mid];
    lDrag.pl = over && tl.contains(over) ? planFor(m.kind, over, e) : null;
    if (lDrag.pl && m.kind === 'audio' && lDrag.pl.trk === 'music' && !(over.closest('.vs-trk') || {}).dataset) lDrag.pl = null;
    dropPaint(lDrag.pl);
    if (over && tl.contains(over)) { const r = tl.getBoundingClientRect(); if (e.clientX > r.right - 30) tl.scrollLeft += 12; else if (e.clientX < r.left + LBL + 20) tl.scrollLeft -= 12; }
  });
  const lEnd = place => {
    if (!lDrag) return;
    const d = lDrag; lDrag = null;
    if (!d.on) return;
    lSwallow = true; setTimeout(() => { lSwallow = false; }, 0);
    if (lGhost) { lGhost.remove(); lGhost = null; } delete document.body.dataset.ldrag; dropPaint(null);
    if (place && d.pl) placeMid(d.mid, d.pl);
  };
  window.addEventListener('pointerup', () => lEnd(true));
  window.addEventListener('pointercancel', () => lEnd(false));
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && lDrag && lDrag.on) lEnd(false); });
  $('#lib').addEventListener('click', e => { if (lSwallow) { e.stopPropagation(); e.preventDefault(); } }, true);
  tl.addEventListener('dragover', e => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; dropPaint(dropPlan(e)); });
  tl.addEventListener('dragleave', e => { if (!tl.contains(e.relatedTarget)) dropPaint(null); });
  document.addEventListener('drop', e => {
    dragN = 0; delete document.body.dataset.drag;
    const pl = tl.contains(e.target) && e.dataTransfer ? dropPlan(e) : null; dropPaint(null);
    if (!e.dataTransfer || !e.dataTransfer.files.length) return;
    e.preventDefault();
    { const pf = Array.from(e.dataTransfer.files).find(isCasv); if (pf) { openProject(pf); return; } }
    if (pl) { addFiles(e.dataTransfer.files, 'place', pl); return; }
    addFiles(e.dataTransfer.files, stage.contains(e.target) ? 'stage' : (tab === 'logos' ? 'logo' : tab));
  });

  // ── boot ─────────────────────────────────────────────────────────────────────────────
  (async function boot() {
    paintTheme(); paintTransport(); fitCanvas(); partnerLoad(); renderAll();
    const recs = (await DB.all()) || [];
    if (WS.ok) {
      try {
        const dbs = indexedDB.databases ? await indexedDB.databases() : [];
        if (dbs.some(d => d.name === 'provident-video')) {
          const have = {}; recs.forEach(r => { have[r.id] = 1; });
          let fail = false;
          for (const r of await IDB.all()) if (r && r.blob && !have[r.id]) { try { await DB.putStrict(r); recs.push(r); } catch (e) { fail = true; } }
          if (!fail) { try { (await IDB.open()).close(); } catch (e) {} indexedDB.deleteDatabase('provident-video'); }
        }
      } catch (e) {}
    }
    for (const r of recs || []) { try { await probe(r); media[r.id] = r; } catch (e) {} }
    const ok = i => !!media[i.mid];
    P.clips = P.clips.filter(ok); P.audio = P.audio.filter(ok); P.logos = P.logos.filter(ok);
    // the video's id is what ties its files to it: one that went missing or changed is taken back from
    // the files its own timeline uses, so the library never empties itself
    { const own = Object.values(media).some(m => m.pid && m.pid === P.id), cnt = {};
      [P.clips, P.audio, P.logos].forEach(l => (l || []).forEach(x => { const m = media[x.mid]; if (m && m.pid) cnt[m.pid] = (cnt[m.pid] || 0) + 1; }));
      const top = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
      if ((!P.id || !own) && top) { P.id = top; save(); } else if (!P.id) { P.id = uid() + uid(); save(); } }
    Object.values(media).forEach(m => { if (!m.pid || m._newPoster) { if (!m.pid) m.pid = P.id; delete m._newPoster; DB.put(dbRec(m)); } });
    if (P.drive && P.drive.sig === 'open') { P.drive.sig = driveSig(); save(); }
    driveAsk();   // just opened from its ad set: it is as Drive has it
    if (document.fonts && document.fonts.load) { try { await Promise.all([300, 400, 500].map(w => document.fonts.load(w + " 40px 'Google Sans Flex'"))); } catch (e) {} }
    fitCanvas(); renderAll(); animPoll();
    requestAnimationFrame(tick);
    bot.ready = true;
  })();

  // THE BOT'S DOOR (2026-11-19, by request: "give them ability to handover me what they did").
  // The Grok bot's video tools (tools/studio-mcp/video.py on main) drive this page in their own
  // headless Chrome, whose storage is not the user's. Files cross in base64 pieces (push / chunk);
  // the .casv on the bridge's disk is the truth, this page only holds it while a tool runs.
  const botBuf = {}; let botOut = null;
  const b64In = t => { const bin = atob(t), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
  const bnum = (v, d) => (v != null && isFinite(+v) ? +v : d);
  const bpick = (to, from, keys) => { keys.forEach(k => { if (from[k] != null) to[k] = from[k]; }); };
  const bot = {
    ready: false,
    push(key, b64) { (botBuf[key] = botBuf[key] || []).push(b64In(b64)); return botBuf[key].length; },
    take(key, type) { const b = new Blob(botBuf[key] || [], { type: type || '' }); delete botBuf[key]; return b; },
    summary() {
      const used = JSON.stringify(P);
      return { name: P.name || '', size: P.size === '1x1' ? '1:1' : '9:16', seconds: +total().toFixed(2),
        clips: P.clips.map(c => { const m = media[c.mid] || {}; return { id: c.id, media: c.mid, name: m.name, kind: m.kind, from: +c.in.toFixed(2), to: +c.out.toFixed(2), speed: Math.round((c.rate || 1) * 100), seconds: +clipLen(c).toFixed(2), fit: c.fit, mute: !!c.mute }; }),
        texts: P.texts.map(t => ({ id: t.id, at: t.at, seconds: t.dur, eyebrow: t.eyebrow, text: plain(t.text), sub: t.sub, size: t.size, pos: t.pos, align: t.align, anim: t.anim })),
        audio: P.audio.map(a => ({ id: a.id, media: a.mid, name: (media[a.mid] || {}).name, track: a.track, at: a.at, seconds: a.dur, speed: Math.round((a.rate || 1) * 100), volume: a.vol })),
        wordmark: { on: P.brand.on, align: P.brand.align, vpos: P.brand.vpos, ink: P.brand.ink },
        media: Object.values(media).filter(m => used.indexOf('"' + m.id + '"') >= 0 || m.bot).map(m => ({ id: m.id, kind: m.kind, name: m.name, seconds: m.dur ? +m.dur.toFixed(2) : undefined, width: m.w, height: m.h })) };
    },
    start(name, size) {
      P = fresh(); if (size === '1:1' || size === '1x1') P.size = '1x1'; if (name) P.name = String(name).slice(0, 60);
      Object.values(media).forEach(m => { delete m.bot; }); sel = null; T = 0; partnerLoad(); renderAll(); return bot.summary();
    },
    async open(key) {
      const u = await casUnpack(bot.take(key));
      for (const r of u.recs) { await probe(r); media[r.id] = r; r.bot = 1; DB.put(dbRec(r)); }
      P = Object.assign(fresh(), u.head.project); P.brand = Object.assign(fresh().brand, u.head.project.brand); if (!SIZES[P.size]) P.size = '9x16';
      sel = null; T = 0; partnerLoad(); renderAll(); return bot.summary();
    },
    async addMedia(key, name, type, as) {
      const had = new Set(Object.keys(media)), n = P.clips.length;
      await addFiles([new File([bot.take(key, type)], name, { type })], as === 'logo' ? 'logo' : 'media');
      P.clips.length = Math.min(P.clips.length, n);          // nothing lands on the timeline unasked
      const id = Object.keys(media).find(k => !had.has(k)); if (!id) throw new Error('The studio could not read ' + name + '. Video must be MP4 (H.264); photos JPG or PNG; sound MP3, WAV or M4A.');
      const m = media[id]; m.bot = 1; await DB.put(dbRec(m)); sel = null; renderAll();
      return { id, kind: m.kind, name: m.name, seconds: m.dur ? +m.dur.toFixed(2) : undefined, width: m.w, height: m.h };
    },
    edit(ops) {
      const done = [], byId = id => { for (const k of ['clips', 'texts', 'audio']) { const i = P[k].findIndex(x => x.id === id); if (i >= 0) return [k, i]; } throw new Error('Nothing on the timeline has the id ' + id + '.'); };
      const SZ = ['Small', 'Medium', 'Large', 'Jumbo'], inList = (v, l, what) => { if (v != null && l.indexOf(v) < 0) throw new Error(what + ' must be one of: ' + l.join(', ') + '.'); };
      const textSet = (t, o) => {
        inList(o.size, SZ, 'size'); inList(o.pos, ['top', 'centre', 'bottom'], 'pos'); inList(o.align, ['left', 'centre'], 'align'); inList(o.anim, ANIMS.map(a => a[0]), 'anim');
        bpick(t, o, ['size', 'pos', 'align', 'anim']); ['eyebrow', 'sub'].forEach(k => { if (o[k] != null) t[k] = String(o[k]).slice(0, 200); });
        if (o.text != null) t.text = String(o.text).slice(0, 300); if (o.at != null) t.at = Math.max(0, bnum(o.at, t.at)); if (o.seconds != null) t.dur = clamp(bnum(o.seconds, t.dur), .2, 120);
      };
      const clipSet = (c, o) => {
        const m = media[c.mid];
        if (m.kind === 'image') { if (o.seconds != null) { c.in = 0; c.out = clamp(bnum(o.seconds, 3), .2, 30); } }
        else { if (o.from != null) c.in = clamp(bnum(o.from, 0), 0, Math.max(0, m.dur - .2)); if (o.to != null || o.from != null) c.out = clamp(bnum(o.to, c.out), c.in + .2, m.dur); if (o.speed != null) setRate(c, 'clip', bnum(o.speed, 100) / 100); }
        inList(o.fit, ['fill', 'fit'], 'fit'); bpick(c, o, ['fit']); if (o.mute != null) c.mute = !!o.mute;
      };
      for (const o of ops || []) {
        if (o.op === 'add_clip') {
          const m = media[o.media]; if (!m || (m.kind !== 'video' && m.kind !== 'image')) throw new Error('add_clip: no video or photo has the media id ' + o.media + '.');
          addClip(o.media, true); const c = P.clips.pop(); clipSet(c, o);
          P.clips.splice(o.index == null ? P.clips.length : clamp(o.index | 0, 0, P.clips.length), 0, c); done.push({ op: o.op, id: c.id });
        } else if (o.op === 'add_text') {
          const pre = o.preset || 'headline'; inList(pre, ['headline', 'full', 'caption', 'centre', 'number'], 'preset');
          T = Math.max(0, bnum(o.at, 0)); addText(pre); const t = P.texts[P.texts.length - 1]; if (pre === 'full') { t.eyebrow = ''; t.sub = ''; } textSet(t, o); done.push({ op: o.op, id: t.id });
        } else if (o.op === 'add_audio') {
          const m = media[o.media]; if (!m || m.kind !== 'audio') throw new Error('add_audio: no sound has the media id ' + o.media + '.');
          const track = o.track === 'sound' ? 'sound' : 'music'; T = Math.max(0, bnum(o.at, 0)); addAudio(o.media, track, true);
          const a = P.audio[P.audio.length - 1]; if (o.volume != null) a.vol = clamp(bnum(o.volume, a.vol), 0, 1); if (o.speed != null) setRate(a, 'audio', bnum(o.speed, 100) / 100); done.push({ op: o.op, id: a.id });
        } else if (o.op === 'set') {
          const w = byId(o.id), it = P[w[0]][w[1]];
          if (w[0] === 'clips') { clipSet(it, o); if (o.index != null) { P.clips.splice(w[1], 1); P.clips.splice(clamp(o.index | 0, 0, P.clips.length), 0, it); } }
          else if (w[0] === 'texts') textSet(it, o);
          else { if (o.at != null) it.at = Math.max(0, bnum(o.at, it.at)); if (o.seconds != null) it.dur = clamp(bnum(o.seconds, it.dur), .2, (media[it.mid] || {}).dur || 600); if (o.volume != null) it.vol = clamp(bnum(o.volume, it.vol), 0, 1); }
          done.push({ op: o.op, id: o.id });
        } else if (o.op === 'remove') { const w = byId(o.id); P[w[0]].splice(w[1], 1); done.push({ op: o.op, id: o.id }); }
        else if (o.op === 'wordmark') {
          inList(o.align, ['left', 'centre'], 'align'); inList(o.vpos, ['top', 'bottom'], 'vpos'); inList(o.ink, ['white', 'navy'], 'ink');
          bpick(P.brand, o, ['align', 'vpos', 'ink']); if (o.on != null) P.brand.on = !!o.on; done.push({ op: o.op });
        } else if (o.op === 'size') { inList(o.size, ['9:16', '1:1'], 'size'); P.size = o.size === '1:1' ? '1x1' : '9x16'; done.push({ op: o.op }); }
        else if (o.op === 'name') { P.name = String(o.name || '').slice(0, 60); done.push({ op: o.op }); }
        else throw new Error('Unknown op ' + o.op + '. Use add_clip, add_text, add_audio, set, remove, wordmark, size or name.');
      }
      sel = null; T = 0; renderAll();
      return { done, project: bot.summary() };
    },
    async pack() { botOut = await casPack(P); return botOut.size; },
    async chunk(i, n) {
      const u = new Uint8Array(await botOut.slice(i, i + n).arrayBuffer()); let t = '';
      for (let k = 0; k < u.length; k += 32768) t += String.fromCharCode.apply(null, u.subarray(k, k + 32768));
      return btoa(t);
    }
  };
  // a small handle for tests and the console
  window.VideoStudio = { get project() { return P; }, get time() { return T; }, media, stats, bot, addFiles, importScript, parseScript, seek, play, pause, split, total, draw: () => { sync(); draw(); } };
})();
