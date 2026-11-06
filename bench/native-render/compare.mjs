import fs from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseToReact} from '../../dist/react.js';
import {parseToMathMLAst,toMathMLString} from '../../dist/index.js';
import {cases} from './cases.mjs';
import {TeX} from '@mathjax/src/js/input/tex.js';
import {SVG} from '@mathjax/src/js/output/svg.js';
import {mathjax} from '@mathjax/src/js/mathjax.js';
import {liteAdaptor} from '@mathjax/src/js/adaptors/liteAdaptor.js';
import {RegisterHTMLHandler} from '@mathjax/src/js/handlers/html.js';
import {MathJaxMhchemFontExtension} from './reference-font/mjs/svg.js';
import {SerializedMmlVisitor} from '@mathjax/src/js/core/MmlTree/SerializedMmlVisitor.js';
const directory=new URL('./',import.meta.url), stage=process.argv.includes('--before')?'before':'after';
const require=createRequire(import.meta.resolve('@mathjax/src/package.json'));
mathjax.asyncLoad=name=>import(pathToFileURL(require.resolve(name.replace('/js/','/mjs/'))).href);
for(const [pkg,name] of Object.entries({base:'Base',newcommand:'Newcommand',ams:'Ams',bbox:'Bbox',cancel:'Cancel',enclose:'Enclose',bussproofs:'Bussproofs',centernot:'Centernot',physics:'Physics',mhchem:'Mhchem'}))await import(`@mathjax/src/js/input/tex/${pkg}/${name}Configuration.js`);
const adaptor=liteAdaptor();RegisterHTMLHandler(adaptor);
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const archived=stage==='before'&&fs.existsSync(new URL('before-cases.json',directory))?JSON.parse(fs.readFileSync(new URL('before-cases.json',directory))):null;
const rows=[],visitor=new SerializedMmlVisitor();let styles='';
for(const c of cases){
  const input=new TeX({packages:c.options.packages,...c.options.texOptions});
  const output=new SVG({fontCache:'none'});
  output.font.addExtension(MathJaxMhchemFontExtension);
  const document=mathjax.document('',{InputJax:input,OutputJax:output});
  const svg=adaptor.outerHTML(await document.convertPromise(c.tex,{display:true,em:24,ex:12,containerWidth:620}));
  styles=adaptor.outerHTML(output.styleSheet(document));
  const ast=parseToMathMLAst(c.tex,c.options),saved=archived?.find(r=>r.id===c.id&&r.tex===c.tex),native=saved?.native??toMathMLString(ast),react=saved?.react??renderToStaticMarkup(parseToReact(c.tex,c.options));
  if(native.includes('<merror')||svg.includes('data-mjx-error'))throw Error(`Invalid comparison: ${c.id} ${c.tex}`);
  rows.push({...c,native,react,mathjax:toMathMLString(parseToMathMLAst(c.tex,{...c.options,output:'mathjax'}),{output:'mathjax'}),referenceMathML:visitor.visitTree(input.mathNode),svg});
}
const groups=[...new Set(rows.map(r=>r.group))];
const html=`<!doctype html><html><head><meta charset="utf-8"><title>flashmath native / MathJax 4.1.3 · ${stage}</title>${styles}<style>
body{margin:24px;color:#17202a;background:#f5f7fa;font:15px system-ui}header{margin:0 0 20px}h1{font-size:24px}select{font:inherit;padding:6px}h2{margin:24px 0 10px}article{background:white;border:1px solid #d4dce5;margin:6px 0;padding:10px 16px;break-inside:avoid}code{display:block;font-size:12px;white-space:pre-wrap;color:#4c5968}section{display:grid;grid-template-columns:1fr 1fr;gap:24px}.cell{min-height:80px;display:flex;align-items:center;justify-content:center;font-size:24px;min-width:0;overflow:visible}.cell>math{font-size:24px;font-family:'DejaVu Math TeX Gyre',math}mjx-container{margin:0!important}mjx-container[width=full]{width:100%}.column-labels{display:grid;grid-template-columns:1fr 1fr;text-align:center;font-weight:bold;padding:12px;background:#dde6ef}#summary{margin:12px 0}article[hidden]{display:none}
</style></head><body><header><h1>flashmath native / MathJax 4.1.3 · ${stage}</h1><div class="column-labels"><span>MathJax SVG</span><span>MathML Core + inline CSS</span></div><p>${rows.length} formulas · local assets · 24px on both sides</p><label>Group <select id="group"><option value="all">all</option>${groups.map(g=>`<option>${g}</option>`).join('')}</select></label> <label>Native source <select id="source"><option value="react">React SSR</option><option value="native">toMathMLString</option></select></label></header><main>${groups.map(group=>`<div data-group="${group}"><h2>${group}</h2>${rows.filter(r=>r.group===group).map(r=>`<article id="${r.id}" data-group="${group}"><code>${r.id} · ${escape(r.tex)}</code><section><div class="cell reference">${r.svg}</div><div class="cell native">${r.react}</div></section></article>`).join('')}</div>`).join('')}</main><script>
const rows=${JSON.stringify(rows.map(({id,native,react})=>({id,native,react}))).replaceAll('<','\\u003c')};
document.querySelector('#source').onchange=e=>{for(const r of rows)document.querySelector('#'+r.id+' .native').innerHTML=r[e.target.value]};
document.querySelector('#group').onchange=e=>{for(const n of document.querySelectorAll('main>[data-group]'))n.hidden=e.target.value!=='all'&&n.dataset.group!==e.target.value};
</script></body></html>`;
fs.writeFileSync(new URL(`${stage}.html`,directory),html);
fs.writeFileSync(new URL(`${stage}-cases.json`,directory),JSON.stringify(rows,null,2)+'\n');
console.log(`comparison ${stage}: ${rows.length} formulas; ${groups.join(', ')}`);
