import type { SituationCaptureDraft } from '@/modules/situations/types/situation-capture.types'

export type ContextQualityLevel =
  | 'Insuficiente'
  | 'Aceptable'
  | 'Bueno'
  | 'Excelente'

const DESCRIPTION_MIN_LENGTH = 80
const DESCRIPTION_GOOD_LENGTH = 150
const DESCRIPTION_EXCELLENT_LENGTH = 280

export function evaluateContextQuality(
  draft: SituationCaptureDraft,
): ContextQualityLevel {
  const descriptionLength = draft.description.trim().length

  if (descriptionLength < DESCRIPTION_MIN_LENGTH) {
    return 'Insuficiente'
  }

  const signals = [
    descriptionLength >= DESCRIPTION_GOOD_LENGTH,
    Boolean(draft.coordinationId),
    Boolean(draft.reportedAt),
    Boolean(draft.detectionMethod),
    draft.affectedParties.length > 0,
    draft.relatedCoordinationIds.length > 0,
    Boolean(draft.additionalNotes.trim()),
    draft.attachments.length > 0,
  ].filter(Boolean).length

  if (descriptionLength >= DESCRIPTION_EXCELLENT_LENGTH && signals >= 5) {
    return 'Excelente'
  }

  if (descriptionLength >= DESCRIPTION_GOOD_LENGTH && signals >= 3) {
    return 'Bueno'
  }

  return 'Aceptable'
}

export function contextQualityClass(level: ContextQualityLevel): string {
  return level
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export const DESCRIPTION_MIN_LENGTH_EXPORT = DESCRIPTION_MIN_LENGTH
