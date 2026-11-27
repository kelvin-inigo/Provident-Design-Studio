// PDS extension, on Meta Ads Manager: puts approved files from PDS into the upload box that is
// open on the page (Meta's media picker keeps an <input type=file> behind its Upload button).
// Nothing is published: the files land in the picker, and the person reviews and confirms.
(() => {
  if (window.__pdsAds) return; window.__pdsAds = true;
  const inputs = () => [...document.querySelectorAll('input[type=file]')].filter(i => !i.disabled);
  chrome.runtime.onMessage.addListener((m, _s, reply) => {
    if (!m || m.pds !== 'adsPut') return;
    (async () => {
      const list = inputs();
      if (!list.length) return reply({ error: 'No upload box is open. In Ads Manager, open the ad’s media (Add media › Upload), then press again.' });
      const input = list[list.length - 1], dt = new DataTransfer();
      for (const f of m.files) { const b = await (await fetch(f.dataUrl)).blob(); dt.items.add(new File([b], f.name, { type: f.type || b.type })); }
      if (!input.multiple && dt.files.length > 1) return reply({ error: 'This upload box takes one file at a time. Send them one by one.' });
      input.files = dt.files;
      input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
      reply({ ok: true, said: dt.files.length + (dt.files.length === 1 ? ' file' : ' files') + ' put in Ads Manager’s upload' });
    })().catch(e => reply({ error: String(e && e.message || e) }));
    return true;
  });
})();
