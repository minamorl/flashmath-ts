# @minamorl/flashmath 0.1.0 local release candidate

Implemented: merged hardening a64f03f and native-render 5a6a8b2; preserved
shared runtime/cache/distribution and native MathML Core/CSS; corrected sequent
alignment, renewed fCenter and left equation tag attributes; supplied distinct
original NewCM calligraphic/script faces and an exported fonts.css; enforced
zero strict MathJax differences in the Chromium corpus.

Reproduce: `node bench/release/verify.mjs`. Raw commands and exit codes:
[checks.json](checks.json). Raw combined output: [gate.log](gate.log).
Per-check logs are adjacent. Conformance's exit 1 is expected only after exact
2635/0/48 and baseline ID/status checks. Fixture extraction, normalization and
lockfile remain unchanged.

Candidate: [minamorl-flashmath-0.1.0.tgz](minamorl-flashmath-0.1.0.tgz); packed 167510 bytes;
unpacked 489504 bytes. Full contents: [tarball-files.txt](tarball-files.txt).
Integrity: `sha512-ZbiSXhnl0ltX6JvuJu8ED/EbyXLZv3Ci7EMuRbggls04+cNBDcA6J3K38y+l2pmLlfW7ltu9IbMKhl/B5oJJVQ==`.
The extracted core works with React absent; the React entry and SSR work after
linking the locked React 19.2.4 peers into the temporary consumer directory.

screen_run: Chrome/153.0.8010.36 opened after.html; keyboard switched React SSR
→ string output → React SSR; measured 195 formulas and 724 feature checks;
SSR/string geometry equal. Actual MathJax MathML comparison has no differences.
The variant/tag/proof panels were also directly inspected with view_image;
visual-review.json records their hashes. Pixel identity is not claimed.

Limitations: fonts.css is required for deterministic calligraphic/script
separation. Other native glyph metrics/oldstyle digits/strokes still differ
from MathJax SVG; only the recorded Chromium/font combination was exercised.
Stateless beats MathJax in 36/36 measured groups and Temml in 17/22 comparable
cohorts. Universal fastest performance is not achieved. No general SVG output
or MathJax component typesetting pipeline is claimed.

Delivery: original Git metadata is read-only. The private .release-git contains
local phase commits; release.bundle delivers the commits from a64f03f through
the final release tip, including native branch history. This private Git
directory is excluded from commits and npm artifacts. No push, external
transmission or npm publish was run. Independent root verification is pending.

Review checkpoint (before expensive execution): inspect oracle completeness,
strict zero-difference checks, and declaration reset/duplicate-label benchmark
conditions against raw outputs; the review broker was explicitly disabled.
Review checkpoint (before external delivery): inspect the exact tarball list,
integrity, scope/name and extracted consumer results; no external delivery ran.
Review checkpoint (before final acceptance): inspect source/diff, the 2635/0/48
per-ID gate, independent corpus, screenshots, benchmark limitations and bundle.
