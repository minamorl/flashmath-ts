# Package integration

The shipping subject matches **2,635 / 2,683 MathJax 4.1.3 records (98.21%)**:
**all 2,635 executable records match**, with **0 executable mismatches** and
**48 unchanged upstream unsupported records**. The union of 2,625 previously
matched IDs from the six lanes, core, and dependency-integration probes has no
regressions. No fixture ID, expected output, normalization rule or unsupported
marker was changed.

Code-first integration starts from `lane/core` (`d3daf90`). The source and
artifacts in this worktree are authoritative. This run performs no remote send
or npm publication; the package remains private and unpublished. These are
compatibility measurements, not a new integrated throughput claim.

## Merge checkpoints

Each checkpoint builds every source file, runs tests and executes the unchanged
full CLI with `--fresh`. Build and test exits are 0; each full conformance exit is
1 because failures/unsupported records remain in its denominator. The final
acceptance gate checks the failure rows separately; exit 1 is never reported as
universal compatibility.

| Stage | Merge checkpoint | Matched | Mismatch | Unsupported | Total |
| --- | --- | ---: | ---: | ---: | ---: |
| 01-ams | `0aa2f89` | 1137 | 1498 | 48 | 2683 |
| 02-mathtools | `bb5b2ac` | 1341 | 1294 | 48 | 2683 |
| 03-physics | `f5ffe9e` | 2016 | 619 | 48 | 2683 |
| 04-chem | `40620d0` | 2134 | 501 | 48 | 2683 |
| 05-fonts | `41572cb` | 2409 | 226 | 48 | 2683 |
| 06-misc | `a12c31f` | 2635 | 0 | 48 | 2683 |
| 07-fixes | `d348621` | 2635 | 0 | 48 | 2683 |

The normal manifest test command is the union of both globs,
`node --test test/*.test.mjs test/packages/*.test.mjs`. Initially the stage driver
expanded only the top-level glob; it was corrected at stage 05. AMS/mathtools
used the original top-level manifest at their earlier stages. The exact chemistry
checkpoint `40620d0` was subsequently rebuilt and rerun with **both** globs:
1,616 tests, 1,616 pass, 0 fail, 0 skip, and all conformance rows identical to the
original stage 04 report. `04-chem-replay-checks.json` and its logs preserve this
correction. Final gates run every package's tests against the integrated source.

Raw stage reports and command/exit records are `bench/integration/<stage>.json`,
`<stage>-checks.json`, and `<stage>-{build,test,conformance}.log`.

## Package membership counts

Memberships overlap: base membership includes almost the entire corpus, while
the primary base **group** remains 790 matched, 0 mismatch, 21 unsupported / 811;
newcommand's group is 58 / 58. A membership's denominator includes unsupported
records. `lane best` is the greatest count in a saved individual-lane report or
its documented dependency integration, not a sum of overlapping counts. Rows
with zero executable inputs are retained. Per-ID comparisons, original revisions
and report SHA-256 hashes are in `bench/integration/comparison.json`.

package membership | lane best | 01 AMS | 02 mathtools | 03 physics | 04 chem | 05 fonts | 06 misc | final | total
--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---:
base | 1613 | 1137 | 1341 | 2016 | 2134 | 2409 | 2635 | 2635 | 2682
action | 3 | 0 | 0 | 0 | 0 | 3 | 3 | 3 | 3
ams | 427 | 290 | 486 | 486 | 501 | 509 | 545 | 545 | 547
amscd | 13 | 13 | 13 | 13 | 13 | 13 | 13 | 13 | 13
autoload | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3
userMacros | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5
userEnvs | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 15
userFilters | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1
bbm | 9 | 0 | 0 | 0 | 0 | 9 | 9 | 9 | 9
bboldx | 28 | 0 | 0 | 0 | 0 | 11 | 28 | 28 | 28
textmacros | 78 | 0 | 0 | 0 | 0 | 0 | 78 | 78 | 80
bbox | 6 | 0 | 6 | 7 | 7 | 7 | 7 | 7 | 7
begingroup | 19 | 0 | 0 | 0 | 0 | 0 | 19 | 19 | 19
newcommand | 119 | 59 | 60 | 60 | 60 | 60 | 121 | 121 | 121
retry | 19 | 0 | 0 | 0 | 0 | 0 | 19 | 19 | 19
boldsymbol | 191 | 0 | 188 | 188 | 188 | 191 | 191 | 191 | 191
braket | 30 | 0 | 0 | 30 | 30 | 30 | 30 | 30 | 30
bussproofs | 26 | 0 | 0 | 0 | 0 | 0 | 26 | 26 | 26
cancel | 8 | 0 | 0 | 8 | 8 | 8 | 8 | 8 | 8
cases | 49 | 49 | 49 | 49 | 49 | 49 | 49 | 49 | 49
centernot | 2 | 0 | 0 | 2 | 2 | 2 | 2 | 2 | 2
color | 71 | 0 | 0 | 0 | 0 | 29 | 71 | 71 | 71
colortbl | 14 | 0 | 0 | 0 | 0 | 14 | 14 | 14 | 15
nopadding | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1
colorv2 | 10 | 8 | 8 | 8 | 8 | 10 | 10 | 10 | 10
configmacros | 10 | 0 | 0 | 0 | 0 | 0 | 10 | 10 | 10
dsfont | 2 | 0 | 0 | 0 | 0 | 2 | 2 | 2 | 2
empheq | 44 | 44 | 44 | 44 | 44 | 44 | 44 | 44 | 44
enclose | 6 | 0 | 0 | 6 | 6 | 6 | 6 | 6 | 6
extpfeil | 6 | 0 | 0 | 0 | 6 | 6 | 6 | 6 | 6
gensymb | 5 | 0 | 0 | 0 | 0 | 5 | 5 | 5 | 5
html | 47 | 0 | 0 | 0 | 0 | 16 | 47 | 47 | 47
mathtools | 196 | 0 | 196 | 196 | 196 | 196 | 196 | 196 | 196
mhchem | 112 | 0 | 0 | 0 | 112 | 112 | 112 | 112 | 112
noerrors | 56 | 0 | 0 | 0 | 0 | 0 | 56 | 56 | 56
noundefined | 2 | 0 | 0 | 0 | 0 | 0 | 2 | 2 | 2
physics | 628 | 0 | 0 | 628 | 628 | 628 | 628 | 628 | 628
require | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 10
require-load | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1
units | 5 | 0 | 0 | 0 | 0 | 0 | 15 | 15 | 15
setoptions | 10 | 0 | 0 | 0 | 0 | 0 | 10 | 10 | 12
tagformat | 8 | 0 | 0 | 0 | 0 | 8 | 8 | 8 | 8
stackMacros | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2
matchBrackets | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1
mml | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1
(uncaptured) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1
texhtml | 6 | 0 | 0 | 0 | 0 | 6 | 6 | 6 | 6
textcomp | 118 | 0 | 0 | 0 | 0 | 105 | 118 | 118 | 118
unicode | 52 | 0 | 0 | 0 | 0 | 21 | 52 | 52 | 52
no-autoload | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1
upgreek | 41 | 0 | 0 | 0 | 0 | 41 | 41 | 41 | 41
verb | 5 | 0 | 0 | 0 | 0 | 0 | 5 | 5 | 5


No fixture that matched in an earlier merge stage regressed in the next stage.
Every package membership meets or exceeds its highest supplied lane count. The
final regression list is literally `[]` in `comparison.json`; the full union,
all lane reports and every current fixture ID are checked by `compare.mjs`.

## Conflict resolutions and decisions

| File/boundary | Resolution and reason |
| --- | --- |
| `src/packages/registry.ts` | Union all six registration lists. Remove mathtools's temporary bbox/boldsymbol subsets when the full owning packages arrive, avoiding first-registration shadowing. Keep literal-character handlers, ordered handler chains and initializers. |
| `src/packages/types.ts` | Combine character commands, initialization, active package entries, undefined-command and error-format hooks. Add immutable numeric character-handler chains to each resolved configuration so require/autoload uses freshly resolved handlers immediately. |
| `src/configuration.ts` | Preserve original numeric package priorities and copy session-mutated TeX options. Union AMS/cases/mathtools tag validation, texhtml render mode, bussproofs output mode, configmacros templates and chemistry output validation. |
| `src/ast.ts` | Union multiscripts/prescripts/none and maction/HTML kinds with matching enum/name-array order, then rebuild all modules. Retain inferred-row/script-boundary flags and native glyph provenance. Expose mixed HTML text nodes and the narrow upstream token/cell spacing used by unnumbered empheq. No internal flags leak into attributes. |
| `src/parser.ts` | Keep AMS row/tag metadata and explicit tags; mathtools initialization/session state; physics inferred rows, script boundaries and numeric character dispatch; color table metadata; chemistry output-mode handling; misc dynamic configuration, comments, error hooks, active characters and base fixes. Explicit physics missing-fence errors take precedence over general EOF diagnostics. |
| `src/parser.ts` character precedence | Preserve the physics/braket decline chain and mathtools's independent literal-colon map. A texhtml character command without `char` uses its literal command name. Resolve handler chains with the configuration rather than caching the initial selection; this also fixes dynamically required physics. |
| `src/parser.ts` row spacing | Only an immediately adjacent `[` after a row break is an option. Whitespace begins the next row's literal brackets, preventing NaNem and accidental dimension errors. Immediate invalid dimensions remain errors. |
| `src/scanner.ts` | Retain misc's percent source tokens so verb/setOptions can read literal percent; math/text consume comments at grammar level. Retain chemistry's direct character-code scanner. No suffix reconstruction or conformance changes. |
| `src/packages/base.ts` | Keep physics's inferred-row preservation alongside misc's root-index parsing, argument diagnostics, cases and array repairs. |
| `src/serialize.ts`, `src/output.ts` | Combine HTML text-node serialization with native/mathjax output conversion. Chemistry transformations remain provenance-scoped. The strict conformance adapter explicitly selects mathjax output. |
| `src/react.ts` | Combine real HTML text nodes, native glyph output and physics's CSS-object bridge. CSS names are case-insensitive except custom properties; lowercase them before React camel-casing. Quoted/function values and vendor/custom properties are retained. |
| `src/symbols.ts` | No integration edit required; package additions keep their own symbol tables and core dispatch remains unchanged. |
| `docs/packages-shared-changes.md` | Retain every lane's additions rather than choosing one add/add side. These historical notes include isolated-lane subsets; the final replacements are specified here. |
| `test/packages/fixtures.mjs` | Union fonts and misc fixture-helper APIs against the actual shipping adapter. Keep dependency checks and unsupported diagnostics; do not substitute the isolated compiled integration adapters. |
| `package.json` | Retain chemistry's broader test command including both top-level and package globs. No dependency or lockfile changes. |

The units candidate in `bench/pkg-misc/dependencies/units.js` was promoted to typed
`src/packages/units.ts` and registered explicitly, after reading MathJax's pinned
UnitsConfiguration. This enables the 10 units group records plus 5 SetOptions
consumers. No new dependency was needed. Direct oracle tests cover loose/ugly
options and activation boundaries.

The supplied fonts textmacros patch targets an older misc implementation and does
not apply. The current shim already dispatches `text-insert`, `textbb` and
`textbfbb`; its behavior matches every textcomp/bboldx/textmacros membership with
the current source, so the older shim was not substituted.

## Verifier follow-up work

- **Physics correctness:** replay the original 467-expression corpus and the same
  frozen novelty cohort; 466 / 467 match, including all 395 / 395 frozen novel
  valid expressions. The remaining expression is MathJax's own TypeError on
  `\centernot{}`. The broader probe has 992 / 1,003 matches and all 948 / 948 valid
  expressions match, with no regressions against source built at `1e1867f`.
  Raw oracle, old-source and current-source outputs are all preserved in
  `bench/integration/probes.json`. The handoff referred to four valid regressions
  without supplying their TeX strings; no identities were invented. Root should
  replay those exact inputs if its original verifier retained them.
- **Nested Dirac parsing:** ket, bra and inner/outer product arguments now use the
  existing explicit argument frames instead of raw TeX reconstruction. At depth
  100 / 200 / 400, ket slice counts are 201 / 401 / 801, bra 300 / 600 / 1,200,
  and braket/dyad 401 / 801 / 1,601. Total sliced characters also scale linearly.
  The test checks preserved fences and throws on parse errors. This is evidence
  for these families, not a complexity guarantee for every physics expansion.
- **Array row spacing:** direct oracle tests cover literal `[b]` after whitespace,
  adjacent invalid `[b]`, and adjacent/spaced `[2pt]` in arrays and matrices.
- **React uppercase CSS:** SSR emits canonical CSS names; Chromium computed color
  `rgb(255, 0, 0)` and background `rgb(230, 240, 255)` from uppercase declarations.
  All 2,635 executable fixture SSR paths are exercised, with 0 unsupported catches.
  SSR comparison tolerates only declaration-separator whitespace and has negative
  calibration tests for changed CSS values, quoted content and node kinds.
- **Unnumbered empheq:** collect an equation's full output once before decoration;
  preserve inferred sequences and MathJax's mixed token/table-cell output,
  including serializer whitespace, without mutating unrelated tagged equations.
  All 35 valid unnumbered probes match, including empty gather layout. MathJax's
  malformed token/cell output is reproduced for compatibility; native browser
  layout of that upstream-invalid structure is not guaranteed.
- **Chemistry outside fixtures:** the integrated subject matches all 216 / 216
  independent nonfixture cases, including charges, isotope scripts, nested
  chemistry labels, reaction arrows and units. The test checks distinctness from
  the captured fixtures; every row remains in `chem-generalization.json`.

## Unsupported and remaining differences

There are **0 remaining executable fixture mismatches**. The 48 unsupported
records retain the exact original extraction classifications:

| Extraction classification | Records |
| --- | ---: |
| typeset-component-pipeline | 14 |
| custom-package-registration | 26 |
| non-single-MathML-snapshot | 7 |
| input-not-captured | 1 |

These describe the capture boundary, not 48 newly thrown parser errors.
Require/autoload have direct executable tests even though their captured
component-pipeline cases remain unsupported. The independent 1,003-expression
probe additionally retains 11 upstream exceptions (centernot empty input, and
empty/right-only unnumbered empheq cases); they are listed with raw errors,
not filtered out or converted into successful comparisons. All valid probe
outputs match. Full arbitrary TeX, HTML repair, custom package registration,
SVG rendering, fonts and every possible package combination are not certified.

| Fixture ID | Group | Unchanged unsupported category |
| --- | --- | --- |
| Autoload.test.ts::Autoload Autoload package 1 | autoload | typeset-component-pipeline |
| Autoload.test.ts::Autoload Autoload environment 1 | autoload | typeset-component-pipeline |
| Base.test.ts::User Defined Macros Macro with empty optional def 1 | base | custom-package-registration |
| Base.test.ts::User Defined Macros Macro with optional def 1 | base | custom-package-registration |
| Base.test.ts::User Defined Macros EqRef 1 | base | custom-package-registration |
| Base.test.ts::User Defined Macros Right Color 1 | base | custom-package-registration |
| Base.test.ts::User Defined Macros Middle Color 1 | base | custom-package-registration |
| Base.test.ts::User Defined Environments smallmatrix 1 | base | custom-package-registration |
| Base.test.ts::User Defined Environments pmatrix 1 | base | custom-package-registration |
| Base.test.ts::User Defined Environments Crampedsubarray 1 | base | custom-package-registration |
| Base.test.ts::User Defined Environments Gather 1 | base | custom-package-registration |
| Base.test.ts::User Defined Environments User 1 | base | custom-package-registration |
| Base.test.ts::User Defined Environments Cases star 1 | base | custom-package-registration |
| Base.test.ts::User Defined Environments EqnTest 1 | base | custom-package-registration |
| Base.test.ts::Tagged Environments EqnTest 1 | base | custom-package-registration |
| Base.test.ts::Tagged Environments Equation 1 | base | custom-package-registration |
| Base.test.ts::MathStyle French 1 | base | custom-package-registration |
| Base.test.ts::MathStyle French 2 | base | custom-package-registration |
| Base.test.ts::MathStyle ISO 1 | base | custom-package-registration |
| Base.test.ts::MathStyle upright 1 | base | custom-package-registration |
| Base.test.ts::MathStyle other 1 | base | custom-package-registration |
| Base.test.ts::Multiletter Indentifier Mismatch 1 | base | custom-package-registration |
| Base.test.ts::Postfilter Empty list 1 | base | custom-package-registration |
| Colortbl.test.ts::Colortbl color with no frame 1 | colortbl | custom-package-registration |
| Require.test.ts::Require Require package 1 | require | typeset-component-pipeline |
| Require.test.ts::Require Require with dependencies 1 | require | typeset-component-pipeline |
| Require.test.ts::Require Require with preprocessors 1 | require | typeset-component-pipeline |
| Require.test.ts::Require Require with stack items 1 | require | typeset-component-pipeline |
| Require.test.ts::Require Require with menu extensions 1 | require | typeset-component-pipeline |
| Require.test.ts::Require Options DefaultAllow with allow 1 | require | typeset-component-pipeline |
| Require.test.ts::Require Options Prefixed options 1 | require | typeset-component-pipeline |
| Require.test.ts::Require Options RequireLoad with prefix 1 | require | typeset-component-pipeline |
| SetOptions.test.ts::Setoptions Require Require 1 | setoptions | typeset-component-pipeline |
| SetOptions.test.ts::Setoptions Require Require with option 1 | setoptions | typeset-component-pipeline |
| Tag.test.ts::Page References Forward Reference 1 | tag | non-single-MathML-snapshot |
| Tag.test.ts::Page References Forward Reference 2 | tag | non-single-MathML-snapshot |
| Tex.test.ts::Stack toString 1 | tex | custom-package-registration |
| Tex.test.ts::Stack getTop 1 | tex | custom-package-registration |
| Tex.test.ts::FindTeX display math 1 | tex | non-single-MathML-snapshot |
| Tex.test.ts::FindTeX environment 1 | tex | non-single-MathML-snapshot |
| Tex.test.ts::FindTeX Nested braces 1 | tex | non-single-MathML-snapshot |
| Tex.test.ts::FindTeX processEscapes 1 | tex | non-single-MathML-snapshot |
| Tex.test.ts::FindTeX ref undefined 1 | tex | non-single-MathML-snapshot |
| Tex.test.ts::TexParser GetBrackets matchBrakets 1 | tex | custom-package-registration |
| Tex.test.ts::TexParser mml 1 | tex | custom-package-registration |
| Tex.test.ts::NodeFactory create null kind 1 | tex | input-not-captured |
| Textmacros.test.ts::Textmacros Autoload Autoload 1 | textmacros | typeset-component-pipeline |
| Textmacros.test.ts::Textmacros Autoload No Autoload 1 | textmacros | typeset-component-pipeline |

## Reproduction and review

Primary implementations read locally: pinned MathJax 4.1.3 AMS/empheq/physics
methods, UnitsConfiguration, base CrLaTeX row-spacing handling, and React
19.2.4's server style serializer. Inherited package source attribution and
Apache-2.0 licenses remain intact. Runtime source does not import either oracle.

```sh
node bench/integration/final-gate.mjs
```

This invokes the installed compiler and the same Node test command as the
manifest, the unchanged full conformance CLI, unchanged harness tests, generated
mhchem grammar check, per-lane/per-ID regression checks, source-built `1e1867f`
probe comparisons, chemistry generalization checks and Chromium interaction.
The manifest commands remain available; direct installed tools avoid this host's
pnpm shared-store DB issue without installing or changing the lockfile.
`final-checks.json` records command exit codes; `final-gate.log` and individual
`final-*.log` files contain raw output. Conformance's retained-unsupported exit 1
is recorded independently inside the successful stage gate.


The full base-to-integration `git diff --check d3daf90` returns exit 2 solely for
captured trailing spaces in `bench/pkg-fonts/integration-gate.log` and
`bench/pkg-fonts/validation.log`. Their bytes match `930c254` exactly and are
preserved as raw evidence. The gate separately requires exit 0 for all source,
tests, documentation, manifest/lockfile and integration evidence diffs, and
rejects any new whitespace diagnostic outside those two inherited logs. Both
commands and their exits are retained in `final-checks.json` and
`final-archive-whitespace.log`.

screen_run: Chromium opened `bench/integration/integrated-native.html`, used
mouse and keyboard to switch MathJax/native output, and showed 14 MathML formulas
with 0 native PUA and 0 merror. Six isotope prescript boxes have gap 0 to their
element, and uppercase CSS applies in computed styles. The screenshot
`integrated-native.png` was opened and visually inspected: isotope/reaction
scripts precede elements, arrow labels remain legible, and the integrated
mathtools/physics expression is present.

The original Git index is outside the write scope and `git add -A` returned exit
128 (read-only index.lock). Checkpoints therefore use
`git --git-dir=bench/.integration-git`. `bench/integration.bundle` contains the
integration history relative to prerequisite `d3daf90`; delivery metadata records
its final head/ref and digest. The ordinary worktree `.git` remains unchanged.

No review broker is available and no child agent was started. Requested root
review checkpoints:

1. Before expensive execution: inspect immutable fixture hashes, full denominators,
   independent oracle/subject paths, negative comparator calibration and preserved
   failed/unsupported rows.
2. Before external delivery: inspect the final diff, source hashes and bundle
   prerequisite/ref; this run performs no push, upload or publication.
3. Before acceptance: start the independent verifier, rerun the gate, examine
   shared-core/character-priority and mixed-output resolutions, replay the original
   four physics inputs if available, and inspect the actual Chromium screenshot.
