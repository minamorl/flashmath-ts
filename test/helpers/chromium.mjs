import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

// Same dependency-free CDP approach as bench/native-render/screen.mjs.
export async function withChromium(run) {
  if(!process.env.TMPDIR)throw Error('TMPDIR required');
  const profile=fs.mkdtempSync(path.join(process.env.TMPDIR,'flashmath-xarrow-'));
  const chrome=spawn(process.env.CHROME_BIN??'/usr/bin/google-chrome',[
    '--headless','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0',
    '--disable-background-networking','--disable-component-update','--disable-sync',
    '--no-first-run','--no-default-browser-check','--host-resolver-rules=MAP * 0.0.0.0',
    `--user-data-dir=${profile}`,'about:blank',
  ],{stdio:['ignore','ignore','pipe']});
  let stderr='',launchError,socket,closeBrowser;
  chrome.on('error',e=>launchError=e);
  chrome.stderr.on('data',b=>stderr+=b);
  try {
    const active=path.join(profile,'DevToolsActivePort');
    for(let i=0;i<100&&!fs.existsSync(active)&&!launchError&&chrome.exitCode===null;i++)await new Promise(r=>setTimeout(r,100));
    if(!fs.existsSync(active))throw Error(`Chromium unavailable: ${launchError??stderr}`);
    const port=fs.readFileSync(active,'utf8').split('\n')[0];
    const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
    await once(socket,'open');
    let seq=0;const pending=new Map();
    socket.addEventListener('message',e=>{
      const m=JSON.parse(e.data);if(!m.id)return;
      const p=pending.get(m.id);pending.delete(m.id);
      m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);
    });
    const send=(method,params={})=>new Promise((resolve,reject)=>{
      const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));
    });
    closeBrowser=()=>send('Browser.close');
    const evaluate=async expression=>{
      const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
      if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));
      return r.result.value;
    };
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    return await run({send,evaluate});
  } finally {
    if(chrome.exitCode===null&&!launchError){
      const exited=once(chrome,'exit'),fallback=setTimeout(()=>chrome.kill(),5000);
      try{
        if(socket?.readyState===WebSocket.OPEN)await closeBrowser().catch(()=>chrome.kill());
        else chrome.kill();
        await exited;
      }finally{clearTimeout(fallback);}
    }
    socket?.close();
    // Chrome children can finish writing profile files just after the browser
    // process exits. Retry transient ENOTEMPTY rather than failing good pixels.
    fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  }
}
