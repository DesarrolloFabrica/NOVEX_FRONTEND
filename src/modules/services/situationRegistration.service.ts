import { createSituationEvidence } from '@/modules/api/evidences.api'
import { createSituation } from '@/modules/api/situations.api'
import { buildSituationDescription } from '@/modules/operational-events/utils/buildSituationSubmission'
import { inferEvidenceType } from '@/modules/situations/services/situation-evidences.service'
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
  const placeholderCategory =
    input.categories.find((item) => item.code === 'TECH_DEGRADATION') ??
    input.categories[0]

  if (!placeholderCategory) {
    throw new Error('No hay categorías de incidente disponibles.')
  }

  if (!isValidUuid(input.draft.coordinationId)) {
    throw new Error('Seleccione una coordinación responsable válida.')
  }

  const situation = await createSituation({
    title: input.draft.title.trim(),
    description: buildSituationDescription(input.draft, input.coordinations),
    coordinationId: input.draft.coordinationId,
    categoryId: placeholderCategory.id,
    severity: 'MEDIUM',
    occurredAt: new Date(input.draft.reportedAt).toISOString(),
  })

  assertBackendSituationId(situation)
  return situation
}

export async function uploadEvidence(
  situationId: string,
  draft: SituationCaptureDraft,
): Promise<void> {
  if (!isValidUuid(situationId)) {
    throw new Error('No se puede subir evidencias sin un expediente válido.')
  }

  if (draft.additionalNotes.trim()) {
    await createSituationEvidence(situationId, {
      type: 'NOTE',
      title: 'Notas adicionales',
      description: draft.additionalNotes.trim(),
    })
  }

  for (const attachment of draft.attachments) {
    await createSituationEvidence(situationId, {
      type: inferEvidenceType(attachment.file),
      title: attachment.file.name,
      description: 'Archivo adjunto durante el registro de la situación.',
      fileName: attachment.file.name,
      storagePath: `uploads/pending/${situationId}/${attachment.file.name}`,
      mimeType: attachment.file.type || 'application/octet-stream',
      fileSize: attachment.file.size,
    })
  }
}

export async function registerSituationWithEvidences(
  input: RegisterSituationInput,
): Promise<SituationResponse> {
  const situation = await registerSituation(input)

  try {
    await uploadEvidence(situation.id, input.draft)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'No fue posible registrar las evidencias de la situación.'
    throw new Error(
      `${message} El expediente ${situation.id} quedó creado y puede reintentar el análisis.`,
    )
  }

  return situation
}
