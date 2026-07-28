import { useCallback, useEffect, useState } from 'react'
import type {
  SituationRegistryCategoryOption,
  SituationRegistryData,
  SituationRegistryIndicators,
  SituationRegistryRow,
  SituationRegistrySummary,
} from '@/modules/api/types/situation-registry.types'
import { fetchCoordinations } from '@/modules/api/coordinations.api'
import type { CoordinationSummary } from '@/modules/situations/types/situation.types'
import { loadSituationRegistryData } from '@/modules/services/situationRegistryData.service'
import { getErrorMessage } from '@/shared/utils/error'

export function useSituationRegistry() {
  const [rows, setRows] = useState<SituationRegistryRow[]>([])
  const [summary, setSummary] = useState<SituationRegistrySummary>({
    openSituations: 0,
    criticalSituations: 0,
    closedSituations: 0,
    pendingRecommendations: 0,
    averageAiConfidence: null,
  })
  const [indicators, setIndicators] = useState<SituationRegistryIndicators>({
    withAnalysis: 0,
    withoutAnalysis: 0,
    reanalyzed: 0,
    withPendingRecommendations: 0,
  })
  const [categories, setCategories] = useState<SituationRegistryCategoryOption[]>(
    [],
  )
  const [coordinations, setCoordinations] = useState<CoordinationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const applyData = useCallback((data: SituationRegistryData) => {
    setRows(data.rows)
    setSummary(data.summary)
    setIndicators(data.indicators)
    setCategories(data.categories)
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [data, coordinationsResponse] = await Promise.all([
        loadSituationRegistryData(),
        fetchCoordinations(),
      ])
      applyData(data)
      setCoordinations(coordinationsResponse)
    } catch (loadError) {
      setRows([])
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [applyData])

  useEffect(() => {
    void reload()
  }, [reload])

  return {
    rows,
    summary,
    indicators,
    categories,
    coordinations,
    loading,
    error,
    reload,
  }
}
