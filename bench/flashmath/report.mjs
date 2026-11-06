import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=new URL('../../',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,import.meta.url),'utf8');
const scoped=JSON.parse(read('conformance.json')),full=JSON.parse(read('full-conformance.json')),bench=JSON.parse(read('benchmark.json'));
const hash=createHash('sha256');for(const name of fs.readdirSync(new URL('src/',root)).sort())hash.update(name).update(fs.readFileSync(new URL('src/'+name,root)));
if(hash.digest('hex')!==bench.sourceSha256)throw Error('Benchmark does not match current source');
const tail=(name,n)=>read(name).trimEnd().split('\n').slice(-n).join('\n');
const ls=spawnSync('ls',['-l','src/','test/','bench/flashmath/','tsconfig.json','package.json','README.md'],{cwd:root,encoding:'utf8'});
if(ls.status!==0)throw Error(ls.stderr);
fs.writeFileSync(new URL('./artifact-listing.txt',import.meta.url),ls.stdout);
const commands=[
 {command:'node_modules/.bin/tsc -p tsconfig.json',exitCode:0,log:'build.log'},
 {command:'node --test test/*.test.mjs',exitCode:0,log:'test.log'},
 {command:'node bench/flashmath/conformance.mjs',exitCode:0,log:'conformance-run.log'},
 {command:'node conformance/runner.mjs --subject bench/flashmath/adapter.mjs --output bench/flashmath/full-conformance.json --fresh',exitCode:1,log:'full-conformance-run.log',reason:'full MathJax package coverage exceeds this lane scope'},
 {command:'node bench/flashmath/run.mjs --samples 7 --iterations 100',exitCode:0,log:'benchmark-run.log'},
 {command:'chromium --headless ... --dump-dom file://<cwd>/bench/flashmath/preview.html',exitCode:0,log:'screen-run.html'},
 {command:'pnpm install --offline --frozen-lockfile --lockfile-only --ignore-scripts --store-dir "$TMPDIR/flashmath-pnpm-store" --cache-dir "$TMPDIR/flashmath-pnpm-cache"',exitCode:1,log:'lockfile-check.log',reason:'lockfile synchronization is outside the assigned write scope'}
];
fs.writeFileSync(new URL('./verification.json',import.meta.url),JSON.stringify({commands,sourceSha256:bench.sourceSha256},null,2)+'\n');
const out=[];const p=s=>out.push(s);const block=s=>p('```text\n'+s+'\n```');
p('# flashmath core delivery');
p('In-scope implementation and scoped conformance targets are met. Integration remains blocked on the manifest/lockfile mismatch: pnpm-lock.yaml is outside this lane’s allowed write list. No external network delivery or npm publish was performed. The original Git index is read-only; commits are carried by core.bundle instead of changing its branch.');
p('## State');
p('- Goal: handwritten TeX → MathML, token macros, React elements, conformance evidence, and same-input comparative timings.\n- Constraints: source/test/bench/flashmath plus the authorized manifest, tsconfig, and README usage section only; conformance read-only; no child agents, external sends, or publishing.\n- Known: scoped denominators include harness unsupported cases; all 848 executable scoped fixture outputs also exactly match React SSR.\n- Decisions: inline is the API default; display:true adds block display; errors return merror unless throwOnError; core and React have separate entry points; package name is @minamorl/flashmath; limits are per parse. All emitted attributes, group wrappers, styles, spacing, and labels aim at the upstream MathML structure. No fixture expected output is used by runtime code.\n- Changed: src/, test/, bench/flashmath/, tsconfig.json, package.json, README usage. React dependencies were restored from the local pnpm content store for this sandbox; the store was not modified by that helper.\n- Failures: original Git index.lock cannot be created; initial Temml XML validation failed because its XML namespace option was omitted, corrected to xml:true with preflight before timing. Final benchmark raw is from a subsequent isolated orchestrator run, with no concurrent conformance job launched by this lane.\n- Unknowns/risks: broader MathJax packages are outside the implemented scope; no clean frozen install can pass until root updates the lockfile. Full harness includes two unsupported configmacros shapes that raise subject-error. Browser checks used installed headless Chromium; other browsers and React versions were not tested.\n- Next: root verifier checks the diff and raw evidence, imports the bundle, updates the lockfile in its authorized scope, and re-runs frozen install/integration gates.');
p('## Scope evidence');
for(const command of commands.slice(0,5))p('`'+command.command+'` → exit '+command.exitCode+'; raw: ['+command.log+']('+command.log+').');
block('build exit_code=0\n'+(read('build.log').trim()||'(no compiler diagnostics)'));
block('test exit_code=0\n'+tail('test.log',13));
block('scoped conformance exit_code=0\n'+read('conformance-run.log').split('\n').slice(0,6).join('\n'));
p('Fixture groups are the target denominator. Package membership tables overlap and include fixtures from other groups; those rates are not interchangeable.');
block('full conformance exit_code=1\n'+read('full-conformance-run.log').split('\n').find(line=>line.startsWith('ALL |')));
p('The full denominator is '+full.total+'; the scoped denominator is '+scoped.total+'. The full result is retained without filtering failures.');
p('Remaining scoped mismatches:');
p(scoped.rows.filter(r=>r.status==='mismatch').map(r=>'- `'+r.id+'` — '+r.category).join('\n'));
p('## Benchmark');
p('Same 12 independent inputs, display=true, seven fresh processes per engine, 200 corpus warmup passes, 100 timed corpus passes per sample. No expression-result cache. Warm timings include parsing and MathML serialization; import/setup is excluded. Cold includes import/setup through the first MathML string, excluding Node process startup. Raw child data is checkpointed after every sample. Percentiles use nearest rank.');
block('benchmark exit_code=0\n'+tail('benchmark-run.log',3));
p('These timings describe this machine and corpus. Temml uses different wrappers/attributes on all 12 inputs; the flashmath benchmark outputs normalize identically to MathJax on all 12. Cold p95 for flashmath is higher than Temml in this run; a general fastest claim is not established. See benchmark.json for timestamps, versions, machine, source hash, every sample, and output checks.');
p('## Screen');
p('screen_run: preview.html を headless Chromium で開き、React SSR の12式を表示。Switch display を2回クリックし、inline→block の属性切り替え、全式の非ゼロの描画寸法、merror が無いことを実行時に確認。preview.png を開いて分数・根・上下付き・配列の描画を目視確認。');
block('screen exit_code=0\n'+read('screen-run.html').match(/data-screen-run="[^"]+"/)[0]);
p('## Integration gate');
block('frozen install exit_code=1\n'+tail('lockfile-check.log',10));
p('The lockfile was left byte-for-byte unchanged. Original-index commit attempt exited 128 with:');
block("fatal: Unable to create '/home/minamorl/repos/flashmath-ts/.git/worktrees/core/index.lock': 読み込み専用ファイルシステムです");
p('## Requested review checkpoints (--no-review)');
p('- Before expensive execution: compare engine preflight XML checks, timing boundaries, common corpus, sample count, and unmodified normalizer.\n- Before DONE/integration: inspect the source diff, 14 remaining scoped mismatches, unsupported-inclusive denominator, SSR evidence, browser artifact, bundle contents, and the RED frozen-install gate. No broker checkpoint was called.');
p('## Placement evidence');
p('Actual `ls -l src/ test/ bench/flashmath/ tsconfig.json package.json README.md` output captured while preparing delivery (bundle/receipt are created afterwards):');
block(ls.stdout.trimEnd());
fs.writeFileSync(new URL('./REPORT.md',import.meta.url),out.join('\n\n')+'\n');
console.log('report sourceSha256='+bench.sourceSha256);
