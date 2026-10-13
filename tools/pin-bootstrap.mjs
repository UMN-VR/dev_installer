#!/usr/bin/env node
/** Create a wrapper release's manifest-data pin, using the shared manifest validator. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { sharedInstaller } from '../src/shared-installer.mjs';
const { exactOid, sha256, validateLocation, validateManifest } = await sharedInstaller('./manifest');

function assertCampusPackage(name) {
  if (/^@?0sfs(?:\/|$)/i.test(name) || /^@?felipegalind0\/jsbsim$/i.test(name)) throw new Error('Campus installed packages must not require flight');
  if (/^@foss-earth\/(?:search|vr)$/i.test(name)) throw new Error('Deferred shared packages are not current Campus dependencies');
  if (name === 'foss-earth') throw new Error('Campus split setup must use the actual split packages, not the old monolith');
}

export function pinCampusManifest({ manifestFile, location, revision, validationRoot }) {
  exactOid(revision);
  validateLocation(location);
  const manifestLocation = new URL(location);
  if (manifestLocation.protocol !== 'https:' || manifestLocation.hostname !== 'raw.githubusercontent.com'
    || manifestLocation.pathname !== `/UMN-VR/tour/${revision}/release/workspace.json`
    || manifestLocation.search || manifestLocation.hash || manifestLocation.port || manifestLocation.username || manifestLocation.password) {
    throw new Error('Published bootstrap manifest location must name its immutable source revision over HTTPS');
  }
  const bytes = readFileSync(manifestFile);
  const manifest = JSON.parse(bytes);
  validateManifest(manifest, validationRoot);
  if (manifest.owner !== 'UMN-VR/tour') throw new Error('Campus workspace manifest belongs to UMN-VR/tour');
  for (const repo of manifest.repositories) {
    if (/^0sfs\//i.test(repo.repository) || /^Felipegalind0\/jsbsim$/i.test(repo.repository)) throw new Error('Campus onboarding must not require flight');
    if (/^foss-earth\/(search|vr)$/i.test(repo.repository)) throw new Error('Deferred shared features are not current Campus workspace components');
    if (!/^(?:https|ssh):\/\//.test(repo.source)) throw new Error('Published campus manifest must use declared canonical sources, not personal paths');
    const source = new URL(repo.source);
    const identity = decodeURIComponent(source.pathname).replace(/^\//, '').replace(/\/$/, '').replace(/\.git$/i, '');
    if (source.hostname !== 'github.com' || source.hash || source.port || identity.toLowerCase() !== repo.repository.toLowerCase()
      || source.protocol === 'ssh:' && source.username && source.username !== 'git') {
      throw new Error('Published campus source must match its declared canonical GitHub repository');
    }
    for (const installed of repo.installedPackages ?? []) {
      assertCampusPackage(installed.name);
    }
  }
  for (const link of manifest.links ?? []) assertCampusPackage(link.package);
  for (const artifact of manifest.artifacts ?? []) {
    if (!artifact.location.startsWith('https://')) throw new Error('Published campus artifacts must have public immutable HTTPS sources');
  }
  return { schemaVersion: 1, manifest: { location, sha256: sha256(bytes), sizeBytes: bytes.length, owner: manifest.owner, revision } };
}

import { fileURLToPath } from 'node:url';
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [manifestFile, location, revision, output] = process.argv.slice(2);
  if (!manifestFile || !location || !revision || !output || process.argv.length !== 6) {
    throw new Error('Usage: node tools/pin-bootstrap.mjs VALIDATED_WORKSPACE_JSON IMMUTABLE_HTTPS_URL SOURCE_REVISION NEW_DESCRIPTOR_JSON');
  }
  const pin = pinCampusManifest({ manifestFile, location, revision, validationRoot: path.resolve('.local/manifest-validation') });
  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(pin, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify({ owner: pin.manifest.owner, revision: pin.manifest.revision, sha256: pin.manifest.sha256, sizeBytes: pin.manifest.sizeBytes }));
}
