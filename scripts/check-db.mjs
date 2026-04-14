/**
 * Run from project root: npm run check-db
 * Uses DATABASE_URL from .env — does not print your password.
 */
import pg from 'pg'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadDotenv() {
  const p = resolve(process.cwd(), '.env')
  if (!existsSync(p)) return
  const raw = readFileSync(p, 'utf8')
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!m) continue
    const k = m[1]
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (process.env[k] === undefined) process.env[k] = v
  }
}

loadDotenv()

const url = process.env.DATABASE_URL?.trim()
if (!url) {
  console.error('DATABASE_URL is missing. Add it to .env in the project root.')
  process.exit(1)
}

const hostHint = (() => {
  try {
    const afterAt = url.split('@')[1] || ''
    return afterAt.split('/')[0] || '(could not parse host)'
  } catch {
    return '(parse error)'
  }
})()

const redacted = url.replace(/:([^:@/]+)@/, ':****@')
console.log('Using:', redacted)
console.log('Host:', hostHint)

if (/db\.[^.]+\.supabase\.co/i.test(url) && !/pooler\.supabase\.com/i.test(url)) {
  console.warn(
    '\n⚠️  This is a DIRECT Supabase host (often IPv6-only). If this fails on Windows, switch to:\n' +
      '   Dashboard → Connect → Session pooler → copy URI (user postgres.YOUR_REF, host …pooler.supabase.com)\n',
  )
}

const isSupabase = /supabase\.co|pooler\.supabase\.com/i.test(url)
const rejectUnauthorized = (() => {
  const v = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED
  if (v === '0' || String(v).toLowerCase() === 'false') return false
  return true
})()
const pool = new pg.Pool({
  connectionString: url,
  connectionTimeoutMillis: 20_000,
  ssl: isSupabase ? { rejectUnauthorized } : undefined,
})

try {
  const { rows } = await pool.query('select current_user, current_database()')
  console.log('\n✅ SUCCESS — Postgres answered:', rows[0])
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e)
  console.error('\n❌ FAILED:', msg)
  if (/ENOTFOUND|getaddrinfo/i.test(msg)) {
    console.error(
      '\n→ DNS/network cannot reach that host. Use Session pooler URI from Supabase Connect (IPv4-friendly).',
    )
  } else if (/timeout|ETIMEDOUT/i.test(msg)) {
    console.error('\n→ Timeout: firewall/VPN blocking Postgres port, or wrong host/port.')
  } else if (/password|28P01|authentication failed/i.test(msg)) {
    console.error(
      '\n→ Auth failed: reset password in Supabase → Database settings; URL-encode special characters in the password.',
    )
  } else if (/SSL|certificate|self-signed/i.test(msg)) {
    console.error(
      '\n→ TLS verification failed. If you are on a corporate/VPN network, try in .env (dev only):\n' +
        '   DATABASE_SSL_REJECT_UNAUTHORIZED=false\n' +
        '   Otherwise install your org root CA or fix NODE_EXTRA_CA_CERTS.',
    )
  }
  process.exitCode = 1
} finally {
  await pool.end().catch(() => {})
}
