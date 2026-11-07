# Finish evidence

Generated 2026-11-07T00:54:38.488Z (UTC report generation).
Source SHA-256: b357cf868c1e313f07680750c6acd76357ddc663edff6207474977e7784e0cd2.

The goal of beating Temml in every comparable cohort is NOT achieved.
Final full benchmark: 36/36 groups below MathJax p50;
20/22 below Temml on identical accepted inputs.
Temml losses: boldsymbol (0.98×), verb (0.96×).
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
| build | 0 | 0 |
| tests | 0 | 0 |
| harness | 0 | 0 |
| scoped-conformance | 0 | 0 |
| conformance | 1 | 1 |
| corpus | 0 | 0 |
| bussproofs | 0 | 0 |
| grammar | 0 | 0 |
| compare | 0 | 0 |
| screen | 0 | 0 |
| visual | 0 | 0 |
| benchmark | 0 | 0 |
| benchmark-summary | 0 | 0 |
| readme | 0 | 0 |
| pack-smoke | 0 | 0 |

CI-equivalent replay on v26.12.1; installed pnpm 11.18.0. Node 22 is not
installed in this environment, so the second CI runtime was not run locally.
The six extraction skips stay in the test denominator.

| CI step | Actual exit | Allowed exit |
| --- | ---: | ---: |
| install | 0 | 0 |
| build | 0 | 0 |
| tests | 0 | 0 |
| conformance | 1 | 0 or 1 |
| conformance-gate | 0 | 0 |
| pack-smoke | 0 | 0 |

Conformance's exit 1 is accepted only with the exact 2635/0/48 per-ID gate.
CI raw commands, exits and output tails are in ci-checks.json; complete logs
are ci.log and ci-*.log. The release pack smoke checks the final README links
and actual candidate after the benchmark table is regenerated.

Depth 400/1600 raw measurements (copied = tokens copied by Array.slice):

```json
[
  {
    "name": "text-math",
    "rows": [
      {
        "depth": 400,
        "copied": 0,
        "ms": 1.5545537499999966
      },
      {
        "depth": 1600,
        "copied": 0,
        "ms": 10.321778999999992
      }
    ],
    "slope": 1.365559620710993
  },
  {
    "name": "textmacros-math",
    "rows": [
      {
        "depth": 400,
        "copied": 0,
        "ms": 0.9313044615384587
      },
      {
        "depth": 1600,
        "copied": 0,
        "ms": 3.8846585000000005
      }
    ],
    "slope": 1.0302314909683206
  },
  {
    "name": "newcommand-arg",
    "rows": [
      {
        "depth": 400,
        "copied": 5,
        "ms": 1.0871165833333407
      },
      {
        "depth": 1600,
        "copied": 5,
        "ms": 6.141156999999964
      }
    ],
    "slope": 1.249001910911572
  }
]
```

screen_run: Chrome/153.0.8010.36; opened after.html; hydrated
202 comparisons and client-rendered 2638 cases;
console.error and recoverable hydration errors both empty; keyboard switched
React SSR → string output → React SSR with identical geometry.
202 formulas / 796 geometry and feature checks;
strict MathJax reference differences empty. Chemistry and proof label panels
were opened with view_image, including proofs-10/12 and left/right noLine cases.
See after-screen.json, visual-checks.json, after.html and after-*.png.

Candidate: minamorl-flashmath-0.1.0.tgz, 169179 bytes packed / 495645 unpacked.
Integrity: sha512-nfo8reSpFjBymf951pqkBvCDZKLoeEpkybwHygmMEg7DudhhAGuW7beuJfw5Xbcv5LoN6oFIDsC+hyAjAg9b3g==.
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
