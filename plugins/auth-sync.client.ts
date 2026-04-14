export default defineNuxtPlugin(() => {
  const user = useSupabaseUser()
  const api = useApiFetch()

  async function sync() {
    if (!user.value) return
    try {
      await api('/api/me/sync', { method: 'POST' })
    } catch {
      /* non-fatal; profile may sync on next navigation */
    }
  }

  watch(
    user,
    (u) => {
      if (u) void sync()
    },
    { immediate: true },
  )
})
