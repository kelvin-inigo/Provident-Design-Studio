// PDS extension: the background. Owns the PDS tray (what was captured, kept in this browser
// until it is sent or removed), the right-click menu, the badge and notifications, the
// Claude Motion catch for CASV, CASV's Drive relay and the Ads Manager hand-over.
import { qrPng } from './lib/qr.js';
import { unzip, typeOf } from './lib/zip.js';

const DEF = { site: 'https://design-studio.ngrok-free.dev/', casvPort: 8794, notify: true, cm: true };
const cfg = async () => Object.assign({}, DEF, await chrome.storage.sync.get(DEF));
const site = async () => (await cfg()).site.replace(/\/?$/, '/');
const FILE = { cas: 'Provident Campaign Studio.dc.html', ops: 'Provident Organic Studio.dc.html' };
const say = e => String((e && e.message) || e);

// ── the tray (IndexedDB in the extension) ─────────────────────────────────────────────────
let dbp = null;
const db = () => dbp || (dbp = new Promise((res, rej) => { const r = indexedDB.open('pds-tray', 1); r.onupgradeneeded = () => r.result.createObjectStore('items', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
const store = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('items', mode); const q = fn(t.objectStore('items')); t.oncomplete = () => res(q && 'result' in q ? q.result : undefined); t.onerror = () => rej(t.error); }); };
const trayAll = () => store('readonly', s => s.getAll());
const trayGet = id => store('readonly', s => s.get(id));
const trayDel = id => store('readwrite', s => s.delete(id));
const changed = () => chrome.runtime.sendMessage({ pds: 'trayChanged' }).catch(() => {});
async function trayAdd(item) { item.id = item.id || 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); item.at = Date.now(); await store('readwrite', s => s.put(item)); changed(); return item; }

const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const dataUrl = async blob => 'data:' + (blob.type || 'application/octet-stream') + ';base64,' + b64(new Uint8Array(await blob.arrayBuffer()));
async function thumb(blob) {
  try { const bm = await createImageBitmap(blob), w = 240, h = Math.max(1, Math.round(bm.height * w / bm.width)), c = new OffscreenCanvas(w, Math.min(h, 320)), g = c.getContext('2d');
    g.drawImage(bm, 0, 0, w, h); return await dataUrl(await c.convertToBlob({ type: 'image/jpeg', quality: 0.8 })); } catch (e) { return ''; }
}
const nameOf = (u, fb) => { try { const n = decodeURIComponent(new URL(u).pathname.split('/').pop() || ''); return /\.[a-z0-9]{2,5}$/i.test(n) ? n : fb; } catch (e) { return fb; } };
async function fetchBlob(u) { const r = await fetch(u, { credentials: 'omit' }); if (!r.ok) throw new Error('The image did not download (' + r.status + ')'); const b = await r.blob(); if (!/^image\//.test(b.type) && !/\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(u)) throw new Error('That is not an image'); return b; }
async function addImage(blob, { title, src, page }) {
  const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  return trayAdd({ kind: 'image', blob, name: nameOf(src || '', 'photo.' + ext), title: title || '', src: src || '', page: page || '', thumb: await thumb(blob) });
}

// ── finding the tabs to deliver to ────────────────────────────────────────────────────────
async function tabsOf(kind) {
  const S = await site(), port = (await cfg()).casvPort;
  const all = await chrome.tabs.query({});
  const pick = all.filter(t => { const u = t.url || ''; let p = ''; try { p = decodeURIComponent(new URL(u).pathname); } catch (e) {}
    if (kind === 'casv') return new RegExp('^http://(localhost|127\\.0\\.0\\.1):' + port + '/').test(u);
    if (kind === 'ads') return /^https:\/\/(adsmanager|business)\.facebook\.com\//.test(u);
    if (!u.startsWith(S)) return false;
    return kind === 'home' ? !/\.dc\.html$|casv-save\.html$/.test(p) : p.endsWith('/' + FILE[kind]); });
  return pick.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
}
async function inPage(tabId, ns, op, arg) {
  const [r] = await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', args: [ns, op, arg],
    func: (ns, op, arg) => { const X = window[ns]; if (!X || typeof X[op] !== 'function') return { error: 'This page has not got the PDS extension yet. Reload it, then press again.' };
      return Promise.resolve().then(() => X[op](arg)).catch(e => ({ error: String((e && e.message) || e) })); } });
  return (r && r.result) || { error: 'No answer from the page.' };
}
const waitLoaded = (tabId, ms = 30000) => new Promise(res => {
  const t0 = Date.now(), tick = async () => { const t = await chrome.tabs.get(tabId).catch(() => null); if (!t || t.status === 'complete' || Date.now() - t0 > ms) return res(t); setTimeout(tick, 300); }; tick();
});
async function studioTab(kind, opts = {}) {
  let t = (await tabsOf(kind))[0];
  if (!t && opts.open) { t = await chrome.tabs.create({ url: (await site()) + encodeURI(FILE[kind]), active: true }); await waitLoaded(t.id); }
  if (t && opts.front) { await chrome.tabs.update(t.id, { active: true }); await chrome.windows.update(t.windowId, { focused: true }); }
  return t;
}

// ── delivering a tray item ────────────────────────────────────────────────────────────────
async function deliver({ id, to, index }) {
  const it = await trayGet(id); if (!it) return { error: 'That item is no longer in the tray.' };
  if (it.kind === 'text') {
    const t = await studioTab('cas', { front: true }); if (!t) return { error: 'Open the campaign in CAS first.' };
    return inPage(t.id, '__pdsExt', 'brief', { text: it.text, source: it.page ? 'From ' + it.page : '' });
  }
  if (it.kind === 'listing') {
    if (to === 'photos') { for (const [i, b] of (it.photos || []).entries()) await addImage(b, { title: (it.data.location.building || it.data.title) + ' · photo ' + (i + 1), src: it.data.photoUrls[i], page: it.data.url }); return { ok: true, said: (it.photos || []).length + ' photos are in the tray' }; }
    // a new OPS tab is a new workspace, so the open post (if any) is never replaced
    const t = await chrome.tabs.create({ url: (await site()) + encodeURI(FILE.ops), active: true }); await waitLoaded(t.id);
    const photo = it.photos && it.photos[index | 0] ? await dataUrl(it.photos[index | 0]) : '', qr = it.qr ? await dataUrl(it.qr) : '';
    for (let i = 0; i < 25; i++) { const r = await inPage(t.id, '__pdsExt', 'where', null); if (r && r.ready) break; await new Promise(r => setTimeout(r, 400)); }
    return inPage(t.id, '__pdsExt', 'listing', { data: it.data, photo, qr });
  }
  // an image (a capture or a photo)
  const blob = it.blob, du = await dataUrl(blob);
  if (to === 'casv') { const t = (await tabsOf('casv'))[0]; if (!t) return { error: 'Open CASV first (Applications › Provident Video Studio).' }; return inPage(t.id, '__casvExt', 'add', { name: it.name, dataUrl: du, type: blob.type, as: 'media' }); }
  if (to === 'clipboard') return { ok: true, dataUrl: du };
  const kind = to === 'ops-slide' ? 'ops' : 'cas', t = await studioTab(kind, { front: true });
  if (!t) return { error: 'Open the ' + (kind === 'cas' ? 'campaign in CAS' : 'post in OPS') + ' first.' };
  return inPage(t.id, '__pdsExt', 'image', { to, dataUrl: du, name: it.name });
}

// ── the listing importer ─────────────────────────────────────────────────────────────────
async function addListing(data) {
  const urls = (data.photos || []).slice(0, 12), photos = [];
  for (const u of urls) { try { photos.push(await fetchBlob(u)); } catch (e) {} }
  let qr = null; try { qr = await qrPng(data.url); } catch (e) {}
  const where = [data.location.building, data.location.community].filter(Boolean).join(', ');
  // every photo gets a small preview: portal photos often carry the listing agency's watermark,
  // so the person picks the one that goes on the card
  const thumbs = []; for (const b of photos) thumbs.push(await thumb(b));
  return trayAdd({ kind: 'listing', data: Object.assign({}, data, { photoUrls: urls }), photos, thumbs, qr, title: where || data.title, page: data.url, thumb: thumbs[0] || '' });
}

// ── capture an area ──────────────────────────────────────────────────────────────────────
const startCrop = tabId => chrome.scripting.executeScript({ target: { tabId }, files: ['content/crop.js'] }).catch(e => notify('crop', 'Cannot capture here', say(e).includes('Cannot access') ? 'Chrome does not let extensions capture this page.' : say(e)));
async function crop(msg, tab) {
  const shot = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
  const bm = await createImageBitmap(await (await fetch(shot)).blob()), k = msg.dpr || 1, r = msg.rect;
  const sx = Math.round(r.x * k), sy = Math.round(r.y * k), sw = Math.min(bm.width - sx, Math.round(r.w * k)), sh = Math.min(bm.height - sy, Math.round(r.h * k));
  const c = new OffscreenCanvas(sw, sh); c.getContext('2d').drawImage(bm, sx, sy, sw, sh, 0, 0, sw, sh);
  const blob = await c.convertToBlob({ type: 'image/png' }); let host = ''; try { host = new URL(msg.page).host.replace(/^www\./, ''); } catch (e) {}
  await trayAdd({ kind: 'image', capture: true, blob, name: 'capture-' + host.replace(/\W+/g, '-') + '.png', title: 'Capture · ' + (host || 'page'), page: msg.page, thumb: await thumb(blob) });
  return { ok: true, dataUrl: await dataUrl(blob) };
}

// ── what is waiting on you: the badge and notifications ────────────────────────────────────
async function home(snap, url) {
  if (!snap || !Array.isArray(snap.mine)) return;
  const prev = (await chrome.storage.local.get('home')).home, seen = new Set(((prev && prev.mine) || []).map(x => x.studio + ':' + x.id));
  await chrome.storage.local.set({ home: Object.assign({}, snap, { got: Date.now(), from: url }) });
  paintBadge(snap.mine.length);
  if (prev && (await cfg()).notify) snap.mine.filter(x => !seen.has(x.studio + ':' + x.id)).slice(0, 3).forEach(x =>
    notify('home:' + x.studio + ':' + x.id, 'Waiting on you: ' + (x.name || 'a new item'), [x.step, x.sub].filter(Boolean).join(' · ') || (x.studio === 'ops' ? 'OPS' : 'CAS')));
  chrome.runtime.sendMessage({ pds: 'homeChanged' }).catch(() => {});
}
function paintBadge(n) { chrome.action.setBadgeBackgroundColor({ color: '#1A2942' }); chrome.action.setBadgeTextColor && chrome.action.setBadgeTextColor({ color: '#FFFFFF' }); chrome.action.setBadgeText({ text: n ? String(n > 99 ? '99+' : n) : '' }); chrome.action.setTitle({ title: n ? 'PDS · ' + n + ' waiting on you' : 'PDS' }); }
function notify(id, title, message) { chrome.notifications.create(id + ':' + Date.now(), { type: 'basic', iconUrl: 'icons/pds-128.png', title, message: message || '' }); }
chrome.notifications.onClicked.addListener(async nid => {
  const [kind, studio, ...rest] = nid.split(':');
  if (kind === 'home') { const h = (await chrome.storage.local.get('home')).home, x = h && h.mine.find(y => y.studio === studio && String(y.id) === rest.slice(0, -1).join(':')); openPds(x && x.href); }
  if (kind === 'cm') { const t = (await tabsOf('casv'))[0]; if (t) { chrome.tabs.update(t.id, { active: true }); chrome.windows.update(t.windowId, { focused: true }); } }
  chrome.notifications.clear(nid);
});
async function openPds(href) { const S = await site(); chrome.tabs.create({ url: !href ? S + 'index.html' : /^https?:/.test(href) ? href : S + 'index.html' + (href.startsWith('#') ? href : '#' + href) }); }
// a PDS tab answers on load; when none is open the badge keeps its last count, greyed after 6 hours
chrome.alarms.create('pds-home', { periodInMinutes: 10 });
chrome.alarms.onAlarm.addListener(async a => {
  if (a.name !== 'pds-home') return;
  const t = (await tabsOf('home'))[0];
  if (t) { const snap = await inPage(t.id, '__pdsExt', 'home', null).catch(() => null); if (snap && !snap.error) return home(snap, t.url); }
  const h = (await chrome.storage.local.get('home')).home;
  if (h && Date.now() - h.got > 6 * 3600e3) chrome.action.setBadgeBackgroundColor({ color: '#949AA6' });
});

// ── CASV: Claude Motion exports go straight into CASV ──────────────────────────────────────
const fileAccess = () => new Promise(r => chrome.extension.isAllowedFileSchemeAccess(r));
async function readDownload(item) {
  if (!(await fileAccess())) return null;
  try { const r = await fetch('file://' + item.filename.split('/').map(encodeURIComponent).join('/')); return r.ok ? await r.blob() : null; } catch (e) { return null; }
}
const fromClaude = item => /^https:\/\/claude\.ai\//.test(item.referrer || '') || /^blob:https:\/\/(claude\.ai|[\w-]+\.claudeusercontent\.com)\//.test(item.url || '') || /claudeusercontent\.com/.test(item.finalUrl || '');
chrome.downloads.onChanged.addListener(async d => {
  if (!d.state || d.state.current !== 'complete') return;
  const [item] = await chrome.downloads.search({ id: d.id }); if (!item) return;
  if (fromClaude(item) && /\.(mov|mp4|m4v|webm)$/i.test(item.filename) && (await cfg()).cm) return claudeMotion(item);
});
async function claudeMotion(item) {
  const name = item.filename.split('/').pop(), link = /^https:\/\/claude\.ai\/(code\/)?artifact\//.test(item.referrer || '') ? item.referrer.split('?')[0] : '';
  const t = (await tabsOf('casv'))[0];
  if (!t) return notify('cm', 'Claude Motion export ready', name + ' is in Downloads. Open CASV and it can be added from there.');
  const blob = item.fileSize < 60e6 ? await readDownload(item) : null;
  const r = await inPage(t.id, '__casvExt', 'cm', { name, link, type: typeOf(name), dataUrl: blob ? await dataUrl(new Blob([blob], { type: typeOf(name) })) : '' });
  notify('cm', r && r.error ? 'Claude Motion export not added' : 'Claude Motion export added to CASV', r && r.error ? r.error : (r && r.said) || name);
}
// ── Ads Manager: approved files from PDS downloads into the open upload box ─────────────────
async function adsList() {
  const S = new URL(await site()).origin;
  const items = await chrome.downloads.search({ orderBy: ['-startTime'], limit: 200, state: 'complete', exists: true });
  const mine = items.filter(i => [i.url, i.finalUrl, i.referrer].some(u => u && (u.startsWith(S) || u.startsWith('blob:' + S)))).filter(i => /\.(zip|png|jpe?g|webp|mp4|mov)$/i.test(i.filename)).slice(0, 40);
  return { access: await fileAccess(), items: mine.map(i => ({ id: i.id, name: i.filename.split('/').pop(), size: i.fileSize, at: i.startTime })) };
}
async function adsFiles(ids) {
  if (!(await fileAccess())) return { error: 'Turn on "Allow access to file URLs" for PDS in chrome://extensions, so the extension can read your downloads.' };
  const out = [];
  for (const id of ids) {
    const [it] = await chrome.downloads.search({ id }); if (!it) continue;
    const b = await readDownload(it); if (!b) continue; const name = it.filename.split('/').pop();
    if (/\.zip$/i.test(name)) (await unzip(b)).filter(f => /^(image|video)\//.test(f.blob.type)).forEach(f => out.push({ name: f.name.split('/').pop(), path: f.name, blob: f.blob }));
    else out.push({ name, path: name, blob: new Blob([b], { type: typeOf(name) }) });
  }
  return { files: out };
}
async function adsPut({ ids, pick }) {
  const t = (await tabsOf('ads'))[0]; if (!t) return { error: 'Open Meta Ads Manager first.' };
  const r = await adsFiles(ids); if (r.error) return r;
  const files = pick ? r.files.filter(f => pick.includes(f.path)) : r.files;
  if (!files.length) return { error: 'No images or videos in those downloads.' };
  await chrome.tabs.update(t.id, { active: true });
  return chrome.tabs.sendMessage(t.id, { pds: 'adsPut', files: await Promise.all(files.map(async f => ({ name: f.name, type: f.blob.type, dataUrl: await dataUrl(f.blob) }))) })
    .catch(() => ({ error: 'Reload the Ads Manager tab once (the extension was added after it opened), then press again.' }));
}

// ── wiring ───────────────────────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'pds-image', title: 'Send this image to PDS', contexts: ['image'] });
    chrome.contextMenus.create({ id: 'pds-text', title: 'Add to the CAS brief', contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'pds-area', title: 'Capture an area for a CAS component', contexts: ['page', 'image', 'selection', 'link'] });
    chrome.contextMenus.create({ id: 'pds-listing', title: 'Make an OPS post from this listing', contexts: ['page'], documentUrlPatterns: ['https://www.propertyfinder.ae/*/plp/*', 'https://www.bayut.com/property/details-*'] });
  });
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const open = () => chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
  if (info.menuItemId === 'pds-area') return startCrop(tab.id);
  open();
  try {
    if (info.menuItemId === 'pds-image') await addImage(await fetchBlob(info.srcUrl), { title: tab.title, src: info.srcUrl, page: info.pageUrl });
    if (info.menuItemId === 'pds-text') await trayAdd({ kind: 'text', text: info.selectionText, title: tab.title, page: info.pageUrl });
    if (info.menuItemId === 'pds-listing') { const r = await chrome.tabs.sendMessage(tab.id, { pds: 'readListing' }); if (!r || !r.data) throw new Error('Could not read this listing.'); await addListing(r.data); }
  } catch (e) { notify('err', 'Not sent to PDS', say(e)); }
});
chrome.commands.onCommand.addListener(async c => { if (c !== 'capture-area') return; const [t] = await chrome.tabs.query({ active: true, lastFocusedWindow: true }); if (t) startCrop(t.id); });

chrome.runtime.onMessage.addListener((m, sender, reply) => {
  if (!m || !m.pds) return;
  const tab = sender.tab, go = p => { Promise.resolve(p).then(reply, e => reply({ error: say(e) })); return true; };
  switch (m.pds) {
    case 'listing': return go(addListing(m.data).then(() => { if (tab) chrome.sidePanel.open({ tabId: tab.id }).catch(() => {}); return { ok: true }; }));
    case 'crop': return go(crop(m, tab));
    case 'home': home(m.snap, m.url); return;
    case 'trayList': return go(trayAll().then(a => a.sort((p, q) => q.at - p.at).map(({ blob, photos, qr, ...x }) => Object.assign(x, { n: photos ? photos.length : 0, hasQr: !!qr }))));
    case 'trayDelete': return go(trayDel(m.id).then(() => { changed(); return { ok: true }; }));
    case 'deliver': return go(deliver(m));
    case 'homeGet': return go(chrome.storage.local.get('home').then(r => r.home || null));
    case 'openPds': openPds(m.href); return;
    case 'refreshHome': return go((async () => { const t = (await tabsOf('home'))[0]; if (!t) { await openPds(''); return { opened: true }; } const s = await inPage(t.id, '__pdsExt', 'home', null); if (s && !s.error) await home(s, t.url); return { ok: true }; })());
    case 'adsList': return go(adsList());
    case 'adsFiles': return go(adsFiles(m.ids).then(r => r.error ? r : { files: r.files.map(f => ({ name: f.name, path: f.path, type: f.blob.type, size: f.blob.size })) }));
    case 'adsPut': return go(adsPut(m));
    case 'capture': return go((async () => { const [t] = await chrome.tabs.query({ active: true, lastFocusedWindow: true }); if (t) await startCrop(t.id); return { ok: true }; })());
    case 'readListingTab': return go((async () => { const [t] = await chrome.tabs.query({ active: true, lastFocusedWindow: true }); const r = t && await chrome.tabs.sendMessage(t.id, { pds: 'readListing' }).catch(() => null); if (!r || !r.data) return { error: 'Open a listing on Property Finder or Bayut first.' }; await addListing(r.data); return { ok: true }; })());
  }
});
chrome.storage.local.get('home').then(r => { if (r.home) paintBadge(r.home.mine.length); });
// for the tests (tools: a CDP session on this worker); nothing in the extension calls it
globalThis.__pds = { unzip, addListing, deliver, claudeMotion, adsFiles, adsList, trayAll, trayDel, home, addImage, fetchBlob };
