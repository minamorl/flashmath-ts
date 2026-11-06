import {performance} from 'node:perf_hooks';
import corpus from './corpus.mjs';
const begin=performance.now();
const {engine}=await import('./engines.mjs');
const render=await engine(process.argv[2]);
const initialized=performance.now();
let checksum=0;
const firstStart=performance.now();const first=render(corpus[0]);const firstEnd=performance.now();
checksum+=first.length;
const cold=[];
for(const tex of corpus){const start=performance.now();const output=render(tex);const end=performance.now();if(typeof output!=='string'||!output.includes('<math')||output.includes('<merror'))throw Error('Invalid benchmark conversion');checksum+=output.length;cold.push({tex,microseconds:(end-start)*1000,bytes:Buffer.byteLength(output)});}
const n=Number(process.argv[3]),iterations=Number(process.argv[4]);
for(let i=0;i<200;i++)for(const tex of corpus)checksum+=render(tex).length;
const samples=[];
for(let sample=0;sample<n;sample++){
 const start=performance.now();for(let i=0;i<iterations;i++)for(const tex of corpus)checksum+=render(tex).length;
 samples.push({sample,elapsedMs:performance.now()-start,conversions:iterations*corpus.length});
}
console.log(JSON.stringify({engine:process.argv[2],importAndSetupMs:initialized-begin,firstConversionMs:firstEnd-firstStart,coldStartToFirstStringMs:firstEnd-begin,cold,samples,checksum}));
