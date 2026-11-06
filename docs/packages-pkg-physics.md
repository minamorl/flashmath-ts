# pkg-physics lane

code-first。対象は MathJax 4.1.3 の physics / braket / cancel / centernot / bbox / enclose。
担当 group は全 fixture が一致した。bbox と mathtools の混在 fixture は mathtools 未登録で未一致のまま記録し、統合後の検証へ渡す。

## 配置と判断

- `src/packages/{physics,braket,cancel,centernot,bbox,enclose}.ts` がそれぞれ TexPackage を export。`registry.ts` の変更は登録行だけ。
- `test/packages/<name>.test.mjs` は担当 package の fixture と追加の MathJax 直接比較を所有する。`test/packages-pkg-physics.test.mjs` が通常の `node --test test/*.test.mjs` へ接続する。
- 自動括弧・Dirac 記法・微分・行列は MathJax の展開規則を既存 token stream / 明示 frame stack に適用する。未消費の入力を再構成する scanner、MathJax 実行時依存、oracle の返却は追加していない。
- MathML の構造、TeX class、括弧、vector font、menclose notation、padding と style、centerOver の phantom を対象にした。centerOver の可視 subtree と phantom subtree は別々に解析する。
- package の character handler は既存 TexCommand の `type: 'character'` / `char` と、通常の制御綴として入力できない `@character:` キーで登録する。既存 priority 解決を通すため、braket と physics の併用時にも同じ優先順で選ばれる。
- 共有の追加は `docs/packages-shared-changes.md` に記載。scanner / AST / serializer / symbols / base / package types と conformance は変更していない。matrix 生成は node limit で事前に制限する。
- 各 package の一次資料はローカル MathJax-src 4.1.3 の Configuration / Mappings / Methods / Items。派生した source に著作権・Apache-2.0 の表記を付けた。

## 再実行

```sh
node bench/flashmath/pkg-physics-validation.mjs
```

これは package.json の build/test と同じ tsc / node:test を直接実行し、全 fixture を `--fresh` で conformance runner に渡す。結果を `bench/flashmath/pkg-physics-validation.json` と各 `.log` に残す。source と fixture の SHA-256 も記録する。conformance の正規化、fixture、分母、失敗行は変更しない。

`pnpm install --frozen-lockfile` は一度実行し、依存は配置されたが esbuild の ignored-build policy で exit 1。`pnpm run build` は pnpm の自動依存確認が書込み不可の SQLite store を開こうとして exit 1。このため既に配置された同じ TypeScript と node:test を直接実行した。lockfile に変更はない。

## 検証の実出力

```text
build: exit 0

tests: exit 0
✔ a package adds commands, overrides, delimiters and an environment with one registry line (56.004412ms)
✔ SSR exactly equals string output for all 848 executable base/newcommand fixtures (345.558279ms)
ℹ tests 726
ℹ suites 0
ℹ pass 726
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1629.294474
conformance: exit 1
progress: 1700/2683
progress: 1800/2683
progress: 1900/2683
progress: 2000/2683
progress: 2100/2683
progress: 2200/2683
progress: 2300/2683
progress: 2400/2683
progress: 2500/2683
progress: 2600/2683
physics {"total":628,"matched":628,"mismatch":0,"unsupported":0}
braket {"total":30,"matched":30,"mismatch":0,"unsupported":0}
cancel {"total":8,"matched":8,"mismatch":0,"unsupported":0}
centernot {"total":2,"matched":2,"mismatch":0,"unsupported":0}
bbox {"total":6,"matched":6,"mismatch":0,"unsupported":0}
enclose {"total":6,"matched":6,"mismatch":0,"unsupported":0}
base {"total":811,"matched":780,"mismatch":10,"unsupported":21}
newcommand {"total":58,"matched":58,"mismatch":0,"unsupported":0}
crossPackageRows [{"id":"Mathtools.test.ts::Mathtools Boxed Equations MakeAboxedCommand star 1","group":"mathtools","status":"mismatch","category":"subject-error","error":"UnsupportedFeatureError: Unsupported configuration module: input/tex/mathtools/MathtoolsConfiguration.js"}]
```

全体 conformance の exit 1 は他 lane の未実装と既存失敗も含む。担当 group の検証と base/newcommand の回帰検証を全体成功と混同しない。bbox の package membership は mathtools 混在ケースを含むため、group の分母とは異なる。完全な失敗行を `bench/flashmath/pkg-physics-conformance.json` に保持している。

## Git 引き渡し

元の worktree の `.git/worktrees/pkg-physics/index.lock` が assigned write scope 外で書込み不可のため、通常の `git add` / `git commit` は実行できなかった。`bench/flashmath/pkg-physics-delivery.mjs` は `$TMPDIR` 内の一時 bare Git repository を使って局所的に commit し、次へ引き渡す。

- `bench/flashmath/pkg-physics.bundle`: baseline からの checkpoint commit と最終差分。
- `bench/flashmath/pkg-physics.patch`: baseline に対する binary-capable patch。
- `bench/flashmath/pkg-physics-delivery.json`: baseline / head / ref / 格納した path。

`git bundle verify bench/flashmath/pkg-physics.bundle` で検証できる。ネットワークへの送信、push、merge、npm publish は行っていない。

## root verifier に渡す確認点（no-review）

- 高価な実行前に確認してほしかった点: 全 fixture の分母と option forwarding / 正規化を維持し、失敗も報告へ残していること。今回の fresh run は全体 fixture を使用した。
- 終端で確認してほしい点: parser の追加が既存 base/newcommand に作用しないこと、package priority・character handler・vector font の境界、bundle と作業ツリーの一致。
- 統合後に確認してほしい点: `Mathtools.test.ts::Mathtools Boxed Equations MakeAboxedCommand star 1` を mathtools / AMS lane と結合して再実行すること。
