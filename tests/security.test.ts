import { describe, expect, test } from 'bun:test'
import { didKeyFromPublicKey, generateKeyPair } from '../src/keys.ts'
import type { CredentialSubject, DidDocument } from '../src/types.ts'
import { issue, verify } from '../src/vc.ts'

async function basicVc() {
  const principal = await generateKeyPair()
  const agent = await generateKeyPair()
  const subject: CredentialSubject = {
    id: didKeyFromPublicKey(agent.publicKey),
    type: 'Agent',
    principal: didKeyFromPublicKey(principal.publicKey),
    model: { vendor: 'a', id: 'b' },
    capability: { action: 'answer' },
    valid_from: '2026-04-24T00:00:00Z',
  }
  return { principal, agent, vc: await issue({ principal, subject }) }
}

describe('security — tampering', () => {
  test('flipping one byte of proofValue rejects', async () => {
    const { vc } = await basicVc()
    const proofValue = vc.proof.proofValue
    const flipped =
      proofValue.slice(0, -1) + (proofValue[proofValue.length - 1] === 'a' ? 'b' : 'a')
    const mutated = { ...vc, proof: { ...vc.proof, proofValue: flipped } }
    const res = await verify(mutated)
    expect(res.verified).toBe(false)
  })

  test('swapping proof.verificationMethod rejects', async () => {
    const { vc } = await basicVc()
    const other = await generateKeyPair()
    const otherDid = didKeyFromPublicKey(other.publicKey)
    const mutated = {
      ...vc,
      proof: {
        ...vc.proof,
        verificationMethod: `${otherDid}#${otherDid.slice('did:key:'.length)}`,
      },
    }
    const res = await verify(mutated)
    expect(res.verified).toBe(false)
  })

  test('mutating credentialSubject.capability.action rejects', async () => {
    const { vc } = await basicVc()
    const mutated = {
      ...vc,
      credentialSubject: {
        ...vc.credentialSubject,
        capability: { action: 'settle-payment' },
      },
    }
    const res = await verify(mutated)
    expect(res.verified).toBe(false)
  })
})

describe('security — agent key rotation', () => {
  test('agent rotating its own key does not invalidate a principal-signed VC', async () => {
    const principalKp = await generateKeyPair()
    const principalDid = didKeyFromPublicKey(principalKp.publicKey)
    const agentDid = 'did:web:example.com:agents:alice'

    // Use a REAL Ed25519 key for the rotated doc (so multibase decode succeeds).
    const freshKp = await generateKeyPair()
    const rotatedDoc: DidDocument = {
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: agentDid,
      verificationMethod: [
        {
          id: `${agentDid}#key-2`,
          type: 'Multikey',
          controller: agentDid,
          publicKeyMultibase: didKeyFromPublicKey(freshKp.publicKey).slice('did:key:'.length),
        },
      ],
    }

    const subject: CredentialSubject = {
      id: agentDid,
      type: 'Agent',
      principal: principalDid,
      model: { vendor: 'a', id: 'b' },
      capability: { action: 'answer' },
      valid_from: '2026-04-24T00:00:00Z',
    }
    const vc = await issue({ principal: principalKp, subject })

    const stub = (async (url: RequestInfo | URL) => {
      if (url === 'https://example.com/agents/alice/did.json') {
        return new Response(JSON.stringify(rotatedDoc), {
          headers: { 'content-type': 'application/json' },
        })
      }
      return new Response('', { status: 404 })
    }) as unknown as typeof fetch

    const res = await verify(vc, { fetch: stub })
    if (!res.verified) console.error('errors:', res.errors)
    expect(res.verified).toBe(true)
  })

  test('agent DID that lists zero verificationMethods rejects', async () => {
    const principalKp = await generateKeyPair()
    const principalDid = didKeyFromPublicKey(principalKp.publicKey)
    const agentDid = 'did:web:example.com:agents:empty'

    const subject: CredentialSubject = {
      id: agentDid,
      type: 'Agent',
      principal: principalDid,
      model: { vendor: 'a', id: 'b' },
      capability: { action: 'answer' },
      valid_from: '2026-04-24T00:00:00Z',
    }
    const vc = await issue({ principal: principalKp, subject })

    const emptyDoc: DidDocument = {
      '@context': 'https://www.w3.org/ns/did/v1',
      id: agentDid,
      verificationMethod: [],
    }
    const stub = (async () =>
      new Response(JSON.stringify(emptyDoc), {
        headers: { 'content-type': 'application/json' },
      })) as unknown as typeof fetch

    const res = await verify(vc, { fetch: stub })
    expect(res.verified).toBe(false)
    expect(res.errors.some((e) => /no verificationMethod/i.test(e))).toBe(true)
  })
})

describe('security — out-of-scope boundaries (v0.1)', () => {
  test('no revoke() export exists — revocation is v0.2', async () => {
    const mod = await import('../src/index.ts')
    expect((mod as Record<string, unknown>).revoke).toBeUndefined()
  })

  test('verify() is stateless — no replay cache, no nonce argument', async () => {
    const principal = await generateKeyPair()
    const agent = await generateKeyPair()
    const subject: CredentialSubject = {
      id: didKeyFromPublicKey(agent.publicKey),
      type: 'Agent',
      principal: didKeyFromPublicKey(principal.publicKey),
      model: { vendor: 'a', id: 'b' },
      capability: { action: 'answer' },
      valid_from: '2026-04-24T00:00:00Z',
    }
    const vc = await issue({ principal, subject })
    const r1 = await verify(vc)
    const r2 = await verify(vc)
    expect(r1.verified).toBe(true)
    expect(r2.verified).toBe(true)
  })
})
