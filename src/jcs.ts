import { sha256 } from '@noble/hashes/sha256'
import canonicalize from 'canonicalize'

export function canonicalJSON(value: unknown): Uint8Array {
  const str = canonicalize(value)
  if (str === undefined)
    throw new Error(
      'canonicalize returned undefined (value contains undefined, a function, or a symbol)',
    )
  return new TextEncoder().encode(str)
}

export function jcsHash(value: unknown): Uint8Array {
  return sha256(canonicalJSON(value))
}
