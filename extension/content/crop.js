// PDS extension: drag a box over any part of a page (an ad on Meta Ad Library, a competitor's
// post…). The background captures the tab and crops it; the crop is copied as a PNG, ready to
// paste into Claude with /cas-component, and kept in the PDS tray.
(() => {
  if (window.__pdsCrop) { window.__pdsCrop(); return; }
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;cursor:crosshair';
  const sh = host.attachShadow({ mode: 'closed' });
  sh.innerHTML = '<style>:host{all:initial}.v{position:fixed;inset:0;background:rgba(10,11,13,.35)}.b{position:fixed;border:1.5px solid #fff;box-shadow:0 0 0 9999px rgba(10,11,13,.45);display:none}' +
    '.t{position:fixed;left:50%;top:16px;transform:translateX(-50%);padding:10px 16px;border-radius:9999px;background:#1A2942;color:#fff;font:400 13px/1.3 "Google Sans Flex",system-ui,sans-serif;white-space:nowrap}</style>' +
    '<div class="v"></div><div class="b"></div><div class="t">Drag a box around the part to capture · Esc to cancel</div>';
  const v = sh.querySelector('.v'), b = sh.querySelector('.b'), t = sh.querySelector('.t');
  let x0 = 0, y0 = 0, on = false, r = null;
  const done = () => { window.removeEventListener('keydown', key, true); host.remove(); delete window.__pdsCrop; };
  const key = e => { if (e.key === 'Escape') { e.preventDefault(); done(); } };
  window.__pdsCrop = done;
  host.addEventListener('pointerdown', e => { on = true; x0 = e.clientX; y0 = e.clientY; host.setPointerCapture(e.pointerId); v.style.display = 'none'; b.style.display = 'block'; e.preventDefault(); });
  host.addEventListener('pointermove', e => {
    if (!on) return;
    r = { x: Math.min(x0, e.clientX), y: Math.min(y0, e.clientY), w: Math.abs(e.clientX - x0), h: Math.abs(e.clientY - y0) };
    Object.assign(b.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
  });
  host.addEventListener('pointerup', async () => {
    on = false; if (!r || r.w < 8 || r.h < 8) { done(); return; }
    const rect = r; host.style.display = 'none';
    await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
    const res = await chrome.runtime.sendMessage({ pds: 'crop', rect, dpr: devicePixelRatio, page: location.href, title: document.title }).catch(e => ({ error: String(e) }));
    host.style.display = ''; v.style.display = 'none'; b.style.display = 'none';
    let msg = res && res.error ? 'Not captured: ' + res.error : 'Captured. In the PDS tray';
    if (res && res.dataUrl) {
      try { const blob = await (await fetch(res.dataUrl)).blob(); await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); msg = 'Copied. Paste it into Claude with /cas-component (also in the PDS tray)'; }
      catch (e) { msg = 'In the PDS tray (the clipboard was not available on this page)'; }
    }
    t.textContent = msg; host.style.pointerEvents = 'none'; setTimeout(done, 2600);
  });
  window.addEventListener('keydown', key, true);
  document.documentElement.appendChild(host);
})();
