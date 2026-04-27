# Changelog

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
