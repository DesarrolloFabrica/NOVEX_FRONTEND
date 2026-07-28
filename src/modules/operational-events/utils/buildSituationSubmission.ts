import {
  AFFECTED_PARTY_OPTIONS,
  DETECTION_METHOD_OPTIONS,
  type SituationCaptureDraft,
} from '@/modules/situations/types/situation-capture.types'
import type { CoordinationSummary } from '@/modules/situations/types/situation.types'

function labelForDetection(draft: SituationCaptureDraft): string | null {
  if (!draft.detectionMethod) return null
  if (draft.detectionMethod === 'OTRO') {
    return draft.detectionMethodOther.trim() || 'Otro'
  }
  return (
    DETECTION_METHOD_OPTIONS.find((item) => item.value === draft.detectionMethod)
      ?.label ?? draft.detectionMethod
  )
}

function labelsForAffectedParties(draft: SituationCaptureDraft): string[] {
  return draft.affectedParties.map((party) => {
    if (party === 'OTRO') {
      return draft.affectedPartyOther.trim() || 'Otro'
    }
    return (
      AFFECTED_PARTY_OPTIONS.find((item) => item.value === party)?.label ?? party
    )
  })
}

function labelsForRelatedCoordinations(
  draft: SituationCaptureDraft,
  coordinations: CoordinationSummary[],
): string[] {
  return draft.relatedCoordinationIds
    .map((id) => {
      const coordination = coordinations.find((item) => item.id === id)
      return coordination ? `${coordination.code} · ${coordination.name}` : null
    })
    .filter((label): label is string => Boolean(label))
}

export function buildSituationDescription(
  draft: SituationCaptureDraft,
  coordinations: CoordinationSummary[],
): string {
  const parts = [draft.description.trim()]
  const contextLines: string[] = []

  const detectionLabel = labelForDetection(draft)
  if (detectionLabel) {
    contextLines.push(`Detección: ${detectionLabel}`)
  }

  const affectedLabels = labelsForAffectedParties(draft)
  if (affectedLabels.length > 0) {
    contextLines.push(`Afectados percibidos: ${affectedLabels.join(', ')}`)
  }

  const relatedLabels = labelsForRelatedCoordinations(draft, coordinations)
  if (relatedLabels.length > 0) {
    contextLines.push(
      `Coordinaciones relacionadas (percepción inicial): ${relatedLabels.join(', ')}`,
    )
  }

  if (contextLines.length > 0) {
    parts.push(
      '\n\n---\nContexto reportado por el usuario:\n' + contextLines.join('\n'),
    )
  }

  return parts.join('')
}

export function summarizeDescription(description: string, maxLength = 220): string {
  const normalized = description.trim().replace(/\s+/g, ' ')
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength).trimEnd()}…`
}
