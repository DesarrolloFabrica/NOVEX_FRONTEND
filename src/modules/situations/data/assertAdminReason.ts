/** Motivo administrativo (anulación / traslado). Espejo del DTO del backend. */
export const SITUATION_ADMIN_REASON_MIN_LENGTH = 10
export const SITUATION_ADMIN_REASON_MAX_LENGTH = 1000

export class AdminReasonValidationError extends Error {
  readonly code = 'ADMIN_REASON_INVALID'

  constructor(message: string) {
    super(message)
    this.name = 'AdminReasonValidationError'
  }
}

/**
 * Recorta y valida el motivo ANTES del POST (igual que el Transform+Min/Max
 * del backend). Evita un 400 inútil y unifica el mensaje para la UI.
 */
export function assertAdminReason(reason: string): string {
  const trimmed = reason.trim()
  if (trimmed.length < SITUATION_ADMIN_REASON_MIN_LENGTH) {
    throw new AdminReasonValidationError(
      `El motivo debe tener al menos ${SITUATION_ADMIN_REASON_MIN_LENGTH} caracteres.`,
    )
  }
  if (trimmed.length > SITUATION_ADMIN_REASON_MAX_LENGTH) {
    throw new AdminReasonValidationError(
      `El motivo no puede superar ${SITUATION_ADMIN_REASON_MAX_LENGTH} caracteres.`,
    )
  }
  return trimmed
}
