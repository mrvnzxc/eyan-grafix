<script setup lang="ts">
import { useApiFetch } from '~/composables/useApiFetch'
import { validatePaymentProofFile } from '~/utils/files'

definePageMeta({ layout: 'default', middleware: ['auth'] })

const route = useRoute()
const id = computed(() => route.params.id as string)
const gql = useRequestGraphql()
const toast = useToast()
const user = useSupabaseUser()
const supabase = useSupabaseClient()
const api = useApiFetch()
const paymentProof = useRequestPaymentProof()
const notif = useNotifications()

const loading = ref(true)
const savingProof = ref(false)
const row = ref<Awaited<ReturnType<ReturnType<typeof useRequestGraphql>['getRequestById']>>>(null)
const paymentProofUrl = ref<string | null>(null)

async function load() {
  loading.value = true
  try {
    row.value = await gql.getRequestById(id.value)
    if (!row.value) {
      paymentProofUrl.value = null
      toast.push('Request not found.', 'error')
    } else {
      paymentProofUrl.value = await paymentProof.fetchProof(row.value.id)
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

async function uploadPaymentProofFile(requestId: string, file: File): Promise<string> {
  const uid = user.value?.id
  if (!uid) throw new Error('Not signed in')
  const path = `${uid}/${requestId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, '_')}`
  const { error } = await supabase.storage.from('payment-screenshots').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  })
  if (error) throw error
  const { data } = supabase.storage.from('payment-screenshots').getPublicUrl(path)
  const url = data?.publicUrl
  if (!url) throw new Error('No public URL for payment screenshot')
  return url
}

async function onPaymentProofChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !row.value) return

  const err = validatePaymentProofFile(file)
  if (err) {
    toast.push(err, 'error')
    return
  }

  savingProof.value = true
  try {
    await api('/api/me/sync', { method: 'POST' })
    const proofUrl = await uploadPaymentProofFile(row.value.id, file)
    await paymentProof.setProof(row.value.id, proofUrl)
    toast.push('Payment screenshot saved.', 'success')
    await notif.refresh()
    await load()
  } catch (e: unknown) {
    toast.push(e instanceof Error ? e.message : 'Upload failed', 'error')
  } finally {
    savingProof.value = false
  }
}
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
        <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Summary</h2>
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

      <p
        v-if="!row.responseByRequestId"
        class="mt-8 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-300"
      >
        When the studio posts a reply here with your total and how to pay, GCash and payment screenshot upload will
        appear below.
      </p>

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
        <p
          v-else
          class="mt-2 text-sm text-slate-500 dark:text-slate-400"
        >
          (No written message — check below for payment or a layout file.)
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

      <template v-if="row.responseByRequestId">
        <GcashPaymentCard
          class="mt-8"
          :intro="'Follow the amount and instructions in the studio message above, then pay with GCash and upload your screenshot here.'"
        />

        <section
          class="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-700 dark:bg-slate-800/80 dark:shadow-card-dark"
        >
          <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Payment screenshot</h2>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Upload or replace your GCash payment proof for this request.
          </p>
          <a
            v-if="paymentProofUrl"
            :href="paymentProofUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-3 inline-flex text-sm font-medium text-indigo-600 dark:text-indigo-400"
          >
            View current screenshot →
          </a>
          <label
            class="mt-3 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 py-4 text-sm font-medium text-indigo-600 hover:bg-slate-50 dark:border-slate-600 dark:text-indigo-400 dark:hover:bg-slate-900/50"
            :class="savingProof ? 'pointer-events-none opacity-60' : ''"
          >
            <input
              type="file"
              class="sr-only"
              accept="image/jpeg,image/png,image/webp,image/gif"
              :disabled="savingProof"
              @change="onPaymentProofChange"
            />
            {{ savingProof ? 'Uploading…' : paymentProofUrl ? 'Replace screenshot' : 'Upload screenshot' }}
          </label>
        </section>
      </template>
    </template>
  </div>
</template>
