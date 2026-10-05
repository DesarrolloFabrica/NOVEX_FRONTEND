import type {
  OperationalKpiSeverityCounts,
  OperationalKpiStatusCounts,
} from '@/modules/operational-cards/types/operational-kpi.types'
import {
  AttentionDonutChart,
  SeverityBarsChart,
  attentionPercents,
} from '@/modules/operational-cards/charts/DirectorEstadoCompositionCharts'
import '@/styles/director-kpi-panel.css'

/**
 * Composición del periodo de análisis: severidad + atención + relaciones.
 * `scope='live'` solo para lectura de Dirección sin coordinación (sin /period).
 */
export function DirectorEstadoComposicion({
  severity,
  status,
  incoming,
  outgoing,
  loading = false,
  hasCachedData = false,
  scope = 'period',
  onOpenDependencias,
}: {
  severity: OperationalKpiSeverityCounts
  status: OperationalKpiStatusCounts
  incoming: number
  outgoing: number
  loading?: boolean
  hasCachedData?: boolean
  scope?: 'period' | 'live'
  onOpenDependencias?: () => void
}) {
  const { openPct, progressPct, total } = attentionPercents(status)
  const showSkeleton = loading && !hasCachedData
  const severityTitle =
    scope === 'period'
      ? 'Severidad de los problemas del periodo'
      : 'Severidad de los problemas activos'
  const attentionTitle =
    scope === 'period'
      ? 'Estado actual de los casos del periodo'
      : 'Estado de atención'
  const relationsTitle =
    scope === 'period'
      ? 'Relaciones registradas en el periodo'
      : 'Relaciones con otras áreas'

  return (
    <section
      className="director-estado-comp"
      data-testid="director-estado-composicion"
      data-loading={loading ? 'true' : 'false'}
      data-scope={scope}
    >
      {loading && hasCachedData ? (
        <p
          className="director-kpi-panel__hint director-estado-comp__updating"
          data-testid="director-estado-comp-loading"
        >
          Actualizando periodo…
        </p>
      ) : null}

      <div className="director-estado-comp__charts">
        <div
          className="director-estado-comp__chart director-estado-comp__chart--severity"
          data-testid="director-kpi-severity"
        >
          <p className="director-block__title">
            {severityTitle}
            {scope === 'period' ? (
              <span
                className="director-status-badge__help"
                title="Severidad actual de los problemas registrados durante el periodo."
                aria-label="Severidad actual de los problemas registrados durante el periodo."
              >
                ?
              </span>
            ) : null}
          </p>
          {showSkeleton ? (
            <p
              className="director-kpi-panel__hint director-estado-comp__skeleton"
              data-testid="director-estado-comp-loading"
            >
              Actualizando…
            </p>
          ) : (
            <SeverityBarsChart severity={severity} />
          )}
          <span className="visually-hidden">
            Severidad: baja {severity.low}, media {severity.medium}, alta{' '}
            {severity.high}, crítica {severity.critical}.
          </span>
        </div>

        <div
          className="director-estado-comp__chart director-estado-comp__chart--attention"
          data-testid="director-kpi-status-split"
        >
          <p className="director-block__title">{attentionTitle}</p>
          {showSkeleton ? (
            <p className="director-kpi-panel__hint director-estado-comp__skeleton">
              Actualizando…
            </p>
          ) : (
            <AttentionDonutChart status={status} />
          )}
          <ul
            className="director-estado-attention__facts"
            aria-hidden="true"
          >
            <li data-kind="open">
              <span className="director-estado-attention__swatch" />
              Abiertos {status.open}
              {total > 0 ? (
                <span className="director-estado-attention__pct">
                  {' '}
                  · {openPct} %
                </span>
              ) : null}
            </li>
            <li data-kind="progress">
              <span className="director-estado-attention__swatch" />
              En atención {status.inProgress}
              {total > 0 ? (
                <span className="director-estado-attention__pct">
                  {' '}
                  · {progressPct} %
                </span>
              ) : null}
            </li>
          </ul>
          <span className="visually-hidden">
            {status.open} abiertos y {status.inProgress} en atención.
          </span>
        </div>
      </div>

      <div
        className="director-estado-relations director-estado-relations--strip"
        data-testid="director-estado-relations-line"
      >
        <p className="director-block__title">{relationsTitle}</p>
        {showSkeleton ? (
          <p className="director-kpi-panel__hint director-estado-comp__skeleton">
            Actualizando…
          </p>
        ) : (
          <div className="director-estado-relations__strip-row">
            <span className="director-estado-relations__fact" data-side="in">
              <span aria-hidden="true">↓</span> {incoming}{' '}
              {incoming === 1 ? 'dependencia' : 'dependencias'}
            </span>
            <span className="director-estado-relations__fact" data-side="out">
              <span aria-hidden="true">↑</span> {outgoing}{' '}
              {outgoing === 1 ? 'compromiso' : 'compromisos'}
            </span>
            {onOpenDependencias ? (
              <button
                type="button"
                className="director-estado-relations__cta"
                onClick={onOpenDependencias}
              >
                Ver dependencias →
              </button>
            ) : null}
          </div>
        )}
        <span className="visually-hidden">
          {incoming}{' '}
          {incoming === 1 ? 'dependencia' : 'dependencias'} y {outgoing}{' '}
          {outgoing === 1 ? 'compromiso' : 'compromisos'}.
        </span>
      </div>
    </section>
  )
}
