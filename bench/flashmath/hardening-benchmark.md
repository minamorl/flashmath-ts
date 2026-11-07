# Hardening benchmark

Node v26.12.1, AMD Ryzen 5 3600 6-Core Processor, linux/x64. MathJax 4.1.3; Temml 0.14.0; flashmath 0.1.0.

Alternating fresh processes; 9 cold processes per engine, warm 5 processes x 7 samples; 100 warmup corpus passes and 20 timed passes/sample. p50/p95 nearest rank. Native default flashmath output. Reused flashmath sessions and MathJax documents reset on Declare*/newcommand/newenvironment inputs, with setup included in conversion time; otherwise document state persists. ignoreDuplicateLabels=true in both engines. Outputs are validated before and after warmup. Temml accepted subsets replayed identically by every engine.

Raw samples: [hardening-benchmark.raw.json](hardening-benchmark.raw.json). Full p50/p95 and cohort sizes: [hardening-benchmark.json](hardening-benchmark.json). Corpus and runners: ../hardening/{bench-corpus.json,bench-worker.mjs,bench-driver.mjs}.

Stateless beats MathJax in 36/36 full groups (minimum 5.62x), and Temml in 20/22 accepted cohorts (minimum 0.96x). Temml cannot render any input in the remaining groups; no throughput comparison is claimed there.

Warm microseconds/expression, p50. Temml partial rows measure fewer expressions; only the common-input table below directly compares those rows.

| Group | Inputs | Stateless | Session | MathJax | Temml | Temml accepted |
|---|---:|---:|---:|---:|---:|---:|
| bench12 | 12 | 14.37 | 10.50 | 252.53 | 21.35 | 12/12 |
| base | 10 | 29.00 | 22.93 | 480.49 | 44.76 | 10/10 |
| newcommand | 10 | 12.91 | 11.69 | 223.51 | 17.88 | 6/10 |
| ams | 10 | 32.74 | 28.01 | 425.75 | 55.50 | 10/10 |
| amscd | 10 | 24.27 | 21.72 | 431.06 | 46.81 | 10/10 |
| mathtools | 10 | 36.52 | 31.87 | 494.32 | 43.99 | 6/10 |
| physics | 10 | 40.62 | 35.43 | 597.82 | 73.00 | 9/10 |
| braket | 10 | 15.71 | 13.62 | 270.65 | 46.07 | 10/10 |
| cancel | 10 | 17.82 | 13.19 | 100.09 | 25.36 | 10/10 |
| bbox | 10 | 8.15 | 5.27 | 86.08 | — | 0/10 |
| enclose | 10 | 14.15 | 10.45 | 87.69 | — | 0/10 |
| centernot | 10 | 19.78 | 12.67 | 305.75 | — | 0/10 |
| boldsymbol | 10 | 11.79 | 7.12 | 107.88 | 11.53 | 10/10 |
| mhchem | 10 | 102.54 | 84.73 | 925.10 | 110.24 | 10/10 |
| extpfeil | 10 | 15.02 | 11.11 | 214.33 | 20.95 | 10/10 |
| action | 10 | 10.36 | 7.05 | 119.37 | — | 0/10 |
| bbm | 10 | 8.16 | 4.85 | 86.62 | — | 0/10 |
| bboldx | 10 | 6.75 | 3.87 | 85.34 | 10.83 | 3/10 |
| color | 10 | 10.13 | 6.93 | 90.64 | 13.23 | 8/10 |
| colortbl | 10 | 24.11 | 19.04 | 224.60 | — | 0/10 |
| colorv2 | 10 | 8.52 | 4.66 | 102.31 | 13.08 | 10/10 |
| dsfont | 10 | 7.10 | 4.56 | 98.66 | — | 0/10 |
| empheq | 10 | 96.12 | 87.75 | 1133.14 | — | 0/10 |
| cases | 10 | 125.80 | 120.92 | 1577.14 | — | 0/10 |
| gensymb | 10 | 6.25 | 3.48 | 82.91 | 7.16 | 2/10 |
| html | 10 | 7.59 | 4.40 | 60.74 | — | 0/10 |
| textmacros | 10 | 10.71 | 6.24 | 109.56 | 16.16 | 10/10 |
| begingroup | 10 | 9.89 | 7.84 | 99.79 | 11.45 | 9/10 |
| noundefined | 10 | 7.00 | 3.99 | 81.75 | — | 0/10 |
| setoptions | 10 | 24.94 | 20.82 | 161.71 | — | 0/10 |
| tagformat | 10 | 29.03 | 26.53 | 240.36 | 40.25 | 10/10 |
| textcomp | 10 | 7.04 | 3.82 | 41.08 | 9.43 | 3/10 |
| unicode | 10 | 7.44 | 4.27 | 51.01 | — | 0/10 |
| units | 10 | 11.04 | 7.54 | 133.53 | — | 0/10 |
| upgreek | 10 | 7.32 | 4.42 | 103.98 | 22.45 | 8/10 |
| verb | 10 | 7.17 | 4.35 | 56.83 | 6.91 | 9/10 |

Partial Temml cohorts, identical accepted inputs for all engines (µs/expression, p50):

| Group | Inputs | Stateless | Session | MathJax | Temml |
|---|---:|---:|---:|---:|---:|
| newcommand | 6 | 11.48 | 8.99 | 194.41 | 17.88 |
| mathtools | 6 | 27.96 | 23.25 | 456.20 | 43.99 |
| physics | 9 | 36.43 | 35.03 | 536.92 | 73.00 |
| bboldx | 3 | 6.37 | 3.66 | 61.09 | 10.83 |
| color | 8 | 9.45 | 6.45 | 84.51 | 13.23 |
| gensymb | 2 | 5.55 | 3.23 | 70.57 | 7.16 |
| begingroup | 9 | 10.05 | 8.28 | 106.53 | 11.45 |
| textcomp | 3 | 6.29 | 3.65 | 41.68 | 9.43 |
| upgreek | 8 | 6.91 | 4.30 | 100.41 | 22.45 |
| verb | 9 | 7.16 | 4.33 | 61.49 | 6.91 |

Cold milliseconds, p50 / p95, independent fresh processes:

| Engine | Import + setup → first string | First conversion | First bench12 pass |
|---|---:|---:|---:|
| flashmath | 26.71 / 28.46 | 2.19 / 2.31 | 5.72 / 5.98 |
| session | 26.26 / 27.72 | 1.68 / 1.75 | 5.13 / 6.03 |
| mathjax | 67.44 / 69.57 | 1.54 / 1.59 | 14.97 / 15.76 |
| temml | 20.37 / 21.18 | 2.17 / 2.22 | 4.74 / 5.90 |

Import timing starts immediately before dynamic import, includes parser/document setup and first serialization, and excludes Node process bootstrap. Corpus JSON loading is excluded from this column. This is machine-specific evidence, not a universal ranking.
