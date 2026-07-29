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
  predictedNames?: readonly string[]
  predictionVisible?: boolean
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
  predictedNames = [],
  predictionVisible = false,
  propagationDurationLabel,
}: SituationMapOverviewProps) {
  const origin = getCoordination(originCoordinationId)
  const riskLevel = event.interpretation?.riskLevel ?? 'moderate'
  const riskScore = Math.round(event.interpretation?.riskScore ?? 0)
  const visibleNodes =
    affectedNames.length + 1 + (predictionVisible ? predictedNames.length : 0)

  return (
    <div
      className="situation-map-overview"
      data-prediction={predictionVisible ? 'visible' : 'hidden'}
    >
      <section className="situation-map-overview__intro">
        <span className="situation-map-overview__icon" aria-hidden="true">
          <NovexIcon name="activity" size={18} strokeWidth={1.8} />
        </span>
        <div>
          <span>Lectura de la red</span>
          <h3>
            {predictionVisible ? 'Impacto simulado' : 'Propagación activa'}
          </h3>
          <p>
            {predictionVisible
              ? `Predicción a 30 min desde ${origin.name}: se iluminan conexiones potenciales en el mapa.`
              : `El mapa parte de ${origin.name} y muestra únicamente las coordinaciones relacionadas con esta situación.`}
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
          <dd>
            {affectedNames.length}
            {predictionVisible && predictedNames.length > 0
              ? `+${predictedNames.length}`
              : ''}
          </dd>
          <small>
            {predictionVisible ? 'Reales + previstas' : 'Coordinaciones relacionadas'}
          </small>
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
          <strong>{visibleNodes} nodos visibles</strong>
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

        {predictionVisible && predictedNames.length > 0 ? (
          <ol className="situation-map-overview__connections situation-map-overview__connections--predicted">
            {predictedNames.map((name, index) => (
              <li key={`predicted-${name}-${index}`}>
                <span aria-hidden="true">P{index + 1}</span>
                <div>
                  <small>Impacto previsto</small>
                  <strong>{name}</strong>
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      <aside className="situation-map-overview__hint">
        <NovexIcon name="grid" size={18} strokeWidth={1.7} />
        <div>
          <strong>
            {predictionVisible
              ? 'Simulación activa'
              : 'Explore el detalle por isla'}
          </strong>
          <p>
            {predictionVisible
              ? 'Las líneas naranjas del mapa muestran el impacto potencial. Pulse “Ocultar predicción” para volver a la propagación real.'
              : 'Seleccione la isla central para abrir el expediente completo o una isla relacionada para consultar su afectación específica.'}
          </p>
        </div>
      </aside>
    </div>
  )
}
