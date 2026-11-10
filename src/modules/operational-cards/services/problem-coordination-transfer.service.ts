import { transferSituationCoordination } from '@/modules/api/situations.api'
import type { ProblemDetail } from '@/modules/operational-cards/types/problem-detail.types'
import { toProblemDetail } from '@/modules/operational-cards/services/problem-detail.service'
import { assertAdminReason } from '@/modules/situations/data/assertAdminReason'

export interface TransferCoordinationInput {
  toCoordinationId: string
  reason: string
  /** Coordinación responsable vista en el detalle (control optimista). */
  expectedCurrentCoordinationId?: string | null
}

/**
 * Trasladar la coordinación responsable (ADMIN, `SITUATIONS_TRANSFER`).
 *
 * `POST /situations/:id/coordination-transfer`. No usar PATCH con
 * `coordinationId` (el backend responde 403).
 */
export async function submitProblemCoordinationTransfer(
  problemId: string,
  input: TransferCoordinationInput,
): Promise<ProblemDetail> {
  const toCoordinationId = input.toCoordinationId.trim()
  if (!toCoordinationId) {
    throw new Error('Debe indicar la coordinación de destino.')
  }

  const reason = assertAdminReason(input.reason)
  const expected = input.expectedCurrentCoordinationId?.trim() || undefined

  const situation = await transferSituationCoordination(problemId, {
    toCoordinationId,
    reason,
    ...(expected ? { expectedCurrentCoordinationId: expected } : {}),
  })

  return toProblemDetail(situation)
}
