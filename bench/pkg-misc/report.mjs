import fs from 'node:fs';
import {createHash} from 'node:crypto';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures.json',import.meta.url)));
const reports=Object.fromEntries(['standalone','integration'].map(name=>[name,JSON.parse(fs.readFileSync(new URL(name+'.json',import.meta.url)))]));
const names=['Base','Newcommand','Begingroup','Bussproofs','ConfigMacros','Noerrors','Noundefined','SetOptions','Textmacros','Verb','Require','Autoload'];
const lines=['suite | matched | mismatch | unsupported | total','--- | ---: | ---: | ---: | ---:'];
for(const name of names){const rows=reports.integration.rows.filter(x=>x.id.startsWith(name+'.test.ts::'));lines.push(`${name} | ${rows.filter(x=>x.status==='matched').length} | ${rows.filter(x=>x.status==='mismatch').length} | ${rows.filter(x=>x.status==='unsupported').length} | ${rows.length}`);}
const digest=createHash('sha256');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(x=>x.isDirectory()?walk(new URL(x.name+'/',dir)):[new URL(x.name,dir)]);
for(const url of walk(new URL('../../src/',import.meta.url)))digest.update(url.pathname.split('/src/')[1]).update(fs.readFileSync(url));
const totals={sourceSha256:digest.digest('hex'),selected:fixture.records.length,reports:Object.fromEntries(Object.entries(reports).map(([name,r])=>[name,{matched:r.matched,mismatch:r.rows.filter(x=>x.status==='mismatch').length,unsupported:r.rows.filter(x=>x.status==='unsupported').length,total:r.total}]))};
fs.writeFileSync(new URL('./verification.json',import.meta.url),JSON.stringify(totals,null,2)+'\n');
console.log(lines.join('\n'));console.log(JSON.stringify(totals,null,2));
