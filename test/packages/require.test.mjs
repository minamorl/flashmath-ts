import test from 'node:test';
import {packageFixtures} from './fixtures.mjs';
test('require: original conformance fixtures',t=>packageFixtures(t,'Require'));
import assert from 'node:assert/strict';
import {createMathMLParser,toMathMLString,parseToMathMLAst} from '../../dist/index.js';
test('require loads only local registered packages and persists within a session',()=>{
 const session=createMathMLParser({packages:['base','require']});
 assert.match(toMathMLString(session.parse(String.raw`\require{verb}\verb|%{}|`)),/<mtext style="font-family:monospace">%\{\}<\/mtext>/);
 assert.match(toMathMLString(session.parse(String.raw`\verb+a b+`)),/a b/);
 assert.match(toMathMLString(session.parse(String.raw`\require{base}`)),/not allowed to be loaded/);
 assert.match(toMathMLString(parseToMathMLAst(String.raw`\require{verb}`,{packages:['base']})),/Undefined control sequence/);
});
test('dynamically loaded noerrors formats the current error',()=>{
 const output=toMathMLString(parseToMathMLAst(String.raw`\require{noerrors}\frac`,{packages:['base','require']}));
 assert.match(output,/title="Missing argument for \\frac"/);
 assert.match(output,/<mtext>\\require\{noerrors\}\\frac<\/mtext>/);
});
