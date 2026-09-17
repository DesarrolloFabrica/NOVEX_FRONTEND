import { createSituationWithAnalysis } from '@/modules/api/situations.api'
import type { SituationResponse } from '@/modules/situations/types/situation.types'
import type { ReportDraft } from '@/modules/operational-cards/types/operational-cards.state'

/**
 * REPORTAR UN PROBLEMA desde el panel derecho.
 *
 * Usa el endpoint existente `POST /situations/register-with-analysis`, que
 * registra el caso y ejecuta su análisis IA en la misma operación. Ese análisis
 * se conserva tal cual: es parte del alta, no un añadido de esta fase, y por eso
 * el envío puede tardar y la interfaz lo declara mientras ocurre.
 *
 * NO existe reintento automático. Si la petición falla, el error sube y el
 * formulario conserva el texto; reenviar es una decisión del usuario. Reintentar
 * solo aquí arriesgaría crear el problema dos veces, porque el fallo puede haber
 * ocurrido DESPUÉS de que el servidor lo registrara.
 */

/** Longitudes que exige el DTO del backend. Se validan antes de enviar. */
export const REPORT_TITLE_MAX = 200
export const REPORT_DESCRIPTION_MAX = 4000

export interface ReportSubmissionInput {
  draft: ReportDraft
  /** UUID de la coordinación RESPONSABLE, ya resuelto desde el overview. */
  coordinationId: string | null
}

export interface ReportValidation {
  valid: boolean
  /** Motivos legibles, en el orden en que aparecen los campos. */
  problemas: string[]
}

/**
 * Validación local, espejo del contrato del backend. No lo sustituye: el
 * servidor vuelve a validar y es su respuesta la que manda.
 */
export function validateReportDraft(
  draft: ReportDraft,
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

  if (!draft.categoryId) problemas.push('Seleccione una categoría.')

  if (!draft.occurredAt) {
    problemas.push('Indique cuándo ocurrió.')
  } else {
    const occurred = new Date(draft.occurredAt)
    if (Number.isNaN(occurred.getTime())) {
      problemas.push('La fecha de ocurrencia no es válida.')
    } else if (occurred.getTime() > now.getTime()) {
      // Misma regla que aplica el backend: no se registra el futuro.
      problemas.push('La fecha de ocurrencia no puede ser futura.')
    }
  }

  return { valid: problemas.length === 0, problemas }
}

/** `datetime-local` (hora local) → ISO 8601 con zona, que es lo que espera el DTO. */
export function localInputToIso(value: string): string {
  return new Date(value).toISOString()
}

/** Fecha y hora actuales en el formato que admite `<input type="datetime-local">`. */
export function nowAsLocalInput(now: Date = new Date()): string {
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 16)
}

export async function submitProblemReport(
  input: ReportSubmissionInput,
): Promise<SituationResponse> {
  const validation = validateReportDraft(input.draft)
  if (!validation.valid) {
    throw new Error(validation.problemas.join(' '))
  }

  const { situation } = await createSituationWithAnalysis({
    title: input.draft.title.trim(),
    description: input.draft.description.trim(),
    // La coordinación RESPONSABLE es la seleccionada en las cartas. Si no hay
    // ninguna, no se envía y el backend aplica su contrato histórico por rol;
    // el formulario ya impide llegar aquí sin selección.
    coordinationId: input.coordinationId ?? undefined,
    categoryId: input.draft.categoryId,
    // Severidad ELEGIDA por el usuario, no una constante oculta.
    severity: input.draft.severity,
    occurredAt: localInputToIso(input.draft.occurredAt),
  })

  return situation
}
