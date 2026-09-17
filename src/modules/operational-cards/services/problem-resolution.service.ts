import { resolveSituation } from '@/modules/api/situations.api'
import { loadAnalysis } from '@/modules/services/situationAnalysis.service'
import type { ProblemDetail } from '@/modules/operational-cards/types/problem-detail.types'
import { toProblemDetail } from '@/modules/operational-cards/services/problem-detail.service'

/**
 * SOLUCIONAR un problema registrando su aprendizaje.
 *
 * UNA sola petición: `POST /situations/:id/resolution`. No se usa el PATCH
 * genérico —el backend dejó de admitir `CLOSED` por esa vía— y no se encadenan
 * transiciones intermedias: no existe un paso artificial por «En atención».
 *
 * Sin reintento automático, por la misma razón que en el reporte: un fallo de
 * red puede haber ocurrido después de que el servidor cerrara el problema, y
 * repetir la petición devolvería un 409 confuso en lugar de un error claro.
 *
 * La respuesta del servidor trae el caso YA cerrado con su aprendizaje, y se
 * convierte en `ProblemDetail` para sustituir el que se está mostrando: el
 * usuario debe seguir viendo el resultado aunque el problema salga de la lista
 * de activos. El análisis se vuelve a leer porque el detalle lo incluye; es una
 * lectura, no una nueva ejecución de IA.
 */
export async function submitProblemResolution(
  problemId: string,
  learning: string,
): Promise<ProblemDetail> {
  const trimmed = learning.trim()
  if (trimmed.length === 0) {
    throw new Error('Escriba qué aprendió antes de marcar el problema como solucionado.')
  }

  const situation = await resolveSituation(problemId, trimmed)
  const analysis = await loadAnalysis(problemId).catch(() => null)

  return toProblemDetail(situation, analysis)
}
