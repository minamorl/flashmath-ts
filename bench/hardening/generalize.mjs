// Compares flashmath with MathJax 4.1.3 through conformance/mathjax.mjs and normalize.mjs on non-fixture inputs.
import fs from 'node:fs';import path from 'node:path';
const root=process.cwd();
const {corpus,cross}=await import(path.join(process.env.V,'corpus.mjs'));
const u=p=>'file://'+path.join(root,p);
const mj=(await import(u('conformance/mathjax.mjs'))).default;
const fm=(await import(u('bench/flashmath/adapter.mjs'))).default;
const {parseMathML,firstDifference}=await import(u('conformance/normalize.mjs'));
const fx=JSON.parse(fs.readFileSync('conformance/fixtures/mathjax-4.1.3.json'));
const fixtureKey=new Set(fx.records.filter(r=>r.input).map(r=>r.input.tex));
// choose options from fixture records: most common config per group
const base={};
for(const r of fx.records){if(!r.input||r.unsupported)continue;const{tex,prior,executionOrder,...o}=r.input;if((prior||[]).length)continue;const pk=JSON.stringify(o.packages);(base[r.group]??={});const e=base[r.group][pk]??={n:0,o};e.n++;}
const pick=g=>{const e=Object.values(base[g]||{}).sort((a,b)=>b.n-a.n)[0];if(!e)throw Error('no base '+g);return e.o;};
const override={noundefined:{packages:['base','noundefined'],texOptions:{}},dsfont:{packages:['base','dsfont'],texOptions:{}},configmacros:{packages:['base','configmacros','newcommand'],texOptions:{}},cases:{packages:['base','ams','cases'],texOptions:{tags:'ams'}},tagformat:{packages:['base','ams','tagformat'],texOptions:{tags:'ams',tagformat:{number:{$function:'(n)=>`B${n}`'},tag:{$function:'(t)=>`<${t}>`'}}}},begingroup:{packages:['base','begingroup','newcommand'],texOptions:{}},units:{packages:['base','units'],texOptions:{}},texhtml:null};
const results={};const rows=[];let excluded=0;
const all=Object.entries(corpus).map(([g,l])=>[g,l,null]);
const crossPk=['base','ams','newcommand','mathtools','boldsymbol','physics','mhchem','color','bbox','enclose','cancel','html','unicode','dsfont','bbm','upgreek','gensymb','textmacros','colortbl','textcomp'].filter(x=>x!=='textcomp');
all.push(['CROSS',cross,{packages:crossPk,texOptions:{},mode:'convert',configurationModules:['input/tex/mathtools/MathtoolsConfiguration.js','input/tex/textmacros/TextMacrosConfiguration.js','input/tex/textcomp/TextcompConfiguration.js'].slice(0,2),display:true,prior:[]}]);
for(const [g,list,force] of all){
 let opt=force||override[g]||pick(g);
 if(g!=='CROSS')opt={mode:'convert',display:true,prior:[],configurationModules:pick(g).configurationModules,...pick(g),...(override[g]||{})};
 const R=results[g]={total:0,match:0,mismatch:0,fmThrow:0,mjThrow:0,bothError:0,validTotal:0,validMatch:0,excluded:0,cats:{}};
 for(const item of list){
  const tex=typeof item==='string'?item:item.t;
  const o=typeof item==='string'?opt:{...opt,texOptions:{...(opt.texOptions||{}),...item.o}};
  if(fixtureKey.has(tex)&&typeof item==='string'){R.excluded++;excluded++;continue;}
  let ex,ac,mjErr,fmErr;
  try{ex=await mj(tex,JSON.parse(JSON.stringify(o)));}catch(e){mjErr=String(e).slice(0,160);}
  try{ac=fm(tex,JSON.parse(JSON.stringify(o)));}catch(e){fmErr=String(e).slice(0,200);}
  R.total++;
  if(mjErr){R.mjThrow++;rows.push({g,tex,kind:'mathjax-throw',mjErr,fmOut:ac?.slice(0,200),fmErr});continue;}
  const err=/<merror/.test(ex);
  if(!err)R.validTotal++;
  if(fmErr){R.fmThrow++;rows.push({g,tex,kind:'flash-throw',valid:!err,fmErr,ex:ex.slice(0,240)});continue;}
  let d;try{d=firstDifference(parseMathML(ex),parseMathML(ac));}catch(e){d={category:'invalid-xml',error:String(e)};}
  if(d){R.mismatch++;R.cats[d.category]=(R.cats[d.category]||0)+1;rows.push({g,tex,kind:'mismatch',valid:!err,d:{category:d.category,path:d.path,expected:JSON.stringify(d.expected)?.slice(0,160),actual:JSON.stringify(d.actual)?.slice(0,160),error:d.error},ex:ex.slice(0,400),ac:ac.slice(0,400)});}
  else{R.match++;if(!err)R.validMatch++;}
 }
}
fs.writeFileSync(path.join(process.env.V,'generalize.json'),JSON.stringify({results,rows},null,1));
let T={total:0,match:0,mismatch:0,fmThrow:0,mjThrow:0,validTotal:0,validMatch:0};
console.log('package|comparable|match|rate|valid match/total|mismatch|flash-throw|mj-throw|excl');
for(const[g,R]of Object.entries(results)){const c=R.total-R.mjThrow;console.log(`${g}|${c}|${R.match}|${(100*R.match/c).toFixed(1)}%|${R.validMatch}/${R.validTotal}|${R.mismatch}|${R.fmThrow}|${R.mjThrow}|${R.excluded}`);for(const k in T)T[k]+=R[k];}
const c=T.total-T.mjThrow;console.log('ALL|'+c+'|'+T.match+'|'+(100*T.match/c).toFixed(2)+'%|'+T.validMatch+'/'+T.validTotal+'|'+T.mismatch+'|'+T.fmThrow+'|'+T.mjThrow+'|'+excluded);
console.log('input total',T.total);
