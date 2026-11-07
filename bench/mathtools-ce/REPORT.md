# mathtools chemistry alignment

Code-first, no spec. Base: `b32bffdd824dd9e9964e601843732b194ff386f2`.
No review broker, agents, push, npm publish or external delivery.

## Cause and decisions

mathtools overrides AMS alignment environments. Its private alignment callback
still examined only the first cell node, bypassing the shared `fixInitialMO`
introduced in `47238f9`. Chemistry emits an empty ORD atom before its REL
arrow, so the callback failed to prepend the empty `mi` required by MathJax.
`before.log` records the original comparison failures, including the requested
single-row/two-row aligned and align expressions.

Primary source read: installed MathJax 4.1.3 `ParseUtil.fixInitialMO`,
`base/BaseItems.ts` (`EqnArrayItem.EndEntry`),
`mathtools/MathtoolsMappings.ts`, `mathtools/MathtoolsMethods.ts` (Cases),
and `textmacros/TextMacrosConfiguration.ts`.

Visible changes:

- Use the shared initial-operator correction for mathtools left alignment cells.
  Preserve existing empty atoms and explicit spacing boundaries.
- Apply that correction to subsequent centered/left gathered cells; right
  gathered cells and first cells keep upstream prefix behavior.
- Preserve the implicit center alignment and single `middle` break-align
  attribute for multi-column AMS gather/gathered tables.
- Consume the mandatory column-pair argument for mathtools `alignedat`, which
  previously leaked into the first cell as a visible number.
- Retain the text-column `mstyle` in starred cases when textmacros is active.
- Add six corrected expressions to the interactive native-render comparison
  page as the `mathtools-ce` group.

No public interface, dependency, manifest, lockfile or workflow changes.

## Comparison coverage and phase gate

`test/packages/mhchem-alignment.test.mjs` compares 128 common expressions across
18 configurations: base+ams+mhchem, each additional package from the existing
19-package CROSS set independently, and the complete CROSS set. Both
mathtools-enabled configurations also compare 54 additional expressions:
182 distinct expressions and 2,412 strict MathML comparisons overall.

The 19 packages are the same ordered set as `bench/hardening/inputs.mjs`:
base, ams, newcommand, mathtools, boldsymbol, physics, mhchem, color, bbox,
enclose, cancel, html, unicode, dsfont, bbm, upgreek, gensymb, textmacros,
colortbl. Both subject and installed 4.1.3 oracle receive the same options.
The existing strict comparator retains texclass and attributes and ignores
only source annotations. Every oracle conversion must be free of merror.

Coverage includes aligned, align/align*, alignat/alignat*, alignedat, gathered,
split, multlined, lgathered/rgathered, all mathtools matrix/cases variants,
crampedsubarray and spreadlines. Starred cases use a text second column and
nested chemical alignment in the math column. multlined also nests aligned:
raw alignment tabs are invalid in its single-column rows.

Test development initially generated invalid multlined multi-column input and
starred cases with math commands in text columns. Oracle error guards rejected
these inputs; they were replaced with valid nested alignments before acceptance.
The enlarged comparison also exposed the gathered, alignedat and textmacros
boundary issues above; their actual MathJax output was inspected before fixing.

Commands and raw output:

- `node scripts/build.mjs`: exit 0, `build.log`.
- `node --test --test-reporter=tap test/packages/mhchem-alignment.test.mjs test/packages/mathtools.test.mjs test/packages/ams.test.mjs test/edge-compatibility.test.mjs`:
  exit 0, `targeted.log` (31 tests, no failures).
- `node --test --test-reporter=tap test/packages/mhchem-alignment.test.mjs`:
  exit 0, `combinations.log`.

Disabled-review checkpoint before costly verification: inspect shared
initial-operator traversal, unchanged spacing controls, valid oracle inputs,
full 19-package membership and exact per-package comparison coverage.

## Delivery

The original Git metadata is outside the assigned write scope. Phase commits
use the ignored `.release-git` directory inside this worktree. The final bundle
is a separate delivery artifact; neither Git metadata nor the bundle belongs
in the commits or npm tarball.
