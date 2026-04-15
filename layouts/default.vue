<script setup lang="ts">
const colorMode = useColorMode()
const user = useSupabaseUser()
const session = useSupabaseSession()
const api = useApiFetch()
const profile = ref<{ role: string } | null>(null)
const isMobileMenuOpen = ref(false)
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
watch(
  () => useRoute().fullPath,
  () => {
    isMobileMenuOpen.value = false
  },
)

const supabase = useSupabaseClient()

async function logout() {
  await supabase.auth.signOut()
  profile.value = null
  isMobileMenuOpen.value = false
  await navigateTo('/')
}

function toggleTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
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

        <div class="flex items-center gap-2 md:hidden">
          <button
            type="button"
            class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            :aria-label="colorMode.value === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
            :aria-pressed="colorMode.value === 'dark'"
            @click="toggleTheme"
          >
            <svg
              v-if="colorMode.value === 'dark'"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="h-5 w-5"
              aria-hidden="true"
            >
              <path
                d="M12 4.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 12 4.5Zm0 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6.75-3a.75.75 0 0 1 .75-.75H21a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75ZM12 17.25a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V18a.75.75 0 0 1 .75-.75Zm-6.75-4.5a.75.75 0 0 1 0-1.5H6.75a.75.75 0 0 1 0 1.5H5.25Zm10.742-5.492a.75.75 0 0 1 1.06 0l1.061 1.061a.75.75 0 1 1-1.06 1.061l-1.062-1.06a.75.75 0 0 1 0-1.062ZM6.947 16.007a.75.75 0 0 1 1.06 0l1.062 1.061a.75.75 0 1 1-1.06 1.061l-1.062-1.06a.75.75 0 0 1 0-1.062Zm11.166 1.06a.75.75 0 0 1-1.06 1.061l-1.062-1.06a.75.75 0 0 1 1.06-1.062l1.062 1.061ZM8.008 7.258a.75.75 0 0 1 0 1.061l-1.061 1.061a.75.75 0 1 1-1.06-1.061l1.06-1.06a.75.75 0 0 1 1.061 0Z"
              />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="h-5 w-5"
              aria-hidden="true"
            >
              <path
                d="M9.528 1.718a.75.75 0 0 1 .162.819 8.25 8.25 0 0 0 10.773 10.773.75.75 0 0 1 .981.981 9.75 9.75 0 1 1-12.897-12.897.75.75 0 0 1 .981.324Z"
              />
            </svg>
          </button>
          <button
            type="button"
            class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            :aria-label="isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'"
            :aria-expanded="isMobileMenuOpen"
            @click="isMobileMenuOpen = !isMobileMenuOpen"
          >
            <svg
              v-if="!isMobileMenuOpen"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="h-5 w-5"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M3.75 5.25A.75.75 0 0 1 4.5 4.5h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Zm0 6a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Zm0 6a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Z"
                clip-rule="evenodd"
              />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="h-5 w-5"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>

        <nav class="hidden flex-wrap items-center gap-2 md:flex md:gap-4">
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
              @click="toggleTheme"
            >
              {{ colorMode.value === 'dark' ? 'Light mode' : 'Dark mode' }}
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
              @click="toggleTheme"
            >
              {{ colorMode.value === 'dark' ? 'Light mode' : 'Dark mode' }}
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

      <nav
        v-if="isMobileMenuOpen"
        class="border-t border-slate-200/80 px-4 pb-4 pt-3 dark:border-slate-700 md:hidden"
      >
        <div class="flex flex-col gap-2">
          <template v-if="user && session">
            <NuxtLink
              v-if="profile?.role === 'client'"
              to="/submit"
              class="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              New request
            </NuxtLink>
            <NuxtLink
              v-if="profile?.role === 'client'"
              to="/my-requests"
              class="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              My requests
            </NuxtLink>
            <NuxtLink
              v-if="profile?.role === 'owner'"
              to="/dashboard"
              class="rounded-lg px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
            >
              Dashboard
            </NuxtLink>
            <button
              type="button"
              class="rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              @click="logout"
            >
              Sign out
            </button>
          </template>
          <template v-else>
            <NuxtLink
              to="/login"
              class="rounded-xl bg-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              Sign in
            </NuxtLink>
          </template>
        </div>
      </nav>
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
