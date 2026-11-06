import test from 'node:test';
import {packageFixtures} from './fixtures.mjs';
test('textmacros: original conformance fixtures',t=>packageFixtures(t,'Textmacros'));
import assert from 'node:assert/strict';
import {parseToMathMLAst,toMathMLString} from '../../dist/index.js';
const text=tex=>toMathMLString(parseToMathMLAst(tex,{packages:['base','textmacros','newcommand']}));
test('text-mode expansion preserves optional parameters and package activation',()=>{
 assert.match(text(String.raw`\newcommand{\word}[1][x]{#1}\text{\word[hello]}`),/<mtext>hello<\/mtext>/);
 assert.match(text(String.raw`\text{\color{red}x}`),/only supported in math mode/);
 assert.match(text(String.raw`\text{\frac{1}{2}}`),/only supported in math mode/);
 assert.match(text(String.raw`\text{a%comment`+'\n'+String.raw`b}`),/<mtext>ab<\/mtext>/);
});
