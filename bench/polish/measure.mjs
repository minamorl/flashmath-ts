// Reuse the release worker and its accepted Temml subsets; alternate fresh processes.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const label=process.argv[2];
if(!/^[a-z-]+$/.test(label??''))throw Error('expected result label');
const runs={flashmath:[],temml:[]};
for(let i=0;i<7;i++)for(const engine of i%2?['temml','flashmath']:['flashmath','temml']){
 const p=spawnSync(process.execPath,['bench/hardening/bench-worker.mjs',engine,'warm','bench/polish','1000','21'],{encoding:'utf8'});
 if(p.status!==0)throw Error(`${engine} exit ${p.status}\n${p.stderr}`);
 runs[engine].push(JSON.parse(p.stdout.trim()));
}
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const rows=['boldsymbol','verb@temml'].map(key=>{
 const temmlKey=key.split('@')[0],samples=(engine,k)=>runs[engine].flatMap(r=>r.warmUsPerExpr[k]);
 const flashmath=median(samples('flashmath',key)),temml=median(samples('temml',temmlKey));
 return {group:key,flashmathUs:flashmath,temmlUs:temml,speedup:temml/flashmath,samplesPerEngine:samples('flashmath',key).length};
});
const report={node:process.version,method:'release worker; alternating fresh processes; 7 processes per engine; 1000 warmup passes, 21 samples x 20 timed passes; identical Temml-accepted inputs; native output; no timing gate',rows,runs};
fs.writeFileSync(`bench/polish/${label}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({label,node:report.node,rows},null,2));
