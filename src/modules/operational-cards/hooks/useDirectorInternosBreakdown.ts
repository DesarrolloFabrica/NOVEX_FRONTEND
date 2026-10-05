import { useEffect, useState } from 'react'
import {
  fetchOperationalKpiBreakdown,
  OperationalKpiContractError,
} from '@/modules/operational-cards/services/operational-kpi.service'
import type {
  OperationalKpiBreakdownItem,
  OperationalKpiHistoryGranularity,
  OperationalKpiHistoryMetric,
} from '@/modules/operational-cards/types/operational-kpi.types'
import { buildDefaultHistoryRange } from '@/modules/operational-cards/utils/kpi-history-range'
import {
  buildPreviousHistoryRange,
  isIncompleteCurrentPeriod,
} from '@/modules/operational-cards/utils/kpi-period-compare'
import { getErrorMessage } from '@/shared/utils/error'

export type DirectorBreakdownLoadStatus = 'idle' | 'loading' | 'error' | 'success'

export type InternosBreakdownItem = OperationalKpiBreakdownItem & {
  previousValue: number
  delta: number
}

export function useDirectorInternosBreakdown(
  coordinationId: string | null,
  metric: OperationalKpiHistoryMetric,
  granularity: OperationalKpiHistoryGranularity,
) {
  const [status, setStatus] = useState<DirectorBreakdownLoadStatus>('idle')
  const [items, setItems] = useState<InternosBreakdownItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [incompletePeriod, setIncompletePeriod] = useState(false)

  useEffect(() => {
    if (!coordinationId) {
      setStatus('idle')
      setItems([])
      setError(null)
      setIncompletePeriod(false)
      return
    }

    const controller = new AbortController()
    const range = buildDefaultHistoryRange(granularity)
    const previous = buildPreviousHistoryRange(range, granularity)
    setStatus('loading')
    setError(null)
    setIncompletePeriod(isIncompleteCurrentPeriod(range.to, granularity))

    void Promise.all([
      fetchOperationalKpiBreakdown(
        {
          coordinationId,
          metric,
          from: range.from,
          to: range.to,
        },
        { signal: controller.signal },
      ),
      fetchOperationalKpiBreakdown(
        {
          coordinationId,
          metric,
          from: previous.from,
          to: previous.to,
        },
        { signal: controller.signal },
      ),
    ])
      .then(([current, prior]) => {
        if (controller.signal.aborted) return
        const priorMap = new Map(
          prior.items.map((item) => [item.category.id, item.value]),
        )
        setItems(
          current.items.map((item) => {
            const previousValue = priorMap.get(item.category.id) ?? 0
            return {
              ...item,
              previousValue,
              delta: item.value - previousValue,
            }
          }),
        )
        setStatus('success')
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        if (cause instanceof DOMException && cause.name === 'AbortError') {
          return
        }
        setItems([])
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
  }, [coordinationId, metric, granularity])

  return { status, items, error, incompletePeriod }
}
