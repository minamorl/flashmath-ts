# Hardening benchmark

Node v26.12.1, AMD Ryzen 5 3600 6-Core Processor, linux/x64. MathJax 4.1.3; Temml 0.14.0; flashmath 0.1.0.

Alternating fresh processes; 9 cold processes per engine, warm 5 processes x 7 samples; 100 warmup corpus passes and 20 timed passes/sample. p50/p95 nearest rank. Native default flashmath output. Reused sessions retain their documented document state. Temml accepted subsets replayed identically by every engine.

Raw samples: [hardening-benchmark.raw.json](hardening-benchmark.raw.json). Full p50/p95 and cohort sizes: [hardening-benchmark.json](hardening-benchmark.json). Corpus and runners: ../hardening/{bench-corpus.json,bench-worker.mjs,bench-driver.mjs}.

Stateless beats MathJax in 36/36 full groups (minimum 5.93x), and Temml in 22/22 accepted cohorts (minimum 1.03x). Temml cannot render any input in the remaining groups; no throughput comparison is claimed there.

Warm microseconds/expression, p50. Temml partial rows measure fewer expressions; only the common-input table below directly compares those rows.

| Group | Inputs | Stateless | Session | MathJax | Temml | Temml accepted |
|---|---:|---:|---:|---:|---:|---:|
| bench12 | 12 | 14.56 | 11.34 | 215.45 | 20.21 | 12/12 |
| base | 10 | 24.87 | 22.78 | 459.50 | 40.97 | 10/10 |
| newcommand | 10 | 12.74 | 10.41 | 161.46 | 17.34 | 6/10 |
| ams | 10 | 33.79 | 31.93 | 421.60 | 51.98 | 10/10 |
| amscd | 10 | 28.74 | 25.36 | 426.36 | 44.73 | 10/10 |
| mathtools | 10 | 38.84 | 26.18 | 337.70 | 43.35 | 6/10 |
| physics | 10 | 37.18 | 33.59 | 561.00 | 72.79 | 9/10 |
| braket | 10 | 18.78 | 16.33 | 257.80 | 43.76 | 10/10 |
| cancel | 10 | 9.21 | 6.92 | 105.84 | 24.82 | 10/10 |
| bbox | 10 | 8.24 | 5.73 | 89.93 | — | 0/10 |
| enclose | 10 | 7.60 | 4.93 | 73.10 | — | 0/10 |
| centernot | 10 | 16.92 | 12.88 | 283.50 | — | 0/10 |
| boldsymbol | 10 | 9.03 | 6.61 | 84.47 | 10.90 | 10/10 |
| mhchem | 10 | 102.41 | 96.76 | 855.22 | 113.29 | 10/10 |
| extpfeil | 10 | 16.09 | 12.53 | 193.48 | 19.32 | 10/10 |
| action | 10 | 10.22 | 7.96 | 120.82 | — | 0/10 |
| bbm | 10 | 8.55 | 5.73 | 79.11 | — | 0/10 |
| bboldx | 10 | 7.92 | 5.30 | 80.81 | 9.91 | 3/10 |
| color | 10 | 11.61 | 7.45 | 78.65 | 13.49 | 8/10 |
| colortbl | 10 | 25.90 | 21.00 | 216.71 | — | 0/10 |
| colorv2 | 10 | 8.09 | 5.43 | 98.90 | 12.77 | 10/10 |
| dsfont | 10 | 8.64 | 5.97 | 89.12 | — | 0/10 |
| empheq | 10 | 71.44 | 69.15 | 809.66 | — | 0/10 |
| cases | 10 | 90.51 | 74.38 | 972.86 | — | 0/10 |
| gensymb | 10 | 7.13 | 5.16 | 94.59 | 7.65 | 2/10 |
| html | 10 | 7.36 | 5.00 | 61.39 | — | 0/10 |
| textmacros | 10 | 10.24 | 7.72 | 89.99 | 16.89 | 10/10 |
| begingroup | 10 | 10.09 | 11.48 | 257.53 | 10.88 | 9/10 |
| noundefined | 10 | 7.84 | 5.93 | 83.19 | — | 0/10 |
| setoptions | 10 | 21.44 | 18.30 | 160.64 | — | 0/10 |
| tagformat | 10 | 24.66 | 20.31 | 146.16 | 38.21 | 10/10 |
| textcomp | 10 | 6.32 | 4.07 | 39.90 | 8.46 | 3/10 |
| unicode | 10 | 7.58 | 4.88 | 51.77 | — | 0/10 |
| units | 10 | 10.97 | 9.35 | 130.28 | — | 0/10 |
| upgreek | 10 | 8.65 | 6.84 | 92.58 | 22.17 | 8/10 |
| verb | 10 | 6.13 | 4.15 | 55.50 | 6.61 | 9/10 |

Partial Temml cohorts, identical accepted inputs for all engines (µs/expression, p50):

| Group | Inputs | Stateless | Session | MathJax | Temml |
|---|---:|---:|---:|---:|---:|
| newcommand | 6 | 11.59 | 9.73 | 137.22 | 17.34 |
| mathtools | 6 | 33.95 | 30.18 | 417.00 | 43.35 |
| physics | 9 | 34.69 | 32.14 | 505.83 | 72.79 |
| bboldx | 3 | 7.57 | 5.18 | 59.36 | 9.91 |
| color | 8 | 9.52 | 6.91 | 88.73 | 13.49 |
| gensymb | 2 | 6.64 | 4.53 | 64.93 | 7.65 |
| begingroup | 9 | 10.33 | 8.04 | 76.58 | 10.88 |
| textcomp | 3 | 5.97 | 3.76 | 39.01 | 8.46 |
| upgreek | 8 | 8.34 | 6.53 | 84.40 | 22.17 |
| verb | 9 | 6.44 | 3.87 | 63.22 | 6.61 |

Cold milliseconds, p50 / p95, independent fresh processes:

| Engine | Import + setup → first string | First conversion | First bench12 pass |
|---|---:|---:|---:|
| flashmath | 26.41 / 31.97 | 2.66 / 4.50 | 5.73 / 6.87 |
| session | 24.57 / 28.19 | 1.63 / 2.14 | 5.17 / 6.23 |
| mathjax | 77.37 / 89.11 | 1.77 / 2.48 | 16.24 / 23.96 |
| temml | 22.37 / 25.63 | 2.24 / 2.79 | 5.31 / 6.46 |

Import timing starts immediately before dynamic import, includes parser/document setup and first serialization, and excludes Node process bootstrap. Corpus JSON loading is excluded from this column. This is machine-specific evidence, not a universal ranking.
