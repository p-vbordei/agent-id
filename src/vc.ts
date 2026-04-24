import * as ed from '@noble/ed25519'
import { base58btc } from 'multiformats/bases/base58'
import { jcsHash } from './jcs.ts'
import { didKeyFromPublicKey, verificationMethodId } from './keys.ts'
import {
  CONTEXT_AGENT_V1,
  CONTEXT_V2,
  type IssueOptions,
  type Proof,
  type VerifiableCredential,
} from './types.ts'

export async function issue(opts: IssueOptions): Promise<VerifiableCredential> {
  const principalDid = didKeyFromPublicKey(opts.principal.publicKey)
  const vmId = verificationMethodId(principalDid)
  const now = opts.now ?? new Date()
  const subject = { ...opts.subject, principal: opts.subject.principal ?? principalDid }

  const unsigned: Omit<VerifiableCredential, 'proof'> = {
    '@context': [CONTEXT_V2, CONTEXT_AGENT_V1],
    type: ['VerifiableCredential', 'AgentCapabilityCredential'],
    issuer: principalDid,
    validFrom: opts.validFrom ?? now.toISOString(),
    ...(opts.validUntil ? { validUntil: opts.validUntil } : {}),
    credentialSubject: subject,
  }

  const proofConfig = {
    '@context': unsigned['@context'],
    type: 'DataIntegrityProof' as const,
    cryptosuite: 'eddsa-jcs-2022' as const,
    created: now.toISOString(),
    verificationMethod: vmId,
    proofPurpose: 'assertionMethod' as const,
  }

  const hashData = new Uint8Array(64)
  hashData.set(jcsHash(proofConfig), 0)
  hashData.set(jcsHash(unsigned), 32)

  const signature = await ed.signAsync(hashData, opts.principal.privateKey)
  const proofValue = base58btc.encode(signature)

  const proof: Proof = {
    type: proofConfig.type,
    cryptosuite: proofConfig.cryptosuite,
    created: proofConfig.created,
    verificationMethod: proofConfig.verificationMethod,
    proofPurpose: proofConfig.proofPurpose,
    proofValue,
  }

  return { ...unsigned, proof }
}
