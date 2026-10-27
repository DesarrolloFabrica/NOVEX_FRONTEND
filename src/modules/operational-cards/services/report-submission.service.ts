import { createSituationWithAnalysis } from '@/modules/api/situations.api'
import { ApiError } from '@/shared/api/http'
import { getErrorMessage } from '@/shared/utils/error'
import type {
  SituationReportKind,
  SituationResponse,
} from '@/modules/situations/types/situation.types'
import type { ReportDraft } from '@/modules/operational-cards/types/operational-cards.state'

/**
 * REPORTAR UN PROBLEMA desde el panel derecho.
 *
 * Usa el endpoint existente `POST /situations/register-with-analysis`. Es la
 * ÚNICA puerta de creación de problemas internos del producto.
 *
 * INTERNAL  Coordinación = la carta (para un COORDINADOR, siempre la suya),
 *           categoría, severidad reportada y afectación inicial opcional.
 * INTER     Tipo, afectada, responsable, proceso y entrega pendiente.
 */

export const REPORT_TITLE_MAX = 200
export const REPORT_DESCRIPTION_MAX = 4000
export const REPORT_CONSEQUENCE_MAX = 2000

export interface ReportSubmissionInput {
  draft: ReportDraft
  reportKind: SituationReportKind
  /** UUID de la coordinación de la carta (afectada / responsable en INTERNAL). */
  selectedCoordinationId: string | null
  /** Code de la carta para reacciones / invalidación. */
  selectedCoordinationCode: string | null
}

export interface ReportValidation {
  valid: boolean
  problemas: string[]
}

export function validateReportDraft(
  draft: ReportDraft,
  reportKind: SituationReportKind,
  now: Date = new Date(),
): ReportValidation {
  const problemas: string[] = []

  const title = draft.title.trim()
  if (title.length === 0) problemas.push('El título es obligatorio.')
  else if (title.length > REPORT_TITLE_MAX)
    problemas.push(`El título no puede superar ${REPORT_TITLE_MAX} caracteres.`)

  const description = draft.description.trim()
  if (description.length === 0) problemas.push('La descripción es obligatoria.')
  else if (description.length > REPORT_DESCRIPTION_MAX)
    problemas.push(
      `La descripción no puede superar ${REPORT_DESCRIPTION_MAX} caracteres.`,
    )

  if (reportKind === 'INTERNAL') {
    if (!draft.categoryId) problemas.push('Seleccione una categoría.')
    if (draft.initialConsequence.trim().length > REPORT_CONSEQUENCE_MAX) {
      problemas.push(
        `La afectación inicial no puede superar ${REPORT_CONSEQUENCE_MAX} caracteres.`,
      )
    }
  } else {
    if (!draft.responsibleCoordinationId) {
      problemas.push('Seleccione la coordinación responsable.')
    }
    if (!draft.affectedProcess.trim()) {
      problemas.push(
        'Describa el proceso de la coordinación afectada que se retrasa o bloquea.',
      )
    }
    if (!draft.pendingDelivery.trim()) {
      problemas.push(
        'Describa la entrega o acción pendiente de la coordinación responsable.',
      )
    }
  }

  if (!draft.occurredAt) {
    problemas.push('Indique cuándo ocurrió.')
  } else {
    const occurred = new Date(draft.occurredAt)
    if (Number.isNaN(occurred.getTime())) {
      problemas.push('La fecha de ocurrencia no es válida.')
    } else if (occurred.getTime() > now.getTime()) {
      problemas.push('La fecha de ocurrencia no puede ser futura.')
    }
  }

  return { valid: problemas.length === 0, problemas }
}

export function localInputToIso(value: string): string {
  return new Date(value).toISOString()
}

export function nowAsLocalInput(now: Date = new Date()): string {
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 16)
}

export interface ReportSubmissionResult {
  situation: SituationResponse
  /** true: el servidor reconoció la clave y devolvió el registro ya existente. */
  replayed: boolean
}

/**
 * Envía el reporte con su clave de idempotencia. La clave la decide quien
 * llama (ver report-persistence.ts): la misma en todos los reintentos del
 * mismo reporte, de modo que el servidor nunca cree dos problemas.
 */
export async function submitProblemReport(
  input: ReportSubmissionInput,
  idempotencyKey: string,
): Promise<ReportSubmissionResult> {
  const validation = validateReportDraft(input.draft, input.reportKind)
  if (!validation.valid) {
    throw new Error(validation.problemas.join(' '))
  }

  if (input.reportKind === 'INTER_COORDINATION') {
    if (!input.selectedCoordinationId) {
      throw new Error('Seleccione una coordinación en las cartas para poder reportar.')
    }
    if (
      input.draft.responsibleCoordinationId === input.selectedCoordinationId
    ) {
      throw new Error(
        'La coordinación responsable no puede ser la misma que la afectada.',
      )
    }

    const { situation, replayed } = await createSituationWithAnalysis(
      {
        title: input.draft.title.trim(),
        description: input.draft.description.trim(),
        reportKind: 'INTER_COORDINATION',
        coordinationId: input.draft.responsibleCoordinationId,
        affectedCoordinationId: input.selectedCoordinationId,
        severity: input.draft.severity,
        occurredAt: localInputToIso(input.draft.occurredAt),
        affectedProcess: input.draft.affectedProcess.trim(),
        pendingDelivery: input.draft.pendingDelivery.trim(),
      },
      idempotencyKey,
    )
    return { situation, replayed }
  }

  // INTERNAL ocurre en la carta. Para un COORDINADOR la carta está fijada a su
  // coordinación: ya no existe un «destino» distinto.
  const coordinationId = input.selectedCoordinationId
  if (!coordinationId) {
    throw new Error('Seleccione una coordinación en las cartas para poder reportar.')
  }

  const initialConsequence = input.draft.initialConsequence.trim()

  const { situation, replayed } = await createSituationWithAnalysis(
    {
      title: input.draft.title.trim(),
      description: input.draft.description.trim(),
      reportKind: 'INTERNAL',
      coordinationId,
      affectedCoordinationId: coordinationId,
      categoryId: input.draft.categoryId,
      severity: input.draft.severity,
      occurredAt: localInputToIso(input.draft.occurredAt),
      // Opcional: vacía = el problema nace sin afectaciones (no se envía).
      // Viaja dentro del alta: el servidor la crea en la misma transacción,
      // así que un reintento con la misma clave tampoco la duplica.
      ...(initialConsequence
        ? { initialConsequence: { description: initialConsequence } }
        : {}),
    },
    idempotencyKey,
  )

  return { situation, replayed }
}

/**
 * Mensaje para el usuario según la causa del fallo del alta. Los códigos los
 * fija el backend (ai-orchestrator.service.ts); el resto conserva el mensaje
 * del servidor (permisos, validaciones).
 */
export function describeReportSubmissionError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'REGISTRATION_IN_PROGRESS':
        return 'El registro sigue procesándose en el servidor. Espere unos segundos y confirme de nuevo: no se creará un duplicado.'
      case 'IDEMPOTENCY_KEY_REUSED':
        return 'El intento anterior ya quedó registrado con otros datos. Revise «Mis reportes»: si confirma de nuevo se creará un registro nuevo.'
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
