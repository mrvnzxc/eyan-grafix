/**
 * Clear only clearly invalid refresh-token sessions (do not match generic "session" errors).
 */
export default defineNuxtPlugin({
  name: 'auth-clear-stale',
  enforce: 'post',
  setup() {
    const supabase = useSupabaseClient()

    void supabase.auth.getSession().then(({ error }) => {
      if (!error) return
      const msg = (error.message || '').toLowerCase()
      const stale =
        /refresh token not found|invalid refresh token|refresh_token_not_found|invalid grant/.test(
          msg,
        )
      if (stale) {
        void supabase.auth.signOut({ scope: 'local' })
      }
    })
  },
})
