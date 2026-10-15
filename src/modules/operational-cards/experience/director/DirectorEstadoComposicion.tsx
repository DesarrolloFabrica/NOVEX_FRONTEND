import type { OperationalKpiSeverityCounts } from '@/modules/operational-cards/types/operational-kpi.types'
import {
  AttentionDonutChart,
  SeverityBarsChart,
  attentionPercents,
  type AttentionComposition,
} from '@/modules/operational-cards/charts/DirectorEstadoCompositionCharts'
import { formatAgingCut } from '@/modules/operational-cards/charts/antiguedad-option'
import {
  EstadoCorteComposicion,
  type EstadoCorteHelp,
} from '@/modules/operational-cards/experience/director/DirectorEstadoCorte'
import '@/styles/director-kpi-panel.css'

const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const

/** «30 sep» a partir del corte YYYY-MM-DD (lo dicta el backend, no el reloj). */
function cutDay(at: string): string {
  const [, month, day] = at.split('-').map(Number)
  return `${day} ${MONTH_SHORT[month - 1]}`
}

/**
 * SNAPSHOT AT CUT: ambas gráficas describen la población ACTIVA al corte del
 * AnalysisPeriod (la misma de Carga y Antigüedad). Contrato /state:
 * `snapshot.reliability` = 'exact' en el corte de hoy y 'current-value' en un
 * corte histórico → se usa el valor VIGENTE HOY y se dice, sin fingir
 * historia. NOVEX sí registra los cambios de severidad
 * (situation_severity_changes), pero esta vista todavía no los usa.
 */
function severityHelp(cut: { at: string; isNow: boolean }): string {
  return cut.isNow
    ? 'Severidad vigente de los problemas activos en el corte: la misma población que Carga de problemas y Antigüedad.'
    : `Problemas activos al cierre del ${cutDay(cut.at)}, clasificados por su severidad vigente hoy. NOVEX registra los cambios de severidad, pero esta vista aún no los aplica: no muestra la severidad que tenían en esa fecha.`
}

function attentionHelp(cut: { at: string; isNow: boolean }): string {
  return cut.isNow
    ? 'Estado de atención vigente (abierto o en atención) de los problemas activos en el corte.'
    : `Estado de atención vigente hoy de los problemas activos al cierre del ${cutDay(cut.at)}. No se reconstruye el estado que tenían en esa fecha; los cerrados después del corte se muestran aparte.`
}

/** Explicación completa de «Valores actuales» (corte histórico). */
function currentValuesHelp(cut: { at: string }): string {
  return `La población es la de los problemas activos al cierre del ${cutDay(cut.at)}. Su severidad y su estado de atención son los vigentes hoy, no los de esa fecha.`
}

const RELATIONS_HELP =
  'Problemas entre coordinaciones REGISTRADOS durante el periodo (no una foto al corte). Dependencias: otra coordinación es la responsable y esta es la afectada. Compromisos: esta coordinación es la responsable y otra es la afectada.'

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
 * Tres estados, nunca mezclados (`data-state`):
 *   ready   · respuesta válida del periodo vigente (puede ser 0 activos).
 *   loading · sin datos aún: «Actualizando…», sin ninguna cifra.
 *   error   · la consulta falló (o el contrato no se cumplió): solo el error.
 * Sin datos válidos no se pinta NINGUNA cifra, ni visible ni para lector de
 * pantalla: los ceros de reserva del padre no son resultados. Tampoco se
 * muestra la foto de otro periodo bajo la cabecera nueva.
 */
function NoData({ state }: { state: 'loading' | 'error' }) {
  return state === 'loading' ? (
    <p
      className="director-kpi-panel__hint director-estado-comp__skeleton"
      data-testid="director-estado-comp-pending"
    >
      Actualizando…
    </p>
  ) : (
    // El motivo ya está en el aviso de error (role=alert): aquí solo el hueco.
    <p
      className="director-estado-comp__skeleton director-estado-comp__nodata"
      data-testid="director-estado-comp-nodata"
      aria-hidden="true"
    >
      —
    </p>
  )
}

type ComposicionProps = {
  severity: OperationalKpiSeverityCounts
  status: AttentionComposition
  incoming: number
  outgoing: number
  loading?: boolean
  hasCachedData?: boolean
  scope?: 'period' | 'live'
  /** Corte de la población (period.dataTo) cuando hay datos del periodo vigente. */
  cut?: { at: string; isNow: boolean } | null
  /** Intervalo consultado [from, dataTo] de las relaciones (flujo del periodo). */
  relationsPeriod?: { from: string; to: string } | null
  error?: string | null
  onOpenDependencias?: () => void
}

/**
 * Punto de entrada. `scope='period'` (lámina 2 de una coordinación) usa la
 * composición por corte; `scope='live'` (lectura de Dirección sin
 * coordinación) conserva su maquetación previa: esta fase no la toca.
 */
export function DirectorEstadoComposicion(props: ComposicionProps) {
  if ((props.scope ?? 'period') === 'live') return <LiveComposicion {...props} />
  const error = props.error ?? null
  // Sin respuesta válida del periodo vigente no hay cifras: cargando o error.
  const dataState: 'ready' | 'loading' | 'error' = props.hasCachedData
    ? 'ready'
    : error !== null
      ? 'error'
      : 'loading'
  return (
    <EstadoCorteComposicion
      severity={props.severity}
      status={props.status}
      incoming={props.incoming}
      outgoing={props.outgoing}
      loading={props.loading ?? false}
      dataState={dataState}
      cut={props.cut ?? null}
      relationsPeriod={props.relationsPeriod ?? null}
      error={error}
      help={CORTE_HELP}
      onOpenDependencias={props.onOpenDependencias}
    />
  )
}

const CORTE_HELP: EstadoCorteHelp = {
  severity: severityHelp,
  attention: attentionHelp,
  currentValues: currentValuesHelp,
  relations: RELATIONS_HELP,
}

/** Maquetación previa (barras verticales + dona), hoy solo para Dirección. */
function LiveComposicion({
  severity,
  status,
  incoming,
  outgoing,
  loading = false,
  hasCachedData = false,
  scope = 'live',
  cut = null,
  error = null,
  onOpenDependencias,
}: ComposicionProps) {
  const { openPct, progressPct, closedAfterPct, total } = attentionPercents(status)
  const closedAfter = status.closedAfterCut ?? 0
  const unclassified = status.unclassified ?? 0
  // La lectura de Dirección (live) siempre llega con datos ya validados.
  const hasData = scope === 'live' || hasCachedData
  const dataState: 'ready' | 'loading' | 'error' = hasData
    ? 'ready'
    : error !== null
      ? 'error'
      : 'loading'
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
      data-state={dataState}
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
          {dataState === 'ready' ? (
            <>
              <SeverityBarsChart severity={severity} />
              <span className="visually-hidden">
                Severidad: baja {severity.low}, media {severity.medium}, alta{' '}
                {severity.high}, crítica {severity.critical}.
              </span>
            </>
          ) : (
            <NoData state={dataState} />
          )}
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
          {dataState === 'ready' ? (
            <AttentionDonutChart status={status} />
          ) : (
            <NoData state={dataState} />
          )}
          {dataState === 'ready' ? (
            <>
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
            </>
          ) : null}
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
        {dataState !== 'ready' ? (
          <NoData state={dataState} />
        ) : (
          <>
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
            <span className="visually-hidden">
              {incoming}{' '}
              {incoming === 1 ? 'dependencia' : 'dependencias'} y {outgoing}{' '}
              {outgoing === 1 ? 'compromiso' : 'compromisos'}.
            </span>
          </>
        )}
      </div>
    </section>
  )
}
