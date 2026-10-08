import type { OperationalKpiSeverityCounts } from '@/modules/operational-cards/types/operational-kpi.types'
import {
  AttentionDonutChart,
  SeverityBarsChart,
  attentionPercents,
  type AttentionComposition,
} from '@/modules/operational-cards/charts/DirectorEstadoCompositionCharts'
import { formatAgingCut } from '@/modules/operational-cards/charts/antiguedad-option'
import '@/styles/director-kpi-panel.css'

const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const

/** «30 sep» a partir del corte YYYY-MM-DD (lo dicta el backend, no el reloj). */
function cutDay(at: string): string {
  const [, month, day] = at.split('-').map(Number)
  return `${day} ${MONTH_SHORT[month - 1]}`
}

/**
 * SNAPSHOT AT CUT: ambas gráficas describen la población ACTIVA al corte del
 * AnalysisPeriod (la misma de Carga y Antigüedad). En un corte histórico se
 * aplica el valor ACTUAL: se dice, no se finge historia.
 */
function severityHelp(cut: { at: string; isNow: boolean }): string {
  return cut.isNow
    ? 'Severidad de los problemas activos hoy (misma carga que Carga de problemas y Antigüedad).'
    : `Problemas que estaban activos al cierre del ${cutDay(cut.at)}, con su severidad ACTUAL: NOVEX no guarda la severidad que tenían entonces.`
}

function attentionHelp(cut: { at: string; isNow: boolean }): string {
  return cut.isNow
    ? 'Estado (abierto / en atención) de los problemas activos hoy.'
    : `Estado ACTUAL de los problemas que estaban activos al cierre del ${cutDay(cut.at)}. El estado de entonces no se reconstruye; los ya solucionados después del corte se muestran aparte.`
}

const RELATIONS_HELP =
  'Problemas INTER creados durante el periodo: dependencias (otra área responsable, esta afectada) y compromisos (esta responsable, otra afectada).'

function HelpMark({ text }: { text: string }) {
  return (
    <span
      className="director-status-badge__help"
      title={text}
      aria-label={text}
    >
      ?
    </span>
  )
}

/**
 * Lámina 2 de ESTADO: Severidad + Atención (SNAPSHOT AT CUT) + Relaciones
 * (FLOW: INTER creados en el periodo).
 * `scope='period'`: coordinación seleccionada; `cut` = corte del AnalysisPeriod.
 * `scope='live'`: lectura de Dirección sin coordinación (LIVE-ONLY).
 * Sin datos del periodo vigente (cargando o error) se muestra el marco con
 * «Actualizando…», nunca la foto de otro periodo bajo la cabecera nueva.
 */
export function DirectorEstadoComposicion({
  severity,
  status,
  incoming,
  outgoing,
  loading = false,
  hasCachedData = false,
  scope = 'period',
  cut = null,
  error = null,
  onOpenDependencias,
}: {
  severity: OperationalKpiSeverityCounts
  status: AttentionComposition
  incoming: number
  outgoing: number
  loading?: boolean
  hasCachedData?: boolean
  scope?: 'period' | 'live'
  /** Corte de la población (period.dataTo) cuando hay datos del periodo vigente. */
  cut?: { at: string; isNow: boolean } | null
  error?: string | null
  onOpenDependencias?: () => void
}) {
  const { openPct, progressPct, closedAfterPct, total } = attentionPercents(status)
  const closedAfter = status.closedAfterCut ?? 0
  const unclassified = status.unclassified ?? 0
  const showSkeleton = (loading || error !== null) && !hasCachedData
  const historical = scope === 'period' && cut !== null && !cut.isNow
  const severityTitle =
    scope === 'period' ? 'Severidad de la carga' : 'Severidad de los problemas activos'
  const attentionTitle = 'Estado de atención'
  const relationsTitle =
    scope === 'period' ? 'Relaciones' : 'Relaciones con otras áreas'

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

      {error ? (
        <p className="director-kpi-panel__error" role="alert" data-testid="director-estado-comp-error">
          No se pudo leer el periodo. {error}
        </p>
      ) : null}

      {scope === 'period' && cut ? (
        <p className="director-estado-comp__cut" data-testid="director-estado-comp-cut" data-now={cut.isNow ? 'true' : 'false'}>
          Activos {formatAgingCut(cut).toLowerCase()}
        </p>
      ) : null}

      <div className="director-estado-comp__charts">
        <div
          className="director-estado-comp__chart director-estado-comp__chart--severity"
          data-testid="director-kpi-severity"
        >
          <p className="director-block__title">
            {severityTitle}
            {scope === 'period' && cut ? <HelpMark text={severityHelp(cut)} /> : null}
          </p>
          {historical ? (
            <p className="director-estado-comp__reliability" data-testid="director-severity-reliability">
              Valor actual
            </p>
          ) : null}
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
          <p className="director-block__title">
            {attentionTitle}
            {scope === 'period' && cut ? <HelpMark text={attentionHelp(cut)} /> : null}
          </p>
          {historical ? (
            <p className="director-estado-comp__reliability" data-testid="director-attention-reliability">
              Estado actual · activos al {cutDay(cut.at)}
            </p>
          ) : null}
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
            {closedAfter > 0 ? (
              <li data-kind="closed-after" data-testid="director-attention-closed-after">
                <span className="director-estado-attention__swatch" />
                Solucionados después {closedAfter}
                <span className="director-estado-attention__pct">
                  {' '}
                  · {closedAfterPct} %
                </span>
              </li>
            ) : null}
            {unclassified > 0 ? (
              <li data-kind="unclassified" data-testid="director-attention-unclassified">
                <span className="director-estado-attention__swatch" />
                Sin clasificar {unclassified}
              </li>
            ) : null}
          </ul>
          <span className="visually-hidden">
            {status.open} abiertos y {status.inProgress} en atención
            {closedAfter > 0 ? `, ${closedAfter} solucionados después del corte` : ''}
            {unclassified > 0 ? `, ${unclassified} sin clasificar` : ''}.
          </span>
        </div>
      </div>

      <div
        className="director-estado-relations director-estado-relations--strip"
        data-testid="director-estado-relations-line"
      >
        <p className="director-block__title">
          {relationsTitle}
          {scope === 'period' ? <HelpMark text={RELATIONS_HELP} /> : null}
        </p>
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
