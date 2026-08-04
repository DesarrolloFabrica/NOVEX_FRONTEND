import { createSituationEvidence } from '@/modules/api/evidences.api'
import { createSituation } from '@/modules/api/situations.api'
import {
  buildSituationDescription,
  labelForDetection,
  labelsForAffectedParties,
  labelsForRelatedCoordinations,
} from '@/modules/operational-events/utils/buildSituationSubmission'
import { captureDateToOccurredAt } from '@/modules/operational-events/utils/situationCaptureDate'
import { validateSituationCaptureDraft } from '@/modules/operational-events/utils/situationCaptureValidation'
import type { SituationCaptureDraft } from '@/modules/situations/types/situation-capture.types'
import type {
  CoordinationSummary,
  IncidentCategorySummary,
  SituationResponse,
} from '@/modules/situations/types/situation.types'
import { isValidUuid } from '@/shared/utils/uuid'

export interface RegisterSituationInput {
  draft: SituationCaptureDraft
  coordinations: CoordinationSummary[]
  categories: IncidentCategorySummary[]
}

function assertBackendSituationId(situation: SituationResponse): string {
  if (!isValidUuid(situation.id)) {
    throw new Error(
      'El servidor no devolvió un identificador válido para la situación.',
    )
  }
  return situation.id
}

export async function registerSituation(
  input: RegisterSituationInput,
): Promise<SituationResponse> {
  const validation = validateSituationCaptureDraft(
    input.draft,
    input.coordinations,
  )
  if (!validation.valid) {
    throw new Error(
      `Complete el formulario antes de registrar: ${validation.missingRequirements.join(', ')}.`,
    )
  }

  const placeholderCategory =
    input.categories.find((item) => item.code === 'TECH_DEGRADATION') ??
    input.categories[0]

  if (!placeholderCategory) {
    throw new Error('No hay categorías de incidente disponibles.')
  }

  const situation = await createSituation({
    title: input.draft.title.trim(),
    description: buildSituationDescription(input.draft, input.coordinations),
    coordinationId: input.draft.coordinationId,
    categoryId: placeholderCategory.id,
    severity: 'MEDIUM',
    occurredAt: captureDateToOccurredAt(input.draft.reportedAt),
  })

  assertBackendSituationId(situation)
  return situation
}

export async function uploadCaptureEvidences(
  situationId: string,
  draft: SituationCaptureDraft,
  coordinations: CoordinationSummary[],
): Promise<void> {
  if (!isValidUuid(situationId)) {
    throw new Error(
      'No se puede registrar evidencias sin un expediente válido.',
    )
  }

  const detectionLabel = labelForDetection(draft)
  if (detectionLabel) {
    await createSituationEvidence(situationId, {
      type: 'NOTE',
      title: 'Método de detección',
      description: detectionLabel,
    })
  }

  const affectedLabels = labelsForAffectedParties(draft)
  if (affectedLabels.length > 0) {
    await createSituationEvidence(situationId, {
      type: 'NOTE',
      title: 'Afectados percibidos',
      description: affectedLabels.join(', '),
    })
  }

  const relatedLabels = labelsForRelatedCoordinations(draft, coordinations)
  if (relatedLabels.length > 0) {
    await createSituationEvidence(situationId, {
      type: 'NOTE',
      title: 'Coordinaciones relacionadas (percepción inicial)',
      description: relatedLabels.join(', '),
    })
  }

  if (draft.additionalNotes.trim()) {
    await createSituationEvidence(situationId, {
      type: 'NOTE',
      title: 'Notas adicionales',
      description: draft.additionalNotes.trim(),
    })
  }
}

export async function registerSituationWithEvidences(
  input: RegisterSituationInput,
): Promise<SituationResponse> {
  const situation = await registerSituation(input)

  try {
    await uploadCaptureEvidences(situation.id, input.draft, input.coordinations)
  } catch {
    // El expediente ya contiene el contexto estructurado en su descripción.
    // Una evidencia auxiliar no debe interrumpir el análisis ni inducir al
    // usuario a crear un expediente duplicado.
  }

  return situation
}
