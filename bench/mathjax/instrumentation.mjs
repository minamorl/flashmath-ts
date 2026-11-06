import Module, {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const require = createRequire(import.meta.url);
export const sites = [
  ['base', '@mathjax/src/cjs/input/tex/base/BaseMethods.js', 'macro'],
  ['template', '@mathjax/src/cjs/input/tex/newcommand/NewcommandMethods.js', 'text'],
  ['environment', '@mathjax/src/cjs/input/tex/newcommand/NewcommandMethods.js', 'bdef'],
];

export function freshStats() {
  return Object.fromEntries(sites.map(([name]) => [name,
    {calls: 0, suffixUnits: 0, intervalNs: 0}]));
}

export function sourceEvidence() {
  return sites.map(([site, module, arg]) => {
    const source = readFileSync(require.resolve(module), 'utf8');
    const statement = `parser.string = ParseUtil_js_1.ParseUtil.addArgs(parser, ${arg}, parser.string.slice(parser.i));\n        parser.i = 0;`;
    if (source.split(statement).length !== 2) {
      throw new Error(`Expected exactly one pinned 4.1.3 statement: ${site}`);
    }
    return {site, module, arg, statement,
      sha256: createHash('sha256').update(source).digest('hex')};
  });
}

// Process-local CommonJS loader hook. No installed file is written.
export function installInstrumentation() {
  const evidence = sourceEvidence();
  const targets = new Map();
  for (const entry of evidence) {
    const path = require.resolve(entry.module);
    if (require.cache[path]) throw new Error(`Module already loaded: ${path}`);
    targets.set(path, [...(targets.get(path) ?? []), entry]);
  }
  globalThis.__mathjaxBenchStats = freshStats();
  const original = Module._extensions['.js'];
  const patched = [];
  Module._extensions['.js'] = function(module, filename) {
    if (!targets.has(filename)) return original(module, filename);
    let source = readFileSync(filename, 'utf8');
    for (const {site, statement} of targets.get(filename)) {
      source = source.replace(statement, `{
        const __stat = globalThis.__mathjaxBenchStats.${site};
        __stat.calls++;
        __stat.suffixUnits += parser.string.length - parser.i;
        const __start = process.hrtime.bigint();
        try {
          ${statement}
        } finally {
          const __end = process.hrtime.bigint();
          __stat.intervalNs += Number(__end - __start);
        }
      }`);
      patched.push(site);
    }
    module._compile(source, filename);
  };
  return {evidence, patched, restore() { Module._extensions['.js'] = original; }};
}
