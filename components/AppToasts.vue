<script setup lang="ts">
const { toasts, dismiss } = useToast()
</script>

<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur"
          :class="{
            'border-emerald-200 bg-emerald-50/95 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-50':
              t.variant === 'success',
            'border-red-200 bg-red-50/95 text-red-900 dark:border-red-900 dark:bg-red-950/90 dark:text-red-50':
              t.variant === 'error',
            'border-slate-200 bg-white/95 text-slate-900 dark:border-slate-600 dark:bg-slate-800/95 dark:text-slate-50':
              t.variant === 'info',
          }"
        >
          <p class="flex-1 text-sm">{{ t.message }}</p>
          <button
            type="button"
            class="text-xs opacity-70 hover:opacity-100"
            @click="dismiss(t.id)"
          >
            ✕
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
