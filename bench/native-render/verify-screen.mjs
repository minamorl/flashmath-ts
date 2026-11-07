import fs from 'node:fs';
import assert from 'node:assert/strict';
import {parseMathML,firstDifference} from '../../conformance/normalize.mjs';
const directory=new URL('./',import.meta.url);
const screen=JSON.parse(fs.readFileSync(new URL('after-screen.json',directory)));
const cases=JSON.parse(fs.readFileSync(new URL('after-cases.json',directory)));
const baseline=JSON.parse(fs.readFileSync(new URL('before-screen.json',directory)));
assert.equal(screen.count,cases.length);assert.ok(screen.count>=150);
assert.deepEqual(screen.reactChecks.errors,[]);assert.deepEqual(screen.reactChecks.recoverable,[]);assert.equal(screen.reactChecks.hydrated,cases.length);assert.equal(screen.reactChecks.clientRendered,2638);
assert.equal(screen.ssrStringParity,true);assert.deepEqual(screen.exceptions,[]);
assert.deepEqual(screen.measurements.filter(r=>baseline.measurements.some(b=>b.id===r.id)).map(r=>r.id),baseline.measurements.map(r=>r.id));
const checks=[],failures=[];
const check=(id,name,pass,details={})=>{const row={id,name,pass,details};checks.push(row);if(!pass)failures.push(row);};
const center=b=>b.x+b.width/2;
for(let i=0;i<cases.length;i++){
  const c=cases[i],m=screen.measurements.find(m=>m.id===c.id);assert.equal(c.id,m.id);
  check(c.id,'visible',m.native.width>0&&m.native.height>0&&m.reference.width>0&&m.reference.height>0);
  check(c.id,'Core enclosures/rows and no private font slots',m.legacy===0&&m.pua===0);
  for(const d of m.decorations){
    if(d.content){
      if(/strike|arrow/.test(d.kind))check(c.id,'enclosure strokes exist',m.decorations.some(s=>s.color!=='rgba(0, 0, 0, 0)'&&s.box.width>0&&s.box.height>0));
      if(/(?:^| )(?:box|circle|roundedbox|top|right|bottom|left|actuarial|madruwb|longdiv|phasorangle)(?: |$)/.test(d.kind))check(c.id,'enclosure borders exist',d.strokes.some(s=>s.borders.some(w=>parseFloat(w)>0)));
      if(d.kind==='radical')check(c.id,'Core radical',c.native.includes('<msqrt>'));
    }else{
      check(c.id,'painted stroke',d.box.width>0&&d.box.height>0&&d.color!=='rgba(0, 0, 0, 0)');
      for(const h of d.heads)check(c.id,'painted arrowhead',h.box.width>0&&h.box.height>0&&h.clip!=='none'&&h.color!=='rgba(0, 0, 0, 0)');
    }
  }
  for(const b of m.bboxes){
    const bounds={left:Math.min(...b.content.map(c=>c.x)),right:Math.max(...b.content.map(c=>c.right)),top:Math.min(...b.content.map(c=>c.y)),bottom:Math.max(...b.content.map(c=>c.bottom))};
    check(c.id,'bbox encloses complete content',b.parent.x<=bounds.left&&b.parent.right>=bounds.right&&b.parent.y<=bounds.top&&b.parent.bottom>=bounds.bottom&&b.borders.some(w=>parseFloat(w)>0),{parent:b.parent,content:bounds});
  }
  for(const o of m.overlaps){
    const delta=Math.abs(center(o.children[0])-center(o.overlayContent));
    check(c.id,'overlay horizontally centered',delta<.75,{delta});
    check(c.id,'overlay preserves base width',Math.abs(o.box.width-o.children[0].width)<.75);
  }
  for(const a of m.accents)check(c.id,'overline spans complete base',a.accent.width>=a.base.width-.75,{base:a.base.width,accent:a.accent.width});
  for(const l of m.labels){
    const bodies=l.cells.slice(1,-1),left=Math.min(...bodies.map(b=>b.x)),right=Math.max(...bodies.map(b=>b.right));
    check(c.id,'tag side and separation',l.box.width>0&&l.box.height>0&&(l.side==='left'?l.box.right<=left:l.box.x>=right),{side:l.side,tag:l.box,body:{left,right}});
    check(c.id,'tag shares equation row',bodies.every(b=>l.box.y<b.bottom&&l.box.bottom>b.y));
  }
  for(const chem of m.chemistry){
    check(c.id,'chemistry strokes painted inside glyph box',chem.strokes.every(s=>s.box.width>0&&s.box.height>0&&s.box.x>=chem.box.x-.75&&s.box.right<=chem.box.right+.75&&s.box.y>=chem.box.y-.75&&s.box.bottom<=chem.box.bottom+.75&&(s.color!=='rgba(0, 0, 0, 0)'||s.background!=='none')),{chem});
    if(chem.kind==='bond'){
      const lines=chem.strokes;
      check(c.id,'bond centered on neighbouring atom math axis',Math.abs((lines[0].box.y+lines.at(-1).box.bottom)/2-(chem.anchor.bottom-6))<1,{anchor:chem.anchor,lines});
      check(c.id,'bond lines aligned and equally spaced',lines.every(s=>Math.abs(s.box.x-lines[0].box.x)<.5&&Math.abs(s.box.width-lines[0].box.width)<.5)&&lines.slice(1).every((s,i)=>Math.abs((s.box.y-lines[i].box.y)/chem.box.width-.19/.828)<.025),{lines});
      check(c.id,'bond dash position',lines.map(s=>s.kind).join(',')===(chem.label==='~-'?'dashed,solid':chem.label==='~--'?'dashed,solid,solid':'solid,dashed,solid'));
    }else{
      const [upper,lower]=chem.strokes;
      check(c.id,'harpoons leave space on both sides',chem.box.x-chem.anchor.right>3&&chem.following.x-chem.box.right>3,{chem});
      check(c.id,'harpoons have distinct direction and lengths',chem.heads.map(h=>h.direction).join(',')==='right,left'&&chem.heads.every(h=>h.box.width>0&&h.clip!=='none')&&Math.abs(upper.box.width-lower.box.width)>8,{strokes:chem.strokes});
      check(c.id,'harpoon short line follows source direction',c.tex.includes('<=>>')?upper.box.width>lower.box.width:lower.box.width>upper.box.width);
    }
  }
  for(const label of m.proofLabels)check(c.id,'proof label stays next to inference',label.gap>=-1&&label.gap<12,{label});
  if(c.group==='proofs'){
    const expected=[...c.mathjax.matchAll(/rowlines="(solid|dashed)"/g)].map(m=>m[1]);
    check(c.id,'proof line count',m.rules.length===expected.length,{expected,actual:m.rules.map(r=>r.border)});
    check(c.id,'proof line types',m.rules.map(r=>r.border).sort().join()===expected.sort().join());
    for(const rule of m.rules){
      const delta=Math.abs(center(rule.box)-center(rule.content));
      check(c.id,'conclusion/premises centered on rule',delta<.75,{delta});
    }
  }
}
const referenceDifferences=cases.flatMap(c=>{
  const difference=firstDifference(parseMathML(c.referenceMathML),parseMathML(c.mathjax));
  return difference?[{id:c.id,difference}]:[];
});
assert.deepEqual(referenceDifferences,[],'Unexpected strict MathJax MathML differences');
assert.equal(screen.variantGlyphs.distinct,true);
assert.ok(screen.variantGlyphs.faces.every(f=>f.status==='loaded'));
const groups=[...new Set(cases.map(c=>c.group))].map(group=>{
  const ids=new Set(cases.filter(c=>c.group===group).map(c=>c.id));
  const selected=checks.filter(c=>ids.has(c.id));
  return {group,formulas:ids.size,checks:selected.length,failed:selected.filter(c=>!c.pass).length};
});
const report={browser:screen.browser.product,formulas:cases.length,ssrStringParity:true,checks,groups,failures,referenceDifferences,pixelParity:'not asserted: different native and MathJax SVG fonts; see docs/native-render.md'};
fs.writeFileSync(new URL('visual-checks.json',directory),JSON.stringify(report,null,2)+'\n');
for(const g of groups)console.log(`${g.group}: ${g.formulas} formulas, ${g.checks} checks, ${g.failed} failures`);
if(failures.length)console.error(JSON.stringify(failures,null,2));
assert.deepEqual(failures,[]);
const table=['| Group | Formulas | Geometry/feature checks | Failures |','| --- | ---: | ---: | ---: |',...groups.map(g=>`| ${g.group} | ${g.formulas} | ${g.checks} | ${g.failed} |`)].join('\n');
const docs=new URL('../../docs/native-render.md',import.meta.url);
const text=fs.readFileSync(docs,'utf8');
fs.writeFileSync(docs,text.replace(/<!-- measured-results -->[\s\S]*?<!-- \/measured-results -->/,`<!-- measured-results -->\n\n${table}\n\nBrowser: ${screen.browser.product}. All ${cases.length} SSR/string pairs have identical measured geometry.\n\n<!-- /measured-results -->\n`));
console.log(`visual feature gate: ${checks.length} checks; no failures; pixel identity not asserted`);
