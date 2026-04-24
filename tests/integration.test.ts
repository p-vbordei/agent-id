import { describe, expect, test } from 'bun:test'
import { didKeyFromPublicKey, generateKeyPair } from '../src/keys.ts'
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
