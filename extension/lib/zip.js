// PDS extension: opens a zip (PDS's own packages are stored, other zips may be deflated) and
// returns its files. Used to lay out a "Download package" from PDS for Meta Ads Manager.
export async function unzip(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer()), dv = new DataView(buf.buffer);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Not a zip file');
  const n = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
  const out = [], dec = new TextDecoder();
  for (let k = 0; k < n; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
    if (name.endsWith('/')) continue;
    const start = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true), raw = buf.subarray(start, start + csize);
    let data;
    if (method === 0) data = new Blob([raw]);
    else if (method === 8) data = await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();
    else continue;
    out.push({ name, blob: new Blob([data], { type: typeOf(name) }) });
  }
  return out;
}
export function typeOf(name) {
  const e = String(name).toLowerCase().split('.').pop();
  return { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', mp4: 'video/mp4', mov: 'video/quicktime', m4v: 'video/x-m4v', webm: 'video/webm', zip: 'application/zip', pdf: 'application/pdf' }[e] || 'application/octet-stream';
}
