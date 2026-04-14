export default defineNuxtRouteMiddleware(() => {
  if (import.meta.server) return

  const u = useSupabaseUser()
  if (!u.value) {
    return navigateTo('/login?redirect=' + encodeURIComponent(useRoute().fullPath))
  }
})
