/** Extract upstream snapshot inputs without using the implementation as an oracle. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const out = fileURLToPath(new URL('./fixtures/', import.meta.url));
const installed = path.dirname(fileURLToPath(import.meta.resolve('@mathjax/src/package.json')));
const source = path.resolve(process.argv[2] || (fs.existsSync(path.join(installed, 'testsuite'))
  ? installed : '/home/minamorl/repos/.research/mathparse-src/MathJax-src'));
const version = JSON.parse(fs.readFileSync(path.join(source, 'package.json'))).version;
if (version !== '4.1.3') throw Error(`Source version ${version} != 4.1.3; refusing fixture extraction`);
const testDir = path.join(source, 'testsuite/tests/input/tex');
const hash = (s) => createHash('sha256').update(s).digest('hex');
let revision = null;
try { revision = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], {encoding:'utf8'}).trim(); } catch {}
const records = [], diagnostics = [], sources = [];
for (const file of fs.readdirSync(testDir).filter(f => f.endsWith('.test.ts')).sort()) {
  const snapFile = path.join(testDir, '__snapshots__', file + '.snap');
  if (!fs.existsSync(snapFile)) continue;
  const snapshots = {};
  vm.runInNewContext(fs.readFileSync(snapFile, 'utf8'), {exports:snapshots}, {timeout:5000});
  const text = fs.readFileSync(path.join(testDir, file), 'utf8');
  sources.push({file, sha256:hash(text), snapshotSha256:hash(fs.readFileSync(snapFile))});
  const matched = new Map(), counters = new Map(), tests = [];
  let scopes = [{name:'', hooks:[]}], current = '', config = null, history = [], sequence=0;
  const register = (name, fn) => tests.push({name:[...scopes.map(s=>s.name), name].filter(Boolean).join(' '), fn, initialConfig:config, hooks:scopes.flatMap(s=>s.hooks)});
  register.skip = () => {};
  const jest = {
    describe(name, fn) { scopes.push({name,hooks:[]}); fn(); scopes.pop(); },
    it:register, test:register,
    beforeEach(fn) { scopes.at(-1).hooks.push(fn); },
    beforeAll() {}, afterEach() {}, afterAll() {},
    expect(value) {
      const matcher = new Proxy({}, {get(_target, key) {
        if (key === 'resolves' || key === 'not') return matcher;
        if (key === 'toMatchSnapshot') return () => {
          const n = (counters.get(current) || 0) + 1; counters.set(current,n);
          const key = `${current} ${n}`;
          if (!(key in snapshots)) throw Error(`Missing snapshot ${key}`);
          if (value?.capture) matched.set(key, value.capture);
        };
        // Non-snapshot assertions are outside this extraction's scope.
        return () => {};
      }});
      return matcher;
    }
  };
  const setup = (mode) => (packages=['base'], options={}) => {
    config = {packages, texOptions:options, mode, configurationModules:[...text.matchAll(/['"]#js\/(input\/tex\/[^'"]*Configuration)(?:\.js)?['"]/g)].map(m=>m[1].replace(/\.js$/, '')+'.js')}; history=[];
  };
  const capture = (mode) => (tex, display=true) => {
    if (!config) throw Error('No setupTex configuration');
    const data = JSON.parse(JSON.stringify({...config, mode:mode==='convert'?config.mode:mode, display, tex, prior:history, executionOrder:sequence++}, (_k,v) =>
      typeof v === 'function' ? {$function:String(v)} : v instanceof RegExp ? {$regexp:v.source,flags:v.flags} : v));
    history.push({tex,display});
    return {capture:data};
  };
  const helpers = {
    setupTex:setup('convert'), setupTexRender:setup('render'), setupTexTypeset:setup('typeset'),
    setupTexPage:setup('page'), setupTexWithOutput:setup('output'),
    tex2mml:capture('convert'), render2mml:capture('render'), typeset2mml:async (...args)=>capture('typeset')(...args), page2mml:capture('page'),
    setupComponents() {}, getTokens() {},
    expectTexError:() => jest.expect(null), expectTypesetError:() => jest.expect(null),
    trapErrors:() => '', trapAsyncErrors:async () => '', trapOutput:() => '', toMathML:() => null
  };
  const importer = async (id) => {
    if (id === '@jest/globals') return jest;
    if (id === '#helpers') return helpers;
    if (id.startsWith('#js/')) {
      const suffix = id.slice(4).replace(/\.js$/, '') + '.js';
      return import('@mathjax/src/js/' + suffix);
    }
    throw Error(`Unsupported upstream import ${id}`);
  };
  try {
    let js = stripTypeScriptTypes(text, {mode:'strip'});
    js = js.replace(/import\s+(\{[^}]*\}|[\w$]+)\s+from\s+(['"])([^'"]+)\2\s*;/g, (_m,bindings,_q,id) => {
      const names = bindings.trim().startsWith('{') ? bindings.replace(/\bas\b/g, ':') : `{default: ${bindings}}`;
      return `const ${names} = await __import(${JSON.stringify(id)});`;
    }).replace(/import\s*(['"])([^'"]+)\1\s*;/g, (_m,_q,id) => `await __import(${JSON.stringify(id)});`)
      .replace(/\bimport\(/g, '__import(');
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    await new AsyncFunction('__import', js)(importer);
    for (const test of tests) {
      current=test.name; config=test.initialConfig; history=[];
      try { for (const hook of test.hooks) await hook(); await test.fn(); }
      catch (e) { diagnostics.push({file,test:current,error:String(e)}); }
    }
  } catch (e) { diagnostics.push({file,error:String(e)}); }
  for (const [name, raw] of Object.entries(snapshots)) {
    // Jest quotes strings, with surrounding newlines only for multiline values.
    const trimmed=typeof raw==='string'?raw.trim():'';
    const expected=trimmed.startsWith('"') && trimmed.endsWith('"') ? trimmed.slice(1,-1) : null;
    const input = matched.get(name) || null;
    records.push({id:`${file}::${name}`, group:file.replace('.test.ts','').toLowerCase(),
      source:{file:`testsuite/tests/input/tex/${file}`, test:name, snapshot:`testsuite/tests/input/tex/__snapshots__/${file}.snap`},
      input, expected:expected?.startsWith('<math') ? expected : null,
      unsupported: !input ? 'input-not-captured' : !expected?.startsWith('<math') ? 'non-single-MathML-snapshot'
        : JSON.stringify(input).includes('"$function"') ? 'function-valued-options'
        : ['page','typeset'].includes(input.mode) ? `${input.mode}-component-pipeline`
        : null,
      ...(!expected?.startsWith('<math') ? {rawSnapshot:raw} : {})});
  }
}
// Snapshot exports are alphabetically sorted; upstream execution order is significant
// (notably UnicodeCache). Retain source-file order and actual capture sequence.
records.sort((a,b)=>a.source.file.localeCompare(b.source.file,'en') || (a.input?.executionOrder??Infinity)-(b.input?.executionOrder??Infinity));
const builtinPackages=new Set(fs.readdirSync(path.join(installed,'mjs/input/tex'),{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name));
for(const record of records) {
  const custom=record.input?.packages.filter(p=>!builtinPackages.has(Array.isArray(p)?p[0]:p)) || [];
  if(!record.unsupported && custom.length) record.unsupported='custom-package-registration';
}
const groups = {};
for (const r of records) groups[r.group]=(groups[r.group]||0)+1;
const fixture = {schemaVersion:1, provenance:{project:'MathJax-src', version, revision,
  repository:'https://github.com/mathjax/MathJax-src', license:'Apache-2.0', sources}, groups, records};
fs.writeFileSync(path.join(out, 'mathjax-4.1.3.json'), JSON.stringify(fixture,null,2)+'\n');
fs.writeFileSync(path.join(out, 'extraction-diagnostics.json'), JSON.stringify(diagnostics,null,2)+'\n');
fs.copyFileSync(path.join(source,'LICENSE'), path.join(out,'LICENSE.MathJax'));
const notice = ['NOTICE', 'NOTICE.txt'].find(f=>fs.existsSync(path.join(source,f)));
if (notice) fs.copyFileSync(path.join(source,notice), path.join(out,'NOTICE.MathJax'));
console.log(JSON.stringify({version, revision, groups, total:records.length, captured:records.filter(r=>r.input).length,
  unsupported:records.filter(r=>r.unsupported).length, diagnostics:diagnostics.length},null,2));
