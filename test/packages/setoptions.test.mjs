import test from 'node:test';
import {packageFixtures} from './fixtures.mjs';
test('setoptions: original conformance fixtures',t=>packageFixtures(t,'SetOptions'));
import assert from 'node:assert/strict';
import {parseToMathMLAst,toMathMLString} from '../../dist/index.js';
const render=(tex,texOptions={})=>toMathMLString(parseToMathMLAst(tex,{packages:['base','noundefined','setoptions'],texOptions}));
test('setOptions changes package values and invokes filters without leaking caller options',()=>{
 const options={noundefined:{color:'red'}};
 assert.match(render(String.raw`\setOptions[noundefined]{color=blue}\missing`,options),/mathcolor="blue"/);
 assert.equal(options.noundefined.color,'red');
 assert.match(render(String.raw`\setOptions[noundefined]{color=blue}\missing`,{setoptions:{filterPackage:()=>false}}),/mathcolor="red"/);
 assert.match(render(String.raw`\setOptions[noundefined]{color=blue}\missing`,{setoptions:{filterOption:()=>false}}),/mathcolor="red"/);
 assert.match(render(String.raw`\setOptions[noundefined]{color=blue}\missing`,{setoptions:{filterValue:()=> 'green'}}),/mathcolor="green"/);
 assert.match(render(String.raw`\setOptions[noundefined]{color=blue}`,{setoptions:{allowOptions:{noundefined:false}}}),/Options can/);
 assert.match(render(String.raw`\setOptions{tags=all}`),/not allowed/);
 assert.match(render(String.raw`\setOptions[noundefined]{unknown=true}`),/Invalid option/);
});
import {createMathMLParser} from '../../dist/index.js';
test('setOptions preserves top-level number options across session inputs',()=>{
 const session=createMathMLParser({packages:['base','setoptions']});
 session.parse(String.raw`\setOptions{digits=/^[0-9]+;[0-9]+/}`);
 assert.match(toMathMLString(session.parse('1;23')),/<mn>1;23<\/mn>/);
});
