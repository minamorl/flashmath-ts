import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {limits, makeCases} from './cases.mjs';
import {freshStats, installInstrumentation} from './instrumentation.mjs';

if (process.env.NODE_ENV !== 'production') throw new Error('NODE_ENV must be production');
const task = JSON.parse(readFileSync(0, 'utf8'));
const fixture = makeCases().find(c => c.id === task.caseId);
if (!fixture || !limits[task.limit]) throw new Error('Invalid task');
const require = createRequire(import.meta.url);
const tSetup = process.hrtime.bigint();
let convert;
let hook;
if (task.engine.startsWith('mathjax')) {
  if (task.engine === 'mathjax-instrumented') hook = installInstrumentation();
  const {mathjax} = require('@mathjax/src/cjs/mathjax.js');
  const {TeX} = require('@mathjax/src/cjs/input/tex.js');
  require('@mathjax/src/cjs/input/tex/newcommand/NewcommandConfiguration.js');
  const {liteAdaptor} = require('@mathjax/src/cjs/adaptors/liteAdaptor.js');
  const {RegisterHTMLHandler} = require('@mathjax/src/cjs/handlers/html.js');
  const {SerializedMmlVisitor} = require('@mathjax/src/cjs/core/MmlTree/SerializedMmlVisitor.js');
  const {STATE} = require('@mathjax/src/cjs/core/MathItem.js');
  RegisterHTMLHandler(liteAdaptor());
  const tex = new TeX({packages: ['base', 'newcommand'],
    ...limits[task.limit].mathjax, formatError(_jax, error) { throw error; }});
  const doc = mathjax.document('', {InputJax: tex});
  if (tex.options.maxBuffer !== (task.limit === 'default' ? 5120 : 1048576) ||
      tex.parseOptions.options.maxMacros !== (task.limit === 'default' ? 1000 : 100000)) {
    throw new Error('Unexpected MathJax limits');
  }
  const visitor = new SerializedMmlVisitor();
  convert = () => {
    tex.reset();
    return visitor.visitTree(doc.convert(fixture.tex, {display: true, end: STATE.COMPILED}));
  };
  hook?.restore();
  if (hook && hook.patched.slice().sort().join() !== 'base,environment,template') {
    throw new Error(`Missing instrumentation sites: ${hook.patched}`);
  }
} else if (task.engine === 'temml') {
  const temml = require('temml');
  convert = () => temml.renderToString(fixture.tex,
    {displayMode: true, throwOnError: true, ...limits[task.limit].temml});
} else {
  throw new Error(`Unknown engine ${task.engine}`);
}
const setupMs = Number(process.hrtime.bigint() - tSetup) / 1e6;

function sample(phase, index) {
  if (hook) globalThis.__mathjaxBenchStats = freshStats();
  let output;
  let error;
  const start = process.hrtime.bigint();
  try { output = convert(); } catch (e) { error = e; }
  const totalMs = Number(process.hrtime.bigint() - start) / 1e6;
  // Hashing/consuming the returned string is outside the measured conversion.
  if (!error && (typeof output !== 'string' || !output.startsWith('<math') || output.includes('<merror'))) {
    throw new Error('Conversion did not return successful MathML');
  }
  const normalized = output?.replace(/ data-latex(?:-item)?="[^"]*"/g, '');
  return {phase, index, totalMs, status: error ? 'error' : 'ok',
    ...(error ? {error: {name: error.name, id: error.id ?? null, message: error.message}}
      : {outputLength: output.length, outputSha256: createHash('sha256').update(output).digest('hex'),
        normalizedSha256: createHash('sha256').update(normalized).digest('hex')}),
    ...(hook ? {reconstruction: globalThis.__mathjaxBenchStats} : {})};
}

const samples = [sample('cold', 0)];
for (let i = 0; i < task.warmup; i++) sample('warmup', i);
for (let i = 0; i < task.warm; i++) samples.push(sample('warm', i));
// Timing-floor diagnostic, not a correction: timer cost depends on context/JIT.
const timerPairNs = [];
for (let i = 0; i < 256; i++) {
  const start = process.hrtime.bigint();
  const end = process.hrtime.bigint();
  timerPairNs.push(Number(end - start));
}
process.stdout.write(JSON.stringify({task, setupMs, samples, timerPairNs,
  ...(hook ? {instrumentation: hook.evidence} : {})}));
