import { useEffect, useState } from 'react'
import type { AnalysisPeriod } from '@/modules/operational-cards/domain/analysis-period'
import {
  fetchOperationalKpiPeriodHistory,
  OperationalKpiContractError,
} from '@/modules/operational-cards/services/operational-kpi.service'
import type {
  OperationalKpiDependencySide,
  OperationalKpiHistoryMetric,
  OperationalKpiHistoryPoint,
} from '@/modules/operational-cards/types/operational-kpi.types'
import { getErrorMessage } from '@/shared/utils/error'

export type DirectorPeriodHistoryStatus = 'idle' | 'loading' | 'error' | 'success'

export type DirectorPeriodHistoryFilter =
  | { categoryId: string }
  | { partnerCoordinationId: string; dependencySide: OperationalKpiDependencySide }

/**
 * Evolución de una serie (categoría INTERNAL o pareja INTER) dentro del
 * AnalysisPeriod común. La resolución la decide el backend como en /state:
 * week → día, month → semana, cycle → mes. Sin selector temporal propio.
 * `filter = null` → no consulta (nada seleccionado).
 */
export function useDirectorPeriodHistory(
  coordinationId: string | null,
  metric: OperationalKpiHistoryMetric,
  analysisPeriod: AnalysisPeriod | null,
  filter: DirectorPeriodHistoryFilter | null,
) {
  const [status, setStatus] = useState<DirectorPeriodHistoryStatus>('idle')
  const [series, setSeries] = useState<OperationalKpiHistoryPoint[]>([])
  const [bucket, setBucket] = useState<'day' | 'week' | 'month' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const kind = analysisPeriod?.kind
  const from = analysisPeriod?.from
  const to = analysisPeriod?.to
  const calendarEnd = analysisPeriod?.calendarEnd
  const categoryId =
    filter && 'categoryId' in filter ? filter.categoryId : undefined
  const partnerCoordinationId =
    filter && 'partnerCoordinationId' in filter
      ? filter.partnerCoordinationId
      : undefined
  const dependencySide =
    filter && 'dependencySide' in filter ? filter.dependencySide : undefined

  useEffect(() => {
    if (
      !coordinationId ||
      !kind ||
      !from ||
      !to ||
      !calendarEnd ||
      (!categoryId && !partnerCoordinationId)
    ) {
      setStatus('idle')
      setSeries([])
      setBucket(null)
      setError(null)
      return
    }

    const controller = new AbortController()
    setStatus('loading')
    setError(null)

    void fetchOperationalKpiPeriodHistory(
      {
        coordinationId,
        metric,
        kind,
        from,
        to,
        calendarEnd,
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
        setBucket(response.period.bucket)
        setStatus('success')
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        if (cause instanceof DOMException && cause.name === 'AbortError') {
          return
        }
        setSeries([])
        setBucket(null)
        setStatus('error')
        setError(
          cause instanceof OperationalKpiContractError
            ? cause.message
            : getErrorMessage(cause),
        )
      })

    return () => controller.abort()
  }, [
    coordinationId,
    metric,
    kind,
    from,
    to,
    calendarEnd,
    categoryId,
    partnerCoordinationId,
    dependencySide,
  ])

  return { status, series, bucket, error }
}
