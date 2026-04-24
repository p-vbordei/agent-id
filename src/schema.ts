import addFormats from 'ajv-formats'
import Ajv2020, { type ErrorObject } from 'ajv/dist/2020'
import schema from '../schema/capability-v1.json' with { type: 'json' }

const ajv = new Ajv2020({ allErrors: true, strict: false })
// addFormats must precede compile() — formats registered after compile are silently ignored.
addFormats(ajv)
const validator = ajv.compile(schema)

export interface SchemaValidationResult {
  valid: boolean
  errors: string[]
}

export function validateCapabilityVC(value: unknown): SchemaValidationResult {
  const ok = validator(value)
  if (ok) return { valid: true, errors: [] }
  const errs = (validator.errors ?? []).map(formatError)
  return { valid: false, errors: errs }
}

function formatError(e: ErrorObject): string {
  const path = e.instancePath || '/'
  return `${path} ${e.message ?? 'invalid'}`
}
