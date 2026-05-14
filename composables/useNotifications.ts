export type NotificationType =
  | 'new_request'
  | 'studio_reply'
  | 'payment_proof'
  | 'request_completed'
  | 'request_in_progress'

export type UserNotificationRow = {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  request_id: string | null
  actor_user_id: string | null
  actor_name: string | null
  read_at: string | null
  created_at: string
}

export function useNotifications() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const unreadCount = useState<number>('egf-notifications-unread', () => 0)

  async function refresh() {
    const uid = user.value?.id
    if (!uid) {
      unreadCount.value = 0
      return
    }
    const { count, error } = await supabase
      .from('user_notifications')
      .select('*', { head: true, count: 'exact' })
      .eq('user_id', uid)
      .is('read_at', null)

    if (error) {
      console.warn('[notifications] unread count:', error.message)
      return
    }
    unreadCount.value = count ?? 0
  }

  async function fetchRecent(limit = 8): Promise<UserNotificationRow[]> {
    const uid = user.value?.id
    if (!uid) return []
    const { data, error } = await supabase
      .from('user_notifications')
      .select(
        'id, user_id, type, title, body, request_id, actor_user_id, actor_name, read_at, created_at',
      )
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.warn('[notifications] list:', error.message)
      return []
    }
    return (data ?? []) as UserNotificationRow[]
  }

  async function markRead(id: string) {
    const uid = user.value?.id
    if (!uid) return
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('user_notifications')
      .update({ read_at: now })
      .eq('id', id)
      .eq('user_id', uid)
    if (error) console.warn('[notifications] markRead:', error.message)
    await refresh()
  }

  async function markAllRead() {
    const uid = user.value?.id
    if (!uid) return
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('user_notifications')
      .update({ read_at: now })
      .eq('user_id', uid)
      .is('read_at', null)
    if (error) console.warn('[notifications] markAllRead:', error.message)
    await refresh()
  }

  return {
    unreadCount,
    refresh,
    fetchRecent,
    markRead,
    markAllRead,
  }
}

export function notificationHref(row: UserNotificationRow, role: string | undefined) {
  const rid = row.request_id
  if (!rid) return '/'
  if (role === 'owner') return `/dashboard/request/${rid}`
  return `/my-requests/${rid}`
}
