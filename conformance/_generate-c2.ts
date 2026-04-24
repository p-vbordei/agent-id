// Run once: bun run conformance/_generate-c2.ts > conformance/c2-mutated.json
import * as ed from '@noble/ed25519'
import { didKeyFromPublicKey } from '../src/keys.ts'
import type { CredentialSubject, VerifiableCredential } from '../src/types.ts'
import { issue } from '../src/vc.ts'

const principalPriv = new Uint8Array(32).fill(1)
const principalPub = await ed.getPublicKeyAsync(principalPriv)
const agentPriv = new Uint8Array(32).fill(2)
const agentPub = await ed.getPublicKeyAsync(agentPriv)

const subject: CredentialSubject = {
  id: didKeyFromPublicKey(agentPub),
  type: 'Agent',
  principal: didKeyFromPublicKey(principalPub),
  model: { vendor: 'anthropic', id: 'claude-opus-4-7' },
  capability: { action: 'answer' },
  valid_from: '2026-04-24T00:00:00.000Z',
}

const vc = await issue({
  principal: { publicKey: principalPub, privateKey: principalPriv },
  subject,
  validFrom: '2026-04-24T00:00:00.000Z',
  now: new Date('2026-04-24T00:00:00.000Z'),
})

// Mutate capability.action by one character. Signature is now invalid.
const mutated: VerifiableCredential = {
  ...vc,
  credentialSubject: {
    ...vc.credentialSubject,
    capability: { ...vc.credentialSubject.capability, action: 'bnswer' },
  },
}

console.log(
  JSON.stringify(
    {
      name: 'single-byte mutation in capability.action',
      description:
        'Valid VC with capability.action mutated from "answer" to "bnswer". Verify must reject with a signature error.',
      clause: 'C2',
      now: '2026-04-24T12:00:00.000Z',
      vc: mutated,
      expect: { verified: false, errorMatches: ['signature'] },
    },
    null,
    2,
  ),
)
