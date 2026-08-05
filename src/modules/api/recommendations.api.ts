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

export async function fetchSituationRecommendations(
  situationId: string,
): Promise<SituationRecommendationsListResponse> {
  return apiRequest<SituationRecommendationsListResponse>(
    `/situations/${situationId}/recommendations`,
  )
}
