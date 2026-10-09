import { useCallback, useEffect, useRef, useState } from 'react'
import type { AnalysisPeriod } from '@/modules/operational-cards/domain/analysis-period'
import {
  fetchLearningItems,
  fetchLearningsSummary,
} from '@/modules/operational-cards/services/learnings.service'
import { OperationalKpiContractError } from '@/modules/operational-cards/services/operational-kpi.service'
import type {
  LearningItem,
  LearningsSummary,
} from '@/modules/operational-cards/types/learnings.types'
import { getErrorMessage } from '@/shared/utils/error'

export type DirectorLearningsLoadStatus = 'idle' | 'loading' | 'error' | 'success'

type PeriodQuery = Pick<AnalysisPeriod, 'kind' | 'from' | 'to' | 'calendarEnd'>

/** Identidad de una lectura: coordinación + periodo (sin su metadata). */
export function learningsKey(
  coordinationId: string | null,
  period: PeriodQuery | null,
): string | null {
  if (!coordinationId || !period) return null
  return [coordinationId, period.kind, period.from, period.to, period.calendarEnd].join('|')
}

function messageOf(cause: unknown): string {
  return cause instanceof OperationalKpiContractError ? cause.message : getErrorMessage(cause)
}

function isAbort(cause: unknown): boolean {
  return cause instanceof DOMException && cause.name === 'AbortError'
}

/**
 * RESUMEN (indicadores + categorías) del periodo completo. Los datos solo se
 * exponen si pertenecen a la coordinación Y al periodo actuales: al cambiar
 * cualquiera de los dos no se muestra la lectura anterior como si fuera nueva.
 */
export function useDirectorLearningsSummary(
  coordinationId: string | null,
  analysisPeriod: AnalysisPeriod | null,
) {
  const key = learningsKey(coordinationId, analysisPeriod)
  const [loaded, setLoaded] = useState<{ key: string; data: LearningsSummary } | null>(null)
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null)
  const [attempt, setAttempt] = useState(0)

  const kind = analysisPeriod?.kind
  const from = analysisPeriod?.from
  const to = analysisPeriod?.to
  const calendarEnd = analysisPeriod?.calendarEnd

  useEffect(() => {
    if (!key || !coordinationId || !kind || !from || !to || !calendarEnd) return
    const controller = new AbortController()
    setFailure(null)
    void fetchLearningsSummary(
      { coordinationId, period: { kind, from, to, calendarEnd } },
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) setLoaded({ key, data })
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || isAbort(cause)) return
        setFailure({ key, message: messageOf(cause) })
      })
    return () => controller.abort()
  }, [key, coordinationId, kind, from, to, calendarEnd, attempt])

  const data = loaded && loaded.key === key ? loaded.data : null
  const error = failure && failure.key === key ? failure.message : null
  const status: DirectorLearningsLoadStatus = !key
    ? 'idle'
    : error
      ? 'error'
      : data
        ? 'success'
        : 'loading'
  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { status, data, error, retry }
}

interface ItemsState {
  key: string
  items: readonly LearningItem[]
  total: number
  page: number
}

/** Agrega una página sin duplicar fichas (por id de problema). */
export function appendLearningItems(
  current: readonly LearningItem[],
  incoming: readonly LearningItem[],
): LearningItem[] {
  const seen = new Set(current.map((item) => item.situationId))
  const next = [...current]
  for (const item of incoming) {
    if (seen.has(item.situationId)) continue
    seen.add(item.situationId)
    next.push(item)
  }
  return next
}

/**
 * FICHAS paginadas en el servidor (closedAt ↓). La primera página se pide al
 * cambiar coordinación, periodo o categoría; «Cargar más» pide la siguiente
 * del MISMO filtro y la agrega sin duplicados.
 */
export function useDirectorLearningItems(
  coordinationId: string | null,
  analysisPeriod: AnalysisPeriod | null,
  categoryId: string | null,
) {
  const baseKey = learningsKey(coordinationId, analysisPeriod)
  const key = baseKey ? `${baseKey}|${categoryId ?? '*'}` : null
  const [state, setState] = useState<ItemsState | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [failure, setFailure] = useState<{ key: string; message: string; more: boolean } | null>(
    null,
  )
  const [attempt, setAttempt] = useState(0)
  const keyRef = useRef(key)
  keyRef.current = key
  const moreControllerRef = useRef<AbortController | null>(null)

  const kind = analysisPeriod?.kind
  const from = analysisPeriod?.from
  const to = analysisPeriod?.to
  const calendarEnd = analysisPeriod?.calendarEnd

  useEffect(() => {
    moreControllerRef.current?.abort()
    setLoadingMore(false)
    if (!key || !coordinationId || !kind || !from || !to || !calendarEnd) return
    const controller = new AbortController()
    setFailure(null)
    void fetchLearningItems(
      { coordinationId, period: { kind, from, to, calendarEnd }, categoryId, page: 1 },
      { signal: controller.signal },
    )
      .then((page) => {
        if (controller.signal.aborted) return
        setState({ key, items: appendLearningItems([], page.items), total: page.total, page: 1 })
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || isAbort(cause)) return
        setFailure({ key, message: messageOf(cause), more: false })
      })
    return () => controller.abort()
  }, [key, coordinationId, kind, from, to, calendarEnd, categoryId, attempt])

  const current = state && state.key === key ? state : null

  const loadMore = useCallback(() => {
    if (!current || loadingMore || !coordinationId || !kind || !from || !to || !calendarEnd) return
    if (current.items.length >= current.total) return
    const requestKey = current.key
    const nextPage = current.page + 1
    const controller = new AbortController()
    moreControllerRef.current = controller
    setLoadingMore(true)
    setFailure(null)
    void fetchLearningItems(
      { coordinationId, period: { kind, from, to, calendarEnd }, categoryId, page: nextPage },
      { signal: controller.signal },
    )
      .then((page) => {
        if (controller.signal.aborted || keyRef.current !== requestKey) return
        setState((prev) =>
          prev && prev.key === requestKey
            ? {
                key: requestKey,
                items: appendLearningItems(prev.items, page.items),
                total: page.total,
                page: nextPage,
              }
            : prev,
        )
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || isAbort(cause) || keyRef.current !== requestKey) return
        setFailure({ key: requestKey, message: messageOf(cause), more: true })
      })
      .finally(() => {
        if (moreControllerRef.current === controller) setLoadingMore(false)
      })
  }, [current, loadingMore, coordinationId, kind, from, to, calendarEnd, categoryId])

  useEffect(() => () => moreControllerRef.current?.abort(), [])

  const error = failure && failure.key === key ? failure : null
  const status: DirectorLearningsLoadStatus = !key
    ? 'idle'
    : error && !error.more
      ? 'error'
      : current
        ? 'success'
        : 'loading'
  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  return {
    status,
    items: current?.items ?? [],
    total: current?.total ?? 0,
    hasMore: current ? current.items.length < current.total : false,
    loadingMore,
    error: error?.message ?? null,
    moreError: error?.more ? error.message : null,
    loadMore,
    retry,
  }
}
