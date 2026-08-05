import type {
  SituationAffectedCoordinationsResponse,
  SituationImpactAssessmentResponse,
  SituationImpactContextResponse,
  SituationImpactSimulationResponse,
} from '@/modules/situations/types/situation.types'
import { apiRequest } from '@/shared/api/http'

export async function fetchSituationImpact(
  situationId: string,
): Promise<SituationImpactAssessmentResponse> {
  return apiRequest<SituationImpactAssessmentResponse>(
    `/situations/${situationId}/impact`,
  )
}

export async function fetchSituationAffectedCoordinations(
  situationId: string,
): Promise<SituationAffectedCoordinationsResponse> {
  return apiRequest<SituationAffectedCoordinationsResponse>(
    `/situations/${situationId}/affected-coordinations`,
  )
}

export async function fetchSituationImpactContext(
  situationId: string,
): Promise<SituationImpactContextResponse> {
  return apiRequest<SituationImpactContextResponse>(
    `/situations/${situationId}/impact-context`,
  )
}

export async function simulateSituationImpact(
  situationId: string,
  horizonMinutes = 30,
): Promise<SituationImpactSimulationResponse> {
  const params = new URLSearchParams({
    horizonMinutes: String(horizonMinutes),
  })
  return apiRequest<SituationImpactSimulationResponse>(
    `/situations/${situationId}/simulate-impact?${params.toString()}`,
    { method: 'POST' },
  )
}
