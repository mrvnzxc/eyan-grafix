<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import {
  useNotifications,
  notificationHref,
  type UserNotificationRow,
} from '~/composables/useNotifications'

const props = withDefaults(
  defineProps<{
    displayName: string
    role: string
    /** Sidebar: open menu to the left so it is not clipped */
    dropdownAlign?: 'left' | 'right'
  }>(),
  { dropdownAlign: 'right' },
)

const dropdownPanelClass = computed(() =>
  props.dropdownAlign === 'left'
    ? 'left-0 origin-top-left'
    : 'right-0 origin-top-right',
)

const { unreadCount, refresh, fetchRecent, markRead, markAllRead } = useNotifications()
const user = useSupabaseUser()

const dropdownOpen = ref(false)
const modalOpen = ref(false)
const preview = ref<UserNotificationRow[]>([])
const modalList = ref<UserNotificationRow[]>([])
const loadingPreview = ref(false)
const loadingModal = ref(false)

const rootRef = ref<HTMLElement | null>(null)

onClickOutside(rootRef, () => {
  dropdownOpen.value = false
})

let intervalId: ReturnType<typeof setInterval> | undefined

function onWinFocus() {
  void refresh()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    modalOpen.value = false
    dropdownOpen.value = false
  }
}

onMounted(() => {
  void refresh()
  intervalId = setInterval(() => void refresh(), 45_000)
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', onWinFocus)
    document.addEventListener('keydown', onKeydown)
  }
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
  if (typeof window !== 'undefined') {
    window.removeEventListener('focus', onWinFocus)
    document.removeEventListener('keydown', onKeydown)
  }
})

watch(
  () => user.value?.id,
  () => void refresh(),
)

watch(
  () => useRoute().fullPath,
  () => {
    dropdownOpen.value = false
    void refresh()
  },
)

const badgeText = computed(() => {
  const n = unreadCount.value
  if (n <= 0) return ''
  if (n > 99) return '99+'
  return String(n)
})

async function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value
  if (!dropdownOpen.value) return
  loadingPreview.value = true
  await refresh()
  preview.value = await fetchRecent(6)
  loadingPreview.value = false
}

async function openModalFromDropdown() {
  dropdownOpen.value = false
  modalOpen.value = true
  loadingModal.value = true
  modalList.value = await fetchRecent(80)
  loadingModal.value = false
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return ''
  }
}

async function onRowClick(row: UserNotificationRow) {
  const href = notificationHref(row, props.role)
  if (!row.read_at) await markRead(row.id)
  modalOpen.value = false
  await navigateTo(href)
}

async function onPreviewClick(row: UserNotificationRow) {
  await onRowClick(row)
}

function closeModal() {
  modalOpen.value = false
}

async function onMarkAllRead() {
  await markAllRead()
  modalList.value = await fetchRecent(80)
}
</script>

<template>
  <div ref="rootRef" class="relative flex shrink-0 items-center">
    <button
      type="button"
      class="relative rounded-full p-1.5 text-slate-600 outline-none ring-offset-2 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:ring-offset-slate-900"
      aria-label="Notifications"
      :aria-expanded="dropdownOpen"
      @click="toggleDropdown"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        class="h-7 w-7"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.743 9.743 0 0 0 12 21.75a9.743 9.743 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15a7.486 7.486 0 0 1 5.855 2.812A8.224 8.224 0 0 1 12 20.25a8.224 8.224 0 0 1-5.855-2.438ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
          clip-rule="evenodd"
        />
      </svg>
      <span
        v-if="badgeText"
        class="absolute -right-0.5 -top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white"
      >
        {{ badgeText }}
      </span>
    </button>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-show="dropdownOpen"
        :class="[
          'absolute top-full z-[60] mt-2 w-[min(100vw-2rem,20rem)] rounded-2xl border border-slate-200 bg-white py-3 shadow-xl dark:border-slate-600 dark:bg-slate-900',
          dropdownPanelClass,
        ]"
        role="menu"
      >
        <div class="border-b border-slate-100 px-4 pb-3 dark:border-slate-700">
          <p class="text-sm font-semibold text-slate-900 dark:text-white">
            {{ displayName }}
          </p>
          <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            <span v-if="unreadCount > 0">{{ unreadCount }} unread</span>
            <span v-else>No new notifications</span>
          </p>
        </div>

        <div class="max-h-64 overflow-y-auto px-2 py-2">
          <p v-if="loadingPreview" class="px-2 py-4 text-center text-xs text-slate-500">Loading…</p>
          <template v-else-if="preview.length">
            <button
              v-for="row in preview"
              :key="row.id"
              type="button"
              class="flex w-full flex-col gap-0.5 rounded-xl px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
              :class="row.read_at ? 'opacity-70' : ''"
              @click="onPreviewClick(row)"
            >
              <span class="text-xs font-medium text-slate-900 dark:text-white">{{ row.title }}</span>
              <span v-if="row.actor_name" class="text-[11px] text-indigo-600 dark:text-indigo-400">
                {{ row.actor_name }}
              </span>
              <span v-if="row.body" class="line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                {{ row.body }}
              </span>
              <span class="text-[10px] text-slate-400">{{ formatTime(row.created_at) }}</span>
            </button>
          </template>
          <p v-else class="px-3 py-4 text-center text-xs text-slate-500">No notifications yet.</p>
        </div>

        <div class="border-t border-slate-100 px-3 pt-2 dark:border-slate-700">
          <button
            type="button"
            class="w-full rounded-xl bg-indigo-600 py-2 text-center text-xs font-semibold text-white hover:bg-indigo-700"
            @click="openModalFromDropdown"
          >
            View all notifications
          </button>
        </div>
      </div>
    </Transition>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="modalOpen"
          class="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="notif-modal-title"
          @click.self="closeModal"
        >
          <div
            class="flex max-h-[min(85vh,32rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-900"
            @click.stop
          >
            <div class="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-700">
              <div>
                <h2 id="notif-modal-title" class="font-display text-lg font-semibold text-slate-900 dark:text-white">
                  Notifications
                </h2>
                <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {{ unreadCount > 0 ? `${unreadCount} unread` : 'All caught up' }}
                </p>
              </div>
              <div class="flex shrink-0 gap-2">
                <button
                  v-if="unreadCount > 0"
                  type="button"
                  class="rounded-lg px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
                  @click="onMarkAllRead"
                >
                  Mark all read
                </button>
                <button
                  type="button"
                  class="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Close"
                  @click="closeModal"
                >
                  <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path
                      fill-rule="evenodd"
                      d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              <p v-if="loadingModal" class="py-8 text-center text-sm text-slate-500">Loading…</p>
              <ul v-else-if="modalList.length" class="space-y-1">
                <li v-for="row in modalList" :key="row.id">
                  <button
                    type="button"
                    class="flex w-full flex-col gap-0.5 rounded-xl border border-transparent px-3 py-3 text-left hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-600 dark:hover:bg-slate-800/80"
                    :class="row.read_at ? 'opacity-75' : 'border-indigo-100 bg-indigo-50/50 dark:border-indigo-900/40 dark:bg-indigo-950/20'"
                    @click="onRowClick(row)"
                  >
                    <span class="text-sm font-medium text-slate-900 dark:text-white">{{ row.title }}</span>
                    <span v-if="row.actor_name" class="text-xs text-indigo-600 dark:text-indigo-400">
                      {{ row.actor_name }}
                    </span>
                    <span v-if="row.body" class="text-xs text-slate-600 dark:text-slate-300">{{ row.body }}</span>
                    <span class="text-[10px] text-slate-400">{{ formatTime(row.created_at) }}</span>
                  </button>
                </li>
              </ul>
              <p v-else class="py-8 text-center text-sm text-slate-500">No notifications yet.</p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
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
