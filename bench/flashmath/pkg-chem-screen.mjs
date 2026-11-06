import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseToReact} from '../../dist/react.js';

const folder = path.dirname(fileURLToPath(import.meta.url));
const formulas = [
  ['Reaction', String.raw`\ce{2 H2 + O2 ->[heat] 2 H2O}`],
  ['Left / reversible', String.raw`\ce{A <-[cold] B} \quad \ce{A <->[light] B}`],
  ['Two arrows', String.raw`\ce{A <-->[catalyst] B}`],
  ['Equilibrium', String.raw`\ce{N2 + 3 H2 <=>[Fe][400 K] 2 NH3}`],
  ['Unequal harpoons', String.raw`\ce{A <=>> B} \quad \ce{C <<=> D}`],
  ['Nested chemistry label', String.raw`\ce{$A$ ->[\ce{+H2O}] $B$}`],
  ['Bonds', String.raw`\ce{A\bond{~}B\bond{~-}C\bond{~--}D\bond{-~-}E}`],
  ['Bond arrows', String.raw`\ce{A\bond{->}B\bond{<-}C}`],
  ['Units', String.raw`\pu{9.81 m/s^2} \qquad \pu{25 °C}`],
];
const render = output => formulas.map(([label, tex]) => `<section><div><b>${label}</b><code>${tex.replaceAll('&','&amp;').replaceAll('<','&lt;')}</code></div>${renderToStaticMarkup(parseToReact(tex, {packages: ['base','mhchem'], output, display: true}))}</section>`).join('');
const variants = {native: render('native'), mathjax: render('mathjax')};
const html = `<!doctype html><html><meta charset="utf-8"><title>flashmath chemical MathML</title><style>
body{margin:28px auto;max-width:1100px;padding:0 24px;background:#f6f8fc;color:#162536;font:17px system-ui}h1{margin:0 0 10px;font-size:29px}p{margin:6px 0 20px}label{display:flex;gap:12px;align-items:center}select{padding:8px;font-size:16px}section{border:1px solid #dce4ed;background:white;border-radius:9px;padding:14px 20px;margin:10px 0}section div{display:flex;justify-content:space-between;gap:16px}code{font-size:12px;color:#536576}math{font-size:31px;min-height:58px;margin:8px 0 0}footer{color:#536576;font-size:13px;margin-top:18px}
</style><h1>flashmath · Chemical MathML</h1><p>React server rendering with browser-native MathML. No MathJax runtime or fonts.</p><label>Glyph output <select id="output"><option value="native">Native (default)</option><option value="mathjax">MathJax font codes</option></select></label><main id="formulas">${variants.native}</main><footer>Arrow labels, harpoon compositions, dashed bonds and physical units.</footer><script>const variants=${JSON.stringify(variants).replaceAll('<','\\u003c')};document.querySelector('#output').addEventListener('change',e=>document.querySelector('#formulas').innerHTML=variants[e.target.value]);</script></html>`;
const htmlPath=path.join(folder,'pkg-chem-native.html');
fs.writeFileSync(htmlPath,html);
if (!process.env.TMPDIR) throw Error('TMPDIR required');
const profile=fs.mkdtempSync(path.join(process.env.TMPDIR,'pkg-chem-chrome-'));
const chrome=spawn('/usr/bin/google-chrome',[
  '--headless','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0',
  '--disable-background-networking','--disable-component-update','--disable-domain-reliability',
  '--disable-sync','--metrics-recording-only','--no-first-run','--no-default-browser-check',
  '--host-resolver-rules=MAP * 0.0.0.0',`--user-data-dir=${profile}`,'about:blank',
],{stdio:['ignore','ignore','pipe']});
let stderr='';chrome.stderr.on('data',b=>stderr+=b);
let socket;
try {
  const active=path.join(profile,'DevToolsActivePort');
  for(let i=0;i<100&&!fs.existsSync(active);i++) await new Promise(r=>setTimeout(r,100));
  if(!fs.existsSync(active)) throw Error('Chromium startup failed: '+stderr);
  const port=Number(fs.readFileSync(active,'utf8').split('\n')[0]);
  const endpoint=`http://127.0.0.1:${port}`;
  // Read the running browser's primary protocol schema before using its API.
  const protocol=await (await fetch(endpoint+'/json/protocol')).json();
  for(const [domain,method] of [['Page','captureScreenshot'],['Runtime','evaluate'],['Input','dispatchMouseEvent']]) {
    const spec=protocol.domains.find(d=>d.domain===domain).commands.find(c=>c.name===method);
    console.log('CDP schema',domain+'.'+method, spec.parameters?.map(p=>p.name).join(','));
  }
  const pages=await (await fetch(endpoint+'/json/list')).json();
  socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
  await once(socket,'open');
  let seq=0;const waiting=new Map();
  socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const job=waiting.get(m.id);waiting.delete(m.id);m.error?job.reject(Error(JSON.stringify(m.error))):job.resolve(m.result);}});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;waiting.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1480,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:pathToFileURL(htmlPath).href});
  await evaluate(`new Promise(resolve=>{const ready=()=>document.readyState==='complete'?document.fonts.ready.then(()=>resolve(true)):setTimeout(ready,20);ready();})`);
  const measure=`(()=>({mode:document.querySelector('#output').value,math:document.querySelectorAll('math').length,pua:[...document.querySelector('main').textContent].filter(c=>c.charCodeAt(0)>=0xe000&&c.charCodeAt(0)<=0xf8ff).length,errors:document.querySelectorAll('merror').length,arrows:[...document.querySelectorAll('mo')].map(n=>n.textContent).filter(s=>'⟶⟵⟷⇆⇌⇀↽→←┄'.includes(s)),height:document.documentElement.scrollHeight}))()`;
  console.log('initial',JSON.stringify(await evaluate(measure)));
  // Click/focus the actual select, then use the browser's key input to switch.
  const bounds=await evaluate(`(()=>{const b=document.querySelector('#output').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}})()`);
  await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...bounds});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...bounds});
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  const mode=await evaluate(`document.querySelector('#output').value`);
  console.log('select after mouse/key',mode);
  if(mode!=='mathjax') throw Error('Mouse/key interaction did not select MathJax mode');
  const compat=await evaluate(measure);console.log('mathjax selection',JSON.stringify(compat));
  if(compat.pua===0)throw Error('Compatibility mode was not exercised');
  for (const [key,code,vk] of [['ArrowUp','ArrowUp',38],['Enter','Enter',13],['Escape','Escape',27]]) {
    await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:vk});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:vk});
  }
  if(await evaluate(`document.querySelector('#output').value`)!=='native') throw Error('Key interaction did not restore native mode');
  await evaluate(`document.activeElement.blur()`);
  await evaluate('document.fonts.ready');
  const native=await evaluate(measure);console.log('native selection',JSON.stringify(native));
  if(native.pua||native.errors||native.math!==formulas.length)throw Error('Invalid native output');
  const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
  fs.writeFileSync(path.join(folder,'pkg-chem-native.png'),Buffer.from(screenshot.data,'base64'));
  fs.writeFileSync(path.join(folder,'pkg-chem-screen.json'),JSON.stringify({browser:await send('Browser.getVersion'),compat,native},null,2)+'\n');
  console.log('screen_run: Chromium opened React SSR chemical MathML; selected MathJax and native output; native PUA=0, merror=0; screenshot pkg-chem-native.png');
} finally {
  socket?.close();chrome.kill();if(chrome.exitCode===null)await once(chrome,'exit').catch(()=>{});
  fs.rmSync(profile,{recursive:true,force:true});
}
