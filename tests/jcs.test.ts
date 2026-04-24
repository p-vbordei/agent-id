import { describe, expect, test } from 'bun:test'
import { canonicalJSON, jcsHash } from '../src/jcs.ts'

describe('jcs', () => {
  test('canonicalJSON sorts keys', () => {
    const a = canonicalJSON({ b: 1, a: 2 })
    const b = canonicalJSON({ a: 2, b: 1 })
    expect(new TextDecoder().decode(a)).toBe('{"a":2,"b":1}')
    expect(new TextDecoder().decode(b)).toBe('{"a":2,"b":1}')
  })

  test('canonicalJSON sorts nested keys', () => {
    const out = canonicalJSON({ x: { b: 1, a: 2 }, a: 1 })
    expect(new TextDecoder().decode(out)).toBe('{"a":1,"x":{"a":2,"b":1}}')
  })

  test('canonicalJSON preserves array order', () => {
    const out = canonicalJSON([3, 1, 2])
    expect(new TextDecoder().decode(out)).toBe('[3,1,2]')
  })

  test('jcsHash produces 32 bytes', () => {
    const h = jcsHash({ hello: 'world' })
    expect(h.length).toBe(32)
  })

  test('jcsHash is key-order-invariant', () => {
    const h1 = jcsHash({ a: 1, b: 2 })
    const h2 = jcsHash({ b: 2, a: 1 })
    expect(Buffer.from(h1).equals(Buffer.from(h2))).toBe(true)
  })

  test('jcsHash differs for different values', () => {
    const h1 = jcsHash({ a: 1 })
    const h2 = jcsHash({ a: 2 })
    expect(Buffer.from(h1).equals(Buffer.from(h2))).toBe(false)
  })
})
