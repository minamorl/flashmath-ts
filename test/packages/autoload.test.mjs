import test from 'node:test';
import {packageFixtures} from './fixtures.mjs';
test('autoload: original conformance fixtures',t=>packageFixtures(t,'Autoload'));
import assert from 'node:assert/strict';
import {parseToMathMLAst,toMathMLString} from '../../dist/index.js';
test('autoload registers command triggers and honors disabled triggers',()=>{
 const tex=String.raw`\verb|a\b%{c}|`;
 assert.match(toMathMLString(parseToMathMLAst(tex,{packages:['base','autoload']})),/a\\b%\{c\}/);
 assert.match(toMathMLString(parseToMathMLAst(tex,{packages:['base','autoload'],texOptions:{autoload:{verb:[]}}})),/Undefined control sequence/);
 assert.match(toMathMLString(parseToMathMLAst(tex,{packages:['base','autoload'],texOptions:{require:{allow:{verb:false}}}})),/not allowed to be loaded/);
});
test('autoload keeps remaining triggers after loading another package',()=>{
 const output=toMathMLString(parseToMathMLAst(String.raw`\verb|x|\def\x{y}\x`,{packages:['base','autoload']}));
 assert.match(output,/<mtext style="font-family:monospace">x<\/mtext><mi>y<\/mi>/);
});
