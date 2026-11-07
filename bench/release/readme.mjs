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

[Full cohorts, p50/p95 and method](https://github.com/minamorl/flashmath-ts/blob/main/bench/flashmath/hardening-benchmark.md) ·
[raw samples](https://github.com/minamorl/flashmath-ts/blob/main/bench/flashmath/hardening-benchmark.raw.json). Earlier hardening
numbers are superseded because MathJax tag options and replayed declarations
were not handled consistently.
`;
const slower=b.rows.filter(r=>r.common&&r.common.stateless.p50>=r.common.temml.p50);
text+=`\nTemml remains faster on these identical-input cohorts: ${slower.map(r=>r.group+' ('+(r.common.temml.p50/r.common.stateless.p50).toFixed(2)+'×)').join(', ')||'none in this run'}. The goal of winning every cohort is ${slower.length?'not achieved':'met on this measured corpus only'}.\n`;
const file='README.md' ,readme=fs.readFileSync(file,'utf8');assert.ok(readme.includes('<!-- release-benchmark -->'));
fs.writeFileSync(file,readme.replace(/<!-- release-benchmark -->[\s\S]*?<!-- \/release-benchmark -->/,`<!-- release-benchmark -->\n\n${text}\n<!-- /release-benchmark -->`));
console.log('README benchmark tables regenerated from measured JSON');

const perf=JSON.parse(fs.readFileSync('bench/release/performance-after.json'));
const before=JSON.parse(fs.readFileSync('bench/release/performance-before.json'));
const stages=JSON.parse(fs.readFileSync('bench/release/performance-stages.json'));
const focus=perf.rows.map(r=>{const previous=before.rows.find(b=>b.group===r.group);return `| ${r.group} | ${previous.p50.flashmath.toFixed(2)} | ${r.p50.flashmath.toFixed(2)} | ${r.p50.temml.toFixed(2)} |`;}).join('\n');
const performance=`# Finish performance investigation

The target is lower time than Temml on every accepted cohort. Final full-run
result: ${b.summary.statelessFasterThanTemml}/${b.summary.temmlComparable} Temml cohorts;
${b.summary.statelessFasterThanMathJax}/${b.summary.groups} full MathJax groups.
${slower.length?'The universal Temml target remains unmet.':'Every comparable Temml cohort was faster in this run; this is not a universal ranking.'}
Remaining slower cohorts: ${slower.map(r=>r.group+' ('+(r.common.temml.p50/r.common.stateless.p50).toFixed(2)+'×)').join(', ')||'none'}.

## Measured causes and changes

The readable-source CPU profile puts serialization, XML escaping and native
lowering among the leading sampled costs; option key construction and deep
option copying also consume samples. The diagnostic source-stage probe reports
boldsymbol configure/parse/native/serialize costs of
${Object.values(stages.rows.find(r=>r.group==='boldsymbol').usPerExpression).map(n=>n.toFixed(2)).join(' / ')} µs.
These source/tsx numbers include stage clocks and JIT and are diagnostic only.
They cannot be subtracted from the bundled cross-engine timings.

The changes remove serializer chunk arrays, avoid XML replacement on plain
strings, construct option keys without intermediate tagged trees, copy options
without entries/map/fromEntries arrays, avoid stateless session closures and
an extra options spread, reuse postorder jobs, and map Unicode variants without
Array.from/join. No expression or output cache is used; mutated options and
independent parser state retain their tests.

Focused before/after bundled-runtime medians (15 alternating samples, 100 timed
passes/sample, identical Temml-accepted inputs) are below. This probe is smaller
than the final 5-process release benchmark and ran at a different time. The
focused baseline was captured during native finishing and also predates the
final harpoon box-allocation correction; this is not a per-change ablation. Use
the full benchmark for the release ranking.

| Group | Before flashmath µs | After flashmath µs | Temml after µs |
| --- | ---: | ---: | ---: |
${focus}

Boldsymbol must parse and expose a MathJax-compatible tree, walk its argument to
apply bold variants, then lower variants to Unicode/CSS and serialize the native
tree. Native lowering is a measured cost. Temml also builds MathML from its own
parse tree (installed temml/src/buildMathML.js and mathMLTree.js); no equivalent
stage-by-stage Temml ablation was performed. Flashmath's compatibility/native
boundary is a candidate for its short-expression overhead, not an established
cause of every remaining ranking difference. Removing that boundary requires
a larger parser/output redesign; this candidate reports the actual slower
cohorts instead of claiming that the residual cost has been eliminated. Chemistry
also runs a grammar translator before TeX parsing; tagformat lowers numbered
rows to CSS; extended arrows build padded labels. The full results decide their
ranks rather than these explanations.

Raw evidence: ../bench/release/performance-{before,after,stages}.json and the
full ../bench/flashmath/hardening-benchmark.{json,raw.json,md}.
`;
fs.writeFileSync('docs/performance-finish.md',performance);
const release='docs/release.md',notes=fs.readFileSync(release,'utf8');
fs.writeFileSync(release,notes.replace(/## Final measured outcome[\s\S]*$/,`## Final measured outcome

Generated at ${new Date().toISOString()} (UTC report generation time).
The full benchmark measured stateless p50 below MathJax in ${b.summary.statelessFasterThanMathJax}/${b.summary.groups}
full groups and below Temml in ${b.summary.statelessFasterThanTemml}/${b.summary.temmlComparable} identical-input cohorts.
Remaining Temml losses: ${slower.map(r=>r.group).join(', ')||'none in this run'}.
See [performance investigation](performance-finish.md) for measured costs,
before/after samples and the remaining limits. The source fingerprint and exact
commands/exits are recorded in ../bench/release/checks.json. Candidate sizes,
integrity and the actual archive listing are in ../bench/release/pack.json and
tarball-files.txt. No push, publication or external delivery is performed.
`));
