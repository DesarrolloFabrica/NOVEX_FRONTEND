import { updateSituation } from '@/modules/api/situations.api'
import { loadAnalysis } from '@/modules/services/situationAnalysis.service'
import type { ProblemDetail } from '@/modules/operational-cards/types/problem-detail.types'
import { toProblemDetail } from '@/modules/operational-cards/services/problem-detail.service'

/**
 * Pasar un problema de OPEN a IN_PROGRESS («En atención»).
 *
 * Reutiliza el contrato existente `PATCH /situations/:id` con
 * `{ status: 'IN_PROGRESS' }`. No cierra, no registra aprendizaje y no es el
 * endpoint de resolución (`POST …/resolution`).
 *
 * La autorización la aplica el backend (`canAdvanceSituationToInProgress`:
 * COORDINADOR responsable o ANALISTA cuando General es responsable). Aquí
 * solo se valida el estado de partida para no enviar un PATCH inútil.
 */
export async function submitProblemStatusAdvance(
  problemId: string,
  currentStatus: string,
): Promise<ProblemDetail> {
  if (currentStatus !== 'OPEN') {
    throw new Error(
      'Solo un problema Abierto puede pasar a En atención.',
    )
  }

  const situation = await updateSituation(problemId, {
    status: 'IN_PROGRESS',
  })
  const analysis = await loadAnalysis(problemId).catch(() => null)

  return toProblemDetail(situation, analysis)
}
