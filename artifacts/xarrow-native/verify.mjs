import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const major=process.versions.node.split('.')[0],directory='artifacts/xarrow-native';
const steps=[];
function run(command,name,accepted=[0]) {
  const result=spawnSync('/bin/sh',['-c',command],{encoding:'utf8',maxBuffer:32*1024*1024});
  const output=(result.stdout??'')+(result.stderr??'');
  fs.writeFileSync(`${directory}/${name}-node${major}.log`,output);
  const evidence={command,node:process.version,exit:result.status,tail:output.trimEnd().split('\n').slice(-12)};
  steps.push(evidence);
  fs.writeFileSync(`${directory}/checks-node${major}.json`,JSON.stringify(steps,null,2)+'\n');
  console.log(JSON.stringify(evidence,null,2));
  if(!accepted.includes(result.status))process.exit(result.status??1);
}
run('pnpm install --frozen-lockfile --store-dir "$PWD/node_modules/.pnpm-store"','install');
run('node scripts/build.mjs','build');
run('node --test test/*.test.mjs test/packages/*.test.mjs conformance/harness.test.mjs scripts/ci-checks.test.mjs','tests');
run('XARROW_ARTIFACT_DIR=artifacts/xarrow-native/after node --test test/browser/*.test.mjs','browser');
run(`node conformance/runner.mjs --subject bench/flashmath/adapter.mjs --output ${directory}/conformance-node${major}.json --fresh`,'conformance',[0,1]);
run(`node scripts/ci-conformance-gate.mjs ${directory}/conformance-node${major}.json`,'conformance-gate');
run('node scripts/ci-pack-smoke.mjs','pack');
