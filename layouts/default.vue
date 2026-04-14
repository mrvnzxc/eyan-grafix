<script setup lang="ts">
const colorMode = useColorMode()
const user = useSupabaseUser()
const session = useSupabaseSession()
const api = useApiFetch()
const profile = ref<{ role: string } | null>(null)
const logoSrc = computed(() =>
  colorMode.value === 'dark' ? '/whitelogo.png' : '/blacklogo.png'
)

async function refreshProfile() {
  if (!user.value || !session.value?.access_token) {
    profile.value = null
    return
  }
  try {
    profile.value = await api<{ role: string }>('/api/me')
  } catch {
    profile.value = null
  }
}

watch([user, session], refreshProfile, { immediate: true })

const supabase = useSupabaseClient()

async function logout() {
  await supabase.auth.signOut()
  profile.value = null
  await navigateTo('/')
}
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header
      class="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90"
    >
      <div
        class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6"
      >
        <NuxtLink to="/" class="inline-flex items-center">
          <img :src="logoSrc" alt="Layout Desk" class="h-20 w-auto md:h-22" />
        </NuxtLink>

        <nav class="flex flex-wrap items-center gap-2 md:gap-4">
          <template v-if="user && session">
            <NuxtLink
              v-if="profile?.role === 'client'"
              to="/submit"
              class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              New request
            </NuxtLink>
            <NuxtLink
              v-if="profile?.role === 'client'"
              to="/my-requests"
              class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              My requests
            </NuxtLink>
            <NuxtLink
              v-if="profile?.role === 'owner'"
              to="/dashboard"
              class="rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
            >
              Dashboard
            </NuxtLink>
            <button
              type="button"
              class="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              :aria-pressed="colorMode.value === 'dark'"
              @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
            >
              {{ colorMode.value === 'dark' ? 'Light' : 'Dark' }}
            </button>
            <button
              type="button"
              class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              @click="logout"
            >
              Sign out
            </button>
          </template>
          <template v-else>
            <button
              type="button"
              class="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
            >
              {{ colorMode.value === 'dark' ? 'Light' : 'Dark' }}
            </button>
            <NuxtLink
              to="/login"
              class="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              Sign in
            </NuxtLink>
          </template>
        </nav>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="border-t border-slate-200 bg-slate-50 py-6 dark:border-slate-700 dark:bg-slate-900">
      <div
        class="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 text-xs text-slate-600 dark:text-slate-300 md:px-6"
      >
        <span>EyanGraFix</span>
        <span class="text-slate-500 dark:text-slate-400">Crafting visuals that stand out.</span>
        <span class="text-slate-500 dark:text-slate-400">© {{ new Date().getFullYear() }} EyanGraFix. All rights reserved.</span>
        <a
          href="https://www.facebook.com/carlianqt"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook"
          class="inline-flex items-center text-slate-700 transition hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="h-5 w-5"
            aria-hidden="true"
          >
            <path
              d="M13.5 21v-7h2.3l.4-3h-2.7V9.1c0-.9.2-1.6 1.5-1.6h1.3V4.8c-.2 0-1.1-.1-2.2-.1-2.2 0-3.6 1.3-3.6 3.9V11H8v3h2.5v7h3Z"
            />
          </svg>
        </a>
      </div>
    </footer>
    <ConfirmDialog />
  </div>
</template>
