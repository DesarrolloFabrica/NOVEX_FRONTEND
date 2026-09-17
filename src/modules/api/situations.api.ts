import type {
  ExecuteAIAnalysisResponse,
} from '@/modules/api/types/analysis.types'
import type {
  CreateSituationPayload,
  IncidentCategorySummary,
  SituationResponse,
} from '@/modules/situations/types/situation.types'
import { apiRequest } from '@/shared/api/http'

export interface SituationsListQuery {
  /**
   * «Mis reportes». Interruptor booleano, NO un identificador de autor: la
   * identidad la resuelve el backend con el usuario autenticado. Enviar aquí un
   * id de autor permitiría leer los reportes de otra persona.
   */
  mine?: boolean
  status?: string
  severity?: string
  coordinationId?: string
  categoryId?: string
  occurredFrom?: string
  occurredTo?: string
  page?: number
  limit?: number
}

/**
 * Con qué alcance resolvió el servidor la consulta.
 *
 *   complete  El filtro se aplicó tal cual: esto es todo lo que hay.
 *   own-only  El actor no puede leer los problemas de esa coordinación y solo
 *             se le devolvieron los que él reportó. `total` cuenta ese
 *             subconjunto, NUNCA los problemas del área.
 */
export type SituationsListScope = 'complete' | 'own-only'

export interface SituationsListResponse {
  items: SituationResponse[]
  total: number
  page: number
  limit: number
  scope?: SituationsListScope
}

export async function fetchIncidentCategories(): Promise<IncidentCategorySummary[]> {
  return apiRequest<IncidentCategorySummary[]>('/situations/categories')
}

export async function fetchSituations(
  query: SituationsListQuery = {},
): Promise<SituationsListResponse> {
  const params = new URLSearchParams()
  if (query.mine) params.set('mine', 'true')
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

export interface CreateSituationWithAnalysisResponse {
  situation: SituationResponse
  analysis: ExecuteAIAnalysisResponse
}

export async function createSituationWithAnalysis(
  payload: CreateSituationPayload,
): Promise<CreateSituationWithAnalysisResponse> {
  return apiRequest<CreateSituationWithAnalysisResponse>(
    '/situations/register-with-analysis',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
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

/**
 * Aprendizaje registrado al solucionar un problema. `null` tanto en los
 * problemas activos como en los cerrados ANTES de existir esta capacidad.
 */
export interface SituationResolutionResponse {
  learning: string
  resolvedByUserId: string
  resolvedByUserName: string
  resolvedAt: string | null
  recordedAt: string
}

/**
 * SOLUCIONAR un problema: cierre y aprendizaje en UNA sola petición atómica.
 *
 * Deliberadamente NO se usa `updateSituation` (el PATCH genérico): el backend
 * dejó de admitir `CLOSED` por esa vía, porque autoriza por autoría o por área
 * y eso es más amplio que la regla de resolución. Tampoco se encadenan
 * transiciones intermedias: no existe un paso por «En atención».
 *
 * El cuerpo lleva SOLO el aprendizaje. La coordinación responsable no se envía:
 * el servidor autoriza contra la que tiene persistida.
 */
export async function resolveSituation(
  situationId: string,
  learning: string,
): Promise<SituationResponse> {
  return apiRequest<SituationResponse>(`/situations/${situationId}/resolution`, {
    method: 'POST',
    body: JSON.stringify({ learning }),
  })
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
