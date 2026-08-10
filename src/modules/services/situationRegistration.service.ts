import { createSituationEvidence } from '@/modules/api/evidences.api'
import { createSituationWithAnalysis } from '@/modules/api/situations.api'
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
  CreateSituationPayload,
  IncidentCategorySummary,
  SituationResponse,
} from '@/modules/situations/types/situation.types'
import { isValidUuid } from '@/shared/utils/uuid'

export interface RegisterSituationInput {
  draft: SituationCaptureDraft
  coordinations: CoordinationSummary[]
  categories: IncidentCategorySummary[]
  allowUnassignedCoordination?: boolean
}

function assertBackendSituationId(situation: SituationResponse): string {
  if (!isValidUuid(situation.id)) {
    throw new Error(
      'El servidor no devolvió un identificador válido para la situación.',
    )
  }
  return situation.id
}

function buildCreateSituationPayload(
  input: RegisterSituationInput,
): CreateSituationPayload {
  const validation = validateSituationCaptureDraft(
    input.draft,
    input.coordinations,
    undefined,
    !input.allowUnassignedCoordination,
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

  return {
    title: input.draft.title.trim(),
    description: buildSituationDescription(input.draft, input.coordinations),
    coordinationId: input.allowUnassignedCoordination
      ? undefined
      : input.draft.coordinationId || undefined,
    categoryId: placeholderCategory.id,
    severity: 'MEDIUM',
    occurredAt: captureDateToOccurredAt(input.draft.reportedAt),
    relatedCoordinationIds: input.draft.relatedCoordinationIds.filter(
      (id) => id !== input.draft.coordinationId,
    ),
  }
}

export async function registerSituationWithAnalysis(
  input: RegisterSituationInput,
): Promise<SituationResponse> {
  const { situation } = await createSituationWithAnalysis(
    buildCreateSituationPayload(input),
  )

  assertBackendSituationId(situation)

  try {
    await uploadCaptureEvidences(situation.id, input.draft, input.coordinations)
  } catch {
    // El análisis ya quedó persistido y la descripción conserva el contexto.
  }

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
