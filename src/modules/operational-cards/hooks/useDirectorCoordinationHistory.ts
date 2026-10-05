import { useEffect, useState } from 'react'
import {
  fetchOperationalKpiHistory,
  OperationalKpiContractError,
} from '@/modules/operational-cards/services/operational-kpi.service'
import type {
  OperationalKpiDependencySide,
  OperationalKpiHistoryGranularity,
  OperationalKpiHistoryMetric,
  OperationalKpiHistoryPoint,
} from '@/modules/operational-cards/types/operational-kpi.types'
import { buildDefaultHistoryRange } from '@/modules/operational-cards/utils/kpi-history-range'
import { getErrorMessage } from '@/shared/utils/error'

export type DirectorHistoryLoadStatus = 'idle' | 'loading' | 'error' | 'success'

export function useDirectorCoordinationHistory(
  coordinationId: string | null,
  metric: OperationalKpiHistoryMetric,
  granularity: OperationalKpiHistoryGranularity,
  categoryId: string | null = null,
  partnerCoordinationId: string | null = null,
  dependencySide: OperationalKpiDependencySide | null = null,
) {
  const [status, setStatus] = useState<DirectorHistoryLoadStatus>('idle')
  const [series, setSeries] = useState<OperationalKpiHistoryPoint[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!coordinationId) {
      setStatus('idle')
      setSeries([])
      setError(null)
      return
    }
    if (partnerCoordinationId && !dependencySide) {
      setStatus('idle')
      setSeries([])
      setError(null)
      return
    }

    const controller = new AbortController()
    const range = buildDefaultHistoryRange(granularity)
    setStatus('loading')
    setError(null)

    void fetchOperationalKpiHistory(
      {
        coordinationId,
        metric,
        granularity,
        from: range.from,
        to: range.to,
        ...(categoryId ? { categoryId } : {}),
        ...(partnerCoordinationId && dependencySide
          ? { partnerCoordinationId, dependencySide }
          : {}),
      },
      { signal: controller.signal },
    )
      .then((response) => {
        if (controller.signal.aborted) return
        setSeries(response.series)
        setStatus('success')
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        if (cause instanceof DOMException && cause.name === 'AbortError') {
          return
        }
        setSeries([])
        setStatus('error')
        setError(
          cause instanceof OperationalKpiContractError
            ? cause.message
            : getErrorMessage(cause),
        )
      })

    return () => {
      controller.abort()
    }
  }, [
    coordinationId,
    metric,
    granularity,
    categoryId,
    partnerCoordinationId,
    dependencySide,
  ])

  return { status, series, error }
}
