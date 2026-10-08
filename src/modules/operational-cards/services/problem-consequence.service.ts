import { addSituationConsequence } from '@/modules/api/situations.api'
import { fetchProblemDetail } from '@/modules/operational-cards/services/problem-detail.service'
import type { ProblemDetail } from '@/modules/operational-cards/types/problem-detail.types'

/**
 * AGREGAR UNA AFECTACIÓN desde el detalle de un problema INTERNAL activo.
 *
 * Quién puede lo decide el servidor (`canAddConsequence`); la interfaz solo
 * muestra el formulario cuando el detalle lo indica. Tras confirmar se relee el
 * detalle completo: así la afectación aparece en su sitio con la severidad que
 * regía al ocurrir, calculada por el servidor.
 */

export const CONSEQUENCE_MAX = 2000

export interface ConsequenceDraft {
  description: string
  /** `datetime-local` en hora local; vacío = ahora. */
  occurredAt: string
}

export function validateConsequenceDraft(
  draft: ConsequenceDraft,
  now: Date = new Date(),
): string[] {
  const problemas: string[] = []
  const description = draft.description.trim()
  if (description.length === 0) {
    problemas.push('Describa la afectación.')
  } else if (description.length > CONSEQUENCE_MAX) {
    problemas.push(
      `La afectación no puede superar ${CONSEQUENCE_MAX} caracteres.`,
    )
  }
  if (draft.occurredAt) {
    const occurred = new Date(draft.occurredAt)
    if (Number.isNaN(occurred.getTime())) {
      problemas.push('La fecha de la afectación no es válida.')
    } else if (occurred.getTime() > now.getTime()) {
      problemas.push('La fecha de la afectación no puede ser futura.')
    }
  }
  return problemas
}

export async function submitProblemConsequence(
  problemId: string,
  draft: ConsequenceDraft,
): Promise<ProblemDetail> {
  const problemas = validateConsequenceDraft(draft)
  if (problemas.length > 0) {
    throw new Error(problemas.join(' '))
  }

  await addSituationConsequence(problemId, {
    description: draft.description.trim(),
    ...(draft.occurredAt
      ? { occurredAt: new Date(draft.occurredAt).toISOString() }
      : {}),
  })

  return fetchProblemDetail(problemId)
}
