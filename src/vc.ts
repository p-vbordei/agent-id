import * as ed from '@noble/ed25519'
import { base58btc } from 'multiformats/bases/base58'
import { jcsHash } from './jcs.ts'
import { didKeyFromPublicKey, verificationMethodId } from './keys.ts'
import { resolve } from './resolve.ts'
import { validateCapabilityVC } from './schema.ts'
import {
  CONTEXT_AGENT_V1,
  CONTEXT_V2,
  type DidDocument,
  type IssueOptions,
  type Proof,
  type VerifiableCredential,
  type VerifyOptions,
  type VerifyResult,
} from './types.ts'

export async function issue(opts: IssueOptions): Promise<VerifiableCredential> {
  const principalDid = opts.issuer ?? didKeyFromPublicKey(opts.principal.publicKey)
  const vmId = opts.verificationMethod ?? verificationMethodId(principalDid)
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

  const schemaRes = validateCapabilityVC(vc)
  if (!schemaRes.valid) {
    for (const e of schemaRes.errors) errors.push(`schema: ${e}`)
  }

  {
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

      let issuerPublicKey: Uint8Array | undefined
      try {
        const issuerDoc = await resolve(vc.issuer, opts.fetch ? { fetch: opts.fetch } : {})
        issuerPublicKey = extractKeyForVM(issuerDoc, vc.proof.verificationMethod)
        if (!issuerPublicKey) {
          errors.push(
            `issuer DID document does not list verificationMethod ${vc.proof.verificationMethod}`,
          )
        }
      } catch (err) {
        errors.push(`issuer resolution failed: ${(err as Error).message}`)
      }

      if (issuerPublicKey) {
        const ok = await ed.verifyAsync(signature, hashData, issuerPublicKey)
        if (!ok) errors.push('signature verification failed')
      }
    }
  } catch (err) {
    errors.push(`signature check threw: ${(err as Error).message}`)
  }

  // Agent DID resolution — separate phase.
  try {
    const agentDoc = await resolve(vc.credentialSubject.id, opts.fetch ? { fetch: opts.fetch } : {})
    if (!agentDoc.verificationMethod?.length) {
      errors.push('agent DID document has no verificationMethod')
    }
  } catch (err) {
    errors.push(`agent DID resolution failed: ${(err as Error).message}`)
  }

  return { verified: errors.length === 0, errors }
}

function extractKeyForVM(doc: DidDocument, vmId: string): Uint8Array | undefined {
  const vm = doc.verificationMethod?.find((m) => m.id === vmId)
  if (!vm) return undefined
  const bytes = base58btc.decode(vm.publicKeyMultibase)
  if (bytes[0] === 0xed && bytes[1] === 0x01) return bytes.slice(2)
  return undefined
}
