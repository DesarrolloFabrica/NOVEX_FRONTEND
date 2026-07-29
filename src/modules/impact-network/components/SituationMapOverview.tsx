import {
  getCoordination,
  type CoordinationId,
} from '@/modules/impact-network/data/coordination-islands.config'
import type {
  OperationalEvent,
  RiskLevel,
} from '@/modules/operational-events/types/operational-event.types'
import { NovexIcon } from '@/shared/components/NovexIcon'

interface SituationMapOverviewProps {
  event: OperationalEvent
  originCoordinationId: CoordinationId
  affectedNames: readonly string[]
  propagationDurationLabel: string
}

const RISK_LABEL: Record<RiskLevel, string> = {
  critical: 'Crítico',
  high: 'Alto',
  moderate: 'Moderado',
  low: 'Bajo',
}

const STATUS_LABEL = {
  open: 'Abierta',
  monitoring: 'En seguimiento',
  resolved: 'Resuelta',
  archived: 'Archivada',
} as const

export function SituationMapOverview({
  event,
  originCoordinationId,
  affectedNames,
  propagationDurationLabel,
}: SituationMapOverviewProps) {
  const origin = getCoordination(originCoordinationId)
  const riskLevel = event.interpretation?.riskLevel ?? 'moderate'
  const riskScore = Math.round(event.interpretation?.riskScore ?? 0)

  return (
    <div className="situation-map-overview">
      <section className="situation-map-overview__intro">
        <span className="situation-map-overview__icon" aria-hidden="true">
          <NovexIcon name="activity" size={18} strokeWidth={1.8} />
        </span>
        <div>
          <span>Lectura de la red</span>
          <h3>Propagación activa</h3>
          <p>
            El mapa parte de {origin.name} y muestra únicamente las
            coordinaciones relacionadas con esta situación.
          </p>
        </div>
      </section>

      <dl className="situation-map-overview__metrics">
        <div>
          <dt>Riesgo</dt>
          <dd data-risk={riskLevel}>{riskScore}/100</dd>
          <small>{RISK_LABEL[riskLevel]}</small>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>{STATUS_LABEL[event.status]}</dd>
          <small>Situación seleccionada</small>
        </div>
        <div>
          <dt>Conexiones</dt>
          <dd>{affectedNames.length}</dd>
          <small>Coordinaciones relacionadas</small>
        </div>
        <div>
          <dt>Propagación</dt>
          <dd>{propagationDurationLabel}</dd>
          <small>Tiempo estimado</small>
        </div>
      </dl>

      <section className="situation-map-overview__route">
        <header>
          <span>Ruta de impacto</span>
          <strong>{affectedNames.length + 1} nodos visibles</strong>
        </header>

        <div className="situation-map-overview__origin">
          <span aria-hidden="true">
            <NovexIcon name="activity" size={14} strokeWidth={1.8} />
          </span>
          <div>
            <small>Origen</small>
            <strong>{origin.name}</strong>
          </div>
        </div>

        {affectedNames.length > 0 ? (
          <ol className="situation-map-overview__connections">
            {affectedNames.map((name, index) => (
              <li key={`${name}-${index}`}>
                <span aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <small>Coordinación relacionada</small>
                  <strong>{name}</strong>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="situation-map-overview__empty">
            No se identificaron conexiones secundarias para esta situación.
          </p>
        )}
      </section>

      <aside className="situation-map-overview__hint">
        <NovexIcon name="grid" size={18} strokeWidth={1.7} />
        <div>
          <strong>Explore el detalle por isla</strong>
          <p>
            Seleccione la isla central para abrir el expediente completo o una
            isla relacionada para consultar su afectación específica.
          </p>
        </div>
      </aside>
    </div>
  )
}
