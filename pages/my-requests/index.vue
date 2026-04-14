<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: ['auth'] })

const user = useSupabaseUser()
const gql = useRequestGraphql()
const toast = useToast()

const loading = ref(true)
const rows = ref<
  Awaited<ReturnType<ReturnType<typeof useRequestGraphql>['getRequestsForUser']>>
>([])

async function load() {
  loading.value = true
  try {
    const uid = user.value?.id
    if (!uid) {
      rows.value = []
      return
    }
    rows.value = await gql.getRequestsForUser(uid)
  } catch (e: unknown) {
    toast.push(e instanceof Error ? e.message : 'Failed to load requests', 'error')
    rows.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(user, () => load())
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-10 md:px-6">
    <h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white">My requests</h1>
    <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
      Track status and download completed layouts when they are ready.
    </p>

    <div v-if="loading" class="mt-10 flex justify-center">
      <div
        class="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"
        aria-hidden="true"
      />
    </div>

    <div
      v-else-if="!rows.length"
      class="mt-10 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-16 text-center dark:border-slate-600 dark:bg-slate-800/40"
    >
      <p class="text-slate-600 dark:text-slate-300">You have not submitted any requests yet.</p>
      <NuxtLink
        to="/submit"
        class="mt-4 inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        Create a request
      </NuxtLink>
    </div>

    <div v-else class="mt-8 grid gap-4">
      <RequestCard
        v-for="r in rows"
        :key="r.id"
        :title="r.title"
        :description="r.description"
        :status="r.status"
        :created-at="r.createdAt"
        :to="`/my-requests/${r.id}`"
      />
    </div>
  </div>
</template>
