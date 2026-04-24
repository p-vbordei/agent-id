// Run once: bun run conformance/_generate-c1.ts > conformance/c1-valid.json
// Deterministic: uses fixed seed material.
import * as ed from '@noble/ed25519'
import { didKeyFromPublicKey } from '../src/keys.ts'
import type { CredentialSubject } from '../src/types.ts'
import { issue } from '../src/vc.ts'

const principalPriv = new Uint8Array(32).fill(1) // deterministic seed; not a real secret
const principalPub = await ed.getPublicKeyAsync(principalPriv)
const agentPriv = new Uint8Array(32).fill(2)
const agentPub = await ed.getPublicKeyAsync(agentPriv)

const subject: CredentialSubject = {
  id: didKeyFromPublicKey(agentPub),
  type: 'Agent',
  principal: didKeyFromPublicKey(principalPub),
  model: { vendor: 'anthropic', id: 'claude-opus-4-7' },
  capability: { action: 'answer', sla: { latency_ms_p95: 2000 } },
  valid_from: '2026-04-24T00:00:00.000Z',
  valid_until: '2099-01-01T00:00:00.000Z',
}

const vc = await issue({
  principal: { publicKey: principalPub, privateKey: principalPriv },
  subject,
  validFrom: '2026-04-24T00:00:00.000Z',
  validUntil: '2099-01-01T00:00:00.000Z',
  now: new Date('2026-04-24T00:00:00.000Z'),
})

console.log(
  JSON.stringify(
    {
      name: 'round-trip valid VC',
      description:
        'Minimal capability VC with model, principal, capability.action; verify must accept.',
      clause: 'C1',
      now: '2026-04-24T12:00:00.000Z',
      vc,
      expect: { verified: true },
    },
    null,
    2,
  ),
)
