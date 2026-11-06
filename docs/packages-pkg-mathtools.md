# pkg-mathtools

MathJax 4.1.3 の mathtools fixture 196 件を、既存 conformance runner と既存 normalizer のまま全件一致させる実装。

## 実装と判断

- `src/packages/mathtools.ts` が package 本体。math/text lap、cramped styles、math boxes、adjustlimits、17 種の extensible arrow、brackets、matrix/smallmatrix/cases 系、multlined/spreadlines/gathered、paired delimiters、boxed alignments、colon relations、prescript、split fraction、strut、tag forms と設定を実装した。
- `mathtools` を明示選択したときだけ有効。既定の base/newcommand の命令・環境は変更しない。literal `:` と制御綴 `\:` は別の lookup に分けた。
- Token の stack と既存 parser frame で引数・環境・展開を処理する。未消費の入力文字列全体の再構築、正規表現による TeX 全文の解析、MathJax/fixture を呼ぶ runtime 経路はない。
- 配列・タグ・delimiter・option・補助 style は parser session が所有する。`prior` と同じ session の後続入力へ引き継ぎ、独立 session へ漏らさない。
- MathML の階層、`data-mjx-texclass`、style、padding、spacing、script placeholder まで比較対象にした。MathJax が parse 時に選ぶ operator limits と、MathML が継承する fraction style を package 内で分けて保持する。
- shared source への追加は `docs/packages-shared-changes.md` に列記した。`scanner.ts`、`symbols.ts`、`serialize.ts`、`packages/base.ts`、`conformance/`、manifest、lockfile は変更しない。

一次資料はインストール済み `@mathjax/src` 4.1.3 の `ts/input/tex/mathtools/{MathtoolsMappings,MathtoolsMethods,MathtoolsItems,MathtoolsUtil,MathtoolsConfiguration}.ts`、AMS の xArrow/AlignAt と `util/lengths.ts`。research checkout の同版も照合した。参照元は [MathJax-src 4.1.3](https://github.com/mathjax/MathJax-src/tree/4.1.3/ts/input/tex/mathtools)。対応する mapping data と MathML recipes の Apache-2.0 帰属を package の先頭に記載した。

## lane 間の依存と統合

元の fixture の大半は `['base','ams','boldsymbol','mathtools']` を選択し、1 件は `bbox` と `newcommand` を選択する。
この isolated tree の AMS は delimiter subset なので、必要な alignment、tag、sideset、boxed、phantom などの補助を `mathtools.ts` 内に置いた。`ams.ts` は変更していない。

独立検証用に同ファイルから `boldsymbolDependency` と `bboxDependency` の subset を export し、mathtools の一つの登録行で登録している。これらの命令は mathtools 自身の commands から除外し、依存 package を選択したときにだけ有効になる。

root が pkg-fonts/pkg-misc の完全な `boldsymbol`/`bbox` と統合するときは、その二つの subset 登録を外し、mathtools の登録だけ残す。同名 package の重複は registry の先勝ちになるため、subset と完全版を二重登録しない。AMS の補助は mathtools 内に閉じているが、統合後の組み合わせも root verifier で確認する。

## 検証コマンド

```sh
node bench/flashmath/pkg-mathtools-gates.mjs
```

この gate は以下を実行し、実際の終了コードを `bench/flashmath/pkg-mathtools-gates.json`、raw output を各 `pkg-mathtools-*.log` へ保存する。

1. `node node_modules/typescript/bin/tsc -p tsconfig.json`
2. `node --test test/*.test.mjs test/packages/mathtools.test.mjs`
3. `node bench/flashmath/pkg-mathtools-verify.mjs` — 元 fixture の mathtools group 全 196 件を既存 `run()` へそのまま渡す。件数が変われば失敗する。
4. `node conformance/runner.mjs --subject bench/flashmath/adapter.mjs --output bench/flashmath/pkg-mathtools-full.json --fresh`
5. 変更前の全 matched fixture ID と、変更後の ID/status を比較する。base/newcommand 以外も含め、一件でも後退すれば gate を落とす。base 780 以上、newcommand 58、mathtools 196、全体分母維持も確認する。
6. `git diff --check` と `conformance/`・manifest・lockfile の無変更確認。

既存の `pnpm` wrapper は共有 store の SQLite を書こうとして失敗した。node_modules は既に存在しており、install は追加実行せず、既存 TypeScript と node:test を直接起動した。

`package.json` の既存 test glob は直下だけなので、package tests は上記のように明示して実行する。

## 結果

```text
mathtools | 196 | 0 | 0 | 196 | 100.00%
base | 780 | 10 | 21 | 811 | 96.18%
newcommand | 58 | 0 | 0 | 58 | 100.00%
```

担当 harness は exit 0。全体 runner は他の未実装 package を含むため exit 1 であり、全体 GREEN という主張はしない。全体の元の 2683 件は保持した。
既存テストと package tests の計 24 テストは exit 0。package tests は全 fixture、一致済み base/newcommand の行単位回帰、activation、session 分離、resource limits、インストール済み MathJax と比較する fixture 外 37 入力を含む。

全 fixture 一致は MathJax の全入力・全 option の完全互換性や速度優位の証明ではない。この lane は性能・公開の判定を行わず、独立した root verifier に成果物を渡す。

## Git と再開

base revision: `d3daf908c06960d4a04c95ededa6aed371c71d49`。
元の Git directory は scope 外で index.lock を作成できなかったため、scope 内の `node_modules/.cache/pkg-mathtools.git` に base を前提とする commit を作り、`bench/pkg-mathtools.bundle` へ保存した。最初の checkpoint は `4d783cc`。最終 commit は bundle の `refs/heads/pkg-mathtools` を参照する。

```sh
git bundle verify bench/pkg-mathtools.bundle
git fetch ./bench/pkg-mathtools.bundle refs/heads/pkg-mathtools:refs/remotes/pkg-mathtools/result
# root は上記 base 以後の commit を読み、統合先へ適用する。
```

push・外部送信・npm publish は行っていない。

## 仲介のない checkpoint の確認事項

- 高価な実行前に確認を求めたかった点: fixture 196 件の選別が元の record を改変せず、normalizer・option forwarding を変更せず、失敗行を除いていないこと。
- 外へ出す前に確認を求めたかった点: この run では外部送信はせず、bundle の prerequisite と diff に担当外の変更が混ざっていないこと。
- DONE 前に確認を求めたかった点: raw conformance の mathtools 全件一致、base/newcommand の matched ID 維持、依存 subset 登録を完全 package へ置き換える統合手順。

指定された --no-review のため broker checkpoint と子 agent は呼んでいない。lane 終端後の root verifier が最終確認を担当する。UI を変更する成果物はない。
