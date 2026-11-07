import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseToMathMLAst,toMathMLString,UnsupportedFeatureError} from '../dist/index.js';
import {parseToReact} from '../dist/react.js';
import {parseMathML} from '../conformance/normalize.mjs';
import {reviveOptions} from '../conformance/options.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('../conformance/fixtures/mathjax-4.1.3.json',import.meta.url)));
// Normalize React CSS whitespace, shared font property spelling, and omitted empty href.
// Every other tree, text and attribute difference remains strict.
function comparable(xml) {
 const tree=parseMathML(xml),stack=[tree];
 while(stack.length){const n=stack.pop();n.attrs=n.attrs.filter(([key,value])=>key!=='{}href'||value!=='');for(const a of n.attrs){if(/^\{\}font-(family|weight|style)$/.test(a[0]))a[0]=a[0].replace('font-','font');if(a[0]==='{}style')a[1]=a[1].replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\([^)]*\)|\s*([:;])\s*/g,(all,separator)=>separator??all).replace(/;$/,'');}n.attrs.sort((a,b)=>a[0].localeCompare(b[0]));for(const c of n.children)if(typeof c!=='string')stack.push(c);}
 return tree;
}
test('SSR structurally equals string output for all 2635 executable fixtures',t=>{
 const groups={};let unsupported=0;const errors=[],original=console.error;console.error=(...args)=>errors.push(args);
 try{
 for(const record of fixture.records.filter(r=>r.input&&!r.unsupported)){
  const {tex,...input}=record.input,options=reviveOptions(input);
  let ast;
  try{ast=parseToMathMLAst(tex,options);}
  catch(error){if(error instanceof UnsupportedFeatureError){unsupported++;continue;}throw error;}
  assert.deepEqual(comparable(renderToStaticMarkup(parseToReact(tex,options))),comparable(toMathMLString(ast)),record.id);
  groups[record.group]=(groups[record.group]??0)+1;
 }
 }finally{console.error=original;}
 assert.deepEqual(errors,[],'All executable fixtures must render without React warnings');
 for(const name of ['base','newcommand','physics','braket','cancel','centernot','bbox','enclose'])assert.ok(groups[name],name);
 assert.equal(unsupported,0,'Every executable fixture must exercise the integrated React path');
 assert.equal(Object.values(groups).reduce((a,b)=>a+b,0),2635);
 t.diagnostic(JSON.stringify({groups,unsupported}));
});

test('SSR comparison normalizes only documented React serialization differences',()=>{
 const math=style=>`<math xmlns="http://www.w3.org/1998/Math/MathML"><mstyle style="${style}"><mi>x</mi></mstyle></math>`;
 assert.deepEqual(comparable(math('border: 1px solid; color: red')),comparable(math('border:1px solid;color:red')));
 for(const other of ['border:2px solid;color:red','border:1px solid;color:blue'])assert.notDeepEqual(comparable(math('border:1px solid;color:red')),comparable(math(other)));
 assert.notDeepEqual(comparable(math("content:'a: b'")),comparable(math("content:'a:b'")));
 assert.notDeepEqual(comparable(math('color:red')),comparable(math('color:red').replace('<mi>x</mi>','<mo>x</mo>')));
});
