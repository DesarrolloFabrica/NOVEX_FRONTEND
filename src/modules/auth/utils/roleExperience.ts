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

export function getRoleLandingPath(
  user: Pick<User, 'roleCode' | 'selectedAreaId'> | null | undefined,
): string {
  const role = normalizeRoleCode(user?.roleCode)
  if (role === 'ADMIN' || role === 'ANALISTA' || role === 'DIRECTOR') {
    return EXECUTIVE_OPERATIONS_HOME
  }

  const coordination = user?.selectedAreaId?.trim()
  return coordination
    ? `/red-impacto?coordination=${encodeURIComponent(coordination)}`
    : '/red-impacto'
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
