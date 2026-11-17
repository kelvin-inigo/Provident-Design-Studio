#!/bin/sh
# Rebuild the PDS architecture PDF from its HTML source.
cd "$(dirname "$0")" || exit 1
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
  --no-pdf-header-footer --virtual-time-budget=5000 \
  --print-to-pdf=PDS-Architecture.pdf pds-architecture.html 2>/dev/null
ls -l PDS-Architecture.pdf
