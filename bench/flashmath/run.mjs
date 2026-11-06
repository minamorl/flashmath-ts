import fs from 'node:fs';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {sourceFingerprint,fileFingerprint} from './fingerprint.mjs';
import {engine,versions} from './engines.mjs';
import corpus from './corpus.mjs';
import {parseMathML,firstDifference} from '../../conformance/normalize.mjs';
const value=(flag,fallback)=>{const i=process.argv.indexOf(flag);return i<0?fallback:Number(process.argv[i+1]);};
const n=value('--samples',7),iterations=value('--iterations',100);
if(!Number.isSafeInteger(n)||n<5||!Number.isSafeInteger(iterations)||iterations<1)throw Error('Require samples >= 5 and iterations >= 1');
const version=versions();if(version.mathjax!=='4.1.3'||version.temml!=='0.14.0')throw Error('Unexpected reference versions');
const quantile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1];
const report={sourceSha256:sourceFingerprint(),normalizerSha256:fileFingerprint(new URL('../../conformance/normalize.mjs',import.meta.url)),createdAt:new Date().toISOString(),node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0].model,versions:{...version,flashmath:'0.0.0'},samples:n,iterations,corpus,method:{warmupCorpusPasses:200,percentile:'nearest-rank',warm:'fresh process per sample, import/setup/warmup excluded; TeX to serialized MathML, no result cache',cold:'fresh process per sample, import/setup and first conversion reported separately; parent wall clock includes Node startup',display:true},engines:{}};
// Validate every engine's output before entering the timed work.
for(const name of ['mathjax','temml','flashmath']){const render=await engine(name);for(const tex of corpus)parseMathML(render(tex));}
for(let round=0;round<n;round++)for(const name of ['mathjax','temml','flashmath'].slice(round%3).concat(['mathjax','temml','flashmath'].slice(0,round%3))){
 const start=performance.now();const child=spawnSync(process.execPath,[new URL('./worker.mjs',import.meta.url).pathname,name,'1',String(iterations)],{encoding:'utf8',env:{...process.env,NODE_ENV:'production'},timeout:60000,maxBuffer:8*1024*1024});
 if(child.status!==0)throw Error(`${name}: ${child.stderr||child.error}`);
 const raw=JSON.parse(child.stdout);raw.parentWallMs=performance.now()-start;
 (report.engines[name]??={raw:[]}).raw.push(raw);
 fs.writeFileSync(new URL('./benchmark.raw.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 console.error(`round ${round+1}/${n} ${name}`);
}
const reference=await engine('mathjax');const expected=corpus.map(tex=>parseMathML(reference(tex)));
for(const [name,data]of Object.entries(report.engines)){
 const render=await engine(name);data.outputChecks=corpus.map((tex,i)=>{const xml=render(tex);return {tex,sha256:createHash('sha256').update(xml).digest('hex'),differenceFromMathJax:firstDifference(expected[i],parseMathML(xml))};});
 const warm=data.raw.flatMap(r=>r.samples.map(s=>s.elapsedMs*1000/s.conversions));
 const cold=data.raw.map(r=>r.coldStartToFirstStringMs);
 data.summary={warmMicrosecondsPerConversion:{p50:quantile(warm,.5),p95:quantile(warm,.95)},coldStartToFirstStringMs:{p50:quantile(cold,.5),p95:quantile(cold,.95)}};
}
fs.writeFileSync(new URL('./benchmark.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
for(const [name,data]of Object.entries(report.engines))console.log(name,JSON.stringify(data.summary));
