import fs from 'node:fs';
import assert from 'node:assert/strict';
const b=JSON.parse(fs.readFileSync('bench/flashmath/hardening-benchmark.json'));
const n=x=>x.p50.toFixed(2),cold=e=>`${n(b.cold[e].importToFirstStringMs)} / ${b.cold[e].importToFirstStringMs.p95.toFixed(2)}`;
let text=`## Measured parser throughput\n\n${b.machine.cpu}; ${b.machine.platform}/${b.machine.arch}; Node ${b.machine.node}.
MathJax 4.1.3 / Temml 0.14.0. TeX → serialized MathML only; this excludes browser
layout and React SSR. Warm: 5 fresh processes × 7 samples, 100 warmup corpus
passes, 20 timed passes/sample. Values below are nearest-rank p50 µs/expression.
Where Temml accepts fewer inputs, **every column uses that same accepted subset**.
A reused flashmath session and a reused MathJax document reset on declaration
inputs (Declare*, newcommand, newenvironment), with setup cost included;
otherwise document state persists. Both set ignoreDuplicateLabels=true.

| Corpus | Common inputs | Stateless | Session | MathJax | Temml |
| --- | ---: | ---: | ---: | ---: | ---: |
`;
for(const name of ['bench12','base','newcommand','ams','mathtools','physics','mhchem']){
 const r=b.rows.find(r=>r.group===name);assert.ok(r);
 const c=r.common??r;
 text+=`| ${name} | ${r.common?`${r.temmlAccepted}/${r.total}`:`${r.total} (Temml: 0)`} | ${n(c.stateless)} | ${n(c.session)} | ${n(c.mathjax)} | ${r.common?n(c.temml):'—'} |\n`;
}
text+=`\nAcross the full corpus, stateless flashmath had lower p50 than MathJax in
${b.summary.statelessFasterThanMathJax}/${b.summary.groups} groups and Temml in
${b.summary.statelessFasterThanTemml}/${b.summary.temmlComparable} comparable cohorts.
Bussproofs has no timed cohort; compatibility is checked separately.
These are machine/corpus results and do not establish a universal speed ranking.

Cold import + setup → first serialized expression, 9 fresh processes per engine,
p50 / p95 milliseconds (excludes Node process bootstrap):

| Stateless | Session | MathJax | Temml |
| ---: | ---: | ---: | ---: |
| ${cold('flashmath')} | ${cold('session')} | ${cold('mathjax')} | ${cold('temml')} |

[Full cohorts, p50/p95 and method](bench/flashmath/hardening-benchmark.md) ·
[raw samples](bench/flashmath/hardening-benchmark.raw.json). Earlier hardening
numbers are superseded because MathJax tag options and replayed declarations
were not handled consistently.
`;
const file='README.md',readme=fs.readFileSync(file,'utf8');assert.ok(readme.includes('<!-- release-benchmark -->'));
fs.writeFileSync(file,readme.replace(/<!-- release-benchmark -->[\s\S]*?<!-- \/release-benchmark -->/,`<!-- release-benchmark -->\n\n${text}\n<!-- /release-benchmark -->`));
console.log('README benchmark tables regenerated from measured JSON');
