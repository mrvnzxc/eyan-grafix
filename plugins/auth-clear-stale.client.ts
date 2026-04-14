/**
 * Stale localStorage after key rotation / env changes triggers "Refresh Token Not Found".
 * Clear local session so the header does not show logged-in nav with a broken session.
 */
export default defineNuxtPlugin(() => {
  const supabase = useSupabaseClient()

  void supabase.auth.getSession().then(({ error }) => {
    if (!error) return
    const msg = error.message || ''
    if (/refresh token|invalid.*token|session/i.test(msg)) {
      void supabase.auth.signOut({ scope: 'local' })
    }
  })
})
