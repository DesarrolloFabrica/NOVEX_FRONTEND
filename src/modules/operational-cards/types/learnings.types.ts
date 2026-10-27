import type { InternosPeriod } from '@/modules/operational-cards/types/internal-problems.types'
import type { SituationReportKind } from '@/modules/situations/types/situation.types'

/**
 * APRENDIZAJES del Director (`/operational-kpis/learnings*`). Universo:
 * problemas cuya coordinación RESPONSABLE es la seleccionada, cerrados
 * (`closedAt`) dentro del AnalysisPeriod. Nunca la afectada.
 */

/** Id centinela de «Sin categoría» (mismo que Recurrencia en el backend). */
export const LEARNINGS_UNCATEGORIZED_ID = '00000000-0000-4000-8000-000000000099'

export interface LearningCategory {
  id: string
  code: string
  name: string
  /** false = categoría histórica, ya no seleccionable en altas nuevas. */
  selectable: boolean
  count: number
}

export interface LearningsSummary {
  coordinationId: string
  period: InternosPeriod
  closedCount: number
  learningCount: number
  withoutLearningCount: number
  /** Entero 0–100, o null si no hubo cierres. */
  coverage: number | null
  /** Solo categorías con aprendizajes, cantidad ↓. */
  categories: readonly LearningCategory[]
}

export interface LearningItem {
  situationId: string
  title: string
  reportKind: SituationReportKind
  category: Omit<LearningCategory, 'count'>
  closedAt: string
  resolvedAt: string | null
  recordedAt: string
  resolvedByName: string | null
  learningExcerpt: string
  learningTruncated: boolean
  learningLength: number
}

export interface LearningItemsPage {
  coordinationId: string
  categoryId: string | null
  total: number
  page: number
  limit: number
  items: readonly LearningItem[]
}
