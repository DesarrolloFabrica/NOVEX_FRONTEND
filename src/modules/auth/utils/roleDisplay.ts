import type { User } from '@/modules/auth/types/user.types'

/** Nombres de rol del catálogo backend cuando roleName no está en sesión. */
const ROLE_DISPLAY_BY_CODE: Record<string, string> = {
  ADMIN: 'Administrador',
  DIRECTOR: 'Director',
  ANALISTA: 'Analista',
  COORDINADOR: 'Coordinador',
}

type RoleDisplayUser = Pick<User, 'roleName' | 'roleCode'> | null | undefined

/**
 * Devuelve el nombre visible del rol del usuario para la UI.
 * Prioriza roleName del backend; cae al catálogo por roleCode.
 */
export function getRoleDisplayName(user: RoleDisplayUser): string {
  if (!user) return 'Operador'

  const fromBackend = user.roleName?.trim()
  if (fromBackend) return fromBackend

  const fromCode = ROLE_DISPLAY_BY_CODE[user.roleCode]
  if (fromCode) return fromCode

  return 'Operador'
}
