# Package integration

Code-first integration from `lane/core` (`d3daf90`). The fixture, normalizer,
options revival and runner under `conformance/` are immutable. The source of
truth is this worktree. No external delivery or npm publication is part of this run.

## Checkpoints

The common Git index is read-only (original `git add -A`: exit 128, unable to
create index.lock). Checkpoints use `bench/.integration-git`, with original Git
objects as read-only alternates; the final bundle is self-contained relative to
`d3daf90`. Commands use `git --git-dir=bench/.integration-git`.

Each merge runs `node bench/integration/stage.mjs <stage>`: installed TypeScript
compiler, normal test entrypoint, and the unchanged full conformance CLI with
`--fresh`. Full CLI exit 1 retains mismatches and upstream unsupported records;
it is never interpreted as universal conformance. Raw reports, command exits and
logs are saved under `bench/integration/`.

## Merge resolutions

- AMS: merges cleanly; all package handlers and shared parser/tagging additions
  retained.

## Review handoff

Broker disabled by caller. Before running comparisons, review should check the
immutable corpus boundary, all denominators and row-by-row baseline comparison.
Before accepting delivery, root should inspect conflict resolutions and rerun
the final gate independently. This worker starts no child agents.

- Mathtools: union registry registrations and shared-change notes; preserve AMS's
  `cases` tag mode and allow `ams` with either AMS/cases or mathtools selected.
  Numeric node kinds from both lanes coincide. Keep the temporary boldsymbol/bbox
  subsets until their full owning lanes arrive. Parser initializer, session data
  and literal colon handler additions merge alongside AMS tag metadata.

- Physics: retain both registry lists and shared-change notes; replace mathtools's
  temporary bbox registration with the full bbox implementation. Preserve both
  character paths: mathtools literal-colon map and physics/braket numeric-code
  handler chains with decline semantics. Keep initializer, inferred-row and
  script-boundary metadata together. React now translates CSS text to props.

  The newly broadened SSR test exposed CSS whitespace differences in mathtools.
  SSR comparison now retains strict tree/text/attribute checks while canonicalizing
  whitespace around CSS declaration separators only, preserving quoted/function
  values. The conformance normalizer is unchanged and still compares literal CSS.

- Chem: union registry and shared-change notes. Native glyph provenance and
  isotope conversion, scanner dispatch and output-mode support merge alongside
  physics's CSS bridge and inferred-row metadata without discarding either.

- Fonts: union registry lists and shared notes; remove temporary boldsymbol
  registration in favor of full implementation. Union appended MathML kinds
  (multiscripts before maction/html), maintaining name/enum positional identity
  with a full rebuild. Retain `cases` tag validation, explicit tags and table
  colors. Keep numeric character chains; texhtml's literal-name handler supplies
  its character when `char` is absent. Serializer/React support HTML text nodes
  while retaining chemistry's output-mode transformation and physics's CSS props.

- Misc: union registration lists and lifecycle/character contracts; preserve
  original numeric priorities in active configurations, clone mutable TeX options,
  accept texhtml render and bussproofs output modes conditionally, retain native
  output validation, and combine package diagnostic messages with physics's
  explicit missing-fence messages. Merge test fixture helpers so both font tests
  and misc package gates run against the real subject. Keep chemistry's broader
  `test/*.test.mjs test/packages/*.test.mjs` manifest command. Initial stage runner
  only expanded the top-level glob; stage 05 onward expands both manifest globs.
  The stage 05 gate therefore reruns AMS/mathtools/chemistry package tests too.
- Promote the misc units dependency candidate into typed `src/packages/units.ts`
  with attribution and an explicit registration, after reading installed MathJax
  `UnitsConfiguration.ts`. This fixes five SetOptions fixtures whose captured
  configuration registers units even when their selected package list does not.
  The supplied font textmacros patch does not apply: current misc already accepts
  text-insert/textbb/textbfbb; verify its behavior with the full font fixtures
  rather than replacing the updated shim with the older patch.
