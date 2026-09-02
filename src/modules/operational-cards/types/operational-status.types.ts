/**
 * Vocabulario de estado operacional de la experiencia de cartas.
 *
 * El frontend NO calcula la integridad: la recibe ya resuelta del backend.
 * Estos literales son el espejo exacto del dominio
 * `operational-overview/domain/coordination-integrity.ts` del backend:
 *
 *   backend CoordinationIntegrityStatus  ->  CoordinationIntegrityStatus
 *   backend OperationalIntegrityStatus   ->  OperationalIntegrityStatus
 *
 * La alineación no se hace importando código del backend (son dos repos
 * independientes), sino por el contrato de cable: el endpoint serializa
 * exactamente estas cadenas y `parseOperationalIntegrityStatus` rechaza
 * cualquier otra. Si el backend cambiara el vocabulario, el parser degradaría
 * a DESCONOCIDO en lugar de presentar un estado inventado.
 */

/** Estado de una coordinación con datos operacionales válidos. */
export type CoordinationIntegrityStatus = 'ESTABLE' | 'ALERTA' | 'CRITICO'

/**
 * Estado presentable. DESCONOCIDO no es un resultado operacional: significa
 * ausencia de datos o imposibilidad de calcular, y nunca debe leerse como
 * calma.
 */
export type OperationalIntegrityStatus =
  | CoordinationIntegrityStatus
  | 'DESCONOCIDO'

export const OPERATIONAL_INTEGRITY_STATUSES: readonly OperationalIntegrityStatus[] =
  ['ESTABLE', 'ALERTA', 'CRITICO', 'DESCONOCIDO']

export function isOperationalIntegrityStatus(
  value: unknown,
): value is OperationalIntegrityStatus {
  return (
    typeof value === 'string' &&
    (OPERATIONAL_INTEGRITY_STATUSES as readonly string[]).includes(value)
  )
}

/**
 * Normaliza un valor recibido por HTTP. Cualquier valor no reconocido —campo
 * ausente, null, cadena vacía, vocabulario nuevo— se convierte en DESCONOCIDO,
 * nunca en ESTABLE.
 */
export function parseOperationalIntegrityStatus(
  value: unknown,
): OperationalIntegrityStatus {
  return isOperationalIntegrityStatus(value) ? value : 'DESCONOCIDO'
}
