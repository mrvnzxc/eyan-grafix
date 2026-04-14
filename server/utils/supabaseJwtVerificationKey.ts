import jwksClient from 'jwks-rsa'
import type { Secret } from 'jsonwebtoken'

export type JwtHeader = { alg?: string; kid?: string }

/**
 * For PostGraphile `jwt.verify`: legacy access tokens use HS256 + JWT secret;
 * newer Supabase signing keys use ES256/RS256 — public keys come from JWKS.
 */
export function createSupabaseJwtVerificationSecret(
  supabaseUrl: string,
  jwtSecret: string,
): Secret | ((header: JwtHeader, callback: (err: Error | null, signingKey?: Secret) => void) => void) {
  const base = supabaseUrl.trim().replace(/\/$/, '')
  const secret = jwtSecret.trim()
  if (!base) return secret

  const client = jwksClient({
    jwksUri: `${base}/auth/v1/.well-known/jwks.json`,
    cache: true,
    cacheMaxAge: 600_000,
    rateLimit: true,
    jwksRequestsPerMinute: 20,
  })

  return (header: JwtHeader, callback: (err: Error | null, signingKey?: Secret) => void) => {
    if (header.alg === 'HS256') {
      if (!secret) {
        callback(new Error('SUPABASE_JWT_SECRET is required for HS256 access tokens'))
        return
      }
      callback(null, secret)
      return
    }
    if (!header.kid) {
      callback(
        new Error(
          'Access token JWT is missing kid in header (needed for ES256/RS256 verification against JWKS)',
        ),
      )
      return
    }
    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        callback(err)
        return
      }
      const pub = key?.getPublicKey()
      if (!pub) {
        callback(new Error('JWKS did not return a public key'))
        return
      }
      callback(null, pub)
    })
  }
}
