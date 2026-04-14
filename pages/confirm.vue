<script setup lang="ts">
import type { Session } from '@supabase/supabase-js'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const sessionState = useSupabaseSession()
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

function applySessionToState(s: Session) {
  sessionState.value = s
  user.value = s.user
}

/**
 * After Google redirects back, PKCE exchange runs in GoTrue init — it can finish slightly
 * after the first getSession(). Poll + listen for SIGNED_IN so we don't bail too early.
 */
async function resolveSessionAfterRedirect(hasCode: boolean): Promise<Session | null> {
  const quick = await supabase.auth.getSession()
  if (quick.error) {
    await router.replace('/login?error=' + encodeURIComponent(quick.error.message))
    return null
  }
  if (quick.data.session?.user) {
    return quick.data.session
  }

  if (!hasCode) {
    return null
  }

  const maxMs = 20000
  const step = 300
  const deadline = Date.now() + maxMs

  const signedIn = new Promise<Session | null>((resolve) => {
    let subscription: { unsubscribe: () => void }
    const timer = setTimeout(() => {
      subscription?.unsubscribe()
      resolve(null)
    }, maxMs)
    subscription = supabase.auth.onAuthStateChange((_event, sess) => {
      if (sess?.user) {
        clearTimeout(timer)
        subscription.unsubscribe()
        resolve(sess)
      }
    }).data.subscription
  })

  const polled = (async () => {
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, step))
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        await router.replace('/login?error=' + encodeURIComponent(error.message))
        return null
      }
      if (data.session?.user) {
        return data.session
      }
    }
    return null
  })()

  const first = await Promise.race([signedIn, polled])
  if (first) {
    return first
  }

  const final = await supabase.auth.getSession()
  if (final.error) {
    await router.replace('/login?error=' + encodeURIComponent(final.error.message))
    return null
  }
  return final.data.session?.user ? final.data.session : null
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

  const hasCode = typeof q.code === 'string' && q.code.length > 0

  const session = await resolveSessionAfterRedirect(hasCode)

  if (!session?.user) {
    if (hasCode) {
      await router.replace('/login?error=session')
    } else {
      await router.replace('/login?reason=nocode')
    }
    return
  }

  applySessionToState(session)
  await nextTick()

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
    <p v-if="typeof route.query.code === 'string'" class="mt-2 max-w-sm text-center text-xs text-slate-400 dark:text-slate-500">
      This can take a few seconds while we connect your account.
    </p>
  </div>
</template>
