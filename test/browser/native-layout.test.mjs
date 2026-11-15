import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {chromium} from '../fixtures/native-layout/node_modules/playwright/index.mjs';
import {inspectLayout} from '../fixtures/native-layout/layout-check.mjs';
import {parseToMathMLAst,toMathMLString} from '../../dist/index.js';

test('STIX native layout 1–10: native ink, CD columns, aligned edges and ruled array; frozen 0.1.2 controls fail', {timeout:60000},async()=>{
  const root=fileURLToPath(new URL('../../',import.meta.url));
  assert.ok(process.env.TMPDIR,'TMPDIR required');
  const out=process.env.NATIVE_LAYOUT_ARTIFACT_DIR??fs.mkdtempSync(path.join(process.env.TMPDIR,'flashmath-native-layout-'));
  const build=spawnSync(process.execPath,['test/fixtures/native-layout/build-pages.mjs','test/fixtures/native-layout/fixture.md'],{
    cwd:root,env:{...process.env,PROBE_OUTPUT_DIR:out},encoding:'utf8',
  });
  assert.equal(build.status,0,build.stderr);
  const browser=await chromium.launch();
  try{
    for(const variant of ['stix','stix-issue9']){
      const page=await browser.newPage({viewport:{width:1400,height:900},deviceScaleFactor:2});
      await page.goto(pathToFileURL(path.resolve(out,`page-${variant}.html`)).href);
      const cdp=await page.context().newCDPSession(page);
      await cdp.send('DOM.enable');await cdp.send('CSS.enable');
      const {root:dom}=await cdp.send('DOM.getDocument',{depth:-1});
      const {nodeIds}=await cdp.send('DOM.querySelectorAll',{nodeId:dom.nodeId,selector:'.fm math mi,.fm math mn,.fm math mo,.fm math mtext'});
      const fonts=new Set();
      for(const nodeId of nodeIds)for(const font of (await cdp.send('CSS.getPlatformFontsForNode',{nodeId})).fonts)if(font.glyphCount)fonts.add(font.familyName);
      assert.deepEqual([...fonts],['STIX Two Math'],'all native math glyphs must use the full STIX font');
      await cdp.detach();
      const after=await inspectLayout(page,{artifacts:process.env.NATIVE_LAYOUT_ARTIFACT_DIR,name:variant});
      assert.deepEqual(after.failures,[],JSON.stringify(after.failures));
      // Unequal labels must share a column width; exercise reverse arrows,
      // two-sided vertical labels, fractions and explicit CD minimum sizes.
      await page.goto(pathToFileURL(path.resolve(out,`page-${variant}.html`)).href);
      const xml=toMathMLString(parseToMathMLAst(String.raw`\minCDarrowwidth{4em}\minCDarrowheight{3em}\begin{CD}A=Z @<{f}<< B\\@V{\text{left label}}V{\text{right label}}V @A{h}A{k}A\\C=Z @>>{\frac{\text{much wider lower annotation}}{x}}>D\end{CD}`,{packages:['base','ams','amscd'],display:true}));
      assert.doesNotMatch(xml,/<merror/);
      await page.locator('#item-2 .fm .display').evaluate((n,html)=>{n.innerHTML=html;},xml);
      const wide=await inspectLayout(page,{artifacts:process.env.NATIVE_LAYOUT_ARTIFACT_DIR,name:`wide-${variant}`});
      assert.deepEqual(wide.failures,[],JSON.stringify(wide.failures));
      for(const h of wide.pixels.horizontal.filter(h=>h.n===2))assert.ok(h.ink.arrow.right-h.ink.arrow.x>=78,'4em CD minimum width');
      for(const v of wide.pixels.vertical.filter(v=>v.n===2))assert.ok(v.ink.arrow.bottom-v.ink.arrow.y>=58,'3em CD minimum height');
      await page.goto(pathToFileURL(path.resolve(out,`page-before-${variant}.html`)).href);
      const before=await inspectLayout(page,{artifacts:process.env.NATIVE_LAYOUT_ARTIFACT_DIR,name:`before-${variant}`});
      for(const n of [2,3,4,6,9])assert.ok(before.failures.some(f=>f.n===n),`negative control failed to detect item ${n}`);
      console.log(`screen_run: Chromium ${browser.version()}; ${variant}; 1–10 rendered; pixel/geometry failures ${after.failures.length}; old items detected: ${[...new Set(before.failures.map(f=>f.n))].sort((a,b)=>a-b).join(',')}`);
      await page.close();
    }
  }finally{
    await browser.close();
    if(!process.env.NATIVE_LAYOUT_ARTIFACT_DIR)fs.rmSync(out,{recursive:true,force:true});
  }
});
