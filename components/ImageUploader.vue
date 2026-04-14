<script setup lang="ts">
import { validateImageFile } from '~/utils/files'

const props = withDefaults(
  defineProps<{
    maxFiles?: number
    disabled?: boolean
  }>(),
  { maxFiles: 12, disabled: false },
)

const dragOver = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

type Item = { file: File; preview: string; error?: string }
const items = ref<Item[]>([])

function getFiles(): File[] {
  return items.value.filter((i) => !i.error).map((i) => i.file)
}

function clear() {
  items.value.forEach((i) => URL.revokeObjectURL(i.preview))
  items.value = []
}

function addFiles(fileList: FileList | File[]) {
  const arr = Array.from(fileList)
  const next = [...items.value]
  for (const file of arr) {
    if (next.length >= props.maxFiles) break
    const err = validateImageFile(file)
    const preview = URL.createObjectURL(file)
    next.push({ file, preview, error: err || undefined })
  }
  items.value = next
}

function removeAt(index: number) {
  const [removed] = items.value.splice(index, 1)
  if (removed) URL.revokeObjectURL(removed.preview)
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  if (props.disabled) return
  const dt = e.dataTransfer
  if (dt?.files?.length) addFiles(dt.files)
}

function onPaste(e: ClipboardEvent) {
  if (props.disabled) return
  const files = e.clipboardData?.files
  if (files?.length) addFiles(files)
}

function onFileInput(e: Event) {
  const t = e.target as HTMLInputElement
  if (t.files?.length) addFiles(t.files)
  t.value = ''
}

onBeforeUnmount(() => {
  items.value.forEach((i) => URL.revokeObjectURL(i.preview))
})

defineExpose({ getFiles, clear })
</script>

<template>
  <div
    class="space-y-3"
    @dragover.prevent="dragOver = true"
    @dragleave.prevent="dragOver = false"
    @drop="onDrop"
    @paste="onPaste"
  >
    <button
      type="button"
      class="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 text-center transition"
      :class="
        dragOver
          ? 'border-indigo-500 bg-indigo-50/80 dark:border-indigo-400 dark:bg-indigo-950/30'
          : 'border-slate-200 bg-slate-50/50 hover:border-indigo-300 dark:border-slate-600 dark:bg-slate-800/40 dark:hover:border-indigo-500/50'
      "
      :disabled="disabled"
      @click="!disabled && inputRef?.click()"
    >
      <span class="text-2xl" aria-hidden="true">📎</span>
      <p class="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">
        Drag & drop images here, or click to browse
      </p>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        JPEG, PNG, WebP, GIF — up to {{ maxFiles }} files, 8MB each. Paste from clipboard works too.
      </p>
      <input
        ref="inputRef"
        type="file"
        class="sr-only"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        :disabled="disabled"
        @change="onFileInput"
      />
    </button>

    <div v-if="items.length" class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      <div
        v-for="(item, index) in items"
        :key="item.preview"
        class="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-600 dark:bg-slate-900"
      >
        <img
          :src="item.preview"
          :alt="item.file.name"
          class="h-full w-full object-cover"
        />
        <button
          type="button"
          class="absolute right-2 top-2 rounded-lg bg-black/50 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100"
          :disabled="disabled"
          @click="removeAt(index)"
        >
          Remove
        </button>
        <p
          v-if="item.error"
          class="absolute inset-x-0 bottom-0 bg-red-600/90 px-2 py-1 text-[10px] leading-tight text-white"
        >
          {{ item.error }}
        </p>
      </div>
    </div>
  </div>
</template>
