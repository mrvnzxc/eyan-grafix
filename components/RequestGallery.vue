<script setup lang="ts">
defineProps<{
  urls: string[]
  altPrefix?: string
}>()
</script>

<template>
  <div v-if="urls.length" class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
    <a
      v-for="(url, i) in urls"
      :key="url + i"
      :href="url"
      target="_blank"
      rel="noopener noreferrer"
      class="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-900"
    >
      <img
        :src="url"
        :alt="(altPrefix || 'Reference') + ' ' + (i + 1)"
        class="h-full w-full object-cover transition hover:scale-105"
        loading="lazy"
      />
    </a>
  </div>
  <div
    v-else
    class="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-400"
  >
    No reference images for this request.
  </div>
</template>
