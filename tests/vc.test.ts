import { describe, expect, test } from 'bun:test'
import { didKeyFromPublicKey, generateKeyPair } from '../src/keys.ts'
import type { CredentialSubject } from '../src/types.ts'
import { issue, verify } from '../src/vc.ts'

async function fixture() {
  const principal = await generateKeyPair()
  const agent = await generateKeyPair()
  const principalDid = didKeyFromPublicKey(principal.publicKey)
  const agentDid = didKeyFromPublicKey(agent.publicKey)
  const subject: CredentialSubject = {
    id: agentDid,
    type: 'Agent',
    principal: principalDid,
    model: { vendor: 'anthropic', id: 'claude-opus-4-7' },
    capability: { action: 'answer' },
    valid_from: '2026-04-24T00:00:00Z',
  }
  return { principal, principalDid, agent, agentDid, subject }
}

describe('issue', () => {
  test('produces a VC with the required context and type', async () => {
    const f = await fixture()
    const vc = await issue({ principal: f.principal, subject: f.subject })
    expect(vc['@context']).toEqual([
      'https://www.w3.org/ns/credentials/v2',
      'https://agent-id.dev/context/v1',
    ])
    expect(vc.type).toEqual(['VerifiableCredential', 'AgentCapabilityCredential'])
    expect(vc.issuer).toBe(f.principalDid)
    expect(vc.credentialSubject).toEqual(f.subject)
  })

  test('proof is DataIntegrityProof + eddsa-jcs-2022', async () => {
    const f = await fixture()
    const vc = await issue({ principal: f.principal, subject: f.subject })
    expect(vc.proof.type).toBe('DataIntegrityProof')
    expect(vc.proof.cryptosuite).toBe('eddsa-jcs-2022')
    expect(vc.proof.proofPurpose).toBe('assertionMethod')
    expect(vc.proof.verificationMethod.startsWith(f.principalDid)).toBe(true)
    expect(vc.proof.proofValue.startsWith('z')).toBe(true)
  })

  test('proofValue is a deterministic Ed25519 signature over canonical form', async () => {
    const f = await fixture()
    const vc1 = await issue({
      principal: f.principal,
      subject: f.subject,
      now: new Date('2026-04-24T00:00:00Z'),
    })
    const vc2 = await issue({
      principal: f.principal,
      subject: f.subject,
      now: new Date('2026-04-24T00:00:00Z'),
    })
    // Ed25519 is deterministic: same message + same key → same signature.
    expect(vc1.proof.proofValue).toBe(vc2.proof.proofValue)
  })

  test('validFrom defaults to now when absent', async () => {
    const f = await fixture()
    const vc = await issue({
      principal: f.principal,
      subject: f.subject,
      now: new Date('2026-04-24T00:00:00Z'),
    })
    expect(vc.validFrom).toBe('2026-04-24T00:00:00.000Z')
  })
})

describe('verify (signature only)', () => {
  test('verifies a freshly-issued VC', async () => {
    const f = await fixture()
    const vc = await issue({ principal: f.principal, subject: f.subject })
    const result = await verify(vc)
    expect(result.verified).toBe(true)
    expect(result.errors).toEqual([])
  })

  test('rejects a VC with a flipped proofValue byte', async () => {
    const f = await fixture()
    const vc = await issue({ principal: f.principal, subject: f.subject })
    const mutated = {
      ...vc,
      proof: { ...vc.proof, proofValue: flipLastChar(vc.proof.proofValue) },
    }
    const result = await verify(mutated)
    expect(result.verified).toBe(false)
    expect(result.errors.some((e) => /signature/i.test(e))).toBe(true)
  })

  test('rejects a VC with a tampered credentialSubject', async () => {
    const f = await fixture()
    const vc = await issue({ principal: f.principal, subject: f.subject })
    const mutated = {
      ...vc,
      credentialSubject: { ...vc.credentialSubject, capability: { action: 'settle-payment' } },
    }
    const result = await verify(mutated)
    expect(result.verified).toBe(false)
    expect(result.errors.some((e) => /signature/i.test(e))).toBe(true)
  })

  test('rejects a VC with a malformed proofValue (non-base58btc)', async () => {
    const f = await fixture()
    const vc = await issue({ principal: f.principal, subject: f.subject })
    const mutated = {
      ...vc,
      proof: { ...vc.proof, proofValue: 'z!@#not-base58' },
    }
    const result = await verify(mutated)
    expect(result.verified).toBe(false)
    expect(result.errors.some((e) => /signature check threw/i.test(e))).toBe(true)
  })
})

function flipLastChar(s: string): string {
  const last = s[s.length - 1]
  const swapped = last === 'a' ? 'b' : 'a'
  return s.slice(0, -1) + swapped
}
