import { useCallback, useEffect, useRef, useState } from 'react'
import {
  buildCurrentCyclePeriod,
  refreshAnalysisPeriod,
  type AnalysisPeriod,
} from '@/modules/operational-cards/domain/analysis-period'
import { DirectorAnalysisPeriodPicker } from '@/modules/operational-cards/experience/director/DirectorAnalysisPeriodPicker'
import { DirectorAprendizajesPanel } from '@/modules/operational-cards/experience/director/DirectorAprendizajesPanel'
import { DirectorDependenciasPanel } from '@/modules/operational-cards/experience/director/DirectorDependenciasPanel'
import { DirectorEstadoPanel } from '@/modules/operational-cards/experience/director/DirectorEstadoPanel'
import { DirectorInternosPanel } from '@/modules/operational-cards/experience/director/DirectorInternosPanel'
import { DirectorReadingContextHeader } from '@/modules/operational-cards/experience/director/DirectorReadingContextHeader'
import type { DirectorKpiLoadStatus } from '@/modules/operational-cards/hooks/useDirectorKpi'
import type {
  OperationalKpiCoordinationSnapshot,
  OperationalKpiDependencySide,
  OperationalKpiDirectionSnapshot,
  OperationalKpiHistoryMetric,
} from '@/modules/operational-cards/types/operational-kpi.types'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import '@/styles/director-kpi-panel.css'

export type DirectorReadingMode =
  | 'state'
  | 'internos'
  | 'dependencias'
  | 'aprendizajes'

const MODES: ReadonlyArray<{
  id: DirectorReadingMode
  label: string
}> = [
  { id: 'state', label: 'Estado' },
  { id: 'internos', label: 'Internos' },
  { id: 'dependencias', label: 'Dependencias' },
  { id: 'aprendizajes', label: 'Aprendizajes' },
]

function updateScrollMore(
  el: HTMLElement | null,
  setCanScrollMore: (value: boolean) => void,
) {
  if (!el) {
    setCanScrollMore(false)
    return
  }
  setCanScrollMore(el.scrollTop + el.clientHeight < el.scrollHeight - 6)
}

export function DirectorReadingPanel({
  selectedCoordination,
  directionStatus,
  direction,
  directionError,
  onRetryDirection,
  coordinationStatus,
  coordination,
  coordinationError,
  openProblemId = null,
  onOpenProblem = null,
}: {
  selectedCoordination: CoordinationOverview | null
  directionStatus: DirectorKpiLoadStatus
  direction: OperationalKpiDirectionSnapshot | null
  directionError: string | null
  onRetryDirection: () => void
  coordinationStatus: DirectorKpiLoadStatus
  coordination: OperationalKpiCoordinationSnapshot | null
  coordinationError: string | null
  /** Problema abierto en el panel central (fila marcada en INTERNOS). */
  openProblemId?: string | null
  /** Abre el detalle existente, en solo lectura, en el panel central. */
  onOpenProblem?: ((problemId: string) => void) | null
}) {
  const [mode, setMode] = useState<DirectorReadingMode>('state')
  /**
   * Única fuente temporal de toda la lectura de coordinación
   * (ESTADO · INTERNOS · DEPENDENCIAS · APRENDIZAJES). Sobrevive a cambios de
   * tab y de coordinación: una coordinación + un periodo = una lectura.
   */
  const [analysisPeriod, setAnalysisPeriod] = useState<AnalysisPeriod>(() =>
    // Default de producto: el ciclo actual (perspectiva amplia → drill-down).
    buildCurrentCyclePeriod(),
  )
  const [relationsMetric, setRelationsMetric] =
    useState<OperationalKpiHistoryMetric>('created')
  const [relationsPartnerId, setRelationsPartnerId] = useState<string | null>(
    null,
  )
  const [relationsSide, setRelationsSide] =
    useState<OperationalKpiDependencySide | null>(null)
  const onRelationsSelectionChange = useCallback(
    (
      partnerId: string | null,
      side: OperationalKpiDependencySide | null,
    ) => {
      setRelationsPartnerId(partnerId)
      setRelationsSide(side)
    },
    [],
  )
  /**
   * Lámina del carrusel de ESTADO. Vive aquí (no en ESTADO) para sobrevivir
   * a cambios de tab, de coordinación y de periodo: permite comparar la misma
   * dimensión entre coordinaciones sin volver a navegar. No es un filtro.
   */
  const [estadoPage, setEstadoPage] = useState(0)
  /** Lámina de INTERNOS (Recurrencia | Afectaciones): misma regla que ESTADO. */
  const [internosPage, setInternosPage] = useState(0)
  const [canScrollMore, setCanScrollMore] = useState(false)
  const bodyRef = useRef<HTMLDivElement | null>(null)

  const selected = selectedCoordination !== null
  const coordinationKey = selectedCoordination?.id ?? null
  // ESTADO e INTERNOS de coordinación caben enteros (carrusel): sin scroll ni
  // pista de «hay más abajo». Los demás modos conservan su scroll.
  const fixedHeight = (mode === 'state' || mode === 'internos') && selected

  // «Actual / en curso» caduca si la app queda abierta al cambiar de día.
  // Se revalida al volver a la pestaña (sin polling); el picker también
  // revalida al abrirse. El periodo elegido no cambia, solo su metadata.
  useEffect(() => {
    const revalidate = () => {
      if (document.visibilityState === 'hidden') return
      setAnalysisPeriod((current) => refreshAnalysisPeriod(current))
    }
    document.addEventListener('visibilitychange', revalidate)
    window.addEventListener('focus', revalidate)
    return () => {
      document.removeEventListener('visibilitychange', revalidate)
      window.removeEventListener('focus', revalidate)
    }
  }, [])

  // Cambiar de coordinación conserva el periodo pero limpia selecciones que
  // pertenecen a la coordinación (pareja INTER).
  useEffect(() => {
    setRelationsPartnerId(null)
    setRelationsSide(null)
  }, [coordinationKey])

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.scrollTop = 0
    updateScrollMore(el, setCanScrollMore)
  }, [mode, coordinationKey])

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return

    const onScroll = () => updateScrollMore(el, setCanScrollMore)
    const frame = window.requestAnimationFrame(() =>
      updateScrollMore(el, setCanScrollMore),
    )
    el.addEventListener('scroll', onScroll, { passive: true })
    const observer = new ResizeObserver(() =>
      updateScrollMore(el, setCanScrollMore),
    )
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)

    return () => {
      window.cancelAnimationFrame(frame)
      el.removeEventListener('scroll', onScroll)
      observer.disconnect()
    }
  }, [mode, coordinationKey])

  return (
    <div
      className="director-reading"
      data-testid="director-reading-panel"
      data-mode={mode}
      data-scope={selected ? 'coordination' : 'direction'}
      data-scroll-more={canScrollMore && !fixedHeight ? 'true' : 'false'}
      data-fixed-height={fixedHeight ? 'true' : 'false'}
    >
      <header className="director-reading__header">
        <p className="director-reading__kicker">
          {selected ? 'Lectura de coordinación' : 'Lectura de Dirección'}
        </p>
        {/*
         * Con coordinación, la identidad (carta, personaje, problemas) y la
         * carga activa («Pendientes ahora» del flujo) ya están en otra parte:
         * la cabecera queda solo como título estructural del panel.
         * En Lectura de Dirección se conserva el contexto global (no hay flujo).
         */}
        {selected ? null : (
          <DirectorReadingContextHeader
            selectedCoordination={null}
            activeCount={direction?.problems.activeCount ?? null}
          />
        )}
        <nav
          className="director-reading__modes"
          aria-label="Modo de lectura"
        >
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              className="director-reading__mode"
              data-testid={`director-reading-mode-${item.id}`}
              data-active={mode === item.id ? 'true' : 'false'}
              aria-pressed={mode === item.id}
              onClick={() => setMode(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        {/*
         * Un solo periodo para todos los modos: vive aquí, fuera del body, para
         * no desmontarse al cambiar de tab. Sin coordinación no hay analítica
         * histórica de Dirección todavía → no se muestra un filtro inerte.
         */}
        {selected ? (
          <div
            className="director-reading__period"
            data-testid="director-reading-period"
          >
            <DirectorAnalysisPeriodPicker
              variant="cycle"
              period={analysisPeriod}
              onChange={setAnalysisPeriod}
            />
          </div>
        ) : null}
      </header>

      <div
        ref={bodyRef}
        className="director-reading__body"
        data-testid="director-reading-body"
        data-mode={mode}
        data-fixed-height={fixedHeight ? 'true' : 'false'}
      >
        {mode === 'state' ? (
          <DirectorEstadoPanel
            selected={selected}
            selectedCoordination={selectedCoordination}
            coordinationId={selectedCoordination?.id ?? null}
            directionStatus={directionStatus}
            direction={direction}
            directionError={directionError}
            onRetryDirection={onRetryDirection}
            coordinationStatus={coordinationStatus}
            coordination={coordination}
            coordinationError={coordinationError}
            analysisPeriod={analysisPeriod}
            onAnalysisPeriodChange={setAnalysisPeriod}
            onOpenDependencias={() => setMode('dependencias')}
            carouselPage={estadoPage}
            onCarouselPageChange={setEstadoPage}
          />
        ) : null}

        {mode === 'internos' ? (
          <DirectorInternosPanel
            coordinationId={selectedCoordination?.id ?? null}
            analysisPeriod={analysisPeriod}
            onAnalysisPeriodChange={setAnalysisPeriod}
            page={internosPage}
            onPageChange={setInternosPage}
            openProblemId={openProblemId}
            onOpenProblem={onOpenProblem}
          />
        ) : null}

        {mode === 'dependencias' ? (
          <DirectorDependenciasPanel
            coordinationId={selectedCoordination?.id ?? null}
            analysisPeriod={analysisPeriod}
            metric={relationsMetric}
            onMetricChange={setRelationsMetric}
            selectedPartnerId={relationsPartnerId}
            selectedSide={relationsSide}
            onSelectionChange={onRelationsSelectionChange}
          />
        ) : null}

        {mode === 'aprendizajes' ? (
          <DirectorAprendizajesPanel
            coordinationId={selectedCoordination?.id ?? null}
            analysisPeriod={analysisPeriod}
          />
        ) : null}
      </div>
    </div>
  )
}
