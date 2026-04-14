<script setup lang="ts">
import { validateLayoutFile } from '~/utils/files'

definePageMeta({ layout: 'dashboard', middleware: ['owner'] })

const route = useRoute()
const id = computed(() => route.params.id as string)
const gql = useRequestGraphql()
const toast = useToast()
const confirm = useConfirmDialog()
const supabase = useSupabaseClient()

const loading = ref(true)
const saving = ref(false)
const row = ref<Awaited<ReturnType<ReturnType<typeof useRequestGraphql>['getRequestById']>>>(null)

const statusLocal = ref('')
const messageLocal = ref('')

async function load() {
  loading.value = true
  try {
    const r = await gql.getRequestById(id.value)
    row.value = r
    if (r) {
      statusLocal.value = r.status
      messageLocal.value = r.responseByRequestId?.ownerMessage ?? ''
    }
  } catch (e: unknown) {
    toast.push(e instanceof Error ? e.message : 'Failed to load', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(id, load)

const imageUrls = computed(() => row.value?.requestImagesByRequestId?.nodes?.map((n) => n.imageUrl) ?? [])

async function saveStatus() {
  if (!row.value || statusLocal.value === row.value.status) return
  const ok = await confirm.confirm({
    title: 'Update status',
    message: 'Save this status change for the client?',
    confirmLabel: 'Save',
  })
  if (!ok) {
    statusLocal.value = row.value.status
    return
  }
  saving.value = true
  try {
    await gql.updateStatus(row.value.id, statusLocal.value)
    toast.push('Status updated.', 'success')
    await load()
  } catch (e: unknown) {
    toast.push(e instanceof Error ? e.message : 'Update failed', 'error')
    statusLocal.value = row.value.status
  } finally {
    saving.value = false
  }
}

async function saveMessage() {
  if (!row.value) return
  saving.value = true
  try {
    await gql.sendResponse({
      requestId: row.value.id,
      ownerMessage: messageLocal.value || null,
      layoutFileUrl: row.value.responseByRequestId?.layoutFileUrl ?? null,
    })
    toast.push('Message saved.', 'success')
    await load()
  } catch (e: unknown) {
    toast.push(e instanceof Error ? e.message : 'Save failed', 'error')
  } finally {
    saving.value = false
  }
}

async function onLayoutFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !row.value) return

  const err = validateLayoutFile(file)
  if (err) {
    toast.push(err, 'error')
    return
  }

  saving.value = true
  try {
    const path = `${row.value.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, '_')}`
    const { error } = await supabase.storage.from('layouts').upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    })
    if (error) throw error
    const { data } = supabase.storage.from('layouts').getPublicUrl(path)
    const url = data?.publicUrl
    if (!url) throw new Error('No public URL')

    await gql.sendResponse({
      requestId: row.value.id,
      ownerMessage: messageLocal.value || row.value.responseByRequestId?.ownerMessage || null,
      layoutFileUrl: url,
    })
    toast.push('Layout file uploaded.', 'success')
    await load()
  } catch (e: unknown) {
    toast.push(e instanceof Error ? e.message : 'Upload failed', 'error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <NuxtLink
      to="/dashboard"
      class="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
    >
      ← All requests
    </NuxtLink>

    <div v-if="loading" class="mt-10 flex justify-center">
      <div
        class="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"
        aria-hidden="true"
      />
    </div>

    <template v-else-if="row">
      <div class="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white">
            {{ row.title }}
          </h1>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {{ row.userByUserId?.name || 'Client' }} · {{ row.userByUserId?.email }}
          </p>
        </div>
        <StatusBadge :status="row.status" />
      </div>

      <div class="mt-8 grid gap-8 lg:grid-cols-3">
        <div class="space-y-8 lg:col-span-2">
          <section
            class="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-700 dark:bg-slate-800/80 dark:shadow-card-dark"
          >
            <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Description</h2>
            <p class="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
              {{ row.description }}
            </p>
            <div v-if="row.notes" class="mt-4 border-t border-slate-100 pt-4 dark:border-slate-700">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Client notes</h3>
              <p class="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                {{ row.notes }}
              </p>
            </div>
          </section>

          <section>
            <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Reference gallery</h2>
            <RequestGallery class="mt-3" :urls="imageUrls" alt-prefix="Reference" />
          </section>
        </div>

        <div class="space-y-6">
          <section
            class="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-700 dark:bg-slate-800/80 dark:shadow-card-dark"
          >
            <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Status</h2>
            <select
              v-model="statusLocal"
              class="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              :disabled="saving"
              @change="saveStatus"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </section>

          <section
            class="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-700 dark:bg-slate-800/80 dark:shadow-card-dark"
          >
            <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Reply to client</h2>
            <textarea
              v-model="messageLocal"
              rows="5"
              class="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              placeholder="Updates, questions, or delivery notes…"
            />
            <button
              type="button"
              class="mt-3 w-full rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              :disabled="saving"
              @click="saveMessage"
            >
              Save message
            </button>
          </section>

          <section
            class="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-700 dark:bg-slate-800/80 dark:shadow-card-dark"
          >
            <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Finished layout</h2>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              JPEG, PNG, WebP, or PDF — up to 20MB.
            </p>
            <label
              class="mt-3 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm font-medium text-indigo-600 hover:bg-slate-50 dark:border-slate-600 dark:text-indigo-400 dark:hover:bg-slate-900/50"
            >
              <input type="file" class="sr-only" accept="image/jpeg,image/png,image/webp,application/pdf" @change="onLayoutFile" />
              {{ saving ? 'Uploading…' : 'Upload or replace file' }}
            </label>
            <a
              v-if="row.responseByRequestId?.layoutFileUrl"
              :href="row.responseByRequestId.layoutFileUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-3 inline-flex text-sm font-medium text-indigo-600 dark:text-indigo-400"
            >
              Open current file →
            </a>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>
