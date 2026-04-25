export { didKeyFromPublicKey, generateKeyPair, publicKeyFromDidKey } from './keys.ts'
export { resolve } from './resolve.ts'
export { issue, verify } from './vc.ts'
export type {
  Capability,
  CredentialSubject,
  DidDocument,
  IssueOptions,
  KeyPair,
  Model,
  Proof,
  ResolveOptions,
  SLA,
  VerifiableCredential,
  VerificationMethod,
  VerifyOptions,
  VerifyResult,
} from './types.ts'
