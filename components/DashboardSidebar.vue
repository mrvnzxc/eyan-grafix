<script setup lang="ts">
const route = useRoute()

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
