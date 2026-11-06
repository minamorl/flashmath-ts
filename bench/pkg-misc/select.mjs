import fs from 'node:fs';
const fixture=JSON.parse(fs.readFileSync(new URL('../../conformance/fixtures/mathjax-4.1.3.json',import.meta.url)));
const packages=new Set(['textmacros','bussproofs','verb','begingroup','configmacros','setoptions','require','autoload','noerrors','noundefined']);
const selected={...fixture,records:fixture.records.filter(r=>/^(Base|Newcommand)\.test/.test(r.id)||r.input?.packages?.some(p=>packages.has(Array.isArray(p)?p[0]:p)))};
fs.writeFileSync(new URL('./fixtures.json',import.meta.url),JSON.stringify(selected));
