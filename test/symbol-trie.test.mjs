import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {transform} from 'esbuild';

test('generated compact trie resolves every definition from source spans without prefix collisions',async()=>{
 const source=fs.readFileSync(new URL('../src/symbols.ts',import.meta.url),'utf8');
 const {code}=await transform(source,{loader:'ts',format:'esm',target:'es2022'});
 const {definitions,command}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 assert.equal(definitions.length,531);
 for(let i=0;i<definitions.length;i++){
  const name=definitions[i].name,source='prefix:'+name+':suffix';
  assert.equal(command(source,7,7+name.length),i,name);
  assert.equal(command(name+'ÿ',0,name.length+1),-1,name+' extended');
 }
 assert.equal(command('',0,0),-1);assert.equal(command('ÿ',0,1),-1);
});
