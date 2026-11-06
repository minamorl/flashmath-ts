import test from 'node:test';
import {packageFixtures} from './fixtures.mjs';
test('begingroup: original conformance fixtures',t=>packageFixtures(t,'Begingroup'));
import assert from 'node:assert/strict';
import {parseToMathMLAst,toMathMLString} from '../../dist/index.js';
test('global environments survive group exit',()=>{
 const tex=String.raw`\newenvironment{e}{A}{B}\begingroup\global\renewenvironment{e}{C}{D}\endgroup\begin{e}x\end{e}`;
 const out=toMathMLString(parseToMathMLAst(tex,{packages:['base','newcommand','begingroup']}));
 assert.match(out,/<mi>C<\/mi><mi>x<\/mi><mi>D<\/mi>/);
});
