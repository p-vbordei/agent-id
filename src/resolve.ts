import { publicKeyFromDidKey } from './keys.ts'
import type { DidDocument, ResolveOptions } from './types.ts'

export async function resolve(did: string, opts: ResolveOptions = {}): Promise<DidDocument> {
  if (did.startsWith('did:key:')) return resolveDidKey(did)
  if (did.startsWith('did:web:')) return resolveDidWeb(did, opts)
  throw new Error(`unsupported DID method: ${did}`)
}

function resolveDidKey(did: string): DidDocument {
  // Throws on malformed or non-Ed25519.
  publicKeyFromDidKey(did)
  const fragment = did.slice('did:key:'.length)
  const vmId = `${did}#${fragment}`
  return {
    '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/multikey/v1'],
    id: did,
    verificationMethod: [
      {
        id: vmId,
        type: 'Multikey',
        controller: did,
        publicKeyMultibase: fragment,
      },
    ],
    assertionMethod: [vmId],
    authentication: [vmId],
  }
}

async function resolveDidWeb(_did: string, _opts: ResolveOptions): Promise<DidDocument> {
  // Filled in Task 11.
  throw new Error('did:web resolver not yet implemented')
}
