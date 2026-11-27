// PDS extension, inside PDS's own pages (the MAIN world). The background calls these helpers
// with chrome.scripting.executeScript({world:'MAIN'}). They reach each studio's own engine the
// way tools/studio-mcp/page.js does, so a delivered photo or listing goes through the studio's
// own encoder, slots and applyProject; nothing here paints artwork.
(() => {
  if (window.__pdsExt) return;
  const X = window.__pdsExt = { v: 1 };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const path = () => decodeURIComponent(location.pathname);
  X.studio = () => /Campaign Studio/.test(path()) ? 'cas' : /Organic Studio/.test(path()) ? 'ops' : /casv-save\.html$/.test(path()) ? 'casv-save' : 'home';
  const eng = () => {
    const el = document.querySelector('.p-shell'); if (!el) return null;
    const k = Object.keys(el).find(n => n.indexOf('__reactFiber$') === 0);
    for (let f = k && el[k]; f; f = f.return) { const sn = f.stateNode; if (sn && sn.logic && typeof sn.logic.active === 'function') return sn.logic.active() || null; }
    return null;
  };
  const waitEng = async (ms = 20000) => { for (let t = 0; t < ms; t += 200) { const E = eng(); if (E && E.state) return E; await sleep(200); } throw new Error('The studio did not finish loading.'); };
  const IS = () => customElements.get('image-slot');
  const fileOf = async (dataUrl, name) => { const b = await (await fetch(dataUrl)).blob(); return new File([b], name || 'photo', { type: b.type }); };

  // where am I: the studio, whether a project is open, its name
  X.where = () => {
    const E = eng(), s = E && E.state, st = X.studio();
    const open = !!(s && (st === 'cas' ? s.screen === 'editor' || (s.variants && s.variants.length && s.screen !== 'home') : s.slides && s.slides.length && s.screen !== 'home'));
    return { studio: st, ready: !!E, open, name: s ? (s.campaign || s.customName || s.name || '') : '', title: document.title };
  };

  // a photo into a slot: through the slot itself when it is on screen (exactly a drop, with the
  // slot's own cut-out), else the store's putUrl after the studio's encoder
  async function place(slot, file) {
    const C = IS(); for (let i = 0; i < 50 && !(C && (!C.ready || C.ready())); i++) await sleep(100);
    const el = document.getElementById(slot);
    if (el && el.tagName === 'IMAGE-SLOT' && typeof el._ingest === 'function') { await el._ingest(file); return 'placed'; }
    const url = await window.providentEncodeFile(file);
    if (C.putUrl(slot, url) === false) throw new Error('The photo store is not ready yet. Try again in a moment.');
    return 'placed';
  }

  // { to: 'cas-design' | 'cas-brief' | 'ops-slide', dataUrl, name }
  X.image = async ({ to, dataUrl, name }) => {
    const E = await waitEng(), s = E.state, file = await fileOf(dataUrl, name);
    if (to === 'cas-design') {
      if (X.studio() !== 'cas') throw new Error('Open CAS first.');
      const vi = s.activeVi | 0; await place('adstudio-bg-' + vi, file);
      return { ok: true, said: 'On design ' + (vi + 1) + ' of ' + (s.campaign || 'the open campaign') };
    }
    if (to === 'cas-brief') {
      if (X.studio() !== 'cas') throw new Error('Open CAS first.');
      const C = IS(), free = [0, 1, 2, 3, 4, 5].map(i => 'adbrief-ph-' + i).find(id => !(C.getRec && C.getRec(id) && C.getRec(id).u));
      if (!free) throw new Error('The brief already holds six photos.');
      await place(free, file); return { ok: true, said: 'Added to the brief’s photos' };
    }
    if (to === 'ops-slide') {
      if (X.studio() !== 'ops') throw new Error('Open OPS first.');
      const sl = (s.slides || [])[s.activeSi | 0]; if (!sl) throw new Error('Open a post in OPS first.');
      await place('smp-bg-' + sl.id, file); return { ok: true, said: 'On page ' + ((s.activeSi | 0) + 1) + ' of the post' };
    }
    throw new Error('Unknown place: ' + to);
  };

  // text into CAS's brief (brief-to-copy). brSet writes the workspace's own key through the
  // studio, never localStorage directly (runtime.js renames keys per workspace).
  X.brief = async ({ text, source }) => {
    if (X.studio() !== 'cas') throw new Error('Open CAS first.');
    const E = await waitEng(); if (typeof E.brSet !== 'function') throw new Error('This CAS has no brief.');
    const cur = (E.brRead().brief || '').trim(), add = String(text || '').trim() + (source ? '\n(' + source + ')' : '');
    E.brSet('brief', cur ? cur + '\n\n' + add : add);
    return { ok: true, said: 'Added to the brief (Copy view, while the project is a Draft)' };
  };

  // a listing into a new OPS "Just listed" post. Built as picking the template card builds it;
  // applyProject reloads the page, so this answers first and applies a moment later.
  X.listing = async ({ data, photo, qr }) => {
    if (X.studio() !== 'ops') throw new Error('Open OPS first.');
    const E = await waitEng(), C = E.constructor;
    const d = C.defaults(); d.pid = StudioBase.newPid(); d.screen = 'guide'; d.gdStep = 0; d.guided = false; d.tpl = 'listed'; d.slides = C.tplSlides('listed');
    const sl = d.slides.find(x => x.kind === 'listed') || d.slides[0];
    const types = (E.state && E.state.ptypes) || ['Villa', 'Apartment', 'Townhouse', 'Penthouse'];
    const ptype = types.find(t => new RegExp(t, 'i').test(data.type || '')) || (/duplex|loft|hotel/i.test(data.type || '') ? 'Apartment' : types.includes('Apartment') ? 'Apartment' : types[0]);
    const title = w => String(w || '').replace(/\S+/g, x => x === x.toUpperCase() && /[A-Z]{2,}/.test(x) ? x : x.charAt(0).toUpperCase() + x.slice(1));
    const where = [data.location && data.location.building, data.location && data.location.community].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).map(title).join(', ');
    const chips = [];
    if (data.beds != null) chips.push(data.beds === 0 ? 'Studio' : data.beds + ' Bed');
    if (data.size && data.size.value) chips.push(Number(data.size.value).toLocaleString('en-US') + (data.size.unit === 'sqm' ? ' sq.m.' : ' sq.ft.'));
    if (/off.?plan/i.test(data.completion || '')) chips.push('Off-plan'); else if (/ready|completed/i.test(data.completion || '')) chips.push('Ready to move');
    if (/^(yes|furnished)$/i.test(data.furnished || '')) chips.push('Furnished');
    Object.assign(sl.f, {
      status: 'Just listed', usp: chips.slice(0, 3).join(' | '), ptype, deal: data.purpose === 'rent' ? 'Rent' : 'Sale', per: 'Year',
      building: where, price: data.price && data.price.value ? String(Math.round(data.price.value)) : '', listno: String(data.id || '').replace(/\D/g, ''),
    });
    d.customName = where || 'Just listed';
    const images = {};
    if (photo) images['smp-bg-' + sl.id] = await window.providentEncodeFile(await fileOf(photo, 'listing.jpg'));
    // the Just listed card's QR is the post's own slot (`smp-qr`); `smp-qr-<id>` is the weekly
    // template's per-property one (OPS: qrId in the slide view)
    if (qr) images['smp-qr'] = await window.providentEncodeFile(await fileOf(qr, 'qr.png'));
    setTimeout(() => { E.applyProject(d, images); }, 150);
    return { ok: true, said: 'A new Just listed post: ' + (d.customName) };
  };

  // the home's "waiting on you", published by index.html as window.providentHome
  const sendHome = () => { const h = window.providentHome; if (h) window.postMessage({ pdsExtOut: 'home', snap: JSON.parse(JSON.stringify(h)) }, location.origin); };
  window.addEventListener('provident-home', sendHome);
  if (window.providentHome) sendHome();
  X.home = () => window.providentHome ? JSON.parse(JSON.stringify(window.providentHome)) : null;
})();
