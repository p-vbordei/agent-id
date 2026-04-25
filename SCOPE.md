# agent-id — v0.1 Scope

Stage 1 output. Each candidate feature gets: real first-party caller, primary-use-case-dies test, reinvention check, verdict.

Default is DEFERRED. Inclusion requires either (a) an existing first-party caller in the `agent-*` family, or (b) the primary use case dies without it.

---

## IN-V0.1

### JSON-LD `@context` for capability VCs (`context/v1.jsonld`)
- First-party caller: every `agent-*` signer (`agent-phone`, `agent-toolprint`, `agent-cid`, `agent-ask`, `agent-pay`) emits VCs under this context.
- Dies without it: yes — no canonical agent profile.
- Reinvents: no.

### JSON Schema for Capability VC (`schema/capability-v1.json`)
- First-party caller: verifier (C2); non-TS implementations.
- Dies without it: yes — C2 is schema-based rejection.
- Reinvents: no (JSON Schema 2020-12).

### `did:key` resolution (Ed25519, multibase/multicodec)
- First-party caller: ephemeral agents (`agent-phone` sessions, `agent-toolprint` authors).
- Dies without it: yes — C1, C2 use did:key.
- Reinvents: no (compose `@noble/ed25519` + `multiformats`).

### `did:web` resolution (HTTP fetch of `/.well-known/did.json`)
- First-party caller: org-hosted agents and any org-anchored signer.
- Dies without it: yes — C3 is explicitly did:web.
- Reinvents: no.

### `issue(principalKeyPair, subject, opts?) → VC`
- First-party caller: `agent-ask`, `agent-pay`, any caller signing its capability claims.
- Dies without it: yes.
- Reinvents: no — `@noble/ed25519` + `canonicalize` (JCS) for `eddsa-jcs-2022` suite.

### `verify(vc, opts?) → { verified, errors }`
- First-party caller: every relying party in the family.
- Dies without it: yes — VCs are useless without verification.
- Reinvents: no.

### Validity-window enforcement with ±5 min clock skew (SPEC §5)
- First-party caller: all verifiers.
- Dies without it: yes — stale VCs would be accepted.
- Reinvents: no.

### Conformance vectors for C1 / C2 / C3 (`conformance/*.json`)
- First-party caller: this repo IS the conformance authority for agent-native VC profiles.
- Dies without it: yes — "spec + reference impl + conformance tests" is the product.
- Reinvents: no.

### 20-line demo script (`examples/demo.ts`)
- First-party caller: the sales pitch.
- Dies without it: yes — demos beat docs.
- Reinvents: no.

---

## DEFERRED-TO-V0.2

### HTTP server endpoints (`/credentials/issue`, `/credentials/verify`, `/resolve/{did}`, `/.well-known/agent-id.json`)
- First-party caller: none — every caller imports the library directly.
- Dies without it: no — `did:web` resolution needs an HTTP *client*, not a server.
- Reason to defer: adds Hono + routes + HTTP error shapes for zero present benefit. Add when a caller needs verify-as-a-service.

### VC Status List 2021 revocation
- First-party caller: none.
- Dies without it: no — SPEC §5 says MAY; no Cn requires it.
- Reason to defer: no present caller. Reconsider when a principal actually needs to revoke in anger.

---

## CUT

### `did:peer` method
- First-party caller: none — `agent-phone` can use `did:key` for pairwise.
- SPEC §2 says MAY. Can be added later without breaking v0.1.

### CLI tool with issue/verify/resolve commands
- Library + demo script cover the need. Corporate-code risk if added now for no caller.

### Explicit key-rotation ceremony API
- SPEC §5 says rotations happen via updated DID Document or superseding VC — both handled naturally by `resolve` + `issue`. No new code needed.

### Generic VC issuer supporting arbitrary contexts / suites
- Anti-scope. `agent-id` ships THIS profile with ONE suite (`eddsa-jcs-2022`). Generic VC is `@digitalbazaar/vc`'s job, not ours.

---

## Design calls

### Proof suite: `eddsa-jcs-2022`, not `eddsa-rdfc-2022`
SPEC §3 allows "`eddsa-rdfc-2022` or equivalent Data Integrity proof suite". `eddsa-jcs-2022` is the sanctioned JCS-based equivalent. Dropping RDFC drops the `jsonld` dep tree and its runtime-fetching-contexts complexity. SPEC banner flip at release will state the v1.0 suite explicitly.

### Library only, no HTTP server
Every first-party caller imports a library. A server is a wrapper. Wrappers are v0.2 material.

### Hand-rolled VC plumbing (not `@digitalbazaar/vc`)
The v0.1 work is byte-concatenation + signature + schema validation, ~100 LoC. Pulling `@digitalbazaar/vc` brings `jsonld` (runtime context fetching) that we'd have zero other reason to introduce. We still compose mature primitives for the crypto (`@noble/ed25519`) and canonicalization (`canonicalize`).

## Runtime dependencies (v0.1 library)

- `@noble/ed25519` — Ed25519 signatures
- `@noble/hashes` — SHA-256
- `canonicalize` — RFC 8785 JCS
- `multiformats` — multibase/multicodec for did:key
- `zod` — runtime validation of internal shapes

Five packages. No HTTP framework, no JSON-LD processor, no VC framework.
