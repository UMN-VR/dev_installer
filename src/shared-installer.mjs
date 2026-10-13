import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

/** UMN's reviewed tooling dependency, independent of the tour runtime/manifest. */
export const SHARED_INSTALLER_PIN = Object.freeze({
  revision: 'ff46c57de0789417c9794a44a0710bedb6bae9cf',
  descriptorSha256: '96424073b0cdefdbd63be03a0f0bc39768d8e6cb5923d2608aeefa3b21c56a2a',
  archiveSha256: 'c6cab4bcb123582fcfc8a9ecb418deeb508842a78398a10f15f92680034066ba',
  sizeBytes: 114602,
});

function reject(detail) {
  throw Object.assign(new Error(detail), { rule: 'campus.shared-installer-pin' });
}
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/** No package code executes until its reviewed full executable closure matches. */
export function verifySharedInstaller({ entryUrl } = {}) {
  const descriptorBytes = readFileSync(new URL('../release/shared-installer.json', import.meta.url));
  if (sha256(descriptorBytes) !== SHARED_INSTALLER_PIN.descriptorSha256) reject('Shared installer external descriptor differs from the reviewed pin');
  const release = JSON.parse(descriptorBytes);
  if (release.revision !== SHARED_INSTALLER_PIN.revision || release.artifactSha256 !== SHARED_INSTALLER_PIN.archiveSha256 || release.sizeBytes !== SHARED_INSTALLER_PIN.sizeBytes) reject('Shared installer source/archive identity differs from the reviewed pin');
  const archive = readFileSync(new URL('../deps/foss-earth-dev-installer-0.1.0-ff46c57.tgz', import.meta.url));
  if (archive.length !== SHARED_INSTALLER_PIN.sizeBytes || sha256(archive) !== SHARED_INSTALLER_PIN.archiveSha256) reject('Shared installer dependency archive differs from the reviewed pin');

  const resolvedUrl = entryUrl ?? import.meta.resolve('@foss-earth/dev-installer');
  const entry = fileURLToPath(resolvedUrl);
  // This is the exact declared public root export, not a deep import for use.
  const root = dirname(dirname(entry));
  if (join(root, 'src', 'cli.mjs') !== entry || realpathSync(root) !== root) reject('Shared installer must resolve to its exact installed public entry, without a source link');
  if (entryUrl === undefined) {
    // Node's resolver may already have canonicalized a dependency symlink.
    // Verify the actual lookup directory as well as the resolved file URL.
    const require = createRequire(import.meta.url);
    const lookup = require.resolve.paths('@foss-earth/dev-installer')
      .map(directory => join(directory, '@foss-earth', 'dev-installer'))
      .find(directory => existsSync(directory));
    if (!lookup || lookup !== root || realpathSync(lookup) !== lookup) reject('Shared installer dependency lookup must be a regular artifact install, without a source link');
    for (const directory of [lookup, dirname(lookup), dirname(dirname(lookup))]) {
      if (lstatSync(directory).isSymbolicLink()) reject('Shared installer dependency lookup must not use linked package ancestors');
    }
  }
  for (const [name, expected] of Object.entries(release.files)) {
    const target = join(root, name);
    const parts = relative(root, target).split(sep);
    if (parts.includes('..') || !parts.length) reject('Shared installer sealed path escapes the installed package');
    let current = root;
    for (const part of parts) {
      current = join(current, part);
      if (lstatSync(current).isSymbolicLink()) reject('Shared installer sealed files must not resolve through source links');
    }
    if (!lstatSync(target).isFile() || sha256(readFileSync(target)) !== expected) reject(`Shared installer sealed file differs: ${name}`);
  }
  const manifest = JSON.parse(readFileSync(join(root, 'package.json')));
  const identity = Object.fromEntries(Object.keys(release.packageIdentity).map(key => [key, manifest[key]]));
  if (!isDeepStrictEqual(identity, release.packageIdentity)) reject('Installed shared installer package identity differs from reviewed release');
  return { root, revision: release.revision, artifactSha256: release.artifactSha256, sealedFiles: Object.keys(release.files).length };
}

/** Consume a public export only after the complete reviewed package seal passes. */
export async function sharedInstaller(entry = '.') {
  verifySharedInstaller();
  if (!['.', './manifest', './archive'].includes(entry)) reject('Unsupported Campus tooling export');
  return import(entry === '.' ? '@foss-earth/dev-installer' : `@foss-earth/dev-installer/${entry.slice(2)}`);
}
