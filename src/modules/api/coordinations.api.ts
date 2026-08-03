import type { CoordinationSummary } from '@/modules/situations/types/situation.types'
import { apiRequest } from '@/shared/api/http'

export interface CoordinationDependencyResponse {
  id: string
  sourceCoordinationId: string
  targetCoordinationId: string
  dependencyWeight: number
  dependencyType: string
  bidirectional: boolean
}

export interface CoordinationGraphResponse {
  coordinations: CoordinationSummary[]
  dependencies: CoordinationDependencyResponse[]
}

export type NetworkStatusLevel = 'stable' | 'attention' | 'critical'

export interface CoordinationNetworkStatusResponse {
  networkStatus: NetworkStatusLevel
  globalRiskScore: number
  activeIncidentsCount: number
  coordinationsCount: number
  synchronizedCoordinationsCount: number
  lastSynchronizedAt: string
}

export async function fetchCoordinations(
  includeInactive = false,
  options?: { catalog?: boolean },
): Promise<CoordinationSummary[]> {
  const params = new URLSearchParams()
  if (includeInactive) params.set('includeInactive', 'true')
  if (options?.catalog) params.set('catalog', 'true')
  const query = params.toString() ? `?${params.toString()}` : ''
  return apiRequest<CoordinationSummary[]>(`/coordinations${query}`)
}

export async function fetchCoordinationGraph(): Promise<CoordinationGraphResponse> {
  return apiRequest<CoordinationGraphResponse>('/coordinations/graph')
}

export async function fetchCoordinationNetworkStatus(): Promise<CoordinationNetworkStatusResponse> {
  return apiRequest<CoordinationNetworkStatusResponse>(
    '/coordinations/network-status',
  )
}
