import test from 'node:test';
import assert from 'node:assert/strict';
import {parseToMathMLAst,toMathMLString,ParseError} from '../dist/index.js';
import {parseToReact} from '../dist/react.js';
import {isValidElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {normalizeMathML} from '../conformance/normalize.mjs';
const xml=(tex,options)=>toMathMLString(parseToMathMLAst(tex,options));
const content=tex=>parseToMathMLAst(tex).children;

test('scripts, compound arguments and nested fences',()=>{
 assert.deepEqual(content('x^2_3')[0].children.map(n=>n.text),['x','3','2']);
 assert.equal(content('\\frac25')[0].kind,'mfrac');
 assert.deepEqual(content('\\frac25')[0].children.map(n=>n.text),['2','5']);
 assert.equal(content('\\sqrt\\frac{a}{b}')[0].children[0].kind,'mfrac');
 assert.equal(content('\\left(\\frac{a}{\\left[b\\right]}\\right)')[0].children.length,3);
});
test('fixed arity MathML children are never combined as adjacent relations',()=>{
 assert.equal(content('\\frac{=}{<}')[0].children.length,2);
 assert.equal(content('\\overunderset{\\rightarrow}{\\leftarrow}{b}')[0].children.length,3);
});
test('macro substitution respects control word boundaries and def templates',()=>{
 assert.deepEqual(content('\\newcommand{\\x}[2][a]{#1+#2}\\x{b}\\x[c]{d}').map(n=>n.text),['a','+','b','c','+','d']);
 assert.deepEqual(content('\\def\\x[#1]#2{#2+#1}\\x[a]{b}').map(n=>n.text),['b','+','a']);
 assert.deepEqual(content('\\def\\a{b}\\let\\x\\a\\def\\a{c}\\x\\a').map(n=>n.text),['b','c']);
 assert.deepEqual(content('\\let\\a\\alpha\\let\\alpha\\beta\\a\\alpha').map(n=>n.text),['α','β']);
});
test('nested custom environments and array frames',()=>{
 assert.deepEqual(content('\\newenvironment{a}{x}{y}\\begin{a}\\begin{a}z\\end{a}\\end{a}').map(n=>n.text),['x','x','z','y','y']);
 const table=content('\\begin{array}{cc}a&b\\\\c&d\\end{array}')[0];
 assert.equal(table.kind,'mtable');assert.equal(table.children.length,2);assert.equal(table.children[0].children.length,2);
});
test('definitions and parser state do not leak between parses',()=>{
 assert.equal(content('\\def\\foo{x}\\foo')[0].text,'x');
 assert.equal(content('\\foo')[0].kind,'merror');
 assert.equal(content('a')[0].attributes.mathvariant,undefined);
 assert.equal(content('\\bf a')[0].attributes.mathvariant,'bold');
 assert.equal(content('a')[0].attributes.mathvariant,undefined);
});
test('recursive macros, output size and nesting are bounded',()=>{
 for(const [tex,options]of [
  ['\\def\\x{\\x}\\x',{maxExpansions:20}],
  ['x'.repeat(100),{maxNodes:20}],
  ['x'.repeat(100),{maxTokens:20}],
  ['{'.repeat(100)+'x'+'}'.repeat(100),{maxDepth:20}],
  ['\\def\\x#1{#1#1}\\x{'+ 'x'.repeat(100) +'}',{maxTokens:150}]
 ])assert.throws(()=>parseToMathMLAst(tex,{...options,throwOnError:true}),ParseError);
 for(const maxNodes of [0,-1,NaN,Infinity])assert.throws(()=>parseToMathMLAst('x',{maxNodes}),RangeError);
});
test('deep input uses explicit stacks through serialization',()=>{
 const n=500;const out=xml('{'.repeat(n)+'x'+'}'.repeat(n),{maxDepth:600});
 assert.equal(out.match(/<mrow>/g).length,n);
});
test('malformed input returns an error tree or throws on request',()=>{
 for(const tex of ['{','}', '\\left(x','\\frac{1}', '\\newenvironment{a}{x}{y}\\begin{a}','\\unknown']){
  assert.equal(content(tex)[0].kind,'merror',tex);
  assert.throws(()=>parseToMathMLAst(tex,{throwOnError:true}),ParseError,tex);
 }
});
test('text and attribute values are escaped as XML, never executed',()=>{
 const out=xml('\\text{<script>alert("x")</script>}');
 assert.ok(out.includes('&lt;script&gt;'));assert.ok(!out.includes('<script>'));
 assert.doesNotThrow(()=>normalizeMathML(out));
 assert.equal(content('\u0000')[0].kind,'merror');
 assert.equal(content('\ud800')[0].kind,'merror');
});
test('React returns elements and SSR exactly equals the string renderer',()=>{
 for(const tex of ['x','x^2_3','\\frac{a+b}{\\sqrt{x}}','\\text{<&"\'}','\\left(\\sum_{k=0}^n k\\right)', '\\bf x', '\\begin{array}{cc}a&b\\\\c&d\\end{array}','\\unknown']){
  for(const display of [false,true]){
   const element=parseToReact(tex,{display});assert.ok(isValidElement(element));
   assert.equal(renderToStaticMarkup(element),xml(tex,{display}),tex);
  }
 }
 const a=parseToReact('\\def\\a{x+x}\\a\\a'),b=parseToReact('\\def\\a{x+x}\\a\\a');
 const keys=e=>(Array.isArray(e.props.children)?e.props.children:[e.props.children]).filter(isValidElement).map(c=>c.key);
 assert.deepEqual(keys(a),keys(b));assert.equal(new Set(keys(a)).size,keys(a).length);
});
test('error paths always serialize valid MathML and XML',()=>{
 for(const tex of ['\\buildrel{x}','\\\u0000','\\text{\udc00}','\\mmlToken{mo}[onclick=x]{x}']){
  const out=xml(tex);assert.ok(out.includes('<merror'));assert.doesNotThrow(()=>normalizeMathML(out));
 }
});
