import fs from 'node:fs';
import os from 'node:os';
import assert from 'node:assert/strict';
const rawPath='bench/flashmath/hardening-benchmark.raw.json';
const raw=JSON.parse(fs.readFileSync(rawPath));
const corpus=JSON.parse(fs.readFileSync('bench/hardening/bench-corpus.json'));
const percentile=(a,p)=>[...a].sort((a,b)=>a-b)[Math.max(0,Math.ceil(a.length*p)-1)];
const warm={};for(const [engine,runs]of Object.entries(raw.warm)){
 warm[engine]={};for(const key of Object.keys(runs[0].warmUsPerExpr)){const samples=runs.flatMap(r=>r.warmUsPerExpr[key]);warm[engine][key]={p50:percentile(samples,.5),p95:percentile(samples,.95),samples:samples.length};}
}
const cold={};for(const [engine,runs]of Object.entries(raw.cold)){
 cold[engine]={};for(const key of ['importAndSetupMs','firstConversionMs','importToFirstStringMs','coldStartToFirstStringMs','bench12FirstPassMs'])cold[engine][key]={p50:percentile(runs.map(r=>r[key]),.5),p95:percentile(runs.map(r=>r[key]),.95)};
}
const rows=corpus.filter(g=>g.texs.length).map(g=>{
 const count=g.temml.filter(Boolean).length, commonKey=count&&count<g.texs.length?g.group+'@temml':g.group;
 return {group:g.group,total:g.texs.length,temmlAccepted:count,stateless:warm.flashmath[g.group],session:warm.session[g.group],mathjax:warm.mathjax[g.group],temml:warm.temml[g.group],common:count?{stateless:warm.flashmath[commonKey],session:warm.session[commonKey],mathjax:warm.mathjax[commonKey],temml:warm.temml[g.group]}:null};
});
const summary={groups:rows.length,statelessFasterThanMathJax:rows.filter(r=>r.stateless.p50<r.mathjax.p50).length,temmlComparable:rows.filter(r=>r.common).length,statelessFasterThanTemml:rows.filter(r=>r.common&&r.common.stateless.p50<r.common.temml.p50).length,mathjaxMinSpeedup:Math.min(...rows.map(r=>r.mathjax.p50/r.stateless.p50)),temmlMinSpeedup:Math.min(...rows.filter(r=>r.common).map(r=>r.common.temml.p50/r.common.stateless.p50))};
const data={machine:{node:process.version,platform:os.platform(),arch:os.arch(),cpu:os.cpus()[0].model},versions:{flashmath:'0.1.0',mathjax:'4.1.3',temml:'0.14.0'},method:'Alternating fresh processes; 9 cold processes per engine, warm 5 processes x 7 samples; 100 warmup corpus passes and 20 timed passes/sample. p50/p95 nearest rank. Native default flashmath output. Reused sessions retain their documented document state. Temml accepted subsets replayed identically by every engine.',summary,cold,rows};
fs.writeFileSync('bench/flashmath/hardening-benchmark.json',JSON.stringify(data,null,2)+'\n');
const n=x=>x?.p50.toFixed(2)??'—';
let md=`# Hardening benchmark\n\nNode ${process.version}, ${data.machine.cpu}, ${data.machine.platform}/${data.machine.arch}. MathJax 4.1.3; Temml 0.14.0; flashmath 0.1.0.\n\n${data.method}\n\nRaw samples: [hardening-benchmark.raw.json](hardening-benchmark.raw.json). Full p50/p95 and cohort sizes: [hardening-benchmark.json](hardening-benchmark.json). Corpus and runners: ../hardening/{bench-corpus.json,bench-worker.mjs,bench-driver.mjs}.\n\nStateless beats MathJax in ${summary.statelessFasterThanMathJax}/${summary.groups} full groups (minimum ${summary.mathjaxMinSpeedup.toFixed(2)}x), and Temml in ${summary.statelessFasterThanTemml}/${summary.temmlComparable} accepted cohorts (minimum ${summary.temmlMinSpeedup.toFixed(2)}x). Temml cannot render any input in the remaining groups; no throughput comparison is claimed there.\n\nWarm microseconds/expression, p50. Temml partial rows measure fewer expressions; only the common-input table below directly compares those rows.\n\n| Group | Inputs | Stateless | Session | MathJax | Temml | Temml accepted |\n|---|---:|---:|---:|---:|---:|---:|\n`;
for(const r of rows)md+=`| ${r.group} | ${r.total} | ${n(r.stateless)} | ${n(r.session)} | ${n(r.mathjax)} | ${n(r.temml)} | ${r.temmlAccepted}/${r.total} |\n`;
md+='\nPartial Temml cohorts, identical accepted inputs for all engines (µs/expression, p50):\n\n| Group | Inputs | Stateless | Session | MathJax | Temml |\n|---|---:|---:|---:|---:|---:|\n';
for(const r of rows.filter(r=>r.temmlAccepted&&r.temmlAccepted<r.total))md+=`| ${r.group} | ${r.temmlAccepted} | ${n(r.common.stateless)} | ${n(r.common.session)} | ${n(r.common.mathjax)} | ${n(r.common.temml)} |\n`;
md+='\nCold milliseconds, p50 / p95, independent fresh processes:\n\n| Engine | Import + setup → first string | First conversion | First bench12 pass |\n|---|---:|---:|---:|\n';
for(const engine of ['flashmath','session','mathjax','temml']){const f=key=>`${cold[engine][key].p50.toFixed(2)} / ${cold[engine][key].p95.toFixed(2)}`;md+=`| ${engine} | ${f('importToFirstStringMs')} | ${f('firstConversionMs')} | ${f('bench12FirstPassMs')} |\n`;}
md+='\nImport timing starts immediately before dynamic import, includes parser/document setup and first serialization, and excludes Node process bootstrap. Corpus JSON loading is excluded from this column. This is machine-specific evidence, not a universal ranking.\n';
fs.writeFileSync('bench/flashmath/hardening-benchmark.md',md);
console.log(JSON.stringify(summary));console.log(JSON.stringify({coldImportToFirstStringMs:Object.fromEntries(Object.entries(cold).map(([e,r])=>[e,r.importToFirstStringMs]))}));
assert.equal(summary.statelessFasterThanMathJax,summary.groups);
assert.equal(summary.statelessFasterThanTemml,summary.temmlComparable);
