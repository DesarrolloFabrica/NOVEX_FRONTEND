import type { CreateEvidencePayload } from '@/modules/situations/types/situation.types'
import { apiRequest } from '@/shared/api/http'

export type SituationEvidenceStatus = 'ACTIVE' | 'RETIRED'

/** Retiro registrado (solo en evidencias RETIRED). */
export interface SituationEvidenceRetirement {
  retiredAt: string
  retiredByUserId: string
  reason: string
}

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
  /** Fase 01B.2: aditivo; ausente en respuestas antiguas ⇒ ACTIVE. */
  status?: SituationEvidenceStatus
  /** Solo en retiradas; null/omitido en activas. */
  retirement?: SituationEvidenceRetirement | null
}

export interface SituationEvidencesListResponse {
  situationId: string
  items: SituationEvidenceItem[]
  total: number
}

export interface RetireSituationEvidencePayload {
  reason: string
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
  options: { includeRetired?: boolean } = {},
): Promise<SituationEvidencesListResponse> {
  const suffix = options.includeRetired ? '?includeRetired=true' : ''
  return apiRequest<SituationEvidencesListResponse>(
    `/situations/${situationId}/evidences${suffix}`,
  )
}

export async function fetchSituationEvidence(
  situationId: string,
  evidenceId: string,
): Promise<SituationEvidenceItem> {
  return apiRequest<SituationEvidenceItem>(
    `/situations/${situationId}/evidences/${evidenceId}`,
  )
}

/**
 * Retiro lógico (soft-delete) con motivo. `POST …/retirement` → 200.
 * No usar DELETE salvo compatibilidad: el contrato preferido es retirement.
 */
export async function retireSituationEvidence(
  situationId: string,
  evidenceId: string,
  payload: RetireSituationEvidencePayload,
): Promise<SituationEvidenceItem> {
  return apiRequest<SituationEvidenceItem>(
    `/situations/${situationId}/evidences/${evidenceId}/retirement`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}
