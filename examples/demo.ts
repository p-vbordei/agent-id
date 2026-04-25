import { didKeyFromPublicKey, generateKeyPair, issue, verify } from '../src/index.ts'

const principal = await generateKeyPair()
const agent = await generateKeyPair()

const vc = await issue({
  principal,
  subject: {
    id: didKeyFromPublicKey(agent.publicKey),
    type: 'Agent',
    principal: didKeyFromPublicKey(principal.publicKey),
    model: { vendor: 'anthropic', id: 'claude-opus-4-7' },
    capability: { action: 'answer', sla: { latency_ms_p95: 2000 } },
    valid_from: new Date().toISOString(),
  },
})

console.log('issued VC for', vc.credentialSubject.id)
console.log('verify →', await verify(vc))
