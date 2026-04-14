import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const db = process.env.DATABASE_URL?.trim()
const jwt = process.env.SUPABASE_JWT_SECRET?.trim()

if (!db) {
  console.error(
    'DATABASE_URL is missing. Add your Supabase direct Postgres URL (port 5432) to .env — see README.',
  )
  process.exit(1)
}
if (!jwt) {
  console.error(
    'SUPABASE_JWT_SECRET is missing. In Supabase → Project Settings → API, copy the value used to verify user JWTs (often labeled JWT Secret). It is not the same as service_role or sb_secret_* keys.',
  )
  process.exit(1)
}

let cliPath
try {
  cliPath = require.resolve('postgraphile/cli.js')
} catch {
  console.error('postgraphile is not installed. Run: npm install')
  process.exit(1)
}

const child = spawn(
  process.execPath,
  [
    cliPath,
    '-c',
    db,
    '-s',
    'public',
    '-e',
    jwt,
    '--jwt-verify-algorithms',
    'HS256',
    '-r',
    'authenticated',
    '--enhance-graphiql',
    '--dynamic-json',
    '-p',
    '5000',
  ],
  { stdio: 'inherit' },
)

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})
