import { createRequire } from 'node:module'
import dns from 'node:dns'
import type { IncomingMessage } from 'node:http'
import { createSupabasePoolConfig } from './supabasePgPoolConfig'
import { createSupabaseJwtVerificationSecret } from './supabaseJwtVerificationKey'

const require = createRequire(import.meta.url)

// Prefer IPv4 when pooler has both A and AAAA (helps some Windows setups).
dns.setDefaultResultOrder('ipv4first')

type PostgraphileMiddleware = (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, next?: (err?: unknown) => void) => void

let handler: PostgraphileMiddleware | null = null
let cacheKey = ''

/**
 * Supabase `auth.uid()` reads `request.jwt.claim.sub` (and `request.jwt.claims`).
 * PostGraphile only sets `jwt.claims.*`, so we mirror claims into `request.jwt.claim.*`.
 * Payload is decoded here; PostGraphile verifies the signature immediately after.
 */
function createSupabaseRequestJwtPgSettings() {
  const jwt = require('jsonwebtoken') as typeof import('jsonwebtoken')
  return async (req: IncomingMessage) => {
    const auth = req.headers?.authorization
    if (!auth?.startsWith('Bearer ')) return {}
    const token = auth.slice(7).trim()
    const decoded = jwt.decode(token, { complete: false })
    if (!decoded || typeof decoded === 'string') return {}
    const claims = decoded as Record<string, unknown>
    const out: Record<string, string> = { 'request.jwt.claims': JSON.stringify(claims) }
    for (const [k, v] of Object.entries(claims)) {
      if (v == null) continue
      const val = typeof v === 'object' ? JSON.stringify(v) : String(v)
      out[`request.jwt.claim.${k}`] = val
    }
    return out
  }
}

function loadPostgraphile(): (
  poolOrString: string,
  schema: string,
  options: Record<string, unknown>,
) => PostgraphileMiddleware {
  const mod = require('postgraphile') as {
    default?: (...args: unknown[]) => PostgraphileMiddleware
    postgraphile?: (...args: unknown[]) => PostgraphileMiddleware
  }
  const fn = mod.postgraphile ?? mod.default
  if (typeof fn !== 'function') {
    throw new Error('postgraphile package did not export a callable factory')
  }
  return fn as (poolOrString: string, schema: string, options: Record<string, unknown>) => PostgraphileMiddleware
}

function createHandler(databaseUrl: string, jwtSecret: string, supabaseUrl: string): PostgraphileMiddleware {
  const postgraphile = loadPostgraphile()
  const poolConfig = createSupabasePoolConfig(databaseUrl)
  const jwtVerification = createSupabaseJwtVerificationSecret(supabaseUrl, jwtSecret)
  const jwtKey =
    typeof jwtVerification === 'function'
      ? { jwtPublicKey: jwtVerification }
      : { jwtSecret: jwtVerification }

  return postgraphile(poolConfig, 'public', {
    graphqlRoute: '/api/graphql',
    graphiql: false,
    enhanceGraphiql: false,
    dynamicJson: true,
    ...jwtKey,
    // PostGraphile defaults audience to "postgraphile"; Supabase uses "authenticated".
    jwtVerifyOptions: {
      algorithms:
        typeof jwtVerification === 'function' ? ['HS256', 'RS256', 'ES256'] : ['HS256'],
      audience: ['authenticated', 'postgraphile'],
    },
    // Cannot combine pgDefaultRole with pgSettings(req); role comes from JWT `role` claim.
    pgSettings: createSupabaseRequestJwtPgSettings(),
    allowExplain: process.env.NODE_ENV !== 'production',
    // Avoid killing Nitro on first DB DNS/connect failure; retries with backoff.
    retryOnInitFail: true,
  }) as PostgraphileMiddleware
}

/**
 * Connect-style PostGraphile middleware, mounted at `/api/graphql` inside Nitro.
 * Credentials come from Nuxt runtimeConfig (backed by .env), not raw process.env in the worker.
 */
export function getPostgraphileNodeHandler(creds: {
  databaseUrl: string
  supabaseJwtSecret: string
  supabaseUrl?: string
}): PostgraphileMiddleware {
  const databaseUrl = creds.databaseUrl.trim()
  const jwtSecret = creds.supabaseJwtSecret.trim()
  const supabaseUrl = (creds.supabaseUrl ?? '').trim()
  if (!databaseUrl || (!jwtSecret && !supabaseUrl)) {
    throw new Error(
      'Missing databaseUrl or JWT verification config. Set DATABASE_URL and SUPABASE_URL; for HS256 tokens also set SUPABASE_JWT_SECRET. Restart npm run dev. See .env.example.',
    )
  }
  const key = `${databaseUrl}\0${jwtSecret}\0${supabaseUrl}`
  if (handler && key === cacheKey) {
    return handler
  }
  handler = createHandler(databaseUrl, jwtSecret, supabaseUrl)
  cacheKey = key
  return handler
}
