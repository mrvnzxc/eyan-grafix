<script setup lang="ts">
const props = defineProps<{
  status: string
}>()

const label = computed(() => {
  switch (props.status) {
    case 'pending':
      return 'Pending'
    case 'in_progress':
      return 'In progress'
    case 'completed':
      return 'Completed'
    default:
      return props.status
  }
})

const classes = computed(() => {
  switch (props.status) {
    case 'pending':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100'
    case 'in_progress':
      return 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100'
    case 'completed':
      return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100'
    default:
      return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
  }
})
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
    :class="classes"
  >
    {{ label }}
  </span>
</template>
