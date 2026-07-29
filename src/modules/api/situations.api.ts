import type {
  CreateSituationPayload,
  IncidentCategorySummary,
  SituationResponse,
} from '@/modules/situations/types/situation.types'
import { apiRequest } from '@/shared/api/http'

export interface SituationsListQuery {
  status?: string
  severity?: string
  coordinationId?: string
  categoryId?: string
  occurredFrom?: string
  occurredTo?: string
  page?: number
  limit?: number
}

export interface SituationsListResponse {
  items: SituationResponse[]
  total: number
  page: number
  limit: number
}

export async function fetchIncidentCategories(): Promise<IncidentCategorySummary[]> {
  return apiRequest<IncidentCategorySummary[]>('/intelligence/categories')
}

export async function fetchSituations(
  query: SituationsListQuery = {},
): Promise<SituationsListResponse> {
  const params = new URLSearchParams()
  if (query.status) params.set('status', query.status)
  if (query.severity) params.set('severity', query.severity)
  if (query.coordinationId) params.set('coordinationId', query.coordinationId)
  if (query.categoryId) params.set('categoryId', query.categoryId)
  if (query.occurredFrom) params.set('occurredFrom', query.occurredFrom)
  if (query.occurredTo) params.set('occurredTo', query.occurredTo)
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))

  const suffix = params.toString() ? `?${params.toString()}` : ''
  return apiRequest<SituationsListResponse>(`/situations${suffix}`)
}

export async function createSituation(
  payload: CreateSituationPayload,
): Promise<SituationResponse> {
  return apiRequest<SituationResponse>('/situations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchSituation(
  situationId: string,
): Promise<SituationResponse> {
  return apiRequest<SituationResponse>(`/situations/${situationId}`)
}

export interface UpdateSituationPayload {
  title?: string
  description?: string
  coordinationId?: string
  categoryId?: string
  severity?: SituationResponse['severity']
  status?: SituationResponse['status']
  statusComment?: string
  /** Estructura preparada para evidencias futuras. */
  evidenceIds?: string[]
  occurredAt?: string
}

export async function updateSituation(
  situationId: string,
  payload: UpdateSituationPayload,
): Promise<SituationResponse> {
  return apiRequest<SituationResponse>(`/situations/${situationId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
