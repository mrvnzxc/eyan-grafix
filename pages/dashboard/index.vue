<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['owner'] })

const gql = useRequestGraphql()
const toast = useToast()

/** '' = all, otherwise matches `requests.status` */
const statusFilter = ref<string | ''>('')
const loading = ref(true)
const rows = ref<Awaited<ReturnType<ReturnType<typeof useRequestGraphql>['getRequests']>>>([])

const statusTabs = [
  { value: '' as const, label: 'All' },
  { value: 'pending' as const, label: 'Pending' },
  { value: 'in_progress' as const, label: 'In progress' },
  { value: 'completed' as const, label: 'Completed' },
] as const

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

function setStatusFilter(v: string) {
  statusFilter.value = v
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
    </div>

    <div class="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
      <button
        v-for="tab in statusTabs"
        :key="tab.value === '' ? 'all' : tab.value"
        type="button"
        role="tab"
        :aria-selected="statusFilter === tab.value"
        class="rounded-xl px-4 py-2 text-sm font-medium transition"
        :class="
          statusFilter === tab.value
            ? 'bg-indigo-600 text-white shadow-sm dark:bg-indigo-500'
            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80'
        "
        @click="setStatusFilter(tab.value)"
      >
        {{ tab.label }}
      </button>
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
