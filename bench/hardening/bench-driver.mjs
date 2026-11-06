// Runs engines interleaved in fresh processes; warm n=5 processes x 7 samples, cold n=9 processes.
import {spawnSync} from 'node:child_process';import fs from 'node:fs';import path from 'node:path';
const V=process.env.V;const worker=path.join(V,'bench-worker.mjs');const engines=process.env.ENG.split(',');
const run=(e,m,a=[])=>{const p=spawnSync('node',[worker,e,m,V,...a],{encoding:'utf8',maxBuffer:1e9});if(p.status!==0)throw Error(e+' '+m+' exit '+p.status+'\n'+p.stderr.slice(0,800));return JSON.parse(p.stdout.trim().split('\n').pop());};
const cold={},warm={};
for(const e of engines){cold[e]=[];warm[e]=[];}
for(let i=0;i<(process.env.COLD??9);i++)for(const e of engines)cold[e].push(run(e,'cold'));
console.error('cold done');
for(let i=0;i<Number(process.env.WARM??5);i++)for(const e of engines){warm[e].push(run(e,'warm',['100','7']));console.error('warm',i,e);}
fs.writeFileSync(path.join(V,(process.env.OUT||'bench-raw.json')),JSON.stringify({cold,warm},null,0));
