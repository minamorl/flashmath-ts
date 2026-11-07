# Hardening benchmark

Node v26.12.1, AMD Ryzen 5 3600 6-Core Processor, linux/x64. MathJax 4.1.3; Temml 0.14.0; flashmath 0.1.0.

Alternating fresh processes; 9 cold processes per engine, warm 5 processes x 7 samples; 100 warmup corpus passes and 20 timed passes/sample. p50/p95 nearest rank. Native default flashmath output. Reused flashmath sessions and MathJax documents reset on Declare*/newcommand/newenvironment inputs, with setup included in conversion time; otherwise document state persists. ignoreDuplicateLabels=true in both engines. Outputs are validated before and after warmup. Temml accepted subsets replayed identically by every engine.

Raw samples: [hardening-benchmark.raw.json](hardening-benchmark.raw.json). Full p50/p95 and cohort sizes: [hardening-benchmark.json](hardening-benchmark.json). Corpus and runners: ../hardening/{bench-corpus.json,bench-worker.mjs,bench-driver.mjs}.

Stateless beats MathJax in 36/36 full groups (minimum 5.98x), and Temml in 22/22 accepted cohorts (minimum 1.09x). Temml cannot render any input in the remaining groups; no throughput comparison is claimed there.

Warm microseconds/expression, p50. Temml partial rows measure fewer expressions; only the common-input table below directly compares those rows.

| Group | Inputs | Stateless | Session | MathJax | Temml | Temml accepted |
|---|---:|---:|---:|---:|---:|---:|
| bench12 | 12 | 11.25 | 10.25 | 220.75 | 18.53 | 12/12 |
| base | 10 | 25.42 | 23.47 | 402.75 | 37.72 | 10/10 |
| newcommand | 10 | 10.68 | 10.45 | 199.70 | 15.31 | 6/10 |
| ams | 10 | 29.61 | 28.62 | 378.03 | 46.64 | 10/10 |
| amscd | 10 | 23.87 | 22.58 | 376.01 | 39.71 | 10/10 |
| mathtools | 10 | 34.37 | 31.44 | 426.86 | 38.82 | 6/10 |
| physics | 10 | 37.28 | 34.68 | 506.55 | 65.92 | 9/10 |
| braket | 10 | 14.03 | 12.87 | 232.88 | 39.06 | 10/10 |
| cancel | 10 | 14.32 | 13.03 | 96.39 | 22.37 | 10/10 |
| bbox | 10 | 6.71 | 5.56 | 75.14 | — | 0/10 |
| enclose | 10 | 11.64 | 10.18 | 69.61 | — | 0/10 |
| centernot | 10 | 14.77 | 13.10 | 271.95 | — | 0/10 |
| boldsymbol | 10 | 8.42 | 6.94 | 87.25 | 9.87 | 10/10 |
| mhchem | 10 | 93.05 | 90.65 | 815.86 | 101.72 | 10/10 |
| extpfeil | 10 | 12.98 | 11.82 | 186.08 | 17.04 | 10/10 |
| action | 10 | 8.15 | 7.02 | 108.70 | — | 0/10 |
| bbm | 10 | 7.78 | 6.61 | 65.97 | — | 0/10 |
| bboldx | 10 | 7.40 | 6.12 | 73.59 | 8.96 | 3/10 |
| color | 10 | 8.11 | 6.75 | 81.25 | 12.15 | 8/10 |
| colortbl | 10 | 20.83 | 18.59 | 195.73 | — | 0/10 |
| colorv2 | 10 | 6.14 | 5.02 | 99.13 | 12.00 | 10/10 |
| dsfont | 10 | 7.73 | 6.57 | 74.72 | — | 0/10 |
| empheq | 10 | 87.47 | 83.87 | 976.42 | — | 0/10 |
| cases | 10 | 122.70 | 118.09 | 1347.03 | — | 0/10 |
| gensymb | 10 | 4.75 | 3.72 | 77.53 | 7.19 | 2/10 |
| html | 10 | 5.60 | 4.49 | 57.35 | — | 0/10 |
| textmacros | 10 | 9.33 | 6.52 | 85.03 | 14.99 | 10/10 |
| begingroup | 10 | 8.30 | 7.30 | 103.50 | 10.01 | 9/10 |
| noundefined | 10 | 5.21 | 4.18 | 77.46 | — | 0/10 |
| setoptions | 10 | 21.28 | 18.36 | 151.15 | — | 0/10 |
| tagformat | 10 | 26.39 | 25.62 | 217.12 | 35.07 | 10/10 |
| textcomp | 10 | 5.12 | 3.77 | 39.23 | 7.93 | 3/10 |
| unicode | 10 | 5.66 | 4.35 | 49.40 | — | 0/10 |
| units | 10 | 8.94 | 7.70 | 107.82 | — | 0/10 |
| upgreek | 10 | 5.81 | 4.77 | 84.92 | 20.29 | 8/10 |
| verb | 10 | 5.53 | 4.42 | 52.23 | 6.25 | 9/10 |

Partial Temml cohorts, identical accepted inputs for all engines (µs/expression, p50):

| Group | Inputs | Stateless | Session | MathJax | Temml |
|---|---:|---:|---:|---:|---:|
| newcommand | 6 | 9.47 | 8.55 | 149.38 | 15.31 |
| mathtools | 6 | 27.90 | 24.47 | 390.32 | 38.82 |
| physics | 9 | 33.82 | 32.62 | 476.06 | 65.92 |
| bboldx | 3 | 7.00 | 5.78 | 60.35 | 8.96 |
| color | 8 | 7.51 | 6.23 | 77.74 | 12.15 |
| gensymb | 2 | 4.44 | 3.35 | 64.75 | 7.19 |
| begingroup | 9 | 8.50 | 7.57 | 92.70 | 10.01 |
| textcomp | 3 | 4.87 | 3.56 | 38.81 | 7.93 |
| upgreek | 8 | 5.62 | 4.58 | 83.44 | 20.29 |
| verb | 9 | 5.47 | 4.36 | 52.29 | 6.25 |

Cold milliseconds, p50 / p95, independent fresh processes:

| Engine | Import + setup → first string | First conversion | First bench12 pass |
|---|---:|---:|---:|
| flashmath | 26.77 / 27.32 | 2.30 / 2.43 | 5.11 / 5.80 |
| session | 26.88 / 27.74 | 1.69 / 2.00 | 4.90 / 5.54 |
| mathjax | 67.81 / 69.34 | 1.60 / 1.64 | 15.34 / 15.65 |
| temml | 20.37 / 20.69 | 2.17 / 2.19 | 4.92 / 5.22 |

Import timing starts immediately before dynamic import, includes parser/document setup and first serialization, and excludes Node process bootstrap. Corpus JSON loading is excluded from this column. This is machine-specific evidence, not a universal ranking.
