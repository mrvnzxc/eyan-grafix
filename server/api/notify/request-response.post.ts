type Body = { requestId?: string }

/**
 * Owner-only: notify the client by email after posting a reply / delivery update.
 * Set RESEND_API_KEY (and optionally NUXT_EMAIL_FROM) in .env — see .env.example.
 */
export default defineEventHandler(async (event) => {
  const auth = await getAuthorizedSupabase(event)
  if (!auth?.user.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { client } = auth
  const { data: me, error: meErr } = await client.from('users').select('role').eq('id', auth.user.id).maybeSingle()
  if (meErr || me?.role !== 'owner') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = (await readBody(event).catch(() => ({}))) as Body
  const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : ''
  if (!requestId) {
    throw createError({ statusCode: 400, statusMessage: 'requestId required' })
  }

  const { data: req, error: reqErr } = await client
    .from('requests')
    .select('id, title, user_id')
    .eq('id', requestId)
    .maybeSingle()

  if (reqErr || !req) {
    throw createError({ statusCode: 404, statusMessage: 'Request not found' })
  }

  const { data: clientUser, error: uErr } = await client
    .from('users')
    .select('email, name')
    .eq('id', req.user_id)
    .maybeSingle()

  if (uErr || !clientUser?.email) {
    throw createError({ statusCode: 500, statusMessage: 'Could not load client email' })
  }

  const rc = useRuntimeConfig(event)
  const resendKey = String(rc.resendApiKey || '').trim()
  const from = String(rc.emailFrom || '').trim() || 'EyanGraFix <onboarding@resend.dev>'
  const siteUrl = String(rc.public?.siteUrl || '').replace(/\/$/, '') || 'http://localhost:3000'

  const { data: resp } = await client
    .from('responses')
    .select('owner_message, layout_file_url')
    .eq('request_id', requestId)
    .maybeSingle()

  const msg = (resp as { owner_message?: string | null } | null)?.owner_message?.trim() || ''
  const hasLayout = !!(resp as { layout_file_url?: string | null } | null)?.layout_file_url

  if (!msg && !hasLayout) {
    console.info('[notify/request-response] No message or layout yet; skipping email.')
    return { ok: true, emailed: false, reason: 'empty_response' }
  }

  if (!resendKey) {
    console.info('[notify/request-response] RESEND_API_KEY not set; skipping email.')
    return { ok: true, emailed: false, reason: 'no_resend_key' }
  }

  const link = `${siteUrl}/my-requests/${requestId}`

  const subject = `Update on your request: ${req.title}`
  const text = [
    `Hi${clientUser.name ? ` ${clientUser.name}` : ''},`,
    '',
    'The studio has posted an update on your layout request.',
    msg ? `\nMessage from the studio:\n${msg}\n` : '',
    hasLayout ? '\nA finished layout file is available on your request page.\n' : '',
    `Open your request: ${link}`,
    '',
    '— EyanGraFix',
  ].join('\n')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [clientUser.email],
      subject,
      text,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    console.error('[notify/request-response] Resend error:', res.status, errText)
    return { ok: true, emailed: false, reason: 'resend_http_error' }
  }

  return { ok: true, emailed: true }
})
