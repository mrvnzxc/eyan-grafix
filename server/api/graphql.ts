import { callNodeListener } from 'h3'

/**
 * PostGraphile runs in-process on the same port as Nuxt (e.g. 3000). Requires DATABASE_URL + SUPABASE_JWT_SECRET.
 */
export default defineLazyEventHandler(() => {
  return defineEventHandler(async (event) => {
    const auth = await getAuthorizedSupabase(event)
    if (!auth?.accessToken) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const rc = useRuntimeConfig(event)
    const databaseUrl = String(rc.databaseUrl || '').trim()
    const supabaseJwtSecret = String(rc.supabaseJwtSecret || '').trim()
    const supabaseUrl = String(
      (rc.public as { supabase?: { url?: string } } | undefined)?.supabase?.url ?? '',
    ).trim()

    let pg: ReturnType<typeof getPostgraphileNodeHandler>
    try {
      pg = getPostgraphileNodeHandler({ databaseUrl, supabaseJwtSecret, supabaseUrl })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('PostGraphile init error:', msg)
      throw createError({
        statusCode: 503,
        statusMessage: msg,
      })
    }

    await callNodeListener(pg, event.node.req, event.node.res)
  })
})
