import { useEffect, useState } from 'react'
import type { AnalysisPeriod } from '@/modules/operational-cards/domain/analysis-period'
import {
  fetchOperationalKpiRelations,
  OperationalKpiContractError,
} from '@/modules/operational-cards/services/operational-kpi.service'
import type {
  OperationalKpiHistoryMetric,
  OperationalKpiRelationItem,
} from '@/modules/operational-cards/types/operational-kpi.types'
import { getErrorMessage } from '@/shared/utils/error'

export type DirectorRelationsLoadStatus = 'idle' | 'loading' | 'error' | 'success'

/** Relaciones INTER de la coordinación dentro del AnalysisPeriod común. */
export function useDirectorRelations(
  coordinationId: string | null,
  metric: OperationalKpiHistoryMetric,
  analysisPeriod: AnalysisPeriod | null,
) {
  const [status, setStatus] = useState<DirectorRelationsLoadStatus>(() =>
    coordinationId && analysisPeriod ? 'loading' : 'idle',
  )
  const [commitments, setCommitments] = useState<OperationalKpiRelationItem[]>(
    [],
  )
  const [dependencies, setDependencies] = useState<
    OperationalKpiRelationItem[]
  >([])
  const [error, setError] = useState<string | null>(null)
  /** Consulta a la que pertenecen las listas (evita leer datos de otro periodo). */
  const [loadedKey, setLoadedKey] = useState<string | null>(null)

  const from = analysisPeriod?.from
  const to = analysisPeriod?.to
  const queryKey =
    coordinationId && from && to
      ? `${coordinationId}|${metric}|${from}|${to}`
      : null

  useEffect(() => {
    if (!coordinationId || !from || !to) {
      setStatus('idle')
      setCommitments([])
      setDependencies([])
      setError(null)
      setLoadedKey(null)
      return
    }
    const controller = new AbortController()
    setStatus('loading')
    setError(null)

    void fetchOperationalKpiRelations(
      { coordinationId, metric, from, to },
      { signal: controller.signal },
    )
      .then((response) => {
        if (controller.signal.aborted) return
        setCommitments(response.commitments)
        setDependencies(response.dependencies)
        setLoadedKey(queryKey)
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
  }, [coordinationId, metric, from, to, queryKey])

  /** true solo cuando las listas corresponden a la consulta vigente. */
  const fresh = status === 'success' && loadedKey === queryKey

  return { status, commitments, dependencies, error, fresh }
}
