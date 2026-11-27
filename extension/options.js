const DEF = { site: 'https://design-studio.ngrok-free.dev/', casvPort: 8794, notify: true, cm: true };
const $ = id => document.getElementById(id);
chrome.storage.sync.get(DEF).then(c => { $('site').value = c.site; $('port').value = c.casvPort; $('notify').checked = c.notify; $('cm').checked = c.cm; });
$('save').onclick = async () => {
  let site = $('site').value.trim(); try { const u = new URL(site); site = u.origin + u.pathname.replace(/[^/]*$/, ''); } catch (e) { $('said').textContent = 'That address is not a web address.'; return; }
  const port = Math.max(1024, Math.min(65535, parseInt($('port').value, 10) || 8794));
  await chrome.storage.sync.set({ site, casvPort: port, notify: $('notify').checked, cm: $('cm').checked });
  $('said').textContent = 'Saved.';
};
