/**
 * Reads/writes `requests.payment_proof_url` via Supabase REST so GraphQL stays
 * compatible if the column is missing (PostGraphile would reject unknown fields with HTTP 400).
 */
export function useRequestPaymentProof() {
  const supabase = useSupabaseClient()

  async function fetchProof(requestId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('requests')
      .select('payment_proof_url')
      .eq('id', requestId)
      .maybeSingle()
    if (error) return null
    const row = data as { payment_proof_url?: string | null } | null
    return row?.payment_proof_url ?? null
  }

  async function setProof(requestId: string, url: string | null) {
    const { error } = await supabase
      .from('requests')
      .update({ payment_proof_url: url })
      .eq('id', requestId)
    if (error) throw error
  }

  return { fetchProof, setProof }
}
