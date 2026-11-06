// One input per process: rules out MathJax module-level state from earlier conversions.
import path from 'node:path';const root=process.cwd();const u=p=>'file://'+path.join(root,p);
const {tex,o}=JSON.parse(process.argv[2]);
const mj=(await import(u('conformance/mathjax.mjs'))).default;const fm=(await import(u('bench/flashmath/adapter.mjs'))).default;const {parseMathML,firstDifference}=await import(u('conformance/normalize.mjs'));
let ex,ac,e1,e2;try{ex=await mj(tex,o);}catch(e){e1=String(e);}try{ac=fm(tex,o);}catch(e){e2=String(e);}
let d=null;if(ex&&ac)d=firstDifference(parseMathML(ex.replace(/<br>(?!<\/br>)/g,'<br></br>')),parseMathML(ac.replace(/<br>(?!<\/br>)/g,'<br></br>')));
console.log(JSON.stringify({same:!d&&!e1&&!e2,e1,e2,d:d&&{c:d.category,p:d.path},ex,ac}));
