import { getHeader } from 'h3'
import type { H3Event } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import { serverSupabaseSession } from '#supabase/server'

/**
 * Access token from Authorization: Bearer (client with useSsrCookies: false) or from SSR cookies.
 */
export async function getAccessTokenFromEvent(event: H3Event): Promise<string | null> {
  const auth = getHeader(event, 'authorization') || getHeader(event, 'Authorization')
  if (auth?.startsWith('Bearer ')) {
    const t = auth.slice(7).trim()
    if (t) return t
  }
  try {
    const session = await serverSupabaseSession(event)
    if (session?.access_token) return session.access_token
  } catch {
    /* no cookie session */
  }
  return null
}

export type AuthorizedSupabase = {
  user: User
  accessToken: string
  client: ReturnType<typeof createClient>
}

/**
 * Validates JWT with Supabase and returns a PostgREST client scoped to that user (RLS).
 */
export async function getAuthorizedSupabase(event: H3Event): Promise<AuthorizedSupabase | null> {
  const accessToken = await getAccessTokenFromEvent(event)
  if (!accessToken) return null

  const config = useRuntimeConfig(event)
  const url = config.public.supabase?.url as string | undefined
  const key = config.public.supabase?.key as string | undefined
  if (!url || !key) return null

  const client = createClient(url, key, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  })

  const { data: { user }, error } = await client.auth.getUser(accessToken)
  if (error || !user?.id) return null

  return { user, accessToken, client }
}
