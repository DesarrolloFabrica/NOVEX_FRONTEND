import { useId } from 'react'
import {
  ResolucionTrendChart,
  TiempoSolucionChart,
} from '@/modules/operational-cards/charts/DirectorResolucionChart'
import { flujoBucketTitle, type FlujoLevel } from '@/modules/operational-cards/charts/flujo-option'
import {
  RESOLUTION_BANDS,
  formatResolutionDuration,
  resolutionBandCounts,
  resolutionBandPercent,
} from '@/modules/operational-cards/charts/resolucion-option'
import type { AnalysisPeriod } from '@/modules/operational-cards/domain/analysis-period'
import type {
  OperationalKpiFlowBucket,
  OperationalKpiResolution,
} from '@/modules/operational-cards/types/operational-kpi.types'
import '@/styles/director-kpi-panel.css'

type ChartKey = 'tendencia' | 'distribucion'

const HELP: Record<ChartKey, string> = {
  tendencia:
    'Mediana del tiempo transcurrido desde el registro hasta la solución de los problemas cerrados en cada periodo. Un punto hueco indica pocos cierres; un tramo vacío, que no hubo cierres.',
  distribucion:
    'Los problemas solucionados en el periodo, repartidos por el tiempo que tardaron desde su registro en NOVEX hasta su solución. Son los mismos que Movimiento cuenta como Solucionados.',
}

/** Nivel de la línea = lo que se ve dentro del periodo (igual que Carga). */
function resolucionLevelOf(period: AnalysisPeriod): FlujoLevel {
  if (period.kind === 'cycle') return 'month'
  if (period.kind === 'month') return 'week'
  return 'day'
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
          data-testid={`director-resolucion-help-${chart}`}
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
 * Lámina RESOLUCIÓN · FLOW OUTCOME / TIME SERIES · scope COORDINATION.
 * Los problemas atribuidos HOY a la coordinación seleccionada que se
 * solucionaron dentro del AnalysisPeriod: EXACTAMENTE los «Solucionados» de
 * Movimiento (el parser lo exige bucket a bucket).
 *   · TIEMPO DE RESOLUCIÓN — ¿cuánto tardamos normalmente? ¿más o menos que antes?
 *   · TIEMPO HASTA SOLUCIÓN — ¿la mayoría se resuelve rápido o hay cierres largos?
 * Métrica de INTERVALO (no foto al corte): el periodo ya está arriba, sin chip
 * de corte. Reacciona al AnalysisPeriod; no lo cambia (sin drill-down).
 */
export function DirectorResolucion({
  period,
  flowBuckets,
  resolution,
  loading,
  error,
}: {
  period: AnalysisPeriod
  flowBuckets: readonly OperationalKpiFlowBucket[] | null
  resolution: OperationalKpiResolution | null
  loading: boolean
  error: string | null
}) {
  const level = resolucionLevelOf(period)
  const ready = resolution !== null && flowBuckets !== null
  const empty = ready && resolution.closedCount === 0
  const counts = resolution ? resolutionBandCounts(resolution) : []

  return (
    <section
      className="director-resolucion"
      data-testid="director-resolucion"
      data-level={level}
      data-loading={loading ? 'true' : 'false'}
      data-empty={empty ? 'true' : 'false'}
    >
      <header className="director-antiguedad__head">
        <h3 className="director-antiguedad__eyebrow">Resolución</h3>
      </header>

      {error ? (
        <p className="director-kpi-panel__error" role="alert" data-testid="director-resolucion-error">
          No se pudo leer la resolución. {error}
        </p>
      ) : null}

      {!ready && loading ? (
        <p className="director-kpi-panel__hint" data-testid="director-resolucion-loading">
          Leyendo resolución…
        </p>
      ) : null}

      {empty ? (
        <p className="director-antiguedad__empty" data-testid="director-resolucion-empty">
          Sin problemas solucionados en este periodo
        </p>
      ) : null}

      {ready && !empty ? (
        <div className="director-resolucion__pair" data-loading={loading ? 'true' : 'false'}>
          <div
            className="director-antiguedad__col"
            data-chart="tendencia"
            data-testid="director-resolucion-tendencia"
          >
            <div className="director-antiguedad__col-head">
              <ChartTitle chart="tendencia">Tiempo de resolución</ChartTitle>
              {resolution.medianDays !== null ? (
                <p className="director-antiguedad__sub" data-testid="director-resolucion-median">
                  Mediana del periodo · {formatResolutionDuration(resolution.medianDays, { long: true })}
                </p>
              ) : null}
            </div>
            <div className="director-resolucion__frame">
              <ResolucionTrendChart flowBuckets={flowBuckets} resolution={resolution} level={level} />
            </div>
            <table className="visually-hidden" data-testid="director-resolucion-table">
              <caption>
                Mediana del tiempo desde el registro hasta la solución de los problemas
                cerrados en cada tramo del periodo.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Tramo</th>
                  <th scope="col">Mediana</th>
                  <th scope="col">Solucionados</th>
                </tr>
              </thead>
              <tbody>
                {resolution.buckets.map((bucket, index) => {
                  const flow = flowBuckets[index]
                  if (!flow || bucket.closedCount === null) return null
                  return (
                    <tr key={bucket.start} data-testid={`director-resolucion-row-${bucket.start}`}>
                      <th scope="row">{flujoBucketTitle(flow, level)}</th>
                      <td>
                        {bucket.medianDays === null
                          ? 'Sin cierres'
                          : formatResolutionDuration(bucket.medianDays, { long: true })}
                      </td>
                      <td>{bucket.closedCount}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <span className="director-antiguedad__divider" aria-hidden="true" />

          <div
            className="director-antiguedad__col"
            data-chart="distribucion"
            data-testid="director-resolucion-distribucion"
          >
            <div className="director-antiguedad__col-head">
              <ChartTitle chart="distribucion">Tiempo hasta solución</ChartTitle>
              <p className="director-antiguedad__sub" data-testid="director-resolucion-count">
                {resolution.closedCount}{' '}
                {resolution.closedCount === 1 ? 'solucionado' : 'solucionados'} en el periodo
              </p>
            </div>
            <div className="director-resolucion__frame">
              <TiempoSolucionChart resolution={resolution} />
            </div>
            <table className="visually-hidden" data-testid="director-tiempo-solucion-table">
              <caption>
                {resolution.closedCount} problemas solucionados en el periodo, por tiempo
                desde su registro hasta su solución.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Rango</th>
                  <th scope="col">Problemas</th>
                  <th scope="col">Porcentaje</th>
                </tr>
              </thead>
              <tbody>
                {RESOLUTION_BANDS.map((meta, index) => (
                  <tr key={meta.key} data-testid={`director-tiempo-solucion-row-${meta.key}`}>
                    <th scope="row">{meta.label}</th>
                    <td>{counts[index]}</td>
                    <td>{resolutionBandPercent(counts[index], resolution.closedCount)} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  )
}
