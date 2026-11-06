# pkg-chem: mhchem and extpfeil

Code-first lane against base commit `d3daf908c06960d4a04c95ededa6aed371c71d49`.
The immutable MathJax 4.1.3 fixtures are the conformance contract for this lane.

## Result

| Fixture group | Before | After |
| --- | ---: | ---: |
| mhchem | 0/112 | 112/112 |
| extpfeil | 0/6 | 6/6 |
| base | 780/811 | 780/811 |
| newcommand | 58/58 | 58/58 |

No previously matched row in the full fixture set regressed. These are fixture
**group** counts; package membership counts overlap and have different denominators.
All attributes, including `data-mjx-texclass`, are compared by the existing harness.
The full harness still exits 1 because other packages and known base cases remain
unimplemented. All failing and unsupported rows remain in its report.

## Changes and decisions

- `src/packages/extpfeil.ts` implements the five built-in arrows and
  `\Newextarrow`, including above/below padding, the NONE/REL atom boundary,
  script style, validation errors and definitions owned by the parser session.
  Its `xArrow` helper also serves mhchem; importing it does not activate extpfeil.
- `src/packages/mhchem.ts` adds `\ce`, `\pu`, chemistry arrows and bond glyphs.
  A handwritten cursor scanner recognizes elements, coefficients, isotope
  prescripts, charges, scripts, states of matter, bonds, reaction labels,
  math escapes and unit expressions. It pushes expansion tokens onto the host
  parser's explicit stack without rewriting the unconsumed source.
- Chemical layout helpers preserve inferred children in empty/multi-node
  phantom/smash boxes, chemical atom boundaries and text-style fractions.
  They are package-local commands (`flashmathChem*`), avoiding changes to base
  layout behavior. `flashmathExtArrow` carries session-defined arrow parameters.
- The mhchem-selected `rightleftharpoons` definition preserves MathJax's
  alternate glyph attribute. Chemical PUA operators preserve the `-mhchem`
  variant and explicit texclass.
- `src/packages/registry.ts` contains only this lane's two added registration
  lines. No parser, scanner, AST, serializer, symbol, base or package-type source
  changed. There are no new dependencies or lockfile changes. `conformance/`
  was not edited.

## Sources read

Primary sources are the pinned local MathJax 4.1.3 source tree:

- `ts/input/tex/extpfeil/ExtpfeilConfiguration.ts`
- `ts/input/tex/ams/AmsMethods.ts`, `xArrow`
- `ts/input/tex/mhchem/MhchemConfiguration.ts`
- `ts/input/tex/base/BaseMethods.ts`
- Installed `mhchemparser@4.2.1/src/mhchemParser.ts`, the version used by
  MathJax 4.1.3, for chemistry grammar and TeX layout semantics.

MathJax and mhchemParser sources are Apache-2.0 (MathJax Consortium,
copyright 2018–2026; Martin Hensel, copyright 2015–2023). This lane implements
their package semantics independently and does not import either upstream
parser at runtime. The existing license is `src/LICENSE.MathJax`.

## Reproduce

```sh
node node_modules/typescript/bin/tsc -p tsconfig.json
node --test test/*.test.mjs test/packages/*.test.mjs
node conformance/runner.mjs --subject bench/flashmath/adapter.mjs \
  --output bench/flashmath/pkg-chem-conformance.json --fresh
# The full command above exits 1 for existing unrelated failures.
node bench/flashmath/pkg-chem-gate.mjs
```

The direct TypeScript CLI uses the installed compiler and the repository's
`tsconfig.json`. `pnpm run build` failed before compilation because the host's
pnpm version-management path attempted an automatic install against a read-only
SQLite store. No install was needed or performed manually.

`test/packages/mhchem.test.mjs` checks all captured mhchem fixtures, plus
independent formulas, reactions, isotopes, states, math nesting, unit expressions,
empty inputs, errors, activation and resource budgets. Non-fixture oracle cases
run in both inline and display mode. `test/packages/extpfeil.test.mjs` covers
the captured arrows plus independent context, empty and scripted labels, spacing,
definition errors and session isolation. The default `test/*.test.mjs` glob does
not include subdirectories, so the package-test glob is explicit above.

Full raw evidence is in `bench/flashmath/pkg-chem-before.json`,
`bench/flashmath/pkg-chem-conformance.json` and the adjacent command logs.
The gate checks each full-report row against fixture IDs, all formerly matched
rows, the entire assigned groups and the base/newcommand counts.

## Delivery and review boundary

The shared worktree git index lives outside the assigned write scope, so direct
`git add`/`git commit` fail with a read-only-filesystem error. Delivery uses two
commits made in a disposable local Git directory and exported to
`bench/pkg-chem.bundle`. The real worktree files remain authoritative and the
common Git metadata is untouched. A root agent with Git write access can fetch
the bundle's `lane/pkg-chem` ref and cherry-pick its two commits, or commit the
worktree files directly. No network push, merge or npm publication was attempted.

Checkpoint review requested for the root verifier (no broker in this run):

1. Before the full run: check immutable fixture selection, complete option
   forwarding and attribute normalization; no scorer or fixture was changed.
2. Before external delivery: inspect the two registration lines, package-owned
   source/tests, raw evidence and Git bundle; there was no external send.
3. Before accepting this lane: rerun the commands above and inspect chemical
   phantom/script and arrow atom output directly. Screen inspection is not
   applicable: this lane produces parser/MathML code, with no UI changes.

This result establishes the pinned fixture contract and the additional tested
examples. It is not an exhaustive certification of every upstream mhchem input
or a parser throughput measurement. Full-library publication belongs to root's
integration, and was explicitly outside this lane's authorization.
