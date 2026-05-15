/**
 * OAuth must return to the same origin where sign-in started (PKCE verifier lives there).
 * Do not rely on NUXT_PUBLIC_SITE_URL alone — Vercel builds often still default to localhost.
 */
export function useOAuthCallbackUrl() {
  const config = useRuntimeConfig()

  function callbackUrl(): string {
    if (import.meta.client && typeof window !== 'undefined') {
      return `${window.location.origin.replace(/\/$/, '')}/confirm`
    }
    const base = String(config.public.siteUrl || '').replace(/\/$/, '') || 'http://localhost:3000'
    return `${base}/confirm`
  }

  return { callbackUrl }
}
