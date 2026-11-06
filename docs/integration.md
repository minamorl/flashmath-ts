# Package integration

Code-first integration from `lane/core` (`d3daf90`). The fixture, normalizer,
options revival and runner under `conformance/` are immutable. The source of
truth is this worktree. No external delivery or npm publication is part of this run.

## Checkpoints

The common Git index is read-only (original `git add -A`: exit 128, unable to
create index.lock). Checkpoints use `bench/.integration-git`, with original Git
objects as read-only alternates; the final bundle is self-contained relative to
`d3daf90`. Commands use `git --git-dir=bench/.integration-git`.

Each merge runs `node bench/integration/stage.mjs <stage>`: installed TypeScript
compiler, normal test entrypoint, and the unchanged full conformance CLI with
`--fresh`. Full CLI exit 1 retains mismatches and upstream unsupported records;
it is never interpreted as universal conformance. Raw reports, command exits and
logs are saved under `bench/integration/`.

## Merge resolutions

- AMS: merges cleanly; all package handlers and shared parser/tagging additions
  retained.

## Review handoff

Broker disabled by caller. Before running comparisons, review should check the
immutable corpus boundary, all denominators and row-by-row baseline comparison.
Before accepting delivery, root should inspect conflict resolutions and rerun
the final gate independently. This worker starts no child agents.
