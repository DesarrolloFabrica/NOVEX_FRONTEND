import { clearPersistedLearningDrafts } from '@/modules/operational-cards/services/learning-persistence'
import { clearAllReasonDrafts } from '@/modules/operational-cards/services/reason-draft-persistence'
import { persistReportDrafts } from '@/modules/operational-cards/services/report-persistence'

/**
 * Limpieza voluntaria (logout): borra borradores del usuario en este navegador.
 * La caducidad involuntaria NO debe llamar esto: ahí se restauran al reentrar.
 */
export function clearUserOperationalDrafts(scope: string | null): void {
  if (!scope) return
  persistReportDrafts(scope, {})
  clearPersistedLearningDrafts(scope)
  clearAllReasonDrafts(scope)
}
