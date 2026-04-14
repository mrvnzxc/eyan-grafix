<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: ['auth'] })

const route = useRoute()
const id = computed(() => route.params.id as string)
const gql = useRequestGraphql()
const toast = useToast()

const loading = ref(true)
const row = ref<Awaited<ReturnType<ReturnType<typeof useRequestGraphql>['getRequestById']>>>(null)

async function load() {
  loading.value = true
  try {
    row.value = await gql.getRequestById(id.value)
    if (!row.value) toast.push('Request not found.', 'error')
  } catch (e: unknown) {
    toast.push(e instanceof Error ? e.message : 'Failed to load', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(id, load)

const imageUrls = computed(() => row.value?.requestImagesByRequestId?.nodes?.map((n) => n.imageUrl) ?? [])
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-10 md:px-6">
    <NuxtLink
      to="/my-requests"
      class="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
    >
      ← Back to my requests
    </NuxtLink>

    <div v-if="loading" class="mt-10 flex justify-center">
      <div
        class="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"
        aria-hidden="true"
      />
    </div>

    <template v-else-if="row">
      <div class="mt-6 flex flex-wrap items-start justify-between gap-4">
        <h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white">
          {{ row.title }}
        </h1>
        <StatusBadge :status="row.status" />
      </div>
      <p class="mt-2 text-xs text-slate-400 dark:text-slate-500">
        Updated {{ new Date(row.updatedAt).toLocaleString() }}
      </p>

      <section class="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-700 dark:bg-slate-800/80 dark:shadow-card-dark">
        <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Brief</h2>
        <p class="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
          {{ row.description }}
        </p>
        <div v-if="row.notes" class="mt-4 border-t border-slate-100 pt-4 dark:border-slate-700">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Notes</h3>
          <p class="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
            {{ row.notes }}
          </p>
        </div>
      </section>

      <section class="mt-8">
        <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Reference images</h2>
        <RequestGallery class="mt-3" :urls="imageUrls" alt-prefix="Reference" />
      </section>

      <section
        v-if="row.responseByRequestId"
        class="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-700 dark:bg-slate-800/80 dark:shadow-card-dark"
      >
        <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Response from studio</h2>
        <p
          v-if="row.responseByRequestId.ownerMessage"
          class="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300"
        >
          {{ row.responseByRequestId.ownerMessage }}
        </p>
        <a
          v-if="row.responseByRequestId.layoutFileUrl"
          :href="row.responseByRequestId.layoutFileUrl"
          target="_blank"
          rel="noopener noreferrer"
          download
          class="mt-4 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Download finished layout
        </a>
      </section>
    </template>
  </div>
</template>
