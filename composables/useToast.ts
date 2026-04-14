export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  message: string
  variant: ToastVariant
}

const toasts = ref<ToastItem[]>([])
let seq = 0

export function useToast() {
  function push(message: string, variant: ToastVariant = 'info') {
    const id = ++seq
    toasts.value = [...toasts.value, { id, message, variant }]
    const duration = variant === 'error' ? 6000 : 4000
    setTimeout(() => dismiss(id), duration)
    return id
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return { toasts, push, dismiss }
}
