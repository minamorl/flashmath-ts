/** Replay the independent verifier's exact corpus and frozen novelty cohort. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {renderToStaticMarkup} from 'react-dom/server';
import subject from '../adapter.mjs';
import oracle from '../../../conformance/mathjax.mjs';
import {normalizeMathML,parseMathML,firstDifference} from '../../../conformance/normalize.mjs';
import {parseToReact} from '../../../dist/react.js';
import corpus from './corpus.mjs';
const cohort=JSON.parse(fs.readFileSync(new URL('./cohort.json',import.meta.url)));
assert.equal(corpus.length,cohort.length);
const rows=[],groups={};
for(let i=0;i<corpus.length;i++){
 const {tex,packages,group}=corpus[i],frozen=cohort[i];
 assert.equal(tex,frozen.tex);assert.equal(group,frozen.group);
 const row={tex,packages,group,novel:frozen.novel};
 const options={packages,display:true};
 try{row.oracle=await oracle(tex,options);}catch(error){row.oracleError=String(error);}
 try{row.subject=subject(tex,options);}catch(error){row.subjectError=String(error);}
 row.isError=(row.oracle??'').includes('<merror')||!!row.oracleError;
 assert.equal(row.isError,frozen.isError,'MathJax error cohort changed: '+tex);
 row.match=typeof row.oracle==='string'&&typeof row.subject==='string'&&normalizeMathML(row.oracle)===normalizeMathML(row.subject);
 if(!row.match&&row.oracle&&row.subject)row.difference=firstDifference(parseMathML(row.oracle),parseMathML(row.subject));
 try{row.ssr=renderToStaticMarkup(parseToReact(tex,options));row.ssrExact=row.ssr===row.subject;}
 catch(error){row.ssrError=String(error);}
 const s=groups[group]??={total:0,novel:0,match:0,novelMatch:0,valid:0,validMatch:0};
 s.total++;if(row.novel)s.novel++;if(row.match)s.match++;if(row.novel&&row.match)s.novelMatch++;
 if(row.novel&&!row.isError){s.valid++;if(row.match)s.validMatch++;}
 rows.push(row);
}
const novel=rows.filter(r=>r.novel),valid=novel.filter(r=>!r.isError);
assert.equal(valid.length,395);
const calibrationBase='<math xmlns="http://www.w3.org/1998/Math/MathML">';
assert.notEqual(normalizeMathML(calibrationBase+'<mi>x</mi></math>'),normalizeMathML(calibrationBase+'<mo>x</mo></math>'));
assert.notEqual(normalizeMathML(calibrationBase+'<mi>x</mi></math>'),normalizeMathML(calibrationBase+'<mi mathvariant="bold">x</mi></math>'));
const summary={total:rows.length,matched:rows.filter(r=>r.match).length,novel:novel.length,novelMatched:novel.filter(r=>r.match).length,
 valid:valid.length,validMatched:valid.filter(r=>r.match).length,ssrThrows:rows.filter(r=>r.ssrError).length,
 ssrExact:rows.filter(r=>r.ssrExact).length,
 corpusSHA256:createHash('sha256').update(JSON.stringify(corpus)).digest('hex'),groups};
fs.writeFileSync(new URL('./diff.json',import.meta.url),JSON.stringify({summary,rows},null,2)+'\n');
console.table(groups);console.log(JSON.stringify(summary));
for(const row of rows.filter(r=>!r.match))console.log('MISMATCH',JSON.stringify({tex:row.tex,group:row.group,novel:row.novel,isError:row.isError,difference:row.difference,oracleError:row.oracleError,subjectError:row.subjectError}));
for(const row of rows.filter(r=>r.ssrError||!r.ssrExact))console.log('SSR',JSON.stringify({tex:row.tex,group:row.group,error:row.ssrError,exact:row.ssrExact,actual:row.ssr,expected:row.subject}));
assert.equal(summary.ssrThrows,0);
