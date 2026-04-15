type GqlResponse<T> = { data?: T; errors?: { message: string }[] }

/** Serverless cold start + PostGraphile first query can exceed 30s on Vercel. */
const GRAPHQL_TIMEOUT_MS = 90_000

function graphqlErrorsMessage(errors: { message: string }[] | undefined) {
  if (!errors?.length) return 'GraphQL error'
  return errors.map((e) => e.message).join('; ')
}

function httpStatusFromError(e: unknown): number | undefined {
  if (!e || typeof e !== 'object') return undefined
  const sc = (e as { statusCode?: unknown }).statusCode
  return typeof sc === 'number' && !Number.isNaN(sc) ? sc : undefined
}

function serverMessageFromError(e: unknown): string | undefined {
  if (!e || typeof e !== 'object' || !('data' in e)) return undefined
  const d = (e as { data?: unknown }).data
  if (!d || typeof d !== 'object') return undefined
  const msg = (d as { message?: unknown }).message
  return typeof msg === 'string' && msg.trim() ? msg : undefined
}

function wrapNetworkError(e: unknown): Error {
  if (!(e instanceof Error)) return new Error(String(e))

  const status = httpStatusFromError(e)
  const serverMsg = serverMessageFromError(e)
  const m = e.message || ''
  const n = e.name

  if (status === 401) {
    const tail = serverMsg ? ` Details: ${serverMsg}` : ''
    return new Error(
      `GraphQL denied access (401).${tail} Try refreshing the page after sign-in so your session token is sent, or sign in again.`,
    )
  }
  if (status === 403) {
    const tail = serverMsg ? ` Details: ${serverMsg}` : ''
    return new Error(`GraphQL denied access (403).${tail} Your role may not allow this operation.`)
  }
  if (status === 503) {
    const tail = serverMsg ? ` Details: ${serverMsg}` : ''
    return new Error(
      `GraphQL is unavailable (503).${tail} Check Vercel function logs, DATABASE_URL (Session pooler), and SUPABASE_JWT_SECRET.`,
    )
  }
  if (status === 500) {
    const tail = serverMsg ? ` Details: ${serverMsg}` : ''
    return new Error(
      `GraphQL failed on the server (500).${tail} Check Vercel function logs for /api/graphql to see the root error.`,
    )
  }
  if (status === 504 || status === 502) {
    return new Error(
      `GraphQL did not finish in time (${status} from the edge). On Vercel this is often the serverless limit or a very slow first request. Retry once; if it persists, increase the function max duration and ensure DATABASE_URL uses the Supabase Session pooler (see README).`,
    )
  }

  const looksLikeClientAbort =
    n === 'AbortError' || (n === 'FetchError' && /\babort(ed)?\b/i.test(m) && /\bsignal\b/i.test(m))
  const looksLikeClientTimeout =
    n === 'AbortError' ||
    (/timed out\b|request timeout|ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT/i.test(m) &&
      !/\b504\b|Gateway Timeout|Bad Gateway|\b502\b/i.test(m))

  if (looksLikeClientAbort || looksLikeClientTimeout) {
    return new Error(
      'GraphQL request timed out before the server answered. On slow networks or cold starts, try again. On Windows / IPv4-only hosts, use the Supabase Session pooler URI for DATABASE_URL (Dashboard → Connect → Session pooler), not db.*.supabase.co. See README.',
    )
  }

  if (/fetch failed|ECONNREFUSED|ENOTFOUND|ECONNRESET/i.test(m)) {
    return new Error(
      'Cannot reach GraphQL. Check your connection, site URL, and that DATABASE_URL uses the Supabase Session pooler on Vercel. See README.',
    )
  }

  return e
}

export function useGraphql() {
  const api = useApiFetch()
  async function query<T>(document: string, variables?: Record<string, unknown>): Promise<T> {
    let res: GqlResponse<T>
    try {
      res = await api<GqlResponse<T>>('/api/graphql', {
        method: 'POST',
        body: { query: document, variables: variables ?? {} },
        timeout: GRAPHQL_TIMEOUT_MS,
      })
    } catch (e) {
      throw wrapNetworkError(e)
    }
    if (res.errors?.length) {
      throw new Error(graphqlErrorsMessage(res.errors))
    }
    if (res.data === undefined) {
      throw new Error('Empty GraphQL response')
    }
    return res.data
  }

  return { query }
}

/** PostGraphile operations — names match introspection for public schema tables. */
export function useRequestGraphql() {
  const { query } = useGraphql()

  async function getRequestsForUser(userId: string) {
    const gql = `
      query GetMyRequests($uid: UUID!) {
        allRequests(orderBy: CREATED_AT_DESC, condition: { userId: $uid }) {
          nodes {
            id
            title
            description
            notes
            status
            createdAt
            updatedAt
            userId
            userByUserId { id email name role }
          }
        }
      }
    `
    type Row = {
      id: string
      title: string
      description: string
      notes: string | null
      status: string
      createdAt: string
      updatedAt: string
      userId: string
      userByUserId: { id: string; email: string; name: string | null; role: string } | null
    }
    const data = await query<{ allRequests: { nodes: Row[] } }>(gql, { uid: userId })
    return data.allRequests.nodes
  }

  async function getRequests(filter?: { status?: string | null }) {
    const hasStatus = filter?.status != null && filter.status !== ''
    const gql = hasStatus
      ? `
      query GetRequests($status: String!) {
        allRequests(
          orderBy: CREATED_AT_DESC
          condition: { status: $status }
        ) {
          nodes {
            id
            title
            description
            notes
            status
            createdAt
            updatedAt
            userId
            userByUserId { id email name role }
          }
        }
      }`
      : `
      query GetRequestsAll {
        allRequests(orderBy: CREATED_AT_DESC) {
          nodes {
            id
            title
            description
            notes
            status
            createdAt
            updatedAt
            userId
            userByUserId { id email name role }
          }
        }
      }`
    type Row = {
      id: string
      title: string
      description: string
      notes: string | null
      status: string
      createdAt: string
      updatedAt: string
      userId: string
      userByUserId: { id: string; email: string; name: string | null; role: string } | null
    }
    const data = hasStatus
      ? await query<{ allRequests: { nodes: Row[] } }>(gql, { status: filter!.status })
      : await query<{ allRequests: { nodes: Row[] } }>(gql)
    return data.allRequests.nodes
  }

  async function getRequestById(id: string) {
    const gql = `
      query GetRequestById($id: UUID!) {
        requestById(id: $id) {
          id
          title
          description
          notes
          status
          createdAt
          updatedAt
          userId
          userByUserId { id email name role }
          requestImagesByRequestId {
            nodes { id imageUrl }
          }
          responseByRequestId {
            id
            ownerMessage
            layoutFileUrl
            createdAt
          }
        }
      }
    `
    type D = {
      requestById: {
        id: string
        title: string
        description: string
        notes: string | null
        status: string
        createdAt: string
        updatedAt: string
        userId: string
        userByUserId: { id: string; email: string; name: string | null; role: string } | null
        requestImagesByRequestId: { nodes: { id: string; imageUrl: string }[] }
        responseByRequestId: {
          id: string
          ownerMessage: string | null
          layoutFileUrl: string | null
          createdAt: string
        } | null
      } | null
    }
    const data = await query<D>(gql, { id })
    return data.requestById
  }

  async function createRequest(input: {
    userId: string
    title: string
    description: string
    notes?: string | null
  }) {
    const gql = `
      mutation CreateRequest($input: CreateRequestInput!) {
        createRequest(input: $input) {
          request { id }
        }
      }
    `
    const data = await query<{
      createRequest: { request: { id: string } | null } | null
    }>(gql, {
      input: {
        request: {
          userId: input.userId,
          title: input.title,
          description: input.description,
          notes: input.notes ?? null,
          status: 'pending',
        },
      },
    })
    const rid = data.createRequest?.request?.id
    if (!rid) throw new Error('createRequest failed')
    return rid
  }

  async function createRequestImages(requestId: string, urls: string[]) {
    const gql = `
      mutation CreateRequestImage($input: CreateRequestImageInput!) {
        createRequestImage(input: $input) {
          requestImage { id }
        }
      }
    `
    for (const imageUrl of urls) {
      await query(gql, {
        input: {
          requestImage: { requestId, imageUrl },
        },
      })
    }
  }

  async function updateStatus(requestId: string, status: string) {
    const gql = `
      mutation UpdateStatus($id: UUID!, $patch: RequestPatch!) {
        updateRequestById(input: { id: $id, patch: $patch }) {
          request { id status }
        }
      }
    `
    await query(gql, { id: requestId, patch: { status } })
  }

  async function sendResponse(input: {
    requestId: string
    ownerMessage?: string | null
    layoutFileUrl?: string | null
  }) {
    const existing = await getRequestById(input.requestId)
    const gqlCreate = `
      mutation CreateResponse($input: CreateResponseInput!) {
        createResponse(input: $input) {
          response { id }
        }
      }
    `
    const gqlUpdate = `
      mutation UpdateResponse($id: UUID!, $patch: ResponsePatch!) {
        updateResponseById(input: { id: $id, patch: $patch }) {
          response { id }
        }
      }
    `
    if (existing?.responseByRequestId?.id) {
      await query(gqlUpdate, {
        id: existing.responseByRequestId.id,
        patch: {
          ownerMessage: input.ownerMessage ?? existing.responseByRequestId.ownerMessage,
          layoutFileUrl:
            input.layoutFileUrl ?? existing.responseByRequestId.layoutFileUrl,
        },
      })
      return
    }
    await query(gqlCreate, {
      input: {
        response: {
          requestId: input.requestId,
          ownerMessage: input.ownerMessage ?? null,
          layoutFileUrl: input.layoutFileUrl ?? null,
        },
      },
    })
  }

  return {
    getRequests,
    getRequestsForUser,
    getRequestById,
    createRequest,
    createRequestImages: async (requestId: string, urls: string[]) => {
      await createRequestImages(requestId, urls)
    },
    updateStatus,
    sendResponse,
  }
}
