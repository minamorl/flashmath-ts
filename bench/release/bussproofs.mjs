// Each probe uses a fresh process and the pinned upstream output jax/normalizer.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const mappingPath='node_modules/@mathjax/src/ts/input/tex/bussproofs/BussproofsMappings.ts';
const source=fs.readFileSync(mappingPath,'utf8').replace(/\/\/[^\n]*/g,'');
const map=source.split("new CommandMap('Bussproofs-macros', {")[1].split('});')[0];
const commands=[...map.matchAll(/^  (\w+):/gm)].map(m=>m[1]);
const r=String.raw, wrap=body=>r`\begin{prooftree}`+body+r`\end{prooftree}`;
const ax=r`\AxiomC{$P$}`, unary=r`\UnaryInfC{$Q$}`;
const probes=[];
for(const command of commands){
 let body;
 if(['AxiomC','AXC'].includes(command))body=`\\${command}{$R$}`+unary;
 else if(command==='Axiom')body=r`\Axiom$A \fCenter B$ \UnaryInf$A \fCenter C$`;
 else if(command==='fCenter')body=r`\renewcommand{\fCenter}{\vdash}\Axiom$A \fCenter B$\UnaryInf$C \fCenter D$`;
 else if(/Inf|^[UBT]IC$/.test(command)){
  const count=/Quinary/.test(command)?5:/Quaternary/.test(command)?4:/Trinary|TIC/.test(command)?3:/Binary|BIC/.test(command)?2:1;
  const sequent=!command.endsWith('C');
  body=Array.from({length:count},(_,i)=>sequent?`\\Axiom$${String.fromCharCode(65+i)} \\fCenter B$`:`\\AxiomC{$${String.fromCharCode(65+i)}$}`).join('')+`\\${command}`+(sequent?'$A \\fCenter C$':'{$Z$}');
 }else if(/Label|^[RL]L$/.test(command))body=ax+`\\${command}{rule}`+unary;
 else body=`\\${command}`+ax+unary+r`\UnaryInfC{$R$}`;
 probes.push({command,tex:wrap(body)});
}
for(const [name,body] of Object.entries({
 chain:r`\Axiom$A \fCenter B$\UnaryInf$C \fCenter D$\UnaryInf$E \fCenter F$`,
 unequal:r`\Axiom$AB \fCenter C$\UnaryInf$D \fCenter EF$`,
 labels:r`\Axiom$P \fCenter Q$\RightLabel{r}\UnaryInf$R \fCenter S$`,
 upward:r`\rootAtTop\Axiom$P \fCenter Q$\UnaryInf$R \fCenter S$`,
 missingCenter:r`\Axiom$A B$`,missingDollar:r`\Axiom{A}`,missingPremise:r`\UnaryInf$A \fCenter B$`,
}))probes.push({command:name,tex:wrap(body)});
probes.push({command:'outside',tex:r`\Axiom$A \fCenter B$`});
const fixtures=new Set(JSON.parse(fs.readFileSync('conformance/fixtures/mathjax-4.1.3.json')).records.map(r=>r.input?.tex));
const rows=probes.map(p=>{
 assert.ok(!fixtures.has(p.tex),'probe duplicates fixture: '+p.command);
 const child=spawnSync(process.execPath,['bench/hardening/one.mjs',JSON.stringify({tex:p.tex,o:{packages:['base','newcommand','bussproofs'],display:true,mode:'output'}})],{encoding:'utf8',maxBuffer:4e6});
 assert.equal(child.status,0,child.stderr);
 return {...p,...JSON.parse(child.stdout.trim().split('\n').pop())};
});
const report={source:mappingPath,version:'4.1.3',commands,rows,failures:rows.filter(r=>!r.same)};
fs.writeFileSync('bench/release/bussproofs.json',JSON.stringify(report,null,2)+'\n');
for(const row of rows)console.log(`${row.command}: ${row.same?'match':JSON.stringify({d:row.d,e1:row.e1,e2:row.e2})}`);
console.log(`${commands.length} upstream commands; ${rows.length} non-fixture probes; ${report.failures.length} differences`);
assert.deepEqual(report.failures,[]);
