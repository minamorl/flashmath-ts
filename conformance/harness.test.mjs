import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeMathML as norm} from './normalize.mjs';
import {run,defaultFixture,table} from './runner.mjs';
const wrap=(s,attrs='')=>`<math xmlns="http://www.w3.org/1998/Math/MathML" ${attrs}>${s}</math>`;
const base=wrap('<msup><mi>x</mi><mn>2</mn></msup>');
test('attribute order, quotes, self-closing and numeric entities are serialization only',()=>{
  assert.equal(norm(wrap('<mo stretchy="false" form="infix">&#x2264;</mo><mspace/>')),
    norm(wrap("<mo form='infix' stretchy='false'>≤</mo><mspace></mspace>")));
});
test('explicit tracking attributes and structural indentation are ignored',()=>{
  assert.equal(norm(base),norm(wrap('\n <msup data-mjx-texclass="ORD">\n <mi data-latex="x" data-latex-item="x">x</mi>\n <mn>2</mn>\n </msup>\n','data-latex="x^2"')));
});
test('namespace prefixes resolve to the same expanded name',()=>{
  assert.equal(norm(wrap('<mi>x</mi>')),norm('<m:math xmlns:m="http://www.w3.org/1998/Math/MathML"><m:mi>x</m:mi></m:math>'));
});
test('CDATA and XML line ending handling',()=>{
  assert.equal(norm(wrap('<mtext><![CDATA[a&b\r\nc]]></mtext>')),norm(wrap('<mtext>a&amp;b\nc</mtext>')));
});
for(const [name,changed] of [
  ['token',base.replace('>x<','>y<')], ['number',base.replace('>2<','>3<')],
  ['structure',base.replaceAll('msup','msub')], ['missing node',wrap('<mi>x</mi>')],
  ['sibling order',wrap('<msup><mn>2</mn><mi>x</mi></msup>')],
  ['display mode',base.replace('<math ','<math display="block" ')],
  ['variant',base.replace('<mi>','<mi mathvariant="bold">')],
  ['stretchy',base.replace('<mi>','<mi stretchy="false">')],
  ['unknown data attribute',base.replace('<mi>','<mi data-test="important">')],
  ['id',base.replace('<mi>','<mi id="user-id">')],
  ['href',base.replace('<mi>','<mi href="#target">')]
]) test(`negative: ${name} cannot normalize away`,()=>assert.notEqual(norm(base),norm(changed)));
test('spaces in tokens, mtext, annotations and attribute values remain significant',()=>{
  for(const tag of ['mi','mn','mo','mtext','ms','annotation']) assert.notEqual(norm(wrap(`<${tag}> </${tag}>`)),norm(wrap(`<${tag}></${tag}>`)));
  assert.notEqual(norm(wrap('<mtext>a b</mtext>')),norm(wrap('<mtext>ab</mtext>')));
  assert.notEqual(norm(wrap('<mi class="a b">x</mi>')),norm(wrap('<mi class="ab">x</mi>')));
});
for(const [name,bad] of [
  ['unbalanced',base.replace('</msup>','')], ['duplicate attribute',wrap('<mi id="a" id="b">x</mi>')],
  ['raw ampersand',wrap('<mi>a&b</mi>')], ['unknown entity',wrap('<mi>&madeup;</mi>')],
  ['invalid code point',wrap('<mi>&#0;</mi>')], ['DTD','<!DOCTYPE math SYSTEM "https://invalid">'+base],
  ['extra root',base+base], ['wrong namespace',base.replace('http://www.w3.org/1998/Math/MathML','urn:wrong')],
  ['missing namespace','<math><mi>x</mi></math>'], ['unbound prefix',wrap('<x:mi>x</x:mi>')],
  ['trailing text',base+'oops'], ['empty',''], ['attribute missing separator',wrap('<mi a="a"b="b">x</mi>')]
]) test(`invalid XML: ${name}`,()=>assert.throws(()=>norm(bad)));
test('runner uses all cases as denominator and distinguishes failure classes',async()=>{
  const records=['same','text','structure','attributes','invalid','throw','unsupported','badexpected'].map((id)=>({id,group:'base',input:{tex:id},expected:base,unsupported:id==='unsupported'?'test-unsupported':null}));
  records.at(-1).expected='<broken>';
  const fixture={schemaVersion:1,records};
  const report=await run((tex)=>{
    if(tex==='throw') throw Error('failure');
    if(tex==='invalid') return '<math>';
    if(tex==='text') return base.replace('>x<','>y<');
    if(tex==='structure') return base.replaceAll('msup','msub');
    if(tex==='attributes') return base.replace('<mi>','<mi mathvariant="bold">');
    return base;
  },fixture);
  assert.equal(report.total,8); assert.equal(report.matched,1); assert.equal(report.rate,1/8);
  assert.deepEqual(report.classifications,{'text':1,'structure':1,'attributes':1,'invalid-actual':1,'subject-error':1,'test-unsupported':1,'invalid-expected':1});
  assert.match(table(report),/ALL \| 1 \| 6 \| 1 \| 8 \| 12.50%/);
  await assert.rejects(()=>run(()=>base,{schemaVersion:1,records:[]}));
  await assert.rejects(()=>run(()=>base,{schemaVersion:1,records:[records[0],records[0]]}));
});
test('blank subject never passes fixture and changing one genuine fixture token is detected',async()=>{
  const fixture=JSON.parse(fs.readFileSync(defaultFixture));
  const record=fixture.records.find(r=>r.id==='Base.test.ts::Identifiers Identifier 1');
  assert.ok(record && !record.unsupported);
  const one={...fixture,records:[record]};
  assert.equal((await run(()=>'',one)).matched,0);
  assert.equal((await run(()=>record.expected,one)).matched,1);
  assert.equal((await run(()=>record.expected.replace('>x<','>y<'),one)).classifications.text,1);
});
test('only XML whitespace is formatting; NBSP in content cannot disappear',()=>{
  assert.notEqual(norm(wrap('<mrow>\u00a0</mrow>')),norm(wrap('<mrow></mrow>')));
  assert.notEqual(norm(wrap('<unknown> </unknown>')),norm(wrap('<unknown></unknown>')));
  assert.notEqual(norm(wrap('<span xmlns="http://www.w3.org/1999/xhtml"> </span>')),norm(wrap('<span xmlns="http://www.w3.org/1999/xhtml"></span>')));
  assert.throws(()=>norm('\u00a0'+base));
  assert.throws(()=>norm(wrap('<mi\u00a0id="a">x</mi>')));
});
test('upstream capture order and single-line MathML snapshots are retained',()=>{
  const fixture=JSON.parse(fs.readFileSync(defaultFixture));
  const unicode=fixture.records.filter(r=>r.group==='unicode');
  assert.equal(unicode[0].source.test,'Unicode Unicode Dec 1');
  assert.ok(unicode.findIndex(r=>r.source.test==='Unicode Complete Unicode Caligraphic 1') < unicode.findIndex(r=>r.source.test==='Unicode Complete Unicode Bold 1'));
  const empty=fixture.records.find(r=>r.id==='Mathtools.test.ts::Mathtools Paired Delimiters DeclarePairedDelimiters Backward Compatibility 1');
  assert.ok(empty.expected.endsWith('</math>') && !empty.unsupported);
  const regex=fixture.records.find(r=>r.input?.texOptions.identifierPattern);
  assert.deepEqual(regex.input.texOptions.identifierPattern,{$regexp:'^$',flags:''});
});
test('checkpoint resumes completed cases without re-evaluating the subject',async()=>{
  const fixture={schemaVersion:1,records:['a','b','c'].map(id=>({id,group:'base',input:{tex:id,packages:['base']},expected:base}))};
  const journal=[];
  await assert.rejects(()=>run(()=>base,fixture,{onRow(row,n) {journal.push(row);if(n===2) throw Error('simulated interruption');}}),/simulated interruption/);
  assert.equal(journal.length,2);
  let calls=0;
  const report=await run(()=>{calls++;return base;},fixture,{previousRows:journal,onRow(row){journal.push(row);}});
  assert.equal(calls,1);assert.equal(report.matched,3);assert.equal(journal.length,3);
  await assert.rejects(()=>run(()=>base,fixture,{previousRows:[{...journal[0],id:'wrong'}]}),/Checkpoint record mismatch/);
  await assert.rejects(()=>run(()=>base,fixture,{previousRows:[...journal,journal[0]]}),/too many/);
});
test('CLI resumes a torn JSONL checkpoint, rejects stale code, and returns failure for incomplete coverage',async()=>{
  const {mkdtempSync,writeFileSync,readFileSync,appendFileSync,rmSync}=await import('node:fs');
  const {spawnSync}=await import('node:child_process');
  const {join}=await import('node:path');
  const {fileURLToPath}=await import('node:url');
  assert.ok(process.env.TMPDIR,'TMPDIR required for test scratch files');
  const scratch=mkdtempSync(join(process.env.TMPDIR,'conformance-'));
  try {
    const subject=join(scratch,'subject.mjs'), fixture=join(scratch,'fixture.json'), output=join(scratch,'result.json');
    writeFileSync(subject,`export default (tex)=>${JSON.stringify(base)};\n`);
    writeFileSync(fixture,JSON.stringify({schemaVersion:1,records:[{id:'a',group:'base',input:{tex:'a',packages:['base']},expected:base},{id:'b',group:'base',unsupported:'test-unsupported'}]}));
    const args=[fileURLToPath(new URL('./runner.mjs',import.meta.url)),'--subject',subject,'--fixture',fixture,'--output',output];
    let result=spawnSync(process.execPath,args,{encoding:'utf8'});
    assert.equal(result.status,1,result.stderr); assert.match(result.stdout,/ALL \| 1 \| 0 \| 1 \| 2 \| 50.00%/);
    const first=JSON.parse(readFileSync(output));
    const lines=readFileSync(output+'.jsonl','utf8').trimEnd().split('\n');
    // A complete first row and a torn second row model a killed writer.
    writeFileSync(output+'.jsonl',lines.slice(0,2).join('\n')+'\n'+lines[2].slice(0,10));
    result=spawnSync(process.execPath,args,{encoding:'utf8'});
    assert.equal(result.status,1,result.stderr); assert.match(result.stderr,/checkpoint: 1\/2 completed/);
    assert.deepEqual(JSON.parse(readFileSync(output)),first);
    appendFileSync(subject,'// changed subject\n');
    result=spawnSync(process.execPath,args,{encoding:'utf8'});
    assert.notEqual(result.status,0); assert.match(result.stderr,/Stale checkpoint/);
    result=spawnSync(process.execPath,[...args,'--fresh'],{encoding:'utf8'});
    assert.equal(result.status,1,result.stderr); assert.match(result.stderr,/checkpoint: 0\/2 completed/);
  } finally {rmSync(scratch,{recursive:true,force:true});}
});

test('reserved namespaces and inherited object keys cannot become valid namespace bindings',()=>{
  assert.throws(()=>norm(wrap('<constructor:mi>x</constructor:mi>')));
  assert.throws(()=>norm(wrap('<mrow xmlns:p="http://www.w3.org/XML/1998/namespace"><mi>x</mi></mrow>')));
  assert.throws(()=>norm(wrap('<mrow xmlns:p="http://www.w3.org/2000/xmlns/"><mi>x</mi></mrow>')));
  assert.notEqual(norm(wrap('<__proto__:mi xmlns:__proto__="urn:foreign">x</__proto__:mi>')),norm(wrap('<mi>x</mi>')));
});
