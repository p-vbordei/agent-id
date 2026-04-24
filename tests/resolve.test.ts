import { describe, expect, test } from 'bun:test'
import { didKeyFromPublicKey, generateKeyPair } from '../src/keys.ts'
import { resolve } from '../src/resolve.ts'

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
