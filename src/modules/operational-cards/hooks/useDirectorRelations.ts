import { useEffect, useState } from 'react'
import {
  fetchOperationalKpiRelations,
  OperationalKpiContractError,
} from '@/modules/operational-cards/services/operational-kpi.service'
import type {
  OperationalKpiHistoryGranularity,
  OperationalKpiHistoryMetric,
  OperationalKpiRelationItem,
} from '@/modules/operational-cards/types/operational-kpi.types'
import { buildDefaultHistoryRange } from '@/modules/operational-cards/utils/kpi-history-range'
import { getErrorMessage } from '@/shared/utils/error'

export type DirectorRelationsLoadStatus = 'idle' | 'loading' | 'error' | 'success'

export function useDirectorRelations(
  coordinationId: string | null,
  metric: OperationalKpiHistoryMetric,
  granularity: OperationalKpiHistoryGranularity,
) {
  const [status, setStatus] = useState<DirectorRelationsLoadStatus>('idle')
  const [commitments, setCommitments] = useState<OperationalKpiRelationItem[]>(
    [],
  )
  const [dependencies, setDependencies] = useState<
    OperationalKpiRelationItem[]
  >([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!coordinationId) {
      setStatus('idle')
      setCommitments([])
      setDependencies([])
      setError(null)
      return
    }
    const controller = new AbortController()
    const range = buildDefaultHistoryRange(granularity)
    setStatus('loading')
    setError(null)

    void fetchOperationalKpiRelations(
      {
        coordinationId,
        metric,
        from: range.from,
        to: range.to,
      },
      { signal: controller.signal },
    )
      .then((response) => {
        if (controller.signal.aborted) return
        setCommitments(response.commitments)
        setDependencies(response.dependencies)
        setStatus('success')
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setCommitments([])
        setDependencies([])
        setStatus('error')
        setError(
          cause instanceof OperationalKpiContractError
            ? cause.message
            : getErrorMessage(cause),
        )
      })

    return () => controller.abort()
  }, [coordinationId, metric, granularity])

  return { status, commitments, dependencies, error }
}
