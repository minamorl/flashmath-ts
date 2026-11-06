import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const directory=path.dirname(fileURLToPath(import.meta.url));
const stage=process.argv.includes('--before')?'before':'after';
const rows=JSON.parse(fs.readFileSync(path.join(directory,`${stage}-cases.json`)));
if(!process.env.TMPDIR)throw Error('TMPDIR required');
const profile=fs.mkdtempSync(path.join(process.env.TMPDIR,'native-render-chrome-'));
const chrome=spawn('/usr/bin/google-chrome',['--headless','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--no-default-browser-check','--host-resolver-rules=MAP * 0.0.0.0',`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
let stderr='',socket;chrome.stderr.on('data',b=>stderr+=b);
try{
  const active=path.join(profile,'DevToolsActivePort');
  for(let i=0;i<100&&!fs.existsSync(active);i++)await new Promise(r=>setTimeout(r,100));
  if(!fs.existsSync(active))throw Error(stderr);
  const port=fs.readFileSync(active,'utf8').split('\n')[0],endpoint=`http://127.0.0.1:${port}`;
  const protocol=await(await fetch(endpoint+'/json/protocol')).json();
  for(const [domain,method] of [['Page','captureScreenshot'],['Runtime','evaluate'],['Input','dispatchKeyEvent']]){
    const spec=protocol.domains.find(d=>d.domain===domain).commands.find(c=>c.name===method);
    if(!spec)throw Error(`CDP ${domain}.${method} unavailable`);
    console.log('CDP schema',domain+'.'+method,spec.parameters?.map(p=>p.name).join(','));
  }
  const pages=await(await fetch(endpoint+'/json/list')).json();
  socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await once(socket,'open');
  let seq=0;const pending=new Map();
  socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  await send('Page.enable');await send('Runtime.enable');
  const exceptions=[];socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params);});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1200,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:pathToFileURL(path.join(directory,`${stage}.html`)).href});
  await evaluate(`new Promise(resolve=>{const ready=()=>document.readyState==='complete'?document.fonts.ready.then(()=>resolve(true)):setTimeout(ready,20);ready()})`);
  const measure=`[...document.querySelectorAll('article')].map(article=>{const box=n=>{const b=n.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom}};const native=article.querySelector('.native math'),svg=article.querySelector('.reference svg');return {id:article.id,native:box(native),reference:box(svg),text:native.textContent,legacy:native.querySelectorAll('menclose,mlabeledtr').length,decorations:[...native.querySelectorAll('[data-flashmath-enclose],[data-flashmath-line]')].map(n=>({kind:n.getAttribute('data-flashmath-enclose')??n.getAttribute('data-flashmath-line'),box:box(n),background:getComputedStyle(n).backgroundImage,color:getComputedStyle(n).backgroundColor,transform:getComputedStyle(n).transform,content:n.hasAttribute('data-flashmath-enclose')?box(n.children[0]):null,heads:n.hasAttribute('data-flashmath-line')?[...n.children].map(h=>({box:box(h),clip:getComputedStyle(h).clipPath,color:getComputedStyle(h).backgroundColor})):[],strokes:n.hasAttribute('data-flashmath-enclose')?[...n.querySelectorAll('[aria-hidden]')].map(d=>({box:box(d),borders:['Top','Right','Bottom','Left'].map(s=>getComputedStyle(d)['border'+s+'Width'])})):[],borders:['Top','Right','Bottom','Left'].map(s=>getComputedStyle(n)['border'+s+'Width'])})),overlaps:[...native.querySelectorAll('[data-flashmath-overlay]')].map(n=>({box:box(n),children:[...n.children].map(box),overlayContent:box(n.children[1].children[0])})),labels:[...native.querySelectorAll('[data-flashmath-label]')].map(n=>({side:n.getAttribute('data-flashmath-label'),box:box(n),row:box(n.parentElement),cells:[...n.parentElement.children].filter(c=>c.getAttribute('data-flashmath-row')===n.getAttribute('data-flashmath-row')).map(box)})),rules:[...native.querySelectorAll('mtd,[data-flashmath-rule]')].filter(n=>parseFloat(getComputedStyle(n).borderTopWidth)>0).map(n=>({border:getComputedStyle(n).borderTopStyle,box:box(n),content:n.hasAttribute('data-flashmath-rule')?box(n.children[0]):null})),bboxes:[...native.querySelectorAll('[data-flashmath-bbox]')].map(n=>({box:box(n),content:[...n.children].map(box),parent:box(n.parentElement),borders:['Top','Right','Bottom','Left'].map(s=>getComputedStyle(n.parentElement)['border'+s+'Width'])})),accents:[...native.querySelectorAll('mover,munder,[data-flashmath-accent]')].filter(n=>n.hasAttribute('data-flashmath-accent')||n.children[1]?.localName==='mo'&&['―','‾'].includes(n.children[1].textContent)).map(n=>({base:box(n.children[0]),accent:box(n.lastElementChild)})),pua:[...native.textContent].filter(c=>c.codePointAt(0)>=0xe000&&c.codePointAt(0)<=0xf8ff).length}})`;
  const measurements=await evaluate(measure);
  // Exercise the visible source selector with actual keyboard input.
  await evaluate(`document.querySelector('#source').focus()`);
  for(const [key,code,vk] of [['ArrowDown','ArrowDown',40],['Enter','Enter',13]])for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key,code,windowsVirtualKeyCode:vk});
  const selected=await evaluate(`document.querySelector('#source').value`);
  if(selected!=='native')throw Error('Source selector did not switch to string output');
  const stringMeasurements=await evaluate(measure);
  const parity=measurements.every((r,i)=>['width','height'].every(k=>Math.abs(r.native[k]-stringMeasurements[i].native[k])<.1)&&r.text===stringMeasurements[i].text);
  if(!parity)throw Error('SSR/string layout mismatch');
  for(const [key,code,vk] of [['ArrowUp','ArrowUp',38],['Enter','Enter',13]])for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key,code,windowsVirtualKeyCode:vk});
  if(await evaluate(`document.querySelector('#source').value`)!=='react')throw Error('Source selector did not restore SSR');
  const groups=[...new Set(rows.map(r=>r.group))];
  const screenshots=[];
  for(const group of groups){
    // Retire panels left by an earlier, taller rendering of this same group.
    for(const file of fs.readdirSync(directory))if(file.startsWith(`${stage}-${group}-`)&&/^\d+\.png$/.test(file.slice(`${stage}-${group}-`.length)))fs.unlinkSync(path.join(directory,file));
    await evaluate(`(()=>{const n=document.querySelector('#group');n.value=${JSON.stringify(group)};n.dispatchEvent(new Event('change'));document.activeElement.blur();window.scrollTo(0,0)})()`);
    const height=await evaluate('document.documentElement.scrollHeight');
    // Bounded panels remain legible when reviewed; all rows are captured.
    for(let y=0,panel=1;y<height;y+=1800,panel++){
      const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y,width:1440,height:Math.min(1800,height-y),scale:1}});
      const filename=`${stage}-${group}-${panel}.png`;
      fs.writeFileSync(path.join(directory,filename),Buffer.from(shot.data,'base64'));screenshots.push(filename);
    }
  }
  const report={stage,browser:await send('Browser.getVersion'),count:measurements.length,ssrStringParity:parity,exceptions,screenshots,measurements};
  fs.writeFileSync(path.join(directory,`${stage}-screen.json`),JSON.stringify(report,null,2)+'\n');
  if(measurements.some(r=>r.native.width<=0||r.native.height<=0||r.reference.width<=0||r.reference.height<=0))throw Error('Invisible formula');
  if(exceptions.length)throw Error('Browser runtime exceptions');
  console.log(`screen_run: ${report.browser.product}; opened ${stage}.html; keyboard switched React SSR → toMathMLString → React SSR; ${report.count} formulas; SSR/string geometry equal; captured every group`);
}finally{
  socket?.close();chrome.kill();if(chrome.exitCode===null)await once(chrome,'exit').catch(()=>{});
  fs.rmSync(profile,{recursive:true,force:true});
}
