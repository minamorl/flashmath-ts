// Color separates overlapping ink without relying on MathML token rectangles.
// The colors affect paint only; the tested layout and font metrics stay intact.
export const xArrows={
  ams:['xrightarrow','xleftarrow'],
  mathtools:['xleftrightarrow','xLeftarrow','xRightarrow','xLeftrightarrow','xhookleftarrow','xhookrightarrow','xmapsto','xrightharpoondown','xleftharpoondown','xrightleftharpoons','xrightharpoonup','xleftharpoonup','xleftrightharpoons','xlongrightarrow','xlongleftarrow','xLongrightarrow','xLongleftarrow'],
  extpfeil:['xtwoheadrightarrow','xtwoheadleftarrow','xmapsto','xlongequal','xtofrom'],
};
export const inkCases=Object.entries(xArrows).flatMap(([pkg,commands])=>commands.flatMap(command=>[
  {id:`${pkg}/${command}/over-f`,tex:`A \\${command}{f} B`},
  {id:`${pkg}/${command}/both-gf`,tex:`A \\${command}[f]{g} B`},
  {id:`${pkg}/${command}/under-g`,tex:`A \\${command}[g]{} B`},
].map(c=>({...c,packages:['base','ams',pkg]}))));
inkCases.push(
  {id:'reported',tex:String.raw`A \xrightarrow{f} B \xrightarrow{g} X`,packages:['base','ams']},
  {id:'reported-serif',tex:String.raw`A \xrightarrow{f} B \xrightarrow{g} X`,packages:['base','ams'],font:'serif'},
  {id:'fraction',tex:String.raw`A \xrightarrow[\frac{fg}{xy}]{\frac{fg}{xy}} B`,packages:['base','ams']},
  {id:'script',tex:String.raw`x^{A\xrightarrow[g]{f}B}`,packages:['base','ams']},
  {id:'custom',tex:String.raw`A \Newextarrow{\custom}{3,8}{8594}\custom[g]{f} B`,packages:['base','extpfeil']},
);

export async function measureInk({send,evaluate},rows,{reference=false,scale=4}={}){
  await evaluate(`(() => {
    for(const row of document.querySelectorAll('.ink-case')){
      const stacks=[...row.querySelectorAll('${reference?'mjx-mover,mjx-munderover,mjx-munder':'mover,munderover,munder'}')];
      for(const stack of stacks){
        if(stack.parentElement.closest('${reference?'mjx-mover,mjx-munderover,mjx-munder':'mover,munderover,munder'}'))continue;
        if(!stack.querySelector('${reference?'mjx-mo':'mo'}'))continue;
        const children=[...stack.children];
        // CHTML wraps limits in mjx-over / mjx-under, with a possible mjx-box.
        const base=${reference?"stack.querySelector('mjx-base mjx-mo')??stack.querySelector('mjx-mo')":'children[0]'};
        const upper=${reference?"stack.querySelector('mjx-over')":"stack.localName==='mover'?children[1]:stack.localName==='munderover'?children[2]:null"};
        const lower=${reference?"stack.querySelector('mjx-under')":"stack.localName!=='mover'?children[1]:null"};
        base.style.color='rgb(200,0,0)';base.dataset.ink='arrow';
        if(upper){upper.style.color='rgb(0,0,200)';upper.dataset.ink='upper';}
        if(lower){lower.style.color='rgb(0,150,0)';lower.dataset.ink='lower';}
        stack.dataset.inkStack='true';
      }
    }
  })()`);
  await evaluate('document.body.offsetHeight; document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))');
  const geometry=await evaluate(`Array.from(document.querySelectorAll('.ink-case'),row=>{
    const box=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
    return {id:row.dataset.id,stacks:Array.from(row.querySelectorAll('[data-ink-stack]'),s=>({
      box:box(s),parts:Object.fromEntries([...s.querySelectorAll('[data-ink]')].map(n=>[n.dataset.ink,{box:box(n),style:n.getAttribute('style'),fontSize:getComputedStyle(n).fontSize,mathStyle:getComputedStyle(n).mathStyle}])),html:s.outerHTML,
    }))};
  })`);
  const height=await evaluate('document.documentElement.scrollHeight');
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:1000,height,scale}});
  const measured=await evaluate(`(async()=>{
    const image=new Image();image.src='data:image/png;base64,${shot.data}';await image.decode();
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
    return ${JSON.stringify(geometry)}.map(row=>({...row,stacks:row.stacks.map(s=>{
      const x=Math.max(0,Math.floor(s.box.x*${scale})-2),y=Math.max(0,Math.floor(s.box.y*${scale})-2);
      const w=Math.min(canvas.width-x,Math.ceil(s.box.right*${scale})-x+2),h=Math.min(canvas.height-y,Math.ceil(s.box.bottom*${scale})-y+2);
      const data=ctx.getImageData(x,y,w,h).data,ink={};
      for(let j=0;j<h;j++)for(let i=0;i<w;i++){
        const k=4*(j*w+i),r=data[k],g=data[k+1],b=data[k+2];
        // Match each known color blended with white. Dominance alone would
        // mistake LCD antialiasing fringes of neighbouring black text for ink.
        const part=Math.abs(g-b)<4&&Math.abs(r-(200+55*g/255))<10&&r>g+60?'arrow'
          :Math.abs(r-g)<4&&Math.abs(b-(200+55*r/255))<10&&b>r+60?'upper'
          :Math.abs(r-b)<4&&Math.abs(g-(150+105*r/255))<10&&g>r+60?'lower':null;
        if(!part)continue;
        const p=ink[part]??={x:Infinity,y:Infinity,right:-Infinity,bottom:-Infinity};
        p.x=Math.min(p.x,(x+i)/${scale});p.y=Math.min(p.y,(y+j)/${scale});
        p.right=Math.max(p.right,(x+i+1)/${scale});p.bottom=Math.max(p.bottom,(y+j+1)/${scale});
      }
      return {...s,ink,gaps:{upper:ink.upper&&ink.arrow?ink.arrow.y-ink.upper.bottom:null,lower:ink.lower&&ink.arrow?ink.lower.y-ink.arrow.bottom:null},offsets:Object.fromEntries(['upper','lower'].filter(p=>ink[p]&&ink.arrow).map(p=>[p,(ink[p].x+ink[p].right-ink.arrow.x-ink.arrow.right)/2]))};
    })}));
  })()`);
  return {rows:measured,png:Buffer.from(shot.data,'base64')};
}

export function inkHTML(rows){
  return `<!doctype html><meta charset="utf-8"><style>body{margin:12px;background:white;color:black}.ink-case{display:flex;align-items:center;height:96px;font-family:serif}.ink-case math{font-family:var(--math-font);white-space:nowrap}code{width:360px;font:10px monospace;flex-shrink:0}</style>${rows.map(r=>`<div class="ink-case" data-id="${r.id}" style="font-size:${r.size}px;--math-font:${r.font??"'DejaVu Math TeX Gyre',math"}"><code>${r.id}</code>${r.xml}</div>`).join('')}`;
}
