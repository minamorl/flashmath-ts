# @minamorl/flashmath

TeX to MathML for React. Work in progress (0.x).

## Usage

```sh
npm install @minamorl/flashmath react react-dom
```

Use the core or React entry point:

```ts
import {parseToMathMLAst, toMathMLString} from '@minamorl/flashmath';

const ast = parseToMathMLAst(String.raw`\frac{a+b}{\sqrt{x}}`, {
  display: true,
  packages: ['base', 'newcommand'],
});
const mathml = toMathMLString(ast);
```

For React, the separate entry point returns real MathML elements:

```tsx
import {parseToReact} from '@minamorl/flashmath/react';

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
import {createMathMLParser, toMathMLString} from '@minamorl/flashmath';

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

The integrated parser matches **2,635 / 2,683 captured MathJax 4.1.3 records
(98.21%)**, including **every executable fixture (2,635 / 2,635)**. The other
48 records remain marked unsupported by the original extraction harness; they
stay in the denominator. There are no executable fixture mismatches, and none
of the 2,625 distinct fixture IDs matched by earlier lanes regressed. Comparisons
include TeX classes, all semantic attributes, text and tree structure.

Registered packages now include AMS/AMScd/cases/empheq, mathtools,
physics/braket/cancel/bbox/enclose/centernot, mhchem/extpfeil, the font/color/HTML
packages, and textmacros/bussproofs/configmacros/begingroup/setoptions/
require/autoload/error handlers. `units` is also integrated. Packages are enabled
explicitly through `packages`; registering a module alone does not activate it.
Unknown packages/modules/options still raise `UnsupportedFeatureError`.

This is measured fixture coverage, not a claim of universal MathJax compatibility.
The retained unsupported records include custom package registration and the
component typesetting pipeline. `mode: 'render'` is limited to selected texhtml
input, and `mode: 'output'` to selected bussproofs MathML geometry; this package
does not implement a general MathJax SVG renderer. See
[the integration report](docs/integration.md) for every package's counts, merge
resolutions, all unsupported IDs, independent probes and remaining boundaries.

Browser output defaults to `output: 'native'`: mhchem font slots become Unicode
and native MathML isotope scripts. Use `output: 'mathjax'` in parsing and
serialization options to retain MathJax font codes for strict oracle comparison.
The conformance adapter selects that mode explicitly. React SSR exercises all
2,635 executable fixtures and compares the same structure, allowing only CSS
declaration whitespace differences introduced by React.

```sh
pnpm run build
pnpm test
pnpm run conformance
node conformance/runner.mjs --subject bench/flashmath/adapter.mjs \
  --output bench/flashmath/full-conformance.json --fresh
pnpm run bench -- --samples 7 --iterations 100
```

The scoped conformance command gates base and newcommand separately at 95%.
The full harness exits 1 because it retains the 48 upstream unsupported
records. Current integration results are in `bench/integration/07-fixes.json`;
`node bench/integration/final-gate.mjs` rebuilds, tests and verifies the full
corpus and lane regression gate. `bench/flashmath/REPORT.md` describes the
earlier core-only measurements. Earlier results that discarded texclass are withdrawn and are not
current compatibility evidence.

The benchmark uses the same independent inputs for MathJax 4.1.3, Temml 0.14.0
and flashmath, records cold/warm samples, and saves raw timings with nearest-rank
p50/p95 in `bench/flashmath/benchmark.json`. Its machine/corpus results do not
establish a universal speed ranking.

Add a package in `src/packages/<name>.ts` and one registration line; see
[docs/packages.md](docs/packages.md) for the handler contract and validation.
Generated symbol/operator data is attributed in `src/ATTRIBUTION.MathJax` and
licensed under `src/LICENSE.MathJax`. Runtime code imports neither MathJax nor
Temml. Regenerate the base symbol tables using the pinned MathJax dependency:
`node bench/flashmath/generate-symbols.mjs`.
