import { describe, expect, test } from 'bun:test'
import { publicKeyFromDidKey } from '../src/keys.ts'
import { resolve } from '../src/resolve.ts'
import type { VerifiableCredential } from '../src/types.ts'
import { verify } from '../src/vc.ts'

describe('verify — null/undefined guards', () => {
  test('verify(null) returns errors instead of throwing', async () => {
    const res = await verify(null as unknown as VerifiableCredential)
    expect(res.verified).toBe(false)
    expect(res.errors.some((e) => /must be an object|null/i.test(e))).toBe(true)
  })

  test('verify(undefined) returns errors instead of throwing', async () => {
    const res = await verify(undefined as unknown as VerifiableCredential)
    expect(res.verified).toBe(false)
    expect(res.errors.some((e) => /must be an object|undefined/i.test(e))).toBe(true)
  })

  test('verify on a non-object (string) returns errors instead of throwing', async () => {
    const res = await verify('not a vc' as unknown as VerifiableCredential)
    expect(res.verified).toBe(false)
    expect(res.errors.some((e) => /must be an object/i.test(e))).toBe(true)
  })
})

describe('resolve — did:web malformed inputs', () => {
  test('did:web with trailing colon rejects', async () => {
    await expect(resolve('did:web:example.com:')).rejects.toThrow(/empty segment|invalid did:web/i)
  })

  test('did:web with empty segment in middle rejects', async () => {
    await expect(resolve('did:web:example.com::agents:alice')).rejects.toThrow(
      /empty segment|invalid did:web/i,
    )
  })
})

describe('keys — short multibase produces a clean error', () => {
  test('did:key:z produces a clean message (no "undefined" tokens)', () => {
    expect(() => publicKeyFromDidKey('did:key:z')).toThrow(
      /multibase too short|insufficient bytes/i,
    )
  })

  test('did:key:z error message contains no literal "undefined" string', () => {
    try {
      publicKeyFromDidKey('did:key:z')
    } catch (err) {
      expect((err as Error).message).not.toMatch(/undefined/i)
    }
  })
})
