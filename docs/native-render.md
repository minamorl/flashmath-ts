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
identical spacing or metrics. For distinct MathJax calligraphic/script glyphs,
load `@minamorl/flashmath/fonts.css`. It supplies four unmodified NewCM 4.1.3
WOFF2 faces (regular/bold calligraphic and script). The native output selects
those families with inline CSS; without this optional stylesheet, font fallback
is browser-dependent and the two styles may not remain distinct. The comparison
page loads this stylesheet. Uppercase calligraphic uses the original font's A–Z
cmap; script uses Unicode script codepoints. No MathJax JavaScript is loaded by
the package. Other alphabets, digits and symbols still depend on native fallback.

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
| `<mi mathvariant="-tex-calligraphic">O</mi>` | `<mi mathvariant="normal" style="font-family:…">O</mi>` | NewCM calligraphic face, including physics `\order` |
| `<mtext mathvariant="monospace">a%{b}</mtext>` | `<mtext style="font-family:monospace">a%{b}</mtext>` | Keep verbatim text codepoints and copying behavior |

Latin, Greek, digits, the Letterlike Symbols holes, inherited styles and inner
normal overrides are handled. Unsupported characters fall through MathJax's
variant inheritance (e.g. script Greek to italic Greek). Internal TeX calligraphic
uses the NewCM calligraphic face for ASCII capitals and Unicode italic lowercase,
while `\mathscr` uses the separate NewCM script face and Unicode script alphabet. Digits/symbols with no applicable Unicode form use CSS font
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

### Annotated extensible arrows

AMS and mathtools x-arrow labels use MathJax's relative `mpadded` dimensions,
for example `width="+0.833em"`. MathML Core interprets that as an absolute width,
so the label can overflow its layout box and collide with the next term. Merely
adding `stretchy="true"` does not change the small label box used as the base
operator's stretch target. See Core's [mpadded parameters](https://www.w3.org/TR/mathml-core/#inner-box-and-requested-parameters)
and [inline stretching algorithm](https://www.w3.org/TR/mathml-core/#algorithm-for-stretching-operators-along-the-inline-axis).

Native output converts these parser-marked labels to natural-width `mrow`s with
the original left/right clearance expressed as `padding-inline`, and removes
MathJax's vertical label struts. Core lays out the actual annotations before
stretching the arrow to the widest one. Mathtools' annotated long arrows use the
corresponding short Unicode arrow with their original `minsize`, because the
tested native font does not assemble the long codepoints. Empty x-arrow labels,
ordinary arrows, literal long-arrow characters, user-created `mpadded` nodes,
and `output: 'mathjax'` keep their previous output. The existing mhchem/extpfeil
label conversion also retains horizontal clearance for nonempty annotations.

`node --test test/browser/native-xarrow.test.mjs` uses the same dependency-free Chromium
CDP approach as `screen.mjs`. It renders the reported Japanese chain, every AMS,
mathtools and extpfeil x-arrow with above/below annotations, scripts and fractions,
through React SSR and string output in inline/display math inside horizontal and
vertical text. Math remains horizontal inside the vertical text context.
It checks label/neighbor and label/arrow rectangles, SSR/string geometry, and
unannotated arrow geometry. Chromium reports an unstretched `mo` DOM advance even
when it paints an assembled arrow, so the test also measures the actual shaft's
pixels in a screenshot. Set `XARROW_ARTIFACT_DIR` to retain the page, measurements
and first screenshot panel. `XARROW_BASELINE=1` deliberately uses unlowered MathJax
markup as a negative control and must fail. CI installs DejaVu Math TeX Gyre and
Noto CJK for these checks; `CHROME_BIN` can override `/usr/bin/google-chrome`.

## Reproduction and evidence

```sh
node scripts/build.mjs
node bench/native-render/compare.mjs
node bench/native-render/screen.mjs
node bench/native-render/verify-screen.mjs
node bench/native-render/final-gate.mjs
```

`before.html` contains the native/React strings captured from base revision
`0ba4bef1a9edbe3125616edfb6691e695bd74b34`. `compare.mjs --before` reuses those
frozen strings and regenerates only the SVG references. The after page uses the
current implementation. The frozen page retains 195 expressions; the current page has 202, adding
wide chemical arrows, combined bonds, and left/right noLine proof labels.
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
| proofs | 16 | 88 | 0 |
| overlap | 12 | 48 | 0 |
| variants | 24 | 48 | 0 |
| physics | 8 | 16 | 0 |
| chemistry | 13 | 66 | 0 |
| core | 10 | 22 | 0 |
| polish | 9 | 22 | 0 |
| edge | 5 | 10 | 0 |
| mathtools-ce | 6 | 12 | 0 |

Browser: Chrome/153.0.8010.36. All 222 SSR/string pairs have identical measured geometry.

<!-- /measured-results -->












### Visual review of the captured panels

| Group | Observation |
| --- | --- |
| enclose | All 29 notations draw the requested edges, curves, radicals, strikes and arrow directions. Native strokes and metrics differ from SVG. |
| cancel | cancel, bcancel, xcancel and cancelto render strikes; the target value remains visible. Superscript offsets differ. |
| frames | Boxed formulas and padded bbox frames enclose the complete content; combined box/circle/strike and colors are visible. |
| tags | Left/right tags share the intended row and occupy the outside edge; align columns and unnumbered rows remain aligned. |
| proofs | Solid/dashed/noLine, upward/downward and nested proofs draw their rules with centered conclusions; labels remain attached. Vertical gaps differ. |
| overlap | Slash, star and fraction overlays are centered over the original base; fractions preserve the shared math baseline. |
| variants | Styled Unicode alphabets and digits render. Calligraphic/script use distinct bundled NewCM faces; sans/mono forms, oldstyle digits and Greek fallback appearance remain font-dependent. |
| physics | Bold/bold-italic vectors and script order/principal-value symbols are visible. Font shapes differ. |
| chemistry | Unicode arrows, equilibrium compositions, labels, bonds and prescripts render without PUA boxes. CSS bonds share line ends and fixed em spacing; asymmetric harpoons have independent long/short shafts. Rasterization still differs. |
| core | Ordinary arithmetic, fractions, radicals, sums, integrals, matrices, fences and scripts are visible. Overline core-8 now spans its whole base. Underbrace glyph shape and large-operator metrics differ. |

The finish pass directly re-opened chemistry panels and proofs-10/12 plus
left/right noLine variants. Its measured checks include bond ends, spacing and
math-axis height, harpoon shaft lengths and neighbour separation, and actual
proof-label content boxes. The earlier variant/tag review remains in
`bench/native-render/visual-review.json`. Every release panel is
regenerated and every formula measured by Chromium. Pixel parity: NOT ACHIEVED.

## Verification limits

Font-dependent metric and glyph differences described above remain. Existing
MathJax-mode structural differences in the 202-formula corpus are now zero;
`visual-checks.json` contains an empty referenceDifferences array, enforced by
the strict gate. Native pixel identity is not claimed. Full fixture acceptance remains exactly
2635 matched, 0 mismatched, 48 unsupported out of 2683 records.


### Strict reference gate in the release

`verify-screen.mjs` now rejects **any** normalized MathML difference between
`referenceMathML` (actual MathJax 4.1.3) and flashmath's `output: 'mathjax'`.
The former differences in frames-1 (boxed wrapper), tags-10 (left equation tag)
and proofs-9–12 (omitted noLine rowlines) are corrected. The permitted-difference
list is empty. Native pixels are still not asserted identical: this structural
gate and the 796 feature/geometry checks measure different properties.
The browser additionally verifies all four font faces loaded and compares
calligraphic/script raster fingerprints so the glyph-collapse issue cannot pass
on CSS names alone.

### React development checks

The comparison page loads a locally bundled development React client. It
hydrates all 202 comparison formulas and client-renders every executable
fixture plus three property regressions (2,638 formulas). console.error is
captured, and both warnings and recoverable hydration errors must be empty.
The selector is still switched by keyboard to string output and back to SSR,
with identical geometry required. Shared HTML/SVG React property names are
translated (className, htmlFor, fontFamily, etc.); empty href is omitted on the
React path. The underlying MathJax AST/string compatibility mode is unchanged.
