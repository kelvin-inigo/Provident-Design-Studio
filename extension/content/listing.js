// PDS extension: the listing importer (Property Finder, Bayut).
// Reads the listing the page is showing and offers "Make an OPS post" in a small button at the
// bottom right. The data goes to the PDS tray (background.js) as one `listing` item; the photos
// are fetched by the background (it has the image hosts' permission), never by the page.
(() => {
  if (window.__pdsListing) return; window.__pdsListing = true;

  const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(/[^\d.]/g, '')); return isFinite(n) ? n : null; };

  // Property Finder: everything is in Next.js's data block.
  function fromPropertyFinder() {
    const el = document.getElementById('__NEXT_DATA__'); if (!el) return null;
    let p; try { p = JSON.parse(el.textContent).props.pageProps.propertyResult.property; } catch (e) { return null; }
    if (!p) return null;
    const tree = (p.location_tree || []).reduce((o, x) => (o[String(x.type || '').toLowerCase()] = x.name, o), {});
    const photos = ((p.images && p.images.property) || []).map(i => i.full || i.medium).filter(Boolean);
    return {
      source: 'propertyfinder', url: (p.share_url || location.href).split('?')[0], id: String(p.id || ''),
      reference: String(p.reference || '').trim(), title: p.title || '',
      price: p.price && !p.price.is_hidden ? { value: p.price.value, currency: p.price.currency || 'AED' } : null,
      purpose: /rent/i.test(p.offering_type || '') ? 'rent' : 'sale',
      beds: num(p.bedrooms_value != null ? p.bedrooms_value : p.bedrooms), baths: num(p.bathrooms_value != null ? p.bathrooms_value : p.bathrooms),
      size: p.size ? { value: p.size.value, unit: p.size.unit || 'sqft' } : null,
      type: p.property_type || '', completion: p.completion_status || '', furnished: p.furnished || '',
      location: { building: tree.tower || tree.building || '', community: tree.community || '', subcommunity: tree.subcommunity || '', city: tree.city || '', full: (p.location && p.location.full_name) || '' },
      agency: (p.broker && p.broker.name) || '', agent: (p.agent && p.agent.name) || '',
      permit: (p.rera && p.rera.number) || '', photos,
    };
  }

  // Bayut: the JSON-LD listing plus the labelled facts (aria-label="Price" …).
  function fromBayut() {
    const lab = l => { const e = document.querySelector('[aria-label="' + l + '"]'); return e ? e.textContent.trim() : ''; };
    let ld = null;
    document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
      try { const j = JSON.parse(s.textContent); (j['@graph'] || [].concat(j)).forEach(x => { if (x['@type'] === 'RealEstateListing') ld = x; }); } catch (e) {}
    });
    if (!ld && !lab('Price')) return null;
    const crumbs = ((ld && ld.breadcrumb && ld.breadcrumb.itemListElement) || []).map(x => x.name);
    const header = lab('Property header');                 // "Tower, Project, Sub-community, Community, City"
    const parts = header.split(',').map(s => s.trim()).filter(Boolean);
    // the listing's own photos: the cover and the gallery grid, never the "Listing card"s of
    // similar properties further down the page
    const ids = [], boxes = document.querySelectorAll('[aria-label="Cover Photo"], [aria-label="Property image"], [aria-label="Gallery dialog photo grid"]');
    [...boxes].flatMap(b => [...b.querySelectorAll('img, source')]).forEach(i => {
      const s = (i.currentSrc || i.src || '') + ' ' + (i.srcset || '');
      (s.match(/thumbnails\/(\d+)-\d+x\d+/g) || []).forEach(m => { const id = m.match(/(\d+)-/)[1]; if (!ids.includes(id)) ids.push(id); });
    });
    const area = lab('Area') || lab('Built-up Area');
    const ref = lab('Reference').replace(/^Reference/i, '').trim();
    const permit = lab('Permit number').replace(/^Permit number/i, '').trim();
    return {
      source: 'bayut', url: location.href.split('?')[0], id: (location.pathname.match(/details-(\d+)/) || [])[1] || '',
      reference: ref, title: (document.querySelector('h1') || {}).textContent || (ld && ld.name) || '',
      price: lab('Price') ? { value: num(lab('Price')), currency: 'AED' } : null,
      purpose: /rent/i.test(lab('Purpose')) ? 'rent' : 'sale',
      beds: /studio/i.test(lab('Beds')) ? 0 : num(lab('Beds')), baths: num(lab('Baths')),
      size: area ? { value: num(area), unit: /sqm/i.test(area) ? 'sqm' : 'sqft' } : null,
      type: lab('Type'), completion: lab('Completion status').replace(/^Completion status/i, ''), furnished: lab('Furnishing'),
      location: { building: parts[0] || '', community: parts.length > 2 ? parts[parts.length - 2] : (crumbs[1] || ''), subcommunity: parts.length > 3 ? parts[parts.length - 3] : '', city: parts[parts.length - 1] || 'Dubai', full: header },
      agency: lab('Agency name'), agent: lab('Agent name'),
      permit: /^\d+$/.test(permit) ? permit : '',          // the label is reused for area names on some pages
      photos: ids.slice(0, 24).map(id => 'https://images.bayut.com/thumbnails/' + id + '-800x600.webp'),
    };
  }

  const read = () => /propertyfinder\./.test(location.host) ? fromPropertyFinder() : /bayut\./.test(location.host) ? fromBayut() : null;
  const isListing = () => /propertyfinder\.[a-z.]+\/[a-z]{2}\/plp\//.test(location.href) || /bayut\.[a-z.]+\/property\/details-/.test(location.href);

  // The button: a closed shadow root, so the site's CSS never reaches it.
  let host = null;
  function button() {
    if (host || !isListing()) return;
    host = document.createElement('div'); host.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147483647';
    const sh = host.attachShadow({ mode: 'closed' });
    sh.innerHTML = '<style>button{all:initial;display:inline-flex;align-items:center;gap:10px;height:44px;padding:0 18px 0 8px;border-radius:9999px;background:#1A2942;color:#fff;font:400 14px/1 "Google Sans Flex",system-ui,sans-serif;cursor:pointer;box-shadow:0 6px 24px rgba(10,11,13,.28)}button:hover{background:#243656}button:focus-visible{outline:2px solid #fff;outline-offset:2px}img{width:28px;height:28px;border-radius:7px}span{white-space:nowrap}</style>' +
      '<button type="button" title="Sends this listing to the PDS tray: its facts, its photos and its link for the QR"><img alt="" src="' + chrome.runtime.getURL('icons/pds-32.png') + '"><span>Make an OPS post</span></button>';
    const b = sh.querySelector('button'), label = sh.querySelector('span');
    b.addEventListener('click', async () => {
      const data = read();
      if (!data) { label.textContent = 'Could not read this listing'; return; }
      label.textContent = 'Sending…';
      const r = await chrome.runtime.sendMessage({ pds: 'listing', data }).catch(e => ({ error: String(e) }));
      label.textContent = r && r.ok ? 'In the PDS tray' : 'Not sent: ' + ((r && r.error) || 'try again');
      setTimeout(() => { label.textContent = 'Make an OPS post'; }, 4000);
    });
    document.documentElement.appendChild(host);
  }
  // Both sites change page without reloading: watch the address.
  let last = '';
  const tick = () => { if (location.href !== last) { last = location.href; if (host && !isListing()) { host.remove(); host = null; } button(); } };
  setInterval(tick, 1000); tick();

  chrome.runtime.onMessage.addListener((m, _s, reply) => { if (m && m.pds === 'readListing') { reply({ data: isListing() ? read() : null }); } });
})();
