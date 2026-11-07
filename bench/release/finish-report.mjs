import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {sourceFingerprint} from '../flashmath/fingerprint.mjs';
const read=p=>JSON.parse(fs.readFileSync(p));
const checks=read('bench/release/checks.json'),ci=read('bench/release/ci-checks.json'),benchmark=read('bench/flashmath/hardening-benchmark.json'),pack=read('bench/release/pack.json'),visual=read('bench/native-render/visual-checks.json'),screen=read('bench/native-render/after-screen.json');
assert.equal(checks.sourceSha256,sourceFingerprint());
assert.deepEqual(checks.checks.map(c=>c.name),['build','tests','harness','scoped-conformance','conformance','corpus','bussproofs','grammar','compare','screen','visual','benchmark','benchmark-summary','readme','pack-smoke']);
assert.deepEqual(ci.checks.map(c=>c.name),['install','build','tests','conformance','conformance-gate','pack-smoke']);
assert.ok(checks.checks.every(c=>c.exit===c.expected));
assert.ok(ci.checks.every(c=>c.allowed.includes(c.exit)));
assert.deepEqual(visual.failures,[]);assert.deepEqual(visual.referenceDifferences,[]);
assert.deepEqual(screen.reactChecks.errors,[]);assert.deepEqual(screen.reactChecks.recoverable,[]);
const actual='sha512-'+createHash('sha512').update(fs.readFileSync('bench/release/'+pack.filename)).digest('base64');
assert.equal(actual,pack.integrity);
assert.ok(pack.files.every(f=>/^(dist\/|README.md$|LICENSE$|NOTICE$|package.json$)/.test(f.path)));
const slower=benchmark.rows.filter(r=>r.common&&r.common.stateless.p50>=r.common.temml.p50);
const tests=fs.readFileSync('bench/release/tests.log','utf8'),scaling=JSON.parse(tests.split('\n').find(l=>l.startsWith('# [{"name":"text-math"')).slice(2));
const commands=checks.checks.map(c=>`| ${c.name} | ${c.exit} | ${c.expected} |`).join('\n');
const ciCommands=ci.checks.map(c=>`| ${c.name} | ${c.exit} | ${c.allowed.join(' or ')} |`).join('\n');
const report=`# Finish evidence

Generated ${new Date().toISOString()} (UTC report generation).
Source SHA-256: ${checks.sourceSha256}.

The goal of beating Temml in every comparable cohort is ${slower.length?'NOT achieved':'met only on this measured corpus'}.
Final full benchmark: ${benchmark.summary.statelessFasterThanMathJax}/${benchmark.summary.groups} groups below MathJax p50;
${benchmark.summary.statelessFasterThanTemml}/${benchmark.summary.temmlComparable} below Temml on identical accepted inputs.
Temml losses: ${slower.map(r=>r.group+' ('+(r.common.temml.p50/r.common.stateless.p50).toFixed(2)+'×)').join(', ')||'none'}.
The measured costs, focused before/after timings and interpretation are in
../../docs/performance-finish.md. No universal fastest claim is made.

## Implemented and visible decisions

- tagformat delegates explicit tags to AMS so equation and equation* never gain
  an extra labelled table/automatic number. Custom tag/id functions still apply.
- x^{ and x_{ use MathJax's script-group error. sqrt/bbox error messages retain
  their captured behaviour, verified after an overbroad first attempt failed.
- Nested text math, textmacros math and macro arguments retain source-buffer
  indexes. Contiguous balanced arguments share views and brace indexes;
  groups crossing expansion buffers still materialize at that boundary.
- Chemistry actions stop at min(requested maxDepth,512). This explicit limit
  returns merror instead of throwing RangeError for depth 5000/maxDepth=1e7.
- Mixed chemical bonds use aligned CSS strokes; asymmetric harpoons allocate
  their own long/short shafts and neighbour spacing. No private font slots or
  runtime renderer dependency are added. Native font/pixel differences remain.
- noLine proof tables share ruled-table spacing. Left/right proof labels reserve
  their text width rather than only the .5ex padding. Raw MathJax mode remains.
- React maps shared property names (className/htmlFor/fontFamily/etc.). Empty
  href is omitted only in the React path. SSR normalization records those exact
  spelling/empty-href differences instead of ignoring arbitrary attributes.
- Serializer, option-key/copy, stateless setup and native traversal allocations
  are reduced, without expression/output caching or extra dependencies.
- README documentation/benchmark links are absolute GitHub links for npm.
  CI workflow, frozen lockfile and package manifest are unchanged.

## Gates and raw evidence

Commands and full output: checks.json, gate.log and adjacent per-step logs.
This report additionally checks source fingerprint, exact step statuses,
actual tarball SHA-512, allowed tarball paths and empty visual/React errors.

| Release step | Actual exit | Required exit |
| --- | ---: | ---: |
${commands}

CI-equivalent replay on ${ci.node}; installed pnpm 11.18.0. Node 22 is not
installed in this environment, so the second CI runtime was not run locally.
The six extraction skips stay in the test denominator.

| CI step | Actual exit | Allowed exit |
| --- | ---: | ---: |
${ciCommands}

Conformance's exit 1 is accepted only with the exact 2635/0/48 per-ID gate.
CI raw commands, exits and output tails are in ci-checks.json; complete logs
are ci.log and ci-*.log. The release pack smoke checks the final README links
and actual candidate after the benchmark table is regenerated.

Depth 400/1600 raw measurements (copied = tokens copied by Array.slice):

\`\`\`json
${JSON.stringify(scaling,null,2)}
\`\`\`

screen_run: ${screen.browser.product}; opened after.html; hydrated
${screen.reactChecks.hydrated} comparisons and client-rendered ${screen.reactChecks.clientRendered} cases;
console.error and recoverable hydration errors both empty; keyboard switched
React SSR → string output → React SSR with identical geometry.
${visual.formulas} formulas / ${visual.checks.length} geometry and feature checks;
strict MathJax reference differences empty. Chemistry and proof label panels
were opened with view_image, including proofs-10/12 and left/right noLine cases.
See after-screen.json, visual-checks.json, after.html and after-*.png.

Candidate: ${pack.filename}, ${pack.size} bytes packed / ${pack.unpackedSize} unpacked.
Integrity: ${pack.integrity}.
All archive files are in dist/, README, LICENSE, NOTICE or package.json;
.release-git, tests, fixtures, logs and benchmark data are excluded.

## Delivery and limits

The original Git index is read-only. Phase commits live in .release-git, which
is excluded from Git commits and npm artifacts. finish.bundle carries the
commits after main 8006934 and is delivered beside this report. The original
worktree HEAD stays at 8006934; this is not a pushed branch or published npm
release. No external delivery, push, publish or child-agent invocation ran.

Browser coverage is Chromium on Linux. Firefox/Safari and native pixel parity
are unverified. Oldstyle digits, glyph/font metrics, and other native spacing
remain subject to the documented limits. The mhchem hard recursion cap is a
resource guard, not unlimited-depth support. Cross-buffer macro expansion can
still need materialization; no universal complexity claim is made for arbitrary
macro programs or output whose size itself grows superlinearly.

## Review checkpoints (broker disabled)

Before expensive execution: review oracle isolation, common-input benchmark
cohorts, pre/post-warmup error checks, and the new warning/geometry instruments.
Before external delivery: review the exact tarball listing/integrity, README
links and scoped name. External delivery was not attempted.
Before final acceptance: review the source diff, phase commits, per-ID gate,
raw scaling samples, chemistry/proof screenshots, remaining speed losses, and
bundle verification. No independent review is claimed in this no-review run.
`;
fs.writeFileSync('bench/release/FINISH.md',report);
fs.writeFileSync('bench/release/REPORT.md',`# Current local release candidate

The finish pass supersedes this directory's earlier report.
See [FINISH.md](FINISH.md) for decisions, exact gate exits, scaling, browser and
React evidence, remaining limits and disabled-review checkpoints.

Candidate: ${pack.filename}; ${pack.size} bytes; ${pack.integrity}.
Full benchmark: ${benchmark.summary.statelessFasterThanMathJax}/${benchmark.summary.groups} MathJax groups;
${benchmark.summary.statelessFasterThanTemml}/${benchmark.summary.temmlComparable} Temml cohorts.
Delivery bundle: finish.bundle (commits after main 8006934). The inherited
release.bundle belongs to the earlier integration, not this finish pass.
No push or publication ran.
`);
console.log('Finish evidence: source, statuses, geometry, React errors and actual tarball integrity checked');
