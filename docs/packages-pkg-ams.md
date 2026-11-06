# pkg-ams delivery

The assigned conformance groups match MathJax 4.1.3, including TeX classes and semantic attributes. The fixture corpus and normalizer are unchanged. The broader set whose package lists use only base/newcommand and these four packages also has zero mismatches: 303 matched and 2 unchanged upstream unsupported records out of 305, including Tag and Tex consumers.

| Group | Matched | Mismatch | Unsupported | Total |
| --- | ---: | ---: | ---: | ---: |
| ams | 158 | 0 | 0 | 158 |
| amscd | 13 | 0 | 0 | 13 |
| cases | 5 | 0 | 0 | 5 |
| empheq | 44 | 0 | 0 | 44 |
| base, unchanged | 780 | 10 | 21 | 811 |
| newcommand, unchanged | 58 | 0 | 0 | 58 |

## Implementation decisions

- Each package exports its own `TexPackage`; `registry.ts` only gains the three registration lines for amscd, cases, and empheq (ams was already registered).
- AMS implements its symbols and delimiters, styled/generalized fractions, continued fractions, extensible arrows, operator names/declarations, multiple integrals, sidesets, subarrays/matrices, equation arrays, multline/flalign, tagging, and references.
- AMScd consumes diagram tokens once, builds alternating object/arrow rows, and schedules object/label parsing on the existing explicit frame stack. Dimensions and options remain parser-local.
- Numbered cases rewrite only their text-condition tokens and preserve math segments, explicit tags, and subnumbers. Ordinary arrays retain the base implementation.
- Empheq decorates tables using independent id-free phantom copies, preserving explicit row tags, empty tables, and simultaneous left/right decorations. Cloning is iterative and uses the parser's allocation limits.
- Relation classification changes are scoped to the selected AMS command table. The base symbol behavior is unchanged.
- The narrowly required shared additions are listed in [packages-shared-changes.md](packages-shared-changes.md). No dependency or lockfile changes are required.

## Primary source read

MathJax 4.1.3 primary implementations were read from the supplied read-only source tree: `ts/input/tex/ams/{AmsMappings,AmsMethods,AmsConfiguration}.ts`, `amscd/{AmsCdMethods,AmsCdConfiguration}.ts`, `cases/CasesConfiguration.ts`, and `empheq/{EmpheqConfiguration,EmpheqUtil}.ts`. Symbol mappings retain the upstream Apache-2.0 attribution. Runtime package implementations never import or invoke MathJax; only test code uses the local oracle.

## Verification and reproduction

Run from this worktree:

```sh
node bench/pkg-ams-verify.mjs
```

The verifier runs the TypeScript compiler, existing tests, all four package test files, the unmodified harness tests, a focused run using the unmodified `run()` API, and the complete unmodified CLI with `--fresh`. It also checks the complete 305-record package-related subset without removing unsupported records, including later labels on explicit tags, explicit-tag cancellation, and removed delimiters. It then compares every fixture ID and every previously matched row against the saved baseline, and asserts that base/newcommand denominators stay fixed and matched counts never decrease. The group-focused selection is exactly the four assigned group names; expected results, normalization, unsupported markers, and denominators are not changed.

Raw artifacts:

- `bench/pkg-ams-verification.txt`: command exit codes and output tails.
- `bench/pkg-ams-build.log`, `bench/pkg-ams-all-tests.log`: compiler and test output.
- `bench/pkg-ams-focused.json`, `bench/pkg-ams-focused.log`: assigned package results.
- `bench/pkg-ams-baseline.json`: before-change complete corpus report.
- `bench/pkg-ams-conformance.json`, `bench/pkg-ams-conformance.log`: after-change complete corpus report.
- `bench/pkg-ams-baseline-comparison.json`: before/after group counts and raw regression list.

The complete corpus CLI intentionally still returns exit 1: unrelated package support and the pre-existing base failures are outside this lane. The package gate and regression comparison return exit 0. No performance claim is made by these correctness checks.

Additional live comparisons against installed MathJax cover nonfixture inputs: equation tags and suppressed numbers; multirow explicit multline tags; optional AMS row spacing; multi-cell smallmatrix; generalized delimiters; starred operator scripts and configurable operator-name grouping; configurable multline dimensions; CD label/spacing/dimension options; numbered piecewise conditions; simultaneous empheq decorations; and decorated equations. React SSR matches string serialization for the new multiscript nodes. Invalid alignat/genfrac arguments, extra case condition columns, missing CD label terminators, activation boundaries, and session isolation are checked.

## Residual boundary

These results establish the requested fixture gate and the additional live comparisons, rather than universal MathJax equivalence. One out-of-fixture discrepancy was observed for `empheq` wrapping an unnumbered `equation` with decorations: upstream emits token nodes containing table-cell children, and this implementation does not reproduce that output. The raw input, output, and difference are preserved in `bench/pkg-ams-outside-fixtures.json`. The assigned empheq fixtures use `tags: 'ams'` and all match. Browser output and speed measurements are outside this parser-only lane.

## Git delivery and root review

The normal `git add` failed with exit 128 because the worktree's index lives in a read-only common Git directory outside the assigned scope. Checkpoints are committed in `bench/.pkg-ams-git`, and `bench/pkg-ams.bundle` carries the lane commits on `refs/heads/pkg-ams`, with prerequisite base `d3daf908c06960d4a04c95ededa6aed371c71d49`. No remote operation is performed.

The run uses the instructed no-review path. Before a costly run, review would have checked fixture selection, oracle/subject separation, and the baseline comparison. Before delivery, review would have checked the bundle's prerequisite and changed-file scope. Before accepting DONE, root's verifier should independently inspect the shared additions, rerun `node bench/pkg-ams-verify.mjs`, and assess the stated unnumbered-empheq boundary.
