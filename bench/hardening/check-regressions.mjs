import fs from 'node:fs';
import assert from 'node:assert/strict';
import subject from '../flashmath/adapter.mjs';
import {parseMathML,firstDifference} from '../../conformance/normalize.mjs';
export function check() {
 const rows=JSON.parse(fs.readFileSync(new URL('./regressions.json',import.meta.url))), failures=[];
 for(const r of rows){let actual,difference;try{actual=subject(r.tex,r.o);difference=firstDifference(parseMathML(r.htmlVoidComparison?r.ex.replace(/<br>/g,'<br></br>'):r.ex),parseMathML(actual));}catch(e){difference={error:String(e)};}
 if(difference)failures.push({g:r.g,tex:r.tex,valid:r.valid,difference,expected:r.ex,actual});}
 fs.writeFileSync(new URL('./regressions-result.json',import.meta.url),JSON.stringify({total:rows.length,failures},null,2));
 for(const r of failures)console.log(r.g,r.tex,JSON.stringify(r.difference));
 console.log(JSON.stringify({total:rows.length,failures:failures.length,validFailures:failures.filter(r=>r.valid).length}));
 return failures;
}
if(process.argv[1]===new URL(import.meta.url).pathname)assert.equal(check().length,0);
