// One engine in one fresh process: cold import, first string, first pass, then warm samples per group.
const begin=performance.now();
import fs from 'node:fs';import path from 'node:path';
const [,,engine,mode,vdir,passesArg,samplesArg]=process.argv;
const groups=JSON.parse(fs.readFileSync(path.join(vdir,'bench-corpus.json')));
const root=process.cwd();const u=p=>'file://'+path.join(root,p);
let t0=performance.now();
let factory;
if(engine==='session'){const {createMathMLParser,toMathMLString}=await import(u('dist/index.js'));factory=async g=>{const s=createMathMLParser({display:true,packages:g.packages,throwOnError:false,texOptions:g.texOptions||{}});return tex=>toMathMLString(s.parse(tex));};}else if(engine==='flashmath'){
 const {parseToMathMLAst,toMathMLString}=await import(u('dist/index.js'));
 factory=async g=>{const o={display:true,packages:g.packages,throwOnError:false,texOptions:g.texOptions||{}};return tex=>toMathMLString(parseToMathMLAst(tex,o));};
}else if(engine==='temml'){
 const temml=(await import(u('node_modules/temml/dist/temml.mjs'))).default;
 factory=async()=>tex=>temml.renderToString(tex,{displayMode:true,throwOnError:true,xml:true});
}else{
 const [{TeX},{HTMLDocument},{liteAdaptor},{SerializedMmlVisitor},{STATE},{default:subject}]=await Promise.all([import(u('node_modules/@mathjax/src/mjs/input/tex.js')),import(u('node_modules/@mathjax/src/mjs/handlers/html/HTMLDocument.js')),import(u('node_modules/@mathjax/src/mjs/adaptors/liteAdaptor.js')),import(u('node_modules/@mathjax/src/mjs/core/MmlTree/SerializedMmlVisitor.js')),import(u('node_modules/@mathjax/src/mjs/core/MathItem.js')),import(u('conformance/mathjax.mjs'))]);
 const visitor=new SerializedMmlVisitor();const adaptor=liteAdaptor();
 factory=async g=>{await subject('x',JSON.parse(JSON.stringify({packages:g.packages,texOptions:g.texOptions||{},configurationModules:g.configurationModules||[],mode:'convert',display:true,prior:[]})));const jax=new TeX({texOptions:g.texOptions||{},packages:g.packages});const doc=new HTMLDocument('',adaptor,{InputJax:jax});return tex=>visitor.visitTree(doc.convert(tex,{display:true,end:STATE.CONVERT}));};
}
const bench=groups[0];const r0=await factory(bench);
const setupMs=performance.now()-t0;
t0=performance.now();const first=r0(bench.texs[0]);const firstMs=performance.now()-t0;
const result={engine,importAndSetupMs:setupMs,firstConversionMs:firstMs,importToFirstStringMs:setupMs+firstMs,coldStartToFirstStringMs:performance.now()-begin,firstLen:first.length};
t0=performance.now();let checksum=0;for(const t of bench.texs)checksum+=r0(t).length;result.bench12FirstPassMs=performance.now()-t0;
if(mode==='cold'){console.log(JSON.stringify(result));process.exit(0);}
const items=[];for(const g of groups){const accepted=g.texs.filter((_,i)=>g.temml[i]);const list=engine==='temml'?accepted:g.texs;if(!list.length)continue;items.push({g:g.group,list,all:g.texs.length,r:await factory(g)});
 if(engine!=='temml'&&accepted.length&&accepted.length<g.texs.length)items.push({g:g.group+'@temml',list:accepted,all:g.texs.length,r:await factory(g)});
}
if(engine==='temml'){/* restricted to Temml accepted inputs */}
const passes=Number(passesArg),samples=Number(samplesArg);
t0=performance.now();for(const it of items)for(const t of it.list)checksum+=it.r(t).length;result.pkgFirstPassMs=performance.now()-t0;
for(let i=0;i<passes;i++)for(const it of items)for(const t of it.list)checksum+=it.r(t).length;
const data={};
for(let s=0;s<samples;s++)for(const it of items){const b=performance.now();for(let k=0;k<20;k++)for(const t of it.list)checksum+=it.r(t).length;(data[it.g]??=[]).push((performance.now()-b)/(20*it.list.length)*1000);}
result.warmUsPerExpr=data;result.counts=Object.fromEntries(items.map(i=>[i.g,i.list.length]));result.checksum=checksum;
console.log(JSON.stringify(result));
