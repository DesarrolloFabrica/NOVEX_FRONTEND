import type { OperationalKpis } from '@/modules/operational-cards/data/operationalKpis'

/**
 * Carril ejecutivo: el estado y sus cifras, siempre en el mismo sitio.
 *
 * Presentacional puro. Recibe indicadores ya derivados y no sabe de dónde
 * salen; toda la lógica —qué se cuenta, qué manda cuando hay dos fuentes y qué
 * significa que falte un dato— vive en `resolveOperationalKpis`, que es una
 * función pura y probada.
 *
 * Ninguna cifra se comunica solo con color: el estado lleva su etiqueta de
 * texto y cada conteo su rótulo. El color acompaña, nunca informa solo.
 */

export interface OperationalKpiRailProps {
  kpis: OperationalKpis | null
}

export function OperationalKpiRail({ kpis }: OperationalKpiRailProps) {
  if (!kpis) {
    return (
      <p className="operational-kpi__note" data-testid="kpi-unavailable">
        Indicadores no disponibles
      </p>
    )
  }

  return (
    <div
      className="operational-kpi"
      data-testid="operational-kpi"
      data-scope={kpis.scope}
      data-status={kpis.status}
    >
      {/* Contexto: de quién habla el carril. Cambia con la selección. */}
      <p className="operational-kpi__context" data-testid="kpi-context">
        {kpis.contextLabel}
      </p>

      <div className="operational-kpi__status" data-testid="kpi-status">
        <span className="operational-kpi__status-dot" aria-hidden="true" />
        <span className="operational-kpi__status-label">Estado operacional</span>
        <span className="operational-kpi__status-value">{kpis.statusLabel}</span>
      </div>

      <dl className="operational-kpi__grid" data-testid="kpi-grid">
        {kpis.counters.map((counter) => (
          <div
            key={counter.id}
            className="operational-kpi__card"
            data-testid="kpi-card"
            data-kpi={counter.id}
          >
            <dt className="operational-kpi__label">{counter.label}</dt>
            <dd className="operational-kpi__value" data-testid="kpi-value">
              {counter.value === null ? '—' : counter.value}
            </dd>
            {counter.hint && (
              <p className="operational-kpi__hint">{counter.hint}</p>
            )}
          </div>
        ))}
      </dl>

      {kpis.severity && (
        <section
          className="operational-kpi__severity"
          data-testid="kpi-severity"
          aria-label="Reparto por severidad"
        >
          <h3 className="operational-kpi__severity-title">Por severidad</h3>
          <dl className="operational-kpi__severity-list">
            {kpis.severity.map((slice) => (
              <div
                key={slice.severity}
                className="operational-kpi__severity-row"
                data-severity={slice.severity}
              >
                {/* Texto y número: la severidad nunca depende del color. */}
                <dt className="operational-kpi__severity-label">
                  {slice.label}
                </dt>
                <dd className="operational-kpi__severity-value">
                  {slice.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {kpis.pending && (
        <p className="operational-kpi__note" data-testid="kpi-pending">
          Actualizando con los problemas del área…
        </p>
      )}
    </div>
  )
}
