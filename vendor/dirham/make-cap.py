#!/usr/bin/env python3
"""Make dirham-sans-cap.woff: the package's Dirham Sans sign set to Google Sans Flex's cap height.

The package draws U+20C3 one em tall, 0.1 em below the baseline, so beside CAS's figures it stood
taller than "2.6M" and hung under the line. This rescales the one outline so its bottom sits ON the
baseline and its top on the cap height (716/1000, Google Sans Flex's H and M, measured in the
browser), with even sidebearings, and writes a WOFF 1.0 (zlib, so no brotli or fontTools needed).

    python3 -I vendor/dirham/make-cap.py <dirham-sans.ttf from npm dirham> vendor/dirham/dirham-sans-cap.woff

Standard library only; the input is the package's `dist/fonts/sans/dirham-sans.ttf` (MIT).
"""
import struct
import sys
import zlib

CAP = 716        # target ink height in font units (Google Sans Flex cap height, per 1000)
SIDE = 60        # left and right sidebearing, in font units


def tables(d):
    n = struct.unpack('>H', d[4:6])[0]
    out = {}
    for i in range(n):
        tag, _cs, off, ln = struct.unpack('>4sIII', d[12 + 16 * i:28 + 16 * i])
        out[tag.decode('latin-1')] = bytearray(d[off:off + ln])
    return out


def checksum(b):
    b = bytes(b) + b'\0' * ((4 - len(b) % 4) % 4)
    return sum(struct.unpack('>%dI' % (len(b) // 4), b)) & 0xFFFFFFFF


def parse_glyph(g):
    nc, xmin, ymin, xmax, ymax = struct.unpack('>hhhhh', g[:10])
    assert nc > 0, 'composite or empty glyph'
    p = 10
    ends = list(struct.unpack('>%dH' % nc, g[p:p + 2 * nc])); p += 2 * nc
    il = struct.unpack('>H', g[p:p + 2])[0]; p += 2
    ins = bytes(g[p:p + il]); p += il
    npts = ends[-1] + 1
    flags = []
    while len(flags) < npts:
        f = g[p]; p += 1
        flags.append(f)
        if f & 8:
            r = g[p]; p += 1
            flags.extend([f] * r)
    def coords(short, same):
        vals, v = [], 0
        nonlocal p
        for f in flags:
            if f & short:
                dlt = g[p]; p += 1
                v += dlt if f & same else -dlt
            elif not f & same:
                v += struct.unpack('>h', g[p:p + 2])[0]; p += 2
            vals.append(v)
        return vals
    xs = coords(2, 16)
    ys = coords(4, 32)
    return ends, ins, [f & 1 for f in flags], xs, ys


def build_glyph(ends, ins, on, xs, ys):
    out = bytearray(struct.pack('>hhhhh', len(ends), min(xs), min(ys), max(xs), max(ys)))
    out += struct.pack('>%dH' % len(ends), *ends)
    out += struct.pack('>H', len(ins)) + ins
    out += bytes(on)                       # every coordinate as a plain 2-byte delta
    for vals in (xs, ys):
        prev = 0
        for v in vals:
            out += struct.pack('>h', v - prev); prev = v
    out += b'\0' * (len(out) % 2)
    return out


def main(src, dst):
    T = tables(open(src, 'rb').read())
    head, hhea, maxp = T['head'], T['hhea'], T['maxp']
    ng = struct.unpack('>H', maxp[4:6])[0]
    assert struct.unpack('>h', head[50:52])[0] == 0, 'expects short loca'
    loca = [struct.unpack('>H', T['loca'][2 * i:2 * i + 2])[0] * 2 for i in range(ng + 1)]
    nhm = struct.unpack('>H', hhea[34:36])[0]
    hm = [list(struct.unpack('>Hh', T['hmtx'][4 * i:4 * i + 4])) for i in range(nhm)]

    glyf, newloca = bytearray(), []
    for i in range(ng):
        newloca.append(len(glyf))
        g = T['glyf'][loca[i]:loca[i + 1]]
        if not g:
            continue
        ends, ins, on, xs, ys = parse_glyph(g)
        x0, y0, h = min(xs), min(ys), max(ys) - min(ys)
        k = CAP / h
        xs = [round((x - x0) * k) + SIDE for x in xs]
        ys = [round((y - y0) * k) for y in ys]
        glyf += build_glyph(ends, ins, on, xs, ys)
        hm[i] = [max(xs) + SIDE, SIDE]
    newloca.append(len(glyf))

    T['glyf'] = glyf
    T['loca'] = bytearray(b''.join(struct.pack('>H', o // 2) for o in newloca))
    T['hmtx'] = bytearray(b''.join(struct.pack('>Hh', a, l) for a, l in hm))
    # bounding box, extents, advances
    boxes = [struct.unpack('>hhhh', glyf[o + 2:o + 10]) for j, o in enumerate(newloca[:-1]) if newloca[j + 1] > o]
    xmin, ymin = min(b[0] for b in boxes), min(b[1] for b in boxes)
    xmax, ymax = max(b[2] for b in boxes), max(b[3] for b in boxes)
    head[36:44] = struct.pack('>hhhh', xmin, ymin, xmax, ymax)
    adv = max(a for a, _ in hm)
    hhea[10:18] = struct.pack('>Hhhh', adv, min(l for a, l in hm if a), min(a - l - (xmax - xmin) for a, l in hm if a), xmax)
    head[8:12] = b'\0\0\0\0'

    tags = sorted(T)
    # the TrueType file, to set head.checkSumAdjustment
    off = 12 + 16 * len(tags)
    dirs, body = b'', b''
    for t in tags:
        b = bytes(T[t]); pad = b + b'\0' * ((4 - len(b) % 4) % 4)
        dirs += struct.pack('>4sIII', t.encode('latin-1'), checksum(b), off + len(body), len(b))
        body += pad
    es = max(i for i in range(16) if 2 ** i <= len(tags))
    sfnt_head = struct.pack('>IHHHH', 0x00010000, len(tags), 16 * 2 ** es, es, 16 * len(tags) - 16 * 2 ** es)
    ttf = sfnt_head + dirs + body
    head[8:12] = struct.pack('>I', (0xB1B0AFBA - checksum(ttf)) & 0xFFFFFFFF)

    # WOFF 1.0
    entries, data = [], b''
    hdr_len = 44 + 20 * len(tags)
    for t in tags:
        b = bytes(T[t]); z = zlib.compress(b, 9)
        if len(z) >= len(b):
            z = b
        entries.append((t, hdr_len + len(data), len(z), len(b), checksum(b)))
        data += z + b'\0' * ((4 - len(z) % 4) % 4)
    total = hdr_len + len(data)
    sfnt_size = 12 + 16 * len(tags) + sum(len(T[t]) + (4 - len(T[t]) % 4) % 4 for t in tags)
    woff = struct.pack('>4sIIHHIHHIIIII', b'wOFF', 0x00010000, total, len(tags), 0, sfnt_size, 1, 0, 0, 0, 0, 0, 0)
    for t, o, cl, ol, cs in entries:
        woff += struct.pack('>4sIIII', t.encode('latin-1'), o, cl, ol, cs)
    woff += data
    open(dst, 'wb').write(woff)
    print('wrote %s: %d bytes, bbox %s, advance %d' % (dst, len(woff), (xmin, ymin, xmax, ymax), adv))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
