import type { CoordinationSummary } from '@/modules/situations/types/situation.types'
import { apiRequest } from '@/shared/api/http'

export async function fetchCoordinations(
  includeInactive = false,
): Promise<CoordinationSummary[]> {
  const query = includeInactive ? '?includeInactive=true' : ''
  return apiRequest<CoordinationSummary[]>(`/coordinations${query}`)
}
