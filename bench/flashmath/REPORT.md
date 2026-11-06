# flashmath core revision

The texclass-preserving harness is the current oracle. Earlier compatibility results that discarded texclass are withdrawn. This revision meets the base/newcommand group targets under the unchanged current normalizer. Frozen install now succeeds. No npm publish, external delivery, or child agent was used. Git index access remains read-only; the revision is delivered as a bundle based on acbe7fe.

## Changes and decisions

- Restored the npm name to `@rainpulse/flashmath`; repository name is unchanged. Synced the lockfile for React and its types.
- Explicit TeX atoms, fences, named operators, function application and combined relations retain their semantic texclass; inferred sequences remain distinct.
- `src/packages/base.ts` and `newcommand.ts` own their command/environment tables. New packages need their module and one shared registration line. Delimiter-only AMS and legacy-color-only colorv2 subsets are explicit registrations, not claims of full package support.
- The adapter forwards packages/priority tuples, prior inputs, mode, configuration modules, TeX options, display and execution metadata. Unsupported packages, modes, registration modules and options fail explicitly. RegExp/string number patterns, serialized RegExp, digits alias and identifier patterns are exercised against MathJax.
- `createMathMLParser()` owns document state. Label/ref handling consumes the requested label, preserves tag counters and encoded URLs, supports completed prior equations and completed eqnarray rows, preserves same-equation unresolved placeholders, and honors duplicate-label policy without renaming IDs. Independent calls remain isolated.
- React and string output remain separate public entry points; the scoped SSR test forwards the complete fixture options rather than simplifying them.

## Goal and verification

Target: each of base/newcommand >=95%, including harness unsupported records in each denominator. Runtime code does not import fixture expected outputs, MathJax, or Temml. Conformance sources, fixtures and normalization are read-only.

```text
sourceSha256=d66b4eababf9ff369bf2e76f0417a046e3df9aa2c58f57e84e69943151e9641c
normalizerSha256=17b0871ca19dc142d8f7c6505a76b421d3190253dbb750d1290656454e6831af
fixtureSha256=aa810fe8b99d427ef35cee54171ea19009c58415081f130e904d85fcdc2faf2e
```

`node_modules/.bin/tsc -p tsconfig.json` → exit 0; [revision-build.log](revision-build.log).

`node --test test/*.test.mjs` → exit 0; [revision-test.log](revision-test.log).

`node --test conformance/harness.test.mjs` → exit 0; [revision-harness.log](revision-harness.log).

`node bench/flashmath/conformance.mjs` → exit 0; [revision-conformance.log](revision-conformance.log).

`node conformance/runner.mjs --subject bench/flashmath/adapter.mjs --output bench/flashmath/full-conformance.json --fresh` → exit 1; [revision-full-conformance.log](revision-full-conformance.log).

`CI=true pnpm install --offline --frozen-lockfile --package-import-method copy --store-dir "$TMPDIR/flashmath-pnpm-store"` → exit 0; [revision-frozen-install.log](revision-frozen-install.log).

`node bench/flashmath/run.mjs --samples 7 --iterations 100` → exit 0; [benchmark-run.log](benchmark-run.log).

`chromium --headless ... --dump-dom file://<cwd>/bench/flashmath/preview.html` → exit 0; [screen-run.html](screen-run.html).

```text
build exit_code=0
(no compiler diagnostics)
```

```text
tests exit_code=0
✔ parser sessions preserve document references and independent sessions isolate them (0.458876ms)
✔ texclass presence and all explicit atom classes match MathJax (10.615073ms)
✔ adapter preserves numberPattern as RegExp and serialized RegExp, and the digits alias (7.930226ms)
✔ package activation is separate from module registration and unsupported contracts reject explicitly (1.265598ms)
✔ a package adds commands, overrides, delimiters and an environment with one registry line (46.25905ms)
✔ SSR exactly equals string output for all 848 executable base/newcommand fixtures (249.666152ms)
ℹ tests 18
ℹ suites 0
ℹ pass 18
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 453.139188
```

```text
harness exit_code=0
ℹ function-options subject calls=30; matched=30/30
✔ runner restores function and RegExp options for any subject (0.306729ms)
ℹ tests 43
ℹ suites 0
ℹ pass 43
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1352.2839
```

```text
scoped conformance exit_code=0
group | matched | mismatch | unsupported | total | matched/total
--- | ---: | ---: | ---: | ---: | ---:
base | 780 | 10 | 21 | 811 | 96.18%
newcommand | 58 | 0 | 0 | 58 | 100.00%
ALL | 838 | 10 | 21 | 869 | 96.43%
```

Package membership tables overlap and include other fixture groups. Group rates above are the target; they must not be substituted with package membership rates.

```text
full conformance exit_code=1
ALL | 848 | 1787 | 48 | 2683 | 31.61%
classifications: {"subject-error":1601,"structure":180,"typeset-component-pipeline":14,"text":1,"attributes":5,"custom-package-registration":26,"non-single-MathML-snapshot":7,"input-not-captured":1}
```

The full harness includes unimplemented packages, options and modes. Its subject-error rows are retained, not converted to unsupported or removed from the denominator. This is not full MathJax compatibility.

Current scoped failures:

- `Base.test.ts::Roots Tweaked Root 1` — structure
- `Base.test.ts::Matrix Matrix Cases two columns braces 1` — text
- `Base.test.ts::Array Empty Array with Template 1` — structure
- `Base.test.ts::Complete Array column r c repeat |  1` — attributes
- `Base.test.ts::Complete Array column r c repeat | {} 1` — attributes
- `Base.test.ts::Complete Array column r c repeat | {} 2` — attributes
- `Base.test.ts::Complete Array column r c repeat | {} 3` — attributes
- `Base.test.ts::Complete Array eqnarray extend last row 1` — structure
- `Base.test.ts::Complete Array column ! | @ 1` — attributes
- `Base.test.ts::Complete Array column @ | ! c 1` — structure

## Dependency installation

```text
frozen install exit_code=0
Already up to date
Done in 650ms using pnpm v11.18.0
```

The first full offline attempt found an incomplete private store after recreating node_modules. The existing local pnpm SQLite index and content from already-installed packages were copied into a private TMPDIR store; pnpm verified the file digests and installed from that store with downloaded=0. The final frozen-install command above ran with scripts enabled. The original dependency tree and original store were read only. `seed-offline-store.mjs` records the local CAS restoration helper. No dependency version outside the React-related lockfile additions was upgraded.

## Package integration proof

`test/packages-references.test.mjs` adds a disposable package module and one registry line to a copy of compiled modules. It verifies a new command, override priorities, a new delimiter, environment lookup and package activation. Differential tests use installed MathJax 4.1.3 for tag/ref/session behavior, explicit classes and configurable scanners. Unsupported render/output modes and callback options are tested as explicit rejections.

## Fresh performance evidence

Same independent 12-input corpus; seven fresh processes per engine; warmup and setup excluded from warm measurements. Cold includes import/setup through the first string, excluding Node process startup. Each child sample is persisted immediately. The final timing run was started after the harness/conformance jobs finished.

```text
benchmark exit_code=0
mathjax {"warmMicrosecondsPerConversion":{"p50":305.19621916666665,"p95":563.4639316666669},"coldStartToFirstStringMs":{"p50":87.514528,"p95":127.85633199999998}}
temml {"warmMicrosecondsPerConversion":{"p50":29.53700083333333,"p95":37.01095583333334},"coldStartToFirstStringMs":{"p50":29.663061000000003,"p95":31.89359}}
flashmath {"warmMicrosecondsPerConversion":{"p50":18.880840833333323,"p95":26.95664749999999},"coldStartToFirstStringMs":{"p50":36.27538,"p95":50.011843}}
```

Flashmath output agrees with MathJax under the current normalizer on 12 of the 12 benchmark inputs. Temml differs in structure/attributes on 12 inputs. These timings are machine/corpus measurements, not a universal fastest claim; Temml has lower cold p50/p95 in this run. Raw process timings, source hash, normalizer hash and output differences are in benchmark.json.

## Browser

screen_run: preview.html を headless Chromium で開き、React SSR の式を表示。Switch display を2回クリックして inline/block 切替を実行し、各式の描画寸法と merror が無いことを確認。preview.png を開いて分数・根・上下付き・配列を目視確認。

```text
screen exit_code=0
data-screen-run="pass"
```

## Review checkpoints (--no-review)

- Before expensive execution: verify complete adapter options, unchanged normalizer, independent input corpus, XML preflight, source/normalizer fingerprints and timing boundaries.
- Before integration: inspect package ownership/one-line registration, label/ref differential evidence, strict-class failure rows, frozen-install output and bundle diff. Root supplies the independent final verifier; no agent-lane-review checkpoint was called.

## Placement

Actual listing captured before final bundle refresh:

```text
-rw------- 1 minamorl minamorl  63520 11月  7 03:35 bench/flashmath/benchmark.json
-rw------- 1 minamorl minamorl 136922 11月  7 03:34 bench/flashmath/conformance.json
-rw------- 1 minamorl minamorl  32016 11月  7 03:32 bench/flashmath/revision.bundle
-rw------- 1 minamorl minamorl   5891 11月  7 03:33 docs/packages.md
-rw------- 1 minamorl minamorl   1118 11月  7 03:12 package.json
-rw------- 1 minamorl minamorl  22721 11月  7 03:12 pnpm-lock.yaml
-rw------- 1 minamorl minamorl   3952 11月  7 03:28 src/configuration.ts
-rw------- 1 minamorl minamorl    568 11月  7 03:30 src/session-state.ts

src/packages/:
total 48
-rw------- 1 minamorl minamorl   881 11月  7 03:28 ams.ts
-rw------- 1 minamorl minamorl 27431 11月  7 03:30 base.ts
-rw------- 1 minamorl minamorl   643 11月  7 03:28 colorv2.ts
-rw------- 1 minamorl minamorl  3408 11月  7 03:28 newcommand.ts
-rw------- 1 minamorl minamorl  2770 11月  7 03:15 registry.ts
-rw------- 1 minamorl minamorl  1209 11月  7 03:28 types.ts
```
