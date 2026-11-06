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
