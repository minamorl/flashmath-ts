import fs from 'node:fs';
const dir='artifacts/xarrow-voffset';
const data=Object.fromEntries(['before','after','reference'].map(m=>[m,JSON.parse(fs.readFileSync(`${dir}/${m}/ink.json`))]));
const by=Object.fromEntries(Object.entries(data).map(([m,d])=>[m,new Map(d.rows.map(r=>[r.id,r]))]));
const cases=[];
let maxWidthDelta=0,maxLayoutOffsetDelta=0;
for(const before of data.before.rows){
  const after=by.after.get(before.id),ref=by.reference.get(before.id);
  for(const [i,b] of before.stacks.entries()){
    const a=after.stacks[i];
    maxWidthDelta=Math.max(maxWidthDelta,Math.abs(a.box.width-b.box.width));
    for(const part of Object.keys(b.parts)){
      const offset=s=>(s.parts[part].box.x+s.parts[part].box.right-s.box.x-s.box.right)/2;
      maxLayoutOffsetDelta=Math.max(maxLayoutOffsetDelta,Math.abs(offset(a)-offset(b)));
    }
    cases.push({id:before.id,stack:i,before:b.gaps,after:a.gaps,chtml:ref.stacks[i].gaps,
      offsetBefore:b.offsets,offsetAfter:a.offsets,widthBefore:b.box.width,widthAfter:a.box.width});
  }
}
const summary={maxWidthDelta,maxLayoutOffsetDelta,minUpper:Math.min(...cases.map(r=>r.after.upper).filter(Number.isFinite)),minLower:Math.min(...cases.map(r=>r.after.lower).filter(Number.isFinite))};
fs.writeFileSync(`${dir}/comparison.json`,JSON.stringify({browser:data.after.browser,summary,cases},null,2)+'\n');
for(const row of cases.filter(r=>['20/reported','20/reported-serif','20/ams/xrightarrow/both-gf','32/reported-serif'].includes(r.id)))console.log(JSON.stringify(row));
console.log(JSON.stringify(summary));
