# agent-id

[![CI](https://github.com/p-vbordei/agent-id/actions/workflows/ci.yml/badge.svg)](https://github.com/p-vbordei/agent-id/actions/workflows/ci.yml)
[![Spec v1.0](https://img.shields.io/badge/spec-v1.0-blue)](./SPEC.md)
[![License](https://img.shields.io/badge/license-Apache%202.0-green)](./LICENSE)
[![Bun](https://img.shields.io/badge/runtime-bun-fbf0df)](https://bun.sh)

> **Machine-first identity for AI agents.** Self-custody DID + Capability Verifiable Credential profile. Three functions, five dependencies, zero blockchain.

```typescript
import { generateKeyPair, didKeyFromPublicKey, issue, verify } from 'agent-id'

const principal = await generateKeyPair()
const agent = await generateKeyPair()

const vc = await issue({
  principal,
  subject: {
    id: didKeyFromPublicKey(agent.publicKey),
    type: 'Agent',
    principal: didKeyFromPublicKey(principal.publicKey),
    model: { vendor: 'anthropic', id: 'claude-opus-4-7' },
    capability: { action: 'answer', sla: { latency_ms_p95: 2000 } },
    valid_from: new Date().toISOString(),
  },
})

const { verified } = await verify(vc) // true
```

That's the whole story: a principal signs a capability claim about an agent, anyone can verify it, no central authority involved.

---

## Why agent-id

Every AI agent eventually needs to answer four questions to anyone it talks to:

1. **Who am I?** (a stable, verifiable identity)
2. **Who controls me?** (the principal — human, org, or parent agent)
3. **What can I do?** (capability — action + scope + SLA)
4. **Which model am I running?** (vendor, model id, optionally a fingerprint)

The W3C primitives that make this possible — DIDs, Verifiable Credentials, Ed25519 signatures, JSON-LD — have been mature for years. What's been missing is the **agent-native profile on top**: a canonical `@context`, a JSON Schema for `{ model, principal, capability, sla }`, and a conformance suite that any implementation can run.

`agent-id` is that profile. ~400 LOC of TypeScript composing audited primitives. Read the [SPEC](./SPEC.md) in 5 minutes.

---

## Quickstart (30 seconds)

```bash
git clone https://github.com/p-vbordei/agent-id.git
cd agent-id
bun install
bun run examples/demo.ts
```

You'll see a principal and an agent exchange a signed Capability VC. Signature verified, schema validated, DIDs resolved.

**Use as a library:**

```bash
bun add github:p-vbordei/agent-id          # until npm publish
# or, eventually:
bun add agent-id
```

---

## What you get

| Artifact | Path | What it is |
|---|---|---|
| Library | [`src/`](./src) | TypeScript reference impl, 3 public functions |
| Spec | [`SPEC.md`](./SPEC.md) | v1.0, normative — pin this in your project |
| JSON-LD context | [`context/v1.jsonld`](./context/v1.jsonld) | Term definitions for the VC |
| JSON Schema | [`schema/capability-v1.json`](./schema/capability-v1.json) | 2020-12, validates the credential shape |
| Conformance | [`conformance/`](./conformance) | 3 test vectors (C1 / C2 / C3) + runner |
| Demo | [`examples/demo.ts`](./examples/demo.ts) | 18 lines, full value prop |

---

## API

Three functions, no classes, no factories.

### `issue(opts) → Promise<VerifiableCredential>`

Mints a Capability VC signed with `eddsa-jcs-2022`.

```typescript
const vc = await issue({
  principal,                          // KeyPair (the signer)
  subject: { id, type, principal, model, capability, valid_from },
  validFrom?, validUntil?,            // defaults: now / never
  now?,                               // for deterministic tests
  issuer?, verificationMethod?,       // override for did:web principals
})
```

### `verify(vc, opts?) → Promise<{ verified, errors }>`

Checks: schema → validity window (±5 min skew) → signature → agent-DID resolution. Errors accumulate; you see all problems at once.

```typescript
const { verified, errors } = await verify(vc, {
  now?,                               // defaults to new Date()
  fetch?,                             // for did:web — inject a stub or use global
  skewSeconds?,                       // defaults to 300
})
```

### `resolve(did, opts?) → Promise<DidDocument>`

Algorithmic for `did:key` (no network). HTTP fetch for `did:web`.

```typescript
const doc = await resolve('did:key:z6Mk...')
const doc = await resolve('did:web:example.com', { fetch })
```

Plus three small helpers exported for convenience: `generateKeyPair`, `didKeyFromPublicKey`, `publicKeyFromDidKey`.

---

## When to use this

- You're building an AI agent and need a verifiable identity for it.
- You want self-custody — no central registry, no platform vendor lock-in.
- You need *machine* identity, not human identity (no UI, no consent flows).
- You want to bind a capability claim to a model + principal in one signed object.
- You're a service that wants to verify "is this agent allowed to do X?" before responding.

## When NOT to use this

- You need TLS-anchored identity → use Google A2A's signed Agent Cards.
- You want a generic VC framework → use [`@digitalbazaar/vc`](https://github.com/digitalbazaar/vc) or [SpruceID](https://github.com/spruceid/ssi).
- You want a wallet UI for humans → use Veramo, Trinsic, or similar.
- You want tool / function descriptions → use [MCP](https://modelcontextprotocol.io/), `agent-id` describes WHO the agent is, not WHAT functions it has.
- You want revocation today → wait for v0.2 (VC Status List), or fork.

---

## How it compares

| | `agent-id` | `@digitalbazaar/vc` | SpruceID `ssi` | Hand-rolled JWT | A2A Agent Cards |
|---|---|---|---|---|---|
| Agent-native profile | **yes** | no | no | no | partial |
| Self-custody | **yes** | yes | yes | yes | no (TLS-anchored) |
| Runtime deps | **5** | ~30 (jsonld+) | Rust | 1-2 | none (built-in) |
| Spec + conformance | **yes** | partial | partial | no | partial |
| Lines of source | **~400** | ~thousands | ~tens of thousands | trivial | n/a |
| JSON-LD processing | **JCS, no RDFC** | RDFC | RDFC | n/a | none |
| Revocation in v0.1 | no (v0.2) | yes | yes | n/a | n/a |

**The design call:** `eddsa-jcs-2022` (JCS canonicalization) instead of `eddsa-rdfc-2022` (full RDF Dataset Canonicalization). JCS is RFC 8785 — deterministic JSON, ~50 LoC of dependency. RDFC needs the full `jsonld` library (runtime context fetching + a graph processor). For a profile this small with one signature suite, JCS is the right cut.

---

## Conformance

```bash
bun run conformance
```

Three vectors covering every (Cn) clause in [SPEC §6](./SPEC.md#6-conformance):

| Vector | Clause | What it proves |
|---|---|---|
| [`c1-valid.json`](./conformance/c1-valid.json) | **C1** | Round-trip: a valid capability VC issues + verifies clean |
| [`c2-mutated.json`](./conformance/c2-mutated.json) | **C2** | Tampering rejected: single-byte mutation in `capability.action` fails verification |
| [`c3-didweb.json`](./conformance/c3-didweb.json) | **C3** | `did:web` chain: principal at `did:web:example.com` signs a VC for an agent at `did:web:example.com:agents:alice`, verifier resolves both DIDs and validates the signature |

Vectors are deterministic — same seed material, same Ed25519 signature byte-for-byte. Any implementation can run them and compare.

To re-generate (e.g. when adding new vectors):

```bash
bun run conformance/_generate-c1.ts > conformance/c1-valid.json
bun run conformance/_generate-c2.ts > conformance/c2-mutated.json
bun run conformance/_generate-c3.ts
```

---

## Architecture

- **Runtime:** [Bun](https://bun.sh) — TypeScript native, single binary, fast.
- **Crypto:** [`@noble/ed25519`](https://github.com/paulmillr/noble-ed25519), [`@noble/hashes`](https://github.com/paulmillr/noble-hashes) — audited, zero-dep, pure JS.
- **Canonicalization:** [`canonicalize`](https://github.com/erdtman/canonicalize) — RFC 8785 JCS.
- **DID encoding:** [`multiformats`](https://github.com/multiformats/js-multiformats) — multibase + multicodec.
- **Schema:** [`ajv`](https://github.com/ajv-validator/ajv) — JSON Schema 2020-12.
- **Test runner:** `bun test` (built-in).

Five runtime dependencies. Every file under 200 lines. No HTTP server, no JSON-LD processor, no ORM, no framework.

```
agent-id/
├── src/                # 7 files, ~400 LOC
│   ├── index.ts         # public API barrel
│   ├── types.ts         # all shared TypeScript types
│   ├── keys.ts          # Ed25519 + did:key codec
│   ├── jcs.ts           # canonicalization + hash
│   ├── vc.ts            # issue() + verify()
│   ├── schema.ts        # ajv wrapper
│   └── resolve.ts       # did:key (offline) + did:web (fetch)
├── schema/             # JSON Schema deliverable
├── context/            # JSON-LD context deliverable
├── conformance/        # vectors + runner
├── examples/           # demo
├── tests/              # 56 tests, 9 files
└── SPEC.md             # v1.0 normative spec
```

---

## Roadmap

### v0.2 (deferred from v0.1)

- HTTP server endpoints (`/credentials/issue`, `/credentials/verify`, `/resolve/{did}`)
- VC Status List 2021 revocation
- `did:peer` support
- Issuer override sugar (currently library-level only)

### Non-goals (permanent)

- A new DID method — reuse `did:key` and `did:web`.
- A blockchain.
- A wallet UI.
- A generic VC framework — use `@digitalbazaar/vc` if that's what you need.
- Tool / function descriptions — that's [MCP](https://modelcontextprotocol.io/)'s job.

---

## Family

`agent-id` is the foundation in an 8-repo family of agent-native primitives. Each solves one problem absurdly well, composes mature primitives, and has its own SPEC + conformance suite.

| Repo | What it does | Depends on `agent-id` for |
|---|---|---|
| `agent-phone` | sync RPC over a self-custody session | session handshake, peer identity |
| `agent-toolprint` | signed tool-call receipts (DSSE-like) | author signatures |
| `agent-cid` | content-addressed artifact manifests | producer signatures |
| `agent-ask` | self-hostable Q&A protocol for agents | signer identity |
| `agent-pay` | Lightning + L402 invoices for agents | invoice signer |
| `agent-scroll` | canonical byte-deterministic transcripts | (independent) |
| `agent-rerun` | reproducibility bundles | (independent) |

---

## Status

**v0.1.0 — shipped.** [SPEC.md](./SPEC.md) at v1.0. Reference library frozen. CI green on every push.

[CHANGELOG](./CHANGELOG.md) tracks each release. [SCOPE.md](./SCOPE.md) records what was deliberately included or cut for this version, with reasoning.

---

## Contributing

Issues and PRs welcome. Three things to know before opening one:

1. **Conformance is the product.** Any change to `verify()`'s observable behavior must come with a conformance vector that pins the new behavior.
2. **Five-dep budget.** Adding a runtime dep needs a one-paragraph justification in the PR description. The bar is high — see [SCOPE.md](./SCOPE.md) for what got cut.
3. **No file over 200 lines** unless there's a structural reason.

Run `bun test && bun run conformance && bun run lint && bun run typecheck` before pushing.

---

## License

Apache 2.0 — see [LICENSE](./LICENSE).

---

## Acknowledgements

`agent-id` is a thin profile composing audited primitives. The hard work was already done by:

- [W3C VC Working Group](https://www.w3.org/2017/vc/WG/) — VC Data Model + Data Integrity
- [W3C DID Working Group](https://www.w3.org/2019/did-wg/) — DID Core
- [Paul Miller](https://paulmillr.com) — `@noble/ed25519`, `@noble/hashes`
- [Anders Rundgren](https://github.com/erdtman) — `canonicalize` (RFC 8785)
- [Protocol Labs](https://github.com/multiformats) — `multiformats`
- [Ajv contributors](https://github.com/ajv-validator/ajv) — JSON Schema validation
