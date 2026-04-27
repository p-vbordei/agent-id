# Changelog

## [0.1.5] — 2026-04-27

Canonical scope move: published under the `@p-vbordei` npm organization (matching the GitHub handle). Metadata-only release; no code changes.

### Changed
- Package name: `@vlad1987654123/agent-id` → `@p-vbordei/agent-id`. The `@p-vbordei` org has been registered on npm; this package now lives there.

### Deprecated
- `@vlad1987654123/agent-id@*` — install will emit a deprecation warning pointing users to `@p-vbordei/agent-id`.

### Install
```bash
bun add @p-vbordei/agent-id
```

## [0.1.4] — 2026-04-27

Metadata-only release. No code changes. Corrects the npm scope and adds author / repo / keywords metadata for npm registry discoverability.

### Changed
- Package name: `@p-vbordei/agent-id` → `@vlad1987654123/agent-id`. The `@p-vbordei` org doesn't exist on npm (it's the GitHub handle, not the npm scope); `@vlad1987654123` is the actual npm account. v0.1.3 was tagged but never published due to this mismatch.

### Added
- `author`, `homepage`, `repository`, `bugs`, `keywords` fields in `package.json` for npm registry discoverability.

### Install
```bash
bun add @vlad1987654123/agent-id
```

## [0.1.3] — 2026-04-27

Metadata-only release. No code changes.

### Changed
- Package name: `agent-id` → `@p-vbordei/agent-id`. The unscoped name was rejected by npm's anti-typosquatting check (too similar to existing `agentid` package). Scoped under `@p-vbordei` (matching the GitHub org).
- Added `publishConfig.access: "public"` to `package.json` so future scoped publishes default correctly.
- README install + import examples updated.

### Install
```bash
bun add @p-vbordei/agent-id
```

## [0.1.2] — 2026-04-27

DoS-resistance hardening for `did:web` resolution. No API breakage.

### Added
- `fetchTimeoutMs` option on `VerifyOptions` and `ResolveOptions` — default `5000` (5s). Aborts hung or slow `did:web` fetches via `AbortController`.
- `maxResponseBytes` option — default `1048576` (1 MiB). Rejects responses with `Content-Length` above the limit before parsing.
- 4 new tests in `tests/edge-cases.test.ts` covering timeout, oversize-rejection, and default-option pass-through.

### Why
A malicious or slow `did:web` host could previously hang `verify()` indefinitely or force the verifier to allocate arbitrary memory parsing a giant JSON response. Both are now bounded by sensible defaults.

## [0.1.1] — 2026-04-25

Adversarial-input hardening from a debugging round. No API or behavior changes for valid inputs.

### Fixed
- `verify(null)` and `verify(undefined)` no longer throw — they return `{ verified: false, errors: [...] }` with a clear message. Public-API guard for non-TypeScript callers.
- `did:web` with empty path segments (e.g. `did:web:example.com:` or `did:web:example.com::agents:alice`) now rejects explicitly instead of producing malformed URLs with double slashes.
- `publicKeyFromDidKey` on a too-short multibase (e.g. `did:key:z`) now reports `did:key multibase too short: decoded N bytes (need 2-byte multicodec + 32-byte Ed25519 key)` instead of leaking literal `undefined` tokens into the error message.

### Added
- `tests/edge-cases.test.ts` — 7 tests pinning the new guards.

## [0.1.0] — 2026-04-24

Initial public release of the `agent-id` reference implementation and v1.0 specification.

### Added
- SPEC.md v1.0: DID method recommendations (`did:key`, `did:web`), Capability VC shape, `eddsa-jcs-2022` proof suite, conformance clauses C1/C2/C3.
- JSON-LD `@context` at `context/v1.jsonld`.
- JSON Schema 2020-12 at `schema/capability-v1.json`.
- Reference library (`src/`): three public functions — `issue(opts)`, `verify(vc, opts?)`, `resolve(did, opts?)` — plus helpers (`generateKeyPair`, `didKeyFromPublicKey`, `publicKeyFromDidKey`).
- `did:key` resolver (algorithmic).
- `did:web` resolver (HTTP fetch; injectable `fetch` for offline tests).
- ±5 min clock skew on validity windows (SPEC §5).
- Conformance runner + three vectors: `conformance/c1-valid.json`, `conformance/c2-mutated.json`, `conformance/c3-didweb.json`.
- 20-line demo at `examples/demo.ts`.

### Deferred to v0.2
- HTTP server endpoints (`/credentials/issue`, `/credentials/verify`, `/resolve/{did}`).
- VC Status List 2021 revocation.
- `did:peer`.

### Non-goals (permanent)
- Generic VC framework (use `@digitalbazaar/vc`).
- Blockchain-anchored identity.
- Wallet UI.
