# Edge verification

Code-first; no spec. Scope: nesting budgets, deep chemistry output copies,
initial operators in multlined/alignment cells, and reproducible release metadata.
No agent, push, network delivery or npm publish is used.

## Depth and chemistry

Decisions:

- Every package combination keeps the default 1,024 parser-frame limit.
- Chemistry uses the remaining enclosing-parser depth budget, also by default.
  Larger explicitly configured limits still permit deep iterative conversion.
- Chemistry output is retained as chunks and flattened iteratively at emission.
  The previous continuation loop copied all child items at every ancestor.
  Leaf counts and escape flags are retained for unit spacing and alignment.

CPU profiles (`chemistry-before.cpuprofile`, `chemistry-after.cpuprofile`) and
`profile-summary.jsonl` locate the original cost in chemistry `steps` and GC.
The same 5,000/10,000/20,000 ce-paren inputs took 1,105/3,897/16,782 ms before;
the third warmed run after took 127/230/534 ms. These are local measurements,
not portable latency guarantees. The profiles include instrumentation overhead.

`test/edge-depth.test.mjs` preserves package-independent safety checks,
enclosing-frame accounting, early default rejection and raised-limit scaling
at all three requested depths for both ce-paren and ce-nested. It uses five
alternating-order samples and median process CPU time (including GC threads)
to reduce interference from other CI test processes. Fourfold-depth slope must
remain below 1.65; measured slopes in `depth-scaling-tests.log` were 1.097/1.132.
`bench/edge/scaling.mjs` can emit all raw samples as JSON when run independently.

Checks (raw output retained alongside this report):

- `node scripts/build.mjs`: exit 0 (`build-depth.log`).
- `node --test test/edge-depth.test.mjs`: exit 0 (`depth-scaling-tests.log`).
- `node --test test/packages/mhchem.test.mjs test/polish-compatibility.test.mjs`:
  exit 0 (`depth-tests.log`).
- `node --test test/packages/mhchem-generalization.test.mjs test/packages/mhchem-output.test.mjs test/hardening.test.mjs`:
  exit 0 (`depth-regression.log`).

Initial profiling failed because dist had not yet been built. Building the
existing source resolved that prerequisite before capturing the before profile.

Disabled-review checkpoint: before costly verification, check that resource
tests exercise ordinary TeX with mhchem enabled and that scaling measures
successful raised-limit conversion, rather than timing early rejection.

The original Git metadata is outside the assigned write scope. Local commits
use the ignored `.release-git` directory and will be delivered in a bundle.

## Initial operators

Primary source read: installed MathJax 4.1.3 `ParseUtil.fixInitialMO`,
`ams/AmsItems.ts`, `base/BaseItems.ts`, `mathtools/MathtoolsItems.ts` and
`core/MmlTree/MmlNode.ts` / `MmlNodes/TeXAtom.ts`.

Decisions:

- Apply the initial-infix correction to later multlined rows and left-aligned
  AMS cells, including an initial operator following empty chemistry atoms.
- Share the correction with multline, retaining embellished operator behavior.
- Retain the implicit mstyle boundary of Spacer commands as private metadata.
  `\\,` serializes as mspace but must stop the initial-operator search as its
  upstream mstyle does. No new MathML attribute or public AST field is emitted.
- Add the reported formulas and a spacing control to the interactive native
  comparison page (`edge` group) for the final browser run.

`test/edge-compatibility.test.mjs`: 198 independent multlined comparisons and
152 chemistry alignment comparisons, all outside captured fixtures. Includes
positions, empty atoms, explicit spaces, ordinary atoms, varied operators,
multiple rows and aligned/align/align*/split environments.

Checks: build exit 0 (`build-compatibility.log`); 13 package/comparison tests
exit 0 (`compatibility-tests.log`); scoped conformance exit 0 with the existing
848 matched / 0 mismatched / 21 unsupported (`compatibility-conformance.log`).
Original exact counterexamples are retained in `compatibility-before.log`.

Test development caught a null fixture input and missing spaces after generated
control sequences; those test-generation defects were corrected. Expanded
controls also exposed the Spacer mstyle boundary and grouped-operator semantics;
the implementation now retains both.

Disabled-review checkpoint: inspect independent oracle validity, the nonempty
comparisons, empty-atom traversal and Spacer control before release verification.

## Final gates and delivery

- `node bench/release/verify.mjs`: exit 0. Full raw output:
  `../release/gate.log`; per-step commands/exits: `../release/checks.json`.
- `node bench/release/ci.mjs`: exit 0. Replays the workflow's frozen pnpm
  install, build, library/harness/CI tests, fresh conformance with exact
  regression gate and npm tarball smoke. Raw output: `../release/ci.log` and
  `../release/ci-*.log`; command exits: `../release/ci-checks.json`.
- `node bench/edge/check-artifacts.mjs`: exit 0. Checks the actual source
  fingerprint, all required gate exits, archive bytes/SHA-512, REPORT metadata,
  allowed package files and visual/reference errors (`artifact-checks.log`).
- `git diff --check`: exit 0.

Final release measurements: 36/36 MathJax groups, 22/22 identical-input Temml
cohorts. Minimum observed speedups: 5.982x and 1.093x. They are local evidence;
cross-machine ranking and universal complexity claims are not inferred.

screen_run: Chrome/153.0.8010.36 opened `../native-render/after.html`; real
keyboard input switched React SSR → toMathMLString → React SSR with equal
geometry. Hydrated 216 comparisons and client-rendered 2,638 captured cases;
console and recoverable hydration error arrays were empty. The `edge` selector
group was captured and its actual screenshot opened for inspection:
`../native-render/after-edge-1.png`. All five corrected/spacing-control examples
are visible. Overall visual gate: 828 checks, no failures or reference differences.
Native font metrics, spacing and pixel identity remain distinct from MathJax SVG.

The CI replay used installed Node 26.12.1 / pnpm 11.18.0. The workflow's Node 22
matrix runtime is not installed locally; it was not claimed as tested. Workflow,
package manifest and lockfile were not changed.

Candidate sizes and SHA-512 now come directly from the verified archive in
`../release/pack.mjs` whenever the candidate is packed. REPORT also reads current
benchmark counts instead of duplicating them manually. `../release/FINISH.md`
is explicitly marked historical.

Delivery: `edge.bundle` contains the phase commits after base `02338ac` and can
be fetched as the `lane/edge` ref. The original worktree Git HEAD/index are not
modified, because their Git directory is outside the assigned write scope.
The ignored `.release-git` remains local and is absent from commits/package.
The standalone bundle is not itself included in its commits. No push, publish,
external transmission, agent spawn or review-broker invocation ran.

Disabled-review checkpoint before external delivery: none was requested or run;
any later push/publication belongs to the caller after inspecting this bundle.
Disabled-review checkpoint before DONE: inspect raw gate exits, source/archive
fingerprints, browser screen, diff and bundle applicability to base `02338ac`.
