import type {
  SituationAffectedCoordinationsResponse,
  SituationImpactAssessmentResponse,
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
