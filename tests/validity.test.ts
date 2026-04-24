import { describe, expect, test } from 'bun:test'
import { didKeyFromPublicKey, generateKeyPair } from '../src/keys.ts'
import type { CredentialSubject } from '../src/types.ts'
import { issue, verify } from '../src/vc.ts'

async function issueWithWindow(validFrom: string, validUntil?: string) {
  const principal = await generateKeyPair()
  const agent = await generateKeyPair()
  const subject: CredentialSubject = {
    id: didKeyFromPublicKey(agent.publicKey),
    type: 'Agent',
    principal: didKeyFromPublicKey(principal.publicKey),
    model: { vendor: 'x', id: 'y' },
    capability: { action: 'answer' },
    valid_from: validFrom,
    ...(validUntil ? { valid_until: validUntil } : {}),
  }
  return issue({ principal, subject, validFrom, ...(validUntil ? { validUntil } : {}) })
}

const base = { skipSchema: true, skipResolve: true }

describe('validity window', () => {
  test('accepts VC when now is inside window', async () => {
    const vc = await issueWithWindow('2026-04-24T00:00:00Z', '2026-04-25T00:00:00Z')
    const res = await verify(vc, { ...base, now: new Date('2026-04-24T12:00:00Z') })
    expect(res.verified).toBe(true)
  })

  test('rejects VC when now is before validFrom by more than 5 min', async () => {
    const vc = await issueWithWindow('2026-04-24T12:00:00Z')
    const res = await verify(vc, { ...base, now: new Date('2026-04-24T11:54:00Z') })
    expect(res.verified).toBe(false)
    expect(res.errors.join(' ')).toMatch(/not yet valid|validFrom/i)
  })

  test('accepts VC when now is within 5-min tolerance before validFrom', async () => {
    const vc = await issueWithWindow('2026-04-24T12:00:00Z')
    const res = await verify(vc, { ...base, now: new Date('2026-04-24T11:56:00Z') })
    expect(res.verified).toBe(true)
  })

  test('rejects VC when now is after validUntil by more than 5 min', async () => {
    const vc = await issueWithWindow('2026-04-24T00:00:00Z', '2026-04-24T12:00:00Z')
    const res = await verify(vc, { ...base, now: new Date('2026-04-24T12:06:00Z') })
    expect(res.verified).toBe(false)
    expect(res.errors.join(' ')).toMatch(/expired|validUntil/i)
  })

  test('accepts VC when now is within 5-min tolerance after validUntil', async () => {
    const vc = await issueWithWindow('2026-04-24T00:00:00Z', '2026-04-24T12:00:00Z')
    const res = await verify(vc, { ...base, now: new Date('2026-04-24T12:04:00Z') })
    expect(res.verified).toBe(true)
  })

  test('custom skewSeconds overrides default', async () => {
    const vc = await issueWithWindow('2026-04-24T12:00:00Z')
    const res = await verify(vc, {
      ...base,
      now: new Date('2026-04-24T11:59:00Z'),
      skewSeconds: 30,
    })
    expect(res.verified).toBe(false) // 60s before, tolerance 30s
  })
})
