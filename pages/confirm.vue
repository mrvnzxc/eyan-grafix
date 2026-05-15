<script setup lang="ts">
import { useApiFetch } from '~/composables/useApiFetch'

definePageMeta({ layout: 'default', ssr: false })

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const api = useApiFetch()

const AUTH_REDIRECT_KEY = 'layoutdesk-auth-redirect'

function readStoredRedirect(): string | null {
  if (!import.meta.client) return null
  try {
    const v = sessionStorage.getItem(AUTH_REDIRECT_KEY)
    sessionStorage.removeItem(AUTH_REDIRECT_KEY)
    return v && v.startsWith('/') ? v : null
  } catch {
    return null
  }
}

function readQueryRedirect(): string | null {
  const r = route.query.redirect
  if (typeof r !== 'string' || !r.startsWith('/')) return null
  return r
}

async function finishSignIn() {
  const q = route.query
  if (q.error) {
    const msg =
      (typeof q.error_description === 'string' && q.error_description) ||
      (typeof q.error === 'string' && q.error) ||
      'oauth_error'
    await router.replace('/login?error=' + encodeURIComponent(msg))
    return
  }

  const code = typeof q.code === 'string' ? q.code : ''
  if (code) {
    // detectSessionInUrl may exchange the code on init; poll before calling exchange again.
    let exchanged = false
    for (let i = 0; i < 40 && !exchanged; i++) {
      const check = await supabase.auth.getSession()
      if (check.data.session?.user) {
        exchanged = true
        break
      }
      await new Promise((r) => setTimeout(r, 250))
    }
    if (!exchanged) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        await router.replace('/login?error=' + encodeURIComponent(error.message))
        return
      }
    }
  }

  const { data, error } = await supabase.auth.getSession()
  if (error) {
    await router.replace('/login?error=' + encodeURIComponent(error.message))
    return
  }
  if (!data.session?.user) {
    if (code) {
      await router.replace('/login?error=session')
    } else {
      await router.replace('/login?reason=nocode')
    }
    return
  }

  try {
    await api('/api/me/sync', { method: 'POST' })
  } catch {
    /* best-effort */
  }

  let target = readStoredRedirect() || readQueryRedirect()

  if (!target) {
    try {
      const profile = await api<{ role: string } | null>('/api/me')
      target = profile?.role === 'owner' ? '/dashboard' : '/my-requests'
    } catch {
      target = '/my-requests'
    }
  }

  await router.replace(target)
}

onMounted(() => {
  void finishSignIn()
})
</script>

<template>
  <div class="flex min-h-[40vh] flex-col items-center justify-center px-4">
    <div
      class="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400"
      aria-hidden="true"
    />
    <p class="mt-4 text-sm text-slate-600 dark:text-slate-300">Completing sign-in…</p>
    <p
      v-if="typeof route.query.code === 'string'"
      class="mt-2 max-w-sm text-center text-xs text-slate-400 dark:text-slate-500"
    >
      This can take a few seconds while we connect your account.
    </p>
  </div>
</template>
