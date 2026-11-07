# Hardening benchmark

Node v26.12.1, AMD Ryzen 5 3600 6-Core Processor, linux/x64. MathJax 4.1.3; Temml 0.14.0; flashmath 0.1.0.

Alternating fresh processes; 9 cold processes per engine, warm 5 processes x 7 samples; 100 warmup corpus passes and 20 timed passes/sample. p50/p95 nearest rank. Native default flashmath output. Reused flashmath sessions and MathJax documents reset on Declare*/newcommand/newenvironment inputs, with setup included in conversion time; otherwise document state persists. ignoreDuplicateLabels=true in both engines. Outputs are validated before and after warmup. Temml accepted subsets replayed identically by every engine.

Raw samples: [hardening-benchmark.raw.json](hardening-benchmark.raw.json). Full p50/p95 and cohort sizes: [hardening-benchmark.json](hardening-benchmark.json). Corpus and runners: ../hardening/{bench-corpus.json,bench-worker.mjs,bench-driver.mjs}.

Stateless beats MathJax in 36/36 full groups (minimum 6.05x), and Temml in 22/22 accepted cohorts (minimum 1.14x). Temml cannot render any input in the remaining groups; no throughput comparison is claimed there.

Warm microseconds/expression, p50. Temml partial rows measure fewer expressions; only the common-input table below directly compares those rows.

| Group | Inputs | Stateless | Session | MathJax | Temml | Temml accepted |
|---|---:|---:|---:|---:|---:|---:|
| bench12 | 12 | 11.57 | 10.45 | 216.66 | 19.29 | 12/12 |
| base | 10 | 25.46 | 23.34 | 410.18 | 39.61 | 10/10 |
| newcommand | 10 | 10.96 | 10.34 | 201.38 | 16.84 | 6/10 |
| ams | 10 | 30.72 | 29.01 | 380.30 | 50.64 | 10/10 |
| amscd | 10 | 24.71 | 22.65 | 376.25 | 41.18 | 10/10 |
| mathtools | 10 | 35.07 | 32.07 | 429.04 | 41.66 | 6/10 |
| physics | 10 | 38.54 | 34.50 | 518.93 | 71.48 | 9/10 |
| braket | 10 | 13.99 | 12.80 | 240.84 | 43.50 | 10/10 |
| cancel | 10 | 14.38 | 13.17 | 109.56 | 23.77 | 10/10 |
| bbox | 10 | 6.67 | 5.63 | 75.33 | — | 0/10 |
| enclose | 10 | 11.95 | 10.40 | 72.36 | — | 0/10 |
| centernot | 10 | 15.01 | 13.51 | 276.63 | — | 0/10 |
| boldsymbol | 10 | 8.60 | 7.34 | 88.00 | 10.65 | 10/10 |
| mhchem | 10 | 94.81 | 90.34 | 816.13 | 108.10 | 10/10 |
| extpfeil | 10 | 12.86 | 11.72 | 189.36 | 17.97 | 10/10 |
| action | 10 | 8.07 | 7.01 | 116.99 | — | 0/10 |
| bbm | 10 | 7.88 | 6.67 | 66.60 | — | 0/10 |
| bboldx | 10 | 7.36 | 6.20 | 74.16 | 9.75 | 3/10 |
| color | 10 | 8.09 | 6.68 | 76.91 | 12.78 | 8/10 |
| colortbl | 10 | 21.17 | 18.57 | 196.95 | — | 0/10 |
| colorv2 | 10 | 6.20 | 5.07 | 89.24 | 12.66 | 10/10 |
| dsfont | 10 | 7.77 | 6.59 | 75.98 | — | 0/10 |
| empheq | 10 | 89.64 | 85.39 | 962.22 | — | 0/10 |
| cases | 10 | 124.75 | 117.14 | 1340.27 | — | 0/10 |
| gensymb | 10 | 4.76 | 3.76 | 70.30 | 7.33 | 2/10 |
| html | 10 | 5.70 | 4.56 | 56.71 | — | 0/10 |
| textmacros | 10 | 10.71 | 8.84 | 86.19 | 16.11 | 10/10 |
| begingroup | 10 | 8.28 | 7.22 | 95.80 | 10.35 | 9/10 |
| noundefined | 10 | 5.18 | 4.21 | 79.39 | — | 0/10 |
| setoptions | 10 | 21.09 | 18.46 | 148.02 | — | 0/10 |
| tagformat | 10 | 27.43 | 26.31 | 217.91 | 37.51 | 10/10 |
| textcomp | 10 | 5.08 | 3.70 | 38.19 | 8.24 | 3/10 |
| unicode | 10 | 5.65 | 4.33 | 49.57 | — | 0/10 |
| units | 10 | 8.87 | 7.83 | 109.62 | — | 0/10 |
| upgreek | 10 | 5.78 | 4.80 | 82.17 | 21.14 | 8/10 |
| verb | 10 | 5.55 | 4.41 | 51.82 | 6.35 | 9/10 |

Partial Temml cohorts, identical accepted inputs for all engines (µs/expression, p50):

| Group | Inputs | Stateless | Session | MathJax | Temml |
|---|---:|---:|---:|---:|---:|
| newcommand | 6 | 9.50 | 8.64 | 148.70 | 16.84 |
| mathtools | 6 | 27.75 | 24.62 | 402.29 | 41.66 |
| physics | 9 | 34.14 | 33.70 | 484.51 | 71.48 |
| bboldx | 3 | 7.00 | 5.77 | 59.86 | 9.75 |
| color | 8 | 7.48 | 6.23 | 78.53 | 12.78 |
| gensymb | 2 | 4.40 | 3.44 | 62.83 | 7.33 |
| begingroup | 9 | 8.38 | 7.73 | 90.71 | 10.35 |
| textcomp | 3 | 4.82 | 3.53 | 37.45 | 8.24 |
| upgreek | 8 | 5.62 | 4.62 | 82.06 | 21.14 |
| verb | 9 | 5.55 | 4.37 | 51.29 | 6.35 |

Cold milliseconds, p50 / p95, independent fresh processes:

| Engine | Import + setup → first string | First conversion | First bench12 pass |
|---|---:|---:|---:|
| flashmath | 27.17 / 29.05 | 2.32 / 2.36 | 5.15 / 5.78 |
| session | 27.31 / 28.97 | 1.72 / 2.03 | 5.05 / 7.34 |
| mathjax | 69.05 / 70.46 | 1.56 / 2.02 | 15.27 / 15.63 |
| temml | 20.66 / 21.80 | 2.26 / 2.43 | 4.92 / 6.30 |

Import timing starts immediately before dynamic import, includes parser/document setup and first serialization, and excludes Node process bootstrap. Corpus JSON loading is excluded from this column. This is machine-specific evidence, not a universal ranking.
