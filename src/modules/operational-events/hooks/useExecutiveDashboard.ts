import { useCallback, useEffect, useState } from 'react'
import type { ExecutiveDashboardData } from '@/modules/api/types/dashboard.types'
import { loadExecutiveDashboardData } from '@/modules/services/dashboardData.service'
import { getErrorMessage } from '@/shared/utils/error'

export function useExecutiveDashboard() {
  const [data, setData] = useState<ExecutiveDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const next = await loadExecutiveDashboardData()
      setData(next)
    } catch (loadError) {
      setData(null)
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const isEmpty =
    !loading &&
    !error &&
    data !== null &&
    data.kpis.openSituations === 0 &&
    data.kpis.resolvedSituations === 0

  return {
    data,
    loading,
    error,
    isEmpty,
    reload,
  }
}
