import {rmSync,mkdirSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {build} from 'esbuild';
rmSync('dist',{recursive:true,force:true});mkdirSync('dist');
const types=spawnSync(process.execPath,['node_modules/typescript/bin/tsc','-p','tsconfig.json','--emitDeclarationOnly'],{stdio:'inherit'});
if(types.status!==0)process.exit(types.status??1);
// A shared ESM chunk keeps core and React sessions on the same runtime while
// avoiding dozens of filesystem module loads before the first conversion.
// Preserve the synchronous API while deferring optional module evaluation.
// esbuild turns these literal requires into internal ESM initializer functions;
// no Node require or runtime dependency is left in the browser bundle.
const lazyPackages={name:'lazy-package-tables',setup(b){
  b.onLoad({filter:/[/\\]packages[/\\]registry\.ts$/},({path})=>{
    let contents=readFileSync(path,'utf8');
    const modules=new Set(['input/tex/Configuration.js']);
    contents=contents.replace(/import (\w+) from '(\.\/([^']+)\.js)'; registrations\.push\(\1\);/g,(_,name,relative,pkg)=>{
      const source=readFileSync(new URL('../src/packages/'+pkg+'.ts',import.meta.url),'utf8');
      for(const declared of source.matchAll(/configurationModules:\s*\[([^\]]*)\]/g))for(const m of declared[1].matchAll(/['"]([^'"]+)['"]/g))modules.add(m[1]);
      return `registrations.push(lazy('${pkg}',()=>require('${relative}').default));`;
    });
    contents=contents.replace('const modules=new Set(registeredPackages.flatMap(p=>p.configurationModules??[]));',`const modules=new Set(${JSON.stringify([...modules])});`);
    contents+=`\nfunction lazy(name:string,load:()=>TexPackage):TexPackage {let pkg:TexPackage|undefined;return Object.defineProperties({name},Object.fromEntries(['priority','commands','environments','characters','options','initialize','undefinedCommand','formatError','configurationModules'].map(key=>[key,{enumerable:true,get(){return ((pkg??=load()) as any)[key];}}]))) as TexPackage;}\n`;
    return {contents,loader:'ts'};
  });
}};
await build({entryPoints:['src/index.ts','src/react.ts','src/configuration.ts','src/configuration-cache.ts','src/packages/registry.ts'],outdir:'dist',outbase:'src',bundle:true,splitting:true,format:'esm',platform:'neutral',target:'es2022',minify:true,external:['react','react-dom'],legalComments:'eof',plugins:[lazyPackages]});
console.error('Built shared ESM runtime and TypeScript declarations');
