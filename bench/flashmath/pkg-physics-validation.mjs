/** Reproducible lane gate; the full conformance report retains every fixture. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root = path.resolve(import.meta.dirname, '../..');
const prefix = 'bench/flashmath/pkg-physics-';
const checks = [];
function check(name, args, accepted = [0]) {
  const result = spawnSync(process.execPath, args, {cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024});
  const log = result.stdout + result.stderr;
  fs.writeFileSync(path.join(root, prefix + name + '.log'), log);
  checks.push({name, command: [process.execPath, ...args], exitCode: result.status});
  console.log(`${name}: exit ${result.status}`);
  console.log(log.trim().split('\n').slice(-10).join('\n'));
  assert.ok(accepted.includes(result.status), `${name} exited ${result.status}: ${result.error ?? ''}`);
}
check('build', ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json']);
check('tests', ['--test', 'test/*.test.mjs']);
check('conformance', ['conformance/runner.mjs', '--subject', 'bench/flashmath/adapter.mjs',
  '--output', prefix + 'conformance.json', '--fresh'], [0, 1]);
const report = JSON.parse(fs.readFileSync(path.join(root, prefix + 'conformance.json')));
const expected = {physics: 628, braket: 30, cancel: 8, centernot: 2, bbox: 6, enclose: 6};
const groups = {};
for (const [name, total] of Object.entries(expected)) {
  groups[name] = report.groups[name];
  assert.equal(groups[name].total, total, name + ' denominator');
  assert.equal(groups[name].matched, total, name + ' matches');
  console.log(name, JSON.stringify(groups[name]));
}
for (const [name, total, matched] of [['base', 811, 780], ['newcommand', 58, 58]]) {
  groups[name] = report.groups[name];
  assert.equal(groups[name].total, total, name + ' denominator');
  assert.ok(groups[name].matched >= matched, name + ' regression');
  console.log(name, JSON.stringify(groups[name]));
}
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'conformance/fixtures/mathjax-4.1.3.json')));
const owned = new Set(Object.keys(expected));
const crossPackageRows = report.rows.filter((row, i) => !owned.has(row.group) &&
  fixture.records[i].input?.packages?.some(p => owned.has(Array.isArray(p) ? p[0] : p)));
console.log('crossPackageRows', JSON.stringify(crossPackageRows));
const inputs = ['src/parser.ts', 'src/scanner.ts', 'src/ast.ts', 'src/serialize.ts', 'src/symbols.ts',
  'src/packages/base.ts', 'src/packages/newcommand.ts', 'src/packages/registry.ts', 'src/packages/types.ts',
  ...Object.keys(expected).map(n => `src/packages/${n}.ts`), 'conformance/fixtures/mathjax-4.1.3.json'];
const sha256 = Object.fromEntries(inputs.map(name => [name,
  createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex')]));
fs.writeFileSync(path.join(root, prefix + 'validation.json'), JSON.stringify({checks, groups,
  fullConformance: {total: report.total, matched: report.matched, classifications: report.classifications},
  crossPackageRows, sha256}, null, 2) + '\n');
