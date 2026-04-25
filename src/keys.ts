import * as ed from '@noble/ed25519'
import { base58btc } from 'multiformats/bases/base58'
import type { KeyPair } from './types.ts'

const ED25519_PUB_MULTICODEC = Uint8Array.from([0xed, 0x01])

export async function generateKeyPair(): Promise<KeyPair> {
  const privateKey = ed.utils.randomPrivateKey()
  const publicKey = await ed.getPublicKeyAsync(privateKey)
  return { publicKey, privateKey }
}

export function didKeyFromPublicKey(publicKey: Uint8Array): string {
  if (publicKey.length !== 32) {
    throw new Error(`Ed25519 public key must be 32 bytes, got ${publicKey.length}`)
  }
  const bytes = new Uint8Array(ED25519_PUB_MULTICODEC.length + publicKey.length)
  bytes.set(ED25519_PUB_MULTICODEC, 0)
  bytes.set(publicKey, ED25519_PUB_MULTICODEC.length)
  return `did:key:${base58btc.encode(bytes)}`
}

export function publicKeyFromDidKey(did: string): Uint8Array {
  if (!did.startsWith('did:key:z')) {
    throw new Error(`not a did:key: ${did}`)
  }
  const multibase = did.slice('did:key:'.length)
  const bytes = base58btc.decode(multibase)
  if (bytes[0] !== 0xed || bytes[1] !== 0x01) {
    throw new Error(
      `unsupported key type in did:key (expected Ed25519 multicodec 0xed01, got 0x${bytes[0]?.toString(16)}${bytes[1]?.toString(16)})`,
    )
  }
  return bytes.slice(2)
}

export function verificationMethodId(did: string): string {
  if (did.startsWith('did:key:')) {
    const fragment = did.slice('did:key:'.length)
    return `${did}#${fragment}`
  }
  if (!did.includes('#')) throw new Error(`cannot derive fragment from ${did}`)
  return did
}
