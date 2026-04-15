import pg from 'pg'
import { getPostgraphileNodeHandler } from '~/server/utils/postgraphileSingleton'
import { createSupabasePoolConfig } from '~/server/utils/supabasePgPoolConfig'

/**
 * Deployment diagnostic endpoint for GraphQL startup/runtime.
 * Safe for production: returns only booleans, step labels, and generic hints.
 */
export default defineEventHandler(async (event) => {
  const rc = useRuntimeConfig(event)
  const databaseUrl = String(rc.databaseUrl || '').trim()
  const supabaseJwtSecret = String(rc.supabaseJwtSecret || '').trim()
  const supabaseUrl = String(
    (rc.public as { supabase?: { url?: string } } | undefined)?.supabase?.url ?? '',
  ).trim()

  if (!databaseUrl || (!supabaseJwtSecret && !supabaseUrl)) {
    return {
      ok: false,
      step: 'env',
      message:
        'Missing GraphQL runtime config. Set DATABASE_URL and SUPABASE_URL; for HS256 tokens set SUPABASE_JWT_SECRET.',
      env: {
        hasDatabaseUrl: Boolean(databaseUrl),
        hasSupabaseJwtSecret: Boolean(supabaseJwtSecret),
        hasSupabaseUrl: Boolean(supabaseUrl),
      },
    }
  }

  try {
    getPostgraphileNodeHandler({ databaseUrl, supabaseJwtSecret, supabaseUrl })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const hint = /Cannot find module 'postgraphile'|did not export/i.test(message)
      ? 'Serverless bundle is missing postgraphile runtime dependency. Redeploy after install and clean build cache.'
      : 'PostGraphile initialization failed before request handling.'
    return { ok: false, step: 'postgraphile-init', message, hint }
  }

  const pool = new pg.Pool(createSupabasePoolConfig(databaseUrl))
  try {
    await pool.query('select 1 as ok')
    return {
      ok: true,
      step: 'ready',
      detail: 'PostGraphile can initialize and the database is reachable.',
      env: {
        hasDatabaseUrl: true,
        hasSupabaseJwtSecret: Boolean(supabaseJwtSecret),
        hasSupabaseUrl: Boolean(supabaseUrl),
      },
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    let hint =
      'DB connection failed from runtime. Use Supabase Session pooler URI for DATABASE_URL in Vercel.'
    if (/ENOTFOUND|getaddrinfo/i.test(message)) {
      hint = 'Host lookup failed. Use Session pooler host (...pooler.supabase.com), not db.*.supabase.co.'
    } else if (/password|28P01|authentication/i.test(message)) {
      hint = 'Database authentication failed. Recheck DATABASE_URL username/password.'
    } else if (/self-signed|certificate chain|SSL|UNABLE_TO_VERIFY/i.test(message)) {
      hint =
        'TLS trust chain failed in runtime environment. Verify CA trust or connection settings for production.'
    }
    return { ok: false, step: 'db-connect', message, hint }
  } finally {
    await pool.end().catch(() => {})
  }
})
