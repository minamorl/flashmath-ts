# @minamorl/flashmath

TeX to MathML for React. Version 0.1.0 release candidate; not yet published.

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
import '@minamorl/flashmath/fonts.css'; // Distinct MathJax calligraphic/script glyphs

export function Formula({tex}: {tex: string}) {
  return parseToReact(tex, {display: true});
}
```

`react` and `react-dom` are peer dependencies (18 or newer; verification used
19.2.4). The core entry point does not load React. The React path builds the same
AST before creating elements. Keys are deterministic integers derived from
source offsets and sibling positions. Text and attributes are escaped; the React
path does not use `dangerouslySetInnerHTML`.

Native output includes inline CSS for enclosure strokes, boxes, equation tags,
proof rules and centered overlays, and Unicode mathematical font variants.
See [native rendering](https://github.com/minamorl/flashmath-ts/blob/main/docs/native-render.md) for the lowering rules, browser/CSS
requirements and the 202-expression MathJax SVG comparison. Use `output:
'mathjax'` during parsing and serialization to preserve upstream MathML instead.

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
parser frames. The depth limit applies with every package configuration.
Chemistry actions use an explicit stack within the remaining depth budget;
an explicit `maxDepth` raises or lowers both limits.
Override these with `display`, `packages`, `maxExpansions`,
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
[the integration report](https://github.com/minamorl/flashmath-ts/blob/main/docs/integration.md) for every package's counts, merge
resolutions, all unsupported IDs, independent probes and remaining boundaries.

For native rendering, import `@minamorl/flashmath/fonts.css` in your browser
bundle (or serve its exported CSS and adjacent font files). This loads four
small New Computer Modern faces for `\mathcal`, `\mathscr` and their bold
variants. Core parsing and React SSR do not load CSS or fonts on the server.
Without the stylesheet, calligraphic/script fallback can collapse to the same
glyphs. Other alphabets, oldstyle digits, Greek fallback, operator spacing,
stroke widths and proof gaps remain browser/font-dependent. Native output has
been exercised in Chromium 153 on Linux; no Firefox/Safari claim is made.
It is not pixel-identical to MathJax SVG. See [native details](https://github.com/minamorl/flashmath-ts/blob/main/docs/native-render.md).

Browser output defaults to `output: 'native'`: mhchem font slots become Unicode
CSS bond/harpoon geometry and native MathML isotope scripts. Use `output: 'mathjax'` in parsing and
serialization options to retain MathJax font codes for strict oracle comparison.
The conformance adapter selects that mode explicitly. React SSR exercises all
2,635 executable fixtures and compares the same structure, allowing only CSS
declaration whitespace, shared font-property spellings, and omission of empty
React href properties. React SSR for all fixtures and Chromium client rendering
of 2,638 cases emit no console.error warnings; 202 comparisons also hydrate
without recoverable errors.

Regenerate the local release candidate and all evidence with one command:

```sh
node bench/release/verify.mjs
# or: npm run verify:release
```

This builds the ESM runtime and declarations, runs all tests (including React
SSR for every executable fixture), harness/scoped/full conformance, the
independent corpus, the full bussproofs command audit, 202 Chromium comparisons
with 796 feature/geometry checks and zero strict MathML differences, benchmarks,
and an isolated consumer smoke test of the actual `npm pack` tarball. Nothing
is published or pushed. Raw checks, exit codes, tarball list and sizes are in
`bench/release/`; benchmark inputs and samples remain in `bench/hardening/` and
`bench/flashmath/`. The full upstream harness deliberately exits 1 for its 48
unsupported records; the release gate checks exact 2,635/0/48 counts and every
baseline fixture ID/status before accepting that exit.

The separate `npm run conformance` gates base/newcommand at 95%; the release
requires every executable fixture to match. See [release notes](https://github.com/minamorl/flashmath-ts/blob/main/docs/release.md)
for integration decisions and [conformance details](https://github.com/minamorl/flashmath-ts/blob/main/docs/conformance.md).

<!-- release-benchmark -->

## Measured parser throughput

AMD Ryzen 5 3600 6-Core Processor; linux/x64; Node v26.12.1.
MathJax 4.1.3 / Temml 0.14.0. TeX → serialized MathML only; this excludes browser
layout and React SSR. Warm: 5 fresh processes × 7 samples, 100 warmup corpus
passes, 20 timed passes/sample. Values below are nearest-rank p50 µs/expression.
Where Temml accepts fewer inputs, **every column uses that same accepted subset**.
A reused flashmath session and a reused MathJax document reset on declaration
inputs (Declare*, newcommand, newenvironment), with setup cost included;
otherwise document state persists. Both set ignoreDuplicateLabels=true.

| Corpus | Common inputs | Stateless | Session | MathJax | Temml |
| --- | ---: | ---: | ---: | ---: | ---: |
| bench12 | 12/12 | 11.57 | 10.45 | 216.66 | 19.29 |
| base | 10/10 | 25.46 | 23.34 | 410.18 | 39.61 |
| newcommand | 6/10 | 9.50 | 8.64 | 148.70 | 16.84 |
| ams | 10/10 | 30.72 | 29.01 | 380.30 | 50.64 |
| mathtools | 6/10 | 27.75 | 24.62 | 402.29 | 41.66 |
| physics | 9/10 | 34.14 | 33.70 | 484.51 | 71.48 |
| mhchem | 10/10 | 94.81 | 90.34 | 816.13 | 108.10 |

Across the full corpus, stateless flashmath had lower p50 than MathJax in
36/36 groups and Temml in
22/22 comparable cohorts.
Bussproofs has no timed cohort; compatibility is checked separately.
These are machine/corpus results and do not establish a universal speed ranking.

Cold import + setup → first serialized expression, 9 fresh processes per engine,
p50 / p95 milliseconds (excludes Node process bootstrap):

| Stateless | Session | MathJax | Temml |
| ---: | ---: | ---: | ---: |
| 27.17 / 29.05 | 27.31 / 28.97 | 69.05 / 70.46 | 20.66 / 21.80 |

[Full cohorts, p50/p95 and method](https://github.com/minamorl/flashmath-ts/blob/main/bench/flashmath/hardening-benchmark.md) ·
[raw samples](https://github.com/minamorl/flashmath-ts/blob/main/bench/flashmath/hardening-benchmark.raw.json). Earlier hardening
numbers are superseded because MathJax tag options and replayed declarations
were not handled consistently.

Temml remains faster on these identical-input cohorts: none in this run. The goal of winning every cohort is met on this measured corpus only.

<!-- /release-benchmark -->

Add a package in `src/packages/<name>.ts` and one registration line; see
[docs/packages.md](https://github.com/minamorl/flashmath-ts/blob/main/docs/packages.md) for the handler contract and validation.
Generated symbol/operator data is attributed in `src/ATTRIBUTION.MathJax` and
licensed under `src/LICENSE.MathJax`. Runtime code imports neither MathJax nor
Temml. Regenerate the base symbol tables using the pinned MathJax dependency:
`node bench/flashmath/generate-symbols.mjs`.
