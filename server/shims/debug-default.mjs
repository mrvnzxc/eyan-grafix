/**
 * PostGraphile does `require('debug')`. When Rollup inlines the real `debug` package,
 * interop can yield a namespace object where `default` is not unwrapped (many named exports),
 * so `createDebugger` becomes non-callable on Vercel. Re-export the CJS default only.
 */
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

export default require('debug')
