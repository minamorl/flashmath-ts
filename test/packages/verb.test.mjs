import test from 'node:test';
import {packageFixtures} from './fixtures.mjs';
test('verb: original conformance fixtures',t=>packageFixtures(t,'Verb'));
import assert from 'node:assert/strict';
import {parseToMathMLAst,toMathMLString} from '../../dist/index.js';
test('verb reads raw comment characters and delimiters within scanner spans',()=>{
 const render=tex=>toMathMLString(parseToMathMLAst(tex,{packages:['base','verb']}));
 assert.match(render(String.raw`\verb|a%{b}|`),/<mtext style="font-family:monospace">a%\{b\}<\/mtext>/);
 assert.match(render(String.raw`\verb\foo\g`),/<mtext style="font-family:monospace">foo<\/mtext><mi>g<\/mi>/);
 assert.match(render(String.raw`\verb|unterminated`),/closing delimiter/);
});
