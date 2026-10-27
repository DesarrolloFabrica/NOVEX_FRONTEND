import { useCallback, useEffect, useRef, useState } from 'react'
import type { SituationsListScope } from '@/modules/api/situations.api'
import type { CoordinationPanelProblem } from '@/modules/operational-cards/data/coordinationProblemFilters'
import { fetchClosedCoordinationProblems } from '@/modules/operational-cards/services/coordination-problems.service'
import type { SituationSeverity } from '@/modules/situations/types/situation.types'
import { getErrorMessage } from '@/shared/utils/error'

export type ClosedProblemsStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface ClosedCoordinationProblemsState {
  status: ClosedProblemsStatus
  problems: readonly CoordinationPanelProblem[]
  total: number
  scope: SituationsListScope
  hasMore: boolean
  loadingMore: boolean
  loadMoreError: string | null
  errorMessage: string | null
  loadMore: () => void
  retry: () => void
}

interface InternalState {
  key: string | null
  status: ClosedProblemsStatus
  problems: readonly CoordinationPanelProblem[]
  total: number
  page: number
  limit: number
  scope: SituationsListScope
  loadingMore: boolean
  loadMoreError: string | null
  errorMessage: string | null
}

const IDLE: InternalState = {
  key: null,
  status: 'idle',
  problems: [],
  total: 0,
  page: 0,
  limit: 0,
  scope: 'complete',
  loadingMore: false,
  loadMoreError: null,
  errorMessage: null,
}

/**
 * Cerrados de la coordinación observada, paginados, SOLO mientras el filtro de
 * estado los pide. Estado local del panel: no entra en el reducer, así que no
 * puede alterar LEVEL 1, el snapshot, los KPI ni las vidas.
 *
 * Cada combinación coordinación + severidad es una consulta distinta; una
 * respuesta que llega cuando la combinación ya cambió se descarta. Las páginas
 * siguientes se añaden sin duplicar ids (un cierre nuevo desplaza el offset).
 */
export function useClosedCoordinationProblems(input: {
  coordinationUuid: string
  severity: SituationSeverity | null
  enabled: boolean
}): ClosedCoordinationProblemsState {
  const key = input.enabled
    ? `${input.coordinationUuid}|${input.severity ?? 'ALL'}`
    : null
  const [state, setState] = useState<InternalState>(IDLE)
  const [attempt, setAttempt] = useState(0)
  const keyRef = useRef(key)
  keyRef.current = key

  const { coordinationUuid, severity } = input

  useEffect(() => {
    if (!key) return
    let cancelled = false
    setState({ ...IDLE, key, status: 'loading' })

    fetchClosedCoordinationProblems({ coordinationUuid, severity, page: 1 })
      .then((page) => {
        if (cancelled) return
        setState({
          ...IDLE,
          key,
          status: 'ready',
          problems: page.problems,
          total: page.total,
          page: page.page,
          limit: page.limit,
          scope: page.scope,
        })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setState({
          ...IDLE,
          key,
          status: 'error',
          errorMessage: getErrorMessage(error),
        })
      })

    return () => {
      cancelled = true
    }
  }, [key, coordinationUuid, severity, attempt])

  // Mientras el efecto no ha corrido para la combinación nueva, lo que hay en
  // memoria es de OTRA consulta: se presenta como carga, nunca como resultado.
  const current: InternalState =
    key === null
      ? IDLE
      : state.key === key
        ? state
        : { ...IDLE, key, status: 'loading' }

  const hasMore =
    current.status === 'ready' && current.page * current.limit < current.total

  const loadMore = useCallback(() => {
    if (!key || state.key !== key) return
    if (state.status !== 'ready' || state.loadingMore) return
    if (state.page * state.limit >= state.total) return

    const nextPage = state.page + 1
    setState((previous) => ({ ...previous, loadingMore: true, loadMoreError: null }))

    fetchClosedCoordinationProblems({ coordinationUuid, severity, page: nextPage })
      .then((page) => {
        if (keyRef.current !== key) return
        setState((previous) => {
          if (previous.key !== key) return previous
          const seen = new Set(previous.problems.map((problem) => problem.id))
          return {
            ...previous,
            problems: [
              ...previous.problems,
              ...page.problems.filter((problem) => !seen.has(problem.id)),
            ],
            total: page.total,
            page: page.page,
            scope: page.scope,
            loadingMore: false,
          }
        })
      })
      .catch((error: unknown) => {
        if (keyRef.current !== key) return
        setState((previous) =>
          previous.key !== key
            ? previous
            : {
                ...previous,
                loadingMore: false,
                loadMoreError: getErrorMessage(error),
              },
        )
      })
  }, [key, state, coordinationUuid, severity])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])

  return {
    status: current.status,
    problems: current.problems,
    total: current.total,
    scope: current.scope,
    hasMore,
    loadingMore: current.loadingMore,
    loadMoreError: current.loadMoreError,
    errorMessage: current.errorMessage,
    loadMore,
    retry,
  }
}
