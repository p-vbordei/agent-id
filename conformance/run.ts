// Run: bun run conformance/run.ts
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { DidDocument, VerifiableCredential, VerifyOptions } from '../src/types.ts'
import { verify } from '../src/vc.ts'

interface Vector {
  name: string
  description: string
  clause: string
  vc: VerifiableCredential
  expect: { verified: boolean; errorMatches?: string[] }
  didWebFixtures?: Record<string, DidDocument>
  now?: string
}

const dir = new URL('.', import.meta.url).pathname
const vectors: Vector[] = readdirSync(dir)
  .filter((f) => f.endsWith('.json') && !f.startsWith('fixtures'))
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Vector)

let pass = 0
let fail = 0

for (const v of vectors) {
  const opts: VerifyOptions = {
    ...(v.now ? { now: new Date(v.now) } : {}),
    ...(v.didWebFixtures ? { fetch: stubFetch(v.didWebFixtures) } : {}),
  }
  const res = await verify(v.vc, opts)
  const ok =
    res.verified === v.expect.verified &&
    (v.expect.errorMatches ?? []).every((pat) => res.errors.some((e) => new RegExp(pat).test(e)))
  if (ok) {
    pass++
    console.log(`PASS ${v.clause} ${v.name}`)
  } else {
    fail++
    console.error(`FAIL ${v.clause} ${v.name}`)
    console.error('  got:', res)
    console.error('  expected:', v.expect)
  }
}

console.log(`\n${pass} passed, ${fail} failed out of ${vectors.length}`)
if (fail > 0) process.exit(1)

function stubFetch(fixtures: Record<string, DidDocument>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    const match = Object.entries(fixtures).find(([expected]) => url === expected)
    if (!match) return new Response('not found', { status: 404 })
    return new Response(JSON.stringify(match[1]), {
      headers: { 'content-type': 'application/json' },
    })
  }) as unknown as typeof fetch
}
