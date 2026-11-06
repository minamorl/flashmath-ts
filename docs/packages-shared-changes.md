# Shared additions from pkg-ams

- `src/ast.ts`: append `mmultiscripts`, `mprescripts`, and `none` node kinds, preserving existing numeric kinds, to represent AMS sideset; add `ams` and `cases` tag modes to the public option union.
- `src/configuration.ts`: accept `ams` / `cases` tagging only when the corresponding AMS/cases package is selected; existing base tag modes remain unchanged.
- `src/parser.ts`: preserve an explicit tag cell when automatic row numbering runs, so `\tag` does not consume an automatic number.
- `src/parser.ts`: explicitly stretch corner delimiters in `\left`/`\right`, where the operator dictionary does not supply a stretchy default.
- `src/parser.ts`: keep attributed mrows intact in internal text math, preserving reference links rather than flattening them away.
- `src/parser.ts`: add optional `Table.rowspacingBase` for AMS row spacing and optional row breaks; omitted values retain the original base 0.4em behavior.
- `src/parser.ts`: add optional `Table.explicitTags` metadata so a later `\label` resolves an already-created explicit tag; absent metadata leaves base labeling unchanged.
