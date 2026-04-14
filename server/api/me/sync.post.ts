export default defineEventHandler(async (event) => {
  const auth = await getAuthorizedSupabase(event)
  if (!auth?.user.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { user, client } = auth
  const meta = user.user_metadata as Record<string, string> | undefined
  const name =
    meta?.full_name ||
    meta?.name ||
    meta?.user_name ||
    user.email?.split('@')[0] ||
    'Client'

  const { data: existing } = await client
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (existing) {
    return { ok: true, created: false }
  }

  const { error } = await client.from('users').insert({
    id: user.id,
    email: user.email || '',
    name,
    role: 'client',
  })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { ok: true, created: true }
})
