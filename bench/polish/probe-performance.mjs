// Wider diagnosis after the full run exposed chemistry continuation overhead.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync}from 'node:child_process';
import {sourceFingerprint}from '../flashmath/fingerprint.mjs';
const baseline=process.argv[2];if(!baseline)throw Error('Pass the built baseline checkout');
const dir='bench/polish/probe';fs.mkdirSync(dir,{recursive:true});
const groups=JSON.parse(fs.readFileSync('bench/hardening/bench-corpus.json')).filter(g=>['boldsymbol','verb','mhchem','begingroup'].includes(g.group));
fs.writeFileSync(dir+'/bench-corpus.json',JSON.stringify(groups,null,2)+'\n');
const runs={baseline:[],current:[],temml:[]},worker=path.resolve('bench/hardening/bench-worker.mjs');
for(let i=0;i<3;i++)for(const name of ['baseline','current','temml']){
 const p=spawnSync(process.execPath,[worker,name==='temml'?'temml':'flashmath','warm',path.resolve(dir),'250','11'],{cwd:name==='baseline'?baseline:process.cwd(),encoding:'utf8'});
 if(p.status!==0)throw Error(name+' '+p.stderr);runs[name].push(JSON.parse(p.stdout));
}
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const rows=groups.map(g=>{
 const partial=g.temml.some(Boolean)&&!g.temml.every(Boolean),key=g.group+(partial?'@temml':'');
 const p50=Object.fromEntries(Object.entries(runs).map(([name,r])=>[name,median(r.flatMap(r=>r.warmUsPerExpr[name==='temml'?g.group:key]))]));
 return {group:g.group,p50,improvement:p50.baseline/p50.current,temmlSpeedup:p50.temml/p50.current};
});
fs.writeFileSync('bench/polish/probe.json',JSON.stringify({sourceSha256:sourceFingerprint(),method:'diagnosis only; release worker; 3 processes x 11 samples; 250 warmup passes; original baseline/current/Temml, identical accepted inputs',rows,runs},null,2)+'\n');
console.log(JSON.stringify(rows,null,2));
