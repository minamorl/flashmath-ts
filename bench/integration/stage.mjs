import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const stage=process.argv[2];
if(!stage || !/^[a-z0-9-]+$/.test(stage))throw Error('Expected stage name');
const directory=new URL('./',import.meta.url);
const checks=[];
function check(name,args,expected=[0]) {
  const result=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:32*1024*1024});
  const output=(result.stdout??'')+(result.stderr??'');
  fs.writeFileSync(new URL(`${stage}-${name}.log`,directory),output);
  const row={name,command:[process.execPath,...args],exit:result.status,expected};
  checks.push(row);
  console.log(`${name}: exit ${result.status}\n${output.trimEnd().split('\n').slice(-12).join('\n')}`);
  if(!expected.includes(result.status)) {
    fs.writeFileSync(new URL(`${stage}-checks.json`,directory),JSON.stringify(checks,null,2)+'\n');
    process.exit(2);
  }
}
check('build',['node_modules/typescript/bin/tsc','-p','tsconfig.json']);
const files=fs.readdirSync('test').filter(f=>f.endsWith('.test.mjs')).map(f=>`test/${f}`);
if(JSON.parse(fs.readFileSync('package.json')).scripts.test.includes('test/packages/*.test.mjs'))files.push(...fs.readdirSync('test/packages').filter(f=>f.endsWith('.test.mjs')).map(f=>`test/packages/${f}`));
check('test',['--test',...files]);
check('conformance',['conformance/runner.mjs','--subject','bench/flashmath/adapter.mjs','--output',`bench/integration/${stage}.json`,'--fresh'],[0,1]);
fs.writeFileSync(new URL(`${stage}-checks.json`,directory),JSON.stringify(checks,null,2)+'\n');
