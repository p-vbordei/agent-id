# agent-id

> Self-custody DID method + capability Verifiable Credential profile for AI agents.

## What

`agent-id` is a small, machine-first identity profile for AI agents. It defines:

- a canonical way for an agent to present its identity (DID + public key, self-custody)
- a Verifiable Credential schema that expresses **capability** ("this agent can perform action X, using model M, controlled by principal P, with SLA S")
- a reference resolver + verifier implementation

Every other `agent-*` repo in this family references `agent-id` for authorship, signing, and trust.

## Status

**0.0 — design phase.** Draft spec in [SPEC.md](./SPEC.md). No code yet.

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
