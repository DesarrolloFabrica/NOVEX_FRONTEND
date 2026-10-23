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
import { ApiError } from '@/shared/api/http'
import { getErrorMessage } from '@/shared/utils/error'
import { isValidUuid } from '@/shared/utils/uuid'

export interface RegisterSituationInput {
  draft: SituationCaptureDraft
  coordinations: CoordinationSummary[]
  categories: IncidentCategorySummary[]
  allowUnassignedCoordination?: boolean
  /** Clave del intento lógico de registro; se reutiliza en reintentos. */
  idempotencyKey: string
}

export interface RegisterSituationResult {
  situation: SituationResponse
  /** true cuando el servidor devolvió un registro completado en un intento previo. */
  replayed: boolean
  /** Títulos de las notas de captura que no pudieron guardarse. Vacío si todas se guardaron. */
  failedEvidenceTitles: string[]
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
    input.categories,
  )
  if (!validation.valid) {
    throw new Error(
      `Complete el formulario antes de registrar: ${validation.missingRequirements.join(', ')}.`,
    )
  }

  const selectedCategory =
    input.categories.find((item) => item.id === input.draft.categoryId) ??
    input.categories.find((item) => item.isSelectable !== false)

  if (!selectedCategory) {
    throw new Error('No hay categorías de incidente disponibles.')
  }

  return {
    title: input.draft.title.trim(),
    description: buildSituationDescription(input.draft, input.coordinations),
    coordinationId: input.allowUnassignedCoordination
      ? undefined
      : input.draft.coordinationId || undefined,
    categoryId: selectedCategory.id,
    severity: 'MEDIUM',
    occurredAt: captureDateToOccurredAt(input.draft.reportedAt),
    relatedCoordinationIds: input.draft.relatedCoordinationIds.filter(
      (id) => id !== input.draft.coordinationId,
    ),
  }
}

export async function registerSituationWithAnalysis(
  input: RegisterSituationInput,
): Promise<RegisterSituationResult> {
  const { situation, replayed } = await createSituationWithAnalysis(
    buildCreateSituationPayload(input),
    input.idempotencyKey,
  )

  assertBackendSituationId(situation)

  // El análisis ya quedó persistido. Las notas que fallen se informan al usuario;
  // un reintento con la misma clave las completa sin duplicar las existentes.
  const failedEvidenceTitles = await uploadCaptureEvidences(
    situation.id,
    input.draft,
    input.coordinations,
  )

  return { situation, replayed, failedEvidenceTitles }
}

interface CaptureEvidenceNote {
  /** Identidad estable por tipo de nota; no depende del título ni del contenido. */
  clientKey: string
  title: string
  description: string
}

function buildCaptureEvidenceNotes(
  draft: SituationCaptureDraft,
  coordinations: CoordinationSummary[],
): CaptureEvidenceNote[] {
  const notes: CaptureEvidenceNote[] = []

  const detectionLabel = labelForDetection(draft)
  if (detectionLabel) {
    notes.push({
      clientKey: 'capture:detection',
      title: 'Método de detección',
      description: detectionLabel,
    })
  }

  const affectedLabels = labelsForAffectedParties(draft)
  if (affectedLabels.length > 0) {
    notes.push({
      clientKey: 'capture:affected',
      title: 'Afectados percibidos',
      description: affectedLabels.join(', '),
    })
  }

  const relatedLabels = labelsForRelatedCoordinations(draft, coordinations)
  if (relatedLabels.length > 0) {
    notes.push({
      clientKey: 'capture:related',
      title: 'Coordinaciones relacionadas (percepción inicial)',
      description: relatedLabels.join(', '),
    })
  }

  if (draft.additionalNotes.trim()) {
    notes.push({
      clientKey: 'capture:notes',
      title: 'Notas adicionales',
      description: draft.additionalNotes.trim(),
    })
  }

  return notes
}

/**
 * Sube las notas de captura. Cada nota lleva una clave estable: el servidor
 * devuelve la existente si ya se guardó, así que un reintento no duplica nada.
 * Los fallos no se ocultan: se devuelven los títulos de las notas no guardadas.
 */
export async function uploadCaptureEvidences(
  situationId: string,
  draft: SituationCaptureDraft,
  coordinations: CoordinationSummary[],
): Promise<string[]> {
  if (!isValidUuid(situationId)) {
    throw new Error(
      'No se puede registrar evidencias sin un expediente válido.',
    )
  }

  const failedTitles: string[] = []

  for (const note of buildCaptureEvidenceNotes(draft, coordinations)) {
    try {
      await createSituationEvidence(situationId, {
        type: 'NOTE',
        title: note.title,
        description: note.description,
        clientKey: note.clientKey,
      })
    } catch {
      failedTitles.push(note.title)
    }
  }

  return failedTitles
}

/** Mensaje para el usuario según la causa del error de registro. */
export function describeRegistrationError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'REGISTRATION_IN_PROGRESS':
        return 'El registro sigue procesándose en el servidor. Espere unos segundos y confirme de nuevo: no se creará un duplicado.'
      case 'IDEMPOTENCY_KEY_REUSED':
        return 'Los datos cambiaron desde el intento anterior. Confirme el registro de nuevo para enviarlo como un registro nuevo.'
      case 'TIMEOUT':
      case 'NETWORK_ERROR':
        return 'No fue posible confirmar el resultado por un problema de conexión. Confirme de nuevo: si el registro ya se guardó, el sistema lo reconocerá y no lo duplicará.'
      default:
        if (error.status === 429) {
          return 'Demasiados intentos en poco tiempo. Espere un minuto antes de confirmar de nuevo.'
        }
        return error.message
    }
  }

  return getErrorMessage(error)
}
