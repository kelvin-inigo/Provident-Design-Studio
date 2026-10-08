// Injected into every studio page the MCP server's headless Chrome loads. It reaches the
// studio's OWN engine — the same `buildOps`, renderers, `normState`, `doExport` and file
// names the buttons use — so nothing here is a second implementation of the artwork.
(() => {
  if (window.__ps) return;
  const ps = window.__ps = {};
  // a headless page has nobody to answer a dialog
  window.confirm = () => true;
  window.alert = () => {};
  window.prompt = () => null;

  ps.studio = () => /Campaign/.test(decodeURIComponent(location.pathname)) ? 'cas' : 'ops';
  ps.eng = () => {
    const el = document.querySelector('.p-shell');
    if (!el) return null;
    const k = Object.keys(el).find(n => n.indexOf('__reactFiber$') === 0);
    let f = k && el[k];
    while (f) {
      const sn = f.stateNode;
      if (sn && sn.logic && typeof sn.logic.active === 'function') return sn.logic.active() || null;
      f = f.return;
    }
    return null;
  };
  ps.C = () => { const E = ps.eng(); return E && E.constructor; };
  ps.ready = () => {
    const E = ps.eng();
    return !!(E && E.state && (E.state.slides || E.state.variants));
  };
  ps.prefix = () => ps.studio() === 'cas' ? /^adstudio-/ : /^smp-/;
  ps.sleep = ms => new Promise(r => setTimeout(r, ms));
  ps.sidecar = async () => {
    try { const r = await fetch('.image-slots.state.json', { cache: 'no-store' }); return r.ok ? await r.json() : {}; }
    catch (e) { return {}; }
  };
  ps.own = async () => {
    const sc = await ps.sidecar(), own = {}, re = ps.prefix();
    Object.keys(sc).forEach(k => { if (re.test(k) && sc[k]) own[k] = sc[k]; });
    return own;
  };
  ps.warm = async () => {
    const E = ps.eng(), C = ps.C();
    const load = f => { try { return document.fonts.load(f).catch(() => null); } catch (e) { return null; } };
    const faces = [];
    [300, 400, 500].forEach(w => [24, 41, 103].forEach(px => faces.push(w + ' ' + px + 'px "Google Sans Flex"')));
    await Promise.all(faces.map(load));
    try { if (E && E.warmFaces) await E.warmFaces(); } catch (e) {}
    try { if (C && C.bundledReady) await C.bundledReady(); } catch (e) {}
    try { await document.fonts.ready; } catch (e) {}
  };

  // ── load a session into this page: the studio's own applyProject, minus its reload
  // (the server reloads, then waits for ps.ready) ──
  ps.apply = async (session) => {
    const E = ps.eng();
    if (!E) throw new Error('The studio did not start.');
    E.reloadNow = () => {};
    try { StudioBase.reloading = true; } catch (e) {}
    await E.applyProject(session.state, session.images || {});
    return true;
  };
  ps.session = async () => {
    const E = ps.eng(), cas = ps.studio() === 'cas';
    const st = JSON.parse(JSON.stringify(E.state));
    st.exportStatus = '';
    return JSON.stringify({ app: E.sessionApp(), v: cas ? 2 : 3, state: st, images: await ps.own() });
  };

  // ── a new project, built exactly as picking the template card builds it ──
  ps.fresh = (template, name) => {
    const C = ps.C();
    if (ps.studio() === 'cas') {
      let d;
      if (template && template !== 'blank') {
        const t = C.TPL.find(x => x.id === template || x.name.toLowerCase() === String(template).toLowerCase());
        if (!t) throw new Error('No CAS template "' + template + '". Use one of: ' + C.TPL.map(x => x.name).join(', ') + ', or blank.');
        d = C.tplState(t.id);
      } else {
        d = C.defaults();
        d.modules = [{ id: 'm1', type: 'eyebrow', text: '' }, { id: 'm2', type: 'hero', text: '' }];
      }
      d.screen = 'editor';
      d.campaign = name || '';
      d.pid = StudioBase.newPid();
      return { app: 'provident-ad-studio', v: 2, state: d, images: {} };
    }
    const T = ps.opsTemplates();
    const key = Object.keys(T).find(k => k === template || T[k].toLowerCase() === String(template || '').toLowerCase());
    if (!key) throw new Error('No OPS template "' + template + '". Use one of: ' + Object.keys(T).map(k => k + ' (' + T[k] + ')').join(', ') + '.');
    const d = C.defaults();
    d.pid = StudioBase.newPid();
    d.screen = 'guide'; d.gdStep = 0; d.guided = false;
    d.tpl = key;
    d.slides = C.tplSlides(key);
    if (name) d.customName = name;
    return { app: 'provident-smp-studio', v: 3, state: d, images: {} };
  };
  ps.opsTemplates = () => ({ listed: 'Just listed / sold', weekly: 'Weekly listings', review: 'Google reviews', agents: 'Top agents', award: 'Congratulations award', carousel: 'Carousel', rcover: 'Reel thumbnail' });

  // ── what a template asks for ──
  const parseOpts = flags => {
    const m = /(?:^|\s)(seg-opt|seg|sel):(.+)$/.exec(flags || '');
    return m ? m[2].split('|') : null;
  };
  const fieldOut = (fl, f) => {
    const flags = fl.flags || '';
    const o = { key: fl.k, label: fl.t, value: f ? f[fl.k] : undefined };
    if (/(^|\s)req(\s|$)/.test(flags)) o.required = true;
    const opts = parseOpts(flags); if (opts) o.options = opts;
    if (/(^|\s)pts(\s|$)/.test(flags)) o.format = 'points joined by " | " (each becomes a chip)';
    else if (/(^|\s)(num|digits|len11)(\s|$)/.test(flags)) o.format = 'numbers only';
    else if (/(^|\s)step(\s|$)/.test(flags)) o.format = 'a whole number, as a string';
    else if (/(^|\s)area(\s|$)/.test(flags)) o.format = 'multi-line text';
    if (/sel@ptypes/.test(flags)) o.suggestions = (ps.eng().state.ptypes || ['Apartment', 'Villa', 'Townhouse', 'Penthouse']);
    if (fl.hint) o.hint = fl.hint;
    return o;
  };
  ps.catalog = () => {
    const C = ps.C();
    if (ps.studio() === 'cas') {
      return {
        studio: 'CAS — Campaign Ads Studio (paid Meta ads 1:1 / 9:16 / 16:9, Eventbrite banners 2:1)',
        templates: [{ id: 'blank', name: 'Blank', description: 'A small label and a heading' }]
          .concat(C.TPL.map(t => ({ id: t.id, name: t.name, description: t.desc, components: t.mods.map(m => m[0]) }))),
        components: Object.keys(C.VOPT).map(type => ({
          type, name: (C.COPY_NAME || {})[type] || type, what: (C.COPY_WHAT || {})[type] || '',
          styles: C.VOPT[type].map(([id, label]) => ({ id, label, what: ((C.VDESC || {})[type] || {})[id] || '' })),
          fields: casFieldsDoc(type),
        })),
        sizes: (C.SIZES || []).map(s => s[0]),
        notes: 'Words live on the components. A single ad shares one component list across its design variants (the Master and Variants 2-3 differ in layout and style). A carousel gives every page its own list. Clusters are "top" or "bottom".',
      };
    }
    const T = ps.opsTemplates();
    return {
      studio: 'OPS — Organic Post Studio (feed 3:4 and story 9:16 posts from locked templates)',
      templates: Object.keys(T).map(id => ({
        id, name: T[id],
        slides: C.tplSlides(id).map(sl => ({ kind: sl.kind, page: (C.PAGE[sl.kind] || [])[0], purpose: (C.PAGE[sl.kind] || [])[1] })),
        grows: C.growMax(id) ? { kind: (C.GROWKIND || {})[id], max_slides: C.growMax(id) } : null,
      })),
      slide_kinds: Object.keys(C.FIELDS).map(kind => ({
        kind, page: (C.PAGE[kind] || [])[0], purpose: (C.PAGE[kind] || [])[1],
        template_owns: (C.FIXEDTEXT || {})[kind] || [],
        fields: (C.FIELDS[kind] || []).map(([k, tier, t, flags, hint]) => fieldOut({ k, t, flags, hint })),
      })),
      notes: 'Every field marked required must be filled before export. Text in Title Case fields keeps any word typed in CAPITALS. Carousel headlines take **word** for a brass highlight.',
    };
  };
  const casFieldsDoc = type => ({
    eyebrow: { text: 'one line' }, hero: { text: 'up to 4 lines, \\n between them' }, hook: { text: 'up to 4 lines' },
    body: { text: 'up to 4 lines' }, list: { text: 'one point per line' }, steps: { text: 'one step per line' },
    cta: { text: 'button label' }, price: { sub: 'small label, e.g. Prices from', text: 'figure, e.g. AED 2.6M' },
    tags: { chips: 'array of short strings' }, spec: { cols: 'array of {l: label, v: value}' },
    divider: {}, spacer: { h: 'height in canvas px' }, graphic: { text: 'a name for the file' },
  })[type] || {};

  // ── the image slots this project has, and which are filled ──
  ps.slots = async () => {
    const E = ps.eng(), C = ps.C(), s = E.state, own = await ps.own(), out = [];
    const add = (slot, label, extra) => out.push(Object.assign({ slot, label, filled: !!own[slot] }, extra || {}));
    if (ps.studio() === 'cas') {
      const lab = vi => C.isCarousel(s) ? 'Page ' + (vi + 1) : (vi === 0 ? 'Master' : 'Variant ' + (vi + 1));
      s.variants.forEach((v, vi) => {
        add('adstudio-bg-' + vi, lab(vi) + ' — background photo', { note: 'used by every size unless that size has its own photo' });
        add('adstudio-bg-' + vi + '-st', lab(vi) + ' — own 9:16 photo', { optional: true });
        if (v.wide) add('adstudio-bg-' + vi + '-ls', lab(vi) + ' — own 16:9 photo', { optional: true });
        if (v.banner) add('adstudio-bg-' + vi + '-bn', lab(vi) + ' — Eventbrite banner photo', { optional: true });
        add('adstudio-fg-' + vi, lab(vi) + ' — overlap cut-out (PNG with transparency)', { optional: true });
      });
      add('adstudio-qr', 'QR code', { optional: true });
      add('adstudio-colog', 'Partner (co-brand) logo', { optional: true });
      C.allMods(s).forEach(m => {
        if (m.type === 'graphic') add('adstudio-mod-' + m.id, 'Graphic component ' + m.id);
        const n = m.type === 'steps' ? String(m.text || '').split('\n').filter(x => x.trim()).length
          : m.type === 'tags' ? (m.chips || []).length : m.type === 'spec' ? (m.cols || []).length : 0;
        for (let i = 0; i < Math.min(n, C.ICON_MAX || 6); i++) add('adstudio-ic-' + m.id + '-' + i, (C.COPY_NAME[m.type] || m.type) + ' ' + m.id + ' icon ' + (i + 1), { optional: true });
      });
      return out;
    }
    s.slides.forEach((sl, si) => {
      const L = E.sLabel(si);
      if (C.photoUsed(sl.kind) && E.bgSidFor(sl) === sl.id) {
        const cut = sl.kind === 'tagent';
        add('smp-bg-' + sl.id, L + ' — ' + (cut ? 'agent portrait (cut out automatically)' : 'background photo'), cut ? { remove_background: true } : null);
      }
      if (sl.kind === 'listed' || sl.kind === 'rcover') add('smp-fg-' + sl.id, L + ' — parallax cut-out (PNG with transparency)', { optional: true });
      if (sl.kind === 'prop') add('smp-qr-' + sl.id, L + ' — QR code', { required: true });
      if (sl.kind === 'review') add('smp-agent-r' + sl.id, L + ' — agent photo (cut out automatically)', { remove_background: true, optional: true });
      if (sl.kind === 'cstats') for (let i = 0; i < C.csN(sl.f || {}); i++) add('smp-ic-' + sl.id + '-' + i, L + ' — stat icon ' + (i + 1), { optional: true });
      if (C.isCs(sl.kind)) add('smp-cg-' + sl.id, L + ' — floating graphic', { optional: true });
    });
    if (s.tpl === 'listed') { add('smp-qr', 'QR code', { required: true }); add('smp-agent', 'Agent photo (cut out automatically)', { remove_background: true }); }
    if (s.tpl === 'weekly') add('smp-qr-cover', 'Cover / closing slide QR code', { required: true });
    if (s.tpl === 'award') add('smp-alogo', 'Partner logo', { optional: true });
    return out;
  };

  // ── a readable summary of the loaded project ──
  ps.summary = async () => {
    const E = ps.eng(), C = ps.C(), s = E.state;
    const slots = await ps.slots();
    if (ps.studio() === 'cas') {
      const lab = vi => C.isCarousel(s) ? 'Page ' + (vi + 1) : (vi === 0 ? 'Master' : 'Variant ' + (vi + 1));
      const textOf = m => {
        const o = {};
        ['text', 'sub', 'chips', 'cols', 'h'].forEach(k => { if (m[k] !== undefined) o[k] = m[k]; });
        return o;
      };
      return {
        studio: 'cas', campaign: s.campaign || '', mode: C.isCarousel(s) ? 'carousel' : 'single',
        platform: C.isYT && C.isYT(s) ? 'youtube' : 'meta',
        youtube_text: C.isYT && C.isYT(s) ? C.ytOf(s) : undefined,
        story_shown: C.storyShown ? C.storyShown(s) : true,
        variants: s.variants.map((v, vi) => {
          const mods = C.modulesFor(s, vi);
          const ord = C.orderedFor ? C.orderedFor(v, mods) : mods;
          return {
            index: vi, label: lab(vi), background: v.bg, align: v.align, logo: v.logoPos || 'top',
            sizes: C.sizesFor(s, v), banner: !!v.banner, wide_16x9: !!v.wide,
            components: ord.map(m => Object.assign({
              id: m.id, type: m.type, name: (C.COPY_NAME || {})[m.type] || m.type,
              cluster: (v.clusters || {})[m.id] || 'bottom',
              style: (v.mvar || {})[m.id] || ((C.VOPT[m.type] || [[null]])[0][0]),
              size: (v.msize || {})[m.id] || 'm',
              hidden: !!((v.hidden || {})[m.id]),
            }, textOf(m))),
          };
        }),
        image_slots: slots,
      };
    }
    const T = ps.opsTemplates();
    let blockers = [];
    try { blockers = E.exportBlockers(); } catch (e) {}
    const empties = [];
    s.slides.forEach((sl, si) => C.fieldsFor(sl.kind, sl.f || {}).forEach(fl => {
      if (/(^|\s)req(\s|$)/.test(fl.flags) && !String((sl.f || {})[fl.k] == null ? '' : sl.f[fl.k]).trim()) empties.push(E.sLabel(si) + ' — ' + fl.t);
    }));
    return {
      studio: 'ops', template: s.tpl, template_name: T[s.tpl], file_base_name: E.baseName(),
      story_shown: !!s.storyOn && s.tpl !== 'rcover',
      project: { customName: s.customName || '', agent: s.agent, permit: s.permit, glassFill: s.glassFill || 'white', scrimH: s.scrimH, imgO: s.imgO, storyOn: !!s.storyOn, month: s.month, week: s.week },
      slides: s.slides.map((sl, si) => ({
        index: si, id: sl.id, kind: sl.kind, label: E.sLabel(si), page: (C.PAGE[sl.kind] || [])[0],
        fields: C.fieldsFor(sl.kind, sl.f || {}).map(fl => fieldOut(fl, sl.f || {})),
        other_values: Object.keys(sl.f || {}).filter(k => !C.fieldsFor(sl.kind, sl.f || {}).some(fl => fl.k === k)).reduce((o, k) => (o[k] = sl.f[k], o), {}),
      })),
      image_slots: slots,
      missing_before_export: empties.concat(blockers),
      can_add_slide: C.growMax(s.tpl) ? { kind: (C.GROWKIND || {})[s.tpl], max_slides: C.growMax(s.tpl) } : null,
    };
  };

  // ── edits, applied through the engine's own update so they are exactly what the rail does ──
  const setPath = (o, path, value) => {
    const ks = String(path).split('.');
    let t = o;
    for (let i = 0; i < ks.length - 1; i++) {
      const k = /^\d+$/.test(ks[i]) ? +ks[i] : ks[i];
      if (t[k] == null || typeof t[k] !== 'object') t[k] = /^\d+$/.test(ks[i + 1]) ? [] : {};
      t = t[k];
    }
    const last = /^\d+$/.test(ks[ks.length - 1]) ? +ks[ks.length - 1] : ks[ks.length - 1];
    if (value === null) delete t[last]; else t[last] = value;
  };
  const stringy = v => (typeof v === 'number' ? String(v) : v);
  ps.edit = async (ops) => {
    const E = ps.eng(), C = ps.C(), cas = ps.studio() === 'cas', log = [];
    // CAS's mode switch and Add Variant go through the rail's own actions (they fork pages and
    // copy art), so they run first, one at a time, outside the batched update
    for (const op of ops) {
      if (!cas) break;
      const rv = E.renderVals();
      if (op.op === 'set_mode') { (op.mode === 'carousel' ? rv.modeCarousel : rv.modeSingle)(); await ps.sleep(120); log.push('mode → ' + op.mode); }
      // the platform switch: YouTube Demand Gen forces a single ad and carries the four Google ratios
      if (op.op === 'set_platform') { (op.platform === 'youtube' ? rv.platYt : rv.platMeta)(); await ps.sleep(120); log.push('platform → ' + op.platform); }
      if (op.op === 'youtube_text') { E.upd(x => { x.yt = C.ytOf(x); if (typeof op.business === 'string') x.yt.biz = op.business; if (Array.isArray(op.headlines)) op.headlines.slice(0, 5).forEach((t, i) => { x.yt.heads[i] = String(t); }); if (Array.isArray(op.descriptions)) op.descriptions.slice(0, 5).forEach((t, i) => { x.yt.descs[i] = String(t); }); return x; }); await ps.sleep(80); log.push('YouTube text set' + (C.ytIssues(E.state).length ? ' — over limit: ' + C.ytIssues(E.state).join(', ') : '')); }
      if (op.op === 'add_variant') { rv.addVariant(); await ps.sleep(250); log.push('added ' + (C.isCarousel(E.state) ? 'a page' : 'a variant')); }
    }
    let err = null;
    E.upd(x => {
      try {
        for (const op of ops) {
          const o = op.op;
          if (o === 'set') { setPath(x, op.path, op.value); log.push('set ' + op.path); continue; }
          if (cas) {
            const vi = op.variant == null ? (x.activeVi || 0) : op.variant;
            if (o === 'set_mode' || o === 'add_variant') continue;
            if (o === 'component') {
              const m = C.modList(x, vi).find(z => z.id === op.id);
              if (!m) throw new Error('No component "' + op.id + '" on ' + (vi ? 'variant ' + (vi + 1) : 'the Master'));
              Object.assign(m, op.fields || {});
              const v = x.variants[vi];
              if (op.style) { v.mvar = v.mvar || {}; v.mvar[op.id] = op.style; }
              if (op.size) { v.msize = v.msize || {}; v.msize[op.id] = op.size; }
              if (op.cluster) { (C.isCarousel(x) ? [v] : x.variants).forEach(w => { w.clusters = w.clusters || {}; w.clusters[op.id] = op.cluster; }); }
              if (op.hidden != null) { v.hidden = v.hidden || {}; if (op.hidden) v.hidden[op.id] = true; else delete v.hidden[op.id]; }
              log.push('component ' + op.id); continue;
            }
            if (o === 'add_component') {
              if (!C.VOPT[op.type]) throw new Error('Unknown component type "' + op.type + '"');
              const m = Object.assign({ id: C.freshId(), type: op.type }, JSON.parse(JSON.stringify((C.COPY_BLANK || {})[op.type] || {})), op.fields || {});
              const list = C.modList(x, vi);
              const at = op.after ? list.findIndex(z => z.id === op.after) + 1 : list.length;
              list.splice(at > 0 ? at : list.length, 0, m);
              (C.isCarousel(x) ? [x.variants[vi]] : x.variants).forEach(w => {
                w.clusters = w.clusters || {}; w.clusters[m.id] = op.cluster || 'bottom';
                if (Array.isArray(w.ord)) { const j = op.after ? w.ord.indexOf(op.after) + 1 : w.ord.length; w.ord.splice(j > 0 ? j : w.ord.length, 0, m.id); }
              });
              if (op.style) { x.variants[vi].mvar = x.variants[vi].mvar || {}; x.variants[vi].mvar[m.id] = op.style; }
              if (op.size) { x.variants[vi].msize = x.variants[vi].msize || {}; x.variants[vi].msize[m.id] = op.size; }
              log.push('added ' + op.type + ' ' + m.id); continue;
            }
            if (o === 'remove_component') { C.dropMod(x, vi, op.id); log.push('removed ' + op.id); continue; }
            if (o === 'variant') { Object.assign(x.variants[vi], op.fields || {}); log.push('variant ' + vi); continue; }
            throw new Error('Unknown CAS edit "' + o + '"');
          }
          const si = op.slide;
          if (o === 'fields') {
            const sl = x.slides[si];
            if (!sl) throw new Error('No slide ' + si);
            Object.keys(op.fields || {}).forEach(k => {
              let v = stringy(op.fields[k]);
              if (Array.isArray(v)) v = v.map(String).join(' | ');
              sl.f[k] = v;
            });
            log.push('slide ' + si + ' fields'); continue;
          }
          if (o === 'add_slide') {
            const kind = op.kind || (C.GROWKIND || {})[x.tpl];
            if (!kind) throw new Error('This template does not take extra slides.');
            const max = C.growMax(x.tpl);
            if (max && x.slides.length >= max + (x.tpl === 'weekly' ? 2 : 0)) throw new Error('This template is at its cap.');
            const seed = C.isCs(kind) ? C.csSeed(kind) : (C.tplSlides(x.tpl).find(z => z.kind === kind) || { f: {} }).f;
            const sl = C.slide(kind, JSON.parse(JSON.stringify(seed)));
            Object.keys(op.fields || {}).forEach(k => { let v = stringy(op.fields[k]); if (Array.isArray(v)) v = v.map(String).join(' | '); sl.f[k] = v; });
            let at = op.at == null ? x.slides.length : op.at;
            // a closing slide stays last
            const last = x.slides[x.slides.length - 1];
            if (op.at == null && last && (last.kind === 'cta' || last.kind === 'ccta')) at = x.slides.length - 1;
            x.slides.splice(at, 0, sl);
            log.push('added ' + kind + ' at ' + at); continue;
          }
          if (o === 'remove_slide') { if (x.slides.length < 2) throw new Error('A post keeps at least one slide.'); x.slides.splice(si, 1); x.activeSi = 0; log.push('removed slide ' + si); continue; }
          if (o === 'move_slide') { const [sl] = x.slides.splice(si, 1); x.slides.splice(op.to, 0, sl); log.push('moved ' + si + ' → ' + op.to); continue; }
          if (o === 'layout') {
            if (!C.isCs(op.kind)) throw new Error('Carousel layouts are: ' + C.CS_KINDS.join(', '));
            const sl = x.slides[si]; const r = C.csConvert(sl, op.kind);
            if (r && r !== sl) x.slides[si] = r; else if (!r) sl.kind = op.kind;
            log.push('slide ' + si + ' → ' + op.kind); continue;
          }
          throw new Error('Unknown OPS edit "' + o + '"');
        }
        return C.normState(x) || x;
      } catch (e) { err = e; return x; }
    });
    await ps.sleep(150);
    if (err) throw err;
    return log;
  };

  // ── an image into a slot, through the studio's own encoder (and background removal) ──
  ps.image = async (slot, b64, name, type, cut) => {
    const bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    let file = new File([u8], name, { type });
    let note = '';
    if (cut) {
      const svc = window.providentCutout;
      try {
        if (svc && svc.probe) await svc.probe();
        file = await svc.run(file);
        note = 'background removed';
      } catch (e) {
        note = (e && e.message === 'OFFLINE')
          ? 'background NOT removed — the removal service is off (run tools/rembg/install.sh, or start tools/rembg/serve.sh)'
          : 'background NOT removed — ' + ((e && e.message) || e);
      }
    }
    const url = await window.providentEncodeFile(file);
    const IS = customElements.get('image-slot');
    IS.putUrl(slot, url);
    for (let i = 0; i < 40; i++) { const own = await ps.own(); if (own[slot] && (own[slot].u || own[slot]) === url) break; await ps.sleep(100); }
    return note;
  };
  ps.clear = async (slot) => {
    customElements.get('image-slot').clearSlot(slot);
    for (let i = 0; i < 30; i++) { const own = await ps.own(); if (!own[slot]) break; await ps.sleep(100); }
    return true;
  };

  const b64of = async (data) => {
    const u8 = data instanceof Uint8Array ? data : new Uint8Array(await new Blob([data]).arrayBuffer());
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  };

  // ── look at it: the export's own render at a reduced scale ──
  ps.preview = async (opt) => {
    opt = opt || {};
    await ps.warm();
    const E = ps.eng(), C = ps.C(), s = E.state, cas = ps.studio() === 'cas', out = [];
    const scale = opt.scale || 0.5;
    if (cas) {
      const assets = await E.loadAssets(s);
      const want = opt.indexes;
      for (let vi = 0; vi < s.variants.length; vi++) {
        if (want && want.indexOf(vi) < 0) continue;
        const sizes = opt.sizes || ['sq'];
        for (const sz of sizes) {
          if (!C.sizesFor(s, s.variants[vi]).includes(sz)) continue;
          const built = E.buildOps(s, vi, sz, assets);
          const c = E.renderOpsToCanvas(built, scale);
          out.push({ label: (C.isCarousel(s) ? 'Page ' + (vi + 1) : (vi ? 'Variant ' + (vi + 1) : 'Master')) + ' · ' + sz, data: c.toDataURL('image/jpeg', 0.86).split(',')[1] });
        }
      }
      return out;
    }
    const main = s.tpl === 'rcover' ? 'st' : 'ft';
    const sizes = opt.sizes || [main];
    const assetsBy = {};
    for (const sz of sizes) assetsBy[sz] = await E.loadAssets(s, sz);
    for (let si = 0; si < s.slides.length; si++) {
      if (opt.indexes && opt.indexes.indexOf(si) < 0) continue;
      for (const sz of sizes) {
        if (s.tpl === 'rcover' && sz === 'ft') continue;
        const built = E.buildOps(s, si, sz, assetsBy[sz]);
        const c = E.renderOpsToCanvas(built, scale);
        out.push({ label: E.sLabel(si) + ' · ' + (sz === 'ft' ? 'feed 3:4' : 'story 9:16'), data: c.toDataURL('image/jpeg', 0.86).split(',')[1] });
      }
    }
    return out;
  };

  // ── the studio's own export, with delivery handed back to the server ──
  ps.export = async (kind, withProject) => {
    await ps.warm();
    const E = ps.eng();
    let got = null;
    E.deliver = async (files, name) => { got = { files, name }; return true; };
    E.saveAs = async (blob, name) => { got = { files: [{ name, data: new Uint8Array(await blob.arrayBuffer()) }], name }; return 'saved'; };
    E.setState({ exportStatus: '' });
    await E.doExport(kind);
    await ps.sleep(50);
    const status = E.state.exportStatus || '';
    if (!got) throw new Error(status || 'The export produced no files.');
    let files = got.files.slice();
    if (withProject && kind !== 'pdf') files = files.concat(await E.projectFiles(got.name));
    const out = [];
    for (const f of files) out.push({ name: f.name, b64: await b64of(f.data) });
    return { name: got.name, status, files: out };
  };
})();
