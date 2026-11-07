import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {sourceFingerprint} from '../flashmath/fingerprint.mjs';

const read = name => JSON.parse(fs.readFileSync(name));
const checks=read('bench/release/checks.json'), ci=read('bench/release/ci-checks.json');
assert.equal(checks.sourceSha256,sourceFingerprint());
assert.deepEqual(checks.checks.map(c=>c.name), ['build','tests','harness','scoped-conformance','conformance','corpus','bussproofs','grammar','compare','screen','visual','benchmark','benchmark-summary','readme','pack-smoke']);
assert.deepEqual(ci.checks.map(c=>c.name), ['install','build','tests','conformance','conformance-gate','pack-smoke']);
assert.ok(checks.checks.every(c=>c.exit===c.expected));
assert.ok(ci.checks.every(c=>c.allowed.includes(c.exit)));
const pack=read('bench/release/pack.json'), archive=fs.readFileSync('bench/release/'+pack.filename);
assert.equal(archive.length,pack.size);
assert.equal('sha512-'+createHash('sha512').update(archive).digest('base64'),pack.integrity);
const report=fs.readFileSync('bench/release/REPORT.md','utf8');
assert.ok(report.includes(`${pack.filename}; ${archive.length} bytes packed`));
assert.ok(report.includes(pack.integrity));
assert.ok(pack.files.every(f=>/^(dist\/|README.md$|LICENSE$|NOTICE$|package.json$)/.test(f.path)));
const visual=read('bench/native-render/visual-checks.json');
assert.deepEqual(visual.failures,[]);assert.deepEqual(visual.referenceDifferences,[]);
console.log(JSON.stringify({sourceSha256:checks.sourceSha256, node:ci.node,
  candidate:pack.filename, bytes:archive.length, integrity:pack.integrity,
  releaseExits:checks.checks.map(c=>[c.name,c.exit]), ciExits:ci.checks.map(c=>[c.name,c.exit])},null,2));
console.log('Artifact/source/report consistency: PASS');
