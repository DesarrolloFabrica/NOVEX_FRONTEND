import { useEffect, useRef, useState } from 'react'
import {
  buildCurrentWeekPeriod,
  type AnalysisPeriod,
} from '@/modules/operational-cards/domain/analysis-period'
import { DirectorDependenciasPanel } from '@/modules/operational-cards/experience/director/DirectorDependenciasPanel'
import type { EstadoEvolutionView } from '@/modules/operational-cards/experience/director/DirectorEstadoEvolucion'
import { DirectorEstadoPanel } from '@/modules/operational-cards/experience/director/DirectorEstadoPanel'
import { DirectorInternosPanel } from '@/modules/operational-cards/experience/director/DirectorInternosPanel'
import { DirectorReadingContextHeader } from '@/modules/operational-cards/experience/director/DirectorReadingContextHeader'
import type { DirectorKpiLoadStatus } from '@/modules/operational-cards/hooks/useDirectorKpi'
import type {
  OperationalKpiCoordinationSnapshot,
  OperationalKpiDependencySide,
  OperationalKpiDirectionSnapshot,
  OperationalKpiHistoryGranularity,
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
}: {
  selectedCoordination: CoordinationOverview | null
  directionStatus: DirectorKpiLoadStatus
  direction: OperationalKpiDirectionSnapshot | null
  directionError: string | null
  onRetryDirection: () => void
  coordinationStatus: DirectorKpiLoadStatus
  coordination: OperationalKpiCoordinationSnapshot | null
  coordinationError: string | null
}) {
  const [mode, setMode] = useState<DirectorReadingMode>('state')
  const [estadoView, setEstadoView] =
    useState<EstadoEvolutionView>('pendientes')
  /** Única fuente temporal de ESTADO: fechas explícitas, no granularidad suelta. */
  const [analysisPeriod, setAnalysisPeriod] = useState<AnalysisPeriod>(() =>
    buildCurrentWeekPeriod(),
  )
  const [internosMetric, setInternosMetric] =
    useState<OperationalKpiHistoryMetric>('created')
  const [internosGranularity, setInternosGranularity] =
    useState<OperationalKpiHistoryGranularity>('week')
  const [internosCategoryId, setInternosCategoryId] = useState<string | null>(
    null,
  )
  const [relationsMetric, setRelationsMetric] =
    useState<OperationalKpiHistoryMetric>('created')
  const [relationsGranularity, setRelationsGranularity] =
    useState<OperationalKpiHistoryGranularity>('week')
  const [relationsPartnerId, setRelationsPartnerId] = useState<string | null>(
    null,
  )
  const [relationsSide, setRelationsSide] =
    useState<OperationalKpiDependencySide | null>(null)
  const [canScrollMore, setCanScrollMore] = useState(false)
  const bodyRef = useRef<HTMLDivElement | null>(null)

  const selected = selectedCoordination !== null
  const coordinationKey = selectedCoordination?.id ?? null

  useEffect(() => {
    setInternosCategoryId(null)
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
      data-scroll-more={canScrollMore ? 'true' : 'false'}
    >
      <header className="director-reading__header">
        <p className="director-reading__kicker">
          {selected ? 'Lectura de coordinación' : 'Lectura de Dirección'}
        </p>
        <DirectorReadingContextHeader
          selectedCoordination={selectedCoordination}
          directionStatus={directionStatus}
          direction={direction}
          coordinationStatus={coordinationStatus}
          coordination={coordination}
          activeCount={
            selected
              ? (coordination?.problems.activeCount ?? null)
              : (direction?.problems.activeCount ?? null)
          }
        />
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
      </header>

      <div
        ref={bodyRef}
        className="director-reading__body"
        data-testid="director-reading-body"
        data-mode={mode}
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
            evolutionView={estadoView}
            analysisPeriod={analysisPeriod}
            onEvolutionViewChange={setEstadoView}
            onAnalysisPeriodChange={setAnalysisPeriod}
            onOpenDependencias={() => setMode('dependencias')}
          />
        ) : null}

        {mode === 'internos' ? (
          <DirectorInternosPanel
            coordinationId={selectedCoordination?.id ?? null}
            metric={internosMetric}
            granularity={internosGranularity}
            onMetricChange={setInternosMetric}
            onGranularityChange={setInternosGranularity}
            selectedCategoryId={internosCategoryId}
            onSelectedCategoryChange={setInternosCategoryId}
          />
        ) : null}

        {mode === 'dependencias' ? (
          <DirectorDependenciasPanel
            coordinationId={selectedCoordination?.id ?? null}
            metric={relationsMetric}
            granularity={relationsGranularity}
            onMetricChange={setRelationsMetric}
            onGranularityChange={setRelationsGranularity}
            selectedPartnerId={relationsPartnerId}
            selectedSide={relationsSide}
            onSelectionChange={(partnerId, side) => {
              setRelationsPartnerId(partnerId)
              setRelationsSide(side)
            }}
          />
        ) : null}

        {mode === 'aprendizajes' ? (
          <div
            className="director-aprendizajes director-reading__placeholder"
            data-testid="director-reading-aprendizajes"
          >
            <p className="director-block__title">Últimos aprendizajes</p>
            <p>
              Aprendizajes registrados al cerrar situaciones. Cada entrada
              mostrará categoría, fecha de cierre y extracto — sin barras.
            </p>
            <p className="director-internos__hint">
              Filtro previsto: Todos · Internet · Aplicativos · …
            </p>
            <p className="director-reading__phase-note">
              Diseño preparado · datos en la siguiente fase
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
