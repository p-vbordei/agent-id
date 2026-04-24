import * as ed from '@noble/ed25519'
import { base58btc } from 'multiformats/bases/base58'
import { jcsHash } from './jcs.ts'
import { didKeyFromPublicKey, publicKeyFromDidKey, verificationMethodId } from './keys.ts'
import { validateCapabilityVC } from './schema.ts'
import {
  CONTEXT_AGENT_V1,
  CONTEXT_V2,
  type IssueOptions,
  type Proof,
  type VerifiableCredential,
  type VerifyOptions,
  type VerifyResult,
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

export async function verify(
  vc: VerifiableCredential,
  opts: VerifyOptions = {},
): Promise<VerifyResult> {
  const errors: string[] = []

  if (!opts.skipSchema) {
    const schemaRes = validateCapabilityVC(vc)
    if (!schemaRes.valid) {
      for (const e of schemaRes.errors) errors.push(`schema: ${e}`)
    }
  }

  if (!opts.skipValidity) {
    const now = opts.now ?? new Date()
    const skewMs = (opts.skewSeconds ?? 300) * 1000
    const from = Date.parse(vc.validFrom)
    const until = vc.validUntil ? Date.parse(vc.validUntil) : undefined
    if (Number.isNaN(from)) {
      errors.push('validFrom is not a valid RFC 3339 date-time')
    } else if (now.getTime() + skewMs < from) {
      errors.push(`not yet valid (validFrom ${vc.validFrom})`)
    }
    if (until !== undefined) {
      if (Number.isNaN(until)) {
        errors.push('validUntil is not a valid RFC 3339 date-time')
      } else if (now.getTime() - skewMs > until) {
        errors.push(`expired (validUntil ${vc.validUntil})`)
      }
    }
  }

  try {
    if (
      !vc.proof ||
      vc.proof.type !== 'DataIntegrityProof' ||
      vc.proof.cryptosuite !== 'eddsa-jcs-2022'
    ) {
      errors.push('proof missing or unsupported cryptosuite')
    } else {
      const { proofValue, ...proofFields } = vc.proof
      const proofConfigForHash = { '@context': vc['@context'], ...proofFields }
      const { proof: _omit, ...unsigned } = vc

      const hashData = new Uint8Array(64)
      hashData.set(jcsHash(proofConfigForHash), 0)
      hashData.set(jcsHash(unsigned), 32)

      const signature = base58btc.decode(proofValue)

      const didPart = vc.proof.verificationMethod.split('#')[0]
      if (!didPart) {
        errors.push('verificationMethod missing DID')
      } else if (!didPart.startsWith('did:key:')) {
        // did:web and others land in Task 10-12. Until then, non-did:key issuers
        // cannot have their signature verified — surface that explicitly rather
        // than returning a misleading verified:true.
        errors.push(`signature not checked: non-did:key issuer requires DID resolver (${didPart})`)
      } else {
        const publicKey = publicKeyFromDidKey(didPart)
        const ok = await ed.verifyAsync(signature, hashData, publicKey)
        if (!ok) errors.push('signature verification failed')
      }
    }
  } catch (err) {
    errors.push(`signature check threw: ${(err as Error).message}`)
  }

  return { verified: errors.length === 0, errors }
}
