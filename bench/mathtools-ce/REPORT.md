# mathtools chemistry alignment

Code-first, no spec. Base: `b32bffdd824dd9e9964e601843732b194ff386f2`.
No review broker, agents, push, npm publish or external delivery.

## Cause and decisions

mathtools overrides AMS alignment environments. Its private alignment callback
still examined only the first cell node, bypassing the shared `fixInitialMO`
introduced in `47238f9`. Chemistry emits an empty ORD atom before its REL
arrow, so the callback failed to prepend the empty `mi` required by MathJax.
`before.log.gz` records the original comparison failures, including the requested
single-row/two-row aligned and align expressions.

Primary source read: installed MathJax 4.1.3 `ParseUtil.fixInitialMO`,
`base/BaseItems.ts` (`EqnArrayItem.EndEntry`),
`mathtools/MathtoolsMappings.ts`, `mathtools/MathtoolsMethods.ts` (Cases),
and `textmacros/TextMacrosConfiguration.ts`.

Visible changes:

- Use the shared initial-operator correction for mathtools left alignment cells.
  Preserve existing empty atoms and explicit spacing boundaries.
- Apply that correction to subsequent centered/left gathered cells; right
  gathered cells and first cells keep upstream prefix behavior.
- Preserve the implicit center alignment and single `middle` break-align
  attribute for multi-column AMS gather/gathered tables.
- Consume the mandatory column-pair argument for mathtools `alignedat`, which
  previously leaked into the first cell as a visible number.
- Retain the text-column `mstyle` in starred cases when textmacros is active.
- Add six corrected expressions to the interactive native-render comparison
  page as the `mathtools-ce` group.

No public interface, dependency, manifest, lockfile or workflow changes.

## Comparison coverage and phase gate

`test/packages/mhchem-alignment.test.mjs` compares 128 common expressions across
18 configurations: base+ams+mhchem, each additional package from the existing
19-package CROSS set independently, and the complete CROSS set. Both
mathtools-enabled configurations also compare 54 additional expressions:
182 distinct expressions and 2,412 strict MathML comparisons overall.

The 19 packages are the same ordered set as `bench/hardening/inputs.mjs`:
base, ams, newcommand, mathtools, boldsymbol, physics, mhchem, color, bbox,
enclose, cancel, html, unicode, dsfont, bbm, upgreek, gensymb, textmacros,
colortbl. Both subject and installed 4.1.3 oracle receive the same options.
The existing strict comparator retains texclass and attributes and ignores
only source annotations. Every oracle conversion must be free of merror.

Coverage includes aligned, align/align*, alignat/alignat*, alignedat, gathered,
split, multlined, lgathered/rgathered, all mathtools matrix/cases variants,
crampedsubarray and spreadlines. Starred cases use a text second column and
nested chemical alignment in the math column. multlined also nests aligned:
raw alignment tabs are invalid in its single-column rows.

Test development initially generated invalid multlined multi-column input and
starred cases with math commands in text columns. Oracle error guards rejected
these inputs; they were replaced with valid nested alignments before acceptance.
The enlarged comparison also exposed the gathered, alignedat and textmacros
boundary issues above; their actual MathJax output was inspected before fixing.

Commands and raw output:

- `node scripts/build.mjs`: exit 0, `build.log`.
- `node --test --test-reporter=tap test/packages/mhchem-alignment.test.mjs test/packages/mathtools.test.mjs test/packages/ams.test.mjs test/edge-compatibility.test.mjs`:
  exit 0, `targeted.log` (31 tests, no failures).
- `node --test --test-reporter=tap test/packages/mhchem-alignment.test.mjs`:
  exit 0, `combinations.log`.

Disabled-review checkpoint before costly verification: inspect shared
initial-operator traversal, unchanged spacing controls, valid oracle inputs,
full 19-package membership and exact per-package comparison coverage.

## Delivery

The original Git metadata is outside the assigned write scope. Phase commits
use the ignored `.release-git` directory inside this worktree. The final bundle
is a separate delivery artifact; neither Git metadata nor the bundle belongs
in the commits or npm tarball.

## Final gates

- `node bench/release/verify.mjs`: exit 0, `release.log`. Every subcommand
  matches its expected exit in `../release/checks.json`. Full conformance is
  2,635 matched / 0 mismatched / 48 retained unsupported, with exact baseline
  IDs and statuses. Library tests: 2,436 total / 2,430 pass / 0 fail / 6 skip.
- `PNPM_CONFIG_STORE_DIR="$PWD/node_modules/.pnpm-store" PNPM_CONFIG_CACHE_DIR="$PWD/node_modules/.pnpm-cache" node bench/release/ci.mjs`:
  exit 0, `ci.log`. Exact commands, exits and tails: `../release/ci-checks.json`.
  Frozen install, build, tests, fresh conformance/regression gate and actual
  tarball imports/React SSR all ran. The initial default-store install could
  not open its SQLite database outside the writable scope; the retry and CI
  replay use an ignored store/cache under this worktree's node_modules.
- `node bench/edge/check-artifacts.mjs`: exit 0, `artifacts.log`. Checked the
  current source fingerprint, release/CI exits, actual archive size/SHA-512,
  release report metadata, allowed archive files and visual/reference errors.
- Inline Node archive-consumer check: exit 0, `packed-chemistry.log`. Extracted
  the actual tarball under TMPDIR and imported its core entry. All three
  requested formulas match MathJax in both the four-package and complete
  19-package configurations. Scratch files were removed afterward.
- `git --git-dir=.release-git --work-tree="$PWD" diff --check`: exit 0.

Runtime: Node 26.12.1 / pnpm 11.18.0. The workflow's Node 22 matrix runtime
is not installed here and was not tested. Workflow, manifest and lockfile
remain unchanged.

screen_run: Chrome/153.0.8010.36 opened `../native-render/after.html` and used
keyboard input to switch React SSR → toMathMLString → React SSR. All 222
formula pairs have equal measured geometry. Hydration and 2,638 client-rendered
cases have empty runtime/recoverable error arrays. The six `mathtools-ce`
examples were captured in `../native-render/after-mathtools-ce-1.png`, which
was opened for visual inspection. The visual gate reports 840 checks, no
failures and no strict MathJax MathML differences. Pixel identity with MathJax
SVG is not asserted; native fonts and glyph metrics differ.

Local performance evidence: 36/36 MathJax groups and 22/22 accepted-input
Temml cohorts have lower flashmath p50. No universal speed claim is inferred.
Candidate metadata is regenerated from the actual archive in
`../release/pack.json`; the archive is `../release/minamorl-flashmath-0.1.0.tgz`.

`mathtools-ce.bundle` carries the phase commits on `lane/mathtools-ce` after
base `b32bffdd824dd9e9964e601843732b194ff386f2`. The original worktree Git
HEAD/index are untouched. The bundle itself is excluded from its commits.

Disabled-review checkpoint before external delivery: no external delivery
was requested or run; the caller can inspect the bundle before later delivery.
Disabled-review checkpoint before DONE: inspect the raw gate exits, source and
archive fingerprints, six actual tarball regressions, browser screenshot,
final diff and bundle prerequisite against the stated base.

The final base-to-HEAD whitespace check detected trailing whitespace in the
captured assertion log. That log is now stored as `before.log.gz`; decompression
was compared byte-for-byte against the original phase commit. No raw evidence
was trimmed. The final base-to-HEAD diff check is rerun after this packaging fix.
