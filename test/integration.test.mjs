import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseToReact,mathMLAstToReact} from '../dist/react.js';
import {createMathMLParser,toMathMLString,parseToMathMLAst} from '../dist/index.js';
import subject from '../bench/flashmath/adapter.mjs';
import oracle from '../conformance/mathjax.mjs';
import {normalizeMathML} from '../conformance/normalize.mjs';
const compare=async(tex,options)=>assert.equal(normalizeMathML(subject(tex,options)),normalizeMathML(await oracle(tex,options)),tex);

test('row spacing is adjacent to the break; whitespace starts literal next-row brackets',async()=>{
 for(const tex of [String.raw`\begin{array}{c}(a)\\ [b]\end{array}`,String.raw`\begin{array}{c}a\\[b]\end{array}`,String.raw`\begin{array}{c}a\\[2pt]b\end{array}`,String.raw`\begin{array}{c}a\\ [2pt]b\end{array}`,String.raw`\matrix{a\\ [b]}`])await compare(tex,{packages:['base'],display:true});
});

test('React CSS bridge accepts case-insensitive names and preserves custom properties and quoted values',()=>{
 const html=renderToStaticMarkup(mathMLAstToReact({kind:'math',text:'',start:0,children:[],attributes:{style:'COLOR: red; BACKGROUND-COLOR: blue; -WEBKIT-TRANSFORM: scale(1); -MS-TRANSFORM: scale(1); --Exact: "A:B; C"; content: "a:b; c"'}}));
 assert.match(html,/style="color:red;background-color:blue;-webkit-transform:scale\(1\);-ms-transform:scale\(1\);--Exact:&quot;A:B; C&quot;;content:&quot;a:b; c&quot;"/);
 assert.match(renderToStaticMarkup(parseToReact(String.raw`\style{COLOR: red}{x}`,{packages:['base','html']})),/style="color:red"/);
});

test('dynamically required character handlers work immediately and in later session inputs',async()=>{
 const options={packages:['base','require'],display:true};
 const tex=String.raw`\require{physics}\qty(x)+\qty|y|`;
 assert.equal(normalizeMathML(subject(tex,options)),normalizeMathML(await oracle(String.raw`\qty(x)+\qty|y|`,{packages:['base','physics'],display:true})));
 const parser=createMathMLParser(options);parser.parse(String.raw`\require{physics}`);
 assert.equal(normalizeMathML(toMathMLString(parser.parse(String.raw`\qty(x)`))),normalizeMathML(await oracle(String.raw`\qty(x)`,{packages:['base','physics'],display:true})));
});

test('promoted units dependency obeys options and package activation',async()=>{
 for(const tex of [String.raw`\units[3]{m}`,String.raw`\unitfrac[5]{m}{s}`,String.raw`\nicefrac{x}{y}`])
  for(const units of [{},{loose:true},{ugly:true}])await compare(tex,{packages:['base','units'],display:true,texOptions:{units}});
 assert.match(subject(String.raw`\units{m}`,{packages:['base']}),/Undefined control sequence/);
});

test('nested physics Dirac arguments consume slices linearly without losing fences',t=>{
 const original=String.prototype.slice,evidence=[];
 for(const name of ['ket','bra','braket','dyad']){
  const rows=[];
  for(const depth of [100,200,400]){
   const end=name==='braket'||name==='dyad'?'}{y}':'}';
   const tex=`\\${name}{`.repeat(depth)+'x'+end.repeat(depth);
   let slices=0,characters=0,ast;
   String.prototype.slice=function(...args){const value=Reflect.apply(original,this,args);slices++;characters+=value.length;return value;};
   try{ast=parseToMathMLAst(tex,{packages:['base','physics'],throwOnError:true});}
   finally{String.prototype.slice=original;}
   const nodes=[ast];let fences=0;
   while(nodes.length){const n=nodes.pop();if(n.kind==='mo'&&['|','⟨','⟩'].includes(n.text))fences++;nodes.push(...n.children);}
   assert.ok(fences>=2*depth,`${name}: ${fences} fences`);
   rows.push({depth,slices,characters});
  }
  assert.ok(rows[2].slices<=2*rows[1].slices+8,`${name}: ${JSON.stringify(rows)}`);
  assert.ok(rows[2].characters<=2*rows[1].characters+8,`${name}: ${JSON.stringify(rows)}`);
  evidence.push({name,rows});
 }
 t.diagnostic(JSON.stringify(evidence));
});

test('unnumbered empheq preserves upstream mixed token/cell shape and empty gather layout',async()=>{
 for(const env of ['equation','equation*','gather*'])
  for(const decoration of ['left=L','left=L,right=R'])
   for(const body of ['x=y','x',...(env==='gather*'?['']:[])])
    await compare(`\\begin{empheq}[${decoration}]{${env}}${body}\\end{empheq}`,{packages:['base','ams','empheq'],display:true});
});
