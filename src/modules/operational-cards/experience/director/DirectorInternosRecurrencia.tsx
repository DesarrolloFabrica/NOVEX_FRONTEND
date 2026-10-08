import { useId, type CSSProperties } from 'react'
import {
  analysisPeriodTrail,
  drillIntoPeriod,
  type AnalysisPeriod,
} from '@/modules/operational-cards/domain/analysis-period'
import {
  bucketHeader,
  cellIntensity,
  countLabel,
  maxCell,
  periodCrumbLabel,
  presenceText,
  recurrenceCellTooltip,
  recurrenceRows,
} from '@/modules/operational-cards/experience/director/internal-problems.presentation'
import type {
  InternalRecurrenceBucket,
  InternalRecurrenceResponse,
} from '@/modules/operational-cards/types/internal-problems.types'

/**
 * Lámina 1 · RECURRENCIA DE PROBLEMAS INTERNOS (FLUJO por created_at).
 *
 *   Heatmap categoría × tiempo: cada celda = INTERNAL creados de esa
 *   categoría en el bucket. Clic en una celda o en la cabecera de su columna
 *   = drill-down del AnalysisPeriod GLOBAL (ciclo → mes → semana; días
 *   terminales). El clic NUNCA filtra por categoría.
 *   Más recurrentes: total de reportes + presencia temporal; constancia
 *   antes que volumen (orden del backend).
 *
 * La unidad es la CATEGORÍA: NOVEX no sabe si dos situaciones son «el mismo
 * problema».
 */

function SheetTitle({ title, help, testId }: { title: string; help: string; testId: string }) {
  const helpId = useId()
  return (
    <p className="director-estado__section-title director-flujo__chart-title">
      <span className="director-estado__section-mark" aria-hidden="true">
        ✦
      </span>
      <span>{title}</span>
      <span className="director-flujo__help">
        <button
          type="button"
          className="director-flujo__help-button"
          aria-label={`Qué muestra ${title.toLowerCase()}`}
          aria-describedby={helpId}
          data-testid={testId}
        >
          ?
        </button>
        <span role="tooltip" id={helpId} className="director-flujo__help-text">
          {help}
        </span>
      </span>
    </p>
  )
}

const HEATMAP_HELP =
  'Problemas internos reportados por la coordinación en cada periodo, por categoría actual. No indica que sea el mismo problema repetido. Clic en una columna para profundizar.'
const RANKING_HELP =
  'Categorías presentes en más periodos observados primero; a igual presencia, más reportes. Los periodos futuros no cuentan.'

export function DirectorInternosRecurrencia({
  period,
  status,
  recurrence,
  error,
  onPeriodChange,
}: {
  period: AnalysisPeriod
  status: 'idle' | 'loading' | 'error' | 'success'
  recurrence: InternalRecurrenceResponse | null
  error: string | null
  onPeriodChange: (next: AnalysisPeriod) => void
}) {
  const trail = analysisPeriodTrail(period)
  const kind = recurrence?.bucket ?? (period.kind === 'cycle' ? 'month' : period.kind === 'month' ? 'week' : 'day')
  const canDrill = kind !== 'day'
  const rows = recurrence ? recurrenceRows(recurrence) : []
  const max = maxCell(rows)
  const buckets = recurrence?.buckets ?? []
  const lastIndex = buckets.length - 1
  const maxTotal = Math.max(1, ...rows.map((row) => row.totalCreated))

  const drill = (bucket: InternalRecurrenceBucket) => {
    if (!canDrill || bucket.future) return
    const next = drillIntoPeriod(period, bucket)
    if (next) onPeriodChange(next)
  }

  const grid: CSSProperties = {
    gridTemplateColumns: `minmax(84px, 22%) repeat(${Math.max(1, buckets.length)}, minmax(0, 1fr))`,
  }

  return (
    <div
      className="director-internos-sheet"
      data-testid="director-internos-recurrence"
      data-level={kind}
      data-period-kind={period.kind}
      data-period-from={period.from}
    >
      <SheetTitle title="Recurrencia de problemas internos" help={HEATMAP_HELP} testId="director-internos-recurrence-help" />
      <div className="director-internos-sheet__sub">
        <span>Problemas reportados por categoría</span>
        {trail.length > 1 ? (
          <nav className="director-flujo__crumb" aria-label="Nivel de la recurrencia" data-testid="director-internos-crumb">
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
                    <span className="director-flujo__crumb-here" aria-current="location">
                      {periodCrumbLabel(step)}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="director-flujo__crumb-link"
                      data-testid={`director-internos-crumb-${step.kind}`}
                      onClick={() => onPeriodChange(step)}
                    >
                      {periodCrumbLabel(step)}
                    </button>
                  )}
                </span>
              )
            })}
          </nav>
        ) : (
          <span className="director-internos-sheet__period">· {periodCrumbLabel(period)}</span>
        )}
      </div>

      {status === 'loading' && !recurrence ? (
        <p className="director-kpi-panel__hint" data-testid="director-internos-recurrence-loading">
          Leyendo recurrencia…
        </p>
      ) : null}
      {status === 'error' ? (
        <p className="director-kpi-panel__error" role="alert" data-testid="director-internos-recurrence-error">
          No se pudo leer la recurrencia.{error ? ` ${error}` : ''}
        </p>
      ) : null}

      {recurrence && status !== 'error' ? (
        <>
          <div
            className="director-internos-heatmap"
            style={grid}
            role="grid"
            aria-label="Problemas internos reportados por categoría y periodo"
            data-testid="director-internos-heatmap"
            data-loading={status === 'loading' ? 'true' : 'false'}
            data-rows={rows.length}
            data-cols={buckets.length}
          >
            <div className="director-internos-heatmap__corner" role="columnheader" aria-hidden="true" />
            {buckets.map((bucket, i) => {
              const header = bucketHeader(bucket, kind)
              const clickable = canDrill && !bucket.future
              const content = (
                <>
                  <span className="director-internos-heatmap__col-label">{header}</span>
                  <span className="director-internos-heatmap__col-total" data-testid={`director-internos-col-total-${i}`}>
                    {bucket.total === null ? '' : bucket.total}
                  </span>
                </>
              )
              return clickable ? (
                <button
                  key={bucket.calendarStart}
                  type="button"
                  role="columnheader"
                  className="director-internos-heatmap__col"
                  data-current={bucket.current ? 'true' : undefined}
                  data-testid={`director-internos-drill-${bucket.calendarStart}`}
                  aria-label={`Ver ${header.toLowerCase()} · ${countLabel(bucket.total ?? 0, 'registro', 'registros')}`}
                  onClick={() => drill(bucket)}
                >
                  {content}
                </button>
              ) : (
                <span
                  key={bucket.calendarStart}
                  role="columnheader"
                  className="director-internos-heatmap__col"
                  data-future={bucket.future ? 'true' : undefined}
                  data-current={bucket.current ? 'true' : undefined}
                >
                  {content}
                </span>
              )
            })}

            {rows.map((row) => (
              <div key={row.id} className="director-internos-heatmap__row" role="row" data-testid={`director-internos-heat-row-${row.id}`}>
                <span className="director-internos-heatmap__name" role="rowheader" title={row.name}>
                  {row.others > 0 ? `Otras (${row.others})` : row.name}
                </span>
                {buckets.map((bucket, i) => {
                  const value = row.values.at(i) ?? null
                  const edge = i >= lastIndex - 1 && i > 1 ? 'end' : undefined
                  if (value === null) {
                    return (
                      <span
                        key={bucket.calendarStart}
                        role="gridcell"
                        className="director-internos-heatmap__cell"
                        data-state="future"
                        aria-label="Sin dato: periodo futuro"
                      />
                    )
                  }
                  const tip = recurrenceCellTooltip(row, bucket, kind, value)
                  const heat = cellIntensity(value, max)
                  const style = { '--heat': heat.toFixed(3) } as CSSProperties
                  const strong = heat > 0.55 ? 'true' : undefined
                  const body = (
                    <>
                      <span className="director-internos-heatmap__value">{value === 0 ? '·' : value}</span>
                      <span className="director-internos-heatmap__tip" role="tooltip" data-edge={edge}>
                        <strong>{tip.title}</strong>
                        {tip.lines.map((line) => (
                          <span key={line}>{line}</span>
                        ))}
                      </span>
                    </>
                  )
                  return canDrill ? (
                    <button
                      key={bucket.calendarStart}
                      type="button"
                      role="gridcell"
                      className="director-internos-heatmap__cell"
                      data-state={value === 0 ? 'zero' : 'value'}
                      data-strong={strong}
                      data-testid={`director-internos-cell-${row.id}-${i}`}
                      style={style}
                      aria-label={`${tip.title}: ${tip.lines.join(', ')}`}
                      onClick={() => drill(bucket)}
                    >
                      {body}
                    </button>
                  ) : (
                    <span
                      key={bucket.calendarStart}
                      role="gridcell"
                      tabIndex={0}
                      className="director-internos-heatmap__cell"
                      data-state={value === 0 ? 'zero' : 'value'}
                      data-terminal="true"
                      data-testid={`director-internos-cell-${row.id}-${i}`}
                      style={style}
                      aria-label={`${tip.title}: ${tip.lines.join(', ')}`}
                    >
                      {body}
                    </span>
                  )
                })}
              </div>
            ))}
          </div>

          {rows.length === 0 ? (
            <p className="director-history__empty" data-testid="director-internos-recurrence-empty">
              Sin problemas internos reportados en este periodo.
            </p>
          ) : null}

          {rows.length > 0 ? (
            <section className="director-internos-ranking" data-testid="director-internos-ranking" aria-label="Más recurrentes">
              <SheetTitle title="Más recurrentes" help={RANKING_HELP} testId="director-internos-ranking-help" />
              <ol className="director-internos-ranking__list">
                {rows.map((row) => (
                  <li key={row.id} className="director-internos-ranking__item" data-testid={`director-internos-rank-${row.id}`}>
                    <span className="director-internos-ranking__name" title={row.name}>
                      {row.others > 0 ? `Otras (${row.others})` : row.name}
                    </span>
                    <span className="director-internos-ranking__track" aria-hidden="true">
                      <span
                        className="director-internos-ranking__fill"
                        style={{ width: `${(row.totalCreated / maxTotal) * 100}%` }}
                      />
                    </span>
                    <span className="director-internos-ranking__facts">
                      <strong>{countLabel(row.totalCreated, 'reporte', 'reportes')}</strong>
                      <span aria-hidden="true"> · </span>
                      {presenceText(row, recurrence.eligibleBuckets, kind)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
