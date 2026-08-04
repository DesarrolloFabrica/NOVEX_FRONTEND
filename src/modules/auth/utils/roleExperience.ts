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

export function getRoleLandingPath(
  user: Pick<User, 'roleCode' | 'selectedAreaId'> | null | undefined,
): string {
  const role = normalizeRoleCode(user?.roleCode)
  if (role === 'ADMIN') return '/admin'
  if (role === 'ANALISTA' || role === 'DIRECTOR') return '/dashboard'

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
