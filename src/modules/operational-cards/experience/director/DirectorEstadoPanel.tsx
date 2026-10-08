import { useState } from 'react'
import { DirectorAntiguedad } from '@/modules/operational-cards/experience/director/DirectorAntiguedad'
import { DirectorEstadoCarousel } from '@/modules/operational-cards/experience/director/DirectorEstadoCarousel'
import { DirectorEstadoComposicion } from '@/modules/operational-cards/experience/director/DirectorEstadoComposicion'
import { DirectorFlujoProblemas } from '@/modules/operational-cards/experience/director/DirectorFlujoProblemas'
import { DirectorResolucion } from '@/modules/operational-cards/experience/director/DirectorResolucion'
import { DirectorEstadoOperativo } from '@/modules/operational-cards/experience/director/DirectorEstadoOperativo'
import type { AnalysisPeriod } from '@/modules/operational-cards/domain/analysis-period'
import { useDirectorEstadoState } from '@/modules/operational-cards/hooks/useDirectorEstadoState'
import type { DirectorKpiLoadStatus } from '@/modules/operational-cards/hooks/useDirectorKpi'
import type {
  OperationalKpiCoordinationSnapshot,
  OperationalKpiDirectionSnapshot,
} from '@/modules/operational-cards/types/operational-kpi.types'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import '@/styles/director-kpi-panel.css'

/**
 * Modo ESTADO de una coordinación: CARRUSEL de láminas, sin scroll vertical.
 *   1 · Carga | Movimiento (¿cuánto tengo? ¿cuánto entra y sale?)
 *   2 · Severidad | Atención (+ línea de relaciones)
 *   3 · Antigüedad (¿qué lleva más tiempo activo al corte?)
 *   4 · Resolución (¿cuánto tardamos en solucionar lo que sale?)
 * El AnalysisPeriod es el del DirectorReadingPanel. El flujo además lo
 * modifica (drill-down ciclo → mes → semana): no hay selección local.
 * La página del carrusel NO es un filtro: no toca el periodo.
 * Lectura de Dirección (sin coordinación) mantiene su columna con scroll.
 *
 * REGLA DE ARQUITECTURA (DIRECTOR · ESTADO): el AnalysisPeriod del
 * DirectorReadingPanel es la ÚNICA fuente temporal. Carga y Movimiento solo
 * lo CAMBIAN (drill-down → onAnalysisPeriodChange); el resto lo CONSUME. Las
 * gráficas no se conocen entre sí y no usan new Date() para su universo.
 * Toda gráfica nueva declara su naturaleza:
 *   TIME SERIES · Carga (stock por bucket) · Movimiento (flujo por bucket)
 *   SNAPSHOT AT CUT (corte = period.dataTo) · Severidad · Atención · Antigüedad
 *   FLOW OUTCOME / TIME SERIES · Resolución (cierres por bucket; = Solucionados)
 *   FLOW DURING PERIOD · Relaciones (INTER creados en el periodo)
 *   LIVE-ONLY (excepción explícita) · lectura de Dirección sin coordinación
 * Y declara su ALCANCE ORGANIZACIONAL. Hoy todas son de la carta:
 *   coordination · Carga, Movimiento, Severidad, Atención, Antigüedad, Resolución
 * (una vista de Dirección se diseñará explícitamente como tal; no se
 * reutiliza Antigüedad para eso). Los SNAPSHOT comparten la población
 * ACTIVE_AT_CUT de la coordinación: Σ Severidad = Σ Atención = Antigüedad =
 * último punto de Carga, todo en la misma respuesta /state. Severidad y Atención usan el valor
 * ACTUAL (sin historial fiable) y lo declaran en cortes históricos.
 */
export function DirectorEstadoPanel({
  selected,
  coordinationId,
  directionStatus,
  direction,
  directionError,
  onRetryDirection,
  coordinationStatus,
  coordination,
  coordinationError,
  analysisPeriod,
  onAnalysisPeriodChange,
  onOpenDependencias,
  carouselPage,
  onCarouselPageChange,
}: {
  selected: boolean
  selectedCoordination: CoordinationOverview | null
  coordinationId: string | null
  directionStatus: DirectorKpiLoadStatus
  direction: OperationalKpiDirectionSnapshot | null
  directionError: string | null
  onRetryDirection: () => void
  coordinationStatus: DirectorKpiLoadStatus
  coordination: OperationalKpiCoordinationSnapshot | null
  coordinationError: string | null
  analysisPeriod: AnalysisPeriod
  onAnalysisPeriodChange: (period: AnalysisPeriod) => void
  onOpenDependencias?: () => void
  /** Página del carrusel (controlada por la lectura para que persista). */
  carouselPage?: number
  onCarouselPageChange?: (page: number) => void
}) {
  const [localPage, setLocalPage] = useState(0)
  const page = carouselPage ?? localPage
  const setPage = onCarouselPageChange ?? setLocalPage

  const snapshotLoading = selected
    ? coordinationStatus === 'loading'
    : directionStatus === 'loading'
  const error = selected ? coordinationError : directionError
  const failed = selected
    ? coordinationStatus === 'error'
    : directionStatus === 'error'

  const state = useDirectorEstadoState(
    selected ? coordinationId : null,
    selected ? analysisPeriod : null,
  )

  const stateLoading = selected && state.status === 'loading'
  /*
   * UNA fotografía para TODAS las láminas: solo se pintan datos de /state que
   * correspondan EXACTAMENTE a la coordinación y al AnalysisPeriod vigentes.
   * Mientras llega la respuesta del periodo nuevo (o si falla), ninguna
   * gráfica conserva la foto del periodo anterior bajo la cabecera nueva:
   * todas cambian a la vez cuando llega la respuesta completa.
   */
  const periodData =
    state.data &&
    state.data.scope.coordinationId === coordinationId &&
    state.data.period.kind === analysisPeriod.kind &&
    state.data.period.from === analysisPeriod.from &&
    state.data.period.dataTo === analysisPeriod.to
      ? state.data
      : null
  const stateFailed = selected && state.status === 'error'

  return (
    <div
      className="director-estado"
      data-testid="director-estado-panel"
      data-scope={selected ? 'coordination' : 'direction'}
      data-period-kind={analysisPeriod.kind}
      data-period-from={analysisPeriod.from}
      data-period-to={analysisPeriod.to}
    >
      {failed ? (
        <p className="director-kpi-panel__error" role="alert">
          No se pudo leer el KPI.
          {error ? ` ${error}` : ''}
          {!selected ? (
            <button type="button" onClick={onRetryDirection}>
              Reintentar
            </button>
          ) : null}
        </p>
      ) : null}

      {snapshotLoading ? (
        <p className="director-kpi-panel__hint">Leyendo indicadores…</p>
      ) : null}

      {selected && coordination ? (
        /*
         * Sin «Estado actual» aquí: la integridad (CRÍTICO/ALERTA/ESTABLE) y
         * las vidas viven en el personaje. La lectura abre directamente con
         * el flujo, navegador temporal principal, bajo el periodo.
         */
        <DirectorEstadoCarousel
          page={page}
          onPageChange={setPage}
          pages={[
            {
              id: 'operacion',
              label: 'Carga y movimiento',
              content: (
                <DirectorFlujoProblemas
                  period={analysisPeriod}
                  buckets={periodData?.evolution.buckets ?? null}
                  loading={stateLoading}
                  error={stateFailed ? state.error : null}
                  onPeriodChange={onAnalysisPeriodChange}
                />
              ),
            },
            {
              id: 'composicion',
              label: 'Severidad y atención',
              content: (
                <DirectorEstadoComposicion
                  severity={
                    periodData?.snapshot.severity ?? {
                      critical: 0,
                      high: 0,
                      medium: 0,
                      low: 0,
                    }
                  }
                  status={
                    periodData?.snapshot.attention ?? {
                      open: 0,
                      inProgress: 0,
                      closedAfterCut: 0,
                      unclassified: 0,
                    }
                  }
                  incoming={periodData?.relations.dependencies ?? 0}
                  outgoing={periodData?.relations.commitments ?? 0}
                  loading={stateLoading}
                  hasCachedData={periodData !== null}
                  scope="period"
                  cut={
                    periodData
                      ? { at: periodData.snapshot.at, isNow: periodData.snapshot.isNow }
                      : null
                  }
                  error={stateFailed ? state.error : null}
                  onOpenDependencias={onOpenDependencias}
                />
              ),
            },
            {
              id: 'antiguedad',
              label: 'Antigüedad',
              content: (
                <DirectorAntiguedad
                  aging={periodData?.aging ?? null}
                  loading={stateLoading}
                  error={stateFailed ? state.error : null}
                />
              ),
            },
            {
              id: 'resolucion',
              label: 'Resolución',
              content: (
                <DirectorResolucion
                  period={analysisPeriod}
                  flowBuckets={periodData?.evolution.buckets ?? null}
                  resolution={periodData?.resolution ?? null}
                  loading={stateLoading}
                  error={stateFailed ? state.error : null}
                />
              ),
            },
          ]}
        />
      ) : null}

      {!selected && direction ? (
        <div className="director-estado__top">
          <DirectorEstadoOperativo
            integrityStatus={direction.directionStatus}
            integritySource="live"
            explainInput={{
              activeCount: direction.problems.activeCount,
              criticalCount: direction.problems.severity.critical,
              highCount: direction.problems.severity.high,
              mediumCount: direction.problems.severity.medium,
              lowCount: direction.problems.severity.low,
              incomingDependencyCount: direction.dependencies.incoming,
            }}
            testId="director-estado-operativo-direction"
          />
          <DirectorEstadoComposicion
            severity={direction.problems.severity}
            status={direction.problems.status}
            incoming={direction.dependencies.incoming}
            outgoing={direction.dependencies.outgoing}
            scope="live"
          />
          <p className="director-reading__phase-note director-reading__phase-note--compact">
            Selecciona una coordinación para analizar un periodo concreto.
          </p>
        </div>
      ) : null}

    </div>
  )
}
