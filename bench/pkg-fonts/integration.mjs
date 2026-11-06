/** Supplementary, local integration probe. The real subject remains dist/.
 * Copy sibling lane sources read-only, compile inside this assigned worktree,
 * and retain the exact seam patch separately for the integrating root. */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const base='bench/pkg-fonts/integration';
fs.mkdirSync(base,{recursive:true});
fs.cpSync('src',base+'/src',{recursive:true});
const hashes={};
for(const [lane,files] of [['pkg-ams',['packages/ams.ts']],['pkg-misc',['packages/textmacros.ts','packages/types.ts']],['pkg-mathtools',['packages/mathtools.ts','session-state.ts']]])for(const file of files){const data=fs.readFileSync('../'+lane+'/src/'+file);hashes[lane+'/'+file]=createHash('sha256').update(data).digest('hex');fs.writeFileSync(base+'/src/'+file,data);}
const read=f=>fs.readFileSync(base+'/src/'+f,'utf8');
const write=(f,s)=>fs.writeFileSync(base+'/src/'+f,s);
write('packages/types.ts',read('packages/types.ts').replace('  environments: Readonly<Record<string, TexEnvironment>>;', '  characters?: Readonly<Record<string, TexCommand>>;\n  environments: Readonly<Record<string, TexEnvironment>>;').replace('  packages: readonly TexPackage[];','  packages: readonly TexPackage[];\n  characters: ReadonlyMap<string, RegisteredCommand>;'));
let reg=read('packages/registry.ts').replace('export const registeredPackages',"import textmacros from './textmacros.js'; registrations.push(textmacros);\nimport mathtools,{bboxDependency} from './mathtools.js'; registrations.push(mathtools,bboxDependency);\nexport const registeredPackages");
reg=reg.replace('return Object.freeze({commands:', 'return Object.freeze({packages:Object.freeze(selected.map(x=>x.definition)),commands:');reg=reg.replace('commands:Object.freeze(commands)',"characters:new Map(selected.flatMap(({definition:p})=>Object.entries(p.characters??{}).map(([name,value])=>[name,{definition:{...value,name,type:'character'},execute:value.execute,id:-1}] as const))),commands:Object.freeze(commands)");write('packages/registry.ts',reg);
// Upstream AMS lane appends these enum members. Merge names and numeric tags
// together; every source is compiled here so no numeric enum ABI is mixed.
let ast=read('ast.ts').replace('  "html",\n];','  "html",\n  "mmultiscripts",\n  "mprescripts",\n  "none",\n];').replace('  html,\n}','  html,\n  mmultiscripts,\n  mprescripts,\n  none,\n}').replace('tags?: "none" | "all" | "ams";','tags?: "none" | "all" | "ams" | "cases";');write('ast.ts',ast);
let text=read('packages/textmacros.ts');
const original=text;
write('parser.ts',read('parser.ts').replace('  rowspacing: string;', '  rowspacing: string;\n  rowspacingBase?: number;').replace('    session.initialized = true;', '    session.initialized = true;').replace('  error(message: string): never {', '  error(message: string): never {').replace('      this.result = n;\n    });','      this.result = n;\n    });\n    for(const pkg of configuration.packages)pkg.initialize?.(this);').replace('this.configuration.extensions.get(spelling(t))','(this.configuration.extensions.get(spelling(t))??this.configuration.characters.get(spelling(t)))'));
text=text.replace("if(registered&&allowed.includes(name))", "if(registered&&(allowed.includes(name)||registered.definition.type==='text-insert'))");
// Dedicated font switches belong to the text scope, rather than a raw-text
// math-command shim. The source exported by this lane owns option selection.
text=text.replace("import {em} from '../mathml.js';", "import {em} from '../mathml.js';\nimport {textVariant} from './bboldx.js';");
text=text.replace("      const macro=p.macros.get(name);", "      if((name==='textbb'||name==='textbfbb')&&p.configuration.extensions.has(name)){flush(f);frame(argument(f),{...f.attrs,'data-mjx-variant':textVariant(p,name==='textbfbb')},n=>add(f,n));continue;}\n      const macro=p.macros.get(name);");
write('packages/textmacros.ts',text);
fs.writeFileSync(base+'/textmacros.before.ts',original);
fs.writeFileSync(base+'/textmacros.after.ts',text);
fs.writeFileSync(base+'/sources.json',JSON.stringify(hashes,null,2)+'\n');
const config={compilerOptions:{target:'ES2022',module:'NodeNext',moduleResolution:'NodeNext',strict:true,declaration:false,outDir:'dist',rootDir:'src',skipLibCheck:true,verbatimModuleSyntax:true},include:['src/**/*.ts']};
fs.writeFileSync(base+'/tsconfig.json',JSON.stringify(config));
const result=spawnSync(path.resolve('node_modules/.bin/tsc'),['-p',base+'/tsconfig.json'],{encoding:'utf8'});process.stdout.write(result.stdout);process.stderr.write(result.stderr);console.log('integration tsc exit:',result.status);if(result.status)process.exit(result.status);
fs.writeFileSync(base+'/adapter.mjs',`import {parseToMathMLAst,toMathMLString} from './dist/index.js';\nexport default function subject(tex,options={}){return toMathMLString(parseToMathMLAst(tex,{display:true,...options}));}\n`);
