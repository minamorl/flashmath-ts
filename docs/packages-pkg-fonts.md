# pkg-fonts delivery

実装と補助統合検証を配置済み。通常の subject は他 lane の未統合依存を含むため全件一致ではない。root は lane を統合し、下記 textmacros patch を反映して、通常の subject でも同じ比較を再実行すること。公開・外部送信は行っていない。

## Scope and decisions

- code-first、spec 無し。子 agent と agent-lane-review checkpoint は起動していない。
- 参照した一次資料は同梱 MathJax 4.1.3 の ts/input/tex/<package>/*.ts と Tags.ts、ParseUtil.ts、BaseMethods.ts。外部 API や runtime MathJax dependency を追加していない。symbol data の由来と Apache-2.0 を各該当 source に明記した。
- color: named/rgb/RGB/gray の変換、definecolor、group 内の宣言スコープ、textcolor、colorbox/fcolorbox の text と internal math、padding/borderWidth option。色定義は session ごとに保持する。
- colorv2: 引数内の inferred row を mstyle に吸収し、余分な row を除く。既存の textcolor alias は維持する。
- colortbl: cell > row > column の優先順位、preamble の指定、overlap option の読み捨て、位置エラー。無着色 table の処理は変えない。
- boldsymbol: token の variant を変換し、text box 内の新しい math scope は外側の bold 指定から独立させる。明示した内側の boldsymbol は保持する。
- bbm: normal/bold/sans/monospace と mathversion、bboldx: normal/light/bold と Greek/dotless/delimiter/text namespace、dsfont: roman/sans。独自 variant は data-mjx-variant として公開する。
- upgreek: upright Greek、gensymb: MathML-Unit と upright variant、textcomp: 全 symbol と oldstyle variant。symbol table は upstream source 由来で fixture の出力を実装に埋め込んでいない。
- unicode: decimal/hex、optional font と metrics の読み取り、font variant、U と char の各記法。通常の文字 U は command として扱わない。
- html: href/style/class/cssId/data を argument の node に付与し、既存 class/style の合成を維持する。
- texhtml: allowTexHTML を明示したときだけ埋め込み HTML を構造化 AST にする。render fixture の入力を扱い、HTML がない/disabled の入力は従来の数学文字として処理する。
- action: tooltip/texttip/toggle 用の maction node。toggle の既定 actiontype は serializer に出さない。
- tagformat: number/tag/ref/id/url callbacks、string/array tag、空要素、明示 tag と自動 tag、参照先 URL。MathJax と同じ括弧分割で tag cell を生成する。
- fontsizev3: upstream の10個の size override を実装。元 fixture は0件のため、各 size を公式 oracle と直接比較する追加テストを置いた。
- shared changes の接続点は [packages-shared-changes.md](packages-shared-changes.md)。registry は自分の登録行だけを追加した。package.json、pnpm-lock.yaml、conformance/ は変更していない。

## Evidence

通常ビルドと既存/追加テスト:

```text
$ node_modules/.bin/tsc -p tsconfig.json
exit: 0
(stdout/stderr empty)
$ node --test --test-reporter=tap test/*.test.mjs
exit: 0
  ...
1..40
# tests 351
# suites 0
# pass 317
# fail 0
# cancelled 0
# skipped 34
# todo 0
# duration_ms 1009.642403
```

34 skip は textmacros 未登録30件、AMS align 未実装3件、元から unsupported の colortbl 1件。fixture test helper は統合先で依存が登録されると自動的に該当ケースを実行する。これとは別に、変更しない full conformance runner では行の除外も skip 化もしていない。

通常 full conformance:

```text
$ node conformance/runner.mjs --subject bench/flashmath/adapter.mjs --output bench/pkg-fonts/final.json --fresh
exit: 1
base {"total":811,"matched":780,"mismatch":10,"unsupported":21}
newcommand {"total":58,"matched":58,"mismatch":0,"unsupported":0}
regression gate: PASS
```

exit 1 は未統合の依存、他 lane の未対応 package、元の unsupported fixture が残るため。before.json と final.json の matched ID を比較して base/newcommand の退行がないことを確認した。

## Supplementary integration probe

同じ cwd の bench/pkg-fonts/integration/ へ自分の source と sibling の AMS/textmacros/mathtools source をコピーし、必要な seam を合成してから全 source を再ビルドした。他 lane の作業ツリーと自分の src/ は変更しない。これは通常 subject の代用品ではなく、root が合流するときの接続証拠。採用した sibling source の SHA-256 は integration-summary.json と integration/sources.json にある。

```text
$ node bench/pkg-fonts/integration.mjs
exit: 0
integration tsc exit: 0
$ node bench/pkg-fonts/integration-gate.mjs
exit: 0
text package activation boundary: PASS
integration target fixture gate: PASS
```

内部で実行する full runner 自体は exit 1。他 lane の package 等を含めた全分母を維持している。上記 gate は担当 package membership の全行について、元から unsupported の行以外が matched であることを assert する。

| package membership | matched | mismatch | unsupported | total |
| --- | ---: | ---: | ---: | ---: |
| color | 71 | 0 | 0 | 71 |
| colorv2 | 10 | 0 | 0 | 10 |
| colortbl | 14 | 0 | 1 | 15 |
| boldsymbol | 191 | 0 | 0 | 191 |
| bbm | 9 | 0 | 0 | 9 |
| bboldx | 28 | 0 | 0 | 28 |
| dsfont | 2 | 0 | 0 | 2 |
| upgreek | 41 | 0 | 0 | 41 |
| gensymb | 5 | 0 | 0 | 5 |
| textcomp | 118 | 0 | 0 | 118 |
| unicode | 52 | 0 | 0 | 52 |
| texhtml | 6 | 0 | 0 | 6 |
| html | 47 | 0 | 0 | 47 |
| action | 3 | 0 | 0 | 3 |
| tagformat | 8 | 0 | 0 | 8 |

分母は before と一致する。colortbl の unsupported 1件は元から custom-package-registration として抽出されている。fixture/harness を修正せず保持した。fontsizev3 は上表に元 fixture がないため追加 oracle テストで検証した。

## Root integration

1. pkg-fonts.bundle の prerequisite は d3daf908c06960d4a04c95ededa6aed371c71d49。bundle 内の lane commits を既存の統合経路で取り込む。元 worktree の Git index は読み取り専用だったため、assigned scope 内の delivery.git で commit を作った。
2. AMS の tags union/validation と、AST の append された enum member/name 配列を合わせて保持する。全 source を再ビルドする。compiled module の差し替えだけで numeric enum を混ぜない。
3. misc の PackageConfiguration.packages と mathtools の initialize/characters/session.packageData の shared changes を合流する。texhtml の character handler は type=character で明示したものだけを実行する。
4. bench/pkg-fonts/textmacros-integration.patch を最新の misc textmacros へ適用/再照合する。textcomp/bboldx の type=text-insert を text shim が受け取り、textbb/textbfbb は登録済みのときだけ text scope の font を変える。
5. 通常の build/test/full conformance を再実行する。補助ビルドで一致しただけでは統合済みとは判定しない。

## Limits and requested review

- HTML subtree parser はこの TeX package の fixture に必要な要素・属性・text を扱う実装であり、ブラウザの全 HTML repair/entity 規則を網羅する検証は行っていない。
- pnpm run build は pnpm の自動 dependency-status 処理から store DB を開けず失敗した。既存の node_modules/.bin/tsc を直接使い、install/lockfile 変更を避けた。
- before expensive execution: harness/options の転送、全分母、source hash、MathJax 比較境界を確認してほしかった。
- before external/destructive operations: そのような操作は行っていない。Git の作業は assigned scope 内の別 object store と bundle 作成に限定した。
- before DONE: root verifier に、bundle 差分・textmacros seam・共有 enum/formatter の合流・通常 subject の全担当 fixture 一致・base/newcommand matched ID 維持を確認してほしい。この run は root の最終 verifier を起動しない。
