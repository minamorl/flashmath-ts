import fs from 'node:fs';
const f=JSON.parse(fs.readFileSync('conformance/fixtures/mathjax-4.1.3.json'));
const names=['color','colorv2','colortbl','boldsymbol','bbm','bboldx','dsfont','upgreek','gensymb','textcomp','unicode','texhtml','html','action','tagformat','fontsizev3'];
export const fixture=f;
export const own=f.records.filter(r=>r.input?.packages?.some(p=>names.includes(Array.isArray(p)?p[0]:p)));
if(process.argv[2]){const report=JSON.parse(fs.readFileSync(process.argv[2]));for(const name of names)console.log(name,report.byPackage[name]);for(const row of report.rows.filter(r=>r.status!=='matched'&&own.some(x=>x.id===r.id))){const rec=own.find(x=>x.id===row.id);if(!rec.input.packages.some(p=>!['base','newcommand',...names].includes(Array.isArray(p)?p[0]:p)))console.log(row.id,JSON.stringify({tex:rec.input.tex,error:row.error,difference:row.difference}));}}
