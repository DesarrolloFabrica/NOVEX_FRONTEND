import type { User } from '@/modules/auth/types/user.types'

export function hasPermission(
  user: Pick<User, 'permissions'> | null | undefined,
  permission: string,
): boolean {
  return user?.permissions.includes(permission) ?? false
}

export function canCreateSituations(
  user: Pick<User, 'permissions' | 'roleCode'> | null | undefined,
): boolean {
  return (
    hasPermission(user, 'SITUATIONS_CREATE') &&
    (user?.roleCode === 'COORDINADOR' || user?.roleCode === 'ANALISTA')
  )
}

export function canCreateCoordinationSituations(
  user: Pick<User, 'permissions' | 'roleCode'> | null | undefined,
): boolean {
  return user?.roleCode === 'COORDINADOR' && canCreateSituations(user)
}

export function canUpdateSituations(
  user: Pick<User, 'permissions'> | null | undefined,
): boolean {
  return hasPermission(user, 'SITUATIONS_UPDATE')
}

export function isCoordinator(
  user: Pick<User, 'roleCode'> | null | undefined,
): boolean {
  return user?.roleCode === 'COORDINADOR'
}
