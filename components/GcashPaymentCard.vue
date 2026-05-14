<script setup lang="ts">
import { GCASH_NUMBER, GCASH_QR_DOWNLOAD_NAME, GCASH_QR_PUBLIC_PATH } from '~/utils/gcash'

withDefaults(
  defineProps<{
    compact?: boolean
    /** When set, replaces the default helper text under the title */
    intro?: string
  }>(),
  { compact: false, intro: '' },
)

const toast = useToast()

async function copyNumber() {
  try {
    await navigator.clipboard.writeText(GCASH_NUMBER)
    toast.push('GCash number copied.', 'success')
  } catch {
    toast.push('Could not copy — select the number manually.', 'error')
  }
}
</script>

<template>
  <section
    class="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/30"
    :class="compact ? 'p-4' : 'p-5'"
  >
    <h2 class="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Pay with GCash</h2>
    <p v-if="intro" class="mt-1 text-xs text-emerald-800/90 dark:text-emerald-200/80">
      {{ intro }}
    </p>
    <template v-else>
      <p v-if="!compact" class="mt-1 text-xs text-emerald-800/90 dark:text-emerald-200/80">
        Scan the QR or send to the number below, then upload your payment screenshot for this request.
      </p>
      <p v-else class="mt-1 text-xs text-emerald-800/90 dark:text-emerald-200/80">
        Scan, download the QR, or copy the number to pay.
      </p>
    </template>

    <div class="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
      <div class="shrink-0 rounded-xl border border-white bg-white p-2 shadow-sm dark:border-emerald-900 dark:bg-slate-900">
        <img
          :src="GCASH_QR_PUBLIC_PATH"
          alt="GCash QR code"
          :class="compact ? 'h-32 w-32 object-contain' : 'h-40 w-40 object-contain md:h-44 md:w-44'"
          width="176"
          height="176"
        />
      </div>
      <div class="flex w-full min-w-0 flex-1 flex-col gap-2">
        <a
          :href="GCASH_QR_PUBLIC_PATH"
          :download="GCASH_QR_DOWNLOAD_NAME"
          class="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-emerald-700 sm:w-auto"
        >
          Download QR image
        </a>
        <div class="rounded-xl border border-emerald-200/80 bg-white/90 px-3 py-2 dark:border-emerald-800 dark:bg-slate-900/80">
          <p class="text-[10px] font-medium uppercase tracking-wide text-emerald-700/80 dark:text-emerald-300/80">
            GCash number
          </p>
          <p class="select-all font-mono text-base font-semibold text-slate-900 dark:text-white">
            {{ GCASH_NUMBER }}
          </p>
        </div>
        <button
          type="button"
          class="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-100 dark:hover:bg-emerald-950/50"
          @click="copyNumber"
        >
          Copy number
        </button>
      </div>
    </div>
  </section>
</template>
