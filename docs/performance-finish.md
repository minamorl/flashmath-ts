# Finish performance investigation

The target is lower time than Temml on every accepted cohort. Final full-run
result: 22/22 Temml cohorts;
36/36 full MathJax groups.
Every comparable Temml cohort was faster in this run; this is not a universal ranking.
Remaining slower cohorts: none.

## Measured causes and changes

The readable-source CPU profile puts serialization, XML escaping and native
lowering among the leading sampled costs; option key construction and deep
option copying also consume samples. The diagnostic source-stage probe reports
boldsymbol configure/parse/native/serialize costs of
4.64 / 8.30 / 4.66 / 2.31 µs.
These source/tsx numbers include stage clocks and JIT and are diagnostic only.
They cannot be subtracted from the bundled cross-engine timings.

The changes remove serializer chunk arrays, avoid XML replacement on plain
strings, construct option keys without intermediate tagged trees, copy options
without entries/map/fromEntries arrays, avoid stateless session closures and
an extra options spread, reuse postorder jobs, and map Unicode variants without
Array.from/join. No expression or output cache is used; mutated options and
independent parser state retain their tests.

Focused before/after bundled-runtime medians (15 alternating samples, 100 timed
passes/sample, identical Temml-accepted inputs) are below. This probe is smaller
than the final 5-process release benchmark and ran at a different time. The
focused baseline was captured during native finishing and also predates the
final harpoon box-allocation correction; this is not a per-change ablation. Use
the full benchmark for the release ranking.

| Group | Before flashmath µs | After flashmath µs | Temml after µs |
| --- | ---: | ---: | ---: |
| boldsymbol | 14.31 | 11.27 | 10.18 |
| mhchem | 93.30 | 86.69 | 106.02 |
| extpfeil | 16.64 | 13.62 | 18.11 |
| tagformat | 36.81 | 28.66 | 36.54 |

Boldsymbol must parse and expose a MathJax-compatible tree, walk its argument to
apply bold variants, then lower variants to Unicode/CSS and serialize the native
tree. Native lowering is a measured cost. Temml also builds MathML from its own
parse tree (installed temml/src/buildMathML.js and mathMLTree.js); no equivalent
stage-by-stage Temml ablation was performed. Flashmath's compatibility/native
boundary is a candidate for its short-expression overhead, not an established
cause of every remaining ranking difference. Removing that boundary requires
a larger parser/output redesign; this candidate reports the actual slower
cohorts instead of claiming that the residual cost has been eliminated. Chemistry
also runs a grammar translator before TeX parsing; tagformat lowers numbered
rows to CSS; extended arrows build padded labels. The full results decide their
ranks rather than these explanations.

Raw evidence: ../bench/release/performance-{before,after,stages}.json and the
full ../bench/flashmath/hardening-benchmark.{json,raw.json,md}.
