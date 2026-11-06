# flashmath core delivery

In-scope implementation and scoped conformance targets are met. Integration remains blocked on the manifest/lockfile mismatch: pnpm-lock.yaml is outside this lane’s allowed write list. No external network delivery or npm publish was performed. The original Git index is read-only; commits are carried by core.bundle instead of changing its branch.

## State

- Goal: handwritten TeX → MathML, token macros, React elements, conformance evidence, and same-input comparative timings.
- Constraints: source/test/bench/flashmath plus the authorized manifest, tsconfig, and README usage section only; conformance read-only; no child agents, external sends, or publishing.
- Known: scoped denominators include harness unsupported cases; all 848 executable scoped fixture outputs also exactly match React SSR.
- Decisions: inline is the API default; display:true adds block display; errors return merror unless throwOnError; core and React have separate entry points; package name is @minamorl/flashmath; limits are per parse. All emitted attributes, group wrappers, styles, spacing, and labels aim at the upstream MathML structure. No fixture expected output is used by runtime code.
- Changed: src/, test/, bench/flashmath/, tsconfig.json, package.json, README usage. React dependencies were restored from the local pnpm content store for this sandbox; the store was not modified by that helper.
- Failures: original Git index.lock cannot be created; initial Temml XML validation failed because its XML namespace option was omitted, corrected to xml:true with preflight before timing. Final benchmark raw is from a subsequent isolated orchestrator run, with no concurrent conformance job launched by this lane.
- Unknowns/risks: broader MathJax packages are outside the implemented scope; no clean frozen install can pass until root updates the lockfile. Full harness includes two unsupported configmacros shapes that raise subject-error. Browser checks used installed headless Chromium; other browsers and React versions were not tested.
- Next: root verifier checks the diff and raw evidence, imports the bundle, updates the lockfile in its authorized scope, and re-runs frozen install/integration gates.

## Scope evidence

`node_modules/.bin/tsc -p tsconfig.json` → exit 0; raw: [build.log](build.log).

`node --test test/*.test.mjs` → exit 0; raw: [test.log](test.log).

`node bench/flashmath/conformance.mjs` → exit 0; raw: [conformance-run.log](conformance-run.log).

`node conformance/runner.mjs --subject bench/flashmath/adapter.mjs --output bench/flashmath/full-conformance.json --fresh` → exit 1; raw: [full-conformance-run.log](full-conformance-run.log).

`node bench/flashmath/run.mjs --samples 7 --iterations 100` → exit 0; raw: [benchmark-run.log](benchmark-run.log).

```text
build exit_code=0
(no compiler diagnostics)
```

```text
test exit_code=0
✔ malformed input returns an error tree or throws on request (0.804068ms)
✔ text and attribute values are escaped as XML, never executed (2.232824ms)
✔ React returns elements and SSR exactly equals the string renderer (23.394731ms)
✔ error paths always serialize valid MathML and XML (1.173174ms)
✔ SSR exactly equals string output for all 848 executable base/newcommand fixtures (215.886491ms)
ℹ tests 12
ℹ suites 0
ℹ pass 12
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 391.056041
```

```text
scoped conformance exit_code=0
group | matched | mismatch | unsupported | total | matched/total
--- | ---: | ---: | ---: | ---: | ---:
base | 776 | 14 | 21 | 811 | 95.68%
newcommand | 58 | 0 | 0 | 58 | 100.00%
ALL | 834 | 14 | 21 | 869 | 95.97%

```

Fixture groups are the target denominator. Package membership tables overlap and include fixtures from other groups; those rates are not interchangeable.

```text
full conformance exit_code=1
ALL | 872 | 1733 | 78 | 2683 | 32.50%
```

The full denominator is 2683; the scoped denominator is 869. The full result is retained without filtering failures.

Remaining scoped mismatches:

- `Base.test.ts::Roots Tweaked Root 1` — structure
- `Base.test.ts::Matrix Matrix Cases two columns braces 1` — text
- `Base.test.ts::InternalMath Mbox Math 1` — structure
- `Base.test.ts::Array Empty Array with Template 1` — structure
- `Base.test.ts::Multirel Multirel Font 2 1` — structure
- `Base.test.ts::Moving Elements Rlap 2 1` — structure
- `Base.test.ts::Moving Elements Llap 2 1` — structure
- `Base.test.ts::Complete Array column r c repeat |  1` — attributes
- `Base.test.ts::Complete Array column r c repeat | {} 1` — attributes
- `Base.test.ts::Complete Array column r c repeat | {} 2` — attributes
- `Base.test.ts::Complete Array column r c repeat | {} 3` — attributes
- `Base.test.ts::Complete Array eqnarray extend last row 1` — structure
- `Base.test.ts::Complete Array column ! | @ 1` — attributes
- `Base.test.ts::Complete Array column @ | ! c 1` — structure

## Benchmark

Same 12 independent inputs, display=true, seven fresh processes per engine, 200 corpus warmup passes, 100 timed corpus passes per sample. No expression-result cache. Warm timings include parsing and MathML serialization; import/setup is excluded. Cold includes import/setup through the first MathML string, excluding Node process startup. Raw child data is checkpointed after every sample. Percentiles use nearest rank.

```text
benchmark exit_code=0
mathjax {"warmMicrosecondsPerConversion":{"p50":393.7098583333333,"p95":427.35818499999993},"coldStartToFirstStringMs":{"p50":116.998059,"p95":119.57575299999999}}
temml {"warmMicrosecondsPerConversion":{"p50":33.88657583333336,"p95":55.15209166666668},"coldStartToFirstStringMs":{"p50":36.16181400000001,"p95":37.218108}}
flashmath {"warmMicrosecondsPerConversion":{"p50":23.096720833333343,"p95":28.193398333333327},"coldStartToFirstStringMs":{"p50":28.652022000000002,"p95":48.103742000000004}}
```

These timings describe this machine and corpus. Temml uses different wrappers/attributes on all 12 inputs; the flashmath benchmark outputs normalize identically to MathJax on all 12. Cold p95 for flashmath is higher than Temml in this run; a general fastest claim is not established. See benchmark.json for timestamps, versions, machine, source hash, every sample, and output checks.

## Screen

screen_run: preview.html を headless Chromium で開き、React SSR の12式を表示。Switch display を2回クリックし、inline→block の属性切り替え、全式の非ゼロの描画寸法、merror が無いことを実行時に確認。preview.png を開いて分数・根・上下付き・配列の描画を目視確認。

```text
screen exit_code=0
data-screen-run="pass"
```

## Integration gate

```text
frozen install exit_code=1
? Verifying lockfile against supply-chain policies (69 entries)...
✓ Lockfile passes supply-chain policies (69 entries in 1s)
[ERR_PNPM_OUTDATED_LOCKFILE] Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with <ROOT>/package.json

Note that in CI environments this setting is true by default. If you still need to run install in such cases, use "pnpm install --no-frozen-lockfile"

  Failure reason:
  specifiers in the lockfile don't match specifiers in package.json:
* 4 dependencies were added: react@19.2.4, react-dom@19.2.4, @types/react@19.2.14, @types/react-dom@19.2.3
```

The lockfile was left byte-for-byte unchanged. Original-index commit attempt exited 128 with:

```text
fatal: Unable to create '/home/minamorl/repos/flashmath-ts/.git/worktrees/core/index.lock': 読み込み専用ファイルシステムです
```

## Requested review checkpoints (--no-review)

- Before expensive execution: compare engine preflight XML checks, timing boundaries, common corpus, sample count, and unmodified normalizer.
- Before DONE/integration: inspect the source diff, 14 remaining scoped mismatches, unsupported-inclusive denominator, SSR evidence, browser artifact, bundle contents, and the RED frozen-install gate. No broker checkpoint was called.

## Placement evidence

Actual `ls -l src/ test/ bench/flashmath/ tsconfig.json package.json README.md` output captured while preparing delivery (bundle/receipt are created afterwards):

```text
-rw------- 1 minamorl minamorl 3179 11月  7 02:58 README.md
-rw------- 1 minamorl minamorl 1117 11月  7 02:40 package.json
-rw------- 1 minamorl minamorl  271 11月  7 02:40 tsconfig.json

bench/flashmath/:
total 2484
-rw------- 1 minamorl minamorl     282 11月  7 02:58 adapter.mjs
-rw------- 1 minamorl minamorl     876 11月  7 03:00 benchmark-run.log
-rw------- 1 minamorl minamorl   63616 11月  7 03:00 benchmark.json
-rw------- 1 minamorl minamorl   49654 11月  7 03:00 benchmark.raw.json
-rw------- 1 minamorl minamorl       0 11月  7 02:58 build.log
-rw------- 1 minamorl minamorl     743 11月  7 02:59 conformance-run.log
-rw------- 1 minamorl minamorl  138057 11月  7 02:59 conformance.json
-rw------- 1 minamorl minamorl     764 11月  7 02:44 conformance.mjs
-rw------- 1 minamorl minamorl     494 11月  7 02:55 corpus.mjs
-rw------- 1 minamorl minamorl    1155 11月  7 03:01 delivery-build.log
-rw------- 1 minamorl minamorl    1589 11月  7 02:56 engines.mjs
-rw------- 1 minamorl minamorl    4325 11月  7 02:59 full-conformance-run.log
-rw------- 1 minamorl minamorl 1154404 11月  7 02:59 full-conformance.json
-rw------- 1 minamorl minamorl  909841 11月  7 02:59 full-conformance.json.jsonl
-rw------- 1 minamorl minamorl    3469 11月  7 02:48 generate-symbols.mjs
-rw------- 1 minamorl minamorl     608 11月  7 03:01 lockfile-check.log
-rw------- 1 minamorl minamorl   22110 11月  7 03:01 pnpm-help.log
-rw------- 1 minamorl minamorl    4642 11月  7 03:01 preview.html
-rw------- 1 minamorl minamorl    1975 11月  7 02:56 preview.mjs
-rw------- 1 minamorl minamorl   96942 11月  7 03:01 preview.png
-rw------- 1 minamorl minamorl    7902 11月  7 03:02 report.mjs
-rw------- 1 minamorl minamorl    1448 11月  7 02:47 restore-react-offline.mjs
-rw------- 1 minamorl minamorl    3506 11月  7 02:59 run.mjs
-rw------- 1 minamorl minamorl    5148 11月  7 03:01 screen-run.html
-rw------- 1 minamorl minamorl    1104 11月  7 03:01 screen-run.log
-rw------- 1 minamorl minamorl    1033 11月  7 02:58 test.log
-rw------- 1 minamorl minamorl    1333 11月  7 02:55 worker.mjs

src/:
total 304
-rw------- 1 minamorl minamorl    488 11月  7 02:58 ATTRIBUTION.MathJax
-rw------- 1 minamorl minamorl  11358 11月  7 02:40 LICENSE.MathJax
-rw------- 1 minamorl minamorl   2044 11月  7 02:48 ast.ts
-rw------- 1 minamorl minamorl    196 11月  7 02:44 index.ts
-rw------- 1 minamorl minamorl  50077 11月  7 02:58 parser.ts
-rw------- 1 minamorl minamorl   3039 11月  7 02:52 preamble.ts
-rw------- 1 minamorl minamorl   1204 11月  7 02:58 react.ts
-rw------- 1 minamorl minamorl   2730 11月  7 02:58 scanner.ts
-rw------- 1 minamorl minamorl    772 11月  7 02:44 serialize.ts
-rw------- 1 minamorl minamorl 216387 11月  7 02:48 symbols.ts

test/:
total 12
-rw------- 1 minamorl minamorl 4823 11月  7 02:58 core.test.mjs
-rw------- 1 minamorl minamorl  852 11月  7 02:58 ssr-fixtures.test.mjs
```
