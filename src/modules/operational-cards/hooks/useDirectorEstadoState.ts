import { useEffect, useState } from 'react'
import type { AnalysisPeriod } from '@/modules/operational-cards/domain/analysis-period'
import {
  fetchOperationalKpiState,
  OperationalKpiContractError,
} from '@/modules/operational-cards/services/operational-kpi.service'
import type { OperationalKpiStateResponse } from '@/modules/operational-cards/types/operational-kpi.types'
import { getErrorMessage } from '@/shared/utils/error'

/** `idle` = sin coordinación o sin periodo: no hay nada que consultar. */
export type DirectorEstadoLoadStatus = 'idle' | 'loading' | 'error' | 'success'

/**
 * Una sola consulta de ESTADO para el AnalysisPeriod seleccionado.
 * Aborta requests obsoletos al navegar rápido.
 */
export function useDirectorEstadoState(
  coordinationId: string | null,
  analysisPeriod: AnalysisPeriod | null,
) {
  // Con entradas presentes el primer render ya es 'loading' (evita un frame
  // de composición en cero antes de que corra el efecto).
  const [status, setStatus] = useState<DirectorEstadoLoadStatus>(() =>
    coordinationId && analysisPeriod ? 'loading' : 'idle',
  )
  const [data, setData] = useState<OperationalKpiStateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!coordinationId || !analysisPeriod) {
      setStatus('idle')
      setData(null)
      setError(null)
      return
    }

    const controller = new AbortController()
    setStatus('loading')
    setError(null)

    void fetchOperationalKpiState(
      {
        coordinationId,
        from: analysisPeriod.from,
        to: analysisPeriod.to,
        kind: analysisPeriod.kind,
        calendarEnd: analysisPeriod.calendarEnd,
      },
      { signal: controller.signal },
    )
      .then((response) => {
        if (controller.signal.aborted) return
        setData(response)
        setStatus('success')
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        if (cause instanceof DOMException && cause.name === 'AbortError') {
          return
        }
        setData(null)
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
    analysisPeriod?.from,
    analysisPeriod?.to,
    analysisPeriod?.kind,
    analysisPeriod?.calendarEnd,
  ])

  return { status, data, error }
}
