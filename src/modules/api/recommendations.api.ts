import { apiRequest } from '@/shared/api/http'

export interface SituationRecommendation {
  id: string
  situationId: string
  title: string
  description: string
  priority: string
  status: string
  generatedBy: string
  assignedUserId: string | null
  assignedUserName: string | null
  dueAt: string | null
  completedAt: string | null
  executionNotes: string | null
  createdAt: string
  updatedAt: string
}

export interface SituationRecommendationsListResponse {
  situationId: string
  items: SituationRecommendation[]
  total: number
}

export interface UpdateSituationRecommendationPayload {
  status?: string
  priority?: string
  executionNotes?: string | null
}

export async function fetchSituationRecommendations(
  situationId: string,
): Promise<SituationRecommendationsListResponse> {
  return apiRequest<SituationRecommendationsListResponse>(
    `/situations/${situationId}/recommendations`,
  )
}

export async function updateSituationRecommendation(
  recommendationId: string,
  payload: UpdateSituationRecommendationPayload,
): Promise<SituationRecommendation> {
  return apiRequest<SituationRecommendation>(`/recommendations/${recommendationId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
