// PDS extension, inside CASV (the MAIN world): gives the background a way to hand CASV a file
// (a Claude Motion export as it downloads, a photo from the tray).
(() => {
  if (window.__casvExt) return;
  const X = window.__casvExt = { v: 1 };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const vs = async () => { for (let i = 0; i < 100; i++) { if (window.VideoStudio) return window.VideoStudio; await sleep(100); } throw new Error('CASV did not finish loading.'); };
  const fileOf = async (src, name, type) => {
    const b = src.dataUrl ? await (await fetch(src.dataUrl)).blob() : await (await fetch('/api/cm/file?name=' + encodeURIComponent(src.name), { cache: 'no-store' })).blob();
    if (!b.size) throw new Error('The file was empty.');
    return new File([b], name, { type: type || b.type });
  };
  // a finished Claude Motion export: { name, dataUrl?, link }. With dataUrl the extension read the
  // file itself; without it CASV's helper reads it from Downloads by name (no polling).
  X.cm = async ({ name, dataUrl, link, type }) => {
    const V = await vs(), f = await fileOf({ dataUrl, name }, name, type);
    if (typeof V.cmDeliver === 'function') return V.cmDeliver(f, link);
    await V.addFiles([f], 'logo'); return { ok: true, said: 'Added as a mograph' };
  };
  // any file into CASV's library: { name, dataUrl, as: 'media' | 'audio' | 'logo' }
  X.add = async ({ name, dataUrl, type, as }) => { const V = await vs(); await V.addFiles([await fileOf({ dataUrl }, name, type)], as || 'media'); return { ok: true, said: 'Added to CASV’s library' }; };
})();
