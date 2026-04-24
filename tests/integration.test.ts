import { describe, expect, test } from 'bun:test'
import { didKeyFromPublicKey, generateKeyPair } from '../src/keys.ts'
import { resolve } from '../src/resolve.ts'
import type { CredentialSubject } from '../src/types.ts'
import { issue, verify } from '../src/vc.ts'

describe('vertical slice', () => {
  test('principal → issue → verify → accepted', async () => {
    const principal = await generateKeyPair()
    const agent = await generateKeyPair()
    const subject: CredentialSubject = {
      id: didKeyFromPublicKey(agent.publicKey),
      type: 'Agent',
      principal: didKeyFromPublicKey(principal.publicKey),
      model: { vendor: 'anthropic', id: 'claude-opus-4-7' },
      capability: { action: 'answer', sla: { latency_ms_p95: 2000 } },
      valid_from: new Date().toISOString(),
    }
    const vc = await issue({ principal, subject })
    const result = await verify(vc, { skipSchema: true, skipValidity: true, skipResolve: true })
    expect(result.verified).toBe(true)
    expect(result.errors).toEqual([])
  })
})

describe('verify with DID resolution', () => {
  test('end-to-end with did:key for issuer and agent', async () => {
    const principal = await generateKeyPair()
    const agent = await generateKeyPair()
    const subject: CredentialSubject = {
      id: didKeyFromPublicKey(agent.publicKey),
      type: 'Agent',
      principal: didKeyFromPublicKey(principal.publicKey),
      model: { vendor: 'a', id: 'b' },
      capability: { action: 'answer' },
      valid_from: new Date().toISOString(),
    }
    const vc = await issue({ principal, subject })
    // No skip flags — every phase (schema, validity, resolve, signature) runs.
    const res = await verify(vc)
    expect(res.verified).toBe(true)
    expect(res.errors).toEqual([])
  })

  test('rejects when issuer DID cannot be resolved', async () => {
    const principal = await generateKeyPair()
    const agent = await generateKeyPair()
    const subject: CredentialSubject = {
      id: didKeyFromPublicKey(agent.publicKey),
      type: 'Agent',
      principal: didKeyFromPublicKey(principal.publicKey),
      model: { vendor: 'a', id: 'b' },
      capability: { action: 'answer' },
      valid_from: new Date().toISOString(),
    }
    const vc = await issue({ principal, subject })
    // Mutate issuer to an unresolvable did:web host with injected failing fetch
    const mutated = { ...vc, issuer: 'did:web:nonexistent.example' }
    const res = await verify(mutated, {
      fetch: (async () => new Response('', { status: 404 })) as unknown as typeof fetch,
    })
    expect(res.verified).toBe(false)
  })

  test('rejects when agent DID does not resolve', async () => {
    const principal = await generateKeyPair()
    const subject: CredentialSubject = {
      id: 'did:web:nonexistent.example',
      type: 'Agent',
      principal: didKeyFromPublicKey(principal.publicKey),
      model: { vendor: 'a', id: 'b' },
      capability: { action: 'answer' },
      valid_from: new Date().toISOString(),
    }
    const vc = await issue({ principal, subject })
    const res = await verify(vc, {
      fetch: (async () => new Response('', { status: 404 })) as unknown as typeof fetch,
    })
    expect(res.verified).toBe(false)
    expect(res.errors.some((e) => /agent DID/i.test(e))).toBe(true)
  })
})
