import { describe, expect, test } from 'bun:test'
import { didKeyFromPublicKey, generateKeyPair } from '../src/keys.ts'
import { resolve } from '../src/resolve.ts'
import type { DidDocument } from '../src/types.ts'

describe('resolve did:key', () => {
  test('synthesises a DID document with one verificationMethod', async () => {
    const kp = await generateKeyPair()
    const did = didKeyFromPublicKey(kp.publicKey)
    const doc = await resolve(did)
    expect(doc.id).toBe(did)
    expect(doc.verificationMethod).toHaveLength(1)
    // biome-ignore lint/style/noNonNullAssertion: test-code assertion after toHaveLength(1)
    const vm = doc.verificationMethod[0]!
    expect(vm.id).toBe(`${did}#${did.slice('did:key:'.length)}`)
    expect(vm.type).toBe('Multikey')
    expect(vm.controller).toBe(did)
    expect(vm.publicKeyMultibase).toBe(did.slice('did:key:'.length))
  })

  test('lists the key under assertionMethod and authentication', async () => {
    const kp = await generateKeyPair()
    const did = didKeyFromPublicKey(kp.publicKey)
    const doc = await resolve(did)
    const vmId = doc.verificationMethod[0]?.id
    expect(doc.assertionMethod).toContain(vmId)
    expect(doc.authentication).toContain(vmId)
  })

  test('throws on unknown DID methods', async () => {
    await expect(resolve('did:example:unknown')).rejects.toThrow(/unsupported/i)
  })
})

describe('resolve did:web', () => {
  const didDoc: DidDocument = {
    '@context': 'https://www.w3.org/ns/did/v1',
    id: 'did:web:example.com',
    verificationMethod: [
      {
        id: 'did:web:example.com#key-1',
        type: 'Multikey',
        controller: 'did:web:example.com',
        publicKeyMultibase: 'z6MkmockKey',
      },
    ],
    assertionMethod: ['did:web:example.com#key-1'],
  }

  test('fetches from https://<host>/.well-known/did.json for bare host', async () => {
    let requested: string | undefined
    const f = async (url: string) => {
      requested = url
      return new Response(JSON.stringify(didDoc), {
        headers: { 'content-type': 'application/json' },
      })
    }
    const doc = await resolve('did:web:example.com', { fetch: f as typeof fetch })
    expect(requested).toBe('https://example.com/.well-known/did.json')
    expect(doc.id).toBe('did:web:example.com')
  })

  test('fetches from https://<host>/<path>/did.json for path DID', async () => {
    let requested: string | undefined
    const f = async (url: string) => {
      requested = url
      return new Response(JSON.stringify({ ...didDoc, id: 'did:web:example.com:users:alice' }), {
        headers: { 'content-type': 'application/json' },
      })
    }
    const doc = await resolve('did:web:example.com:users:alice', { fetch: f as typeof fetch })
    expect(requested).toBe('https://example.com/users/alice/did.json')
    expect(doc.id).toBe('did:web:example.com:users:alice')
  })

  test('rejects non-200 responses', async () => {
    const f = async () => new Response('not found', { status: 404 })
    await expect(
      resolve('did:web:example.com', { fetch: f as unknown as typeof fetch }),
    ).rejects.toThrow(/404|not found/i)
  })

  test('rejects document whose id does not match the DID', async () => {
    const f = async () =>
      new Response(JSON.stringify({ ...didDoc, id: 'did:web:other.com' }), {
        headers: { 'content-type': 'application/json' },
      })
    await expect(
      resolve('did:web:example.com', { fetch: f as unknown as typeof fetch }),
    ).rejects.toThrow(/id mismatch|does not match/i)
  })
})
