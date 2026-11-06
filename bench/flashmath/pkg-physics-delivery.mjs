/** Local-only checkpoint delivery when the worktree's original gitdir is read-only. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root = path.resolve(import.meta.dirname, '../..');
const out = path.join(root, 'bench/flashmath');
const bundle = path.join(out, 'pkg-physics.bundle');
const metadata = path.join(out, 'pkg-physics-delivery.json');
const gitdir = fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-physics-git-'));
const git = (args, input) => {
  const result = spawnSync('git', args, {cwd: root, input, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024});
  if (result.status !== 0) throw Error(`${args.join(' ')}: ${result.stderr}`);
  return result.stdout.trim();
};
const local = (args, input) => git(['--git-dir=' + gitdir, '--work-tree=' + root, ...args], input);
try {
  const previous = fs.existsSync(metadata) ? JSON.parse(fs.readFileSync(metadata)) : null;
  const base = previous?.base ?? git(['rev-parse', 'HEAD']);
  const objects = path.resolve(root, git(['rev-parse', '--git-path', 'objects']));
  git(['init', '--bare', gitdir]);
  fs.writeFileSync(path.join(gitdir, 'objects/info/alternates'), objects + '\n');
  const ref = 'refs/heads/lane/pkg-physics';
  let parent = base;
  if (previous && fs.existsSync(bundle)) {
    local(['fetch', bundle, ref + ':' + ref]);
    parent = local(['rev-parse', ref]);
  }
  local(['read-tree', parent]);
  const files = [
    ...['physics', 'braket', 'bbox', 'cancel', 'centernot', 'enclose'].map(n => `src/packages/${n}.ts`),
    'src/parser.ts', 'src/packages/registry.ts', 'test/packages', 'test/packages-pkg-physics.test.mjs', 'docs/packages-shared-changes.md',
    'docs/packages-pkg-physics.md', 'bench/flashmath/pkg-physics-delivery.mjs',
    'bench/flashmath/pkg-physics-differences.mjs', 'bench/flashmath/pkg-physics-conformance.json',
    'bench/flashmath/pkg-physics-validation.json', 'bench/flashmath/pkg-physics-validation.mjs',
    'bench/flashmath/pkg-physics-tests.log', 'bench/flashmath/pkg-physics-conformance.log',
  ].filter(name => fs.existsSync(path.join(root, name)));
  local(['add', '-f', '--', ...files]);
  const tree = local(['write-tree']);
  const unchanged = tree === local(['rev-parse', parent + '^{tree}']);
  const head = unchanged ? parent : local(['-c', 'commit.gpgsign=false', 'commit-tree', tree, '-p', parent],
    (process.argv[2] ?? 'feat(packages): implement physics braket cancel centernot bbox and enclose') + '\n');
  local(['update-ref', ref, head]);
  local(['bundle', 'create', bundle, base + '..' + ref]);
  const patch = local(['diff', '--binary', base, head]);
  fs.writeFileSync(path.join(out, 'pkg-physics.patch'), patch + '\n');
  fs.writeFileSync(metadata, JSON.stringify({base, head, ref, files, delivery: 'local bundle; no network operation'}, null, 2) + '\n');
  console.log(local(['log', '--oneline', base + '..' + head]));
  console.log(local(['bundle', 'verify', bundle]));
  console.log(local(['bundle', 'list-heads', bundle]));
} finally { fs.rmSync(gitdir, {recursive: true, force: true}); }
