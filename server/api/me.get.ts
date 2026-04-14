export default defineEventHandler(async (event) => {
  const auth = await getAuthorizedSupabase(event)
  if (!auth?.user.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { data, error } = await auth.client
    .from('users')
    .select('id, email, name, role, created_at')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return data
})
