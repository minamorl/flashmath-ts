# Hardening benchmark

Node v26.12.1, AMD Ryzen 5 3600 6-Core Processor, linux/x64. MathJax 4.1.3; Temml 0.14.0; flashmath 0.1.0.

Alternating fresh processes; 9 cold processes per engine, warm 5 processes x 7 samples; 100 warmup corpus passes and 20 timed passes/sample. p50/p95 nearest rank. Native default flashmath output. Reused flashmath sessions and MathJax documents reset on Declare*/newcommand/newenvironment inputs, with setup included in conversion time; otherwise document state persists. ignoreDuplicateLabels=true in both engines. Outputs are validated before and after warmup. Temml accepted subsets replayed identically by every engine.

Raw samples: [hardening-benchmark.raw.json](hardening-benchmark.raw.json). Full p50/p95 and cohort sizes: [hardening-benchmark.json](hardening-benchmark.json). Corpus and runners: ../hardening/{bench-corpus.json,bench-worker.mjs,bench-driver.mjs}.

Stateless beats MathJax in 36/36 full groups (minimum 3.61x), and Temml in 17/22 accepted cohorts (minimum 0.60x). Temml cannot render any input in the remaining groups; no throughput comparison is claimed there.

Warm microseconds/expression, p50. Temml partial rows measure fewer expressions; only the common-input table below directly compares those rows.

| Group | Inputs | Stateless | Session | MathJax | Temml | Temml accepted |
|---|---:|---:|---:|---:|---:|---:|
| bench12 | 12 | 17.97 | 14.96 | 245.26 | 21.71 | 12/12 |
| base | 10 | 38.58 | 33.73 | 457.27 | 44.11 | 10/10 |
| newcommand | 10 | 17.13 | 16.82 | 227.07 | 18.38 | 6/10 |
| ams | 10 | 42.12 | 37.74 | 433.98 | 57.96 | 10/10 |
| amscd | 10 | 37.16 | 29.12 | 436.94 | 48.45 | 10/10 |
| mathtools | 10 | 45.31 | 42.90 | 510.19 | 45.22 | 6/10 |
| physics | 10 | 54.35 | 46.74 | 572.58 | 79.10 | 9/10 |
| braket | 10 | 23.83 | 19.23 | 266.47 | 45.20 | 10/10 |
| cancel | 10 | 27.30 | 18.21 | 119.11 | 26.47 | 10/10 |
| bbox | 10 | 14.78 | 7.38 | 91.38 | — | 0/10 |
| enclose | 10 | 22.25 | 13.18 | 80.21 | — | 0/10 |
| centernot | 10 | 24.52 | 19.48 | 313.69 | — | 0/10 |
| boldsymbol | 10 | 16.01 | 10.96 | 101.14 | 11.53 | 10/10 |
| mhchem | 10 | 119.21 | 101.82 | 912.22 | 123.69 | 10/10 |
| extpfeil | 10 | 22.28 | 16.41 | 210.73 | 20.12 | 10/10 |
| action | 10 | 12.21 | 8.36 | 130.66 | — | 0/10 |
| bbm | 10 | 10.97 | 6.18 | 83.80 | — | 0/10 |
| bboldx | 10 | 10.83 | 5.98 | 80.72 | 10.45 | 3/10 |
| color | 10 | 13.34 | 7.75 | 97.80 | 14.44 | 8/10 |
| colortbl | 10 | 32.27 | 22.78 | 213.56 | — | 0/10 |
| colorv2 | 10 | 10.39 | 5.99 | 105.58 | 13.69 | 10/10 |
| dsfont | 10 | 10.39 | 6.30 | 93.76 | — | 0/10 |
| empheq | 10 | 131.62 | 116.33 | 1102.54 | — | 0/10 |
| cases | 10 | 176.15 | 164.59 | 1519.40 | — | 0/10 |
| gensymb | 10 | 9.46 | 5.40 | 94.70 | 9.70 | 2/10 |
| html | 10 | 8.88 | 5.71 | 77.79 | — | 0/10 |
| textmacros | 10 | 12.68 | 8.78 | 96.62 | 17.54 | 10/10 |
| begingroup | 10 | 12.23 | 9.88 | 110.44 | 11.71 | 9/10 |
| noundefined | 10 | 9.60 | 5.74 | 88.26 | — | 0/10 |
| setoptions | 10 | 29.52 | 22.90 | 166.39 | — | 0/10 |
| tagformat | 10 | 39.29 | 33.11 | 247.57 | 41.01 | 10/10 |
| textcomp | 10 | 8.07 | 4.98 | 43.97 | 8.86 | 3/10 |
| unicode | 10 | 9.70 | 5.55 | 58.54 | — | 0/10 |
| units | 10 | 13.91 | 9.85 | 131.62 | — | 0/10 |
| upgreek | 10 | 11.11 | 6.93 | 95.03 | 24.29 | 8/10 |
| verb | 10 | 10.99 | 6.71 | 63.10 | 6.92 | 9/10 |

Partial Temml cohorts, identical accepted inputs for all engines (µs/expression, p50):

| Group | Inputs | Stateless | Session | MathJax | Temml |
|---|---:|---:|---:|---:|---:|
| newcommand | 6 | 14.91 | 13.24 | 184.02 | 18.38 |
| mathtools | 6 | 37.66 | 33.26 | 442.22 | 45.22 |
| physics | 9 | 50.21 | 42.68 | 542.94 | 79.10 |
| bboldx | 3 | 10.17 | 5.40 | 64.64 | 10.45 |
| color | 8 | 12.24 | 7.04 | 88.99 | 14.44 |
| gensymb | 2 | 8.31 | 4.93 | 68.02 | 9.70 |
| begingroup | 9 | 12.02 | 9.10 | 117.30 | 11.71 |
| textcomp | 3 | 7.66 | 4.14 | 41.91 | 8.86 |
| upgreek | 8 | 10.48 | 6.82 | 93.67 | 24.29 |
| verb | 9 | 11.50 | 6.55 | 66.50 | 6.92 |

Cold milliseconds, p50 / p95, independent fresh processes:

| Engine | Import + setup → first string | First conversion | First bench12 pass |
|---|---:|---:|---:|
| flashmath | 25.39 / 30.96 | 2.31 / 2.53 | 5.47 / 6.70 |
| session | 27.08 / 30.39 | 1.93 / 2.29 | 5.42 / 6.72 |
| mathjax | 73.46 / 88.67 | 1.64 / 1.86 | 15.86 / 17.18 |
| temml | 21.30 / 31.11 | 2.22 / 3.86 | 4.82 / 6.91 |

Import timing starts immediately before dynamic import, includes parser/document setup and first serialization, and excludes Node process bootstrap. Corpus JSON loading is excluded from this column. This is machine-specific evidence, not a universal ranking.
