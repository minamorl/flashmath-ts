# pkg-chem: mhchem and extpfeil

This corrective revision starts from root's imported `1f7c114` and fixes variable
charges, unit uncertainty, TeX arrow labels, label regression, isotope layout and
literal PUA preservation.

## Scanner and grammar

`src/packages/mhchem.ts` is the package boundary and layout handlers.
`src/packages/mhchem-machine.ts` implements a handwritten character-code matcher,
source-span buffers and numeric state/action dispatch. Commands and words stay
as indexes until expansion emission; there is no input substring/slice lexer.
`src/packages/mhchem-grammar.ts` retains all declarative transitions in all 14
upstream machines. The source audit and per-machine state/rule counts are in
[packages-mhchem-grammar.md](packages-mhchem-grammar.md). The development generator
extracts grammar declarations only, and `--check` verifies them against the pinned
primary source. Runtime does not import the upstream parser.

The bd/pq/formula distinctions now preserve `Fe^x+` as a variable charge while
keeping the isolated defect `X^x` as a cross. The pu machine preserves `+-`, `+/-`
and `\pm` uncertainty, decimal values and exponents. Generic grouped TeX controls
remain intact in labels, and C/M/T annotation modes, negative chemical labels and
nested chemical/unit expressions follow the original transitions.

## Independent tests and evidence

`test/packages/mhchem-generalization.test.mjs` contains 216 distinct examples,
selected by grammar feature across the scanner revisions: formulas, coefficients,
isotopes, charges, scripts, complexes, bonds, reaction labels and physical units.
It asserts that none are captured fixture inputs and none are duplicates. Every
example is evaluated by MathJax 4.1.3 and the subject; failures stay in the
denominator and their raw MathML is reported. The required gate is >=150 valid expressions and >=98% agreement.
The reported unit-power and nested-label examples are also mandatory assertions.

The before/after raw reports are:

- `bench/flashmath/pkg-chem-generalization-before.json`: historical initial 72/104 report.
- `bench/flashmath/pkg-chem-generalization.json`: current complete 216/216 report; all 216 are valid MathJax expressions.

`test/packages/mhchem-output.test.mjs` checks every captured chemistry fixture
through AST, string and React output, including non-mutation of compatibility
ASTs, explicit compatibility output, PUA elimination, label padding conversion,
all 14 chemical glyph slots, literal PUA in base/mixed/package contexts, native
isotope prescripts, variable charges, unit uncertainty, session overrides and
invalid options. The original
package tests and all existing root-level tests remain enabled by `npm test`.
The final raw test output is `bench/flashmath/pkg-chem-final-tests.log`;
`bench/flashmath/pkg-chem-grammar.log` records the source-transition audit.

Full unmodified-harness reports remain at
`bench/flashmath/pkg-chem-before.json` and
`bench/flashmath/pkg-chem-conformance.json`. The gate checks complete row IDs,
all previously matched rows and these fixture **groups**:

```text
base: 780/811 (before 780/811)
newcommand: 58/58 (before 58/58)
mhchem: 112/112 (before 0/112)
extpfeil: 6/6 (before 0/6)
previously matched rows regressed: 0
```

The full harness still exits 1 for unrelated packages and known base failures.
No fixture, oracle, normalizer or conformance-runner file was edited. The adapter
selects compatibility output explicitly.

## Public output API

```ts
parseToMathMLAst(tex, {packages: ['base', 'mhchem']}); // native by default
parseToReact(tex, {packages: ['base', 'mhchem'], output: 'native'});
const raw = parseToMathMLAst(tex, {
  packages: ['base', 'mhchem'], output: 'mathjax',
});
toMathMLString(raw, {output: 'mathjax'}); // exact MathJax glyph codes
// Standalone serialization/React conversion also default to native:
toMathMLString(raw);
mathMLAstToReact(raw, {output: 'native'});
```

`OutputOptions` is exported from the main entrypoint. Session `parse` supports an
output override. Conversion clones affected trees and never modifies a caller's
AST. `mathjax` on a serializer preserves supplied codes; to retain PUA, obtain
an AST with `output: 'mathjax'` rather than trying to reverse an already native
AST. Unrelated TeX parsing behavior and package activation remain unchanged.

## Native glyph mapping

The mapping is implemented in `src/output.ts` and applies only to nodes marked
by mhchem/extpfeil constructors. Private WeakMap provenance crosses `expose` and
never becomes a MathML attribute. Literal PUA in base or mixed formulas is
preserved, even when a chemical package is selected. An externally JSON-rebuilt
AST has no constructor provenance and is not remapped merely by its codepoint. Native glyph metrics follow the browser's math font rather
than MathJax's private font designs.

| MathJax PUA | Chemical command / meaning | Native representation |
| --- | --- | --- |
| U+E408 | `mhchemlongrightleftharpoons` | U+21CC `⇌` |
| U+E409 | `mhchemlongRightleftharpoons` | `munder(⇀, ↽ at 70%)`, `accentunder=true` |
| U+E40A | `mhchemlongLeftrightharpoons` | `mover(↽, ⇀ at 70%)`, `accent=true` |
| U+E410 | `tripledash`, dashed bond | U+2504 `┄` |
| U+E411 | `mhchemBondTD`, solid/dashed bond | `mover(−, ┄)` |
| U+E412 | `mhchemBondTDD`, two solid / one dashed | `mover(=, ┄)` |
| U+E413 | `mhchemBondDTD`, solid/dashed/solid | `munder(mover(┄, −), −)` |
| U+E428 | long left arrow | U+27F5 `⟵` |
| U+E429 | long right arrow | U+27F6 `⟶` |
| U+E42A | long bidirectional arrow | U+27F7 `⟷` |
| U+E42B | long left/right arrows | U+21C6 `⇆` |
| U+E42C | left bond arrow | U+2190 `←` |
| U+E42D | right bond arrow | U+2192 `→` |
| U+E42E | bidirectional bond arrow | U+2194 `↔` |

Native isotope prefixes use `mmultiscripts(element, mprescripts, lower, upper)`.
Only a package-marked isotope sequence is replaced. Its MathJax phantom/negative
kern/overlay sequence remains byte-for-byte compatible in mathjax output. Empty
indices use `none`; no internal enum values were renumbered.

Labeled arrows use these same mappings. Native output additionally replaces the
package-marked MathJax xArrow `mpadded` label boxes and struts with ordinary MathML rows,
allowing browser under/over layout to center labels and reserve their width.
Compatibility output preserves the complete original padding and texclasses.
This normalization also serves extpfeil labels with standard Unicode arrows.

## Chromium verification

`bench/flashmath/pkg-chem-screen.mjs` renders a local React SSR page without any
MathJax runtime or font dependency, opens it in headless Chromium and uses its
actual DevTools protocol. It reads the running browser's primary protocol schema
before issuing commands. Temporary profiles are created under `$TMPDIR` and
removed afterward; all durable output stays in this worktree.

screen_run: Chromium opened `pkg-chem-native.html`, clicked the output select,
used ArrowDown/Enter for mathjax output (15 PUA), and keyboard-selected native
output (0 generated PUA, 0 merror, 12 MathML examples). Its actual mmultiscripts
layout was measured for six prescripts: every digit-box right edge ended at the
element's left edge (gap 0). The full screenshot was opened and inspected;
235/92 precedes U without overlap, isotope reactions are legible, Fe carries x+
and the measurement shows ±. Arrows, harpoons and mixed bonds have no missing
glyph boxes, and their labels do not overlap following species.

- `bench/flashmath/pkg-chem-native.png`: final native screenshot.
- `bench/flashmath/pkg-chem-native.html`: self-contained React SSR page.
- `bench/flashmath/pkg-chem-screen.json`: browser version and DOM evidence.
- `bench/flashmath/pkg-chem-screen.log`: protocol and interaction output.

## Reproduce

```sh
node bench/flashmath/generate-mhchem-grammar.mjs --check
node node_modules/typescript/bin/tsc -p tsconfig.json
MHCHEM_GENERALIZATION_REPORT=bench/flashmath/pkg-chem-generalization.json npm test
node conformance/runner.mjs --subject bench/flashmath/adapter.mjs \
  --output bench/flashmath/pkg-chem-conformance.json --fresh
# Full conformance exits 1 for unrelated failures; then validate lane/regression:
node bench/flashmath/pkg-chem-gate.mjs
node bench/flashmath/pkg-chem-screen.mjs
```

The installed compiler is used directly because this host's pnpm auto-version
installation fails against its read-only store. No dependency installation or
lockfile change was made. New shared source edits are itemized in
`docs/packages-shared-changes.md`.

## Primary sources and delivery

Sources read locally: MathJax 4.1.3 `MhchemConfiguration.ts`,
`ExtpfeilConfiguration.ts`, `AmsMethods.xArrow`, `AmsMappings.ts`,
`BaseMethods.ts`, and the actual `ce`/`pq`/`bd`/`tex-math`/`pu` state machines in
its pinned `mhchemparser@4.2.1/src/mhchemParser.ts`. Both upstream projects are
Apache-2.0 (MathJax Consortium; Martin Hensel). The existing license is
`src/LICENSE.MathJax`. Runtime code imports neither upstream parser.

Shared Git metadata is outside the assigned write scope. The revision is
exported in `bench/pkg-chem-final.bundle` on top of root's imported `1f7c114`.
Its `lane/pkg-chem` ref contains the full state-machine fix followed by the
provenance-scoped native isotope/glyph fix. The real worktree files remain authoritative.
No push, merge, npm publication or external upload was performed.

Review checkpoints for root (broker disabled):

1. Before expensive execution: inspect the independently authored cases and
   immutable harness boundaries; all failures remain visible in reports.
2. Before external delivery: inspect shared edits, native mapping semantics,
   screenshot and the local bundle; no external send was performed.
3. Before acceptance: rerun npm test, full harness plus gate, inspect scanner
   character-code dispatch and Chromium screenshot, and compare raw MathML.

Fixture coverage and these independent examples establish the tested contract;
they do not certify every possible mhchem input or claim a throughput result.
