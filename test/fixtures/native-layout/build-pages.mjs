// Build side-by-side HTML pages (flashmath native MathML | MathJax SVG) for the
// 10 math-only native rendering fixtures and their frozen 0.1.2 controls.
// Usage: node test/fixtures/native-layout/build-pages.mjs [fixture.md]
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {parseToMathMLAst, toMathMLString} from '../../../dist/index.js';
import {TeX} from '@mathjax/src/js/input/tex.js';
import {SVG} from '@mathjax/src/js/output/svg.js';
import {mathjax} from '@mathjax/src/js/mathjax.js';
import {liteAdaptor} from '@mathjax/src/js/adaptors/liteAdaptor.js';
import {RegisterHTMLHandler} from '@mathjax/src/js/handlers/html.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.env.PROBE_OUTPUT_DIR ? path.resolve(process.env.PROBE_OUTPUT_DIR) : path.join(here,'generated');
fs.mkdirSync(out, {recursive: true});
const fixture = process.argv[2] ?? path.join(here,'fixture.md');
const md = fs.readFileSync(fixture, 'utf8');
const baseline = JSON.parse(fs.readFileSync(path.join(here,'items.json'),'utf8'));

const PACKAGES = ['base', 'ams', 'amscd', 'newcommand'];
const require = createRequire(import.meta.resolve('@mathjax/src/package.json'));
mathjax.asyncLoad = name => import(pathToFileURL(require.resolve(name.replace('/js/', '/mjs/'))).href);
for (const [pkg, name] of Object.entries({base: 'Base', ams: 'Ams', amscd: 'AmsCd', newcommand: 'Newcommand'}))
  await import(`@mathjax/src/js/input/tex/${pkg}/${name}Configuration.js`);
const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

// Reject prose outside the numbered titles and TeX delimiters.
assert.match(md,/^## 1\. /);
const chunks = md.trim().split(/\n\n(?=## \d+\. )/);
if (chunks.length !== 10) throw Error(`expected 10 items, got ${chunks.length}`);
const tokenRe = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\$([^$]+?)\$/g;
const items = chunks.map((chunk,index) => {
  const heading=chunk.match(/^## (\d+)\. ([^\n]+)\n/);
  assert.ok(heading,`invalid heading for item ${index+1}`);
  const n=Number(heading[1]),title=heading[2],body=chunk.slice(heading[0].length);
  assert.equal(n,index+1);
  assert.equal(body.replace(tokenRe,'').trim(),'',`item ${n}: only TeX is allowed below the title`);
  const parts = [];
  for (const m of body.matchAll(tokenRe)) {
    if (m[1] !== undefined) parts.push({kind: 'display', delim: '$$', tex: m[1].trim()});
    else if (m[2] !== undefined) parts.push({kind: 'display', delim: '\\[\\]', tex: m[2].trim()});
    else parts.push({kind: 'inline', delim: '$', tex: m[3]});
  }
  assert.ok(parts.length,`item ${n}: missing TeX`);
  assert.deepEqual({n,title,math:parts.map(p=>({delim:p.delim,display:p.kind==='display',tex:p.tex}))},
    {...baseline[index],math:baseline[index].math.map(({native,...math})=>math)});
  return {n,title,parts};
});

const esc = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

let mjStyles = '';
async function mathjaxSvg(tex, display) {
  const input = new TeX({packages: PACKAGES});
  const output = new SVG({fontCache: 'none'});
  const doc = mathjax.document('', {InputJax: input, OutputJax: output});
  const node = await doc.convertPromise(tex, {display, em: 20, ex: 9, containerWidth: 600});
  mjStyles = adaptor.outerHTML(output.styleSheet(doc));
  const html = adaptor.outerHTML(node);
  return {html, error: html.includes('data-mjx-error') || html.includes('merror')};
}

const record = [];
for (const item of items) {
  let fm = '', mj = '', before = '';
  const rec = {n: item.n, title:item.title, math: []};
  for (const [index,p] of item.parts.entries()) {
    const display = p.kind === 'display';
    const native = toMathMLString(parseToMathMLAst(p.tex, {display, packages: PACKAGES}));
    const ref = await mathjaxSvg(p.tex, display);
    rec.math.push({delim: p.delim, display, tex: p.tex, native, flashmathMerror: native.includes('<merror'),
      mathjaxError: ref.error});
    const wrap = display ? 'div class="display"' : 'span';
    const close = display ? 'div' : 'span';
    fm += `<${wrap}>${native}</${close}>`;
    mj += `<${wrap}>${ref.html}</${close}>`;
    before += `<${wrap}>${baseline[item.n-1].math[index].native}</${close}>`;
  }
  rec.fmHtml = fm; rec.mjHtml = mj; rec.beforeHtml = before;
  record.push(rec);
}

const stixUrl = path.relative(out,path.join(here,'node_modules/@fontsource/stix-two-math/files/stix-two-math-latin-400-normal.woff2'));
const VARIANTS = {
  // No math font CSS at all: Chromium's default `math` family resolves through fontconfig.
  'nofont': {css: ''},
  // Omit unicode-range: fontsource's Latin range excludes Greek/right arrows.
  'stix': {css: `@font-face{font-family:'STIX Two Math';src:url(${stixUrl}) format('woff2');font-display:block}
math{font-family:'STIX Two Math'}`},
};
// issue #9 section 1b: per-column alternating text-align right/left and zero cell padding on aligned.
const ISSUE9 = `mtable[columnalign^="right left"]>mtr>mtd{padding:0}
mtable[columnalign^="right left"]>mtr>mtd:nth-child(odd){text-align:right}
mtable[columnalign^="right left"]>mtr>mtd:nth-child(even){text-align:left}`;

const pages = [];
for (const before of [false,true]) for (const [font, v] of Object.entries(VARIANTS)) for (const issue9 of [false, true]) {
  const name = `${before?'before-':''}${font}${issue9 ? '-issue9' : ''}`;
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${name}</title>
<link rel="stylesheet" href="${path.relative(out,path.join(here,'../../../dist/fonts.css'))}">
${mjStyles}
<style>
body{margin:16px;font:16px/1.6 sans-serif;background:#fff;color:#000}
section{margin:0 0 16px;border:1px solid #bbb}
h2{font-size:14px;margin:0;padding:4px 8px;background:#eee}
.row{display:grid;grid-template-columns:1fr 1fr}
.side{padding:8px 12px;font-size:20px;overflow:visible}
.side+.side{border-left:1px solid #bbb}
.tag{font:12px monospace;color:#666}
.display{margin:10px 0;text-align:center}
math[display=block]{display:block math}
${v.css}
${issue9 ? ISSUE9 : ''}
</style></head><body>
<p class="tag">variant=${name} | left: flashmath native MathML (packages ${PACKAGES.join(',')}) | right: MathJax 4.1.3 SVG</p>
${record.map(r => `<section id="item-${r.n}"><h2>${r.n}. ${esc(r.title)}</h2><div class="row">
<div class="side fm"><div class="tag">flashmath ${before?'0.1.2 (frozen)':'native'}</div>${before?r.beforeHtml:r.fmHtml}</div>
<div class="side mj"><div class="tag">MathJax</div>${r.mjHtml}</div></div></section>`).join('\n')}
</body></html>`;
  fs.writeFileSync(path.join(out, `page-${name}.html`), html);
  pages.push(name);
}
console.log(JSON.stringify({pages,items:record.map(r=>({n:r.n,math:r.math.map(m=>({delim:m.delim,fmErr:m.flashmathMerror,mjErr:m.mathjaxError}))}))}));
