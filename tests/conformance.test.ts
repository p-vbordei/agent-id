import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'

test('conformance vectors pass', () => {
  const r = spawnSync('bun', ['run', 'conformance/run.ts'], { encoding: 'utf8' })
  if (r.status !== 0) {
    console.error(r.stdout)
    console.error(r.stderr)
  }
  expect(r.status).toBe(0)
})
