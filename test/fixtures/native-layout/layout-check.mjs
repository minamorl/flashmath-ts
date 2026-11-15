// Pixel/geometry assertions for native MathML and frozen regression controls.
// The generated pages also include MathJax SVG for visual comparison.
export async function inspectLayout(page, {artifacts, name='stix'}={}) {
  await page.evaluate(()=>document.fonts.ready);
  const geometry=await page.evaluate(()=>{
    const box=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    const tokens=n=>[...n.querySelectorAll('mi,mn,mo,mtext')].filter(t=>t.textContent);
    const union=ns=>{const bs=ns.map(box);return {x:Math.min(...bs.map(b=>b.x)),y:Math.min(...bs.map(b=>b.y)),right:Math.max(...bs.map(b=>b.right)),bottom:Math.max(...bs.map(b=>b.bottom))};};
    const cells=n=>{
      const lowered=[...n.querySelectorAll('[data-flashmath-cell]')];
      return lowered.length?[...new Set(lowered.map(c=>c.dataset.flashmathRow))].map(row=>lowered.filter(c=>c.dataset.flashmathRow===row)):[...n.querySelectorAll('mtr')].map(row=>[...row.children]);
    };
    const color=(n,c)=>{if(n)n.style.color=c;};
    const horizontal=[],vertical=[],items=[];
    for(let i=1;i<=10;i++){
      const section=document.querySelector(`#item-${i}`),fm=section.querySelector('.fm');
      items.push({n:i,errors:section.querySelectorAll('merror,[data-mjx-error]').length,
        formulas:[...fm.querySelectorAll('math')].map(box)});
      if(![2,3,4].includes(i))continue;
      for(const stack of fm.querySelectorAll('mover,munder,munderover')){
        const base=stack.children[0],arrow=base.localName==='mo'?base:base.querySelector('mo');
        if(!arrow||!['→','←'].includes(arrow.textContent))continue;
        const upper=stack.localName==='mover'?stack.children[1]:stack.localName==='munderover'?stack.children[2]:null;
        const lower=stack.localName==='mover'?null:stack.children[1];
        color(base,'rgb(200,0,0)');color(upper,'rgb(0,0,200)');color(lower,'rgb(0,150,0)');
        const cell=stack.closest('[data-flashmath-cell]');
        const peerEq=cell?[...cell.parentElement.children].filter(c=>c.dataset.flashmathRow===cell.dataset.flashmathRow).flatMap(tokens).find(t=>t.textContent==='='):null;
        horizontal.push({n:i,clip:union([stack,...tokens(stack)]),upper:upper?tokens(upper).length:0,lower:lower?tokens(lower).length:0,axis:peerEq?(box(peerEq).y+box(peerEq).bottom)/2:null});
      }
      if(i===4)continue;
      for(const arrow of [...fm.querySelectorAll('mo')].filter(n=>['↓','↑'].includes(n.textContent))){
        let row=arrow.parentElement;
        while(row&&!([...row.children].some(n=>n.localName==='mstyle')))row=row.parentElement;
        if(!row)throw Error(`item ${i}: vertical label container missing`);
        const scripts=[...row.children].filter(n=>n.localName==='mstyle');
        const base=[...row.children].findIndex(n=>n===arrow||n.contains(arrow));
        const labels=scripts.map(n=>({node:n,side:[...row.children].indexOf(n)<base?'left':'right'})).filter(n=>tokens(n.node).length);
        color(arrow,'rgb(200,0,0)');
        for(const {node,side}of labels)color(node,side==='left'?'rgb(0,0,200)':'rgb(0,150,0)');
        vertical.push({n:i,clip:union([arrow,...labels.flatMap(l=>tokens(l.node))]),labels:labels.map(l=>l.side)});
      }
    }
    const array=document.querySelector('#item-6 .fm mtable'),rows=cells(array);
    for(const cell of rows[0])for(const token of tokens(cell))color(token,'rgb(0,0,200)');
    for(const cell of rows[1]){
      cell.style.borderTopColor='rgb(200,0,0)';
      for(const token of tokens(cell))color(token,'rgb(0,150,0)');
    }
    const arrayClip=box(array);
    const det=[...document.querySelectorAll('#item-6 .fm .display mo')].filter(n=>n.textContent==='det').at(-1);
    const paren=[...document.querySelectorAll('#item-6 .fm .display mo')].find(n=>n.textContent==='(');
    const aligned=cells(document.querySelector('#item-9 .fm mtable')).map(row=>({
      left:union(tokens(row[0])),eq:box(tokens(row[1]).find(n=>n.textContent==='=')),
    }));
    return {items,horizontal,vertical,array:{clip:arrayClip},detGap:box(paren).x-box(det).right,aligned};
  });
  const png=await page.screenshot({fullPage:true});
  const pixels=await page.evaluate(async({data,geometry})=>{
    const image=new Image();image.src=`data:image/png;base64,${data}`;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
    const scale=image.width/window.innerWidth;
    const scan=clip=>{
      const x=Math.max(0,Math.floor(clip.x*scale)-2),y=Math.max(0,Math.floor(clip.y*scale)-2);
      const w=Math.min(canvas.width-x,Math.ceil(clip.right*scale)-x+2),h=Math.min(canvas.height-y,Math.ceil(clip.bottom*scale)-y+2);
      const data=ctx.getImageData(x,y,w,h).data,ink={};
      for(let j=0;j<h;j++)for(let i=0;i<w;i++){
        const k=4*(j*w+i),r=data[k],g=data[k+1],b=data[k+2];
        const part=Math.abs(g-b)<4&&Math.abs(r-(200+55*g/255))<10&&r>g+60?'arrow'
          :Math.abs(r-g)<4&&Math.abs(b-(200+55*r/255))<10&&b>r+60?'upper'
          :Math.abs(r-b)<4&&Math.abs(g-(150+105*r/255))<10&&g>r+60?'lower':null;
        if(!part)continue;
        const p=ink[part]??={x:Infinity,y:Infinity,right:-Infinity,bottom:-Infinity};
        p.x=Math.min(p.x,(x+i)/scale);p.y=Math.min(p.y,(y+j)/scale);
        p.right=Math.max(p.right,(x+i+1)/scale);p.bottom=Math.max(p.bottom,(y+j+1)/scale);
      }
      return ink;
    };
    return {horizontal:geometry.horizontal.map(h=>({...h,ink:scan(h.clip)})),vertical:geometry.vertical.map(v=>({...v,ink:scan(v.clip)})),array:scan(geometry.array.clip)};
  },{data:png.toString('base64'),geometry});
  const failures=[];
  const fail=(n,reason)=>failures.push({n,reason});
  for(const item of geometry.items){
    if(item.errors)fail(item.n,'merror in native or MathJax reference');
    if(!item.formulas.length||item.formulas.some(f=>f.width<=0||f.height<=0))fail(item.n,'missing formula geometry');
  }
  for(const h of pixels.horizontal){
    const a=h.ink.arrow;
    if(!a){fail(h.n,'missing horizontal arrow ink');continue;}
    if(h.axis!==null&&Math.abs((a.y+a.bottom)/2-h.axis)>1.5)fail(h.n,'horizontal arrow is off the object math axis');
    for(const part of ['upper','lower'])if(h[part]){
      const l=h.ink[part];
      if(!l){fail(h.n,`missing ${part} label ink`);continue;}
      if(a.x>l.x+.75||a.right<l.right-.75)fail(h.n,`arrow does not span ${part} label ink`);
      const gap=part==='upper'?a.y-l.bottom:l.y-a.bottom;
      if(gap<=0)fail(h.n,`${part} label touches horizontal arrow ink (${gap}px)`);
    }
  }
  for(const n of [2,3]){
    const arrows=pixels.horizontal.filter(h=>h.n===n).map(h=>h.ink.arrow);
    if(arrows.length!==2)fail(n,'expected two CD horizontal arrows');
    else if(arrows.every(Boolean)&&(Math.abs(arrows[0].x-arrows[1].x)>.75||Math.abs(arrows[0].right-arrows[1].right)>.75))fail(n,'CD arrows do not span the same column');
  }
  for(const v of pixels.vertical){
    const a=v.ink.arrow;
    if(!a){fail(v.n,'missing vertical arrow ink');continue;}
    for(const side of v.labels){
      const l=v.ink[side==='left'?'upper':'lower'];
      if(!l){fail(v.n,`missing ${side} vertical label ink`);continue;}
      const gap=side==='left'?a.x-l.right:l.x-a.right;
      if(gap<=0)fail(v.n,`${side} label touches vertical arrow ink (${gap}px)`);
    }
  }
  const rule=pixels.array.arrow,above=pixels.array.upper,below=pixels.array.lower;
  if(!rule||!above||!below)fail(6,'missing array rule or letter ink');
  else if(rule.y-above.bottom<2||below.y-rule.bottom<2)fail(6,'array rule has less than 2px of letter clearance');
  if(geometry.detGap>2||geometry.detGap< -1)fail(6,`det-negative-space gap ${geometry.detGap}px`);
  const [a,b]=geometry.aligned;
  if(Math.abs(a.left.right-b.left.right)>.5)fail(9,'left aligned column is not right-justified');
  if(Math.abs(a.eq.x-b.eq.x)>.5)fail(9,'right aligned column is not left-justified');
  const report={geometry,pixels,failures};
  if(artifacts){
    const {mkdirSync,writeFileSync}=await import('node:fs');
    mkdirSync(artifacts,{recursive:true});
    writeFileSync(`${artifacts}/${name}-ink.png`,png);
    writeFileSync(`${artifacts}/${name}-layout.json`,JSON.stringify(report,null,2)+'\n');
  }
  return report;
}
