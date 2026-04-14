<script setup lang="ts">
definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const supabase = useSupabaseClient()
const toast = useToast()
const loading = ref(false)

const AUTH_REDIRECT_KEY = 'layoutdesk-auth-redirect'

const authError = computed(() => {
  const e = route.query.error
  return typeof e === 'string' ? e : null
})

onMounted(() => {
  const reason = route.query.reason
  if (reason === 'nocode') {
    toast.push('Start sign-in from the Login page, then finish in the same browser tab.', 'info')
    void router.replace({ path: '/login', query: {} })
    return
  }

  const err = authError.value
  if (!err) return
  const raw = decodeURIComponent(err.replace(/\+/g, ' '))
  const host =
    typeof window !== 'undefined' && window.location.hostname === '127.0.0.1'
      ? ' You are on 127.0.0.1 — use http://localhost:3000 instead.'
      : ''
  const msg =
    err === 'session'
      ? `Still no session after Google returned. Clear all site data for this host, confirm .env has SUPABASE_KEY and NUXT_PUBLIC_SITE_URL matches the address bar (e.g. http://localhost:3000), restart npm run dev, then try again.${host}`
      : raw.toLowerCase().includes('pkce') || raw.toLowerCase().includes('code verifier')
        ? 'Sign-in cookie was lost. Use http://localhost:3000 only, clear site data for localhost, then try again. If it persists, disable browser extensions that block cookies.'
        : raw
  toast.push(msg, 'error')
  void router.replace({ path: '/login', query: {} })
})

async function signInGoogle() {
  loading.value = true
  try {
    const redirect = (route.query.redirect as string) || '/my-requests'
    if (import.meta.client) {
      try {
        sessionStorage.setItem(AUTH_REDIRECT_KEY, redirect)
      } catch {
        /* ignore */
      }
    }
    // skipBrowserRedirect: avoid navigating away before the PKCE code_verifier cookie is committed.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${config.public.siteUrl}/confirm`,
        skipBrowserRedirect: true,
      },
    })
    if (error) {
      toast.push(error.message, 'error')
      return
    }
    if (!data?.url) {
      toast.push('Could not start Google sign-in.', 'error')
      return
    }
    await nextTick()
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    await new Promise((r) => setTimeout(r, 350))
    window.location.assign(data.url)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-md flex-col px-4 py-20">
    <h1 class="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
      Sign in
    </h1>
    <button
      type="button"
      class="mt-8 flex items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
      :disabled="loading"
      @click="signInGoogle"
    >
      <svg
        class="h-5 w-5 shrink-0"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {{ loading ? 'Redirecting…' : 'Continue with Google' }}
    </button>
  </div>
</template>
