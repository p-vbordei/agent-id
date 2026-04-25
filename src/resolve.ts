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

async function resolveDidWeb(did: string, opts: ResolveOptions): Promise<DidDocument> {
  const url = didWebToUrl(did)
  const f = opts.fetch ?? fetch
  const resp = await f(url)
  if (!resp.ok) {
    throw new Error(`did:web fetch failed: ${resp.status} ${resp.statusText}`)
  }
  const doc = (await resp.json()) as DidDocument
  if (doc.id !== did) {
    throw new Error(`did:web document id mismatch: expected ${did}, got ${doc.id}`)
  }
  return doc
}

function didWebToUrl(did: string): string {
  const rest = did.slice('did:web:'.length)
  const parts = rest.split(':').map(decodeURIComponent)
  const host = parts[0]
  if (!host) throw new Error(`invalid did:web: empty host in ${did}`)
  if (parts.slice(1).some((p) => p === '')) {
    throw new Error(`invalid did:web: empty segment in ${did}`)
  }
  if (parts.length === 1) return `https://${host}/.well-known/did.json`
  const path = parts.slice(1).join('/')
  return `https://${host}/${path}/did.json`
}
