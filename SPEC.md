# agent-id — v1.0 specification

**Status:** stable. Reference implementation at version 0.1.0.

## Abstract

`agent-id` defines a self-custody identity profile for AI agents. It pins down (1) which DID methods to use, (2) a JSON-LD Verifiable Credential context for agent capabilities, and (3) the resolution and verification procedures. It does not invent new cryptography.

## 1. Terminology

- **Agent** — an autonomous software entity that consumes, produces, or routes tokens on behalf of a **Principal**.
- **Principal** — the human, organization, or parent-agent that controls the keys of an agent.
- **DID** — a W3C Decentralized Identifier ([did-core](https://www.w3.org/TR/did-core/)).
- **Capability VC** — a Verifiable Credential whose `type` includes `AgentCapabilityCredential` and whose `credentialSubject` declares what the agent can do.

## 2. DID method recommendations

Implementations MUST support at least one of:

- **`did:key`** — for ephemeral or throwaway agents. No infrastructure.
- **`did:web`** — for org-hosted agents. Served at `https://<host>/.well-known/did.json`.

Implementations MAY support:

- **`did:peer`** — for direct pairwise agent-to-agent identity without a registry.

`did:key` uses Ed25519 as the default signature suite. `did:web` MUST serve an Ed25519 verification method.

## 3. Capability VC

A Capability VC is a W3C VC 2.0 document. The `@context` MUST include:

```
https://www.w3.org/ns/credentials/v2
https://agent-id.dev/context/v1
```

`credentialSubject` MUST be an object with:

```
{
  "id": "<agent DID>",
  "type": "Agent",
  "principal": "<principal DID>",
  "model": {
    "vendor": "...",
    "id": "...",
    "fingerprint?": "..."
  },
  "capability": {
    "action": "...",          // e.g. "answer", "schedule", "settle-payment"
    "scope?": ["..."],
    "sla?": {
      "latency_ms_p95?": 2000,
      "availability?": 0.99,
      "token_budget?": 10000
    }
  },
  "valid_from": "<RFC 3339>",
  "valid_until?": "<RFC 3339>"
}
```

Conforming v1.0 implementations MUST use the `eddsa-jcs-2022` Data Integrity cryptosuite ([VC Data Integrity — eddsa-jcs-2022](https://www.w3.org/TR/vc-di-eddsa/#eddsa-jcs-2022)). The VC is signed by the **Principal**'s key. An agent presenting a VC is MUST also sign its own sessions with its own Ed25519 key, which MUST appear as a verification method in the agent DID Document.

## 4. Operations

> The operations below are described as HTTP endpoints for normative clarity. Conforming implementations MAY expose them as a library; the reference implementation does (`issue`, `verify`, `resolve`). An HTTP binding is RECOMMENDED but not REQUIRED for v1.0.

### 4.1 Issue

```
POST /credentials/issue
Content-Type: application/json

{ "agent": "<did>", "capability": { ... }, "valid_until?": "<RFC3339>" }
```

Returns a signed VC.

### 4.2 Verify

```
POST /credentials/verify
Content-Type: application/vc+ld+json

<VC document>
```

Returns `{ "verified": true|false, "errors": [...] }`. Verification MUST check:

1. Signature is valid under the principal's DID.
2. JSON Schema matches `https://agent-id.dev/schema/v1/capability.json`.
3. `valid_from <= now <= valid_until` (if present).
4. Agent DID resolves and lists the session signing key.

### 4.3 Resolve

```
GET /resolve/{did}
```

Returns `{ did_document, capability_vcs[] }`. For `did:web`, implementations MAY serve this directly via `/.well-known/agent-id.json`.

## 5. Security considerations

- **Principal key compromise** revokes all capability VCs issued by that principal. Revocation MAY be achieved by a status-list credential ([VC Status List 2021](https://www.w3.org/TR/vc-status-list/)).
- **Agent key rotation** is allowed; rotations MUST be announced via an updated DID Document or a superseding VC.
- **Replay attacks** on sessions are the responsibility of the transport (`agent-phone`, HTTPS, etc.).
- **Clock skew**: implementations SHOULD allow ±5 minutes on `valid_from` / `valid_until`.

## 6. Conformance

A conforming implementation MUST:

- (C1) Round-trip issue → verify a minimal Capability VC with `model`, `principal`, `action`.
- (C2) Reject a VC where `capability.action` has been mutated by a single byte.
- (C3) Resolve a `did:web` agent, validate the returned document against the JSON Schema, and verify the VC signature chain back to the principal DID.

Test vectors live in `conformance/`.

## 7. References

- [W3C DID Core](https://www.w3.org/TR/did-core/)
- [W3C VC Data Model 2.0](https://www.w3.org/TR/vc-data-model-2.0/)
- [VC Data Integrity 1.0](https://www.w3.org/TR/vc-data-integrity/)
- [did:key spec](https://w3c-ccg.github.io/did-method-key/)
- [did:web spec](https://w3c-ccg.github.io/did-method-web/)
