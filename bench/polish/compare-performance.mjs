import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const baseline=process.argv[2];
if(!baseline)throw Error('Pass the root of a built baseline checkout');
const root=process.cwd(),corpus=path.join(root,'bench/polish'),worker=path.join(root,'bench/hardening/bench-worker.mjs');
const runs={baseline:[],current:[],temml:[]};
for(let i=0;i<9;i++){
 const order=['baseline','current','temml'];
 for(const name of [...order.slice(i%3),...order.slice(0,i%3)]){
  const p=spawnSync(process.execPath,[worker,name==='temml'?'temml':'flashmath','warm',corpus,'1500','21'],{cwd:name==='baseline'?baseline:root,encoding:'utf8'});
  if(p.status!==0)throw Error(`${name} exit ${p.status}\n${p.stderr}`);
  runs[name].push(JSON.parse(p.stdout.trim()));
 }
}
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const rows=['boldsymbol','verb@temml'].map(key=>{
 const values=Object.fromEntries(Object.entries(runs).map(([name,samples])=>[name,median(samples.flatMap(r=>r.warmUsPerExpr[name==='temml'?key.split('@')[0]:key]))]));
 return {group:key,usPerExpression:values,improvement:values.baseline/values.current,temmlSpeedup:values.temml/values.current,samplesPerEngine:189};
});
const report={node:process.version,baselineCommit:'3106780',method:'release worker; rotating fresh baseline/current/Temml processes; 9 processes each; 1500 warmup passes; 21 samples of 20 passes; identical Temml accepted cohorts; native serialized output; timing is evidence, not a CI gate',rows,runs};
fs.writeFileSync('bench/polish/performance-comparison.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({node:report.node,method:report.method,rows},null,2));
