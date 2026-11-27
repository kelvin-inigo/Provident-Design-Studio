// PDS extension: a QR code for a listing's link (byte mode, error correction M, versions 1-40).
// Follows the published QR algorithm (ISO/IEC 18004) as Project Nayuki lays it out; nothing in
// PDS makes QR codes (OPS only reads them), so the listing importer draws its own.
const ECC = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
const BLOCKS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];

const rawModules = v => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; } return r; };
const dataCodewords = v => Math.floor(rawModules(v) / 8) - ECC[v] * BLOCKS[v];
const gmul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 0xFF; };
function rsDivisor(deg) { const r = new Array(deg).fill(0); r[deg - 1] = 1; let root = 1; for (let i = 0; i < deg; i++) { for (let j = 0; j < r.length; j++) { r[j] = gmul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; } root = gmul(root, 2); } return r; }
function rsRemainder(data, div) { const r = div.map(() => 0); for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= gmul(c, f); }); } return r; }

export function qrMatrix(text) {
  const bytes = Array.from(new TextEncoder().encode(text));
  let ver = 1;
  for (; ver <= 40; ver++) { const cc = ver < 10 ? 8 : 16; if (4 + cc + bytes.length * 8 <= dataCodewords(ver) * 8) break; }
  if (ver > 40) throw new Error('Too long for a QR code');
  // data bits
  const bits = []; const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
  put(4, 4); put(bytes.length, ver < 10 ? 8 : 16); bytes.forEach(b => put(b, 8));
  const cap = dataCodewords(ver) * 8;
  put(0, Math.min(4, cap - bits.length)); put(0, (8 - bits.length % 8) % 8);
  for (let p = 0xEC; bits.length < cap; p ^= 0xEC ^ 0x11) put(p, 8);
  const data = []; for (let i = 0; i < bits.length; i += 8) { let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; data.push(b); }
  // error correction, interleaved
  const nb = BLOCKS[ver], el = ECC[ver], raw = Math.floor(rawModules(ver) / 8), nShort = nb - raw % nb, shortLen = Math.floor(raw / nb), div = rsDivisor(el);
  const blocks = []; for (let i = 0, k = 0; i < nb; i++) { const d = data.slice(k, k + shortLen - el + (i < nShort ? 0 : 1)); k += d.length; const e = rsRemainder(d, div); if (i < nShort) d.push(0); blocks.push(d.concat(e)); }
  const cw = []; for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - el || j >= nShort) cw.push(b[i]); });
  // the matrix
  const size = ver * 4 + 17, M = [], F = [];
  for (let y = 0; y < size; y++) { M.push(new Array(size).fill(false)); F.push(new Array(size).fill(false)); }
  const set = (x, y, d) => { M[y][x] = !!d; F[y][x] = true; };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const finder = (x, y) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)), xx = x + dx, yy = y + dy; if (xx >= 0 && xx < size && yy >= 0 && yy < size) set(xx, yy, d !== 2 && d !== 4); } };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  const align = []; if (ver > 1) { const n = Math.floor(ver / 7) + 2, step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2; align.push(6); for (let p = size - 7; align.length < n; p -= step) align.splice(1, 0, p); }
  align.forEach((a, i) => align.forEach((b, j) => { if ((i === 0 && j === 0) || (i === 0 && j === align.length - 1) || (i === align.length - 1 && j === 0)) return; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }));
  const format = mask => { const d = (0 << 3) | mask; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537); const b = ((d << 10) | r) ^ 0x5412, g = i => (b >>> i) & 1;
    for (let i = 0; i <= 5; i++) set(8, i, g(i)); set(8, 7, g(6)); set(8, 8, g(7)); set(7, 8, g(8)); for (let i = 9; i < 15; i++) set(14 - i, 8, g(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, g(i)); for (let i = 8; i < 15; i++) set(8, size - 15 + i, g(i)); set(8, size - 8, 1); };
  format(0);
  if (ver >= 7) { let r = ver; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25); const b = (ver << 12) | r; for (let i = 0; i < 18; i++) { const bit = (b >>> i) & 1, a = size - 11 + i % 3, c = Math.floor(i / 3); set(a, c, bit); set(c, a, bit); } }
  // the codewords, zig-zag
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) { if (right === 6) right = 5; for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) { const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - v : v; if (!F[y][x] && i < cw.length * 8) { M[y][x] = ((cw[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++; } } }
  // the mask with the lowest penalty
  const flip = m => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { if (F[y][x]) continue; const c = [(x + y) % 2, y % 2, x % 3, (x + y) % 3, (Math.floor(x / 3) + Math.floor(y / 2)) % 2, x * y % 2 + x * y % 3, (x * y % 2 + x * y % 3) % 2, ((x + y) % 2 + x * y % 3) % 2][m]; if (c === 0) M[y][x] = !M[y][x]; } };
  const penalty = () => { let p = 0, dark = 0;
    const line = get => { for (let a = 0; a < size; a++) { let run = 1; const hist = []; let prev = get(a, 0);
      for (let b = 1; b < size; b++) { const c = get(a, b); if (c === prev) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else { hist.push(run); run = 1; prev = c; } } hist.push(run);
      const row = []; for (let b = 0; b < size; b++) row.push(get(a, b) ? 1 : 0); const s = row.join('');
      for (const pat of ['10111010000', '00001011101']) { let k = s.indexOf(pat); while (k >= 0) { p += 40; k = s.indexOf(pat, k + 1); } } } };
    line((a, b) => M[a][b]); line((a, b) => M[b][a]);
    for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) { const c = M[y][x]; if (c === M[y][x + 1] && c === M[y + 1][x] && c === M[y + 1][x + 1]) p += 3; }
    M.forEach(r => r.forEach(c => { if (c) dark++; })); const tot = size * size; p += (Math.ceil(Math.abs(dark * 20 - tot * 10) / tot) - 1) * 10; return p; };
  let best = 0, bestP = Infinity;
  for (let m = 0; m < 8; m++) { flip(m); format(m); const pp = penalty(); if (pp < bestP) { bestP = pp; best = m; } flip(m); }
  flip(best); format(best);
  return M;
}

// A black-on-white PNG with the four-module quiet zone. OPS's QR slot shows it in its rounded square.
export async function qrPng(text, px = 640) {
  const M = qrMatrix(text), n = M.length + 8, s = Math.max(1, Math.floor(px / n)), w = n * s;
  const c = new OffscreenCanvas(w, w), g = c.getContext('2d');
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, w); g.fillStyle = '#000000';
  M.forEach((r, y) => r.forEach((d, x) => { if (d) g.fillRect((x + 4) * s, (y + 4) * s, s, s); }));
  return c.convertToBlob({ type: 'image/png' });
}
