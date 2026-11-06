# TeX → MathML conformance

flashmath の将来の出力を、MathJax **4.1.3** の固定 snapshot と照合する code-first harness。外部通信・依存追加・package.json の変更は不要。文字列の同一性ではなく、以下で定義する MathML 木の一致を測る。視覚的・数式意味論的な等価性までは主張しない。

## 実行

repository root で Node.js 22.18 以上（native `stripTypeScriptTypes` が使える版。検証環境は 26.12.1）を使う。

```sh
node --test conformance/harness.test.mjs
node conformance/runner.mjs
```

既定の subject はインストール済み `@mathjax/src@4.1.3`。結果は stdout の表と `conformance/results/mathjax-self.json` に出る。全件一致だけ exit 0、不一致・未対応が一つでもあれば exit 1、起動失敗も非ゼロ。試験対象を替えるには:

```sh
node conformance/runner.mjs --subject ./path/to/flashmath-adapter.mjs --output conformance/results/flashmath.json
```

adapter は `export default async function(tex, options) { return mathmlString; }`（同期関数も可）。options は fixture の input から tex を除いたもの: `packages`（順序・優先度 tuple を保持）、`texOptions`、`display`、`mode`、`prior`（同じ parser instance で先に処理された入力）、`configurationModules`（上流が明示 import した登録モジュール）、`executionOrder`（source 内の呼出順）。通常は mode=convert。render は HTML 内の TeX 検出、output は SVG output jax による測定も使う。未対応 mode や callback を黙って無視してはならない。上流独自の関数 options は JSON 内に `$function` で保存し、自動 eval せず unsupported とする。RegExp は `$regexp` と flags で保存し、MathJax adapter が復元する。

## oracle と抽出

npm 配布物には testsuite がないため、指定された read-only clone `/home/minamorl/repos/.research/mathparse-src/MathJax-src` を使用。package.json と tag は 4.1.3、commit は `fb987178c2d279a99b0db5ea02e751691703955e`。実行用パッケージも 4.1.3。版の相違は見つからなかった。一次資料は同 clone の `testsuite/src/setupTex.ts` と、配布物の `mjs/core/MmlTree/SerializedMmlVisitor.js`、`mjs/input/tex.js`。

```sh
node conformance/extract.mjs [local-MathJax-src-path]
```

抽出は upstream test の import をローカル MathJax モジュールへ向け、describe/beforeEach/test を収集し、変換 helper を入力記録用に置き換えて走らせる。正解を新しく計算せず、Jest snapshot の export と完全な test 名・snapshot 番号で対応付ける。上流 test は信頼できるローカルコードとして実行する（sandbox ではない）。afterAll の coverage 記録・component loader・非 snapshot assertion は実行対象外。上流の unit test suite 自体に合格したことは意味しない。

fixture `conformance/fixtures/mathjax-4.1.3.json` は 2,683 snapshot をすべて保持。入力が取れないものや MathML 単体でない snapshot も rawSnapshot と理由を残し、分母から削除しない。入力、packages、options、display、先行入力、期待 MathML、出典 file・test 名、source commit/version、test/snapshot ファイルの SHA-256 を記録。抽出で捕捉できない条件は `extraction-diagnostics.json` に記録する。source tree が変わったときの再抽出は差分レビューが必要。実行順は snapshot のアルファベット順ではなく、元の test 内の呼出順を保持する。上流 Unicode.test.ts が明記するように UnicodeCache は module 単位で保持されるため、この順序自体が oracle の条件である。

## 正規化の規則

| 規則 | 理由・保持するもの |
| --- | --- |
| XML を構造として読み、属性を expanded name 順に並べる。quote の種類、self-closing と明示 close は区別しない | serialization の違いを除く。要素の種類・階層・兄弟順は保持 |
| namespace prefix は URI に展開し、xmlns 宣言自体の位置は比べない | 同じ namespace の別 prefix を許す。root は MathML namespace の math を必須とし、namespace の相違を隠さない |
| `data-latex`、`data-latex-item`、`data-mjx-texclass` だけを削除 | TeX の原文追跡と MathJax 内部の TeX class bookkeeping。ほかの `data-*` は表示に影響するものがあるので保持 |
| MathML の既知の構造 container の子にある whitespace-only text を削除 | serializer のインデント。mi/mn/mo/mtext/ms/annotation、未知要素、HTML の空白、非空白の text はそのまま保持 |
| XML の predefined entity と数値文字参照を文字へ戻す。CDATA と text を統合 | `&#x2264;` と `≤` を同一視。Unicode 正規化、文字の置換、数値・単位の換算はしない |
| XML に従い CRLF/CR を LF に、属性の literal 改行/tab を space にする | XML parser の通常の取り扱い。文字参照の whitespace と属性値内の空白の量は保持 |
| id、href、class、style、mathvariant、display、stretchy、spacing、error 属性などは保持 | id はユーザーが与える識別子や参照の一部にもなるため一律除去しない。generated id の自動改名もしない |
| 空 mrow の除去、mrow の flatten、既定属性の補完/除去、annotation の除去はしない | parser の構造や内容の誤りを一致へ変えないため |
| 不正 XML は失敗 | 重複属性、不均衡タグ、未知 entity、未束縛 prefix、複数 root などを DOM の修復で隠さない。DTD/外部 entity/コメント/processing instruction は対応外として拒否 |

正規化は独立した XML subset parser で行い、subject や oracle の MathJax parser を再利用しない。一般的な XML validator の全機能を提供するものではない。

## 集計と検証

source suite ごとに一意に集計し、ALL はすべての fixture を分母とする。追加で requested packages の membership ごとも表示する（base+ams などは両方に入るため、この表の行は重複する）。未捕捉は `(uncaptured)` に残る。差は structure / text / attributes の最初の箇所、subject-error、invalid-actual、invalid-expected、unsupported 理由に分類する。JSON は case ごとの status と、不一致時の candidate 生 MathML・最初の差・エラーを保持する。

負の試験では token・数字・上付き/下付き・兄弟順・ノード欠落・display・mathvariant・stretchy・未知 data 属性・id・href・mtext の空白を意図的に変える。空文字を返す subject、不正 XML、例外、unsupported を混ぜ、合格率の分母と分類も確かめる。実 fixture の `x` → `y` 破壊が text 不一致になることを検証する。

### MathJax 4.1.3 自己比較の結果（2026-11-07）

全 2,683 件のうち **2,605 一致、0 不一致、78 未対応、97.09%**。全件 100% には未達。実行可能な 2,605 件はすべて一致したが、この範囲の自己一致は harness の整合性確認であり、未対応条件を含む全面的な正しさの証明ではない。MathJax 側の不具合や flashmath の不具合を示す差は観測していない。

未対応は重複しない最初の理由で分類する（関数 options と custom package の両方がある case もある）。候補の出力が異なった case と区別し、すべて ALL の分母に含める。

| 分類 | 件数 | 原因と未実装範囲 |
| --- | ---: | --- |
| function-valued-options | 30 | Begingroup 19、SetOptions filter 3、TagFormat callback 8。関数本文は保存するが closure/登録を含めた再実行を実装していない |
| custom-package-registration | 26 | source の Configuration.create、CommandMap、postfilter などで定義される userMacros/userEnvs/userFilters/nopadding/stackMacros/matchBrackets/mml。名前と出典は保存するが登録コードの再現は未実装 |
| typeset-component-pipeline | 14 | Autoload 2、Require 8、SetOptions 動的 require 2、Textmacros Autoload 2。component loader と非同期 retry の再現は未実装 |
| non-single-MathML-snapshot | 7 | Tag 2、Tex FindTeX 5 の page 全体の MathML 配列。入力 HTML は保存するが、subject の契約は単一 MathML string |
| input-not-captured | 1 | Tex NodeFactory のノード直接生成試験。TeX 入力が存在せず、raw snapshot は `<mi></mi>` |

初回の自己比較で Unicode 4 件の attributes 差と TexHtml 5 件の subject-error を検出した。前者は fixture が snapshot の名前順だったために UnicodeCache の状態が変わったこと、後者は HTMLDocument に文字列を直接渡していたことが原因。呼出順の保持と上流同様の `mathjax.document` の利用で解消した。属性や文字を正規化で余分に削除して合わせてはいない。単一行の Jest string snapshot も正しく抽出するよう修正済み。

### 再開と結果ファイル

実行中は `--output` の末尾に `.jsonl` を付けた journal に各 case の完了を同期追記する。同じコマンドを再実行すると完了済み比較を再利用する。fixture・subject entrypoint・conformance の .mjs・MathJax package metadata・Node 版の SHA-256 が違えば古い checkpoint を拒否する。設定を替えた再計測には `--fresh` または別の `--output` を使う。subject の外部依存や別ディレクトリの transitive source の変更は自動検知しないので、その場合も `--fresh` を使う。

journal の途中までの行だけを再利用し、末尾の未完行は切り捨てる。MathJax adapter の optional `subject.restore(records, completedRows)` は既出の subject 呼出しを順に再生して module cache を復元する（過去の比較は再利用）。独自の stateful subject もこの hook を実装する必要がある。journal は machine ごとの途中状態として gitignore し、最終 JSON とログを commit する。最終 JSON の run には fingerprint・subject・Node 版を記録する。

実際の部分再開試験では Unicode Bold の直後、2,620 件が終わった journal の次の行を途中で切り、新しい Node process で再開した。最終 JSON は fresh 実行と byte 単位で一致した。`mathjax-partial-resume.log` に checkpoint と `cmp_exit_code=0` を保存している。

| 実行コマンド | exit code | 生出力 |
| --- | ---: | --- |
| `node conformance/extract.mjs` | 0 | `conformance/results/extraction.log`（2,683 records、2,682 inputs、78 unsupported。snapshot を持たない追加 unit test の diagnostic 1 件も別記） |
| `node --test conformance/harness.test.mjs` | 0 | `conformance/results/tests.log`（tests 36 / pass 36 / fail 0） |
| `node conformance/runner.mjs --fresh` | 1 | `conformance/results/mathjax-self.log` と `mathjax-self.json`（未対応を含むため exit 1 を維持） |
| `node conformance/runner.mjs` | 1 | `conformance/results/mathjax-resume.log`（checkpoint: 2683/2683 completed） |
| `node conformance/runner.mjs --output "$task_resume_dir/self.json"` | 1 | `conformance/results/mathjax-partial-resume.log`（checkpoint: 2620/2683 completed） |
| `cmp conformance/results/mathjax-self.json "$task_resume_dir/self.json"` | 0 | 同上の末尾 `cmp_exit_code=0`。task_resume_dir は mktemp -d で TMPDIR 内に作成 |

### suite 別（互いに重複しない）

| suite | matched | mismatch | unsupported | total | matched/total |
| --- | ---: | ---: | ---: | ---: | ---: |
| action | 3 | 0 | 0 | 3 | 100.00% |
| ams | 158 | 0 | 0 | 158 | 100.00% |
| amscd | 13 | 0 | 0 | 13 | 100.00% |
| autoload | 0 | 0 | 2 | 2 | 0.00% |
| base | 790 | 0 | 21 | 811 | 97.41% |
| bbm | 9 | 0 | 0 | 9 | 100.00% |
| bboldx | 28 | 0 | 0 | 28 | 100.00% |
| bbox | 6 | 0 | 0 | 6 | 100.00% |
| begingroup | 0 | 0 | 19 | 19 | 0.00% |
| boldsymbol | 6 | 0 | 0 | 6 | 100.00% |
| braket | 30 | 0 | 0 | 30 | 100.00% |
| bussproofs | 26 | 0 | 0 | 26 | 100.00% |
| cancel | 8 | 0 | 0 | 8 | 100.00% |
| cases | 5 | 0 | 0 | 5 | 100.00% |
| centernot | 2 | 0 | 0 | 2 | 100.00% |
| color | 29 | 0 | 0 | 29 | 100.00% |
| colortbl | 14 | 0 | 1 | 15 | 93.33% |
| colorv2 | 4 | 0 | 0 | 4 | 100.00% |
| configmacros | 10 | 0 | 0 | 10 | 100.00% |
| dsfont | 2 | 0 | 0 | 2 | 100.00% |
| empheq | 44 | 0 | 0 | 44 | 100.00% |
| enclose | 6 | 0 | 0 | 6 | 100.00% |
| extpfeil | 6 | 0 | 0 | 6 | 100.00% |
| gensymb | 5 | 0 | 0 | 5 | 100.00% |
| html | 16 | 0 | 0 | 16 | 100.00% |
| mathtools | 196 | 0 | 0 | 196 | 100.00% |
| mhchem | 112 | 0 | 0 | 112 | 100.00% |
| newcommand | 58 | 0 | 0 | 58 | 100.00% |
| noerrors | 56 | 0 | 0 | 56 | 100.00% |
| noundefined | 2 | 0 | 0 | 2 | 100.00% |
| physics | 628 | 0 | 0 | 628 | 100.00% |
| require | 0 | 0 | 8 | 8 | 0.00% |
| setoptions | 7 | 0 | 5 | 12 | 58.33% |
| tag | 75 | 0 | 2 | 77 | 97.40% |
| tagformat | 0 | 0 | 8 | 8 | 0.00% |
| tex | 2 | 0 | 10 | 12 | 16.67% |
| texhtml | 6 | 0 | 0 | 6 | 100.00% |
| textcomp | 118 | 0 | 0 | 118 | 100.00% |
| textmacros | 48 | 0 | 2 | 50 | 96.00% |
| unicode | 21 | 0 | 0 | 21 | 100.00% |
| units | 10 | 0 | 0 | 10 | 100.00% |
| upgreek | 41 | 0 | 0 | 41 | 100.00% |
| verb | 5 | 0 | 0 | 5 | 100.00% |
| ALL | 2605 | 0 | 78 | 2683 | 97.09% |

### requested package 別（membership、重複あり）

| requested package | matched | mismatch | unsupported | total | matched/total |
| --- | ---: | ---: | ---: | ---: | ---: |
| base | 2605 | 0 | 77 | 2682 | 97.13% |
| action | 3 | 0 | 0 | 3 | 100.00% |
| ams | 534 | 0 | 13 | 547 | 97.62% |
| amscd | 13 | 0 | 0 | 13 | 100.00% |
| autoload | 0 | 0 | 3 | 3 | 0.00% |
| userMacros | 0 | 0 | 5 | 5 | 0.00% |
| userEnvs | 0 | 0 | 15 | 15 | 0.00% |
| userFilters | 0 | 0 | 1 | 1 | 0.00% |
| bbm | 9 | 0 | 0 | 9 | 100.00% |
| bboldx | 28 | 0 | 0 | 28 | 100.00% |
| textmacros | 78 | 0 | 2 | 80 | 97.50% |
| bbox | 7 | 0 | 0 | 7 | 100.00% |
| begingroup | 0 | 0 | 19 | 19 | 0.00% |
| newcommand | 102 | 0 | 19 | 121 | 84.30% |
| retry | 0 | 0 | 19 | 19 | 0.00% |
| boldsymbol | 191 | 0 | 0 | 191 | 100.00% |
| braket | 30 | 0 | 0 | 30 | 100.00% |
| bussproofs | 26 | 0 | 0 | 26 | 100.00% |
| cancel | 8 | 0 | 0 | 8 | 100.00% |
| cases | 49 | 0 | 0 | 49 | 100.00% |
| centernot | 2 | 0 | 0 | 2 | 100.00% |
| color | 71 | 0 | 0 | 71 | 100.00% |
| colortbl | 14 | 0 | 1 | 15 | 93.33% |
| nopadding | 0 | 0 | 1 | 1 | 0.00% |
| colorv2 | 10 | 0 | 0 | 10 | 100.00% |
| configmacros | 10 | 0 | 0 | 10 | 100.00% |
| dsfont | 2 | 0 | 0 | 2 | 100.00% |
| empheq | 44 | 0 | 0 | 44 | 100.00% |
| enclose | 6 | 0 | 0 | 6 | 100.00% |
| extpfeil | 6 | 0 | 0 | 6 | 100.00% |
| gensymb | 5 | 0 | 0 | 5 | 100.00% |
| html | 47 | 0 | 0 | 47 | 100.00% |
| mathtools | 196 | 0 | 0 | 196 | 100.00% |
| mhchem | 112 | 0 | 0 | 112 | 100.00% |
| noerrors | 56 | 0 | 0 | 56 | 100.00% |
| noundefined | 2 | 0 | 0 | 2 | 100.00% |
| physics | 628 | 0 | 0 | 628 | 100.00% |
| require | 0 | 0 | 10 | 10 | 0.00% |
| require-load | 0 | 0 | 1 | 1 | 0.00% |
| units | 15 | 0 | 0 | 15 | 100.00% |
| setoptions | 7 | 0 | 5 | 12 | 58.33% |
| tagformat | 0 | 0 | 8 | 8 | 0.00% |
| stackMacros | 0 | 0 | 2 | 2 | 0.00% |
| matchBrackets | 0 | 0 | 1 | 1 | 0.00% |
| mml | 0 | 0 | 1 | 1 | 0.00% |
| (uncaptured) | 0 | 0 | 1 | 1 | 0.00% |
| texhtml | 6 | 0 | 0 | 6 | 100.00% |
| textcomp | 118 | 0 | 0 | 118 | 100.00% |
| unicode | 52 | 0 | 0 | 52 | 100.00% |
| no-autoload | 0 | 0 | 1 | 1 | 0.00% |
| upgreek | 41 | 0 | 0 | 41 | 100.00% |
| verb | 5 | 0 | 0 | 5 | 100.00% |


## ライセンス

fixtures の TeX と期待値は [MathJax-src 4.1.3](https://github.com/mathjax/MathJax-src/tree/4.1.3/testsuite/tests/input/tex) の抽出物で Apache-2.0。`conformance/fixtures/LICENSE.MathJax` に LICENSE 全文を同梱する。JSON 化・helper の入力記録・metadata 追加はこの harness による変更であり、上流そのままのファイルではない。`LICENSE.MathJax` は上流の全文を変更せず保持し、出典・変更の説明は `ATTRIBUTION.MathJax` に同梱する。LICENSE 末尾は copyright の記入例であり、実際の権利者表記ではない。MathJax project の帰属は The MathJax Consortium。この参照版の root には NOTICE/NOTICE.txt が存在しなかったため、上流の NOTICE を新しく捏造しない。今後 source に NOTICE があれば extractor が `NOTICE.MathJax` として複写し、再配布時も同梱する。repository 自体の MIT license を fixture の再ライセンスに使わない。
