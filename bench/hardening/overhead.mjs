import {performance} from 'node:perf_hooks';
import {configure} from '../../dist/configuration.js';
import {parseToMathMLAst,toMathMLString} from '../../dist/index.js';
const groups=[['base'],['base','ams'],['base','ams','mathtools'],['base','bbox']];
const median=a=>a.sort((a,b)=>a-b)[a.length>>1];
for(const packages of groups){
 const options={packages};for(let i=0;i<1000;i++)configure({...options,packages:[...packages]});
 const rows=[];for(let k=0;k<9;k++){const start=performance.now();for(let i=0;i<10000;i++)configure({...options,packages:[...packages]});rows.push((performance.now()-start)/10);}
 console.log(JSON.stringify({packages,configureUs:median(rows),sample:toMathMLString(parseToMathMLAst('x',options))}));
}
