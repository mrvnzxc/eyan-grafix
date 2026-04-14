<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: ['client-only'] })

const route = useRoute()
const id = computed(() => route.query.id as string | undefined)
</script>

<template>
  <div class="mx-auto max-w-lg px-4 py-20 text-center">
    <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl dark:bg-emerald-900/40">
      ✓
    </div>
    <h1 class="mt-6 font-display text-2xl font-bold text-slate-900 dark:text-white">
      Request received
    </h1>
    <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
      Thanks — your references and brief are saved. You can track status and download finished work from
      your requests list.
    </p>
    <p v-if="id" class="mt-4 font-mono text-xs text-slate-400 dark:text-slate-500">ID: {{ id }}</p>
    <div class="mt-8 flex flex-wrap justify-center gap-3">
      <NuxtLink
        :to="id ? `/my-requests/${id}` : '/my-requests'"
        class="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        View request
      </NuxtLink>
      <NuxtLink
        to="/submit"
        class="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Submit another
      </NuxtLink>
    </div>
  </div>
</template>
