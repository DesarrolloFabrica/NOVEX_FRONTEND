import type { User } from '@/modules/auth/types/user.types'
import { hasPermission } from '@/modules/auth/utils/permissions'
import { isAnalyzableSituationStatus } from '@/modules/operational-cards/types/problem-analysis.types'

/** Lectura del informe vigente / historial (`AI_VIEW_REPORTS`). */
export function canViewSituationAnalysis(
  user: Pick<User, 'permissions'> | null | undefined,
): boolean {
  return hasPermission(user, 'AI_VIEW_REPORTS')
}

/**
 * Ejecutar o reanalizar (`AI_ANALYZE`) solo en OPEN / IN_PROGRESS.
 * ADMIN/DIRECTOR no tienen el permiso en catálogo; el API es la autoridad.
 */
export function canExecuteSituationAnalysis(
  user: Pick<User, 'permissions'> | null | undefined,
  situationStatus: string | null | undefined,
): boolean {
  if (!hasPermission(user, 'AI_ANALYZE')) return false
  return isAnalyzableSituationStatus(situationStatus)
}
