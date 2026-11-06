import fs from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseToReact} from '../../dist/react.js';
import corpus from './corpus.mjs';
const rows=corpus.map(tex=>`<section><code>${tex.replaceAll('&','&amp;').replaceAll('<','&lt;')}</code><div class="formula">${renderToStaticMarkup(parseToReact(tex,{display:true}))}</div></section>`).join('');
fs.writeFileSync(new URL('./preview.html',import.meta.url),`<!doctype html><meta charset="utf-8"><title>flashmath native MathML verification</title><style>body{font:16px system-ui;margin:32px;color:#182233;background:#f6f8fb}h1{font-size:24px}button{padding:8px 16px}main{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:20px}section{border:1px solid #ccd5e0;background:white;padding:16px;min-height:100px}code{display:block;font-size:12px;color:#526478;overflow-wrap:anywhere}.formula{margin-top:16px;font-size:24px}output{margin-left:16px}</style><h1>flashmath — React SSR / native MathML</h1><button id="mode">Switch display</button><output id="result">Pending</output><main>${rows}</main><script>
const math=[...document.querySelectorAll('math')];let block=true;
document.querySelector('#mode').onclick=()=>{block=!block;for(const m of math){if(block)m.setAttribute('display','block');else m.removeAttribute('display');}};
addEventListener('load',()=>{const button=document.querySelector('#mode');button.click();const inline=math.every(m=>!m.hasAttribute('display'));button.click();const block=math.every(m=>m.getAttribute('display')==='block');const bounds=math.map(m=>({width:m.getBoundingClientRect().width,height:m.getBoundingClientRect().height}));const pass=inline&&block&&bounds.every(b=>b.width>0&&b.height>0)&&document.querySelectorAll('merror').length===0;document.querySelector('#result').textContent=JSON.stringify({pass,inlineToggle:inline,blockToggle:block,formulaCount:math.length,bounds});document.body.dataset.screenRun=pass?'pass':'fail';});
</script>`);
