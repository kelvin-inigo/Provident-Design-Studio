#!/bin/sh
# Copies PDS's chrome kit into the extension (an unpacked extension cannot read files outside
# its folder). Run after any change to ui-design-system/provident-ui.css, as part of the
# "a kit change fans out" pass, and commit the copy with it.
cd "$(dirname "$0")" || exit 1
mkdir -p kit
sed "s#url('../_ds/provident-estate-design-system-fefe9827-a837-4a34-8c55-259bc5c8a319/assets/fonts/GoogleSansFlex-Variable.woff2')#url('GoogleSansFlex-Variable.woff2')#" ../ui-design-system/provident-ui.css > kit/provident-ui.css
cp ../_ds/provident-estate-design-system-fefe9827-a837-4a34-8c55-259bc5c8a319/assets/fonts/GoogleSansFlex-Variable.woff2 kit/
grep -c "url('GoogleSansFlex-Variable.woff2')" kit/provident-ui.css
