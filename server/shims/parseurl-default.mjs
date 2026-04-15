/**
 * `parseurl` is `module.exports = fn` plus `fn.original`. Rollup's namespace has multiple keys,
 * so `getDefaultExportFromNamespaceIfNotNamed` keeps the namespace object and PostGraphile calls
 * `parseUrl(req)` → "parseUrl is not a function". Export default only so interop unwraps to the fn
 * (the function still has `.original` from Node's CJS module).
 */
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

export default require('parseurl')
