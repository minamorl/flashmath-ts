# pkg-physics: verifier 差し戻しへの修正

担当 group の fixture と base/newcommand の回帰を維持して修正した。fixture 外の残存差分は既存の array 行間処理、MathJax 自身が `\centernot{}` で投げる TypeError、React の CSS 空白正規化。bbox / mathtools 混在 fixture は mathtools lane の統合後に検証する。

## 実装と Decisions

1. React: AST の CSS 文字列を React の style object に写す。CSS の quote / parenthesis 内の区切り、hyphenated property、vendor prefix、custom property を処理する。対応済みの全 package の全 executable fixture を通常の SSR 試験へ含める。未知の package / 契約による UnsupportedFeatureError は明示的に数え、それ以外の例外を握り潰さない。
2. character handler: package 固有の登録名を使い、数値の token code で handler chain を引く。MathJax と同じ優先順で試し、false で辞退したときは後続へ渡す。physics / braket の両順と明示 priority を試験する。制御綴の選択は従来どおり registry の解決結果を使う。
3. cancelto: 生成された msup を scriptBoundary とし、後続の `^2` / `_2` を外側へ付ける。通常の TeX scripts の合成は維持する。
4. quantity 群: 引数を raw TeX に戻して再 scan せず、既存の明示 frame stack で読む。深さ400の括弧を全て検査し、slice 呼出し数の線形性を試験する。literal token の handler 検索にも追加の slice を作らない。
5. option scanner: bbox の dimension / color / style と enclose / cancel の keyval / notation を charCodeAt で走査する。sin の optional exponent 判定表は module 初期化で作る。parse 中の対象経路で regex / split / match / replace が呼ばれないことを計数する。
6. エラーと属性: package の不足引数はコマンド名を含める。`\mqty(a` の文言も MathJax に合わせる。keyval は braces で区切りを保護し、引用符は値の一部として残す。既定 notation の longdiv は属性を省略する。
7. row 境界: 内部の inferred row と明示 mrow を分ける。enclosure / bbox / sqrt 内で明示括弧の mrow を保持する。MathMLNode と文字列出力には内部 flag を露出させない。

共有の核も変更している。`src/parser.ts`、`src/ast.ts`、`src/react.ts`、`src/packages/base.ts`、`src/packages/types.ts` の全変更と理由は `docs/packages-shared-changes.md` に列挙した。registry は六つの登録行の追加だけ。scanner / serializer / symbols / conformance / lockfile は変更していない。

一次資料はローカル MathJax 4.1.3 の package 実装、TexParser.GetArgument、ParseUtil.readKeyval、React 19.2.4 の server style serializer。各 package に派生元の著作権と Apache-2.0 を記載している。実行時に oracle を呼ぶ実装や fixture の期待出力の埋込みはない。

## 同じ corpus での再比較

独立 verifier が保存した `/home/minamorl/.cc/tmp/U4qrZqes/tmp.pxCRD8FZhU/corpus.mjs` を `bench/flashmath/pkg-physics-verifier/corpus.mjs` にそのまま保存した。元の diff.json の novelty / MathJax error 判定も cohort.json に固定している。追加した回帰試験によって「既知の式」が増えても比較の分母を縮めない。

比較器は同じ conformance/normalize.mjs を使い、mi と mo、mathvariant の有無を区別できる較正を含む。全行の oracle / subject / SSR / 差分を diff.json に保存する。baseline.log は最初の verifier の実出力。baseline-matched.json は修正前に一致していた fixture ID で、再実行時に行単位の退行も検査する。

baseline の valid cohort は 386/395、今回の valid cohort は 394/395（99.75%）。全 corpus は 465/467、固定 novel cohort は 437/439。SSR 例外は 0、SSR の文字列完全一致は 466/467。

残存行は省略せず次のとおり。

- `\begin{array}{c}(a)\\ [b]\end{array}`: 修正前からある base の行間処理で、rowspacing が NaNem になる。今回の package 修正とは別の既存差分として保持した。verifier の第2回44式は39式一致で、残る5式も同じ既存の array / matrix の行間処理。
- `\centernot{}`: MathJax 4.1.3 自身が TypeError を投げる。全 corpus の失敗行に保持し、以前と同じ valid cohort には含めていない。flashmath へこの TypeError を模倣していない。
- `\bbox[yellow,5px,border: 1px solid]{x+y}`: React が style 値先頭の空白を除き `border:1px solid` と出す。MathML 文字列は MathJax と同じ `border: 1px solid` を保つ。CSS の意味は同じだが byte は異なるため、SSR 完全一致として数えていない。

## 再実行と実出力

```sh
node bench/flashmath/pkg-physics-validation.mjs
node bench/flashmath/pkg-physics-verifier/probe2.mjs "$PWD"
```

検証スクリプトは package.json の build / test と同じインストール済み tsc / node:test を使う。pnpm の追加 install や lockfile 変更は行わない。全 fixture を --fresh で conformance runner に渡し、分母と失敗行を保持する。全体 conformance の exit 1 は他 lane の未実装と既存失敗も含むため、全体成功とは報告しない。

以下は今回の検証の実出力。

```text
build: exit 0

tests: exit 0
✔ SSR exactly equals string output for every executable fixture of every supported package (1774.139704ms)
ℹ {"groups":{"ams":130,"base":790,"bbox":6,"braket":30,"cancel":8,"centernot":2,"colorv2":4,"enclose":6,"newcommand":58,"physics":628,"tag":50,"tex":2},"unsupported":921}
ℹ tests 802
ℹ suites 0
ℹ pass 802
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2453.763342
scaling: exit 0
✔ quantity, function and enclosure hot paths do not run regex, split, match or replace (6.381363ms)
ℹ [{"name":"cancel","counts":{"exec":0,"test":0,"split":0,"match":0,"replace":0}},{"name":"bbox","counts":{"exec":0,"test":0,"split":0,"match":0,"replace":0}},{"name":"enclose","counts":{"exec":0,"test":0,"split":0,"match":0,"replace":0}},{"name":"physics","counts":{"exec":0,"test":0,"split":0,"match":0,"replace":0}}]
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 435.047594
verifier: exit 0
│ enclose        │ 39    │ 39    │ 39    │ 39         │ 38    │ 38         │
│ centernot      │ 22    │ 21    │ 21    │ 20         │ 18    │ 18         │
│ mixed          │ 13    │ 13    │ 13    │ 13         │ 13    │ 13         │
│ physics+braket │ 9     │ 9     │ 9     │ 9          │ 8     │ 8          │
│ braket+physics │ 9     │ 9     │ 9     │ 9          │ 8     │ 8          │
└────────────────┴───────┴───────┴───────┴────────────┴───────┴────────────┘
{"total":467,"matched":465,"novel":439,"novelMatched":437,"valid":395,"validMatched":394,"ssrThrows":0,"ssrExact":466,"corpusSHA256":"c44ca0b973aa44f435472a02822e841e9ad36a529a2acae2e6da6d250b1f0360","groups":{"physics":{"total":285,"novel":263,"match":284,"novelMatch":262,"valid":232,"validMatch":231},"braket":{"total":33,"novel":32,"match":33,"novelMatch":32,"valid":31,"validMatch":31},"cancel":{"total":24,"novel":21,"match":24,"novelMatch":21,"valid":20,"validMatch":20},"bbox":{"total":33,"novel":32,"match":33,"novelMatch":32,"valid":27,"validMatch":27},"enclose":{"total":39,"novel":39,"match":39,"novelMatch":39,"valid":38,"validMatch":38},"centernot":{"total":22,"novel":21,"match":21,"novelMatch":20,"valid":18,"validMatch":18},"mixed":{"total":13,"novel":13,"match":13,"novelMatch":13,"valid":13,"validMatch":13},"physics+braket":{"total":9,"novel":9,"match":9,"novelMatch":9,"valid":8,"validMatch":8},"braket+physics":{"total":9,"novel":9,"match":9,"novelMatch":9,"valid":8,"validMatch":8}}}
MISMATCH {"tex":"\\begin{array}{c}(a)\\\\ [b]\\end{array}","group":"physics","novel":true,"isError":false,"difference":{"category":"attributes","path":"/math/0","expected":[["{}columnspacing","1em"],["{}data-frame-styles",""],["{}framespacing",".5em .125em"],["{}rowspacing","4pt"]],"actual":[["{}columnspacing","1em"],["{}data-frame-styles",""],["{}framespacing",".5em .125em"],["{}rowspacing","NaNem"]]}}
MISMATCH {"tex":"\\centernot{}","group":"centernot","novel":true,"isError":true,"oracleError":"TypeError: Cannot read properties of undefined (reading 'texClass')"}
SSR {"tex":"\\bbox[yellow,5px,border: 1px solid]{x+y}","group":"bbox","exact":false,"actual":"<math xmlns=\"http://www.w3.org/1998/Math/MathML\" display=\"block\"><mstyle mathbackground=\"yellow\" style=\"border:1px solid\"><mpadded height=\"+5px\" depth=\"+5px\" lspace=\"5px\" width=\"+10px\"><mi>x</mi><mo>+</mo><mi>y</mi></mpadded></mstyle></math>","expected":"<math xmlns=\"http://www.w3.org/1998/Math/MathML\" display=\"block\"><mstyle mathbackground=\"yellow\" style=\"border: 1px solid\"><mpadded height=\"+5px\" depth=\"+5px\" lspace=\"5px\" width=\"+10px\"><mi>x</mi><mo>+</mo><mi>y</mi></mpadded></mstyle></math>"}
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
regressions []
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

```text
✔ character handlers do not add a slice per literal token (200.242338ms)
ℹ [{"input":"x","packages":["base"],"slices":5000},{"input":"x","packages":["base","physics"],"slices":5000},{"input":"x","packages":["base","braket"],"slices":5000},{"input":"(","packages":["base"],"slices":5000},{"input":"(","packages":["base","physics"],"slices":5000},{"input":"(","packages":["base","braket"],"slices":5000},{"input":"|","packages":["base"],"slices":5000},{"input":"|","packages":["base","physics"],"slices":5000},{"input":"|","packages":["base","braket"],"slices":5000}]
✔ nested quantities at depth 400 scan once and preserve every fence (42.118125ms)
ℹ [{"depth":100,"slices":201,"milliseconds":16.46339999999998},{"depth":200,"slices":401,"milliseconds":6.195932999999968},{"depth":400,"slices":801,"milliseconds":16.767633999999987}]
✔ quantity, function and enclosure hot paths do not run regex, split, match or replace (6.381363ms)
ℹ [{"name":"cancel","counts":{"exec":0,"test":0,"split":0,"match":0,"replace":0}},{"name":"bbox","counts":{"exec":0,"test":0,"split":0,"match":0,"replace":0}},{"name":"enclose","counts":{"exec":0,"test":0,"split":0,"match":0,"replace":0}},{"name":"physics","counts":{"exec":0,"test":0,"split":0,"match":0,"replace":0}}]
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 435.047594
```

## 引き渡し

元の Git index は assigned write scope 外なので、`bench/flashmath/pkg-physics-delivery.mjs` で `$TMPDIR` 内に一時 bare repository を作り、local commit と bundle / patch を生成する。元の履歴や他 lane へ書き込まない。取り込み対象の修正は 1e1867f の子 commit となる。bundle の head / baseline / ref は pkg-physics-delivery.json に記録する。ネットワークへの送信や npm publish は行っていない。

bundle と patch は Git に入れるのではなく `bench/flashmath/pkg-physics.bundle` / `pkg-physics.patch` にファイルとして置く。取り込み時はそれらの実在を確認する。再生成は次のコマンド。

```sh
node bench/flashmath/pkg-physics-delivery.mjs 'fix(packages): address SSR composition scripts and scanner verification'
```

## no-review の確認依頼点

- 実行前に確認してほしかった点: 元の467式と固定395式の cohort / 正規化 / SSR 比較を維持し、失敗を数え続けること。
- 終端で確認してほしい点: shared-changes.md と実差分、character handler の優先順と辞退、inferred row / scriptBoundary が通常の base 動作を変えないこと、bundle と source hash の一致。
- 統合後に確認してほしい点: bbox / mathtools 混在 fixture と、全 package を含む SSR の再実行。既存の array 行間処理と MathJax 自身の例外は今回の差分と区別すること。
