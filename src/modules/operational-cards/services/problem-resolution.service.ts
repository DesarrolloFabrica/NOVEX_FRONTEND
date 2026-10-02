import { resolveSituation } from '@/modules/api/situations.api'
import { loadAnalysis } from '@/modules/services/situationAnalysis.service'
import type { ProblemDetail } from '@/modules/operational-cards/types/problem-detail.types'
import { toProblemDetail } from '@/modules/operational-cards/services/problem-detail.service'
import { assertResolutionLearning } from '@/modules/situations/data/assertResolutionLearning'

/**
 * Cerrar un problema registrando su aprendizaje.
 *
 * UNA sola petición: `POST /situations/:id/resolution`. No se usa el PATCH
 * genérico —el backend dejó de admitir `CLOSED` por esa vía—. El paso
 * «En atención» (OPEN → IN_PROGRESS) es otra operación (`PATCH`) y no se
 * encadena aquí: se puede resolver desde OPEN o desde IN_PROGRESS.
 */
export async function submitProblemResolution(
  problemId: string,
  learning: string,
): Promise<ProblemDetail> {
  const trimmed = assertResolutionLearning(learning)

  const situation = await resolveSituation(problemId, trimmed)
  const analysis = await loadAnalysis(problemId).catch(() => null)

  return toProblemDetail(situation, analysis)
}
