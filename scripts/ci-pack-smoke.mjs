import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

export function checkPackEntries(entries) {
  const files = new Set();
  for (const entry of entries) {
    assert.ok(entry.startsWith('package/'), `unexpected tarball root: ${entry}`);
    const relative = entry.slice('package/'.length);
    const parts = relative.split('/');
    assert.ok(!parts.includes('..') && !parts.includes('.'), `unsafe tarball path: ${entry}`);
    assert.ok(!parts.some(part => ['bench', 'conformance', 'fixtures'].includes(part)
      || /(^|[._-])git($|[._-])/i.test(part)), `internal content in tarball: ${entry}`);
    if (!relative || entry.endsWith('/')) continue;
    assert.ok(relative.startsWith('dist/') || ['package.json', 'README.md', 'LICENSE', 'NOTICE'].includes(relative),
      `unexpected published file: ${entry}`);
    assert.ok(!files.has(relative), `duplicate tarball file: ${entry}`);
    files.add(relative);
  }
  for (const required of ['package.json', 'dist/index.js', 'dist/react.js']) {
    assert.ok(files.has(required), `tarball missing ${required}`);
  }
  return files;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {encoding: 'utf8', ...options});
  assert.equal(result.status, 0,
    `${command} failed (exit ${result.status}, signal ${result.signal}): ${result.error ?? ''}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

export function smokePack() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  assert.ok(process.env.TMPDIR, 'TMPDIR is required for pack smoke scratch files');
  const scratch = mkdtempSync(path.join(realpathSync(process.env.TMPDIR), 'flashmath-ci-pack-'));
  try {
    const metadata = JSON.parse(run('npm', ['pack', '--json', '--cache', path.join(scratch, 'npm-cache'),
      '--pack-destination', scratch], {cwd: root}));
    assert.equal(metadata.length, 1, 'expected one npm tarball');
    const [packed] = metadata;
    const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    assert.equal(packed.name, manifest.name);
    assert.equal(packed.version, manifest.version);
    assert.match(packed.filename, /^[\w.-]+\.tgz$/, 'unsafe tarball filename');
    const tarball = path.join(scratch, packed.filename);
    // Inspect the actual archive as well as npm's manifest before extraction.
    const entries = run('tar', ['-tzf', tarball]).trimEnd().split('\n');
    const files = checkPackEntries(entries);
    assert.deepEqual([...files].sort(), packed.files.map(file => file.path).sort(), 'tarball differs from npm manifest');
    const consumer = path.join(scratch, 'consumer');
    const modules = path.join(consumer, 'node_modules');
    const target = path.join(modules, manifest.name);
    mkdirSync(target, {recursive: true});
    run('tar', ['-xzf', tarball, '-C', target, '--strip-components=1']);
    // Reuse only the installed peers; the library itself must resolve from the tarball.
    for (const peer of ['react', 'react-dom']) {
      symlinkSync(realpathSync(path.join(root, 'node_modules', peer)), path.join(modules, peer), 'dir');
    }
    writeFileSync(path.join(consumer, 'smoke.mjs'), `
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {parseToMathMLAst, toMathMLString} from '${manifest.name}';
import {parseToReact} from '${manifest.name}/react';
import {renderToStaticMarkup} from 'react-dom/server';
const target = ${JSON.stringify(target + path.sep)};
for (const name of ['${manifest.name}', '${manifest.name}/react']) {
  assert.ok(fileURLToPath(import.meta.resolve(name)).startsWith(target), 'import escaped tarball: ' + name);
}
const tex = String.raw\`\\begin{cases}x&x>0\\\\0&x=0\\end{cases}\`;
const options = {packages: ['base', 'ams'], display: true};
const core = toMathMLString(parseToMathMLAst(tex, options));
const react = renderToStaticMarkup(parseToReact(tex, options));
for (const output of [core, react]) {
  assert.match(output, /<math[\\s>]/);
  assert.match(output, /<mtable[\\s>]/);
  assert.doesNotMatch(output, /merror/);
}
console.log(JSON.stringify({coreImport: true, reactImport: true, reactSSR: true, coreBytes: core.length, reactBytes: react.length}));
`);
    console.log(run(process.execPath, ['smoke.mjs'], {cwd: consumer}).trim());
    console.log(`Pack smoke PASS: ${JSON.stringify({tarball: packed.filename, files: files.size, unpackedBytes: packed.unpackedSize})}`);
  } finally {
    rmSync(scratch, {recursive: true, force: true});
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    smokePack();
  } catch (error) {
    console.error(`Pack smoke FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
