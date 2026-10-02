import type { User } from '@/modules/auth/types/user.types'
import type { SituationResponse } from '@/modules/situations/types/situation.types'

export function hasPermission(
  user: Pick<User, 'permissions'> | null | undefined,
  permission: string,
): boolean {
  return user?.permissions.includes(permission) ?? false
}

/**
 * Capacidad de REGISTRO en la experiencia de producto (centro operacional).
 *
 * Producto: solo ANALISTA y COORDINADOR (con coordinación) registran.
 * ADMIN/DIRECTOR consultan; aunque un seed de backend les deje
 * `SITUATIONS_CREATE`, el front no presenta botones de creación aquí.
 * No altera las reglas del API: solo la UI de esta experiencia.
 */
export function canCreateSituations(
  user:
    | Pick<User, 'permissions' | 'roleCode' | 'coordinationId'>
    | null
    | undefined,
): boolean {
  if (!hasPermission(user, 'SITUATIONS_CREATE')) return false
  if (user?.roleCode === 'ANALISTA') return true

  return user?.roleCode === 'COORDINADOR' && Boolean(user.coordinationId?.trim())
}

export function canCreateCoordinationSituations(
  user:
    | Pick<User, 'permissions' | 'roleCode' | 'coordinationId'>
    | null
    | undefined,
): boolean {
  return user?.roleCode === 'COORDINADOR' && canCreateSituations(user)
}

export function canUpdateSituations(
  user: Pick<User, 'permissions'> | null | undefined,
): boolean {
  return hasPermission(user, 'SITUATIONS_UPDATE')
}

/**
 * Espeja `canAdvanceSituationToInProgress` del backend para OPEN → IN_PROGRESS.
 * Autoría no basta: ANALISTA solo si General es responsable; COORDINADOR solo
 * si coordina el área responsable. Prefiere `situation.canAdvanceToInProgress`
 * del API cuando esté disponible.
 */
export function canUpdateSituationStatus(
  user:
    | Pick<User, 'id' | 'permissions' | 'roleCode' | 'coordinationId'>
    | null
    | undefined,
  situation:
    | Pick<
        SituationResponse,
        | 'createdByUserId'
        | 'coordinationId'
        | 'coordinationCode'
        | 'canAdvanceToInProgress'
      >
    | null
    | undefined,
  generalCoordinationId?: string | null,
): boolean {
  if (!user || !situation || !canUpdateSituations(user)) return false

  if (typeof situation.canAdvanceToInProgress === 'boolean') {
    return situation.canAdvanceToInProgress
  }

  if (user.roleCode === 'ANALISTA') {
    if (!situation.coordinationId) return false
    if (generalCoordinationId) {
      return situation.coordinationId === generalCoordinationId
    }
    return situation.coordinationCode === 'coord-general'
  }

  return (
    isCoordinator(user) &&
    Boolean(user.coordinationId) &&
    situation.coordinationId === user.coordinationId
  )
}

export function isCoordinator(
  user: Pick<User, 'roleCode'> | null | undefined,
): boolean {
  return user?.roleCode === 'COORDINADOR'
}
