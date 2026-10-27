import type { User } from '@/modules/auth/types/user.types'

export type NovexRoleCode = 'COORDINADOR' | 'ANALISTA' | 'DIRECTOR' | 'ADMIN'

const KNOWN_ROLES = new Set<NovexRoleCode>([
  'COORDINADOR',
  'ANALISTA',
  'DIRECTOR',
  'ADMIN',
])

export function normalizeRoleCode(
  value: string | null | undefined,
): NovexRoleCode {
  const normalized = value?.trim().toUpperCase() as NovexRoleCode | undefined
  return normalized && KNOWN_ROLES.has(normalized) ? normalized : 'COORDINADOR'
}

export const EXECUTIVE_OPERATIONS_HOME = '/centro-operacional'

/**
 * LANDING ÚNICO: los cuatro roles entran al Centro Operacional.
 *
 * Fase 1 de retiro del shell legacy. Antes ADMIN, DIRECTOR y ANALISTA
 * aterrizaban en `/red-impacto`; ahora cada rol entra a su propio shell del
 * Centro (`OperationalCenterHome` elige DIRECTOR / ANALISTA / COORDINADOR /
 * ADMIN). La ruta del Centro admite los cuatro roles, así que este destino
 * nunca puede devolver a una guarda que lo rechace.
 *
 * Se conserva la firma con `user` para no tocar a los llamadores (login,
 * cortinas, guardas) y porque el destino podría volver a depender del rol.
 */
export function getRoleLandingPath(
  _user?: Pick<User, 'roleCode' | 'selectedAreaId'> | null,
): string {
  return EXECUTIVE_OPERATIONS_HOME
}

export function getEffectiveDashboardRole(
  user: Pick<User, 'roleCode'> | null | undefined,
  preview: string | null,
): NovexRoleCode {
  const actual = normalizeRoleCode(user?.roleCode)
  if (actual !== 'ADMIN' || !preview) return actual
  return normalizeRoleCode(preview)
}

/** Roles que ven el historial institucional completo (no solo su coordinación). */
export function seesInstitutionalSituationRegistry(
  role: NovexRoleCode,
): boolean {
  return role === 'ANALISTA' || role === 'DIRECTOR' || role === 'ADMIN'
}
