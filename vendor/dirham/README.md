# dirham (vendored)

The UAE Dirham sign, U+20C3 (Unicode 18.0), as a one-glyph web font. CAS draws it in place of
"AED" on the canvas (preview and every export); the copy itself keeps "AED".

- Source: https://github.com/pooyagolchian/dirham — npm `dirham` 1.5.3, MIT (see `LICENSE`)
- Tarball integrity: `sha512-qL3X14qvIMKBBQo0+KC3Zqc7UL1SdlAr2vpYHbZxoCzc844Het3Pw7JT5+sU1pfnOdSb8YG0KE9p/c7YtrLrpQ==`
- `dirham-sans.ttf` is the package's `dist/fonts/sans/dirham-sans.ttf`, unchanged — the source.
- `dirham-sans-cap.woff` is what CAS serves: the same outline set to Google Sans Flex's cap height
  (716/1000) with its bottom on the baseline and 60-unit sidebearings, so the sign stands exactly
  as tall as the figures beside it. The package draws it one em tall, 0.1 em below the baseline,
  which stood taller than "2.6M" and hung under the line. Made by `make-cap.py` (standard library
  only; this machine has no fontTools or brotli, so it writes WOFF 1.0):

      python3 -I vendor/dirham/make-cap.py vendor/dirham/dirham-sans.ttf vendor/dirham/dirham-sans-cap.woff

  Its `unicode-range` in CAS is U+20C3 only, so it sits first in the canvas font stack and never
  draws any other character.
- `dirham.svg` is the sign's outline from the repo root, for reference.

There is no JS toolchain on this machine, so the package is vendored rather than installed with
npm. To update: download the new tarball from the npm registry, check its integrity, copy its
`dirham-sans.ttf` over and rerun `make-cap.py`.
