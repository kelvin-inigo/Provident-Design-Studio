#!/usr/bin/env node
// CASV's copy of CAS's design components (2026-11-27, by request: "import all the design components
// from CAS to CASV, as well as all their variants … function similar to CAS"). It is a COPY, chosen
// over a shared file so CAS on main is not touched: run this again to bring a CAS change over.
//
//   node tools/video-dev/cas-copy/make.cjs            # reads CAS from main (git show main:…)
//
// It loads CAS's class in Node with stand-ins, takes each member CASV needs by name, word for word
// (Function.toString, so nothing is retyped), and writes cas-components.js: those members inside a
// class still called CampaignStudio (so every `CampaignStudio.x` / `C.x` inside them resolves), the
// four StudioBase text helpers they lean on, and `paintOps`, CAS's renderOpsToCanvas drawing onto
// a canvas it is given (CASV's own), so glass blurs the video under it.
const fs = require('fs'), vm = require('vm'), path = require('path'), { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../../..');
const html = execSync('git show "main:Provident Campaign Studio.dc.html"', { cwd: ROOT, maxBuffer: 64 << 20 }).toString();
let js = html.slice(html.indexOf('>', html.indexOf('<script type="text/x-dc"')) + 1);
js = js.slice(0, js.indexOf('</script>'));
// the class alone: from its line to the first line that is just "}"
const a = js.indexOf('class CampaignStudio extends StudioBase'), b = js.indexOf('\n}\n', a) + 2;
js = js.slice(a, b);
const stub = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : stub, apply: () => stub, construct: () => stub });
class StudioBase {}
const ctx = { StudioBase, console, document: stub, navigator: {}, localStorage: stub, location: { search: '', hash: '', href: '' }, DC: stub,
  fetch: () => new Promise(() => {}), FontFace: function () {}, Image: function () {}, Blob: function () {}, URL, TextEncoder, TextDecoder, atob, btoa, setTimeout, clearTimeout };
ctx.window = ctx; ctx.self = ctx;
vm.createContext(ctx);
vm.runInContext(js + '\n;globalThis.__C = CampaignStudio;', ctx);
const C = ctx.__C;
// ---- what CASV needs: the layout, its sizes, its drawing; everything they reach, found by following
// `C.x` / `CampaignStudio.x` / `this.x` from these roots (custom screenshot components left out)
const ROOTS = ['I:modLayout', 'I:emitEls', 'S:tkFor', 'S:tkMod', 'I:modPx', 'I:renderOpsToCanvas', 'S:VOPT', 'S:VDESC', 'S:iconUrl', 'S:newVariant', 'S:gapOf', 'S:railBox', 'S:inkSwatches'];
const SKIP = new Set(['I:custLayout', 'S:custWrap', 'S:CUST_ROLE', 'S:mirrored']);
const src = k => { const [t, n] = k.split(':'), v = t === 'S' ? C[n] : C.prototype[n]; return typeof v === 'function' ? v.toString() : v instanceof RegExp ? v.toString() : JSON.stringify(v) || ''; };
const has = k => { const [t, n] = k.split(':'); return Object.prototype.hasOwnProperty.call(t === 'S' ? C : C.prototype, n); };
const seen = [], set = new Set(), stack = [...ROOTS];
while (stack.length) {
  const k = stack.pop(); if (set.has(k) || SKIP.has(k) || !has(k)) continue;
  set.add(k); seen.push(k);
  const s = src(k);
  for (const m of s.matchAll(/\b(?:C|CampaignStudio|Cls)\.([A-Za-z_$][\w$]*)/g)) stack.push('S:' + m[1]);
  for (const m of s.matchAll(/\bthis\.([A-Za-z_$][\w$]*)/g)) { stack.push('I:' + m[1]); stack.push('S:' + m[1]); }
}
const member = k => {
  const [t, n] = k.split(':'), v = t === 'S' ? C[n] : C.prototype[n], st = t === 'S' ? 'static ' : '';
  if (typeof v === 'function') { const s = v.toString(); return /^(async\s+)?[A-Za-z_$][\w$]*\s*\(/.test(s) ? st + s : st + n + ' = ' + s + ';'; }
  return st + n + ' = ' + (v instanceof RegExp ? v.toString() : JSON.stringify(v)) + ';';
};
// data first (static fields may be read by other static initialisers), then methods
const data = seen.filter(k => { const [t, n] = k.split(':'), v = t === 'S' ? C[n] : C.prototype[n]; return typeof v !== 'function'; });
const meth = seen.filter(k => data.indexOf(k) < 0 && k !== 'I:renderOpsToCanvas');
let paint = src('I:renderOpsToCanvas');
const head = /^renderOpsToCanvas\(built, scale\) \{\s*const c = document\.createElement\('canvas'\);\s*c\.width = built\.W \* scale; c\.height = built\.H \* scale;\s*const ctx = c\.getContext\('2d'\);/;
if (!head.test(paint)) throw new Error('renderOpsToCanvas changed shape: adapt make.cjs');
paint = paint.replace(head, 'paintOps(ctx, c, built, scale) {').replace('ctx.scale(scale, scale);', '').replace(/return c;\s*\}$/, 'return ctx;\n  }');
const sha = execSync('git rev-parse --short main', { cwd: ROOT }).toString().trim();
const sb = fs.readFileSync(path.join(ROOT, 'studio-base.js'), 'utf8');
const sbm = name => { const i = sb.indexOf('\n  ' + name); if (i < 0) throw new Error('studio-base: ' + name); let d = 0, j = sb.indexOf('{', i); for (; j < sb.length; j++) { if (sb[j] === '{') d++; else if (sb[j] === '}' && !--d) break; } return sb.slice(i + 1, j + 1); };
const out = `/* CAS's design components, copied for CASV — GENERATED by tools/video-dev/cas-copy/make.cjs from
   Provident Campaign Studio.dc.html on main (${sha}). Do not edit by hand: change CAS, then run it again.
   ${seen.length} members of CampaignStudio, word for word, plus StudioBase's text measuring and paintOps
   (CAS's renderOpsToCanvas, drawing onto CASV's canvas). window.CasComp is the class. */
(function () {
  'use strict';
  if (!window.providentFont) { window.providentFontFam = 'Google Sans Flex'; window.providentFont = '"Google Sans Flex", sans-serif'; }
  if (!window.providentFillText) window.providentFillText = function (ctx, text, x, y, ls) {   // runtime.js's, letterSpacing branch
    text = String(text == null ? '' : text);
    if (!ls) { ctx.fillText(text, x, y); return; }
    try { ctx.letterSpacing = ls + 'px'; ctx.fillText(text, x, y); ctx.letterSpacing = '0px'; return; } catch (e) {}
    let cx = x; for (const ch of text) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + ls; }
  };
  class StudioBase {
    static RTL_RE = ${/static RTL_RE = (.*);/.exec(sb)[1]};
    static STRONG_RE = ${/static STRONG_RE = (.*);/.exec(sb)[1]};
    ${sbm('static dirOf(')}
    static _asc = null;
    ${sbm('static fontAsc(')}
    ${sbm('static baseLH(')}
    ${sbm('mctx(')}
    ${sbm('meas(')}
    ${sbm('wrapRuns(')}
  }
  class CampaignStudio extends StudioBase {
${data.map(k => '    ' + member(k)).join('\n')}
${meth.map(k => '    ' + member(k)).join('\n')}
    // CASV stand-ins for what CAS keeps outside the components: no Arabic mirror here
    static mirrored() { return false; }
    ${paint}
  }
  window.CasComp = CampaignStudio;
})();
`;
fs.writeFileSync(path.join(ROOT, 'cas-components.js'), out);
console.log('cas-components.js:', seen.length, 'members from main', sha, (out.length / 1024).toFixed(0) + ' KB');
