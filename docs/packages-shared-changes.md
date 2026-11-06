# Shared additions from pkg-ams

- `src/ast.ts`: append `mmultiscripts`, `mprescripts`, and `none` node kinds, preserving existing numeric kinds, to represent AMS sideset; add `ams` and `cases` tag modes to the public option union.
- `src/configuration.ts`: accept `ams` / `cases` tagging only when the corresponding AMS/cases package is selected; existing base tag modes remain unchanged.
- `src/parser.ts`: preserve an explicit tag cell when automatic row numbering runs, so `\tag` does not consume an automatic number.
- `src/parser.ts`: explicitly stretch corner delimiters in `\left`/`\right`, where the operator dictionary does not supply a stretchy default.
- `src/parser.ts`: keep attributed mrows intact in internal text math, preserving reference links rather than flattening them away.
- `src/parser.ts`: add optional `Table.rowspacingBase` for AMS row spacing and optional row breaks; omitted values retain the original base 0.4em behavior.
- `src/parser.ts`: add optional `Table.explicitTags` metadata so a later `\label` resolves an already-created explicit tag; absent metadata leaves base labeling unchanged.
# Package lane shared additions

- pkg-mathtools: `packages/types.ts`, `packages/registry.ts`, and the parser constructor add optional package initialization, needed for session-defined paired delimiters and package options before the first input token. Defaults have no initializers.
- pkg-mathtools: `session-state.ts` adds a session-owned package data map so options, tag forms, and paired definitions survive `prior` inputs without sharing mutable state between sessions.
- pkg-mathtools: `packages/types.ts`, `packages/registry.ts`, and the parser character path add an optional character-handler map; a literal colon must differ from the existing control sequence `\:`. Existing packages supply no character handlers.
- pkg-mathtools: `ast.ts` appends `mmultiscripts`, `mprescripts`, and `none` kinds; all existing numeric kinds retain their values. The ParseOptions tag union also includes 'ams' for the conditional mathtools tag mode. Prescript assembly stays inside the package.
- pkg-mathtools: `configuration.ts` accepts `tags: 'ams'` only when the selected package advertises the mathtools option, needed by its tag-form fixture; other packages retain the existing rejection.
- pkg-mathtools: the single registry import/registration line also registers local `boldsymbol` and `bbox` dependency subsets exported from `mathtools.ts`, because the isolated fixture inputs explicitly select them. During lane integration replace these subsets with the corresponding full packages and leave only the mathtools registration; no other source file owns these commands in this lane.
