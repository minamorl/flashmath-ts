# Release candidate: @minamorl/flashmath 0.1.0

## Integration

The release combines hardening `a64f03f` and native-render `5a6a8b2`, both
based on `0ba4bef`. Git merged these without textual conflicts (README merged
automatically). The shared bundled ESM runtime, deferred package loading,
configuration cache, native MathML Core/CSS transformations, and scoped package
metadata are retained. The integration exposed missing `dist/output.js` and
`dist/native-variants.js` entries required by native tests; both now participate
in the shared ESM build, preserving shared runtime identity. Existing native evidence predates this integration;
`node bench/release/verify.mjs` will regenerate release evidence.

The checkout's original Git metadata is read-only in this sandbox. Commits use
`.release-git/`, a private local Git directory excluded from commits and npm
artifacts. Delivery is a bundle in `bench/release/`; no push or publish is run.

## Review checkpoints

No review broker is available for this run. The root verifier should review the
oracle comparison and accepted-difference gate before trusting expensive runs,
the exact tarball contents before external delivery, and the final raw results,
screenshots and bundle before accepting this candidate.

## Compatibility corrections

- The integrated source already recognizes sequent commands; the reported
  undefined Axiom does not reproduce in the release build. Fixed unary sequent
  alignment to match MathJax's pairwise zero-space semantics and preserved
  renewed fCenter content. `bench/release/bussproofs.mjs` extracts every active
  upstream mapping (33 commands) and compares 41 non-fixture inputs in isolated
  MathJax output-jax processes. Commented-out double/dotted line commands are
  not supported by MathJax 4.1.3 either.
- Native calligraphic/script capitals use distinct original NewCM font faces.
  Consumers load the exported fonts.css; no renderer dependency is added.
  Font provenance/hashes ship with the four unmodified WOFF2 files.
- Left equation environments now preserve side and tag indentation. Strict
  reference comparison rejects every unexpected difference; there are no
  accepted structural differences for the 202-formula native corpus.
- The historical pre-hardening snapshot remains intact; its regression test
  spells out the boxed-wrapper, noLine and left-equation corrections.
- The benchmark now spreads texOptions into MathJax's TeX constructor instead
  of passing an ignored nested texOptions property. Regenerated results use
  the same tags configuration in every engine and supersede older timings.

## Finish corrections

Explicit equation tags now use the AMS environment handler even when tagformat
is enabled, without an extra numbered outer row. Unterminated script groups
report MathJax's error without changing sqrt/bbox error handling. Nested text
math and macro arguments share token spans and brace indexes; tests record
400/1600 timing slopes and copied-token counts. Chemistry now batches child
calculations on an explicit work stack. With mhchem active, default depth is
bounded by the token budget; an explicit maxDepth limits both work and parser
stacks. Tests cover default depth 2000 and raised limits at depth 5000.

Native mixed bonds use CSS stroke coordinates; asymmetric harpoons have separate
shaft lengths and allocated neighbour spacing. noLine tables use the same native
layout as ruled inference tables, and proof labels reserve their actual width.
React property names are translated; empty href is omitted on the React path.
SSR/client warnings and hydration errors are checked, with no HTML injection.
README documentation/benchmark links use full GitHub URLs for npm consumers.

## Visible decisions and limits

Native output selects the NewCM faces through inline CSS. Without fonts.css,
calligraphic/script fallback is not guaranteed distinct. Native output uses
browser MathML Core plus CSS; spacing, oldstyle digits, Greek fallback, other
font designs and stroke rasterization are not pixel-identical to MathJax SVG.
See native-render.md for feature-specific limits. No general SVG renderer,
browser layout timing, or universal fastest-parser claim is made.

## Reproduction

Run `node bench/release/verify.mjs` with dependencies installed from the frozen
lockfile, local Chromium available at /usr/bin/google-chrome, and TMPDIR set.
The command regenerates build/tests, harness and full conformance, the 971-input
independent corpus, the 41-probe bussproofs audit, the 202-formula Chromium run,
796 native checks, cold/warm benchmarks and the isolated tarball consumer.
The tarball smoke test first imports core with React absent, then links the
locked React 19.2.4 peers and exercises the exported React entry and SSR.
The original package fixtures/normalizer and pnpm lockfile are not rewritten.

Benchmark input strings and accepted Temml cohorts are retained. Both reused
flashmath sessions and MathJax documents are recreated on Declare*, newcommand
or newenvironment inputs so repeated declarations never measure error output;
the recreation cost is inside the measurement. Otherwise they retain document
state. ignoreDuplicateLabels is explicitly true in both engines. Every warm
worker validates outputs before and after warmup. This replaces earlier
measurements with ignored nested MathJax options and repeated-definition errors.
Timing ranks are reported as observations, not enforced as correctness gates.

## Final measured outcome

Generated at 2026-11-07T02:22:24.636Z (UTC report generation time).
The full benchmark measured stateless p50 below MathJax in 36/36
full groups and below Temml in 22/22 identical-input cohorts.
Remaining Temml losses: none in this run.
See [performance investigation](performance-finish.md) for measured costs,
before/after samples and the remaining limits. The source fingerprint and exact
commands/exits are recorded in ../bench/release/checks.json. Candidate sizes,
integrity and the actual archive listing are in ../bench/release/pack.json and
tarball-files.txt. No push, publication or external delivery is performed.
