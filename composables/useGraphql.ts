type GqlResponse<T> = { data?: T; errors?: { message: string }[] }

const GRAPHQL_TIMEOUT_MS = 30_000

function graphqlErrorsMessage(errors: { message: string }[] | undefined) {
  if (!errors?.length) return 'GraphQL error'
  return errors.map((e) => e.message).join('; ')
}

function wrapNetworkError(e: unknown): Error {
  if (!(e instanceof Error)) return new Error(String(e))
  const m = e.message || ''
  const n = e.name
  if (
    n === 'AbortError' ||
    n === 'FetchError' ||
    /aborted|timeout|timed out|signal/i.test(m)
  ) {
    return new Error(
      'GraphQL timed out. On Windows or IPv4-only networks, set DATABASE_URL to the Supabase Session pooler URI (Dashboard → Connect → Session pooler), not db.*.supabase.co. See README.',
    )
  }
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|502|503|504/i.test(m)) {
    return new Error(
      'Cannot reach the database / GraphQL. Use Connect → Session pooler in Supabase and paste that URI as DATABASE_URL. See README.',
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
