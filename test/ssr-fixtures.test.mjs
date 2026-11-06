import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseToMathMLAst,toMathMLString,UnsupportedFeatureError} from '../dist/index.js';
import {parseToReact} from '../dist/react.js';
import {parseMathML} from '../conformance/normalize.mjs';
import {reviveOptions} from '../conformance/options.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('../conformance/fixtures/mathjax-4.1.3.json',import.meta.url)));
// React serializes CSS declaration whitespace; keep all tree, text and other attributes strict.
function comparable(xml) {
 const tree=parseMathML(xml),stack=[tree];
 while(stack.length){const n=stack.pop();for(const a of n.attrs)if(a[0]==='{}style')a[1]=a[1].replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\([^)]*\)|\s*([:;])\s*/g,(all,separator)=>separator??all).replace(/;$/,'');for(const c of n.children)if(typeof c!=='string')stack.push(c);}
 return tree;
}
test('SSR structurally equals string output for every executable fixture of every supported package',t=>{
 const groups={};let unsupported=0;
 for(const record of fixture.records.filter(r=>r.input&&!r.unsupported)){
  const {tex,...input}=record.input,options=reviveOptions(input);
  let ast;
  try{ast=parseToMathMLAst(tex,options);}
  catch(error){if(error instanceof UnsupportedFeatureError){unsupported++;continue;}throw error;}
  assert.deepEqual(comparable(renderToStaticMarkup(parseToReact(tex,options))),comparable(toMathMLString(ast)),record.id);
  groups[record.group]=(groups[record.group]??0)+1;
 }
 for(const name of ['base','newcommand','physics','braket','cancel','centernot','bbox','enclose'])assert.ok(groups[name],name);
 t.diagnostic(JSON.stringify({groups,unsupported}));
});
