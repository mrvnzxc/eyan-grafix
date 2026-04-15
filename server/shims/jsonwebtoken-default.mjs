/**
 * `jsonwebtoken` under ESM can expose namespace keys like { default, decode }.
 * PostGraphile expects a CJS-shaped object with `jwt.verify(...)`.
 * Exporting default-only here makes Rollup unwrap to that object reliably.
 */
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

export default require('jsonwebtoken')
