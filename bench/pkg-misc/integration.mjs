import fs from 'node:fs';
import {createHash} from 'node:crypto';
const output=new URL('./integration-dist/',import.meta.url);
fs.rmSync(output,{recursive:true,force:true});
fs.mkdirSync(output,{recursive:true});
fs.cpSync(new URL('../../dist/',import.meta.url),output,{recursive:true});
const dependencies={color:'pkg-fonts',html:'pkg-fonts',unicode:'pkg-fonts',ams:'pkg-ams',bboldx:'pkg-fonts',textcomp:'pkg-fonts',bbm:'pkg-fonts'};
const snapshots={};
for(const [name,lane]of Object.entries(dependencies)) {
 const source=new URL(`../../../${lane}/dist/packages/${name}.js`,import.meta.url);
 const body=fs.readFileSync(source);
 fs.writeFileSync(new URL(`packages/${name}.js`,output),body);
 snapshots[name]={source:source.pathname,sha256:createHash('sha256').update(body).digest('hex')};
}
fs.copyFileSync(new URL('./dependencies/units.js',import.meta.url),new URL('packages/units.js',output));
const registry=new URL('packages/registry.js',output);
let text=fs.readFileSync(registry,'utf8');
for(const name of [...Object.keys(dependencies),'units'])text=text.replace('export const registeredPackages',`import dependency_${name} from './${name}.js'; registrations.push(dependency_${name});\nexport const registeredPackages`);
fs.writeFileSync(registry,text);
fs.writeFileSync(new URL('./dependency-snapshots.json',import.meta.url),JSON.stringify(snapshots,null,2)+'\n');
