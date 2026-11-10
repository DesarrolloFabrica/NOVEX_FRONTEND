import { ApiError } from '@/shared/api/http'
import { AdminReasonValidationError } from '@/modules/situations/data/assertAdminReason'
import { getErrorMessage } from '@/shared/utils/error'

export function describeEvidenceRetirementError(error: unknown): string {
  if (error instanceof AdminReasonValidationError) {
    return error.message
  }

  if (error instanceof ApiError) {
    switch (error.code) {
      case 'EVIDENCE_ALREADY_RETIRED':
        return 'La evidencia ya fue retirada.'
      case 'SITUATION_CLOSED':
        return 'No se puede retirar evidencias de una situación cerrada.'
      case 'SITUATION_CANCELLED':
        return 'No se puede retirar evidencias de una situación anulada.'
      default:
        break
    }

    if (error.status === 403) {
      return 'No tiene permiso para retirar esta evidencia.'
    }
    if (error.status === 404) {
      return 'No se encontró la evidencia o la situación.'
    }
    if (error.status === 400) {
      return error.message || 'El motivo de retiro no es válido.'
    }
    if (error.status === 409) {
      return error.message || 'La evidencia ya no admite retiro.'
    }
  }

  return getErrorMessage(error)
}
