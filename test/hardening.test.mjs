import test from 'node:test';
import assert from 'node:assert/strict';
import {configure,resolveConfiguration} from '../dist/configuration.js';
import {configurationKey,remember,CONFIGURATION_CACHE_LIMIT} from '../dist/configuration-cache.js';
import {parseToMathMLAst,toMathMLString,createMathMLParser} from '../dist/index.js';
const render=(s,o)=>toMathMLString(parseToMathMLAst(s,o));

test('configuration values share tables but never macro, regex or option state',()=>{
 const a={packages:['base','ams','newcommand','setoptions'],texOptions:{ams:{multlineWidth:'50%'}},macros:{q:'a'},numberPattern:/[0-9]+/g};
 const b={...a,packages:[...a.packages],texOptions:{ams:{multlineWidth:'50%'}}};
 const x=configure(a),y=configure(b);
 assert.equal(x.configuration,y.configuration);
 x.options.texOptions.ams.multlineWidth='2%';x.options.numberPattern.lastIndex=9;
 assert.equal(y.options.texOptions.ams.multlineWidth,'50%');assert.equal(y.options.numberPattern.lastIndex,0);
 a.macros.q='b';assert.match(render('\\q',a),/>b</);assert.match(render('\\q',b),/>b</);
 assert.doesNotMatch(render('\\newcommand{\\z}{X}',a),/merror/);
 assert.match(render('\\z',a),/Undefined control sequence/);
 const session=createMathMLParser(a);session.parse('\\newcommand{\\z}{X}');assert.match(toMathMLString(session.parse('\\z')),/>X</);
 assert.equal(a.texOptions.ams.multlineWidth,'50%');
 assert.notEqual(resolveConfiguration(['base',['ams',3]]),resolveConfiguration(['base',['ams',4]]));
 assert.throws(()=>configure({...a,texOptions:{unknown:true}}),/Unsupported TeX option/);
});

test('configuration keys use option contents, support regex and bound retained entries',()=>{
 assert.equal(configurationKey({b:2,a:{x:1}}),configurationKey({a:{x:1},b:2}));
 assert.notEqual(configurationKey({x:/a/i}),configurationKey({x:/a/}));
 assert.notEqual(configurationKey({x:undefined}),configurationKey({}));
 const cycle={};cycle.self=cycle;assert.equal(configurationKey(cycle),undefined);
 assert.equal(configurationKey({x:()=>1}),undefined);
 const map=new Map();for(let i=0;i<1000;i++)remember(map,String(i),i);
 assert.equal(map.size,CONFIGURATION_CACHE_LIMIT);assert.equal(map.has('0'),false);
});

test('nested scanners retain linear character and slice counts through depth 400',t=>{
 const families=[['ce','\\ce{H','}','O',['base','mhchem']],['frac','\\frac{','}{y}','x',['base']],['qty','\\qty{','}','x',['base','physics']],['ket','\\ket{','}','x',['base','braket']],['brace','{','}','x',['base']]];
 const evidence=[];
 for(const [name,open,close,inner,packages] of families){
  const rows=[];for(const depth of [100,200,400]){
   const tex=open.repeat(depth)+inner+close.repeat(depth),original=String.prototype.charCodeAt,slice=String.prototype.slice;
   let chars=0,slices=0,ast;
   String.prototype.charCodeAt=function(i){chars++;return original.call(this,i);};String.prototype.slice=function(...a){slices++;return slice.apply(this,a);};
   try{ast=parseToMathMLAst(tex,{packages,throwOnError:true,maxDepth:4096,maxTokens:1e6,maxNodes:1e6});}finally{String.prototype.charCodeAt=original;String.prototype.slice=slice;}
   assert.equal(ast.kind,'math');rows.push({depth,chars,slices});
  }
  assert.ok(rows[2].chars<2.3*rows[1].chars,JSON.stringify({name,rows}));
  assert.ok(rows[2].slices<=2.2*rows[1].slices+10,JSON.stringify({name,rows}));evidence.push({name,rows});
 }
 const original=String.prototype.slice;let slices=0;String.prototype.slice=function(...a){slices++;return original.apply(this,a);};
 try{parseToMathMLAst('x+'.repeat(500),{packages:['base']});}finally{String.prototype.slice=original;}
 assert.ok(slices<10,String(slices));t.diagnostic(JSON.stringify({evidence,flatSlices:slices}));
});

test('text math and macro argument spans scale from depth 400 to 1600',t=>{
 const families=[
  ['text-math',['base','ams'],d=>'\\text{$'.repeat(d)+'x'+'$}'.repeat(d)],
  ['textmacros-math',['base','textmacros'],d=>'\\text{$'.repeat(d)+'x'+'$}'.repeat(d)],
  ['newcommand-arg',['base','newcommand'],d=>'\\newcommand{\\w}[1]{{#1}}'+'\\w{'.repeat(d)+'x'+'}'.repeat(d)],
 ];
 const evidence=[];
 for(const [name,packages,input]of families){
  const run=d=>toMathMLString(parseToMathMLAst(input(d),{packages,maxDepth:10000,maxNodes:1e6,maxTokens:1e7,throwOnError:true}));
  const rows=[];
  for(const depth of [400,1600]){
   const tex=input(depth),options={packages,maxDepth:10000,maxNodes:1e6,maxTokens:1e7,throwOnError:true};
   const original=Array.prototype.slice;let copied=0;
   Array.prototype.slice=function(...args){const result=original.apply(this,args);copied+=result.length;return result;};
   try{assert.equal(parseToMathMLAst(tex,options).kind,'math');}finally{Array.prototype.slice=original;}
   rows.push({depth,copied});
  }
  for(let i=0;i<8;i++){run(400);run(1600);}
  const samples=[[],[]];
  for(let s=0;s<9;s++)for(const index of [s%2,1-s%2]){
   const depth=rows[index].depth,begin=performance.now();let iterations=0;
   do{run(depth);iterations++;}while(performance.now()-begin<12);
   samples[index].push((performance.now()-begin)/iterations);
  }
  for(let i=0;i<2;i++)rows[i].ms=samples[i].sort((a,b)=>a-b)[4];
  const slope=Math.log(rows[1].ms/rows[0].ms)/Math.log(4);
  assert.ok(rows[1].copied<=4.5*rows[0].copied+50,JSON.stringify({name,rows}));
  assert.ok(slope<1.65,JSON.stringify({name,rows,slope}));
  evidence.push({name,rows,slope});
 }
 t.diagnostic(JSON.stringify(evidence));
});
test('chemistry recursion returns merror even when user limits are raised',()=>{
 const tex='\\ce{H'.repeat(5000)+'O'+'}'.repeat(5000);
 const options={packages:['base','mhchem'],maxDepth:1e7,maxNodes:1e7,maxTokens:1e7};
 assert.match(render(tex,options),/merror.*Nesting limit exceeded/);
});
