# Package lane shared changes

## pkg-fonts

- `src/parser.ts`: optional per-table color state; apply cell > row > column precedence at cell completion; tables without color state retain their prior behavior.
- `src/parser.ts`: dispatch explicitly registered character handlers through the existing extension map; texhtml owns `<`, and falls back to the existing character parser when disabled or not a tag.
- `src/parser.ts`: optional explicit-tag parameters on `labelCell`, optional formatted-reference flag on `reference`, and tagformat number/tag/id/url callbacks; unchanged defaults preserve base output.
- `src/parser.ts`: preserve already explicit table tags in `tagRow`; this is the same guard added independently by pkg-ams.
- `src/ast.ts`: append maction/html kinds, carry an optional structured HTML subtree, expose HTML as ordinary elements/text; existing numeric kinds retain their values within this lane.
- `src/ast.ts` and `src/configuration.ts`: accept `tags: 'ams'` only with explicitly selected AMS; pkg-ams also adds this (plus `cases`), so retain its larger union/validation on merge.
- `src/configuration.ts`: permit render mode only with explicitly selected texhtml, for its fixture's HTML-containing TeX input; unrelated render/output requests continue to reject.
- `src/serialize.ts` and `src/react.ts`: render structured `#text` leaves as escaped text; HTML element nodes use ordinary element creation, with no raw markup injection.
- `src/packages/registry.ts`: only the 15 new package registration lines; colorv2 keeps its existing line.
- `test/packages-fonts.test.mjs`: import package tests into the existing top-level test command without changing package.json or the lockfile.

Integration: merge append-only AST enum members and tag-name array entries together and rebuild every lane from source. Do not combine independently compiled numeric-enum output. The supplementary probe in `bench/pkg-fonts/integration.mjs` records sibling source SHA-256 values and a textmacros seam patch without modifying either sibling worktree.
