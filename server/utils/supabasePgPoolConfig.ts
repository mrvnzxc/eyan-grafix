import pg from 'pg'

/** When true, skip TLS chain verification (dev only — e.g. corporate MITM / broken local CA store). */
function supabaseSslRejectUnauthorized(): boolean {
  const v = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED
  if (v === '0' || v?.toLowerCase() === 'false') return false
  return true
}

/**
 * Supabase requires TLS. Pool timeouts avoid hanging forever when the host is wrong or IPv6-unreachable.
 */
export function createSupabasePoolConfig(connectionString: string): pg.PoolConfig {
  const cs = connectionString.trim()
  const isSupabase = /supabase\.co|pooler\.supabase\.com/i.test(cs)
  return {
    connectionString: cs,
    max: 10,
    connectionTimeoutMillis: 20_000,
    idleTimeoutMillis: 10_000,
    ...(isSupabase
      ? { ssl: { rejectUnauthorized: supabaseSslRejectUnauthorized() } }
      : {}),
  }
}
