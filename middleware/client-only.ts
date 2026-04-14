export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return

  const u = useSupabaseUser()
  const api = useApiFetch()
  if (!u.value) {
    return navigateTo('/login?redirect=' + encodeURIComponent(useRoute().fullPath))
  }
  try {
    const profile = await api<{ role: string } | null>('/api/me')
    if (!profile || profile.role !== 'client') {
      return navigateTo('/')
    }
  } catch {
    return navigateTo('/login')
  }
})
