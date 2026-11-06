# flashmath

TeX to MathML for React. Work in progress (0.x).

## Usage

Build the workspace with `pnpm run build`, then use the package entry points
(the package is currently private and has not been published):

```ts
import {parseToMathMLAst, toMathMLString} from '@minamorl/flashmath';

const ast = parseToMathMLAst(String.raw`\frac{a+b}{\sqrt{x}}`, {display: true});
const mathml = toMathMLString(ast);
```

For React, import the React entry point. It returns a real MathML element tree,
ready to place in JSX or pass to `react-dom/server`:

```tsx
import {parseToReact} from '@minamorl/flashmath/react';

export function Formula({tex}: {tex: string}) {
  return parseToReact(tex, {display: true});
}
```

`react` and `react-dom` are peer dependencies (React 18 or newer). The core entry
point does not load React. The React path currently builds the same AST before
creating elements. Keys are deterministic integers derived from source offsets
and sibling positions. Output is escaped; it uses no `dangerouslySetInnerHTML`.

Options default to inline display, 10,000 macro expansions, 100,000 allocated
nodes, 200,000 consumed tokens, and 1,024 nested parser frames. Override these
with `display`, `maxExpansions`, `maxNodes`, `maxTokens`, and `maxDepth`.
`throwOnError: true` throws `ParseError`; otherwise malformed TeX returns an
`merror` tree. `macros` accepts a replacement string or `[replacement, arity,
optionalDefault]`; `decimalSeparator` accepts `'.'` or `','`.

This implementation targets MathJax 4.1.3's base and newcommand packages.
It supports identifiers, numbers, symbols, fractions, roots, scripts, fences,
arrays, text, styles, and token-based macro/environment definitions, including
`\def` templates and `\let`. It is not a complete implementation of all MathJax
packages. Some advanced array layouts, text/group wrappers, and adjusted roots
still differ. Full compatibility results, including failures and harness-level
unsupported records, are retained in `bench/flashmath/`.

```sh
pnpm run build
pnpm test
pnpm run conformance
node conformance/runner.mjs --subject bench/flashmath/adapter.mjs \
  --output bench/flashmath/full-conformance.json --fresh
pnpm run bench -- --samples 7 --iterations 100
```

The scoped conformance command gates each of the base and newcommand groups at
95%, with unsupported fixtures kept in the denominator. The full harness covers
many packages outside that scope and normally exits 1. The benchmark compares
MathJax 4.1.3, Temml 0.14.0, and flashmath on identical independent inputs, records
seven fresh processes per engine, and saves raw timings and nearest-rank p50/p95
in `bench/flashmath/benchmark.json`. Warm samples exclude setup and warmup; cold
samples include module import and setup through the first MathML string. These
measurements cover this corpus and machine; they do not establish a universal
speed ranking.

Generated symbol/operator data is attributed in `src/ATTRIBUTION.MathJax` and
licensed under `src/LICENSE.MathJax`. Runtime code imports neither MathJax nor
Temml. Regenerate the static decision tree with
`node bench/flashmath/generate-symbols.mjs` using the pinned MathJax dependency.
