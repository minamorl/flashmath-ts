// MATHJAX3_DIR must point to the unpacked official mathjax@3.2.2 npm package.
// Its script/fonts are embedded so Chromium never fetches a network resource.
import fs from 'node:fs';
import path from 'node:path';
import {parseToMathMLAst,toMathMLString} from '../../dist/index.js';
import {withChromium} from '../../test/helpers/chromium.mjs';
import {inkCases,inkHTML,measureInk} from '../../test/helpers/xarrow-ink.mjs';

const dir=process.env.XARROW_ARTIFACT_DIR;
if(!dir)throw Error('XARROW_ARTIFACT_DIR required');
fs.mkdirSync(dir,{recursive:true});
const reference=!!process.env.MATHJAX3_DIR;
// 3.2.2 predates mathtools' four xlong variants. Their vertical controls use
// the corresponding short arrow; native still renders/tests the real commands.
const longControls={xlongrightarrow:'xrightarrow',xlongleftarrow:'xleftarrow',xLongrightarrow:'xRightarrow',xLongleftarrow:'xLeftarrow'};
const all=[];
await withChromium(async browser=>{
  for(const size of [15,20,32]){
    const rows=inkCases.map(c=>({...c,size,id:`${size}/${c.id}`,xml:reference?`<span class="reference">\\(${c.tex.replace(/\\(xlongrightarrow|xlongleftarrow|xLongrightarrow|xLongleftarrow)/g,(_,name)=>'\\'+longControls[name])}\\)</span>`:toMathMLString(parseToMathMLAst(c.tex,{packages:c.packages,display:false}))}));
    if(process.env.XARROW_WITHOUT_STRUT)for(const row of rows)row.xml=row.xml.replaceAll('<mspace depth=".3em"></mspace>','');
    await browser.send('Page.setDocumentContent',{frameId:(await browser.send('Page.getFrameTree')).frameTree.frame.id,html:inkHTML(rows)});
    if(reference){
      const root=process.env.MATHJAX3_DIR;
      await browser.evaluate(`window.MathJax={loader:{load:['[tex]/mathtools','[tex]/extpfeil']},tex:{packages:{'[+]':['mathtools','extpfeil']}},chtml:{matchFontHeight:false},startup:{typeset:false}}`);
      await browser.evaluate(fs.readFileSync(path.join(root,'es5/tex-chtml-full.js'),'utf8'));
      // Extensions are evaluated from the same official tarball, before startup.
      for(const name of ['mathtools','extpfeil'])await browser.evaluate(fs.readFileSync(path.join(root,`es5/input/tex/extensions/${name}.js`),'utf8'));
      await browser.evaluate('MathJax.startup.promise.then(()=>MathJax.typesetPromise())');
      const fonts=path.join(root,'es5/output/chtml/fonts/woff-v2');
      // Replace MathJax font URLs, preserving its exact family declarations.
      await browser.evaluate(`(() => {const fonts=${JSON.stringify(Object.fromEntries(fs.readdirSync(fonts).map(file=>[file,fs.readFileSync(path.join(fonts,file)).toString('base64')])))};
        for(const style of document.querySelectorAll('style'))style.textContent=style.textContent.replace(/url\\([^)]*(MathJax_[\\w-]+\\.woff)[^)]*\\)/g,(_,file)=>'url(data:font/woff;base64,'+fonts[file]+')');
      })()`);
      const loaded=await browser.evaluate(`Promise.all(['MJXTEX','MJXTEX-I','MJXTEX-S4'].map(f=>document.fonts.load('20px '+f))).then(a=>a.map(f=>f.length))`);
      if(loaded.some(n=>!n))throw Error('MathJax reference font did not load');
    }
    await browser.evaluate('document.fonts.ready.then(()=>true)');
    const result=await measureInk(browser,rows,{reference});
    for(const row of result.rows)if(row.stacks.length!==(/\/reported(?:-serif)?$/.test(row.id)?2:1)||row.stacks.some(s=>!s.ink.arrow||!s.ink.upper&&!s.ink.lower))throw Error(`Missing rendered ink: ${row.id}`);
    all.push(...result.rows);
    fs.writeFileSync(path.join(dir,`${size}.png`),result.png);
    const y=await browser.evaluate("document.querySelector('[data-id=\""+size+"/reported\"]').getBoundingClientRect().y");
    const panel=await browser.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:350,y:Math.floor(y),width:400,height:288,scale:2}});
    fs.writeFileSync(path.join(dir,`${size}-panel.png`),Buffer.from(panel.data,'base64'));
    fs.writeFileSync(path.join(dir,`${size}.html`),await browser.evaluate('document.documentElement.outerHTML'));
  }
  fs.writeFileSync(path.join(dir,'ink.json'),JSON.stringify({browser:await browser.send('Browser.getVersion'),reference:reference?'MathJax 3.2.2 CHTML': 'native',font:'DejaVu Math TeX Gyre',scale:4,rows:all},null,2)+'\n');
  if(reference&&process.env.XARROW_REFERENCE_FIXTURE)fs.writeFileSync(process.env.XARROW_REFERENCE_FIXTURE,JSON.stringify({
    source:'mathjax@3.2.2/es5/tex-chtml-full.js; mathtools + extpfeil; bundled TeX WOFF fonts loaded; matchFontHeight:false',
    longControls,
    command:'MATHJAX3_DIR=<unpacked mathjax@3.2.2> XARROW_ARTIFACT_DIR=<artifacts> XARROW_REFERENCE_FIXTURE=test/fixtures/xarrow-chtml-3.2.2.json node bench/native-render/xarrow-ink.mjs',
    browser:await browser.send('Browser.getVersion'),scale:4,
    gaps:Object.fromEntries(all.map(r=>[r.id,r.stacks.map(s=>s.gaps)])),
  },null,2)+'\n');
  console.log(JSON.stringify(all.filter(r=>r.id==='20/reported'||r.id==='20/ams/xrightarrow/both-gf').map(r=>({id:r.id,stacks:r.stacks.map(s=>({gaps:s.gaps,offsets:s.offsets}))})),null,2));
  console.log(`screen_run: ${reference?'MathJax 3.2.2 CHTML':'native'}; ${all.length} formulas; 15/20/32px; colored ink screenshot measurement`);
});
