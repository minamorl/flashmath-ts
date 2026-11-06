# pkg-misc lane evidence

Shipping integration is still required. This lane does not own color/html/unicode/textcomp/bboldx/AMS; their absence produces 88 subject errors in the lane-only selected run. The isolated integration run copies those lanes' compiled package modules, keeping this lane's core. `units` was not assigned to any existing lane: `bench/pkg-misc/dependencies/units.js` is an implemented integration dependency candidate, **not registered in shipping source**. Root must assign/promote it before claiming shipping setoptions coverage. No external request, push, merge, or npm publish was performed.

## Changes

Implemented textmacros, bussproofs, verb, begingroup, configmacros, setoptions, require, autoload, noerrors and noundefined through the package boundary. Package tests live under `test/packages/`, with the normal test entrypoint importing them. `retry` is a synchronous compatibility shim for the harness's MathJax retry test package; flashmath's local loading needs no asynchronous retry.

Text mode has a separate explicit scope stack, macro expansion, text fonts/sizes, math islands, accents, references, and controlled dispatch to active package handlers. Bussproofs constructs proof trees and applies the upstream balancing algorithm with vendored New Computer Modern 4.1.3 advance metrics; no MathJax parser or renderer executes in production. It uses MathJax's decimal formatting for proof margins. Configured macros, groups/sandboxes/global definitions, dynamic package activation, error formatting, and runtime option changes retain per-session state.

Shared changes and their reasons are listed one per line in `docs/packages-shared-changes.md`. There are no lockfile changes. Base's ten executable discrepancies are repaired; base and newcommand denominators and unsupported records are preserved.

## Primary material read

Installed `node_modules/@mathjax/src/ts/input/tex/` implementations for all ten assigned packages, including TextParser/TextMacrosMappings/Methods, BussproofsMethods/Items/Util/Mappings, BegingroupMethods/Stack, ConfigMacrosConfiguration, SetOptionsConfiguration, RequireConfiguration, AutoloadConfiguration, VerbConfiguration, NoErrorsConfiguration, and NoUndefinedConfiguration. Width calculation also follows the installed output/common wrappers, UnitUtil, and New Computer Modern 4.1.3 normal glyph metrics. UnitsConfiguration was read for the isolated dependency candidate. These are local primary sources; no external network request was needed.

## Reproduction

```sh
node node_modules/typescript/bin/tsc -p tsconfig.json
node --test test/*.test.mjs
node bench/pkg-misc/select.mjs
node conformance/runner.mjs --subject bench/flashmath/adapter.mjs --fixture bench/pkg-misc/fixtures.json --output bench/pkg-misc/standalone.json --fresh
node bench/pkg-misc/integration.mjs
FLASHMATH_INTEGRATION=1 node --test test/packages-misc.test.mjs
node conformance/runner.mjs --subject bench/pkg-misc/integration-adapter.mjs --fixture bench/pkg-misc/fixtures.json --output bench/pkg-misc/integration.json --fresh
node conformance/runner.mjs --subject bench/flashmath/adapter.mjs --output bench/pkg-misc/full-conformance.json --fresh
node bench/pkg-misc/report.mjs
```

`integration.mjs` copies package dependencies from sibling pkg-fonts/pkg-ams worktrees into an ignored local directory. It records source paths and SHA-256 hashes in `dependency-snapshots.json`, never writes to those worktrees, and does not replace this lane's core. The unit dependency candidate is copied into that directory explicitly. `select.mjs` selects base/newcommand and every record containing an assigned package, including overlapping Bboldx and Textcomp records; input, expected output, unsupported flags, and normalization remain unchanged.

pnpm's wrapper attempted to open its shared store and failed before build with `unable to open database file`; the installed compiler was invoked directly instead. No installation or lockfile update was needed.

## Recorded results

Compiler exit 0. Normal tests: exit 0, 37 tests, 33 pass, 0 fail, 4 skip. Integration package tests: exit 0, 19 tests, 17 pass, 0 fail, 2 skip. Skips are explicitly diagnosed in the raw logs: require/autoload's captured fixtures are all harness-unsupported; standalone textmacros/setoptions fixtures require cross-lane registrations. Their executable behavior also has direct tests for loading, disabled triggers, session persistence, filters, comments, package activation and delimiter boundaries.

Selected lane-only CLI: exit 1, 966 matched / 1089, 88 subject errors, 35 retained unsupported records. Selected integration CLI: exit 1, 1054 matched / 1089, **0 mismatches**, the same 35 unsupported records. The runner returns exit 1 whenever any record is unsupported, even when every executable record matches. The unfiltered shipping-adapter run is saved in `full-conformance.json` and remains red because other packages are outside this lane. These results do not claim full-library conformance.

| Primary suite | Matched | Mismatch | Unsupported | Total |
| --- | ---: | ---: | ---: | ---: |
| Base | 790 | 0 | 21 | 811 |
| Newcommand | 58 | 0 | 0 | 58 |
| Begingroup | 19 | 0 | 0 | 19 |
| Bussproofs | 26 | 0 | 0 | 26 |
| ConfigMacros | 10 | 0 | 0 | 10 |
| Noerrors | 56 | 0 | 0 | 56 |
| Noundefined | 2 | 0 | 0 | 2 |
| SetOptions | 10 | 0 | 2 | 12 |
| Textmacros | 48 | 0 | 2 | 50 |
| Verb | 5 | 0 | 0 | 5 |
| Require | 0 | 0 | 8 | 8 |
| Autoload | 0 | 0 | 2 | 2 |

Overlapping textmacros membership: 78 matched, 0 mismatch, 2 unsupported / 80. All 17 selected Bboldx and 13 Textcomp dependency records match.

## Limits for root verification

- Promote/assign the units candidate and integrate dependency package registrations before running the shipping adapter gate. The standalone lane is not globally green.
- The harness's typeset component loading, no-autoload pipeline and custom base package registration records remain unsupported. No records have been removed or reclassified.
- Require/autoload activate only locally registered packages; unavailable extensions raise UnsupportedFeatureError and never contact a loader or network.
- Bussproofs' captured regular inference fixtures are covered. Sequent-style Axiom/UnaryInf commands and general renderer/font equivalence outside these fixtures are not implemented or claimed. Width support is limited to the emitted proof MathML and bundled font metrics; it is not an SVG renderer.
- No new performance claim is made by this lane; benchmark the integrated parser separately.
- No UI changed, so there is no screen_run requirement.

## Review handoff (--no-review)

Before expensive execution: review immutable fixture selection, retained unsupported rows, dependency snapshots, option forwarding, and glyph-metric provenance; all local runs here were short conformance/test runs.
Before external/destructive operations: no such operation was executed; root must review delivery/publication separately.
Before DONE: review raw standalone/integration reports, the 10 base repairs, shared-core merge conflicts, and units promotion, then run root's independent verifier. The lane does not claim a published or globally complete parser.

The worktree's Git directory is outside assigned write scope. Delivery therefore uses an owned local Git object repository and `bench/pkg-misc/pkg-misc.bundle`, based on d3daf90, so root can fetch/cherry-pick without permitting writes outside this worktree.
