import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { SHARED_INSTALLER_PIN, verifySharedInstaller } from '../src/shared-installer.mjs';

const release = JSON.parse(readFileSync(new URL('../release/shared-installer.json', import.meta.url)));
mkdirSync('.local/checks', { recursive: true });
const scratch = mkdtempSync(path.resolve('.local/checks/installer-seal-'));
const installed = verifySharedInstaller();

test('binds the reviewed shared source/archive and every executable file before importing', () => {
  assert.equal(installed.revision, SHARED_INSTALLER_PIN.revision);
  assert.equal(installed.artifactSha256, SHARED_INSTALLER_PIN.archiveSha256);
  assert.equal(installed.sealedFiles, 13);
});

for (const name of release.runtimeFiles) {
  test(`refuses byte drift in the transitive shared executable closure: ${name}`, () => {
    const root = mkdtempSync(path.join(scratch, 'drift-'));
    for (const file of release.runtimeFiles) {
      const target = path.join(root, file);
      mkdirSync(path.dirname(target), { recursive: true });
      cpSync(path.join(installed.root, file), target);
    }
    writeFileSync(path.join(root, name), 'corrupt candidate fixture');
    assert.throws(() => verifySharedInstaller({ entryUrl: pathToFileURL(path.join(root, 'src/cli.mjs')).href }), /sealed file differs/);
  });
}

test('refuses an otherwise exact linked source package', () => {
  const linked = path.join(scratch, 'linked-package');
  symlinkSync(installed.root, linked, 'dir');
  assert.throws(() => verifySharedInstaller({ entryUrl: pathToFileURL(path.join(linked, 'src/cli.mjs')).href }), /without a source link/);
});

test('refuses a dependency symlink through normal Node public-export resolution', () => {
  const root = mkdtempSync(path.join(scratch, 'lookup-'));
  for (const file of ['src/shared-installer.mjs', 'release/shared-installer.json', 'deps/foss-earth-dev-installer-0.1.0-ff46c57.tgz']) {
    const target = path.join(root, file);
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(new URL(`../${file}`, import.meta.url), target);
  }
  mkdirSync(path.join(root, 'node_modules/@foss-earth'), { recursive: true });
  symlinkSync(installed.root, path.join(root, 'node_modules/@foss-earth/dev-installer'), 'dir');
  const runner = path.join(root, 'verify.mjs');
  writeFileSync(runner, "import { verifySharedInstaller } from './src/shared-installer.mjs'; verifySharedInstaller();\n");
  const result = spawnSync(process.execPath, [runner], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /dependency lookup must be a regular artifact install/);
});

test('malformed default bootstrap returns exit2 before creating a workspace', () => {
  const root = mkdtempSync(path.join(scratch, 'bootstrap-'));
  for (const file of ['src/shared-installer.mjs', 'src/cli.mjs', 'release/shared-installer.json', 'deps/foss-earth-dev-installer-0.1.0-ff46c57.tgz']) {
    const target = path.join(root, file);
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(new URL(`../${file}`, import.meta.url), target);
  }
  mkdirSync(path.join(root, 'node_modules/@foss-earth'), { recursive: true });
  cpSync(installed.root, path.join(root, 'node_modules/@foss-earth/dev-installer'), { recursive: true });
  writeFileSync(path.join(root, 'release/bootstrap.json'), '{invalid shipped JSON');
  const runner = path.join(root, 'run.mjs');
  writeFileSync(runner, "import { runCampusCli } from './src/cli.mjs'; const result = await runCampusCli({args:['init','--root',new URL('./workspace/',import.meta.url).pathname]}); process.exitCode=result.exitCode;\n");
  const result = spawnSync(process.execPath, [runner], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.equal(JSON.parse(result.stdout).issues[0].rule, 'campus.bootstrap-input');
  assert.equal(existsSync(path.join(root, 'workspace')), false);
});
