/**
 * Hydrate Nuxt Supabase state from localStorage before route middleware runs.
 * With useSsrCookies: false, useState starts null until the client reads storage.
 */
export default defineNuxtPlugin({
  name: 'auth-session-init',
  enforce: 'pre',
  async setup() {
    const supabase = useSupabaseClient()
    const session = useSupabaseSession()
    const user = useSupabaseUser()

    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.warn('[auth-session-init] getSession:', error.message)
      return
    }
    if (data.session) {
      session.value = data.session
      user.value = data.session.user
    }
  },
})
