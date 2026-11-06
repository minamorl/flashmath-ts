import fs from 'node:fs';
import assert from 'node:assert/strict';
import subject from '../flashmath/adapter.mjs';
import oracle from '../../conformance/mathjax.mjs';
import {parseMathML,firstDifference} from '../../conformance/normalize.mjs';
import corpus from '../flashmath/pkg-physics-verifier/corpus.mjs';
import * as before from './physics-before/dist/index.js';
const cases=[...corpus];
const add=(tex,packages,group)=>cases.push({tex,packages,group});
const physics=['base','newcommand','physics'];
for(const body of ['x','x+y','\\frac{1}{2}','\\sqrt{x}','\\qty{x}','\\qty(x)','\\qty|x|','\\abs{x}','\\ket{x}','\\bra{x}','\\braket{x}{y}','\\mqty(x)','\\sin(x)','\\dv{x}','\\dd{x}','\\comm{A}{B}','\\left(x\\right)','\\text{hello}','x^2','\\overbrace{x}']) {
  for(const name of ['qty','pqty','bqty','Bqty','vqty','abs','norm','order'])
    for(const modifier of ['','*','\\big'])add(`\\${name}${modifier}{${body}}`,physics,'quantity-composition');
}
for(const tex of ['\\abs{x}^2','\\qty{x}_0','\\pqty*{x}','\\qty{\\left. x\\right|}','\\qty{\\overbrace{x}^{n}}','\\sqrt{\\ket{x}}'])add(tex,physics,'extra-physics');
for(const tex of ['\\begin{array}{c}(a)\\\\ [b]\\end{array}','\\begin{array}{c}a\\\\[b]\\end{array}','\\begin{array}{c}a\\\\[2pt]b\\end{array}','\\begin{array}{c}a\\\\ [2pt]b\\end{array}','\\matrix{a\\\\ [b]}'])add(tex,['base'],'array-spacing');
for(const env of ['equation','equation*','align*','gather*','multline*'])
  for(const decoration of ['left=L','right=R','left=L,right=R'])
    for(const tex of ['x=y','x',''])add(`\\begin{empheq}[${decoration}]{${env}}${tex}\\end{empheq}`,['base','ams','empheq'],'unnumbered-empheq');
const output=[];
for(const {tex,packages,group} of cases){
  const options={packages,display:true};
  const row={tex,packages,group};
  try{row.oracle=await oracle(tex,options);}catch(e){row.oracleError=String(e);}
  try{row.before=before.toMathMLString(before.parseToMathMLAst(tex,options));}catch(e){row.beforeError=String(e);}
  try{row.actual=subject(tex,options);}catch(e){row.error=String(e);}
  const difference=xml=>row.oracle&&xml?firstDifference(parseMathML(row.oracle),parseMathML(xml)):true;
  row.valid=!!row.oracle&&!row.oracle.includes('<merror');
  row.beforeMatched=difference(row.before)===null;
  row.difference=difference(row.actual);
  row.matched=row.difference===null;
  output.push(row);
}
const regressions=output.filter(r=>r.beforeMatched&&!r.matched);
const summary={total:output.length,matched:output.filter(r=>r.matched).length,valid:output.filter(r=>r.valid).length,validMatched:output.filter(r=>r.valid&&r.matched).length,regressions:regressions.map(r=>r.tex),byGroup:{}};
for(const r of output){const g=summary.byGroup[r.group]??={total:0,matched:0,valid:0,validMatched:0};g.total++;if(r.matched)g.matched++;if(r.valid)g.valid++;if(r.valid&&r.matched)g.validMatched++;}
fs.writeFileSync(new URL('./probes.json',import.meta.url),JSON.stringify({summary,rows:output},null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
for(const r of output.filter(r=>!r.matched))console.log('DIFF',r.group,r.tex,JSON.stringify(r.difference));
if(process.argv.includes('--gate')){
  assert.deepEqual(regressions,[],'all 1e1867f matches must survive');
  assert.deepEqual(output.filter(r=>r.valid&&!r.matched),[],'valid probe matches');
}
