import fs from 'node:fs';
const fixture=JSON.parse(fs.readFileSync(new URL('../../conformance/fixtures/mathjax-4.1.3.json',import.meta.url)));
const report=JSON.parse(fs.readFileSync(new URL('./pkg-physics-conformance.json',import.meta.url)));
const args=process.argv.slice(2);
const rows=report.rows.filter(r=>r.id.startsWith('Physics') && r.status!=='matched');
for(const [name,count] of Object.entries(report.byPackage).filter(([name])=>['physics','braket','cancel','bbox','enclose','centernot'].includes(name)))console.log(name,JSON.stringify(count));
console.log('BASE', report.groups.base, 'NEWCOMMAND', report.groups.newcommand);
for(const row of rows) {
 const f=fixture.records.find(r=>r.id===row.id);
 if(args[0] && !row.id.includes(args[0]))continue;
 console.log(row.id.split('::')[1],JSON.stringify(f.input.tex),JSON.stringify(row.difference??row.error));
 if(args.includes('--raw'))console.log('EXPECTED',f.expected,'ACTUAL',row.actual);
}
