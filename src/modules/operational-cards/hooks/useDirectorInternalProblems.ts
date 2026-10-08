import { useEffect, useState } from 'react'
import type { AnalysisPeriod } from '@/modules/operational-cards/domain/analysis-period'
import {
  fetchInternalProblems,
  fetchInternalRecurrence,
} from '@/modules/operational-cards/services/internal-problems.service'
import { OperationalKpiContractError } from '@/modules/operational-cards/services/operational-kpi.service'
import type {
  InternalProblemsResponse,
  InternalRecurrenceResponse,
} from '@/modules/operational-cards/types/internal-problems.types'
import { getErrorMessage } from '@/shared/utils/error'

export type DirectorInternosLoadStatus = 'idle' | 'loading' | 'error' | 'success'

type PeriodQuery = Pick<AnalysisPeriod, 'kind' | 'from' | 'to' | 'calendarEnd'>

/**
 * Una petición por (coordinación, periodo). El periodo se identifica por
 * kind/from/to/calendarEnd: revalidar su metadata no dispara requests.
 */
function useInternosQuery<T>(
  fetcher: (
    query: { coordinationId: string; period: PeriodQuery },
    init?: RequestInit,
  ) => Promise<T>,
  coordinationId: string | null,
  analysisPeriod: AnalysisPeriod | null,
) {
  const [status, setStatus] = useState<DirectorInternosLoadStatus>(() =>
    coordinationId && analysisPeriod ? 'loading' : 'idle',
  )
  const [loaded, setLoaded] = useState<{ coordinationId: string; data: T } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const kind = analysisPeriod?.kind
  const from = analysisPeriod?.from
  const to = analysisPeriod?.to
  const calendarEnd = analysisPeriod?.calendarEnd

  useEffect(() => {
    if (!coordinationId || !kind || !from || !to || !calendarEnd) {
      setStatus('idle')
      setLoaded(null)
      setError(null)
      return
    }
    const controller = new AbortController()
    setStatus('loading')
    setError(null)
    void fetcher(
      { coordinationId, period: { kind, from, to, calendarEnd } },
      { signal: controller.signal },
    )
      .then((response) => {
        if (controller.signal.aborted) return
        setLoaded({ coordinationId, data: response })
        setStatus('success')
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setLoaded(null)
        setStatus('error')
        setError(
          cause instanceof OperationalKpiContractError ? cause.message : getErrorMessage(cause),
        )
      })
    return () => controller.abort()
  }, [fetcher, coordinationId, kind, from, to, calendarEnd])

  // Al cambiar de PERIODO se conserva la lectura anterior (atenuada) mientras
  // carga; al cambiar de COORDINACIÓN nunca se muestra la de otra.
  const data = loaded && loaded.coordinationId === coordinationId ? loaded.data : null
  return { status, data, error }
}

/** Lámina AFECTACIONES ACTIVAS: foto al corte del periodo. */
export function useDirectorInternalProblems(
  coordinationId: string | null,
  analysisPeriod: AnalysisPeriod | null,
) {
  return useInternosQuery<InternalProblemsResponse>(
    fetchInternalProblems,
    coordinationId,
    analysisPeriod,
  )
}

/** Lámina RECURRENCIA: INTERNAL creados por categoría y bucket. */
export function useDirectorInternalRecurrence(
  coordinationId: string | null,
  analysisPeriod: AnalysisPeriod | null,
) {
  return useInternosQuery<InternalRecurrenceResponse>(
    fetchInternalRecurrence,
    coordinationId,
    analysisPeriod,
  )
}
