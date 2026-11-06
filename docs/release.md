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
  accepted structural differences for the 195-formula native corpus.
- The historical pre-hardening snapshot remains intact; its regression test
  spells out the boxed-wrapper, noLine and left-equation corrections.
- The benchmark now spreads texOptions into MathJax's TeX constructor instead
  of passing an ignored nested texOptions property. Regenerated results use
  the same tags configuration in every engine and supersede older timings.

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
independent corpus, the 41-probe bussproofs audit, the 195-formula Chromium run,
724 native checks, cold/warm benchmarks and the isolated tarball consumer.
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
