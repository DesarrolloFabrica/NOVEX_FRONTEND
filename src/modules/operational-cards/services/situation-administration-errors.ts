import { ApiError } from '@/shared/api/http'
import { AdminReasonValidationError } from '@/modules/situations/data/assertAdminReason'
import { getErrorMessage } from '@/shared/utils/error'

/**
 * Mensajes estables para anulación/traslado. La UI visual (Antigravity) puede
 * reutilizarlos; la autorización definitiva sigue en el servidor.
 */
export function describeSituationAdministrationError(error: unknown): string {
  if (error instanceof AdminReasonValidationError) {
    return error.message
  }

  if (error instanceof ApiError) {
    switch (error.code) {
      case 'SITUATION_ALREADY_CANCELLED':
        return 'La situación ya estaba anulada.'
      case 'SITUATION_CLOSED':
        return 'Una situación cerrada no se anula ni se traslada.'
      case 'SITUATION_CANCELLED':
        return 'Una situación anulada no admite esta operación.'
      case 'COORDINATION_CHANGED':
        return 'La coordinación responsable cambió desde que consultó el caso. Vuelva a intentarlo.'
      case 'TRANSFER_SAME_COORDINATION':
        return 'El destino es la coordinación responsable actual.'
      case 'TRANSFER_DESTINATION_INACTIVE':
        return 'La coordinación de destino está inactiva.'
      case 'TRANSFER_DESTINATION_IS_AFFECTED':
        return 'En un reporte INTER el destino no puede ser la coordinación afectada.'
      case 'COORDINATION_TRANSFER_NOT_ALLOWED':
        return 'La coordinación solo se cambia con el traslado administrativo.'
      default:
        break
    }

    if (error.status === 403) {
      return 'No tiene permiso para esta acción administrativa.'
    }
    if (error.status === 404) {
      return 'No se encontró la situación o la coordinación de destino.'
    }
    if (error.status === 400) {
      return error.message || 'Los datos del formulario no son válidos.'
    }
    if (error.status === 409) {
      return error.message || 'El caso ya no admite esta operación.'
    }
  }

  return getErrorMessage(error)
}
