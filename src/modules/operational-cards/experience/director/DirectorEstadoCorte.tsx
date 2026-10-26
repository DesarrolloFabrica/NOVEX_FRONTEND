import { useId, type ReactNode } from 'react'
import type { AttentionComposition } from '@/modules/operational-cards/charts/DirectorEstadoCompositionCharts'
import {
  CompactAttentionDonut,
  SeverityRowsChart,
} from '@/modules/operational-cards/charts/DirectorEstadoCorteCharts'
import { attentionRows } from '@/modules/operational-cards/charts/estado-corte-option'
import { formatFlujoDay } from '@/modules/operational-cards/charts/flujo-coverage'
import type { OperationalKpiSeverityCounts } from '@/modules/operational-cards/types/operational-kpi.types'
import '@/styles/director-kpi-panel.css'

export type EstadoCorteHelp = {
  severity: (cut: { at: string; isNow: boolean }) => string
  attention: (cut: { at: string; isNow: boolean }) => string
  currentValues: (cut: { at: string }) => string
  relations: string
}

/** Ayuda «?» accesible (botón con foco; el texto aparece con hover o foco). */
function Help({ label, text, testId }: { label: string; text: string; testId: string }) {
  const id = useId()
  return (
    <span className="director-flujo__help">
      <button
        type="button"
        className="director-flujo__help-button"
        aria-label={label}
        aria-describedby={id}
        data-testid={testId}
      >
        ?
      </button>
      <span role="tooltip" id={id} className="director-flujo__help-text">
        {text}
      </span>
    </span>
  )
}

/** Hueco sin datos: «Actualizando…» al cargar; «—» tras un error (sin cifras). */
function NoData({ state, testId }: { state: 'loading' | 'error'; testId?: string }) {
  return state === 'loading' ? (
    <p className="director-corte__pending" data-testid={testId ?? 'director-estado-comp-pending'}>
      Actualizando…
    </p>
  ) : (
    // El motivo ya está en el aviso de error (role=alert): aquí solo el hueco.
    <p
      className="director-corte__pending director-corte__pending--error"
      data-testid="director-estado-comp-nodata"
      aria-hidden="true"
    >
      —
    </p>
  )
}

function Block({
  title,
  help,
  testId,
  children,
}: {
  title: string
  help?: ReactNode
  testId: string
  children: ReactNode
}) {
  return (
    <div className="director-corte__block" data-testid={testId}>
      <p className="director-estado__section-title director-flujo__chart-title director-corte__title">
        <span className="director-estado__section-mark" aria-hidden="true">
          ✦
        </span>
        <span>{title}</span>
        {help}
      </p>
      {children}
    </div>
  )
}

/**
 * Lámina 2 de ESTADO (scope coordinación) · composición por corte:
 *   1 · Cabecera: N activos al corte + fecha efectiva (+ «Valores actuales»
 *       en cortes históricos, con la explicación en su ayuda).
 *   2 · Severidad: cuatro filas horizontales, Crítica → Baja, escala común.
 *   3 · Atención: dona compacta con la leyenda al lado (o debajo).
 *   4 · Relaciones: FLUJO del periodo (creadas en [from, dataTo]), separado
 *       de la foto. No se suma a los activos ni entra en la dona.
 * Alturas ajustadas al contenido: la lámina no se estira para llenar.
 * Estados (`data-state`): ready · loading (sin cifras) · error (solo aviso).
 */
export function EstadoCorteComposicion({
  severity,
  status,
  incoming,
  outgoing,
  loading,
  dataState,
  cut,
  relationsPeriod,
  error,
  help,
  onOpenDependencias,
}: {
  severity: OperationalKpiSeverityCounts
  status: AttentionComposition
  incoming: number
  outgoing: number
  loading: boolean
  dataState: 'ready' | 'loading' | 'error'
  cut: { at: string; isNow: boolean } | null
  relationsPeriod: { from: string; to: string } | null
  error: string | null
  help: EstadoCorteHelp
  onOpenDependencias?: () => void
}) {
  const ready = dataState === 'ready'
  const historical = cut !== null && !cut.isNow
  const rows = attentionRows(status, { historical })
  // Σ de todas las categorías de atención = activos al corte (lo valida el
  // parser contra snapshot.activeCount, aging y el último punto de Carga).
  const total = rows.reduce((sum, row) => sum + row.count, 0)
  const empty = ready && total === 0
  const cutLabel = cut
    ? `Corte ${formatFlujoDay(cut.at, !cut.isNow)}${cut.isNow ? ' · en curso' : ''}`
    : null
  const sameYear = relationsPeriod ? relationsPeriod.from.slice(0, 4) === relationsPeriod.to.slice(0, 4) : true
  const relationsInterval = relationsPeriod
    ? `${formatFlujoDay(relationsPeriod.from, !sameYear)} – ${formatFlujoDay(relationsPeriod.to, true)}`
    : null

  return (
    <section
      className="director-estado-comp director-corte"
      data-testid="director-estado-composicion"
      data-loading={loading ? 'true' : 'false'}
      data-state={dataState}
      data-scope="period"
      data-historical={historical ? 'true' : 'false'}
    >
      {loading && ready ? (
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

      {/* 1 · Cabecera: población y corte (válida en corte actual e histórico). */}
      {/* Sin datos válidos la cabecera no identifica ningún corte (ni el anterior). */}
      <header
        className="director-corte__head"
        data-testid={ready ? 'director-estado-comp-cut' : 'director-estado-comp-cut-pending'}
        data-now={cut?.isNow ? 'true' : 'false'}
      >
        {ready ? (
          <span className="director-corte__total" data-testid="director-corte-total">
            {total}
          </span>
        ) : null}
        <span className="director-corte__label">
          {ready && total === 1 ? 'activo al corte' : 'activos al corte'}
        </span>
        {ready && cutLabel ? <span className="director-corte__date">{cutLabel}</span> : null}
        {ready && historical && cut ? (
          <span className="director-corte__current" data-testid="director-corte-current-values">
            Valores actuales
            <Help
              label="Qué significa valores actuales"
              text={help.currentValues(cut)}
              testId="director-corte-current-help"
            />
          </span>
        ) : null}
      </header>

      {empty ? (
        <p className="director-corte__empty" data-testid="director-corte-empty">
          Sin problemas activos en este corte
        </p>
      ) : (
        <>
          {/* 2 · Severidad: filas horizontales, ceros visibles. */}
          <Block
            title="Severidad de la carga"
            testId="director-kpi-severity"
            help={
              cut ? (
                <Help
                  label="Qué muestra severidad"
                  text={help.severity(cut)}
                  testId="director-corte-severity-help"
                />
              ) : null
            }
          >
            {ready ? (
              <div className="director-corte__severity">
                <SeverityRowsChart severity={severity} />
              </div>
            ) : (
              <NoData state={dataState as 'loading' | 'error'} testId="director-estado-comp-loading" />
            )}
          </Block>

          {/* 3 · Atención: dona compacta + leyenda con nombre, cantidad y %. */}
          <Block
            title="Estado de atención"
            testId="director-kpi-status-split"
            help={
              cut ? (
                <Help
                  label="Qué muestra estado de atención"
                  text={help.attention(cut)}
                  testId="director-corte-attention-help"
                />
              ) : null
            }
          >
            {ready ? (
              <div className="director-corte__attention">
                <div className="director-corte__donut">
                  <CompactAttentionDonut
                    status={status}
                    ariaLabel={`Estado de atención de los ${total} activos: ${rows
                      .map((row) => `${row.label.toLowerCase()} ${row.count} (${row.pct} %)`)
                      .join(', ')}.`}
                  />
                </div>
                <ul className="director-corte__legend" aria-label={`Estado de atención de los ${total} activos`}>
                  {rows.map((row) => (
                    <li
                      key={row.key}
                      className="director-corte__legend-row"
                      data-kind={row.key}
                      data-testid={`director-attention-${row.key}`}
                    >
                      <span
                        className="director-corte__swatch"
                        style={{ background: row.color }}
                        aria-hidden="true"
                      />
                      <span className="director-corte__legend-name">{row.label}</span>
                      <span className="director-corte__legend-count">{row.count}</span>
                      <span className="director-corte__legend-pct">{row.pct} %</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <NoData state={dataState as 'loading' | 'error'} />
            )}
          </Block>
        </>
      )}

      {/* 4 · Relaciones: movimiento del PERIODO, separado de la foto. */}
      <section
        className="director-corte__relations"
        data-testid="director-estado-relations-line"
        aria-label="Relaciones creadas en el periodo"
      >
        <div className="director-corte__relations-head">
          <p className="director-estado__section-title director-flujo__chart-title director-corte__title">
            <span className="director-estado__section-mark" aria-hidden="true">
              ✦
            </span>
            <span>Relaciones creadas en el periodo</span>
            <Help
              label="Qué muestra relaciones"
              text={help.relations}
              testId="director-corte-relations-help"
            />
          </p>
          {ready && relationsInterval ? (
            <span className="director-corte__relations-period">{relationsInterval}</span>
          ) : null}
        </div>
        {ready ? (
          <div className="director-corte__relations-row">
            <ul className="director-corte__relations-facts">
              <li data-side="in" data-testid="director-relations-dependencies">
                <span className="director-corte__relations-value">{incoming}</span>
                <span className="director-corte__relations-name">
                  {incoming === 1 ? 'Dependencia' : 'Dependencias'}
                </span>
                <span className="director-corte__relations-desc">otras coordinaciones afectan a esta</span>
              </li>
              <li data-side="out" data-testid="director-relations-commitments">
                <span className="director-corte__relations-value">{outgoing}</span>
                <span className="director-corte__relations-name">
                  {outgoing === 1 ? 'Compromiso' : 'Compromisos'}
                </span>
                <span className="director-corte__relations-desc">esta coordinación afecta a otras</span>
              </li>
            </ul>
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
        ) : (
          <NoData state={dataState as 'loading' | 'error'} />
        )}
      </section>
    </section>
  )
}
