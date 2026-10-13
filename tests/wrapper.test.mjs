import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { runCampusCli } from '../src/cli.mjs';
import { pinCampusManifest } from '../tools/pin-bootstrap.mjs';

mkdirSync('.local/checks', { recursive: true });
const root = mkdtempSync(path.resolve('.local/checks/wrapper-'));
function fixture() {
  const folder = mkdtempSync(path.join(root, 'fixture-'));
  const manifestFile = path.join(folder, 'workspace.json');
  const revision = 'a'.repeat(40);
  const manifest = {
    schemaVersion: 1, id: 'umn-campus-fixture', version: '0.1.0', owner: 'UMN-VR/tour',
    repositories: [
      { id: 'about', repository: 'UMN-VR/about', source: 'https://github.com/UMN-VR/about.git', revision, destination: 'UMN-VR/about', dependsOn: [], steps: [] },
      { id: 'tour', repository: 'UMN-VR/tour', source: 'https://github.com/UMN-VR/tour.git', revision, destination: 'UMN-VR/tour', dependsOn: ['about'], steps: [] },
      { id: 'club', repository: 'UMN-VR/UMN-VR.github.io', source: 'https://github.com/UMN-VR/UMN-VR.github.io.git', revision, destination: 'UMN-VR/UMN-VR.github.io', dependsOn: ['tour'], steps: [] },
    ], defaultComponents: ['club', 'tour', 'about'], selections: { about: ['about'], tour: ['tour'], club: ['club'] },
  };
  writeFileSync(manifestFile, JSON.stringify(manifest));
  return { folder, manifestFile, manifest, revision, validationRoot: path.join(folder, 'workspace with spaces') };
}
test('delegates default and selected dependency closure to the real shared CLI without mutation', async () => {
  const f = fixture();
  const before = readdirSync(f.folder);
  const full = await runCampusCli({ args: ['init', '--manifest', f.manifestFile, '--root', f.validationRoot], write: () => {} });
  assert.equal(full.exitCode, 0);
  assert.deepEqual(full.selection, ['about', 'tour', 'club']);
  const selected = await runCampusCli({ args: ['init', '--manifest', f.manifestFile, '--root', f.validationRoot, '--select', 'about'], write: () => {} });
  assert.equal(selected.exitCode, 0);
  assert.deepEqual(selected.selection, ['about']);
  assert.deepEqual(readdirSync(f.folder), before);
});
test('pinned manifest bootstrap is pure data and explicit doctor writes nothing', async () => {
  const f = fixture();
  const descriptor = pinCampusManifest({ ...f, location: `https://raw.githubusercontent.com/UMN-VR/tour/${f.revision}/release/workspace.json` });
  assert.equal(descriptor.manifest.sizeBytes, readFileSync(f.manifestFile).length);
  assert.equal(descriptor.manifest.sha256.length, 64);
  const before = readdirSync(f.folder);
  const doctor = await runCampusCli({ args: ['doctor', '--manifest', f.manifestFile, '--root', f.validationRoot], write: () => {} });
  assert.equal(doctor.exitCode, 1);
  assert.ok(doctor.issues.every(issue => issue.rule === 'repository.missing'));
  assert.deepEqual(readdirSync(f.folder), before);
});
test('uses shared validation and rejects public flight/personal-source/mutable bootstrap input', () => {
  const f = fixture();
  const location = `https://raw.githubusercontent.com/UMN-VR/tour/${f.revision}/release/workspace.json`;
  assert.throws(() => pinCampusManifest({ ...f, location: 'https://example.org/latest/workspace.json' }), /immutable/);
  f.manifest.repositories[0].repository = '0sfs/simulator';
  writeFileSync(f.manifestFile, JSON.stringify(f.manifest));
  assert.throws(() => pinCampusManifest({ ...f, location }), /flight/);
  f.manifest.repositories[0].repository = 'UMN-VR/about';
  f.manifest.repositories[0].source = '/personal/source';
  writeFileSync(f.manifestFile, JSON.stringify(f.manifest));
  assert.throws(() => pinCampusManifest({ ...f, location }), /personal paths/);
});
test('rejects source identity mismatches and case-variant native flight repository names', () => {
  for (const kind of ['mismatch', 'native']) {
    const f = fixture();
    const location = `https://raw.githubusercontent.com/UMN-VR/tour/${f.revision}/release/workspace.json`;
    if (kind === 'mismatch') f.manifest.repositories[0].source = 'https://github.com/0sfs/simulator.git';
    else f.manifest.repositories[0].repository = 'felipegalind0/jsbsim';
    writeFileSync(f.manifestFile, JSON.stringify(f.manifest));
    assert.throws(() => pinCampusManifest({ ...f, location }), /canonical GitHub repository|flight/);
  }
});

test('does not accept an immutable-looking URL for a different manifest owner', () => {
  const f = fixture();
  assert.throws(() => pinCampusManifest({ ...f, location: `https://raw.githubusercontent.com/foss-earth/engine/${f.revision}/release/workspace.json` }), /immutable/);
  assert.throws(() => pinCampusManifest({ ...f, location: `https://raw.githubusercontent.com/UMN-VR/tour/main/release/workspace.json?revision=${f.revision}` }), /immutable/);
});

test('refuses forbidden installed dependencies even when repository owners look valid', () => {
  for (const name of ['@0sfs/simulator', '@felipegalind0/jsbsim', '@foss-earth/vr', '@foss-earth/search', 'foss-earth']) {
    const f = fixture();
    f.manifest.artifacts = [{ id: 'package-pin', location: 'https://example.org/immutable-package.tgz', sha256: 'b'.repeat(64), sizeBytes: 1, destination: 'artifacts/package.tgz' }];
    f.manifest.repositories[0].dependsOn = ['package-pin'];
    f.manifest.repositories[0].installedPackages = [{ name, version: '0.1.0', artifact: 'package-pin', files: { 'package.json': 'c'.repeat(64) } }];
    writeFileSync(f.manifestFile, JSON.stringify(f.manifest));
    assert.throws(() => pinCampusManifest({ ...f, location: `https://raw.githubusercontent.com/UMN-VR/tour/${f.revision}/release/workspace.json` }), /flight|Deferred|monolith/);
  }
});

test('refuses forbidden development links before pinning a Campus default', () => {
  for (const name of ['@0sfs/simulator', '@felipegalind0/jsbsim', '@foss-earth/vr', '@foss-earth/search', 'foss-earth']) {
    const f = fixture();
    f.manifest.links = [{ consumer: 'tour', provider: 'about', package: name }];
    writeFileSync(f.manifestFile, JSON.stringify(f.manifest));
    assert.throws(() => pinCampusManifest({ ...f, location: `https://raw.githubusercontent.com/UMN-VR/tour/${f.revision}/release/workspace.json` }), /flight|Deferred|monolith/);
  }
});
