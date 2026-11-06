import fs from 'node:fs';
import assert from 'node:assert/strict';
import {run} from '../../conformance/runner.mjs';
const integration=process.env.FLASHMATH_INTEGRATION==='1';
const {default:subject}=await import(integration?'../../bench/pkg-misc/integration-adapter.mjs':'../../bench/flashmath/adapter.mjs');
const {registeredPackages,validateConfigurationModules}=await import(integration?'../../bench/pkg-misc/integration-dist/packages/registry.js':'../../dist/packages/registry.js');
const fixture=JSON.parse(fs.readFileSync(new URL('../../conformance/fixtures/mathjax-4.1.3.json',import.meta.url)));
const registered=new Set(registeredPackages.map(x=>x.name));
export async function packageFixtures(t,prefix) {
 const records=fixture.records.filter(r=>r.id.startsWith(prefix+'.test.ts::'));
 const local=records.filter(r=>{if(r.unsupported)return true;try{validateConfigurationModules(r.input.configurationModules);}catch{return false;}return r.input.packages.every(x=>registered.has(Array.isArray(x)?x[0]:x));});
 t.diagnostic(`${local.length}/${records.length} fixture records available in this lane; cross-lane evidence is bench/pkg-misc/integration.json`);
 if(!local.some(r=>!r.unsupported)){t.skip('No executable fixtures in this lane; retain unsupported/dependency rows in the conformance report');return;}
 const report=await run(subject,{...fixture,records:local});
 assert.deepEqual(report.rows.filter(r=>r.status==='mismatch'),[]);
}
