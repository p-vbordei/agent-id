import { describe, expect, test } from 'bun:test'
import {
  didKeyFromPublicKey,
  generateKeyPair,
  publicKeyFromDidKey,
  verificationMethodId,
} from '../src/keys.ts'

describe('keys', () => {
  test('generateKeyPair returns 32-byte keys', async () => {
    const kp = await generateKeyPair()
    expect(kp.publicKey).toBeInstanceOf(Uint8Array)
    expect(kp.privateKey).toBeInstanceOf(Uint8Array)
    expect(kp.publicKey.length).toBe(32)
    expect(kp.privateKey.length).toBe(32)
  })

  test('two generated keys are distinct', async () => {
    const a = await generateKeyPair()
    const b = await generateKeyPair()
    expect(Buffer.from(a.privateKey).equals(Buffer.from(b.privateKey))).toBe(false)
  })

  test('didKeyFromPublicKey produces did:key:z6Mk... for Ed25519', async () => {
    const kp = await generateKeyPair()
    const did = didKeyFromPublicKey(kp.publicKey)
    expect(did.startsWith('did:key:z6Mk')).toBe(true)
    expect(did.length).toBeGreaterThan(50)
  })

  test('publicKeyFromDidKey roundtrips', async () => {
    const kp = await generateKeyPair()
    const did = didKeyFromPublicKey(kp.publicKey)
    const recovered = publicKeyFromDidKey(did)
    expect(Buffer.from(recovered).equals(Buffer.from(kp.publicKey))).toBe(true)
  })

  test('publicKeyFromDidKey rejects non-Ed25519 did:key', () => {
    // did:key for secp256k1 uses 0xe7 0x01 prefix, not 0xed 0x01
    const bogus = 'did:key:zQ3shokFTS3brHcDQrn82RUDfCZESWL1ZdCEJwekUDPQiYBme'
    expect(() => publicKeyFromDidKey(bogus)).toThrow(/unsupported key type|multicodec/i)
  })

  test('publicKeyFromDidKey rejects malformed strings', () => {
    expect(() => publicKeyFromDidKey('not-a-did')).toThrow()
    expect(() => publicKeyFromDidKey('did:web:example.com')).toThrow()
  })

  test('verificationMethodId returns did#fragment', async () => {
    const kp = await generateKeyPair()
    const did = didKeyFromPublicKey(kp.publicKey)
    const vmId = verificationMethodId(did)
    expect(vmId).toBe(`${did}#${did.slice('did:key:'.length)}`)
  })

  test('verificationMethodId passes through fully-formed non-did:key VMIDs', () => {
    expect(verificationMethodId('did:web:example.com#key-1')).toBe('did:web:example.com#key-1')
  })

  test('verificationMethodId throws for non-did:key DIDs without a fragment', () => {
    expect(() => verificationMethodId('did:web:example.com')).toThrow(/cannot derive fragment/i)
  })
})
