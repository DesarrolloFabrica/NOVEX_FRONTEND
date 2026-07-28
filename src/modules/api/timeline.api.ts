import { apiRequest } from '@/shared/api/http'

export interface SituationTimelineEntry {
  id: string
  situationId: string
  userId: string | null
  userName: string | null
  eventType: string
  title: string
  description: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface SituationTimelineResponse {
  situationId: string
  items: SituationTimelineEntry[]
  total: number
}

export async function fetchSituationTimeline(
  situationId: string,
): Promise<SituationTimelineResponse> {
  return apiRequest<SituationTimelineResponse>(
    `/situations/${situationId}/timeline`,
  )
}
