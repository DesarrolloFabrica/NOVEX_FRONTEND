import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AnalysisPeriod } from '@/modules/operational-cards/domain/analysis-period'
import { DirectorEstadoCarousel } from '@/modules/operational-cards/experience/director/DirectorEstadoCarousel'
import { DirectorInternosAfectaciones } from '@/modules/operational-cards/experience/director/DirectorInternosAfectaciones'
import { DirectorInternosRecurrencia } from '@/modules/operational-cards/experience/director/DirectorInternosRecurrencia'
import { internalProblemsReference } from '@/modules/operational-cards/experience/director/internal-problems.presentation'
import {
  useDirectorInternalProblems,
  useDirectorInternalRecurrence,
  type DirectorInternosLoadStatus,
} from '@/modules/operational-cards/hooks/useDirectorInternalProblems'
import type {
  InternalProblemsResponse,
  InternalRecurrenceResponse,
} from '@/modules/operational-cards/types/internal-problems.types'
import '@/styles/director-kpi-panel.css'
import '@/styles/director-internos.css'

/** Marca única de entorno local: los datos QA no son operación real. */
const SHOW_DEMO_MARK = import.meta.env.DEV

/**
 * Región de scroll vertical PROPIA de cada lámina de INTERNOS. El carrusel
 * compartido no cambia: flechas y puntos quedan fuera de esta región (siempre
 * accesibles) y cada página conserva su propio scrollTop.
 * `resetKey` (coordinación + periodo) vuelve al inicio: es otra lectura. Abrir
 * un detalle no la cambia, así que al volver se conserva la posición.
 */
function InternosScrollRegion({
  id,
  label,
  resetKey,
  children,
}: {
  id: string
  label: string
  resetKey: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  // Fade inferior discreto solo si queda contenido por debajo.
  const [more, setMore] = useState(false)
  const measure = useCallback(() => {
    const el = ref.current
    if (el) setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 2)
  }, [])
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0
    measure()
  }, [resetKey, measure])
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    return () => observer.disconnect()
  }, [measure])
  return (
    <div
      ref={ref}
      className="director-internos-scroll"
      data-testid={`director-internos-scroll-${id}`}
      data-more={more ? 'true' : 'false'}
      onScroll={measure}
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      {children}
    </div>
  )
}

export function DirectorInternosPanelView({
  hasCoordination,
  period,
  onPeriodChange,
  page,
  onPageChange,
  recurrenceStatus,
  recurrence,
  recurrenceError,
  problemsStatus,
  problems,
  problemsError,
  reference,
  openProblemId,
  onOpenProblem,
  showDemoMark = SHOW_DEMO_MARK,
  coordinationKey = null,
}: {
  hasCoordination: boolean
  period: AnalysisPeriod
  onPeriodChange: (next: AnalysisPeriod) => void
  page: number
  onPageChange: (page: number) => void
  recurrenceStatus: DirectorInternosLoadStatus
  recurrence: InternalRecurrenceResponse | null
  recurrenceError: string | null
  problemsStatus: DirectorInternosLoadStatus
  problems: InternalProblemsResponse | null
  problemsError: string | null
  reference: Date
  openProblemId: string | null
  onOpenProblem: ((problemId: string) => void) | null
  showDemoMark?: boolean
  /** Identidad de la coordinación: al cambiar, las láminas vuelven arriba. */
  coordinationKey?: string | null
}) {
  const resetKey = `${coordinationKey ?? ''}|${period.kind}|${period.from}|${period.calendarEnd}`
  if (!hasCoordination) {
    return (
      <div className="director-internos" data-testid="director-internos-panel">
        <p className="director-history__empty" data-testid="director-internos-empty">
          Selecciona una coordinación en la baraja para ver sus problemas internos.
        </p>
      </div>
    )
  }
  return (
    <div
      className="director-internos"
      data-testid="director-internos-panel"
      data-page={page}
      data-period-kind={period.kind}
      data-period-from={period.from}
    >
      {showDemoMark ? (
        <span className="director-internos__demo" data-testid="director-internos-demo">
          Datos de demostración
        </span>
      ) : null}
      <DirectorEstadoCarousel
        testIdPrefix="director-internos"
        ariaLabel="Gráficas de internos"
        page={page}
        onPageChange={onPageChange}
        pages={[
          {
            id: 'recurrencia',
            label: 'Recurrencia de problemas internos',
            content: (
              <InternosScrollRegion id="recurrencia" label="Recurrencia de problemas internos" resetKey={resetKey}>
                <DirectorInternosRecurrencia
                  period={period}
                  status={recurrenceStatus}
                  recurrence={recurrence}
                  error={recurrenceError}
                  onPeriodChange={onPeriodChange}
                />
              </InternosScrollRegion>
            ),
          },
          {
            id: 'afectaciones',
            label: 'Afectaciones de problemas activos',
            content: (
              <InternosScrollRegion id="afectaciones" label="Afectaciones de problemas activos" resetKey={resetKey}>
                <DirectorInternosAfectaciones
                  status={problemsStatus}
                  problems={problems}
                  error={problemsError}
                  reference={reference}
                  openProblemId={openProblemId}
                  onOpenProblem={onOpenProblem}
                />
              </InternosScrollRegion>
            ),
          },
        ]}
      />
    </div>
  )
}

/**
 * INTERNOS · dos láminas sobre el AnalysisPeriod GLOBAL del DirectorReadingPanel:
 *   1. RECURRENCIA (flujo por created_at) — su heatmap NAVEGA el periodo.
 *   2. AFECTACIONES ACTIVAS (foto al corte) — reacciona al periodo.
 * Sin selector temporal propio ni estado temporal local.
 */
export function DirectorInternosPanel({
  coordinationId,
  analysisPeriod,
  onAnalysisPeriodChange,
  page,
  onPageChange,
  openProblemId = null,
  onOpenProblem = null,
}: {
  coordinationId: string | null
  analysisPeriod: AnalysisPeriod
  onAnalysisPeriodChange: (next: AnalysisPeriod) => void
  page: number
  onPageChange: (page: number) => void
  openProblemId?: string | null
  onOpenProblem?: ((problemId: string) => void) | null
}) {
  const recurrence = useDirectorInternalRecurrence(coordinationId, analysisPeriod)
  const problems = useDirectorInternalProblems(coordinationId, analysisPeriod)
  const cutAt = problems.data?.period.cutAt ?? null
  const reference = useMemo(
    () => (cutAt ? internalProblemsReference(cutAt) : new Date()),
    [cutAt],
  )

  return (
    <DirectorInternosPanelView
      hasCoordination={coordinationId !== null}
      coordinationKey={coordinationId}
      period={analysisPeriod}
      onPeriodChange={onAnalysisPeriodChange}
      page={page}
      onPageChange={onPageChange}
      recurrenceStatus={recurrence.status}
      recurrence={recurrence.data}
      recurrenceError={recurrence.error}
      problemsStatus={problems.status}
      problems={problems.data}
      problemsError={problems.error}
      reference={reference}
      openProblemId={openProblemId}
      onOpenProblem={onOpenProblem}
    />
  )
}
