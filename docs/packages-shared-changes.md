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
# pkg-physics の共有変更（baseline d3daf90 から）

- `src/parser.ts` constructor / run: TexCommand の `type: character` と数値の文字 code を使う handler chain。解決済み extension table の逆順が優先順で、`false` は後続 handler へ渡す。各 package は衝突しない登録名を使う。literal token の判定で追加の slice を作らない。
- `src/packages/types.ts`: CommandHandler の返り値に boolean を追加。character handler だけが false で辞退する。既存の void handler は handled として扱う。
- `src/parser.ts` node / frame: optional tokenTransform を frame に継承し、token 生成時に適用する。physics の vector font は明示 font scope を尊重する。通常の base parse には callback を設置しない。
- `src/parser.ts` frame / run: optional missingMessage が自動括弧の終端エラーを表す。argumentScope は braket bar が別解析の引数へ越境しないための境界。
- `src/parser.ts` argument / args / tokensArgument: optional command name を受け、package の不足引数エラーにコマンド名を含める。既存呼出しの名前省略時の経路は維持する。
- `src/ast.ts` Node.inferred と `src/parser.ts` row: 内部の inferred sequence と明示 mrow を区別する。package の enclosure / bbox / emit と `src/packages/base.ts` sqrt は inferred row だけを展開し、明示の自動括弧 mrow を保持する。MathMLNode / expose の公開データにはこの flag を出さない。
- `src/ast.ts` Node.scriptBoundary と `src/parser.ts` script: cancelto が生成した msup を後続 scripts の単一の基底として扱う。通常の TeX scripts は従来どおり既存 sub/sup へ合成する。公開 AST と serializer に内部 flag は出さない。
- `src/parser.ts` functionArgument / finish: physics の op=2 で fraction / operator 引数への関数適用を判定する。space と BIN / REL / CLOSE / PUNCT への挿入を抑え、既存 op=1 の経路は維持する。
- `src/react.ts`: AST の CSS 文字列を React が要求する style object に変換する。quote / parenthesis 内の区切りを保護し、hyphenated property / vendor prefix / custom property を処理する。HTML の挿入は使わない。
- `test/ssr-fixtures.test.mjs`: 全 fixture を走査し、対応済み package で解析できる全行の SSR を文字列出力と照合する。UnsupportedFeatureError による未対応契約だけを区別して件数を出し、その他の例外は検査を失敗させる。
- `src/packages/registry.ts`: 六つの import / registration 行の追加だけ。scanner / serializer / symbols / conformance / lockfile は変更していない。
# pkg-chem shared changes

- `src/ast.ts`: add `OutputOptions.output: 'native' | 'mathjax'` and extend `ParseOptions`; native is the public default because MathJax's chemistry PUA cannot use browser fonts.
- `src/output.ts`: implement a non-mutating, explicit-stack MathML output conversion; translate only known mhchem PUA glyphs and MathJax extensible-arrow label padding, preserving unrelated nodes and attributes.
- `src/parser.ts`: apply output conversion at the session parse boundary, and allow an output override per session call; tokenization and the parsing loop are unchanged.
- `src/configuration.ts`: reject invalid output values before parsing, matching validation in standalone serializers/renderers.
- `src/serialize.ts`: add an optional output argument and use the same conversion as the AST boundary; `mathjax` preserves the supplied AST codes.
- `src/react.ts`: forward output through `parseToReact` and `mathMLAstToReact`; the existing React element creation and escaping remain unchanged.
- `src/index.ts`: export the new `OutputOptions` type.
- `bench/flashmath/adapter.mjs`: request `output: 'mathjax'` for both parsing and serialization, so the immutable harness retains exact MathJax codepoint comparisons.
- `package.json`: add `test/packages/*.test.mjs` to `npm test`, including package tests from other lanes; no dependency or lockfile change.

The initial lane's two registry additions remain unchanged. No edit to `src/scanner.ts`, `src/packages/base.ts`, `src/symbols.ts`, `src/packages/types.ts` or `conformance/` was needed. Source-byte changes and reasons for other lanes belong in their own entries rather than replacing these.

## Corrective revision after 1f7c114

- `src/package-mark.ts`: add private WeakMap provenance for package-created glyphs, arrow labels and isotope prefixes; selecting a package or typing a matching PUA does not create this provenance.
- `src/ast.ts`: copy private provenance while exposing internal nodes, and add public native-output kinds `mmultiscripts`, `mprescripts`, `none`; internal K enum values and parsing behavior are unchanged.
- `src/output.ts`: gate glyph/label conversion on constructor provenance, preserve literal PUA, and replace only a marked isotope prefix plus its element with standard MathML prescripts that Chromium can lay out without overlays.
- `src/packages/extpfeil.ts`: mark the arrow and label nodes at their constructors, without changing serialized compatibility output or command behavior.
