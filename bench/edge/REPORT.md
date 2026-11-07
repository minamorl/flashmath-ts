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
