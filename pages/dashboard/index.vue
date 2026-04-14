<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['owner'] })

const gql = useRequestGraphql()
const toast = useToast()

const statusFilter = ref<string | ''>('')
const loading = ref(true)
const rows = ref<Awaited<ReturnType<ReturnType<typeof useRequestGraphql>['getRequests']>>>([])

async function load() {
  loading.value = true
  try {
    rows.value = await gql.getRequests(
      statusFilter.value ? { status: statusFilter.value } : {},
    )
  } catch (e: unknown) {
    toast.push(e instanceof Error ? e.message : 'Failed to load requests', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(statusFilter, load)
</script>

<template>
  <div>
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white">Requests</h1>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Review client briefs, references, and delivery status.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs font-medium text-slate-500 dark:text-slate-400" for="filter">Status</label>
        <select
          id="filter"
          v-model="statusFilter"
          class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="mt-12 flex justify-center">
      <div
        class="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"
        aria-hidden="true"
      />
    </div>

    <div
      v-else-if="!rows.length"
      class="mt-12 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-600 dark:bg-slate-800/50"
    >
      <p class="text-slate-600 dark:text-slate-300">No requests match this filter.</p>
    </div>

    <div v-else class="mt-8 grid gap-4">
      <RequestCard
        v-for="r in rows"
        :key="r.id"
        :title="r.title"
        :description="r.description"
        :status="r.status"
        :created-at="r.createdAt"
        :to="`/dashboard/request/${r.id}`"
      />
    </div>
  </div>
</template>
