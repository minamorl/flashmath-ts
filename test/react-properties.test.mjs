import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseToReact,mathMLAstToReact} from '../dist/react.js';
import subject from '../bench/flashmath/adapter.mjs';
import oracle from '../conformance/mathjax.mjs';
import {normalizeMathML} from '../conformance/normalize.mjs';

export const warningCases=[
 [String.raw`\unicode[Arial]{x41}`,{packages:['base','unicode']}],
 [String.raw`\href{}{x}`,{packages:['base','html']}],
 [String.raw`<tex-html><label for="field" class="label" tabindex="0">Name</label></tex-html>`,{packages:['base','texhtml'],texOptions:{allowTexHTML:true}}],
];
test('React SSR emits no invalid property or empty href warnings',()=>{
 const errors=[],original=console.error;console.error=(...args)=>errors.push(args);
 try{
  for(const [tex,options]of warningCases)assert.match(renderToStaticMarkup(parseToReact(tex,options)),/<math/);
  const html=renderToStaticMarkup(mathMLAstToReact({kind:'math',text:'',start:0,attributes:{},children:[{kind:'mi',text:'x',start:0,children:[],attributes:{fontfamily:'Arial',fontstyle:'italic',fontweight:'bold',class:'token',for:'f',tabindex:'0'}}]}));
  assert.match(html,/font-family="Arial"/);assert.match(html,/for="f"/);assert.match(html,/class="token"/);
 }finally{console.error=original;}
 assert.deepEqual(errors,[]);
});
test('unterminated superscript reports the MathJax error',async()=>{
 assert.equal(normalizeMathML(subject('x^{',{packages:['base']})),normalizeMathML(await oracle('x^{',{packages:['base']})));
});
