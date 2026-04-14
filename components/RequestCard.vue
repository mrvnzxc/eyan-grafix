<script setup lang="ts">
import { NuxtLink } from '#components'

defineProps<{
  title: string
  description: string
  status: string
  createdAt: string
  to?: string
}>()
</script>

<template>
  <component
    :is="to ? NuxtLink : 'div'"
    v-bind="to ? { to } : {}"
    class="group block rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition hover:border-indigo-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/80 dark:shadow-card-dark dark:hover:border-indigo-500/40"
    :class="to ? 'cursor-pointer' : ''"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <h3 class="font-display text-lg font-semibold text-slate-900 dark:text-white">
        {{ title }}
      </h3>
      <StatusBadge :status="status" />
    </div>
    <p class="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
      {{ description }}
    </p>
    <p class="mt-4 text-xs text-slate-400 dark:text-slate-500">
      {{ new Date(createdAt).toLocaleString() }}
    </p>
    <span
      v-if="to"
      class="mt-3 inline-flex items-center text-sm font-medium text-indigo-600 underline-offset-2 group-hover:underline dark:text-indigo-400"
    >
      View details →
    </span>
  </component>
</template>
