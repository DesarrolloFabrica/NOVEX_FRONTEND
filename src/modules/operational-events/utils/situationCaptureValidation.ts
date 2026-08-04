import type { SituationCaptureDraft } from '@/modules/situations/types/situation-capture.types'
import type { CoordinationSummary } from '@/modules/situations/types/situation.types'
import { isValidUuid } from '@/shared/utils/uuid'
import {
  isFutureCaptureDate,
  isValidCaptureDate,
} from '@/modules/operational-events/utils/situationCaptureDate'

export const TITLE_MIN_LENGTH = 8
export const TITLE_MAX_LENGTH = 200
export const DESCRIPTION_MIN_LENGTH = 80
export const DESCRIPTION_MAX_LENGTH = 4000

export interface SituationCaptureValidationResult {
  valid: boolean
  missingRequirements: string[]
}

export function validateSituationCaptureDraft(
  draft: SituationCaptureDraft,
  coordinations: CoordinationSummary[],
  responsibleCoordinations?: CoordinationSummary[],
  requiresCoordination = true,
): SituationCaptureValidationResult {
  const coordinationIds = new Set(coordinations.map((item) => item.id))
  const responsibleIds = new Set(
    (responsibleCoordinations ?? coordinations).map((item) => item.id),
  )
  const missingRequirements: string[] = []

  if (draft.title.trim().length < TITLE_MIN_LENGTH) {
    missingRequirements.push('un título claro y específico')
  }
  if (draft.title.trim().length > TITLE_MAX_LENGTH) {
    missingRequirements.push('un título más corto')
  }
  if (draft.description.trim().length < DESCRIPTION_MIN_LENGTH) {
    missingRequirements.push('más contexto en la descripción')
  }
  if (draft.description.trim().length > DESCRIPTION_MAX_LENGTH) {
    missingRequirements.push('una descripción más breve')
  }
  if (
    requiresCoordination &&
    (!draft.coordinationId || !responsibleIds.has(draft.coordinationId))
  ) {
    missingRequirements.push('coordinación responsable válida')
  }
  if (!isValidCaptureDate(draft.reportedAt)) {
    missingRequirements.push('la fecha de ocurrencia')
  }
  if (isValidCaptureDate(draft.reportedAt) && isFutureCaptureDate(draft.reportedAt)) {
    missingRequirements.push('una fecha de ocurrencia que no sea futura')
  }
  if (!draft.detectionMethod) {
    missingRequirements.push('cómo se detectó la situación')
  }
  if (
    draft.detectionMethod === 'OTRO' &&
    !draft.detectionMethodOther.trim()
  ) {
    missingRequirements.push('especificar el método de detección')
  }
  if (
    draft.affectedParties.includes('OTRO') &&
    !draft.affectedPartyOther.trim()
  ) {
    missingRequirements.push('especificar quiénes están siendo afectados')
  }

  const invalidRelated = draft.relatedCoordinationIds.filter(
    (id) => !isValidUuid(id) || !coordinationIds.has(id),
  )
  if (invalidRelated.length > 0) {
    missingRequirements.push('coordinaciones relacionadas válidas')
  }

  return {
    valid: missingRequirements.length === 0,
    missingRequirements,
  }
}

export function formatMissingRequirements(
  missingRequirements: string[],
): string {
  if (missingRequirements.length === 0) {
    return 'Revise el resumen antes de continuar con el análisis de IA.'
  }
  if (missingRequirements.length === 1) {
    return `Todavía falta ${missingRequirements[0]}.`
  }
  return `Todavía falta completar ${missingRequirements.join(', ')}.`
}
