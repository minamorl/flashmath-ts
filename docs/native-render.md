# Native MathML rendering

`parseToReact(tex, options)` and `toMathMLString(ast)` default to `output: 'native'`.
Native output lowers MathJax layout constructs to MathML Core elements and inline
CSS. It needs no MathJax client, font loader, SVG, canvas, DOM measurements, or
post-hydration layout pass. React receives a style object through the existing CSS
bridge. The server and browser receive the same tree.

`output: 'mathjax'` preserves the upstream MathML and private font codes. Select it
both while parsing and while serializing if a MathJax-compatible AST is needed:

```js
const ast = parseToMathMLAst(tex, { ...options, output: 'mathjax' });
const upstream = toMathMLString(ast, { output: 'mathjax' });
const browser = toMathMLString(ast); // immutable native lowering
```

The conformance adapter continues to use MathJax output. No fixture, normalizer,
adapter, or lockfile changes are required. Ordinary trees without any lowered
construct retain the converter's identity fast path. Lowering uses an explicit
stack, including for deeply nested styled input, and is idempotent.

## Source material and browser requirements

The implementation follows the [MathML Core box and table rules](https://www.w3.org/TR/mathml-core/),
the [Unicode Mathematical Alphanumeric Symbols chart](https://www.unicode.org/charts/PDF/U1D400.pdf),
and the installed MathJax **4.1.3** sources:
`output/common/Notation.js`, `output/svg/Wrappers/menclose.js`,
`output/common/FontData.js`, and the relevant TeX package configurations.
The [SVG reference options](https://docs.mathjax.org/en/v4.0/options/output/svg.html)
use `fontCache: 'none'` to make each reference self-contained.

Verification uses Chromium 153. Diagonal lengths and angles use CSS size
containment, `cqw`/`cqh`, `hypot()` and `atan2()`. The CSS engine computes them after
layout; the library does not read a bounding box. These CSS capabilities are
additional requirements beyond MathML Core. Firefox and Safari have not been
verified in this run.

The font remains the consumer's choice. The comparison uses the locally installed
`DejaVu Math TeX Gyre` on the native side and MathJax's New Computer Modern SVG
paths on the reference side. These are different fonts. Passing the feature checks
below means the requested structure and decorations render correctly; it does
**not** mean identical pixels, font metrics, kerning, stroke rasterization, or
identical calligraphic and script glyph designs. The Unicode script alphabet has
one set of codepoints; the chosen native font supplies its glyphs.

## Lowering rules

The snippets below are subtree excerpts. Complete upstream and native strings for
every comparison are saved in `bench/native-render/after-cases.json`.

### Enclosures and cancellation

MathJax output:

```xml
<menclose notation="box"><mi>x</mi></menclose>
<menclose notation="updiagonalstrike downdiagonalstrike"><mi>x</mi></menclose>
```

Native output wraps the real content in a positioned `mrow`. Empty, `aria-hidden`
MathML rows paint the decorations without contributing glyphs or changing the
content. For example, a box's decoration is:

```xml
<mrow aria-hidden="true" style="position:absolute;inset:0;pointer-events:none;border-top:.067em solid currentColor;border-right:.067em solid currentColor;border-bottom:.067em solid currentColor;border-left:.067em solid currentColor"></mrow>
```

Core does not supply `menclose` drawing. Borders handle the orthogonal and curved
enclosures. Absolute CSS strokes handle strikes and arrows. Their enclosing layer
has `container-type:size`; a diagonal stroke uses
`width:hypot(100cqw,100cqh)` and rotation by `atan2(100cqh,100cqw)` with the
appropriate sign. Arrowheads use CSS polygons at the stroke's ends. Duplicate
arrow aliases merge into a single stroke. Independent box/circle/strike
notations remain independent layers.

| MathJax notation | Native construction |
| --- | --- |
| `top`, `right`, `bottom`, `left` | Border on the named edge |
| `actuarial` | Top and right borders |
| `madruwb` | Bottom and right borders |
| `box` | Four straight borders |
| `roundedbox` | Four borders and a padding-relative radius |
| `circle` | Four borders with `border-radius:50%` (an ellipse for wide content) |
| `longdiv` (also the default) | Top border and a curved right border at the left edge |
| `radical` | Core `msqrt` containing the original content |
| `phasorangle` | Bottom border and an ascending stroke at the left edge |
| `updiagonalstrike`, `downdiagonalstrike` | Ascending/descending CSS stroke |
| `horizontalstrike`, `verticalstrike` | Horizontal/vertical CSS stroke |
| `uparrow`, `downarrow`, `updownarrow` | Vertical stroke with top/bottom/both heads |
| `leftarrow`, `rightarrow`, `leftrightarrow` | Horizontal stroke with left/right/both heads |
| `updiagonalarrow`, `northeastarrow` | Ascending stroke with northeast head |
| `southwestarrow` | Ascending stroke with southwest head |
| `southeastarrow`, `northwestarrow` | Descending stroke with the selected head |
| `northeastsouthwestarrow`, `northwestsoutheastarrow` | Selected diagonal with both heads |

`\cancel`, `\bcancel`, `\xcancel`, `\cancelto`, `\boxed` and `\enclose` use
these rules. `cancelto` keeps its superscript value and replaces only its
enclosure. `data-padding`, `data-thickness`, `data-arrowhead`, color and background
remain inputs to native drawing. The defaults are MathJax's `.2em` padding and
`.067em` stroke. Unknown notations draw no decoration.

### Bbox padding and frames

MathJax output for `\bbox[3px,border:2px solid red]{x+y}`:

```xml
<mstyle style="border:2px solid red"><mpadded height="+3px" depth="+3px" lspace="3px" width="+6px"><mi>x</mi><mo>+</mo><mi>y</mi></mpadded></mstyle>
```

Native output:

```xml
<mstyle style="border:2px solid red"><mrow data-flashmath-bbox="true" style="padding:3px"><mi>x</mi><mo>+</mo><mi>y</mi></mrow></mstyle>
```

Core does not interpret MathJax's relative `+height`/`+width` padding syntax in the
same way. CSS padding lets the background and border surround the complete
content. Only parser-created bbox padding is rewritten, using private WeakMap
provenance. A user-created `mpadded` with matching attributes is preserved. `mu`
is converted to `em` at 18mu per em. The existing style/background wrapper is kept.

### Equation numbers

MathJax output:

```xml
<mtable displaystyle="true"><mlabeledtr><mtd id="mjx-eqn:A"><mtext>(A)</mtext></mtd><mtd><mi>x</mi></mtd></mlabeledtr></mtable>
```

Native output uses a Core `mrow` with `display:inline-grid`. Each former cell is
a `mrow` with explicit grid row/column and alignment. The template is:

```css
grid-template-columns: minmax(max-content,1fr) repeat(N,max-content) minmax(max-content,1fr);
align-items: baseline;
```

The middle columns preserve shared `align` columns across rows. Equal flexible
edge columns center the equations; tags occupy the requested outside edge. A row
without a number still gets the same column positions. Numbered display math
occupies its container's width. IDs and tag content are moved once, not duplicated
inside a phantom. `tagSide: 'left'` also applies to equation environments whose
upstream table omits a `side` attribute.

`mlabeledtr` is outside Core. In Chromium, changing MathML table-specific elements
directly to a CSS grid can make their cells disappear; the native grid therefore
uses `mrow` elements throughout. This is a display conversion and does not change
the MathJax-mode table or numbering semantics.

### Proof rules and table borders

MathJax output:

```xml
<mtable rowlines="solid" semantics="bspr_inferenceRule:down"><mtr><mtd>premises</mtd></mtr><mtr><mtd>conclusion</mtd></mtr></mtable>
```

Native output for proof tables uses a Core `mrow` grid. The conclusion's full-width
cell gets `border-top:.067em solid currentColor` and an inner grid that centers the
real conclusion. `dashed` becomes a dashed border; `none` has no border. Upward
proofs keep their row order. Nested rules and label nodes remain attached to their
original content. Compact math style preserves the original table style.

For other tables, `rowlines`, `columnlines` and `frame` become CSS borders on the
existing cells/table. Alignment and spacing are expressed as CSS. Space-separated
line lists repeat their final value as MathJax does. Core reserves the legacy line
attributes but does not draw the rules. The translated attributes are removed so
the conversion is idempotent.

### Centered overlays

MathJax output for `\centernot{=}` has a visible base followed by two zero-width
`mpadded` nodes with `lspace="-.5width"`, plus a phantom copy of the base.

Native output has a grid with both base and overlay in `grid-area:1 / 1`, aligned
on their math baselines. The overlay has zero layout width and a half-width CSS
translation; it is centered without widening the base. The original base remains
visible once; the phantom is removed. Core cannot evaluate the legacy `width`
reference in `lspace`. Only this complete construction is recognized, so ordinary
`mpadded` remains intact. The same rule handles `\centerOver`.

### Variants and physics

MathJax output / native output examples:

| MathJax subtree | Native subtree | Reason |
| --- | --- | --- |
| `<mi mathvariant="bold">a</mi>` | `<mi mathvariant="normal">𝐚</mi>` | Core only implements normal/italic `mi` variant selection |
| `<mi mathvariant="bold-italic">a</mi>` | `<mi mathvariant="normal">𝒂</mi>` | Explicit Unicode bold italic |
| `<mi mathvariant="double-struck">C</mi>` | `<mi mathvariant="normal">ℂ</mi>` | Letterlike-symbol hole in the mathematical alphabet |
| `<mi mathvariant="-tex-calligraphic">O</mi>` | `<mi mathvariant="normal">𝒪</mi>` | Physics `\order` uses the script capital O |
| `<mtext mathvariant="monospace">a%{b}</mtext>` | `<mtext style="font-family:monospace">a%{b}</mtext>` | Keep verbatim text codepoints and copying behavior |

Latin, Greek, digits, the Letterlike Symbols holes, inherited styles and inner
normal overrides are handled. Unsupported characters fall through MathJax's
variant inheritance (e.g. script Greek to italic Greek). Internal TeX calligraphic
uses script capitals and italic lowercase, while `\mathscr` uses the Unicode
script alphabet. Digits/symbols with no applicable Unicode form use CSS font
weight/style as appropriate. `mi mathvariant="normal"` prevents a browser from
applying a second automatic italic transform to an already styled codepoint.

### Chemical font slots

The earlier native mhchem conversion is retained: parser-created PUA arrow slots
become Unicode arrows or Core `mover`/`munder` compositions. MathJax-only label
struts are removed, and isotope prescripts become `mmultiscripts`. Literal PUA
input is preserved. See [the chemical output rules](packages-pkg-chem.md).

The SVG reference loads the official mhchem font extension 4.1.3. Its pinned
source and license live under `bench/native-render/reference-font`; production
code does not import that extension. A reference without it produces invalid
variant warnings and is unsuitable for visual comparison.

### Stretching overlines

MathJax output uses `<mover>…<mo accent="true">―</mo></mover>` with U+2015.
Native output uses a positioned Core `mrow` containing the original base and an
empty `aria-hidden` row with `border-top:.04em solid currentColor`, plus `.1em`
clearance above the base. Under-accents use the bottom edge. Literal horizontal
bar input stays unchanged.

Core's operator dictionary includes U+203E as a horizontal stretching operator
and does not include U+2015. Substituting U+203E, even with explicit `stretchy`
and postfix form, still left a 9.59px accent over a 65.06px base in the tested
Chromium/font combination. That rejected attempt is saved in
`overline-rejected-substitution.json`; CSS drawing avoids that dependency. This
additional defect was found by visually reviewing `core-8`; the geometry gate now
requires the accent to span the complete base.

## Reproduction and evidence

```sh
node node_modules/typescript/bin/tsc -p tsconfig.json
node bench/native-render/compare.mjs
node bench/native-render/screen.mjs
node bench/native-render/verify-screen.mjs
node bench/native-render/final-gate.mjs
```

`before.html` contains the native/React strings captured from base revision
`0ba4bef1a9edbe3125616edfb6691e695bd74b34`. `compare.mjs --before` reuses those
frozen strings and regenerates only the SVG references. The after page uses the
current implementation. Both pages have the same 195 expressions and layout.
The generator rejects parser errors; the browser runner rejects invisible math,
runtime exceptions and SSR/string geometry differences. Every group is captured
in legible screenshot panels. The source selector is exercised with Chromium
keyboard input, switching React SSR → string output → React SSR.

The feature-specific geometry checks and their measured results are in
`bench/native-render/visual-checks.json` and the following table. Screenshots are
reviewed separately; geometry alone is not evidence of matching glyph design.

<!-- measured-results -->

| Group | Formulas | Geometry/feature checks | Failures |
| --- | ---: | ---: | ---: |
| enclose | 87 | 366 | 0 |
| cancel | 12 | 54 | 0 |
| frames | 6 | 20 | 0 |
| tags | 14 | 68 | 0 |
| proofs | 12 | 62 | 0 |
| overlap | 12 | 48 | 0 |
| variants | 24 | 48 | 0 |
| physics | 8 | 16 | 0 |
| chemistry | 10 | 20 | 0 |
| core | 10 | 22 | 0 |

Browser: Chrome/153.0.8010.36. All 195 SSR/string pairs have identical measured geometry.

## Verification limits

Font-dependent metric and glyph differences described above remain. Existing
MathJax-mode disagreements on a few nonfixture proof/custom-frame combinations
are recorded in `visual-checks.json`; native display work does not rewrite the
conformance snapshots to hide them. Full fixture acceptance remains exactly
2635 matched, 0 mismatched, 48 unsupported out of 2683 records.
