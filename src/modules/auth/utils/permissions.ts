import type { User } from '@/modules/auth/types/user.types'
import type { SituationResponse } from '@/modules/situations/types/situation.types'

export function hasPermission(
  user: Pick<User, 'permissions'> | null | undefined,
  permission: string,
): boolean {
  return user?.permissions.includes(permission) ?? false
}

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
 * Espeja la regla del backend: el ciclo de vida de una situación lo mueve quien
 * la registró o su coordinación dueña. Director, admin y el analista frente a
 * casos ajenos solo consultan.
 */
export function canUpdateSituationStatus(
  user:
    | Pick<User, 'id' | 'permissions' | 'roleCode' | 'coordinationId'>
    | null
    | undefined,
  situation:
    | Pick<SituationResponse, 'createdByUserId' | 'coordinationId'>
    | null
    | undefined,
): boolean {
  if (!user || !situation || !canUpdateSituations(user)) return false
  if (situation.createdByUserId === user.id) return true

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
