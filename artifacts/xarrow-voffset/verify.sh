#!/usr/bin/env bash
set -u
label="$1"
out=artifacts/xarrow-voffset
exec > >(tee "$out/checks-$label.txt") 2>&1
node --version
pnpm --version
run() {
  name="$1"
  command="$2"
  printf '\n$ %s\n' "$command"
  bash -c "$command" > "$out/$name-$label.log" 2>&1
  result=$?
  printf 'exit=%s\n' "$result"
  tail -n 14 "$out/$name-$label.log"
  return "$result"
}
run install 'pnpm install --frozen-lockfile --store-dir "$PWD/node_modules/.pnpm-store"' || exit $?
run build 'node scripts/build.mjs' || exit $?
run unit 'node --test test/*.test.mjs test/packages/*.test.mjs conformance/harness.test.mjs scripts/ci-checks.test.mjs' || exit $?
export XARROW_ARTIFACT_DIR="$out/browser-$label"
run browser 'node --test test/browser/*.test.mjs' || exit $?
run conformance "node conformance/runner.mjs --subject bench/flashmath/adapter.mjs --output $out/conformance-$label.json --fresh"
result=$?
if [[ "$result" != 0 && "$result" != 1 ]]; then exit "$result"; fi
run gate "node scripts/ci-conformance-gate.mjs $out/conformance-$label.json" || exit $?
run pack 'node scripts/ci-pack-smoke.mjs' || exit $?
