import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {sourceFingerprint,fileFingerprint} from './fingerprint.mjs';
const at=name=>new URL(name,import.meta.url),read=name=>fs.readFileSync(at(name),'utf8');
const scoped=JSON.parse(read('conformance.json')),full=JSON.parse(read('full-conformance.json')),bench=JSON.parse(read('benchmark.json'));
const source=sourceFingerprint(),normalizer=fileFingerprint(new URL('../../conformance/normalize.mjs',import.meta.url));
if(scoped.run.sourceSha256!==source||scoped.run.normalizerSha256!==normalizer||bench.sourceSha256!==source||bench.normalizerSha256!==normalizer)throw Error('Stale source or normalizer evidence');
for(const name of ['base','newcommand']){
 if(JSON.stringify(scoped.groups[name])!==JSON.stringify(full.groups[name]))throw Error('Scoped and full group results differ');
 if(scoped.groups[name].matched/scoped.groups[name].total<.95)throw Error('Scoped target not met');
}
if(JSON.parse(fs.readFileSync(new URL('../../package.json',import.meta.url))).name!=='@rainpulse/flashmath')throw Error('Wrong package name');
const tail=(name,n)=>read(name).trimEnd().split('\n').slice(-n).join('\n');
const commands=[
 ['node_modules/.bin/tsc -p tsconfig.json',0,'revision-build.log'],
 ['node --test test/*.test.mjs',0,'revision-test.log'],
 ['node --test conformance/harness.test.mjs',0,'revision-harness.log'],
 ['node bench/flashmath/conformance.mjs',0,'revision-conformance.log'],
 ['node conformance/runner.mjs --subject bench/flashmath/adapter.mjs --output bench/flashmath/full-conformance.json --fresh',1,'revision-full-conformance.log'],
 ['CI=true pnpm install --offline --frozen-lockfile --package-import-method copy --store-dir "$TMPDIR/flashmath-pnpm-store"',0,'revision-frozen-install.log'],
 ['node bench/flashmath/run.mjs --samples 7 --iterations 100',0,'benchmark-run.log'],
 ['chromium --headless ... --dump-dom file://<cwd>/bench/flashmath/preview.html',0,'screen-run.html'],
];
fs.writeFileSync(at('verification.json'),JSON.stringify({sourceSha256:source,normalizerSha256:normalizer,commands:commands.map(([command,exitCode,log])=>({command,exitCode,log}))},null,2)+'\n');
const out=[],p=s=>out.push(s),block=s=>p('```text\n'+s.trimEnd()+'\n```');
p('# flashmath core revision');
p('The texclass-preserving harness is the current oracle. Earlier compatibility results that discarded texclass are withdrawn. This revision meets the base/newcommand group targets under the unchanged current normalizer. Frozen install now succeeds. No npm publish, external delivery, or child agent was used. Git index access remains read-only; the revision is delivered as a bundle based on acbe7fe.');
p('## Changes and decisions');
p('- Restored the npm name to `@rainpulse/flashmath`; repository name is unchanged. Synced the lockfile for React and its types.\n- Explicit TeX atoms, fences, named operators, function application and combined relations retain their semantic texclass; inferred sequences remain distinct.\n- `src/packages/base.ts` and `newcommand.ts` own their command/environment tables. New packages need their module and one shared registration line. Delimiter-only AMS and legacy-color-only colorv2 subsets are explicit registrations, not claims of full package support.\n- The adapter forwards packages/priority tuples, prior inputs, mode, configuration modules, TeX options, display and execution metadata. Unsupported packages, modes, registration modules and options fail explicitly. RegExp/string number patterns, serialized RegExp, digits alias and identifier patterns are exercised against MathJax.\n- `createMathMLParser()` owns document state. Label/ref handling consumes the requested label, preserves tag counters and encoded URLs, supports completed prior equations and completed eqnarray rows, preserves same-equation unresolved placeholders, and honors duplicate-label policy without renaming IDs. Independent calls remain isolated.\n- React and string output remain separate public entry points; the scoped SSR test forwards the complete fixture options rather than simplifying them.');
p('## Goal and verification');
p('Target: each of base/newcommand >=95%, including harness unsupported records in each denominator. Runtime code does not import fixture expected outputs, MathJax, or Temml. Conformance sources, fixtures and normalization are read-only.');
block('sourceSha256='+source+'\nnormalizerSha256='+normalizer+'\nfixtureSha256='+scoped.run.fixtureSha256);
for(const [command,exitCode,log]of commands)p('`'+command+'` → exit '+exitCode+'; ['+log+']('+log+').');
block('build exit_code=0\n'+(read('revision-build.log').trim()||'(no compiler diagnostics)'));
block('tests exit_code=0\n'+tail('revision-test.log',14));
block('harness exit_code=0\n'+tail('revision-harness.log',10));
block('scoped conformance exit_code=0\n'+read('revision-conformance.log').split('\n').slice(0,5).join('\n'));
p('Package membership tables overlap and include other fixture groups. Group rates above are the target; they must not be substituted with package membership rates.');
block('full conformance exit_code=1\n'+read('revision-full-conformance.log').split('\n').filter(line=>line.startsWith('ALL |')||line.startsWith('classifications:')).join('\n'));
p('The full harness includes unimplemented packages, options and modes. Its subject-error rows are retained, not converted to unsupported or removed from the denominator. This is not full MathJax compatibility.');
p('Current scoped failures:');
p(scoped.rows.filter(row=>row.status==='mismatch').map(row=>'- `'+row.id+'` — '+row.category).join('\n'));
p('## Dependency installation');
block('frozen install exit_code=0\n'+tail('revision-frozen-install.log',8));
p('The first full offline attempt found an incomplete private store after recreating node_modules. The existing local pnpm SQLite index and content from already-installed packages were copied into a private TMPDIR store; pnpm verified the file digests and installed from that store with downloaded=0. The final frozen-install command above ran with scripts enabled. The original dependency tree and original store were read only. `seed-offline-store.mjs` records the local CAS restoration helper. No dependency version outside the React-related lockfile additions was upgraded.');
p('## Package integration proof');
p('`test/packages-references.test.mjs` adds a disposable package module and one registry line to a copy of compiled modules. It verifies a new command, override priorities, a new delimiter, environment lookup and package activation. Differential tests use installed MathJax 4.1.3 for tag/ref/session behavior, explicit classes and configurable scanners. Unsupported render/output modes and callback options are tested as explicit rejections.');
p('## Fresh performance evidence');
p('Same independent 12-input corpus; seven fresh processes per engine; warmup and setup excluded from warm measurements. Cold includes import/setup through the first string, excluding Node process startup. Each child sample is persisted immediately. The final timing run was started after the harness/conformance jobs finished.');
block('benchmark exit_code=0\n'+tail('benchmark-run.log',3));
p('Flashmath output agrees with MathJax under the current normalizer on '+bench.engines.flashmath.outputChecks.filter(x=>!x.differenceFromMathJax).length+' of the 12 benchmark inputs. Temml differs in structure/attributes on '+bench.engines.temml.outputChecks.filter(x=>x.differenceFromMathJax).length+' inputs. These timings are machine/corpus measurements, not a universal fastest claim; Temml has lower cold p50/p95 in this run. Raw process timings, source hash, normalizer hash and output differences are in benchmark.json.');
p('## Browser');
p('screen_run: preview.html を headless Chromium で開き、React SSR の式を表示。Switch display を2回クリックして inline/block 切替を実行し、各式の描画寸法と merror が無いことを確認。preview.png を開いて分数・根・上下付き・配列を目視確認。');
block('screen exit_code=0\n'+read('screen-run.html').match(/data-screen-run="[^"]+"/)[0]);
p('## Review checkpoints (--no-review)');
p('- Before expensive execution: verify complete adapter options, unchanged normalizer, independent input corpus, XML preflight, source/normalizer fingerprints and timing boundaries.\n- Before integration: inspect package ownership/one-line registration, label/ref differential evidence, strict-class failure rows, frozen-install output and bundle diff. Root supplies the independent final verifier; no agent-lane-review checkpoint was called.');
p('## Placement');
const listing=spawnSync('ls',['-l','src/packages/','src/configuration.ts','src/session-state.ts','docs/packages.md','package.json','pnpm-lock.yaml','bench/flashmath/revision.bundle','bench/flashmath/conformance.json','bench/flashmath/benchmark.json'],{encoding:'utf8'});
if(listing.status!==0)throw Error(listing.stderr);
fs.writeFileSync(at('artifact-listing.txt'),listing.stdout);
p('Actual listing captured before final bundle refresh:');block(listing.stdout);
fs.writeFileSync(at('REPORT.md'),out.join('\n\n')+'\n');
for(const [from,to]of [['revision-build.log','build.log'],['revision-test.log','test.log'],['revision-conformance.log','conformance-run.log'],['revision-full-conformance.log','full-conformance-run.log']])fs.copyFileSync(at(from),at(to));
fs.writeFileSync(at('REVISION-STATE.json'),JSON.stringify({goal:'Root revision requests 1–7',phase:'verified; ready for root independent review',sourceSha256:source,normalizerSha256:normalizer,groups:scoped.groups,full:{matched:full.matched,total:full.total},frozenInstallExitCode:0,buildExitCode:0,testExitCode:0,harnessExitCode:0,scopeExitCode:0,fullExitCode:1,benchmarkExitCode:0,screenExitCode:0,packageName:'@rainpulse/flashmath',remaining:['root independent final verification and integration'],failures:scoped.rows.filter(row=>row.status==='mismatch').map(row=>row.id)},null,2)+'\n');
console.log('sourceSha256='+source);console.log('normalizerSha256='+normalizer);
