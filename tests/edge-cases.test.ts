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

describe('resolve did:web — timeout and size limits', () => {
  test('aborts slow fetch after fetchTimeoutMs', async () => {
    // Fetch never resolves on its own; only the abort signal can reject it.
    const slowFetch = ((_url: RequestInfo | URL, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
      })) as unknown as typeof fetch

    await expect(
      resolve('did:web:slow.example', { fetch: slowFetch, fetchTimeoutMs: 50 }),
    ).rejects.toThrow(/timed out|timeout/i)
  })

  test('rejects response with Content-Length above maxResponseBytes', async () => {
    const huge = (async () =>
      new Response('{}', {
        headers: { 'content-length': '99999999', 'content-type': 'application/json' },
      })) as unknown as typeof fetch

    await expect(
      resolve('did:web:huge.example', { fetch: huge, maxResponseBytes: 1024 }),
    ).rejects.toThrow(/too large|size limit|exceeds/i)
  })

  test('accepts a normal small response with default options', async () => {
    const ok = (async () =>
      new Response(JSON.stringify({ id: 'did:web:ok.example', verificationMethod: [] }), {
        headers: { 'content-type': 'application/json' },
      })) as unknown as typeof fetch

    const doc = await resolve('did:web:ok.example', { fetch: ok })
    expect(doc.id).toBe('did:web:ok.example')
  })

  test('accepts response when Content-Length is within limit', async () => {
    const small = (async () =>
      new Response(JSON.stringify({ id: 'did:web:ok.example', verificationMethod: [] }), {
        headers: { 'content-length': '60', 'content-type': 'application/json' },
      })) as unknown as typeof fetch

    const doc = await resolve('did:web:ok.example', { fetch: small, maxResponseBytes: 1024 })
    expect(doc.id).toBe('did:web:ok.example')
  })
})
