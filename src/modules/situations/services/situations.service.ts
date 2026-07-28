import { fetchAuthMe } from '@/modules/api/auth.api'
import {
  createSituation,
  fetchIncidentCategories,
  fetchSituation,
} from '@/modules/api/situations.api'
import type {
  CreateSituationPayload,
  IncidentCategorySummary,
  SituationResponse,
} from '@/modules/situations/types/situation.types'

export type { AuthMeUser } from '@/modules/api/auth.api'

export async function fetchAuthMeRequest() {
  return fetchAuthMe()
}

export async function fetchIncidentCategoriesRequest(): Promise<
  IncidentCategorySummary[]
> {
  return fetchIncidentCategories()
}

export async function createSituationRequest(
  payload: CreateSituationPayload,
): Promise<SituationResponse> {
  return createSituation(payload)
}

export async function fetchSituationRequest(
  situationId: string,
): Promise<SituationResponse> {
  return fetchSituation(situationId)
}
