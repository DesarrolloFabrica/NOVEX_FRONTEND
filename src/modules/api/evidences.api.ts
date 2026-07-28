import type { CreateEvidencePayload } from '@/modules/situations/types/situation.types'
import { apiRequest } from '@/shared/api/http'

export interface SituationEvidenceItem {
  id: string
  situationId: string
  uploadedByUserId: string
  uploadedByUserName: string
  type: string
  title: string
  description: string
  fileName: string | null
  storagePath: string | null
  mimeType: string | null
  fileSize: number | null
  createdAt: string
}

export interface SituationEvidencesListResponse {
  situationId: string
  items: SituationEvidenceItem[]
  total: number
}

export async function createSituationEvidence(
  situationId: string,
  payload: CreateEvidencePayload,
): Promise<void> {
  await apiRequest(`/situations/${situationId}/evidences`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchSituationEvidences(
  situationId: string,
): Promise<SituationEvidencesListResponse> {
  return apiRequest<SituationEvidencesListResponse>(
    `/situations/${situationId}/evidences`,
  )
}
