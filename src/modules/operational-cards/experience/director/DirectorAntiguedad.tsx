import { useId, type CSSProperties } from 'react'
import {
  AntiguedadChart,
  DistribucionChart,
} from '@/modules/operational-cards/charts/DirectorAntiguedadChart'
import {
  AGING_BANDS,
  agingBandPercent,
  agingKindLine,
  agingRemainderText,
  formatAgeLabel,
  formatAgingCut,
  formatAgingMedian,
  formatBogotaDate,
} from '@/modules/operational-cards/charts/antiguedad-option'
import type { OperationalKpiAging } from '@/modules/operational-cards/types/operational-kpi.types'
import '@/styles/director-kpi-panel.css'

type ChartKey = 'ranking' | 'distribucion'

const HELP: Record<ChartKey, string> = {
  ranking:
    'Problemas de la coordinación seleccionada que seguían activos al corte, ordenados por días desde su registro en NOVEX. Se cuenta desde el registro, no desde la fecha en que ocurrió el incidente.',
  distribucion:
    'Toda la carga activa de la coordinación al mismo corte, repartida por días desde su registro en NOVEX. Muestra si el envejecimiento se concentra en pocos casos o abarca gran parte de la carga.',
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
          data-testid={`director-antiguedad-help-${chart}`}
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
 * Lámina ANTIGÜEDAD · SNAPSHOT AT CUT · scope COORDINATION.
 * La coordinación seleccionada × AnalysisPeriod: la MISMA población que Carga,
 * Severidad y Atención. Una sola fotografía (`aging.at`) leída de dos formas.
 *   · PROBLEMAS MÁS ANTIGUOS — ¿cuáles son los casos extremos? (top 5)
 *   · ANTIGÜEDAD DE LA CARGA — ¿qué tan extendido está? (`aging.bands`)
 * Universo = Carga de problemas al mismo corte. Edad, no gravedad: la
 * severidad solo vive en el tooltip del ranking. El corte se muestra una vez,
 * en la cabecera de la lámina. Mismo AnalysisPeriod que el resto de ESTADO.
 */
export function DirectorAntiguedad({
  aging,
  loading,
  error,
}: {
  aging: OperationalKpiAging | null
  loading: boolean
  error: string | null
}) {
  const remainder = aging ? agingRemainderText(aging) : null
  const median = aging ? formatAgingMedian(aging.medianAgeDays) : null
  const empty = aging !== null && aging.activeCount === 0
  const rowsStyle = { '--aging-rows': aging?.oldest.length ?? 5 } as CSSProperties

  return (
    <section
      className="director-antiguedad"
      data-testid="director-antiguedad"
      data-cut={aging ? (aging.isNow ? 'now' : 'historical') : undefined}
      data-loading={loading ? 'true' : 'false'}
      data-empty={empty ? 'true' : 'false'}
    >
      <header className="director-antiguedad__head">
        <h3 className="director-antiguedad__eyebrow">Antigüedad</h3>
        {aging ? (
          <span
            className="director-antiguedad__cut"
            data-testid="director-antiguedad-cut"
            data-now={aging.isNow ? 'true' : 'false'}
          >
            {formatAgingCut(aging)}
          </span>
        ) : null}
      </header>

      {error ? (
        <p className="director-kpi-panel__error" role="alert" data-testid="director-antiguedad-error">
          No se pudo leer la antigüedad. {error}
        </p>
      ) : null}

      {!aging && loading ? (
        <p className="director-kpi-panel__hint" data-testid="director-antiguedad-loading">
          Leyendo antigüedad…
        </p>
      ) : null}

      {empty ? (
        <p className="director-antiguedad__empty" data-testid="director-antiguedad-empty">
          Sin problemas activos en este corte
        </p>
      ) : null}

      {aging && !empty ? (
        <div className="director-antiguedad__pair" data-loading={loading ? 'true' : 'false'}>
          <div
            className="director-antiguedad__col"
            data-chart="ranking"
            data-testid="director-antiguedad-ranking"
          >
            <div className="director-antiguedad__col-head">
              <ChartTitle chart="ranking">Problemas más antiguos</ChartTitle>
              <p className="director-antiguedad__sub" aria-hidden="true">
                Top {aging.oldest.length} · días desde el registro
              </p>
            </div>
            <div className="director-antiguedad__frame" style={rowsStyle}>
              <AntiguedadChart aging={aging} />
            </div>
            {remainder ? (
              <p className="director-antiguedad__more" data-testid="director-antiguedad-more">
                {remainder}
              </p>
            ) : null}
            <table className="visually-hidden" data-testid="director-antiguedad-table">
              <caption>
                Problemas activos más antiguos de la coordinación{' '}
                {aging.isNow ? 'hoy' : `al cierre del ${aging.at}`}, en días desde su
                registro en NOVEX.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Problema</th>
                  <th scope="col">Días</th>
                  <th scope="col">Registrado</th>
                  <th scope="col">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {aging.oldest.map((item) => (
                  <tr key={item.id} data-testid={`director-antiguedad-row-${item.id}`}>
                    <th scope="row">{item.title}</th>
                    <td>{formatAgeLabel(item.ageDays)}</td>
                    <td>{formatBogotaDate(item.createdAt)}</td>
                    <td>{agingKindLine(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <span className="director-antiguedad__divider" aria-hidden="true" />

          <div
            className="director-antiguedad__col"
            data-chart="distribucion"
            data-testid="director-antiguedad-distribucion"
          >
            <div className="director-antiguedad__col-head">
              <ChartTitle chart="distribucion">Antigüedad de la carga</ChartTitle>
              {median ? (
                <p className="director-antiguedad__sub" data-testid="director-antiguedad-median">
                  {median}
                </p>
              ) : null}
            </div>
            <div className="director-antiguedad__frame director-antiguedad__frame--dist">
              <DistribucionChart aging={aging} />
            </div>
            <p className="director-antiguedad__more" aria-hidden="true">
              {aging.activeCount} {aging.activeCount === 1 ? 'activo' : 'activos'} en total
            </p>
            <table className="visually-hidden" data-testid="director-distribucion-table">
              <caption>
                Antigüedad de la carga activa de la coordinación{' '}
                {aging.isNow ? 'hoy' : `al cierre del ${aging.at}`}:{' '}
                {aging.activeCount} problemas activos por rango de días desde su registro.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Rango</th>
                  <th scope="col">Problemas</th>
                  <th scope="col">Porcentaje</th>
                </tr>
              </thead>
              <tbody>
                {AGING_BANDS.map((meta) => {
                  const count = aging.bands.find((band) => band.key === meta.key)?.count ?? 0
                  return (
                    <tr key={meta.key} data-testid={`director-distribucion-row-${meta.key}`}>
                      <th scope="row">{meta.label}</th>
                      <td>{count}</td>
                      <td>{agingBandPercent(count, aging.activeCount)} %</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  )
}
