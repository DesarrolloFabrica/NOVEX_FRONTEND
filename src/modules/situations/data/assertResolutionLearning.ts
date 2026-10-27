import { resolveResolutionCopy } from '@/modules/situations/data/resolutionCopy'

/**
 * Validación previa al POST /situations/:id/resolution.
 * El backend también recorta y exige MinLength(1); aquí se evita un envío vacío.
 */
export function assertResolutionLearning(learning: string): string {
  const trimmed = learning.trim()
  if (trimmed.length === 0) {
    throw new Error(resolveResolutionCopy('INTERNAL').emptyError)
  }
  return trimmed
}
