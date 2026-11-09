# Native x-arrow fix for 0.1.1

Code-first; base 12635f61c5c5d070596ca285c07ead87027d4603.

Cause: `src/packages/ams.ts:328` and `src/packages/mathtools.ts:126`
emit MathJax-relative label widths (`+0.833em` etc.). Prior `src/output.ts:25`
recognized only extpfeil/mhchem label provenance, so AMS/mathtools labels reached
Core unchanged. Core treats the width as absolute, and stretches the operator
against that small box, while the actual annotation overflows it.
The native fix is at `src/output.ts:96`; annotated long-arrow glyph mapping is
at `src/output.ts:134`. The parser changes add private WeakMap metadata only;
MathJax-mode serialization and the conformance adapter/fixtures are unchanged.

Primary material actually read: MathML Core sections 3.3.6.1 and 3.4.2.2
(https://www.w3.org/TR/mathml-core/), and installed MathJax 4.1.3
`mjs/input/tex/ams/AmsMethods.js:219` (`xArrow`).

## Same-condition reproduction

Command: `node bench/native-render/xarrow-diagnose.mjs` (exit 0).
Chrome/153.0.8010.36, viewport 1440x1000, 15px generic math font, nowrap,
horizontal math in horizontal/vertical text contexts. Identical input and CSS
are used for each control. `diagnosis.json` records the unmodified input,
all control markup, actual rectangles and browser version.

Raw selected rows from diagnosis.json:

```json
[
  {
    "id": "horizontal/original",
    "arrows": [
      {
        "labelWidth": 42.5625,
        "labelLayoutWidth": 8.859375,
        "overlap": 29.421875
      },
      {
        "labelWidth": 53.203125,
        "labelLayoutWidth": 8.859375,
        "overlap": 40.0625
      }
    ]
  },
  {
    "id": "horizontal/native",
    "arrows": [
      {
        "labelWidth": 42.5625,
        "labelLayoutWidth": 51.421875,
        "overlap": 0
      },
      {
        "labelWidth": 53.203125,
        "labelLayoutWidth": 62.0625,
        "overlap": 0
      }
    ]
  },
  {
    "id": "horizontal/explicitStretch",
    "arrows": [
      {
        "labelWidth": 42.5625,
        "labelLayoutWidth": 8.859375,
        "overlap": 29.421875
      },
      {
        "labelWidth": 53.203125,
        "labelLayoutWidth": 8.859375,
        "overlap": 40.0625
      }
    ]
  },
  {
    "id": "vertical/original",
    "arrows": [
      {
        "labelWidth": 42.5625,
        "labelLayoutWidth": 8.859375,
        "overlap": 29.421875
      },
      {
        "labelWidth": 53.203125,
        "labelLayoutWidth": 8.859375,
        "overlap": 40.0625
      }
    ]
  },
  {
    "id": "vertical/native",
    "arrows": [
      {
        "labelWidth": 42.5625,
        "labelLayoutWidth": 51.421875,
        "overlap": 0
      },
      {
        "labelWidth": 53.203125,
        "labelLayoutWidth": 62.0625,
        "overlap": 0
      }
    ]
  },
  {
    "id": "vertical/explicitStretch",
    "arrows": [
      {
        "labelWidth": 42.5625,
        "labelLayoutWidth": 8.859375,
        "overlap": 29.421875
      },
      {
        "labelWidth": 53.203125,
        "labelLayoutWidth": 8.859375,
        "overlap": 40.0625
      }
    ]
  }
]
```

Visible decisions: native nonempty labels use natural width plus the source
horizontal padding and omit MathJax vertical struts. Annotated mathtools long
arrows use assemblable short glyphs with their original minimum length. Empty
AMS/mathtools x-arrow markup, ordinary arrows and literal long arrows stay
unchanged. extpfeil/mhchem nonempty labels now also retain their horizontal
clearance; their existing empty-label lowering stays unchanged. Public APIs and
the lockfile stay unchanged. package.json and README declare 0.1.1.

## Raw verification commands, exits and output tails

The store override below keeps pnpm writes inside the assigned worktree. An
initial attempt using the default store failed to open its database; the scoped
store succeeded without changing pnpm-lock.yaml. Node 22.23.4 was downloaded from
the official nodejs.org distribution and verified against its SHA256 manifest.

### Node 22

```text
$ pnpm install --frozen-lockfile --store-dir "$PWD/node_modules/.pnpm-store"
node=v22.23.4
exit=0
✓ Lockfile passes supply-chain policies (verified 2d ago)
Lockfile is up to date, resolution step is skipped
Already up to date

Done in 827ms using pnpm v11.18.0
```

```text
$ node scripts/build.mjs
node=v22.23.4
exit=0
Built shared ESM runtime and TypeScript declarations
```

```text
$ node --test test/*.test.mjs test/packages/*.test.mjs conformance/harness.test.mjs scripts/ci-checks.test.mjs
node=v22.23.4
exit=0
  duration_ms: 52.283732
  type: 'test'
  ...
1..1882
# tests 2504
# suites 0
# pass 2498
# fail 0
# cancelled 0
# skipped 6
# todo 0
# duration_ms 12003.452474
```

```text
$ XARROW_ARTIFACT_DIR=artifacts/xarrow-native/after node --test test/browser/*.test.mjs
node=v22.23.4
exit=0
  duration_ms: 3299.727926
  type: 'test'
  ...
1..1
# tests 1
# suites 0
# pass 1
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 3458.608221
```

```text
$ node conformance/runner.mjs --subject bench/flashmath/adapter.mjs --output artifacts/xarrow-native/conformance-node22.json --fresh
node=v22.23.4
exit=1
progress: 1500/2683
progress: 1600/2683
progress: 1700/2683
progress: 1800/2683
progress: 1900/2683
progress: 2000/2683
progress: 2100/2683
progress: 2200/2683
progress: 2300/2683
progress: 2400/2683
progress: 2500/2683
progress: 2600/2683
```

```text
$ node scripts/ci-conformance-gate.mjs artifacts/xarrow-native/conformance-node22.json
node=v22.23.4
exit=0
Conformance gate PASS: {"matched":2635,"mismatch":0,"unsupported":48,"total":2683,"classifications":{"typeset-component-pipeline":14,"custom-package-registration":26,"non-single-MathML-snapshot":7,"input-not-captured":1}}
```

```text
$ node scripts/ci-pack-smoke.mjs
node=v22.23.4
exit=0
{"coreImport":true,"reactImport":true,"reactSSR":true,"coreBytes":455,"reactBytes":455}
Pack smoke PASS: {"tarball":"minamorl-flashmath-0.1.1.tgz","files":89,"unpackedBytes":500428}
```

### Node 26

```text
$ pnpm install --frozen-lockfile --store-dir "$PWD/node_modules/.pnpm-store"
node=v26.12.1
exit=0
Already up to date
Done in 393ms using pnpm v11.18.0
```

```text
$ node scripts/build.mjs
node=v26.12.1
exit=0
Built shared ESM runtime and TypeScript declarations
```

```text
$ node --test test/*.test.mjs test/packages/*.test.mjs conformance/harness.test.mjs scripts/ci-checks.test.mjs
node=v26.12.1
exit=0
✔ SSR structurally equals string output for all 2635 executable fixtures (1404.684061ms)
ℹ {"groups":{"action":3,"ams":158,"amscd":13,"base":790,"bbm":9,"bboldx":28,"bbox":6,"begingroup":19,"boldsymbol":6,"braket":30,"bussproofs":26,"cancel":8,"cases":5,"centernot":2,"color":29,"colortbl":14,"colorv2":4,"configmacros":10,"dsfont":2,"empheq":44,"enclose":6,"extpfeil":6,"gensymb":5,"html":16,"mathtools":196,"mhchem":112,"newcommand":58,"noerrors":56,"noundefined":2,"physics":628,"setoptions":10,"tag":75,"tagformat":8,"tex":2,"texhtml":6,"textcomp":118,"textmacros":48,"unicode":21,"units":10,"upgreek":41,"verb":5},"unsupported":0}
✔ SSR comparison normalizes only documented React serialization differences (0.668692ms)
✔ generated compact trie resolves every definition from source spans without prefix collisions (45.906446ms)
ℹ tests 2504
ℹ suites 0
ℹ pass 2498
ℹ fail 0
ℹ cancelled 0
ℹ skipped 6
ℹ todo 0
ℹ duration_ms 10855.675628
```

```text
$ XARROW_ARTIFACT_DIR=artifacts/xarrow-native/after node --test test/browser/*.test.mjs
node=v26.12.1
exit=0
screen_run: Chrome/153.0.8010.36; rendered 618 React/string inline/display formulas in horizontal-tb and vertical-rl contexts; measured labels/neighbours and screenshot arrow ink; 0 failures
✔ Chromium native x-arrows span labels without neighbour collisions in horizontal and vertical text (3218.736628ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3372.139855
```

```text
$ node conformance/runner.mjs --subject bench/flashmath/adapter.mjs --output artifacts/xarrow-native/conformance-node26.json --fresh
node=v26.12.1
exit=1
progress: 1500/2683
progress: 1600/2683
progress: 1700/2683
progress: 1800/2683
progress: 1900/2683
progress: 2000/2683
progress: 2100/2683
progress: 2200/2683
progress: 2300/2683
progress: 2400/2683
progress: 2500/2683
progress: 2600/2683
```

```text
$ node scripts/ci-conformance-gate.mjs artifacts/xarrow-native/conformance-node26.json
node=v26.12.1
exit=0
Conformance gate PASS: {"matched":2635,"mismatch":0,"unsupported":48,"total":2683,"classifications":{"typeset-component-pipeline":14,"custom-package-registration":26,"non-single-MathML-snapshot":7,"input-not-captured":1}}
```

```text
$ node scripts/ci-pack-smoke.mjs
node=v26.12.1
exit=0
{"coreImport":true,"reactImport":true,"reactSSR":true,"coreBytes":455,"reactBytes":455}
Pack smoke PASS: {"tarball":"minamorl-flashmath-0.1.1.tgz","files":89,"unpackedBytes":500428}
```

The conformance runner exit 1 is expected for the 48 established unsupported
cases; the immediately following strict gate must exit 0. The six unit test
skips are existing tests. No new skip or accepted mismatch was added.

Negative control: `XARROW_BASELINE=1 XARROW_ARTIFACT_DIR=artifacts/xarrow-native/baseline node --test test/browser/native-xarrow.test.mjs`
uses unlowered MathJax label markup; exit 1, with 2800 reported checks failing.
It is a deliberately failing control, not a release gate.
An early combined browser/unit/conformance run also failed an existing timing
slope assertion. Load contention was a candidate; the final CI steps isolate the
browser from unit timings, and both final Node versions passed unchanged timing
assertions. Early diagnostic failures and full logs remain locally in this
artifact directory; only final evidence is selected for Git.

screen_run: Chrome/153.0.8010.36 opened actual MathML in a CDP-controlled page;
rendered 618 React/string inline/display cases in horizontal-tb and vertical-rl
contexts; measured annotation/neighbor and annotation/arrow separation and actual
arrow pixels from a screenshot. Final browser gate: 0 failures. Both
`after/screen.png` and `after/screen-vertical.png` were opened for visual review.
The original Japanese chain is legible and annotations clear their neighbours.
The complete page and per-formula raw measurements remain locally in
`after/screen.html` and `after/screen.json`.

Limits: Linux Chromium 153 verified locally; Firefox/Safari and pixel parity with
MathJax are not claimed. Math remains horizontal inside the vertical text band.
CI installs DejaVu Math TeX Gyre and Noto CJK and runs this same browser gate after
unit tests on both Node 22 and Node 26.

## Review checkpoints for the caller

No Lane review checkpoints broker section was supplied, so no child agent or
review-broker request was made.

- Before costly execution: review that the negative control fails and the pixel
  measurement checks assembled arrow paint, rather than trusting the natural mo
  DOM advance alone.
- Before external delivery: review the own-change diff, unchanged conformance
  fixtures/lockfile, 0.1.1 manifest and strict tarball smoke output above.
- Before acceptance: review final raw checks, same-condition diagnosis and both
  screenshots. Delivery stops at a main-target PR; merge/publish is not invoked.

The original worktree Git metadata is outside the assigned write scope. Delivery
uses `.release-git/` in this same cwd, with read-only object alternates to the
original Git directory. The working files never leave this worktree. The caller
can inspect delivery commits with `git --git-dir=.release-git log -1`; original
worktree HEAD/index remain unchanged.
