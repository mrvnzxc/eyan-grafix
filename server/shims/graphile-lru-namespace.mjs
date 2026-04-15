/**
 * PostGraphile does `new lru_1.default({ maxLength })` after Rollup's
 * `getDefaultExportFromNamespaceIfNotNamed(import * as lru)`.
 * If the namespace only has `default`, Rollup unwraps to the class and `lru_1.default` is wrong.
 * Export a named binding so the namespace keeps multiple keys and `.default` stays the constructor.
 */
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const mod = require('@graphile/lru')
const LRU = mod?.default ?? mod

export const __graphileLruConstructor = LRU
export default LRU
