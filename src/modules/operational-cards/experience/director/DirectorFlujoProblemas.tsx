import { useId, useState } from 'react'
import {
  FlujoChart,
  MovimientoChart,
} from '@/modules/operational-cards/charts/DirectorFlujoChart'
import type { NovexChartCategoryInteraction } from '@/modules/operational-cards/charts/NovexChart'
import {
  flujoBucketTitle,
  type FlujoLevel,
} from '@/modules/operational-cards/charts/flujo-option'
import {
  analysisPeriodTrail,
  drillIntoPeriod,
  MONTH_SHORT,
  type AnalysisPeriod,
} from '@/modules/operational-cards/domain/analysis-period'
import type { OperationalKpiFlowBucket } from '@/modules/operational-cards/types/operational-kpi.types'
import '@/styles/director-kpi-panel.css'

const MONTH_LONG = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const

/** Nivel de la gráfica = lo que se ve dentro del periodo. */
function flujoLevelOf(period: AnalysisPeriod): FlujoLevel {
  if (period.kind === 'cycle') return 'month'
  if (period.kind === 'month') return 'week'
  return 'day'
}

/** Ruta: «H2 2026», «OCTUBRE», «5–11 OCT». */
function crumbLabel(period: AnalysisPeriod): string {
  const [, fromMonth, fromDay] = period.from.split('-').map(Number)
  const [, endMonth, endDay] = period.calendarEnd.split('-').map(Number)
  if (period.kind === 'cycle') {
    return `H${period.navigationContext.half ?? 1} ${period.navigationContext.year}`
  }
  if (period.kind === 'month') {
    return MONTH_LONG[fromMonth - 1].toUpperCase()
  }
  return fromMonth === endMonth
    ? `${fromDay}–${endDay} ${MONTH_SHORT[endMonth - 1]}`
    : `${fromDay} ${MONTH_SHORT[fromMonth - 1]} – ${endDay} ${MONTH_SHORT[endMonth - 1]}`
}

type ChartKey = 'carga' | 'movimiento'

const HELP: Record<ChartKey, string> = {
  carga: 'Problemas que seguían pendientes al cierre de cada periodo.',
  movimiento: 'Problemas reportados y solucionados durante cada periodo.',
}

function ChartTitle({ chart, children }: { chart: ChartKey; children: string }) {
  const helpId = useId()
  return (
    <p className="director-estado__section-title director-flujo__chart-title">
      <span className="director-estado__section-mark" aria-hidden="true">
        ✦
      </span>
      <span>{children}</span>
      <span className="director-flujo__help">
        <button
          type="button"
          className="director-flujo__help-button"
          aria-label={`Qué muestra ${children.toLowerCase()}`}
          aria-describedby={helpId}
          data-testid={`director-${chart}-help`}
        >
          ?
        </button>
        <span role="tooltip" id={helpId} className="director-flujo__help-text">
          {HELP[chart]}
        </span>
      </span>
    </p>
  )
}

/**
 * ESTADO de una coordinación: DOS lecturas lado a lado sobre el MISMO
 * AnalysisPeriod, los mismos buckets y el mismo eje temporal.
 * - CARGA DE PROBLEMAS: LÍNEA del total de activos al cierre de cada bucket
 *   (stock); internos / externos y sus desgloses en el tooltip.
 * - MOVIMIENTO DE PROBLEMAS: reportados vs solucionados durante el bucket
 *   (eventos), barras agrupadas.
 * Universo: problemas cuya responsable es la coordinación seleccionada.
 * Click en un mes o una semana de CUALQUIERA de las dos cambia el
 * AnalysisPeriod GLOBAL de la lectura (no hay selección local por gráfica);
 * el hover de una resalta la misma columna en la otra.
 */
export function DirectorFlujoProblemas({
  period,
  buckets,
  loading,
  error,
  onPeriodChange,
}: {
  period: AnalysisPeriod
  buckets: readonly OperationalKpiFlowBucket[] | null
  loading: boolean
  error: string | null
  onPeriodChange: (next: AnalysisPeriod) => void
}) {
  const level = flujoLevelOf(period)
  const trail = analysisPeriodTrail(period)
  const canDrill = level !== 'day'
  // Hover sincronizado: la gráfica de origen ya resalta su columna sola.
  const [hover, setHover] = useState<{ source: ChartKey; index: number } | null>(null)

  const drill = (bucket: OperationalKpiFlowBucket) => {
    const next = drillIntoPeriod(period, bucket)
    if (next) onPeriodChange(next)
  }

  const interactionFor = (source: ChartKey): NovexChartCategoryInteraction | undefined =>
    buckets
      ? {
          isClickable: (index) => {
            const bucket = buckets[index]
            return canDrill && Boolean(bucket) && !bucket.future
          },
          onClick: (index) => {
            const bucket = buckets[index]
            if (canDrill && bucket) drill(bucket)
          },
          onHover: (index) => setHover(index === null ? null : { source, index }),
        }
      : undefined

  const highlightFor = (chart: ChartKey) =>
    hover && hover.source !== chart ? hover.index : null

  return (
    <section
      className="director-flujo"
      data-testid="director-flujo"
      data-level={level}
      data-period-kind={period.kind}
      data-period-from={period.from}
      data-hover-index={hover ? String(hover.index) : undefined}
    >
      {/*
       * Nivel ciclo: el periodo ya está justo encima (picker) → sin ruta.
       * Mes / semana: la ruta sirve para subir. La pista acompaña siempre.
       */}
      {trail.length > 1 || canDrill ? (
        <header className="director-flujo__head">
          {trail.length > 1 ? (
            <nav
              className="director-flujo__crumb"
              aria-label="Nivel del flujo"
              data-testid="director-flujo-crumb"
            >
              {trail.map((step, index) => {
                const last = index === trail.length - 1
                return (
                  <span key={`${step.kind}-${step.from}`} className="director-flujo__crumb-step">
                    {index > 0 ? (
                      <span className="director-flujo__crumb-sep" aria-hidden="true">
                        ›
                      </span>
                    ) : null}
                    {last ? (
                      <span
                        className="director-flujo__crumb-here"
                        aria-current="location"
                        data-testid={`director-flujo-crumb-${step.kind}`}
                      >
                        {crumbLabel(step)}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="director-flujo__crumb-link"
                        data-testid={`director-flujo-crumb-${step.kind}`}
                        onClick={() => onPeriodChange(step)}
                      >
                        {crumbLabel(step)}
                      </button>
                    )}
                  </span>
                )
              })}
              {period.isCurrent && period.isPartial ? (
                <span className="director-flujo__live" data-testid="director-flujo-live">
                  En curso
                </span>
              ) : null}
            </nav>
          ) : (
            <span />
          )}
          {canDrill ? (
            <span className="director-flujo__hint">
              {level === 'month' ? 'Toca un mes' : 'Toca una semana'}
            </span>
          ) : null}
        </header>
      ) : null}

      {error ? (
        <p className="director-kpi-panel__error" role="alert" data-testid="director-flujo-error">
          No se pudo leer el flujo. {error}
        </p>
      ) : null}

      {!buckets && loading ? (
        <p className="director-kpi-panel__hint" data-testid="director-flujo-loading">
          Leyendo flujo…
        </p>
      ) : null}

      <div className="director-flujo__pair">
        <div className="director-flujo__col" data-chart="carga" data-testid="director-carga">
          <ChartTitle chart="carga">Carga de problemas</ChartTitle>
          <ul className="director-flujo__legend" aria-hidden="true">
            <li data-series="active">
              <span className="director-flujo__swatch" />
              Activos al cierre
            </li>
          </ul>
          {buckets ? (
            <div className="director-flujo__frame" data-loading={loading ? 'true' : 'false'}>
              <FlujoChart
                buckets={buckets}
                level={level}
                categoryInteraction={interactionFor('carga')}
                highlightIndex={highlightFor('carga')}
              />
            </div>
          ) : null}
        </div>

        <span className="director-flujo__divider" aria-hidden="true" />

        <div
          className="director-flujo__col"
          data-chart="movimiento"
          data-testid="director-movimiento"
        >
          <ChartTitle chart="movimiento">Movimiento de problemas</ChartTitle>
          <ul className="director-flujo__legend" aria-hidden="true">
            <li data-series="reported">
              <span className="director-flujo__swatch" />
              Reportados
            </li>
            <li data-series="resolved">
              <span className="director-flujo__swatch" />
              Solucionados
            </li>
          </ul>
          {buckets ? (
            <div className="director-flujo__frame" data-loading={loading ? 'true' : 'false'}>
              <MovimientoChart
                buckets={buckets}
                level={level}
                categoryInteraction={interactionFor('movimiento')}
                highlightIndex={highlightFor('movimiento')}
              />
            </div>
          ) : null}
        </div>
      </div>

      {buckets ? (
        <table className="visually-hidden" data-testid="director-flujo-table">
          <caption>
            Carga de problemas (activos al cierre de cada bloque, internos y
            externos) y movimiento (reportados y solucionados durante el bloque).
          </caption>
          <thead>
            <tr>
              <th scope="col">Bloque</th>
              <th scope="col">Activos</th>
              <th scope="col">Internos</th>
              <th scope="col">Externos</th>
              <th scope="col">Reportados</th>
              <th scope="col">Solucionados</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((bucket) => (
              <tr
                key={bucket.start}
                data-testid={`director-flujo-row-${bucket.start}`}
                data-future={bucket.future ? 'true' : 'false'}
                data-current={bucket.current ? 'true' : 'false'}
              >
                <th scope="row">
                  {flujoBucketTitle(bucket, level)}
                  {bucket.current ? ' (actual)' : ''}
                </th>
                {bucket.active && bucket.solved ? (
                  <>
                    <td>
                      {bucket.active.total}
                      {bucket.current ? ' ahora' : ' al cierre'}
                    </td>
                    <td>{bucket.active.internal}</td>
                    <td>{bucket.active.external}</td>
                    <td>{bucket.created ?? 0}</td>
                    <td>{bucket.solved.total}</td>
                  </>
                ) : (
                  <td colSpan={5}>Futuro · sin datos</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {/* Navegación por teclado: un botón real por bucket navegable. */}
      {buckets && canDrill ? (
        <ul className="director-flujo__keys" aria-label="Profundizar en el flujo">
          {buckets.map((bucket) =>
            bucket.future ? null : (
              <li key={bucket.calendarStart}>
                <button
                  type="button"
                  data-testid={`director-flujo-drill-${bucket.calendarStart}`}
                  onClick={() => drill(bucket)}
                >
                  Ver {level === 'month' ? '' : 'semana '}
                  {flujoBucketTitle(bucket, level)}
                </button>
              </li>
            ),
          )}
        </ul>
      ) : null}
    </section>
  )
}
