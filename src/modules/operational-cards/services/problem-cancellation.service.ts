import { cancelSituation } from '@/modules/api/situations.api'
import type { ProblemDetail } from '@/modules/operational-cards/types/problem-detail.types'
import { toProblemDetail } from '@/modules/operational-cards/services/problem-detail.service'
import { assertAdminReason } from '@/modules/situations/data/assertAdminReason'

/**
 * Anular una situación (ADMIN, `SITUATIONS_CANCEL`).
 *
 * `POST /situations/:id/cancellation`. No usa PATCH ni cierra con aprendizaje.
 * La UI solo debe ofrecerse cuando el detalle trae `canCancel === true`.
 */
export async function submitProblemCancellation(
  problemId: string,
  reason: string,
): Promise<ProblemDetail> {
  const trimmed = assertAdminReason(reason)
  const situation = await cancelSituation(problemId, { reason: trimmed })
  return toProblemDetail(situation)
}
