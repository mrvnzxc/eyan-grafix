<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: ['client-only'] })

const toast = useToast()
const user = useSupabaseUser()
const supabase = useSupabaseClient()
const api = useApiFetch()
const gql = useRequestGraphql()

const title = ref('')
const description = ref('')
const notes = ref('')
const submitting = ref(false)
const uploadProgress = ref({ current: 0, total: 0 })

const uploaderRef = ref<{ getFiles: () => File[]; clear: () => void } | null>(null)

async function uploadReferenceImages(requestId: string, files: File[]): Promise<string[]> {
  const uid = user.value?.id
  if (!uid) throw new Error('Not signed in')

  const urls: string[] = []
  uploadProgress.value = { current: 0, total: files.length }

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!
    const path = `${uid}/${requestId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, '_')}`
    const { error } = await supabase.storage.from('reference-images').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })
    if (error) throw error
    const { data } = supabase.storage.from('reference-images').getPublicUrl(path)
    if (data?.publicUrl) urls.push(data.publicUrl)
    uploadProgress.value = { current: i + 1, total: files.length }
  }

  return urls
}

async function onSubmit() {
  if (!title.value.trim()) {
    toast.push('Please enter a title.', 'error')
    return
  }
  if (!description.value.trim()) {
    toast.push('Please describe your layout request.', 'error')
    return
  }

  const files = uploaderRef.value?.getFiles() ?? []

  submitting.value = true
  uploadProgress.value = { current: 0, total: 0 }

  try {
    await api('/api/me/sync', { method: 'POST' })
    const uid = user.value?.id
    if (!uid) throw new Error('Not signed in')

    const requestId = await gql.createRequest({
      userId: uid,
      title: title.value.trim(),
      description: description.value.trim(),
      notes: notes.value.trim() || null,
    })

    if (files.length) {
      const urls = await uploadReferenceImages(requestId, files)
      if (urls.length) await gql.createRequestImages(requestId, urls)
    }

    uploaderRef.value?.clear()
    toast.push('Request submitted.', 'success')
    await navigateTo({ path: '/submit/success', query: { id: requestId } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Something went wrong.'
    toast.push(msg, 'error')
  } finally {
    submitting.value = false
    uploadProgress.value = { current: 0, total: 0 }
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-10 md:px-6">
    <h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white">
      New layout request
    </h1>
    <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
      Share your brief and reference images. We will follow up through your request thread.
    </p>

    <form class="mt-8 space-y-6" @submit.prevent="onSubmit">
      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-200" for="title">
          Title <span class="text-red-500">*</span>
        </label>
        <input
          id="title"
          v-model="title"
          type="text"
          required
          class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          placeholder="e.g. Event poster — spring campaign"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-200" for="desc">
          Description <span class="text-red-500">*</span>
        </label>
        <textarea
          id="desc"
          v-model="description"
          required
          rows="6"
          class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          placeholder="Dimensions, brand guidelines, tone, deliverables, deadlines…"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-200" for="notes">
          Optional notes
        </label>
        <textarea
          id="notes"
          v-model="notes"
          rows="3"
          class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          placeholder="Anything else we should know"
        />
      </div>

      <div>
        <p class="text-sm font-medium text-slate-700 dark:text-slate-200">Reference images</p>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Optional — add as many as you need. Drag in, browse, or paste screenshots.
        </p>
        <ImageUploader ref="uploaderRef" class="mt-3" :disabled="submitting" />
      </div>

      <div
        v-if="uploadProgress.total > 0"
        class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-600 dark:bg-slate-800"
      >
        <div class="flex justify-between text-xs text-slate-600 dark:text-slate-300">
          <span>Uploading images</span>
          <span>{{ uploadProgress.current }} / {{ uploadProgress.total }}</span>
        </div>
        <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            class="h-full rounded-full bg-indigo-600 transition-all duration-300 dark:bg-indigo-500"
            :style="{
              width:
                uploadProgress.total > 0
                  ? `${(uploadProgress.current / uploadProgress.total) * 100}%`
                  : '0%',
            }"
          />
        </div>
      </div>

      <div class="flex flex-wrap gap-3">
        <button
          type="submit"
          class="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          :disabled="submitting"
        >
          {{ submitting ? 'Submitting…' : 'Submit request' }}
        </button>
        <NuxtLink
          to="/my-requests"
          class="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Cancel
        </NuxtLink>
      </div>
    </form>
  </div>
</template>
