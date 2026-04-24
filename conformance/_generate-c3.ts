// Run once: bun run conformance/_generate-c3.ts
// Emits conformance/fixtures/did-web-example.json (principal DID doc),
//       conformance/fixtures/did-web-agent.json (agent DID doc),
//       conformance/c3-didweb.json (vector with inline fixtures for the runner).
import { mkdirSync, writeFileSync } from 'node:fs'
import * as ed from '@noble/ed25519'
import { base58btc } from 'multiformats/bases/base58'
import type { CredentialSubject, DidDocument } from '../src/types.ts'
import { issue } from '../src/vc.ts'

const ED25519_MULTICODEC = Uint8Array.from([0xed, 0x01])

function multibaseKey(pub: Uint8Array): string {
  const prefixed = new Uint8Array(ED25519_MULTICODEC.length + pub.length)
  prefixed.set(ED25519_MULTICODEC, 0)
  prefixed.set(pub, ED25519_MULTICODEC.length)
  return base58btc.encode(prefixed)
}

const principalPriv = new Uint8Array(32).fill(3)
const principalPub = await ed.getPublicKeyAsync(principalPriv)
const agentPriv = new Uint8Array(32).fill(4)
const agentPub = await ed.getPublicKeyAsync(agentPriv)

const principalDid = 'did:web:example.com'
const agentDid = 'did:web:example.com:agents:alice'
const principalVmId = `${principalDid}#key-1`
const agentVmId = `${agentDid}#key-1`

const principalDoc: DidDocument = {
  '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/multikey/v1'],
  id: principalDid,
  verificationMethod: [
    {
      id: principalVmId,
      type: 'Multikey',
      controller: principalDid,
      publicKeyMultibase: multibaseKey(principalPub),
    },
  ],
  assertionMethod: [principalVmId],
}

const agentDoc: DidDocument = {
  '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/multikey/v1'],
  id: agentDid,
  verificationMethod: [
    {
      id: agentVmId,
      type: 'Multikey',
      controller: agentDid,
      publicKeyMultibase: multibaseKey(agentPub),
    },
  ],
  assertionMethod: [agentVmId],
  authentication: [agentVmId],
}

const subject: CredentialSubject = {
  id: agentDid,
  type: 'Agent',
  principal: principalDid,
  model: { vendor: 'anthropic', id: 'claude-opus-4-7' },
  capability: { action: 'answer' },
  valid_from: '2026-04-24T00:00:00.000Z',
}

// Sign: use issue()'s optional override fields for issuer + verificationMethod.
// Task 26 adds these overrides. Until then, we hand-roll the VC (see below).
// For Task 15, we write a manualIssue helper here since `issue()` currently
// only derives issuer = did:key of principalPub — which wouldn't match
// did:web:example.com.

const { jcsHash } = await import('../src/jcs.ts')
const CONTEXT_V2 = 'https://www.w3.org/ns/credentials/v2'
const CONTEXT_AGENT_V1 = 'https://agent-id.dev/context/v1'

const unsigned = {
  '@context': [CONTEXT_V2, CONTEXT_AGENT_V1],
  type: ['VerifiableCredential', 'AgentCapabilityCredential'],
  issuer: principalDid,
  validFrom: subject.valid_from,
  credentialSubject: subject,
}
const proofConfig = {
  '@context': unsigned['@context'],
  type: 'DataIntegrityProof' as const,
  cryptosuite: 'eddsa-jcs-2022' as const,
  created: subject.valid_from,
  verificationMethod: principalVmId,
  proofPurpose: 'assertionMethod' as const,
}
const hashData = new Uint8Array(64)
hashData.set(jcsHash(proofConfig), 0)
hashData.set(jcsHash(unsigned), 32)
const signature = await ed.signAsync(hashData, principalPriv)
const { '@context': _c, ...proofWithoutContext } = proofConfig
const vc = {
  ...unsigned,
  proof: { ...proofWithoutContext, proofValue: base58btc.encode(signature) },
}

mkdirSync(new URL('./fixtures', import.meta.url).pathname, { recursive: true })

writeFileSync(
  new URL('./fixtures/did-web-example.json', import.meta.url).pathname,
  JSON.stringify(principalDoc, null, 2),
)
writeFileSync(
  new URL('./fixtures/did-web-agent.json', import.meta.url).pathname,
  JSON.stringify(agentDoc, null, 2),
)

const vector = {
  name: 'did:web principal signs VC for did:web agent',
  description:
    'Principal did:web:example.com signs a VC for did:web:example.com:agents:alice. Verifier resolves both DIDs, finds the verificationMethod, validates signature and schema.',
  clause: 'C3',
  now: '2026-04-24T12:00:00.000Z',
  didWebFixtures: {
    'https://example.com/.well-known/did.json': principalDoc,
    'https://example.com/agents/alice/did.json': agentDoc,
  },
  vc,
  expect: { verified: true },
}

writeFileSync(
  new URL('./c3-didweb.json', import.meta.url).pathname,
  JSON.stringify(vector, null, 2),
)
console.error('wrote conformance/c3-didweb.json and fixtures')
// Suppress the unused-var lint warning on issue import (we'd like to use issue()
// but the issuer/vmId override isn't in IssueOptions yet — Task 26).
void issue
