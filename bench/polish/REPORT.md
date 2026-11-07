この測定 corpus では全ての Temml 比較 cohort で warm stateless p50 が短くなった。

変更は code-first で実装し、ローカル候補を保存した。push・npm publish・外部への成果物送信・子 agent 起動は行っていない。Node 26.12.1 と pnpm 11.18.0 を使用した。Node 22 は通常の PATH、nvm、Nix profile では見つからなかった（environment.json）。

array の ll 指定を cases のテキスト欄と取り違える処理を除去した。tag 内の数式は text と同じ文法で解析し、混在するテキストの mrow も保持する。mathop は明示 font 引数の ORD mrow を保持する。MathJax 4.1.3 の BaseMethods.ts、ParseUtil.ts、mhchemparser 4.2.1 の一次ソースと実出力を参照した。

mhchem は子計算の要求と継続を明示 stack で処理する。既定の独立した 512 段制限を除去し、mhchem 有効時の既定 depth は token 予算に従う。明示 maxDepth は chemistry と parser の両 stack に適用する。既定 depth 2000、引き上げた設定で depth 5000 の文字列出力を検査した。独立した lexer の generator は一段の制御だけに使い、子の入れ子は JS 呼び出し stack に積まない。

CPU profile で設定キーの反復検査・文字列化と native lowering を確認した。設定の深い変更や accessor を検出する snapshot、変更しない parser 設定の共有、native leaf の走査、verb の raw token 消費を改善した。native lowering が data-mjx-variant だけに残る bold-italic を見落としていた箇所も直し、B の実際の Unicode glyph を検査した。公開 package の interface と dependency/lockfile は維持している。

各差の比較試験は test/polish-compatibility.test.mjs に保存した。ll 自体で異なる式が 30 個以上であること、fixture 外であること、oracle が merror を返さないことを検査する。ams 有無と他の alignment 指定も比較した。以下は最終 CI の実出力。

```text
# 512 fresh MathJax 4.1.3 comparisons
# 74 fresh MathJax 4.1.3 comparisons
# 72 fresh MathJax 4.1.3 comparisons
# 32 fresh MathJax 4.1.3 comparisons
# 36 fresh MathJax 4.1.3 comparisons
# 33 fresh MathJax 4.1.3 comparisons
```

全 corpus の最終測定。単位は µs/expression、最後の列は Temml / flashmath。9 cold processes、warm 5 processes × 7 samples、同じ accepted inputs を使用する。実測値はホスト負荷に依存し、診断用の小 corpus の順位とは異なる場合がある。

| cohort | flashmath | Temml | 比率 |
| --- | ---: | ---: | ---: |
| boldsymbol | 10.485 | 11.143 | 1.063 |
| verb | 5.405 | 6.747 | 1.248 |
| mhchem | 102.947 | 107.866 | 1.048 |
| begingroup | 8.768 | 10.759 | 1.227 |

cold import/setup → 最初の文字列の p50 は flashmath 27.593 ms、Temml 20.549 ms。初回起動は Temml のほうが短い。warm の結果を初回起動や全ての入力へ一般化しない。

診断時の元 revision 3106780 との比較は probe.json、最初の全 corpus 測定は full-before-fast-chem.{json,raw.json} に保存した。最初の generator 案で chemistry が遅くなったため、子計算のまとめ方を改めてから全 gate を再実行した。初回の限定測定だけを最終結果には採用していない。pnpm の共有 store が read-only だった試行は、既存 package を参照する一時 store と pnpm 11.18.0 の固定で解決した。

```text
screen_run: Chrome/153.0.8010.36; opened after.html; React hydration/client {"hydrated":211,"clientRendered":2638,"errors":[],"recoverable":[]}; keyboard switched React SSR → toMathMLString → React SSR; 211 formulas; SSR/string geometry equal; captured every group
```

bench/native-render/after-polish-1.png を実際に開いて確認した。array・tag・mathop・chemistry・boldsymbol・verb は描画され、bold-italic B も表示された。MathJax SVG と native MathML には font metrics、演算子の間隔、limits の位置の差が残る。検査画像の hash と確認内容は bench/release/visual-inspection.json に保存した。既存の unsupported 48 件は保持されており、全 MathJax 入力の対応を主張するものではない。

全 command・exit code・実出力末尾は checks.txt、全ログは ci-node-26/ と ../release/ に保存した。release と CI の source SHA-256 はともに fd614ffa6e5c51981eee8fe12f0332b5441b6ea87c9f7ea2e9c502bff8c2d540。npm tarball は ../release/minamorl-flashmath-0.1.0.tgz。pack smoke は実 archive の import、React SSR、fonts とファイル内容を検査する。

元の Git index は read-only のため、commit は worktree 内の .release-git に作成した。変更を main の 3106780 を前提とする ../polish.bundle に保存する。.release-git は Git commit に含めず、npm 配布物にも含めない。

レビュー確認点（高価な実行前・no-review）: 各差の有効な fixture 外入力、ll 単独の式数、同じ benchmark 入力、error を除外して速く見せていないこと。
レビュー確認点（最終・no-review）: 最終 source と gate の fingerprint、残る速度差・表示差、pack 内容、bundle の前提 revision と実ファイルの存在。
