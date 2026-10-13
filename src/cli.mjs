import { existsSync, readFileSync } from 'node:fs';
import { sharedInstaller } from './shared-installer.mjs';

/** Thin campus entry. Repository lists, pins and build order live only in manifest data. */
export async function runCampusCli({ args = process.argv.slice(2), write } = {}) {
  let runCli;
  try {
    ({ runCli } = await sharedInstaller());
  } catch (error) {
    const result = { schemaVersion: 1, complete: false, clean: false, exitCode: 2, issues: [{ rule: error.rule ?? 'campus.shared-installer-pin', detail: 'The installed shared installer does not match the reviewed complete executable seal; no workspace operation started' }] };
    (write ?? (text => process.stdout.write(text)))(`${JSON.stringify(result, null, 2)}\n`);
    return result;
  }
  // Explicit manifest/descriptor input bypasses the release's default pin.
  // Missing default is delegated as the shared bootstrap.unavailable result;
  // never invent a mutable URL or import the tour package to find one.
  const descriptor = new URL('../release/bootstrap.json', import.meta.url);
  const explicit = args.includes('--manifest') || args.includes('--bootstrap');
  let bootstrap;
  try {
    bootstrap = !explicit && existsSync(descriptor) ? JSON.parse(readFileSync(descriptor, 'utf8')) : undefined;
  } catch {
    const result = { schemaVersion: 1, complete: false, clean: false, exitCode: 2, issues: [{ rule: 'campus.bootstrap-input', detail: 'Cannot read the Campus default bootstrap descriptor; use a valid reviewed release or an explicit --manifest/--bootstrap input' }] };
    (write ?? (text => process.stdout.write(text)))(`${JSON.stringify(result, null, 2)}\n`);
    return result;
  }
  return runCli({ args, bootstrap, ...(write ? { write } : {}) });
}
