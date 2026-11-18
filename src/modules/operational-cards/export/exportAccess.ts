import { hasPermission } from '@/modules/auth/utils/permissions'
import { normalizeRoleCode } from '@/modules/auth/utils/roleExperience'
import type { User } from '@/modules/auth/types/user.types'
import type { ExportCoordinationOption } from '@/modules/operational-cards/export/SituationsExportDialog'

const EXPORT_ROLES = new Set(['ADMIN', 'DIRECTOR', 'ANALISTA'])

/** Mismo criterio que el backend: rol institucional + SITUATIONS_VIEW. */
export function canExportSituations(
  user: Pick<User, 'roleCode' | 'permissions'> | null | undefined,
): boolean {
  if (!user) return false
  return (
    EXPORT_ROLES.has(normalizeRoleCode(user.roleCode)) &&
    hasPermission(user, 'SITUATIONS_VIEW')
  )
}

/** Opciones de coordinación a partir del overview de la mesa. */
export function toExportCoordinationOptions(
  coordinations: ReadonlyArray<{
    id: string
    code: string
    name: string
    color?: string
    activeProblemsCount: number
  }>,
  labelByCode?: Readonly<Record<string, string>>,
): ExportCoordinationOption[] {
  return coordinations.map((coordination) => ({
    id: coordination.id,
    name: labelByCode?.[coordination.code] ?? coordination.name,
    activeCount: coordination.activeProblemsCount,
    color: coordination.color,
  }))
}
