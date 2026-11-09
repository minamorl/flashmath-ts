import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseToReact} from '../../dist/react.js';
import {parseToMathMLAst,toMathMLString} from '../../dist/index.js';
import {withChromium} from '../helpers/chromium.mjs';

const arrows={
  ams:['xrightarrow','xleftarrow'],
  mathtools:['xleftrightarrow','xLeftarrow','xRightarrow','xLeftrightarrow','xhookleftarrow','xhookrightarrow','xmapsto','xrightharpoondown','xleftharpoondown','xrightleftharpoons','xrightharpoonup','xleftharpoonup','xleftrightharpoons','xlongrightarrow','xlongleftarrow','xLongrightarrow','xLongleftarrow'],
  extpfeil:['xtwoheadrightarrow','xtwoheadleftarrow','xmapsto','xlongequal','xtofrom'],
};
const cases=[{id:'reported',tex:String.raw`\text{命名} \xrightarrow{\text{因果連鎖}} \text{現在の使用} \xrightarrow{\text{全可能世界}} \text{同一対象}`,packages:['base','ams']}];
for(const [pkg,commands] of Object.entries(arrows))for(const command of commands)for(const [label,args] of [
  ['over',String.raw`{\text{全可能世界 long label}}`],
  ['both',String.raw`[\text{much wider lower annotation}]{\text{因果連鎖}}`],
  ['under',String.raw`[\text{全可能世界 long label}]{} `],
])cases.push({id:`${pkg}-${command}-${label}`,tex:`\\text{前} \\${command}${args} \\text{後}`,packages:['base','ams',pkg]});
cases.push(
  {id:'script',tex:String.raw`x^{a\xrightarrow[\text{long lower}]{\text{long upper}}b}`,packages:['base','ams']},
  {id:'fraction-label',tex:String.raw`a\xrightarrow[\frac{abcdef}{ghij}]{\text{因果連鎖}}b`,packages:['base','ams']},
  {id:'custom',tex:String.raw`a\Newextarrow{\custom}{3,8}{8594}\custom[\text{lower annotation}]{\text{upper annotation}}b`,packages:['base','extpfeil']},
);

test('Chromium native x-arrows span labels without neighbour collisions in horizontal and vertical text', {timeout:60000},async()=>{
  const rows=[];
  for(const writing of ['horizontal-tb','vertical-rl'])for(const display of [false,true])for(const c of cases)for(const source of ['react','string']){
    const options={packages:c.packages,display,...(process.env.XARROW_BASELINE?{output:'mathjax'}:{})};
    const xml=source==='react'?renderToStaticMarkup(parseToReact(c.tex,options)):toMathMLString(parseToMathMLAst(c.tex,options),options);
    assert.doesNotMatch(xml,/<merror/);
    rows.push({...c,id:`${writing}/${display}/${c.id}/${source}`,writing,source,xml});
  }
  // Unannotated arrows are compared to the untouched MathJax tree in the same browser.
  for(const tex of [String.raw`a\rightarrow b`,String.raw`a\leftarrow b`,String.raw`a\leftrightarrow b`,String.raw`a\xrightarrow{}b`,String.raw`a\xleftarrow{}b`]){
    for(const output of ['native','mathjax'])rows.push({id:`bare/${tex}/${output}`,writing:'horizontal-tb',source:output,tex,xml:renderToStaticMarkup(parseToReact(tex,{packages:['base','ams'],output}))});
  }
  await withChromium(async({send,evaluate})=>{
    const html=`<!doctype html><meta charset="utf-8"><style>body{margin:12px;background:white;color:black;font:15px math}.case{height:44px;display:flex;align-items:center;border-bottom:1px solid #ddd;min-width:0}.context{writing-mode:var(--writing);height:40px}math{writing-mode:horizontal-tb;white-space:nowrap;font-family:'DejaVu Math TeX Gyre',math}code{display:inline-block;width:230.5px;flex-shrink:0;font:10px monospace}</style>${rows.map((r,i)=>`<div class="case" data-row="${i}"><code>${r.id.replaceAll('<','&lt;')}</code><div class="context" style="--writing:${r.writing}">${r.xml}</div></div>`).join('')}`;
    await send('Page.setDocumentContent',{frameId:(await send('Page.getFrameTree')).frameTree.frame.id,html});
    await evaluate('document.fonts.ready.then(()=>true)');
    const measurements=await evaluate(`Array.from(document.querySelectorAll('.case'),row=>{
      const box=n=>{const b=n.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom}};
      const stacks=Array.from(row.querySelectorAll('mover,munder,munderover')).filter(n=>n.children[0]?.localName==='mo'||n.children[0]?.localName==='mstyle'&&n.children[0].querySelector('mo'));
      const tokens=Array.from(row.querySelectorAll('mi,mn,mo,mtext'));
      return {id:Number(row.dataset.row),math:box(row.querySelector('math')),stacks:stacks.map(n=>{
        const base=n.children[0],mo=base.localName==='mo'?base:base.querySelector('mo');
        const labels=Array.from(n.children).slice(1).map(label=>({layout:box(label),tokens:Array.from(label.querySelectorAll('mi,mn,mo,mtext'),box)}));
        return {stack:box(n),arrow:box(mo),labels,neighbours:tokens.filter(t=>!n.contains(t)).map(box)};
      })};
    })`);
    const height=await evaluate('document.documentElement.scrollHeight');
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:1440,height,scale:1}});
    // Chrome's mo DOM rect retains the unstretched glyph advance even when its
    // paint is stretched. Read the actual arrow pixels inside its baseline band.
    const ink=await evaluate(`(async()=>{
      const image=new Image();image.src='data:image/png;base64,${shot.data}';await image.decode();
      const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
      const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
      return ${JSON.stringify(measurements)}.map(row=>row.stacks.map(s=>{
        const x=Math.max(0,Math.floor(s.stack.x)),y=Math.max(0,Math.floor(s.arrow.y)-1);
        const w=Math.min(canvas.width-x,Math.ceil(s.stack.right)-x),h=Math.max(1,Math.ceil(s.arrow.bottom)+1-y);
        const data=ctx.getImageData(x,y,w,h).data;let left=w,right=-1;
        for(let j=0;j<h;j++)for(let i=0;i<w;i++){const k=4*(j*w+i);if(data[k]<100&&data[k+1]<100&&data[k+2]<100){left=Math.min(left,i);right=Math.max(right,i);}}
        return {x:x+left,right:x+right+1,width:Math.max(0,right-left+1)};
      }));
    })()`);
    const failures=[];
    for(const [i,row] of measurements.entries()){
      for(const [j,s] of row.stacks.entries()){
        const painted=ink[i][j];s.ink=painted;
        for(const label of s.labels)for(const b of label.tokens){
          if(b.width===0)continue;
          if(painted.width+.75<b.width)failures.push(`${rows[i].id}: painted arrow ${painted.width} < label ${b.width}`);
          if(b.x<s.stack.x-.5||b.right>s.stack.right+.5)failures.push(`${rows[i].id}: label escapes stack`);
          // Assert projection separation from adjacent tokens, and 2D separation
          // from the actual arrow's baseline band, including below annotations.
          for(const neighbour of s.neighbours)if(neighbour.width&&Math.min(b.right,neighbour.right)-Math.max(b.x,neighbour.x)>.5)failures.push(`${rows[i].id}: label/neighbor overlap`);
          if(Math.min(b.bottom,s.arrow.bottom)-Math.max(b.y,s.arrow.y)>.5)failures.push(`${rows[i].id}: label/arrow overlap`);
        }
      }
      if(rows[i].source==='string'){
        const previous=measurements[i-1];
        if(Math.abs(row.math.width-previous.math.width)>.1||Math.abs(row.math.height-previous.math.height)>.1)failures.push(`${rows[i].id}: SSR/string geometry differs`);
      }
      if(rows[i].source==='mathjax'){
        const previous=measurements[i-1];
        if(Math.abs(row.math.width-previous.math.width)>.1||Math.abs(row.math.height-previous.math.height)>.1)failures.push(`${rows[i].id}: bare arrow changed`);
      }
    }
    const report={browser:await send('Browser.getVersion'),viewport:{width:1440,height:1000},rows:rows.map((r,i)=>({...r,measurements:measurements[i]})),failures};
    if(process.env.XARROW_ARTIFACT_DIR){
      fs.mkdirSync(process.env.XARROW_ARTIFACT_DIR,{recursive:true});
      fs.writeFileSync(path.join(process.env.XARROW_ARTIFACT_DIR,'screen.json'),JSON.stringify(report,null,2)+'\n');
      fs.writeFileSync(path.join(process.env.XARROW_ARTIFACT_DIR,'screen.html'),html);
      const panel=await send('Page.captureScreenshot',{format:'png',clip:{x:0,y:0,width:1440,height:1000,scale:1}});
      fs.writeFileSync(path.join(process.env.XARROW_ARTIFACT_DIR,'screen.png'),Buffer.from(panel.data,'base64'));
      const vertical=measurements[rows.findIndex(r=>r.writing==='vertical-rl')].math.y;
      const verticalPanel=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:Math.floor(vertical)-10,width:1440,height:1000,scale:1}});
      fs.writeFileSync(path.join(process.env.XARROW_ARTIFACT_DIR,'screen-vertical.png'),Buffer.from(verticalPanel.data,'base64'));
    }
    console.log(`screen_run: ${report.browser.product}; rendered ${rows.length} React/string inline/display formulas in horizontal-tb and vertical-rl contexts; measured labels/neighbours and screenshot arrow ink; ${failures.length} failures`);
    assert.deepEqual(failures.slice(0,20),[]);
  });
});
