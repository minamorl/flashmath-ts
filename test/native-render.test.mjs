import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseToMathMLAst,toMathMLString} from '../dist/index.js';
import {parseToReact,mathMLAstToReact} from '../dist/react.js';
import {mathMLForOutput} from '../dist/output.js';
import {variantText} from '../dist/native-variants.js';
import {cases,notations} from '../bench/native-render/cases.mjs';
import {parseMathML} from '../conformance/normalize.mjs';
function comparable(xml){
  const tree=parseMathML(xml),stack=[tree];
  while(stack.length){const n=stack.pop();for(const a of n.attrs)if(a[0]==='{}style')a[1]=a[1].replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\([^)]*\)|\s*([:;])\s*/g,(all,separator)=>separator??all).replace(/;$/,'');for(const c of n.children)if(typeof c!=='string')stack.push(c);}
  return tree;
}
const nodes=root=>{const all=[],stack=[root];while(stack.length){const n=stack.pop();all.push(n);stack.push(...n.children);}return all;};
const token=(text,attributes={})=>({kind:'mi',text,attributes,children:[],start:0});
const group=(kind,children,attributes={})=>({kind,text:'',attributes,children,start:0});
const raw=(tex,options)=>parseToMathMLAst(tex,{...options,output:'mathjax'});
const frozen=root=>{for(const n of nodes(root)){Object.freeze(n.attributes);Object.freeze(n.children);Object.freeze(n);}return root;};

test('195 native conversions are immutable, idempotent, and SSR/string equivalent',()=>{
  assert.ok(cases.length>=150);
  const before=new Map(JSON.parse(fs.readFileSync(new URL('../bench/native-render/before-cases.json',import.meta.url))).map(r=>[r.id,r]));
  for(const c of cases){
    const ast=frozen(raw(c.tex,c.options)),snapshot=JSON.stringify(ast);
    const native=mathMLForOutput(ast,c.options),xml=toMathMLString(native);
    assert.deepEqual(mathMLForOutput(native),native,c.id+' must be idempotent');
    assert.deepEqual(comparable(renderToStaticMarkup(mathMLAstToReact(ast,c.options))),comparable(xml),c.id);
    assert.deepEqual(comparable(renderToStaticMarkup(parseToReact(c.tex,c.options))),comparable(xml),c.id);
    assert.equal(JSON.stringify(ast),snapshot,c.id+' input mutation');
    assert.strictEqual(mathMLForOutput(ast,{output:'mathjax'}),ast);
    // Hardening corrected the boxed wrapper and omitted noLine's rowlines.
    let expected=before.get(c.id).mathjax;
    if(c.id==='frames-1')expected=expected.replace('<mrow><mi>x</mi><mo>+</mo><mi>y</mi></mrow>','<mi>x</mi><mo>+</mo><mi>y</mi>');
    if(c.id==='tags-10')expected=expected.replace('<mtable displaystyle="true">','<mtable displaystyle="true" side="left">');
    if(/^proofs-(9|10|11|12)$/.test(c.id))expected=expected.replaceAll(' rowlines="none"','');
    assert.equal(toMathMLString(ast,{output:'mathjax'}),expected,c.id+' raw MathJax changed');
    assert.ok(!/<(?:menclose|mlabeledtr|svg)\b/.test(xml),c.id);
  }
});

test('every enclosure notation and independent combinations keep visible decorations',()=>{
  assert.equal(notations.length,29);
  for(const notation of notations){
    const ast=parseToMathMLAst(`\\enclose{${notation}}{x}`,{packages:['base','enclose']});
    const enclosure=nodes(ast).find(n=>n.attributes['data-flashmath-enclose']===notation);
    assert.ok(enclosure,notation);
    if(notation==='radical')assert.ok(nodes(enclosure).some(n=>n.kind==='msqrt'));
    else assert.ok(enclosure.children.some(n=>n.attributes['aria-hidden']==='true'),notation);
  }
  const combined=parseToMathMLAst(String.raw`\enclose{box,circle,roundedbox,updiagonalstrike}{x}`,{packages:['base','enclose']});
  assert.equal(nodes(combined).filter(n=>n.attributes.style?.includes('border-top:')).length,3);
  assert.equal(nodes(combined).filter(n=>n.attributes['data-flashmath-line']).length,1);
  // Unknown notation is user data, including Object.prototype property names.
  assert.doesNotThrow(()=>parseToMathMLAst(String.raw`\enclose{constructor,toString,__proto__}{x}`,{packages:['base','enclose']}));
});

test('equation tag side, empty rows, labels and IDs survive native layout',()=>{
  for(const tagSide of ['left','right'])for(const tex of [String.raw`x=y\tag{T}`,String.raw`\begin{equation}x=y\end{equation}`,String.raw`\begin{align}x&=y\notag\\a&=b\end{align}`]){
    const ast=parseToMathMLAst(tex,{packages:['base','ams'],tags:'ams',tagSide,display:true});
    const all=nodes(ast),tag=all.find(n=>n.attributes['data-flashmath-label']);
    assert.equal(tag.attributes['data-flashmath-label'],tagSide);
    assert.ok(tag.attributes.id.startsWith('mjx-eqn:'));
    assert.equal(all.filter(n=>n.attributes.id===tag.attributes.id).length,1);
    assert.ok(all.some(n=>n.attributes['data-flashmath-tags']===tagSide));
  }
});

test('table line lists repeat the final entry, with none and dashed kept distinct',()=>{
  const row=text=>group('mtr',[group('mtd',[token(text)])]);
  const ast=group('math',[group('mtable',['a','b','c','d'].map(row),{rowlines:'solid none dashed',frame:'dashed'})]);
  const native=mathMLForOutput(frozen(ast)),table=native.children[0];
  assert.ok(!table.children[0].children[0].attributes.style.includes('border-top'));
  assert.ok(table.children[1].children[0].attributes.style.includes('border-top:.067em solid'));
  assert.ok(!table.children[2].children[0].attributes.style.includes('border-top'));
  assert.ok(table.children[3].children[0].attributes.style.includes('border-top:.067em dashed'));
  assert.ok(table.attributes.style.includes('border:.067em dashed'));
  assert.deepEqual(mathMLForOutput(native),native);
});

test('Unicode variants cover Latin/digits/Greek, Letterlike holes and inherited overrides',()=>{
  assert.equal(variantText('BCEFHILMRZeh','script'),'ℬ𝒞ℰℱℋℐℒℳℛ𝒵ℯ𝒽');
  assert.equal(variantText('CHNPQRZ','double-struck'),'ℂℍℕℙℚℝℤ');
  assert.equal(variantText('CHIRZ','fraktur'),'ℭℌℑℜℨ');
  assert.equal(variantText('h','italic'),'ℎ');
  assert.equal(variantText('ΑΩ∇αω∂ϵϑϰϕϱϖ','bold'),'𝚨𝛀𝛁𝛂𝛚𝛛𝛜𝛝𝛞𝛟𝛠𝛡');
  for(const variant of ['bold','italic','bold-italic','script','bold-script','fraktur','double-struck','bold-fraktur','sans-serif','bold-sans-serif','sans-serif-italic','sans-serif-bold-italic','monospace']){
    const text='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    assert.equal(variantText(text,variant).normalize('NFKD'),text,variant);
  }
  const ast=group('math',[group('mstyle',[token('x'),token('y',{mathvariant:'normal'}),group('mstyle',[token('O')],{mathvariant:'script'})],{mathvariant:'bold'})]);
  const native=mathMLForOutput(frozen(ast)),mi=nodes(native).filter(n=>n.kind==='mi');
  assert.equal(mi.map(n=>n.text).reverse().join(''),'𝐱y𝒪');
  assert.doesNotThrow(()=>mathMLForOutput(group('math',[token('x',{mathvariant:'constructor'})])));
});

test('verbatim text keeps its codepoints and receives an actual CSS font',()=>{
  const ast=parseToMathMLAst(String.raw`\verb|a\b%{c}012|`,{packages:['base','verb']});
  const text=nodes(ast).find(n=>n.kind==='mtext');
  assert.equal(text.text,String.raw`a\b%{c}012`);
  assert.equal(text.attributes.style,'font-family:monospace');
});

test('bbox padding becomes CSS around the complete content, only for package-created padding',()=>{
  const options={packages:['base','bbox']};
  for(const padding of ['3px','.3em','2mu']){
    const tex=`\\bbox[${padding},yellow,border:2px solid red]{x+y}`;
    const ast=parseToMathMLAst(tex,options),all=nodes(ast);
    const box=all.find(n=>n.attributes['data-flashmath-bbox']);
    assert.ok(box,padding);assert.equal(box.kind,'mrow');
    assert.equal(box.children.map(n=>n.text).join(''),'x+y');
    assert.ok(box.attributes.style.startsWith('padding:'));
    assert.ok(!all.some(n=>n.kind==='mpadded'));
    assert.equal(renderToStaticMarkup(parseToReact(tex,options)),toMathMLString(ast));
    assert.ok(toMathMLString(raw(tex,options),{output:'mathjax'}).includes('<mpadded'));
  }
  const literal=group('math',[group('mpadded',[token('x')],{height:'+3px',depth:'+3px',lspace:'3px',width:'+6px'})]);
  assert.strictEqual(mathMLForOutput(literal),literal);
});

test('only the centernot construction becomes an overlay; ordinary mpadded survives',()=>{
  const options={packages:['base','centernot']};
  const ast=parseToMathMLAst(String.raw`\centerOver{a+b}{\frac{x}{y}}`,options);
  assert.equal(nodes(ast).filter(n=>n.attributes['data-flashmath-overlay']).length,1);
  const ordinary=group('math',[group('mpadded',[token('x')],{width:'0',lspace:'-.5width'})]);
  assert.strictEqual(mathMLForOutput(ordinary),ordinary);
});

test('overline paints the complete base with CSS while a literal horizontal bar stays literal',()=>{
  const tex=String.raw`\overline{x+y}`;
  const native=toMathMLString(parseToMathMLAst(tex));
  assert.match(native,/data-flashmath-accent="overline"/);
  assert.match(native,/border-top:.04em solid currentColor/);
  assert.match(toMathMLString(raw(tex),{output:'mathjax'}),/>―<\/mo>/);
  assert.equal(nodes(parseToMathMLAst('―')).find(n=>n.kind==='mo').text,'―');
  assert.equal(renderToStaticMarkup(parseToReact(tex)),native);
});

test('deep variant output uses an explicit stack and needs no browser',()=>{
  let ast=token('x',{mathvariant:'bold'});
  for(let i=0;i<5000;i++)ast=group('mrow',[ast]);
  const output=mathMLForOutput(group('math',[ast]));
  assert.equal(nodes(output).find(n=>n.kind==='mi').text,'𝐱');
  assert.ok(toMathMLString(output).includes('𝐱'));
});


test('calligraphic and script use distinct NewCM faces in native output',()=>{
  const cal=toMathMLString(parseToMathMLAst(String.raw`\mathcal{ABZ}`));
  const scr=toMathMLString(parseToMathMLAst(String.raw`\mathscr{ABZ}`));
  assert.match(cal,/Flashmath Calligraphic/);
  assert.match(scr,/Flashmath Script/);
  assert.notEqual(cal,scr);
  assert.match(cal,/>ABZ<|>A</);
  assert.ok(scr.includes('𝒜'));
});
