// Diagnostic source-stage costs, not the published cross-engine benchmark.
import fs from 'node:fs';
import {configure} from '../../src/configuration.ts';
import {Parser} from '../../src/parser.ts';
import {sessionState} from '../../src/session-state.ts';
import {mathMLForOutput} from '../../src/output.ts';
import {toMathMLString} from '../../src/serialize.ts';
const groups=JSON.parse(fs.readFileSync('bench/hardening/bench-corpus.json')).filter(g=>['boldsymbol','mhchem','extpfeil','tagformat'].includes(g.group));
const rows=[];let checksum=0;
for(const g of groups){
 const input={packages:g.packages,display:true,texOptions:{...g.texOptions,ignoreDuplicateLabels:true}},sums=[0,0,0,0];
 for(let k=0;k<500;k++)for(const tex of g.texs){
  let now=performance.now();const {options,configuration}=configure(input);sums[0]+=performance.now()-now;
  now=performance.now();const ast=new Parser(tex,options,configuration,sessionState()).run();sums[1]+=performance.now()-now;
  now=performance.now();const native=mathMLForOutput(ast,options);sums[2]+=performance.now()-now;
  now=performance.now();checksum+=toMathMLString(native).length;sums[3]+=performance.now()-now;
 }
 rows.push({group:g.group,usPerExpression:Object.fromEntries(['configure','parseAndExpose','nativeLowering','serializeAndNativeCheck'].map((name,i)=>[name,sums[i]*1000/(500*g.texs.length)]))});
}
const result={method:'source through tsx; 500 passes; includes per-stage clock overhead/JIT; diagnosis only',rows,checksum};
fs.writeFileSync('bench/release/performance-stages.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
