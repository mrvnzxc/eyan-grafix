/**
 * Same-origin $fetch to /api/* with the current Supabase access token.
 * Required when supabase.useSsrCookies is false (session in localStorage, not cookies).
 */
export function useApiFetch() {
  const session = useSupabaseSession()
  return $fetch.create({
    onRequest({ request, options }) {
      const raw = typeof request === 'string' ? request : (request as Request).url
      let pathname = raw
      try {
        pathname = raw.startsWith('http') ? new URL(raw).pathname : (raw.split('?')[0] ?? raw)
      } catch {
        /* use raw */
      }
      if (!pathname.startsWith('/api/')) return
      const token = session.value?.access_token
      if (!token) return
      const h = new Headers(options.headers as HeadersInit)
      h.set('Authorization', `Bearer ${token}`)
      options.headers = h
    },
  })
}
