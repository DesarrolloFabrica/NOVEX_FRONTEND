import { useId, useMemo, useState } from 'react'
import {
  FlujoChart,
  MovimientoChart,
} from '@/modules/operational-cards/charts/DirectorFlujoChart'
import type { NovexChartCategoryInteraction } from '@/modules/operational-cards/charts/NovexChart'
import {
  coveredFlowBuckets,
  flujoBucketCoverage,
  flujoCoverageNote,
  flujoCoverageTag,
  flujoSummary,
  formatFlujoDay,
} from '@/modules/operational-cards/charts/flujo-coverage'
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
  carga:
    'Problemas que seguían activos al corte de cada tramo: su último día, o el último día con datos si el tramo está en curso.',
  movimiento:
    'Problemas reportados (registrados) y cerrados (con fecha de cierre) dentro de cada tramo.',
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

function FlujoSummary({ covered }: { covered: readonly OperationalKpiFlowBucket[] }) {
  const summary = flujoSummary(covered)
  if (!summary) return null
  const sameYear = summary.from.slice(0, 4) === summary.cutAt.slice(0, 4)
  const interval = `${formatFlujoDay(summary.from, !sameYear)} – ${formatFlujoDay(summary.cutAt, true)}`
  // La etiqueta ya dice «Activos al corte»: aquí solo la fecha (nunca «hoy»).
  const cut = `${formatFlujoDay(summary.cutAt, !summary.inProgress)}${summary.inProgress ? ' · en curso' : ''}`
  const items = [
    { key: 'active', value: summary.activeAtCut, label: 'Activos al corte', sub: cut },
    { key: 'reported', value: summary.reported, label: 'Reportados', sub: interval },
    { key: 'closed', value: summary.closed, label: 'Cerrados', sub: interval },
  ] as const
  return (
    <dl className="director-flujo__summary" data-testid="director-flujo-summary">
      {items.map((item) => (
        <div
          key={item.key}
          className="director-flujo__stat"
          data-stat={item.key}
          data-testid={`director-flujo-stat-${item.key}`}
        >
          <dt className="director-flujo__stat-label">
            {item.label}
            {item.key === 'active' ? null : (
              <span className="visually-hidden"> en el periodo</span>
            )}
          </dt>
          <dd className="director-flujo__stat-value">{item.value}</dd>
          <dd className="director-flujo__stat-sub">{item.sub}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * ESTADO de una coordinación · lámina «Carga y movimiento»: resumen compacto
 * + DOS gráficas apiladas a todo el ancho sobre el MISMO AnalysisPeriod, los
 * mismos tramos y la misma área de trazado (columnas alineadas en vertical).
 * - CARGA DE PROBLEMAS: LÍNEA del total de activos al corte de cada tramo
 *   (stock); internos / externos y sus desgloses en el tooltip.
 * - MOVIMIENTO DE PROBLEMAS: reportados vs cerrados durante el tramo
 *   (eventos), barras agrupadas.
 * Solo se dibujan los tramos con cobertura (pasados + el actual): ningún
 * espacio para meses o días futuros. Universo: problemas cuya responsable es
 * la coordinación seleccionada. Click en un tramo de CUALQUIERA de las dos
 * cambia el AnalysisPeriod GLOBAL de la lectura; el hover de una resalta la
 * misma columna en la otra.
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
  // Única lista de tramos para dibujo, hover, clic, teclado y tabla: el índice
  // de una columna siempre se resuelve sobre ESTA lista (sin desfases).
  const covered = useMemo(() => (buckets ? coveredFlowBuckets(buckets) : null), [buckets])
  // Hover sincronizado: la gráfica de origen ya resalta su columna sola.
  const [hover, setHover] = useState<{ source: ChartKey; index: number } | null>(null)

  const drill = (bucket: OperationalKpiFlowBucket) => {
    const next = drillIntoPeriod(period, bucket)
    if (next) onPeriodChange(next)
  }

  const interactionFor = (source: ChartKey): NovexChartCategoryInteraction | undefined =>
    covered
      ? {
          isClickable: (index) => canDrill && Boolean(covered[index]),
          onClick: (index) => {
            const bucket = covered[index]
            if (canDrill && bucket) drill(bucket)
          },
          onHover: (index) => setHover(index === null ? null : { source, index }),
        }
      : undefined

  const highlightFor = (chart: ChartKey) =>
    hover && hover.source !== chart ? hover.index : null

  const tags = covered ? covered.map(flujoCoverageTag) : []
  const hasIncomplete = tags.some((tag) => tag === 'PARCIAL' || tag === 'EN CURSO')

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
       * Nivel ciclo: el periodo ya está justo encima (selector) → sin ruta ni
       * fila vacía. Mes / semana: la ruta sirve para subir. La pista de
       * profundización vive al pie (discreta), no en esta fila.
       */}
      {trail.length > 1 ? (
        <header className="director-flujo__head">
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
        </header>
      ) : null}

      {error ? (
        <p className="director-kpi-panel__error" role="alert" data-testid="director-flujo-error">
          No se pudo leer el flujo. {error}
        </p>
      ) : null}

      {!covered && loading ? (
        <p className="director-kpi-panel__hint" data-testid="director-flujo-loading">
          Leyendo flujo…
        </p>
      ) : null}

      {covered ? <FlujoSummary covered={covered} /> : null}

      {covered ? (
        <div className="director-flujo__pair" data-loading={loading ? 'true' : 'false'}>
          <div className="director-flujo__col" data-chart="carga" data-testid="director-carga">
            <div className="director-flujo__col-head">
              <ChartTitle chart="carga">Carga de problemas</ChartTitle>
              <ul className="director-flujo__legend" aria-hidden="true">
                <li data-series="active">
                  <span className="director-flujo__swatch" />
                  Activos al corte
                </li>
              </ul>
            </div>
            <div className="director-flujo__frame">
              <FlujoChart
                buckets={covered}
                level={level}
                categoryInteraction={interactionFor('carga')}
                highlightIndex={highlightFor('carga')}
              />
            </div>
          </div>

          <div
            className="director-flujo__col"
            data-chart="movimiento"
            data-testid="director-movimiento"
          >
            <div className="director-flujo__col-head">
              <ChartTitle chart="movimiento">Movimiento de problemas</ChartTitle>
              <ul className="director-flujo__legend" aria-hidden="true">
                <li data-series="reported">
                  <span className="director-flujo__swatch" />
                  Reportados
                </li>
                <li data-series="resolved">
                  <span className="director-flujo__swatch" />
                  Cerrados
                </li>
              </ul>
            </div>
            <div className="director-flujo__frame">
              <MovimientoChart
                buckets={covered}
                level={level}
                categoryInteraction={interactionFor('movimiento')}
                highlightIndex={highlightFor('movimiento')}
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Pie discreto: cómo profundizar (según el nivel) + tramos incompletos. */}
      {(canDrill && covered) || hasIncomplete ? (
        <p className="director-flujo__note">
          {canDrill && covered ? (
            <span className="director-flujo__hint" data-testid="director-flujo-hint">
              {level === 'month'
                ? 'Toca un mes para ver sus semanas.'
                : 'Toca una semana para ver sus días.'}
            </span>
          ) : null}
          {hasIncomplete ? (
            <span data-testid="director-flujo-partial-note">
              EN CURSO / PARCIAL: tramos con menos días. Cifras reales, sin proyectar.
            </span>
          ) : null}
        </p>
      ) : null}

      {covered ? (
        <table className="visually-hidden" data-testid="director-flujo-table">
          <caption>
            Carga de problemas (activos al corte de cada tramo, internos y
            externos) y movimiento (reportados y cerrados durante el tramo).
          </caption>
          <thead>
            <tr>
              <th scope="col">Tramo</th>
              <th scope="col">Activos</th>
              <th scope="col">Internos</th>
              <th scope="col">Externos</th>
              <th scope="col">Reportados</th>
              <th scope="col">Cerrados</th>
            </tr>
          </thead>
          <tbody>
            {covered.map((bucket) => {
              const note = flujoCoverageNote(bucket)
              return (
                <tr
                  key={bucket.start}
                  data-testid={`director-flujo-row-${bucket.start}`}
                  data-current={bucket.current ? 'true' : 'false'}
                  data-coverage={flujoBucketCoverage(bucket)}
                >
                  <th scope="row">
                    {flujoBucketTitle(bucket, level)}
                    {bucket.current ? ' (actual)' : ''}
                    {note ? `. ${note}` : ''}
                  </th>
                  <td>{bucket.active?.total ?? 0}</td>
                  <td>{bucket.active?.internal ?? 0}</td>
                  <td>{bucket.active?.external ?? 0}</td>
                  <td>{bucket.created ?? 0}</td>
                  <td>{bucket.solved?.total ?? 0}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : null}

      {/* Navegación por teclado: un botón real por tramo navegable. */}
      {covered && canDrill ? (
        <ul className="director-flujo__keys" aria-label="Profundizar en el flujo">
          {covered.map((bucket) => (
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
          ))}
        </ul>
      ) : null}
    </section>
  )
}
