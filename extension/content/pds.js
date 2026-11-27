// PDS extension, on PDS's pages (isolated world): carries the home's "waiting on you" to the
// background.
(() => {
  if (window.__pdsIso) return; window.__pdsIso = true;
  const send = m => { try { chrome.runtime.sendMessage(m).catch(() => {}); } catch (e) {} };
  window.addEventListener('message', e => {
    if (e.source !== window || !e.data || typeof e.data !== 'object') return;
    const d = e.data;
    if (d.pdsExtOut === 'home') send({ pds: 'home', snap: d.snap, url: location.href });
  });
})();
