# Changelog

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
