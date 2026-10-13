# Campus development installer

`umn-vr-setup` is UMN's entry point to the shared `@foss-earth/dev-installer`
CLI. It delegates `init`, `doctor`, `sync`, `check`, selection/dependency closure,
clone/update ordering, checks, artifact verification and resumable dirty-safe
execution. It does not import tour runtime or maintain another repository list.

A completed release pins `release/bootstrap.json`, which identifies the exact
tour-owned workspace manifest URL/source revision/SHA-256/byte count. Shared
bootstrap verifies this data before a workspace/tour checkout exists. Explicit
`--manifest`/`--manifest-sha256` or `--bootstrap` inputs pass through unchanged.

```sh
umn-vr-setup init --root WORKSPACE
umn-vr-setup init --root WORKSPACE --apply
umn-vr-setup init --root WORKSPACE --select about --apply
umn-vr-setup doctor --root WORKSPACE
umn-vr-setup sync --root WORKSPACE --apply
umn-vr-setup check --root WORKSPACE
```

The default manifest must declare App, Minneapolis, Saint Paul, Twin Cities, selector, club, About, browser-testing, installer and organization policy plus shared source
dependencies and prepared public content with exact compatible pins/install/
build order. Smaller club, selector, About and individual scene selections live in that same data.
Downloads disclose source/size/digest. Optional media authoring separately
documents the local-only YouVisit backup; default setup must not acquire it.
No aircraft/native-flight tools, implicit system install or server belongs here.
Print the relevant server command after successful setup; never start it.

The developer default must link every selected declared package edge to one
independent provider checkout, shared with other compatible consumers. Public
exports and a portable workspace layout plus local checkout map preserve the
repository boundary. Exact artifact qualification separately disables source
links. Generated prepared content stays pinned and is never rebuilt by linking.
The current reviewed shared installer supports explicit `--links` overrides to
existing clean pinned checkouts; automatic fresh-provider linking awaits
Platform's reviewed source-workspace contract. Campus delegates that mechanism.

The wrapper binds the coordinator-reviewed shared installer source `ff46c57de0789417c9794a44a0710bedb6bae9cf`, archive SHA-256 `c6cab4bcb123582fcfc8a9ecb418deeb508842a78398a10f15f92680034066ba` (114,602 bytes), and external descriptor SHA-256 `96424073b0cdefdbd63be03a0f0bc39768d8e6cb5923d2608aeefa3b21c56a2a`. Its local dependency archive and reviewed descriptor are retained in `deps/` and `release/shared-installer.json`. Before any shared public import, `src/shared-installer.mjs` verifies descriptor/archive identity, package metadata and all 13 sealed executable/package/schema files. This is UMN release binding; generic workspace/archive/package mechanics stay in the shared owner.

Candidate status: the shared pin is prepared but new wrapper checks/install/lock and the default descriptor/workspace/content/public distribution are still pending. Explicit inputs delegate to this exact shared CLI once installed. No passing default/selected real-app bootstrap, platform support or completed installer release is claimed. Generic safety fixtures stay in the shared owner.
Full application receipts must prove artifact integrity, dependency closure,
build order, safe resumption/refusal and read-only doctor with accepted inputs.

The release helper `tools/pin-bootstrap.mjs` validates an exact tour-owned
manifest through the public shared API, rejects flight/personal-source paths
in public bootstrap data, and writes its new immutable descriptor. The wrapper
and tour workspace pin must be tested/released together once actual candidates are
accepted; future Search/VR remain excluded. No duplicate orchestration code.
The same Campus dependency restrictions apply to `installedPackages` and
declared development links.

## Community documents

- [Code of conduct](https://github.com/UMN-VR/.github/blob/main/CODE_OF_CONDUCT.md)
- [Contributing](https://github.com/UMN-VR/.github/blob/main/CONTRIBUTING.md)
- [AGPL-3.0 license](LICENSE)
- [Security](https://github.com/UMN-VR/.github/blob/main/SECURITY.md)


## Approved independent scene ownership — 2026-10-10

Thin shared-installer wrapper and exact Tour workspace-manifest bootstrap. Earlier ownership descriptions are retained historical context; this current assignment controls source/build adoption.

The new runtime-free Tour workspace plan covers all ten owners. It is not an accepted executable manifest. Persisted mutable source/package/hybrid selection and real bootstrap must use the coordinator-reviewed shared replacement seal and a fresh grant; this wrapper retains ff46 exactly until that replacement is bound. No generic machinery is copied.
