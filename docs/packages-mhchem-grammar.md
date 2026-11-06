# mhchem grammar audit

The pinned primary source is `mhchemparser@4.2.1/src/mhchemParser.ts`, as used
by MathJax 4.1.3 `MhchemConfiguration.ts`. This revision retains its declarative
state transitions rather than approximating the main grammar with Start/Body.

`bench/flashmath/generate-mhchem-grammar.mjs` extracts **only** those declarations
from the installed pinned upstream module. It never evaluates `toTex`, processes
fixture expressions, captures expected MathML or generates input-specific answers.
The resulting `src/packages/mhchem-grammar.ts` uses numeric pattern/action/state
IDs, deduplicates identical rules and resolves wildcard fallback states.
`--check` reconstructs the declarations and compares the complete artifact.

| Primary machine | Purpose | Resolved states | Rules |
| --- | --- | ---: | ---: |
| tex | Explicit chemical/unit commands in TeX | 1 | 4 |
| ce | Chemical entities, script order, arrows and labels | 23 | 162 |
| a | Coefficients, fractions and tight embedded math | 3 | 6 |
| o | Upright chemical body, text and TeX escapes | 3 | 12 |
| text | Text accumulation and embedded controls/math | 1 | 10 |
| pq | Leading/trailing lower scripts, formulas, defect indices | 4 | 22 |
| bd | Leading/trailing upper scripts, radicals and charges | 4 | 21 |
| oxidation | Signed Roman oxidation numbers and ±0 | 1 | 3 |
| tex-math | Embedded math with chemical/unit commands | 1 | 9 |
| tex-math tight | Coefficient math with tight signs | 1 | 11 |
| 9,9 | Chemical decimal separators | 1 | 3 |
| pu | Numeric values, uncertainties, exponents and divisions | 6 | 17 |
| pu-2 | Upright unit products and explicit/implicit powers | 3 | 10 |
| pu-9,9 | Integer and fractional digit grouping | 3 | 5 |

Counts include wildcard entries and terminal states that inherit wildcard rules.
They are a declaration audit, not a claim that a test executes unreachable states.
All original `ce` names are retained: `0`, `1`, `2`, `3`, `*`, `r`, `rd`, `as`,
`a`, `o`, `d`, `D`, `q`, `qd`, `qD`, `dq`, `b`, `p`, `bp`, `rt`, `rdt`, `rdq`,
`c0`. In particular, `d` vs `D` and `qd`/`qD`/`dq` preserve the distinction
between a braced/unbraced upper script, a charge, an oxidation number, and the
order of lower/upper scripts. Arrow states retain C/M/T label-mode transitions.

The handwritten `src/packages/mhchem-machine.ts` implements every pattern ID
with character-code predicates and integer `switch` dispatch. It recognizes
numbers, signed amounts, group and math spans, Greek identifiers, generic TeX
controls with zero/one/two grouped arguments, arrows, C/M/T labels, state of
matter, bonds, orbital notation, color/brace/over/under commands, operators,
unit products/divisions and scientific/uncertainty notation.

Recognizers and buffers hold source spans. A command or script word is compared
through indexes; no input `substring`, suffix `slice`, regexp lexer or parser
source rewrite is used. Adjacent spans coalesce, so accumulating a long math
escape does not build a growing list of individual characters. Characters become
strings only in TeX emission. The engine bounds nested machines and stalls.
Runtime imports neither MathJax nor mhchemParser; only the development audit tool
reads the upstream declarations.

The independent suite retains all examples, rejects duplicate/captured inputs,
requires >=150 valid MathJax expressions and >=98% agreement, and separately
requires every reported regression to match. The current corpus has 216 valid
expressions. The immutable fixture remains a separate gate.

```sh
node bench/flashmath/generate-mhchem-grammar.mjs --check
node node_modules/typescript/bin/tsc -p tsconfig.json
MHCHEM_GENERALIZATION_REPORT=bench/flashmath/pkg-chem-generalization.json npm test
```

The declarative transitions and adapted actions retain Martin Hensel's
2015–2023 copyright and Apache-2.0 attribution. Changes are the span recognizers,
numeric dispatch, buffer representation and direct expansion emitter. The license
is retained at `src/LICENSE.MathJax`.
