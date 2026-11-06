/** Rehydrate a private pnpm v11 CAS from already-installed local packages.
 * Uses pnpm 11.18.0's getFilePathByModeInCafs format. The private SQLite index
 * was copied from the existing cache; pnpm itself verifies each file digest.
 * No registry requests or writes to the original packages/store are made. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const target=path.resolve(process.env.TMPDIR,'flashmath-pnpm-store/v11');
let files=0;
function visit(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
 const file=path.join(directory,entry.name);
 if(entry.isSymbolicLink())continue;
 if(entry.isDirectory()){visit(file);continue;}
 if(!entry.isFile())continue;
 const digest=createHash('sha512').update(fs.readFileSync(file)).digest('hex');
 const mode=fs.statSync(file).mode;
 const out=path.join(target,'files',digest.slice(0,2),digest.slice(2)+(mode&0o111?'-exec':''));
 if(!fs.existsSync(out)){fs.mkdirSync(path.dirname(out),{recursive:true});fs.copyFileSync(file,out);fs.chmodSync(out,mode&0o777);files++;}
}}
// Original checkout's installed dependency tree is read-only to this lane.
visit('/home/minamorl/repos/flashmath-ts/node_modules/.pnpm');
for(const name of ['react','react-dom','@types/react','@types/react-dom','csstype','scheduler'])visit(path.resolve('node_modules',name));
console.log('copied CAS files:',files);
