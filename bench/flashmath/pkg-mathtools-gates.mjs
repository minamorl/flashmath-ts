import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cwd=fileURLToPath(new URL('../../',import.meta.url));
const evidence=[];
const run=(command,args,log)=>{
  const result=spawnSync(command,args,{cwd,encoding:'utf8',maxBuffer:16*1024*1024});
  const output=(result.stdout??'')+(result.stderr??'');
  if(log)fs.writeFileSync(new URL(log,import.meta.url),output);
  const entry={command:[command,...args],exit:result.status,error:result.error?.message};
  evidence.push(entry);
  console.log('$ '+[command,...args].join(' '));
  console.log(output.trimEnd().split('\n').slice(-10).join('\n'));
  console.log('exit='+result.status);
  return result.status;
};
let failed=false;
failed=run('node',['node_modules/typescript/bin/tsc','-p','tsconfig.json'],'pkg-mathtools-build.log')!==0;
if(!failed){
  failed=run('node',['--test','test/*.test.mjs','test/packages/mathtools.test.mjs'],'pkg-mathtools-tests.log')!==0;
  failed=run('node',['bench/flashmath/pkg-mathtools-verify.mjs'],'pkg-mathtools-scoped.log')!==0||failed;
  fs.rmSync(new URL('pkg-mathtools-full.json',import.meta.url),{force:true});
  const exit=run('node',['conformance/runner.mjs','--subject','bench/flashmath/adapter.mjs','--output','bench/flashmath/pkg-mathtools-full.json','--fresh'],'pkg-mathtools-full.log');
  failed=![0,1].includes(exit)||failed;
  const before=JSON.parse(fs.readFileSync(new URL('pkg-mathtools-before.json',import.meta.url)));
  const after=JSON.parse(fs.readFileSync(new URL('pkg-mathtools-full.json',import.meta.url)));
  const current=new Map(after.rows.map(r=>[r.id,r]));
  const regressions=before.rows.filter(r=>r.status==='matched'&&current.get(r.id)?.status!=='matched').map(r=>r.id);
  const unchangedDenominator=before.total===after.total;
  failed=regressions.length>0||!unchangedDenominator||after.groups.mathtools.matched!==196||after.groups.base.matched<780||after.groups.newcommand.matched!==58||failed;
  const comparison={unchangedDenominator,regressions,base:after.groups.base,newcommand:after.groups.newcommand,mathtools:after.groups.mathtools};
  evidence.push({comparison});
  console.log(JSON.stringify(comparison,null,2));
}
failed=run('git',['diff','--check'])!==0||failed;
failed=run('git',['diff','--exit-code','--','conformance','pnpm-lock.yaml','package.json'])!==0||failed;
fs.writeFileSync(new URL('pkg-mathtools-gates.json',import.meta.url),JSON.stringify({evidence,passed:!failed},null,2)+'\n');
process.exitCode=failed?1:0;
