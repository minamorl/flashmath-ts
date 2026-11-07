// Focused before/after timings plus readable-source CPU samples. No output cache.
import fs from 'node:fs';
import {Session} from 'node:inspector';
import {parseToMathMLAst,toMathMLString} from '../../dist/index.js';
import temml from 'temml';
const names=['boldsymbol','mhchem','extpfeil','tagformat'];
const corpus=JSON.parse(fs.readFileSync('bench/hardening/bench-corpus.json')).filter(g=>names.includes(g.group));
const median=a=>a.sort((a,b)=>a-b)[a.length>>1];
let checksum=0;const rows=[];
for(const g of corpus){
 const options={packages:g.packages,display:true,texOptions:{...g.texOptions,ignoreDuplicateLabels:true}},inputs=g.texs.filter((_,i)=>g.temml[i]);
 const render={flashmath:t=>toMathMLString(parseToMathMLAst(t,options)),temml:t=>temml.renderToString(t,{displayMode:true,throwOnError:true,xml:true})};
 const samples={flashmath:[],temml:[]};
 for(let i=0;i<100;i++)for(const t of inputs)for(const r of Object.values(render))checksum+=r(t).length;
 for(let i=0;i<15;i++)for(const name of i%2?['temml','flashmath']:['flashmath','temml']){
  const begin=performance.now();for(let k=0;k<100;k++)for(const t of inputs)checksum+=render[name](t).length;
  samples[name].push((performance.now()-begin)*1000/(100*inputs.length));
 }
 rows.push({group:g.group,inputs:inputs.length,samples,p50:Object.fromEntries(Object.entries(samples).map(([name,values])=>[name,median([...values])]))});
}
let profile;
if(process.env.PROFILE){
 const source=await import('../../src/index.ts'),session=new Session();session.connect();
 const post=(method,params={})=>new Promise((resolve,reject)=>session.post(method,params,(e,r)=>e?reject(e):resolve(r)));
 await post('Profiler.enable');await post('Profiler.start');
 for(const g of corpus){const o={packages:g.packages,display:true,texOptions:{...g.texOptions,ignoreDuplicateLabels:true}};
  const end=performance.now()+1500;while(performance.now()<end)for(const t of g.texs)checksum+=source.toMathMLString(source.parseToMathMLAst(t,o)).length;
 }
 const {profile:p}=await post('Profiler.stop');session.disconnect();
 profile=p.nodes.filter(n=>n.hitCount).sort((a,b)=>b.hitCount-a.hitCount).slice(0,40).map(n=>({name:n.callFrame.functionName,file:n.callFrame.url.replace(process.cwd()+'/', ''),line:n.callFrame.lineNumber+1,selfSamples:n.hitCount}));
}
const result={node:process.version,method:'15 alternating warm samples, 100 timed corpus passes; same Temml accepted inputs; source CPU profile separate from dist timings',rows,profile,checksum};
fs.writeFileSync(`bench/release/performance-${process.argv[2]??'current'}.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({rows:rows.map(({group,p50})=>({group,...p50,speedup:p50.temml/p50.flashmath})),profile},null,2));
