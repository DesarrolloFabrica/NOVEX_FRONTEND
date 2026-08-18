import { memo, useMemo, type CSSProperties } from 'react'
import type { ImpactIncident } from '@/modules/impact-network/types/impact-network.types'
import { buildSituationLayouts } from '@/modules/impact-network/components/coordination-situation-layout'
import {
  EVENT_STATUS_LABEL,
  RISK_LEVEL_LABEL,
} from '@/modules/operational-events/components/eventPresentation'
import type { RiskLevel } from '@/modules/operational-events/types/operational-event.types'

interface CoordinationSituationNodesProps {
  incidents: readonly ImpactIncident[]
  origin: { x: number; y: number }
  islandSize: number
  stageSize: { width: number; height: number }
  reducedMotion?: boolean
  executiveMode?: boolean
  onSelectSituation: (eventId: string) => void
}

const RISK_TONE: Record<RiskLevel, string> = {
  critical: 'critical',
  high: 'high',
  moderate: 'moderate',
  low: 'low',
}

function CoordinationSituationNodesView({
  incidents,
  origin,
  islandSize,
  stageSize,
  reducedMotion = false,
  executiveMode = false,
  onSelectSituation,
}: CoordinationSituationNodesProps) {
  const orderedIncidents = useMemo(
    () =>
      executiveMode
        ? [...incidents].sort(
            (left, right) =>
              right.riskScore - left.riskScore ||
              right.lastUpdateAt.localeCompare(left.lastUpdateAt),
          )
        : incidents,
    [executiveMode, incidents],
  )
  const layouts = useMemo(
    () => buildSituationLayouts(orderedIncidents, origin, islandSize, stageSize),
    [islandSize, orderedIncidents, origin, stageSize],
  )
  const hiddenCount = Math.max(0, orderedIncidents.length - layouts.length)

  if (layouts.length === 0) return null

  return (
    <div
      className="coordination-situation-nodes"
      data-reduced-motion={reducedMotion}
      data-visible-count={layouts.length}
      data-hidden-count={hiddenCount}
      data-executive={executiveMode}
      aria-label="Situaciones de la coordinación"
    >
      <svg
        className="coordination-situation-nodes__links"
        width={stageSize.width}
        height={stageSize.height}
        viewBox={`0 0 ${stageSize.width} ${stageSize.height}`}
        aria-hidden="true"
      >
        {layouts.map(({ incident, path }) => (
          <path
            key={`link-${incident.eventId}`}
            className="coordination-situation-nodes__link"
            d={path}
            data-risk={incident.riskLevel ?? 'moderate'}
          />
        ))}
      </svg>

      <div className="coordination-situation-nodes__hint">
        <span>
          {executiveMode ? 'Requiere atención primero' : 'Seleccione una situación'}
        </span>
        {hiddenCount > 0 ? (
          <small>+{hiddenCount} en el panel derecho</small>
        ) : null}
      </div>

      {layouts.map(({ incident, x, y }, index) => {
        const risk = incident.riskLevel ?? 'moderate'
        const riskLabel = RISK_LEVEL_LABEL[risk]
        const statusLabel = EVENT_STATUS_LABEL[incident.status]

        return (
          <button
            key={incident.eventId}
            type="button"
            className="coordination-situation-node"
            data-risk={RISK_TONE[risk]}
            data-priority={executiveMode && index === 0 ? 'true' : 'false'}
            style={
              {
                left: x,
                top: y,
                '--situation-order': index,
              } as CSSProperties
            }
            aria-label={`Seleccionar situación ${incident.title}. Riesgo ${riskLabel}. ${statusLabel}.`}
            onClick={() => onSelectSituation(incident.eventId)}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <span
              className="coordination-situation-node__orb"
              aria-hidden="true"
            >
              <i />
              <b>{Math.round(incident.riskScore)}</b>
            </span>
            <span className="coordination-situation-node__copy">
              {executiveMode && index === 0 ? (
                <span className="coordination-situation-node__priority">
                  Prioridad principal
                </span>
              ) : null}
              <strong title={incident.title}>{incident.title}</strong>
              <small>
                {executiveMode
                  ? `${riskLabel} · ${Math.round(incident.riskScore)}/100`
                  : `${riskLabel} · ${statusLabel}`}
              </small>
              <em>
                {executiveMode
                  ? 'Revisar situación'
                  : 'Seleccionar situación'}
              </em>
            </span>
          </button>
        )
      })}
    </div>
  )
}

export const CoordinationSituationNodes = memo(CoordinationSituationNodesView)
