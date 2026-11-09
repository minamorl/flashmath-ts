import fs from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseToReact} from '../../dist/react.js';
import {withChromium} from '../../test/helpers/chromium.mjs';

const tex=String.raw`\text{命名} \xrightarrow{\text{因果連鎖}} \text{現在の使用} \xrightarrow{\text{全可能世界}} \text{同一対象}`;
const original=renderToStaticMarkup(parseToReact(tex,{packages:['base','ams'],output:'mathjax'}));
const controls={
  original,
  native:renderToStaticMarkup(parseToReact(tex,{packages:['base','ams']})),
  explicitStretch:original.replaceAll('<mo ','<mo stretchy="true" '),
  naturalWidth:original.replaceAll(' width="+0.833em"',''),
  coreLabel:original.replaceAll(/<mpadded[^>]*>/g,'<mrow style="padding-inline:.278em .555em">').replaceAll('</mpadded>','</mrow>').replaceAll(/<mspace[^>]*><\/mspace>/g,''),
};
controls.coreStretch=controls.coreLabel.replaceAll('<mo ','<mo stretchy="true" ');
controls.coreInfix=controls.coreLabel.replaceAll('<mo ','<mo stretchy="true" form="infix" ');
await withChromium(async({send,evaluate})=>{
  await send('Page.setDocumentContent',{frameId:(await send('Page.getFrameTree')).frameTree.frame.id,html:`<!doctype html><meta charset="utf-8"><style>body{font:15px math}.vertical{writing-mode:vertical-rl}section{margin:20px}math{writing-mode:horizontal-tb;white-space:nowrap}</style>${['horizontal','vertical'].map(mode=>`<div class="${mode}">${Object.entries(controls).map(([name,xml])=>`<section data-case="${mode}/${name}">${xml}</section>`).join('')}</div>`).join('')}`});
  await evaluate('document.fonts.ready.then(()=>true)');
  const rows=await evaluate(`Array.from(document.querySelectorAll('section'),section=>{
    const box=n=>{const b=n.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom}};
    const texts=Array.from(section.querySelectorAll('mtext'));
    return {id:section.dataset.case,arrows:Array.from(section.querySelectorAll('mover'),(n,i)=>{const range=document.createRange();range.selectNodeContents(n.children[0]);return {arrow:box(n.children[0]),arrowInk:box(range),stack:box(n),label:box(texts[2*i+1]),labelLayout:box(n.children[1]),neighbor:box(texts[2*i+2]),overlap:Math.max(0,box(texts[2*i+1]).right-box(texts[2*i+2]).x)}})};
  })`);
  const report={browser:await send('Browser.getVersion'),tex,controls,rows};
  fs.mkdirSync('artifacts/xarrow-native',{recursive:true});
  fs.writeFileSync('artifacts/xarrow-native/diagnosis.png',Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
  fs.writeFileSync('artifacts/xarrow-native/diagnosis.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(rows.map(r=>({id:r.id,arrows:r.arrows.map(a=>({labelWidth:a.label.width,labelLayoutWidth:a.labelLayout.width,overlap:a.overlap}))})),null,2));
});
