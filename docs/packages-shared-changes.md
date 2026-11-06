# Shared changes: pkg-misc

These are the pkg-misc lane's shared changes against d3daf90. Other lanes must retain their own package registration lines and shared changes when integrating.

- `src/packages/types.ts`: add selected package entries, initialization, undefined-command fallback, and error-format hooks; packages can retain session state and customize diagnostics without hardcoded package switches in the parse loop.
- `src/packages/registry.ts`: retain selected package definitions and original numeric priorities in resolved configurations; add only this lane's registration lines, including the synchronous harness `retry` shim.
- `src/configuration.ts`: copy the top-level TeX options object before mutation, permit configmacros argument templates, and allow the harness's MathML `output` mode only with bussproofs for proof geometry; generic output/render remain rejected.
- `src/parser.ts`: invoke package initialization, permit session-local configuration replacement for require/autoload, dispatch undefined-command/error-format hooks, and use a dynamically loaded error formatter on the current expression.
- `src/parser.ts`: initialize configured macro templates through the configmacros token compiler and dispatch configured active characters before ordinary character handling.
- `src/parser.ts`: retain current command names across multi-argument handlers, and diagnose missing/invalid argument, delimiter, script, bracket, and linebreak inputs with MathJax's messages; needed by noerrors while retaining normal error trees.
- `src/parser.ts`: preserve raw cases second-column text, including braces and embedded math, and reject extra alignment tabs; repair the base cases fixture without treating its text as math.
- `src/parser.ts`: skip whitespace before deciding whether an array starts empty, avoid repeating a preamble template into overflow cells, emit generated repeated-rule padding, and add eqnarray's empty relation atom only for three-cell rows; fixes remaining base array discrepancies.
- `src/packages/base.ts`: parse root-index shifts and validate their integer/single-use requirements; diagnose misplaced root shifts, invalid MathML tokens/attributes, nested equation structures, missing boxes/dimensions, and invalid environment/limit controls.
- `src/preamble.ts`: expand repeated separator tokens independently, insert MathJax's repeated-rule spacing cells/padding, balance adjacent insertion separators, and reject invalid preamble tokens; fixes remaining base array discrepancies.
- `src/scanner.ts`: retain percent characters as source-span tokens rather than deleting comments during lexical scanning; the math and text grammars now consume comments, while verb and setOptions can read literal percent characters from raw arguments. No regex lexer, whole-suffix reconstruction, or external dependency is introduced.
- `test/packages-misc.test.mjs`: import owned package tests into the existing `test/*.test.mjs` entrypoint without changing package scripts or the lockfile.

`conformance/` is unchanged. The base suite improves from 780 matched / 811 total to 790 matched / 811 total, retaining the same 21 unsupported records. Newcommand remains 58 / 58. See `docs/packages-pkg-misc.md` for independent-lane dependency limits and raw evidence locations.
