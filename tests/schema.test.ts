import { describe, expect, test } from 'bun:test'
import { validateCapabilityVC } from '../src/schema.ts'

describe('capability schema', () => {
  test('accepts a minimal valid VC shape', () => {
    const vc = {
      '@context': ['https://www.w3.org/ns/credentials/v2', 'https://agent-id.dev/context/v1'],
      type: ['VerifiableCredential', 'AgentCapabilityCredential'],
      issuer: 'did:key:z6Mkx',
      validFrom: '2026-04-24T00:00:00Z',
      credentialSubject: {
        id: 'did:key:z6Mky',
        type: 'Agent',
        principal: 'did:key:z6Mkx',
        model: { vendor: 'anthropic', id: 'claude-opus-4-7' },
        capability: { action: 'answer' },
        valid_from: '2026-04-24T00:00:00Z',
      },
      proof: {
        type: 'DataIntegrityProof',
        cryptosuite: 'eddsa-jcs-2022',
        created: '2026-04-24T00:00:00Z',
        verificationMethod: 'did:key:z6Mkx#z6Mkx',
        proofPurpose: 'assertionMethod',
        proofValue: 'zabc',
      },
    }
    const res = validateCapabilityVC(vc)
    expect(res.valid).toBe(true)
  })

  test('rejects missing capability.action', () => {
    const vc = minimalVc()
    // biome-ignore lint/performance/noDelete: test-time mutation
    delete (vc.credentialSubject.capability as { action?: string }).action
    const res = validateCapabilityVC(vc)
    expect(res.valid).toBe(false)
    expect(res.errors.join(' ')).toMatch(/action/)
  })

  test('rejects when context omits agent-id context', () => {
    const vc = minimalVc()
    vc['@context'] = ['https://www.w3.org/ns/credentials/v2']
    const res = validateCapabilityVC(vc)
    expect(res.valid).toBe(false)
  })

  test('rejects non-did issuer', () => {
    const vc = minimalVc()
    vc.issuer = 'https://example.com'
    const res = validateCapabilityVC(vc)
    expect(res.valid).toBe(false)
  })
})

interface MinimalVc {
  '@context': string[]
  type: string[]
  issuer: string
  validFrom: string
  credentialSubject: {
    id: string
    type: string
    principal: string
    model: { vendor: string; id: string }
    capability: { action: string }
    valid_from: string
  }
  proof: {
    type: string
    cryptosuite: string
    created: string
    verificationMethod: string
    proofPurpose: string
    proofValue: string
  }
}

function minimalVc(): MinimalVc {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2', 'https://agent-id.dev/context/v1'],
    type: ['VerifiableCredential', 'AgentCapabilityCredential'],
    issuer: 'did:key:z6Mkx',
    validFrom: '2026-04-24T00:00:00Z',
    credentialSubject: {
      id: 'did:key:z6Mky',
      type: 'Agent',
      principal: 'did:key:z6Mkx',
      model: { vendor: 'anthropic', id: 'claude-opus-4-7' },
      capability: { action: 'answer' },
      valid_from: '2026-04-24T00:00:00Z',
    },
    proof: {
      type: 'DataIntegrityProof',
      cryptosuite: 'eddsa-jcs-2022',
      created: '2026-04-24T00:00:00Z',
      verificationMethod: 'did:key:z6Mkx#z6Mkx',
      proofPurpose: 'assertionMethod',
      proofValue: 'zabc',
    },
  }
}
