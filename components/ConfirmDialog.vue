<script setup lang="ts">
const { open, options, resolve } = useConfirmDialog()
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open && options"
        class="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="'confirm-title'"
        @keydown.esc="resolve(false)"
      >
        <div
          class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-600 dark:bg-slate-900"
          @click.stop
        >
          <h2 id="confirm-title" class="font-display text-lg font-semibold text-slate-900 dark:text-white">
            {{ options.title }}
          </h2>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {{ options.message }}
          </p>
          <div class="mt-6 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              class="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              @click="resolve(false)"
            >
              {{ options.cancelLabel || 'Cancel' }}
            </button>
            <button
              type="button"
              class="rounded-xl px-4 py-2 text-sm font-medium text-white"
              :class="
                options.danger
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              "
              @click="resolve(true)"
            >
              {{ options.confirmLabel || 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
