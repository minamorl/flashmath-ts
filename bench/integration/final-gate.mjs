import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const checks=[];
function check(name,args,env={}){
 const result=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:32*1024*1024,env:{...process.env,...env}});
 const output=(result.stdout??'')+(result.stderr??'');
 fs.writeFileSync(`bench/integration/final-${name}.log`,output);
 checks.push({name,command:[process.execPath,...args],exit:result.status});
 console.log(`${name}: exit ${result.status}\n${output.trimEnd().split('\n').slice(-10).join('\n')}`);
 assert.equal(result.status,0,name);
}
try{
 check('stage',['bench/integration/stage.mjs','07-fixes'],{MHCHEM_GENERALIZATION_REPORT:'bench/integration/chem-generalization.json'});
 check('harness',['--test','conformance/harness.test.mjs']);
 check('grammar',['bench/flashmath/generate-mhchem-grammar.mjs','--check']);
 check('comparison',['bench/integration/compare.mjs']);
 check('baseline',['bench/integration/prepare-baseline.mjs']);
 check('probes',['bench/integration/probes.mjs','--gate']);
 const chem=JSON.parse(fs.readFileSync('bench/integration/chem-generalization.json'));
 assert.equal(chem.total,216);assert.equal(chem.matched,216);
 console.log(`chem nonfixture: ${chem.matched}/${chem.total}`);
 check('screen',['bench/integration/screen.mjs']);
 const diff=spawnSync('git',['--git-dir=bench/.integration-git','diff','--check'],{encoding:'utf8'});
 checks.push({name:'diff',command:['git','--git-dir=bench/.integration-git','diff','--check'],exit:diff.status});
 assert.equal(diff.status,0,diff.stdout+diff.stderr);console.log('diff: exit 0');
 console.log('integration gate: PASS');
}finally{
 fs.writeFileSync('bench/integration/final-checks.json',JSON.stringify(checks,null,2)+'\n');
}
