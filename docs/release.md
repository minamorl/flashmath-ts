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
