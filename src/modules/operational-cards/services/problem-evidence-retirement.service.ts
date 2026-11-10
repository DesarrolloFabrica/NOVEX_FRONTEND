import { retireSituationEvidence } from '@/modules/api/evidences.api'
import type { SituationEvidenceItem } from '@/modules/api/evidences.api'
import { assertAdminReason } from '@/modules/situations/data/assertAdminReason'

/**
 * Retira una evidencia (soft-delete) con motivo obligatorio.
 * `POST /situations/:id/evidences/:evidenceId/retirement`.
 */
export async function submitEvidenceRetirement(
  situationId: string,
  evidenceId: string,
  reason: string,
): Promise<SituationEvidenceItem> {
  const trimmed = assertAdminReason(reason)
  return retireSituationEvidence(situationId, evidenceId, { reason: trimmed })
}
