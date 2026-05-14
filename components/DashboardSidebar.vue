<script setup lang="ts">
import { useApiFetch } from '~/composables/useApiFetch'

const route = useRoute()
const api = useApiFetch()

const profile = ref<{ name: string | null; email: string } | null>(null)

onMounted(async () => {
  try {
    profile.value = await api<{ name: string | null; email: string }>('/api/me')
  } catch {
    profile.value = null
  }
})

const displayName = computed(() => {
  const p = profile.value
  if (!p) return 'Account'
  const n = p.name?.trim()
  if (n) return n
  const at = p.email?.split('@')[0]
  if (at) return at
  return 'Account'
})

const links = [
  { to: '/dashboard', label: 'All requests', icon: 'inbox' },
]

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<template>
  <aside
    class="flex w-full flex-col gap-1 border-b border-slate-200 bg-white/90 p-4 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 md:w-56 md:border-b-0 md:border-r md:p-6"
  >
    <div
      class="mb-3 flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800/80"
    >
      <div class="min-w-0 flex-1">
        <p class="text-xs font-semibold text-slate-800 dark:text-slate-100">Notifications</p>
        <p class="truncate text-[10px] text-slate-500 dark:text-slate-400">New requests and payment screenshots</p>
      </div>
      <HeaderUserNotifications
        :display-name="displayName"
        role="owner"
        dropdown-align="left"
      />
    </div>
    <p
      class="mb-3 hidden text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 md:block"
    >
      Admin
    </p>
    <NuxtLink
      v-for="link in links"
      :key="link.to"
      :to="link.to"
      class="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition"
      :class="
        isActive(link.to)
          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200'
          : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
      "
    >
      <span class="text-lg" aria-hidden="true">📋</span>
      {{ link.label }}
    </NuxtLink>
  </aside>
</template>
