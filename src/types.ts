export interface KeyPair {
  publicKey: Uint8Array
  privateKey: Uint8Array
}

export interface Model {
  vendor: string
  id: string
  fingerprint?: string
}

export interface SLA {
  latency_ms_p95?: number
  availability?: number
  token_budget?: number
}

export interface Capability {
  action: string
  scope?: string[]
  sla?: SLA
}

export interface CredentialSubject {
  id: string
  type: 'Agent'
  principal: string
  model: Model
  capability: Capability
  valid_from: string
  valid_until?: string
}

export interface Proof {
  type: 'DataIntegrityProof'
  cryptosuite: 'eddsa-jcs-2022'
  created: string
  verificationMethod: string
  proofPurpose: 'assertionMethod'
  proofValue: string
}

export interface VerifiableCredential {
  '@context': string[]
  type: string[]
  issuer: string
  validFrom: string
  validUntil?: string
  credentialSubject: CredentialSubject
  proof: Proof
}

export interface VerificationMethod {
  id: string
  type: 'Multikey' | 'Ed25519VerificationKey2020'
  controller: string
  publicKeyMultibase: string
}

export interface DidDocument {
  '@context': string | string[]
  id: string
  verificationMethod: VerificationMethod[]
  assertionMethod?: (string | VerificationMethod)[]
  authentication?: (string | VerificationMethod)[]
}

export interface VerifyResult {
  verified: boolean
  errors: string[]
}

export interface VerifyOptions {
  now?: Date
  fetch?: typeof fetch
  skewSeconds?: number
}

export interface IssueOptions {
  principal: KeyPair
  subject: Omit<CredentialSubject, 'id' | 'principal'> & {
    id: string
    principal?: string
  }
  validFrom?: string
  validUntil?: string
  now?: Date
  issuer?: string
  verificationMethod?: string
}

export interface ResolveOptions {
  fetch?: typeof fetch
}

export const CONTEXT_V2 = 'https://www.w3.org/ns/credentials/v2'
export const CONTEXT_AGENT_V1 = 'https://agent-id.dev/context/v1'
