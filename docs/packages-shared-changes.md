# pkg-chem shared changes

- `src/ast.ts`: add `OutputOptions.output: 'native' | 'mathjax'` and extend `ParseOptions`; native is the public default because MathJax's chemistry PUA cannot use browser fonts.
- `src/output.ts`: implement a non-mutating, explicit-stack MathML output conversion; translate only known mhchem PUA glyphs and MathJax extensible-arrow label padding, preserving unrelated nodes and attributes.
- `src/parser.ts`: apply output conversion at the session parse boundary, and allow an output override per session call; tokenization and the parsing loop are unchanged.
- `src/configuration.ts`: reject invalid output values before parsing, matching validation in standalone serializers/renderers.
- `src/serialize.ts`: add an optional output argument and use the same conversion as the AST boundary; `mathjax` preserves the supplied AST codes.
- `src/react.ts`: forward output through `parseToReact` and `mathMLAstToReact`; the existing React element creation and escaping remain unchanged.
- `src/index.ts`: export the new `OutputOptions` type.
- `bench/flashmath/adapter.mjs`: request `output: 'mathjax'` for both parsing and serialization, so the immutable harness retains exact MathJax codepoint comparisons.
- `package.json`: add `test/packages/*.test.mjs` to `npm test`, including package tests from other lanes; no dependency or lockfile change.

The initial lane's two registry additions remain unchanged. No edit to `src/scanner.ts`, `src/packages/base.ts`, `src/symbols.ts`, `src/packages/types.ts` or `conformance/` was needed. Source-byte changes and reasons for other lanes belong in their own entries rather than replacing these.
