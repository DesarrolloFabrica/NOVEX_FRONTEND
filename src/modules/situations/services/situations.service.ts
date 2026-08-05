import { fetchIncidentCategories } from '@/modules/api/situations.api'
import type { IncidentCategorySummary } from '@/modules/situations/types/situation.types'

export async function fetchIncidentCategoriesRequest(): Promise<
  IncidentCategorySummary[]
> {
  return fetchIncidentCategories()
}
