# Hardening for 0.1.0

This lane repairs the integration verifier's configuration overhead, cold import,
compatibility differences, nested chemistry scanning, and npm artifact. It is
code-first. It does not change `src/react.ts`, `src/output.ts`,
`src/serialize.ts`, or `docs/native-render.md`.

Resolved package combinations and validated option templates each have a FIFO
cache bounded to 128 entries. Keys encode option values, sorted object keys,
package order/priorities, and RegExp source/flags. Callbacks, cycles, accessors,
non-plain objects, and keys over 32,768 characters bypass option caching. Caller data is
copied into templates and copied out; regex lastIndex, texOptions, macros,
labels, and equation counters cannot leak between independent calls. Parser
sessions still own their mutable document state. Changing an existing options
object changes its key.

The shipped build bundles shared ESM chunks, externalizes React, and turns
optional package registrations into synchronous lazy module initializers. Module
validation uses metadata collected from the source declarations without loading
all package tables. `ams` symbols, mhchem grammar, and proof font metrics are
also initialized only on use. Symbol generation emits a compact numeric trie;
lookup compares source indices without allocating token strings. Large generated
symbol/operator data uses JSON decoding instead of JavaScript object boilerplate.
The only added build dependency is esbuild 0.28.2, already present transitively;
the lockfile adds its direct importer without upgrading dependencies.

Nested chemistry groups share an index of matching braces across recursive
source spans. Depth 100/200/400 in `\ce{H…}` takes 37,059/74,359/148,959
character accesses. Regressions instrument character access and slice counts
for `\ce{`, `{`, `\frac{`, `\qty{`, and `\ket{` through depth 400; a flat
1,000-token input performs zero slices. Runtime recursion and resource limits
remain in force. This does not claim linearity for every possible macro/text
expansion; the verifier's separately mentioned nested text and user-macro
families are outside this measured gate.

Compatibility repairs cover ordinary AMS cases, inherited styles/scripts,
operator application and limits, phantom/boxed/subarray structure, cfrac,
fonts and text, AMScd alignment, numbered cases, empty tags, setoptions,
HTML data attributes and text wrappers, isolated argument errors, and proof
sequent syntax/spacing. The verifier's 53 differing probes are frozen as raw
MathJax expectations in `bench/hardening/regressions.json`. The full non-fixture
corpus compares 969 records, including 827 valid formulas. Two upstream
exceptions remain excluded, as in the verifier's denominator.

One `<br>` probe exposes an upstream serializer/comparator mismatch: MathJax
emits HTML `<br>` without a closing tag, while the harness expects XML. Only
that HTML void element is closed for tree comparison; all semantic attributes,
text, and other structure stay strict. MathJax's module-global Unicode state
produces false differences across conversions; every initial corpus difference
is therefore rerun with both engines in one fresh process. Raw isolated outputs
and totals are in `bench/hardening/corpus-verified.json`.

All 2,635 executable conformance fixtures remain exact matches; the 48 original
unsupported records remain in the denominator. The upstream harness exits 1
for those records; the release gate explicitly checks 2635 matched / 0 mismatch
/ 48 unsupported. No fixture or conformance normalizer was edited.

The package is `@minamorl/flashmath@0.1.0`, with public npm registry settings.
Only `dist`, README, LICENSE, NOTICE, and npm's mandatory package.json are packed.
`scripts/pack-smoke.mjs` runs npm pack, inspects every manifest path, extracts the
tarball into a separate consumer directory, and imports the core and React
entry points there. React peers are supplied explicitly. The transient consumer
is removed afterwards. No npm publish, remote push, or other external write
is performed by this lane.

The source-extension regression now builds a disposable copy of the source
with one extra registry line, since the shipped registry is bundled. It still
checks custom commands, priority overrides, delimiters, and environments.

Performance tables and raw samples are in
`bench/flashmath/hardening-benchmark.{md,json,raw.json}`. Both stateless and
reused-session APIs are measured against MathJax 4.1.3 and Temml 0.14.0.
Partially supported Temml groups additionally replay the identical accepted
subset in every engine. Unsupported inputs are never treated as fast renders.
Cold import-to-first-string excludes Node bootstrap and includes serialization.

screen_run: Chromium opened 19 React SSR formulas, including chemistry, cases,
boxed, substack, cfrac, and sequent proofs. Real mouse/key input switched
MathJax/native modes; native PUA=0, merror=0, isotope gaps=0. Raw geometry and
browser version are in `bench/hardening/screen.json`; screenshot is
`bench/hardening/hardening-native.png`. Browser-native rendering of menclose
borders and proof rowlines still depends on the separate native-render lane;
the screenshot shows this lane's current unstyled native result.

No review broker was invoked (--no-review). Requested review checkpoints:

- Before expensive measurement: inspect cohort acceptance, option-content cache
  isolation, scanner counters, and preservation of the 48 unsupported records.
- Before delivery: inspect the tarball manifest and extracted imports, commit
  bundle, source ownership boundaries, and benchmark raw samples.
- Before DONE: independently replay all tests, conformance, the non-fixture
  corpus, and browser interactions; assess cold latency separately from warm.

Final measured cold import→first string p50/p95 is 26.41/31.97 ms for stateless
flashmath, 24.57/28.19 ms for a session, 77.37/89.11 ms for MathJax, and
22.37/25.63 ms for Temml. Cold latency improved from the verifier's roughly
56 ms, but Temml still starts faster. Warm p50 favors stateless flashmath in all
36 MathJax groups and all 22 identical-input Temml cohorts; the narrowest Temml
margin is 1.03x and should be remeasured on the target runtime.

Final commands and retained evidence:

```sh
pnpm --config.verify-deps-before-run=false run build
node --test test/*.test.mjs test/packages/*.test.mjs
node conformance/runner.mjs --subject bench/flashmath/adapter.mjs \
  --output bench/hardening/conformance-final.json --fresh
node bench/hardening/verify-corpus.mjs
node bench/hardening/screen.mjs
node scripts/pack-smoke.mjs
V="$PWD/bench/hardening" ENG=flashmath,session,mathjax,temml COLD=9 \
  OUT=../flashmath/hardening-benchmark.raw.json node bench/hardening/bench-driver.mjs
node bench/hardening/report-benchmark.mjs
```

The tests report 2,384 total / 2,378 passed / 0 failed / 6 skipped. Conformance
reports 2,635 matched / 0 mismatch / 48 unsupported and intentionally exits 1;
its exact denominator was separately asserted with exit 0. The fresh-process
corpus check and extracted-tarball imports exit 0. All raw logs are retained
under `bench/hardening/`.

The workspace's original Git index is read-only. Commits were created using a
transient alternate Git directory inside this worktree; the original index and
branch were not changed. `bench/flashmath/hardening.bundle` carries the lane
commits with the base in `bench/hardening/base-commit.txt` as prerequisite.
The transient Git directory is removed after bundle verification. Root owns
independent final verification, integration with native-render, and publication.
