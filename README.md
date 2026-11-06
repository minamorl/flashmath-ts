# flashmath

TeX to MathML for React. Work in progress (0.x).

## Usage

Build the workspace with `pnpm install --frozen-lockfile` and `pnpm run build`,
then use the package entry points. The package remains private and unpublished.

```ts
import {parseToMathMLAst, toMathMLString} from '@rainpulse/flashmath';

const ast = parseToMathMLAst(String.raw`\frac{a+b}{\sqrt{x}}`, {
  display: true,
  packages: ['base', 'newcommand'],
});
const mathml = toMathMLString(ast);
```

For React, the separate entry point returns real MathML elements:

```tsx
import {parseToReact} from '@rainpulse/flashmath/react';

export function Formula({tex}: {tex: string}) {
  return parseToReact(tex, {display: true});
}
```

`react` and `react-dom` are peer dependencies (18 or newer; verification used
19.2.4). The core entry point does not load React. The React path builds the same
AST before creating elements. Keys are deterministic integers derived from
source offsets and sibling positions. Text and attributes are escaped; the React
path does not use `dangerouslySetInnerHTML`.

For multiple expressions in one document, use a session so macros, labels and
equation counters carry forward:

```ts
import {createMathMLParser, toMathMLString} from '@rainpulse/flashmath';

const document = createMathMLParser({display: true, tags: 'all'});
document.parse(String.raw`x=1\label{value}`);
const reference = toMathMLString(document.parse(String.raw`\ref{value}`));
// The reference contains text "1" and href="#mjx-eqn%3Avalue".
```

Independent `parseToMathMLAst` calls use independent state. A reference to a
label whose equation has not finished still uses MathJax's unresolved `???`
value; references to completed equations use their actual tag and URL.

Defaults are inline display, packages `['base', 'newcommand']`, 10,000 macro
expansions, 100,000 allocated nodes, 200,000 consumed tokens, and 1,024 nested
parser frames. Override these with `display`, `packages`, `maxExpansions`,
`maxNodes`, `maxTokens`, and `maxDepth`. `throwOnError: true` throws `ParseError`;
otherwise malformed TeX produces an `merror` tree. `macros` accepts a replacement
string or `[replacement, arity, optionalDefault]`. `decimalSeparator` accepts
`'.'` or `','`; `numberPattern` accepts a RegExp/string and `identifierPattern`
accepts a RegExp. MathJax's supported configuration aliases are also accepted
under `texOptions`, including `digits`, `macros`, and the implemented tag options.

The target is MathJax 4.1.3's base and newcommand fixture groups. The implementation
covers core identifiers, numbers, symbols, fractions, roots, scripts, fences,
arrays, text, styles, macro definitions and user environments. The current
conformance output compares **texclass, attributes, text and tree structure**;
unsupported fixtures remain in the denominator. It is not complete MathJax
package coverage. Adjusted roots and some advanced array/text layouts still
differ. The registered `ams` and `colorv2` modules are explicitly limited subsets,
as listed in [the package guide](docs/packages.md). Other packages, unknown
registration modules/options, and unimplemented `render`/`output` modes raise
`UnsupportedFeatureError` rather than being silently ignored.

```sh
pnpm run build
pnpm test
pnpm run conformance
node conformance/runner.mjs --subject bench/flashmath/adapter.mjs \
  --output bench/flashmath/full-conformance.json --fresh
pnpm run bench -- --samples 7 --iterations 100
```

The scoped conformance command gates base and newcommand separately at 95%.
The full harness includes other packages and normally exits 1. Current raw
results and limitations are in `bench/flashmath/REPORT.md` and its linked JSON
and logs. Earlier results that discarded texclass are withdrawn and are not
current compatibility evidence.

The benchmark uses the same independent inputs for MathJax 4.1.3, Temml 0.14.0
and flashmath, records cold/warm samples, and saves raw timings with nearest-rank
p50/p95 in `bench/flashmath/benchmark.json`. Its machine/corpus results do not
establish a universal speed ranking.

Add a package in `src/packages/<name>.ts` and one registration line; see
[docs/packages.md](docs/packages.md) for the handler contract and validation.
Generated symbol/operator data is attributed in `src/ATTRIBUTION.MathJax` and
licensed under `src/LICENSE.MathJax`. Runtime code imports neither MathJax nor
Temml. Regenerate the base decision tree using the pinned MathJax dependency:
`node bench/flashmath/generate-symbols.mjs`.
