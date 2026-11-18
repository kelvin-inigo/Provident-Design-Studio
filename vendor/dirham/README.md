# dirham (vendored)

The UAE Dirham sign, U+20C3 (Unicode 18.0), as a one-glyph web font. CAS draws it in place of
"AED" on the canvas (preview and every export); the copy itself keeps "AED".

- Source: https://github.com/pooyagolchian/dirham — npm `dirham` 1.5.3, MIT (see `LICENSE`)
- Tarball integrity: `sha512-qL3X14qvIMKBBQo0+KC3Zqc7UL1SdlAr2vpYHbZxoCzc844Het3Pw7JT5+sU1pfnOdSb8YG0KE9p/c7YtrLrpQ==`
- `dirham-sans.woff2` is the package's `dist/fonts/sans/dirham-sans.woff2`, unchanged. Its
  `unicode-range` is U+20C3 only, so it sits first in the canvas font stack and never draws
  any other character.
- `dirham.svg` is the sign's outline from the repo root, for reference.

There is no JS toolchain on this machine, so the package is vendored rather than installed with
npm. To update: download the new tarball from the npm registry, check its integrity, and copy
the same file over.
