# agent-id

> Self-custody DID method + capability Verifiable Credential profile for AI agents.

## What

`agent-id` is a small, machine-first identity profile for AI agents. It defines:

- a canonical way for an agent to present its identity (DID + public key, self-custody)
- a Verifiable Credential schema that expresses **capability** ("this agent can perform action X, using model M, controlled by principal P, with SLA S")
- a reference resolver + verifier implementation

Every other `agent-*` repo in this family references `agent-id` for authorship, signing, and trust.

## Status

**0.1.0 — shipped.** [SPEC.md](./SPEC.md) v1.0, reference library in `src/`, conformance vectors in `conformance/`.

## Quickstart

```bash
git clone <repo>
cd agent-id
bun install
bun run examples/demo.ts
```

A principal and an agent exchange a signed Capability VC — signature verified, schema validated, DIDs resolved. The full library surface is three functions (`issue`, `verify`, `resolve`):

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
    capability: { action: 'answer' },
    valid_from: new Date().toISOString(),
  },
})

const { verified } = await verify(vc) // true
```

### Conformance

```bash
bun run conformance
```

Three vectors: C1 (valid VC round-trip), C2 (single-byte mutation rejected), C3 (did:web signature chain). Any implementation passes by running the same vectors against its own verifier.

## The gap

The DID + VC primitives are mature (SpruceID SSI, DigitalBazaar VC-JS, `did-resolver`, Veramo). What's missing as of early 2026 is a **canonical capability profile for AI agents**: no agent-specific JSON-LD `@context`, no canonical schema fields for `model` / `principal` / `sla`, no conformance suite. The only attempt (`hazennik/asi`, Feb 2026) has zero stars and no capability VC schema.

Google A2A's signed Agent Cards depend on TLS-anchored identity. `agent-id` fills the self-custody gap.

## Scope

**In scope**

- JSON-LD `@context` for agent capability VCs
- JSON Schema for `capability` + `agent` + `principal` objects
- DID method recommendation (default: `did:key` for ephemeral agents, `did:web` for org-hosted)
- Reference TypeScript resolver + verifier
- Conformance test vectors

**Out of scope**

- A new DID method implementation (reuse `did:key` / `did:web`)
- A blockchain
- A wallet UI
- Tool descriptions (MCP owns that)
- HTTP server endpoints (library only in v0.1; deferred to v0.2)
- VC Status List revocation (deferred to v0.2)

## Dependencies and companions

- **Depends on:** nothing else in the family — this is a foundation.
- **Depended on by:** `agent-phone` (session handshake), `agent-toolprint` (author identity), `agent-cid` (producer), `agent-ask` (signer), `agent-pay` (invoice signer).

## Validation scoring

| Criterion | Score |
|---|---|
| Scope (1-3w solo) | 5 |
| Composes mature primitives | 5 |
| Standalone | 5 |
| Clear gap | 4 |
| Light deps | 5 |
| Testable | 5 |
| **Total** | **28/30** |

Verdict: **EASY**. Full validation in [`../research/validations/agent-id.md`](../research/validations/agent-id.md).

## Prior art

- **Foundations:** `spruceid/ssi`, `digitalbazaar/vc-js`, `did-method-key`, `did-resolver`, `veramo`.
- **W3C specs:** `did-core`, `vc-data-model` 2.0.
- **Agent-native attempts (none credible):** `hazennik/asi` (0★), `ai2ai-trust-framework` (0★), `2060-io/hologram-generic-ai-agent-vs`.

> **Note:** v0.1 ships as a library. The HTTP endpoints below are the *conceptual* operations from SPEC §4; the reference implementation exposes them as the functions `issue`, `verify`, and `resolve`. A server binding is DEFERRED-TO-V0.2.

## Implementation skeleton

```
POST /credentials/issue       # issue capability VC signed by principal
POST /credentials/verify      # verify envelope, signature, schema, revocation
GET  /.well-known/agent-id.json   # DID document + capability VC (did:web path)
GET  /resolve/{did}           # proxy resolver, normalized profile
```

**Dependencies:** `@digitalbazaar/vc`, `@digitalbazaar/ed25519-signature-2020`, `did-resolver` + `web-did-resolver`, `ajv`, `fastify`/`hono`.

**Repo sizing:** ~1.5k LOC spec + ~2k LOC TS ref impl + ~300 LOC test vectors.

## Conformance tests

1. Round-trip: issue → verify a capability VC with `model`, `principal`, `sla`
2. Reject VC with tampered `capability.action` field
3. Resolve `did:web` agent, validate returned document against JSON Schema, verify signature chain to principal DID

## License

Apache 2.0 — see [LICENSE](./LICENSE).

## Research

Landscape, scoring rationale, and alternatives: [`../research/`](../research/).
