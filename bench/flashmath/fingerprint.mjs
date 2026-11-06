import fs from 'node:fs';
import {createHash} from 'node:crypto';
export function sourceFingerprint(){
 const digest=createHash('sha256');
 const walk=(directory,prefix='')=>{for(const entry of fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const relative=prefix+entry.name;const url=new URL(entry.name+(entry.isDirectory()?'/':''),directory);if(entry.isDirectory())walk(url,relative+'/');else digest.update(relative).update(fs.readFileSync(url));}};
 walk(new URL('../../src/',import.meta.url));
 return digest.digest('hex');
}
export function fileFingerprint(url){return createHash('sha256').update(fs.readFileSync(url)).digest('hex');}
