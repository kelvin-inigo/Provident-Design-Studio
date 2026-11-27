// PDS extension: the side panel.
const $ = id => document.getElementById(id);
const ask = m => chrome.runtime.sendMessage(m);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ago = t => { const s = Math.round((Date.now() - t) / 1000); return s < 60 ? 'just now' : s < 3600 ? Math.round(s / 60) + ' min ago' : s < 86400 ? Math.round(s / 3600) + ' h ago' : new Date(t).toLocaleDateString(); };
function toast(msg) { const el = $('toast'); el.textContent = msg; el.dataset.on = '1'; clearTimeout(toast.t); toast.t = setTimeout(() => delete el.dataset.on, 4200); }
const said = r => toast(r && r.error ? r.error : (r && r.said) || 'Done');

// ── waiting on you ─────────────────────────────────────────────────────────────────────
async function drawWait() {
  const h = await ask({ pds: 'homeGet' }), list = $('wait-list');
  if (!h) { $('wait-n').textContent = ''; $('wait-note').textContent = 'Open PDS once (signed in) and this fills in. It updates whenever a PDS tab or the PDS app is open.'; list.innerHTML = ''; drawSets(null); return; }
  $('wait-n').textContent = h.mine.length || '';
  $('wait-note').textContent = (h.mine.length ? '' : 'Nothing is waiting on you. ') + 'Updated ' + ago(h.got) + '.';
  list.innerHTML = h.mine.map((x, i) => '<li data-i="' + i + '" tabindex="0" role="link"><span class="x-t"><b>' + esc(x.name) + '</b><small>' + esc([x.step, x.sub].filter(Boolean).join(' · ')) + '</small></span><span class="x-tag">' + (x.studio === 'ops' ? 'OPS' : x.studio === 'cas' ? 'CAS' : 'Hub') + '</span></li>').join('');
  list.onclick = list.onkeydown = e => { if (e.type === 'keydown' && e.key !== 'Enter') return; const li = e.target.closest('li'); if (li) ask({ pds: 'openPds', href: h.mine[+li.dataset.i].href }); };
  drawSets(h);
}
$('waitRef').onclick = async () => { const r = await ask({ pds: 'refreshHome' }); if (r && r.opened) toast('PDS opened. The list fills in once it loads.'); };

// ── the tray ───────────────────────────────────────────────────────────────────────────
const pick = {};          // listing id → the photo chosen for the card
const ACTS = {
  image: [['cas-brief', 'CAS brief photos'], ['cas-design', 'CAS design'], ['ops-slide', 'OPS page'], ['casv', 'CASV library'], ['copy', 'Copy']],
  text: [['cas-brief', 'Add to the CAS brief']],
  listing: [['ops', 'Make the OPS post', 1], ['photos', 'Photos to the tray']],
};
async function drawTray() {
  const items = await ask({ pds: 'trayList' }), ul = $('tray-list');
  $('tray-n').textContent = items.length || '';
  ul.innerHTML = items.length ? items.map(it => {
    const th = it.thumb ? '<span class="x-th" style="background-image:url(' + esc(it.thumb) + ')"></span>' : '<span class="x-th">' + (it.kind === 'text' ? 'Text' : 'File') + '</span>';
    let body = '<b>' + esc(it.title || it.name || 'Item') + '</b>';
    if (it.kind === 'text') body += '<q>' + esc(it.text) + '</q>';
    if (it.kind === 'listing') { const d = it.data; if ((it.thumbs || []).length > 1) body += '<div class="x-pics" role="radiogroup" aria-label="Photo for the card">' + it.thumbs.map((t, i) => '<button type="button" role="radio" aria-checked="' + (i === (pick[it.id] | 0)) + '" data-pic="' + i + '" title="Photo ' + (i + 1) + '" style="background-image:url(' + esc(t) + ')"></button>').join('') + '</div>'; body += '<small>' + esc([d.source === 'bayut' ? 'Bayut' : 'Property Finder', d.price && d.price.value ? d.price.currency + ' ' + Number(d.price.value).toLocaleString('en-US') : '', d.beds != null ? (d.beds ? d.beds + ' bed' : 'Studio') : '', d.size ? Number(d.size.value).toLocaleString('en-US') + ' ' + d.size.unit : '', it.n + ' photos', it.hasQr ? 'QR ready' : ''].filter(Boolean).join(' · ')) + '</small>'; }
    else body += '<small>' + esc(ago(it.at)) + (it.page ? ' · ' + esc((() => { try { return new URL(it.page).host.replace(/^www\./, ''); } catch (e) { return ''; } })()) : '') + '</small>';
    const acts = (ACTS[it.kind] || []).map(a => '<button class="' + (a[2] ? 'p-btn' : 'p-ghost') + ' p-sm" type="button" data-to="' + a[0] + '">' + a[1] + '</button>').join('') +
      '<button class="p-ghost p-sm" type="button" data-del="1" aria-label="Remove from the tray">Remove</button>';
    return '<li data-id="' + esc(it.id) + '">' + th + '<div class="x-t">' + body + '<div class="x-acts">' + acts + '</div></div></li>';
  }).join('') : '<li class="x-empty" style="display:block">The tray is empty.</li>';
}
$('tray-list').onclick = async e => {
  const b = e.target.closest('button'), li = e.target.closest('li[data-id]'); if (!b || !li) return;
  const id = li.dataset.id;
  if (b.dataset.pic) { pick[id] = +b.dataset.pic; li.querySelectorAll('[data-pic]').forEach(x => x.setAttribute('aria-checked', x === b)); li.querySelector('.x-th').style.backgroundImage = b.style.backgroundImage; return; }
  if (b.dataset.del) { await ask({ pds: 'trayDelete', id }); return; }
  const to = b.dataset.to;
  if ((to === 'cas-design' || to === 'ops-slide') && !confirm('This replaces the photo on the ' + (to === 'cas-design' ? 'open CAS design' : 'open OPS page') + '. Undo will not bring the old one back. Go ahead?')) return;
  b.disabled = true;
  try {
    if (to === 'copy') { const r = await ask({ pds: 'deliver', id, to: 'clipboard' }); const blob = await (await fetch(r.dataUrl)).blob(); const png = blob.type === 'image/png' ? blob : await toPng(blob); await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]); toast('Copied. Paste it into Claude with /cas-component, or anywhere else.'); }
    else said(await ask({ pds: 'deliver', id, to, index: pick[id] | 0 }));
  } catch (err) { toast(String(err.message || err)); }
  b.disabled = false;
};
async function toPng(blob) { const bm = await createImageBitmap(blob), c = new OffscreenCanvas(bm.width, bm.height); c.getContext('2d').drawImage(bm, 0, 0); return c.convertToBlob({ type: 'image/png' }); }
$('capBtn').onclick = () => ask({ pds: 'capture' });
$('lstBtn').onclick = async () => said(await ask({ pds: 'readListingTab' }).then(r => r.ok ? { said: 'The listing is in the tray' } : r));

// ── Ads Manager ────────────────────────────────────────────────────────────────────────
function drawSets(h) {
  const sets = (h && h.sets) || [], ul = $('sets-list');
  ul.innerHTML = sets.length ? sets.map((x, i) => '<li data-i="' + i + '" tabindex="0" role="link" title="Opens the ad set in PDS, where it downloads"><span class="x-t"><b>' + esc(x.name) + '</b><small>' + esc([x.step, x.sub].filter(Boolean).join(' · ')) + '</small></span>' + (x.ready ? '<span class="x-tag">Ready</span>' : '') + '</li>').join('')
    : '<li class="x-static x-empty">No ad sets yet. They come from PDS once it has been opened.</li>';
  ul.onclick = ul.onkeydown = e => { if (e.type === 'keydown' && e.key !== 'Enter') return; const li = e.target.closest('li[data-i]'); if (li) ask({ pds: 'openPds', href: sets[+li.dataset.i].href }); };
}
let dls = [];
async function drawDownloads() {
  const r = await ask({ pds: 'adsList' }); dls = r.items || [];
  $('ads-access').hidden = !!r.access;
  $('dl-list').innerHTML = dls.length ? dls.map(d => '<li class="x-static"><input type="checkbox" id="dl' + d.id + '" value="' + d.id + '"><label class="x-t" for="dl' + d.id + '"><b>' + esc(d.name) + '</b><small>' + esc(ago(new Date(d.at).getTime()) + ' · ' + (d.size / 1048576).toFixed(1) + ' MB' + (/\.zip$/i.test(d.name) ? ' · its images and videos go in' : '')) + '</small></label></li>').join('')
    : '<li class="x-static x-empty">No downloads from PDS yet.</li>';
  pickChanged();
}
const picked = () => [...document.querySelectorAll('#dl-list input:checked')].map(i => +i.value);
function pickChanged() { $('adsPut').disabled = !picked().length; }
$('dl-list').onchange = pickChanged;
$('adsPut').onclick = async () => { $('adsPut').disabled = true; said(await ask({ pds: 'adsPut', ids: picked() })); pickChanged(); };
$('adsRef').onclick = () => { drawDownloads(); drawWait(); };
$('extBtn').onclick = () => chrome.tabs.create({ url: 'chrome://extensions/?id=' + chrome.runtime.id });
$('optBtn').onclick = () => chrome.runtime.openOptionsPage();

chrome.runtime.onMessage.addListener(m => { if (!m) return; if (m.pds === 'trayChanged') drawTray(); if (m.pds === 'homeChanged') drawWait(); });
drawWait(); drawTray(); drawDownloads();
