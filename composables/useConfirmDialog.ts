export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

const open = ref(false)
const options = ref<ConfirmOptions | null>(null)
let resolver: ((v: boolean) => void) | null = null

export function useConfirmDialog() {
  function confirm(opts: ConfirmOptions): Promise<boolean> {
    options.value = opts
    open.value = true
    return new Promise((resolve) => {
      resolver = resolve
    })
  }

  function resolve(value: boolean) {
    open.value = false
    options.value = null
    resolver?.(value)
    resolver = null
  }

  return { open, options, confirm, resolve }
}
