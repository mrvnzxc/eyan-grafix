import pg from 'pg'
import { createSupabasePoolConfig } from '~/server/utils/supabasePgPoolConfig'

/**
 * Dev helper: open GET /api/health/db while npm run dev is running.
 * Does not expose secrets; shows whether DATABASE_URL can reach Postgres.
 */
export default defineEventHandler(async (event) => {
  if (import.meta.prod) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const rc = useRuntimeConfig(event)
  const url = String(rc.databaseUrl || '').trim()
  if (!url) {
    return {
      ok: false,
      step: 'env',
      message: 'databaseUrl is empty — add DATABASE_URL to .env and restart dev.',
    }
  }

  const pool = new pg.Pool(createSupabasePoolConfig(url))
  try {
    const { rows } = await pool.query('select 1 as ok')
    return { ok: true, step: 'query', detail: rows[0] }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    let hint =
      'Copy the exact Session pooler URI from Supabase → Connect. Direct db.*.supabase.co often fails on Windows (IPv6).'
    if (/password|28P01|authentication/i.test(message)) {
      hint = 'Database password mismatch — reset in Supabase → Database → Database password; re-copy URI.'
    }
    if (/ENOTFOUND|getaddrinfo/i.test(message)) {
      hint = 'Host not found — use pooler host (…pooler.supabase.com), not db.….supabase.co, on IPv4 networks.'
    }
    if (/self-signed|certificate chain|SSL|UNABLE_TO_VERIFY/i.test(message)) {
      hint =
        'TLS verification failed (often corporate proxy). Dev-only: set DATABASE_SSL_REJECT_UNAUTHORIZED=false in .env and restart dev. Prefer fixing trust store / NODE_EXTRA_CA_CERTS in production.'
    }
    return { ok: false, step: 'connect', message, hint }
  } finally {
    await pool.end().catch(() => {})
  }
})
