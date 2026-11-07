# Hardening benchmark

Node v26.12.1, AMD Ryzen 5 3600 6-Core Processor, linux/x64. MathJax 4.1.3; Temml 0.14.0; flashmath 0.1.0.

Alternating fresh processes; 9 cold processes per engine, warm 5 processes x 7 samples; 100 warmup corpus passes and 20 timed passes/sample. p50/p95 nearest rank. Native default flashmath output. Reused flashmath sessions and MathJax documents reset on Declare*/newcommand/newenvironment inputs, with setup included in conversion time; otherwise document state persists. ignoreDuplicateLabels=true in both engines. Outputs are validated before and after warmup. Temml accepted subsets replayed identically by every engine.

Raw samples: [hardening-benchmark.raw.json](hardening-benchmark.raw.json). Full p50/p95 and cohort sizes: [hardening-benchmark.json](hardening-benchmark.json). Corpus and runners: ../hardening/{bench-corpus.json,bench-worker.mjs,bench-driver.mjs}.

Stateless beats MathJax in 36/36 full groups (minimum 5.98x), and Temml in 22/22 accepted cohorts (minimum 1.05x). Temml cannot render any input in the remaining groups; no throughput comparison is claimed there.

Warm microseconds/expression, p50. Temml partial rows measure fewer expressions; only the common-input table below directly compares those rows.

| Group | Inputs | Stateless | Session | MathJax | Temml | Temml accepted |
|---|---:|---:|---:|---:|---:|---:|
| bench12 | 12 | 13.40 | 12.11 | 237.06 | 20.48 | 12/12 |
| base | 10 | 26.79 | 26.68 | 436.93 | 41.44 | 10/10 |
| newcommand | 10 | 11.00 | 11.59 | 212.45 | 17.17 | 6/10 |
| ams | 10 | 31.20 | 30.93 | 403.75 | 52.43 | 10/10 |
| amscd | 10 | 24.46 | 23.04 | 398.44 | 42.48 | 10/10 |
| mathtools | 10 | 35.45 | 36.10 | 476.02 | 42.49 | 6/10 |
| physics | 10 | 37.62 | 38.74 | 564.15 | 71.11 | 9/10 |
| braket | 10 | 16.42 | 14.10 | 256.72 | 41.74 | 10/10 |
| cancel | 10 | 16.88 | 15.33 | 114.26 | 25.15 | 10/10 |
| bbox | 10 | 6.71 | 6.42 | 91.85 | — | 0/10 |
| enclose | 10 | 12.39 | 13.50 | 74.14 | — | 0/10 |
| centernot | 10 | 16.30 | 16.76 | 307.92 | — | 0/10 |
| boldsymbol | 10 | 10.48 | 9.26 | 88.83 | 11.14 | 10/10 |
| mhchem | 10 | 102.95 | 103.48 | 935.08 | 107.87 | 10/10 |
| extpfeil | 10 | 14.16 | 13.98 | 208.84 | 18.84 | 10/10 |
| action | 10 | 9.81 | 8.03 | 126.09 | — | 0/10 |
| bbm | 10 | 8.25 | 7.74 | 79.76 | — | 0/10 |
| bboldx | 10 | 8.17 | 6.64 | 85.87 | 9.90 | 3/10 |
| color | 10 | 9.74 | 7.63 | 97.69 | 13.18 | 8/10 |
| colortbl | 10 | 23.57 | 21.51 | 215.36 | — | 0/10 |
| colorv2 | 10 | 6.64 | 5.79 | 108.29 | 13.60 | 10/10 |
| dsfont | 10 | 9.07 | 7.33 | 95.46 | — | 0/10 |
| empheq | 10 | 86.60 | 94.62 | 1074.78 | — | 0/10 |
| cases | 10 | 118.85 | 127.01 | 1456.81 | — | 0/10 |
| gensymb | 10 | 4.95 | 4.58 | 81.97 | 7.87 | 2/10 |
| html | 10 | 5.69 | 5.67 | 73.45 | — | 0/10 |
| textmacros | 10 | 10.67 | 6.99 | 93.10 | 16.47 | 10/10 |
| begingroup | 10 | 8.34 | 9.03 | 107.71 | 10.76 | 9/10 |
| noundefined | 10 | 5.08 | 4.46 | 79.82 | — | 0/10 |
| setoptions | 10 | 22.61 | 21.75 | 155.54 | — | 0/10 |
| tagformat | 10 | 28.24 | 27.21 | 235.82 | 38.96 | 10/10 |
| textcomp | 10 | 5.33 | 4.28 | 39.46 | 9.30 | 3/10 |
| unicode | 10 | 5.91 | 4.87 | 53.14 | — | 0/10 |
| units | 10 | 8.76 | 8.84 | 124.23 | — | 0/10 |
| upgreek | 10 | 5.58 | 5.53 | 91.92 | 21.32 | 8/10 |
| verb | 10 | 6.41 | 5.05 | 66.79 | 6.75 | 9/10 |

Partial Temml cohorts, identical accepted inputs for all engines (µs/expression, p50):

| Group | Inputs | Stateless | Session | MathJax | Temml |
|---|---:|---:|---:|---:|---:|
| newcommand | 6 | 9.71 | 9.26 | 175.04 | 17.17 |
| mathtools | 6 | 28.80 | 28.03 | 415.76 | 42.49 |
| physics | 9 | 34.88 | 35.79 | 527.04 | 71.11 |
| bboldx | 3 | 7.51 | 6.53 | 73.66 | 9.90 |
| color | 8 | 9.27 | 7.02 | 101.60 | 13.18 |
| gensymb | 2 | 4.42 | 3.58 | 66.15 | 7.87 |
| begingroup | 9 | 8.77 | 9.11 | 108.97 | 10.76 |
| textcomp | 3 | 4.81 | 3.98 | 42.82 | 9.30 |
| upgreek | 8 | 6.05 | 5.09 | 100.19 | 21.32 |
| verb | 9 | 5.41 | 4.65 | 67.41 | 6.75 |

Cold milliseconds, p50 / p95, independent fresh processes:

| Engine | Import + setup → first string | First conversion | First bench12 pass |
|---|---:|---:|---:|
| flashmath | 27.59 / 32.20 | 2.37 / 3.51 | 5.49 / 7.53 |
| session | 27.55 / 31.29 | 1.70 / 2.04 | 5.21 / 5.83 |
| mathjax | 68.61 / 72.77 | 1.57 / 1.80 | 15.72 / 16.57 |
| temml | 20.55 / 21.45 | 2.18 / 2.24 | 4.81 / 5.72 |

Import timing starts immediately before dynamic import, includes parser/document setup and first serialization, and excludes Node process bootstrap. Corpus JSON loading is excluded from this column. This is machine-specific evidence, not a universal ranking.
