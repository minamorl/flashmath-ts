// Development-only bootstrap for an offline sandbox with an existing pnpm v10
// content-addressed store. Copies installed packages; does not mutate the store.
import fs from 'node:fs';
import path from 'node:path';
const store=path.join(process.env.HOME,'.local/share/pnpm/store/v10');
const wanted=new Map([['react','19.2.4'],['react-dom','19.2.4'],['@types/react','19.2.14'],['@types/react-dom','19.2.3'],['csstype',null],['scheduler',null]]);
for(const dir of fs.readdirSync(path.join(store,'index'))){
 for(const file of fs.readdirSync(path.join(store,'index',dir))){
  if(![...wanted.keys()].some(name=>file.includes('-'+name.replace('/','+')+'@')))continue;
  const index=JSON.parse(fs.readFileSync(path.join(store,'index',dir,file)));
  if(!wanted.has(index.name)||wanted.get(index.name)&&wanted.get(index.name)!==index.version)continue;
  const target=path.resolve('node_modules',index.name);fs.mkdirSync(target,{recursive:true});
  for(const [name,data]of Object.entries(index.files)){
   const hex=Buffer.from(data.integrity.split('-')[1],'base64').toString('hex');const source=path.join(store,'files',hex.slice(0,2),hex.slice(2)+(data.mode&0o111?'-exec':''));
   const to=path.join(target,name);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(source,to);
  }
  console.log(index.name,index.version);wanted.delete(index.name);
 }
}
if(wanted.size)throw Error('Missing offline packages: '+[...wanted.keys()].join(', '));
