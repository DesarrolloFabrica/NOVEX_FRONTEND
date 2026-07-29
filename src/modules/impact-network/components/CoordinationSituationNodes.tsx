import { memo, useMemo, type CSSProperties } from 'react'
import type { ImpactIncident } from '@/modules/impact-network/types/impact-network.types'
import {
  EVENT_STATUS_LABEL,
  RISK_LEVEL_LABEL,
} from '@/modules/operational-events/components/eventPresentation'
import type { RiskLevel } from '@/modules/operational-events/types/operational-event.types'

export const MAX_VISIBLE_SITUATION_NODES = 4

interface CoordinationSituationNodesProps {
  incidents: readonly ImpactIncident[]
  origin: { x: number; y: number }
  islandSize: number
  stageSize: { width: number; height: number }
  reducedMotion?: boolean
  onSelectSituation: (eventId: string) => void
}

interface SituationNodeLayout {
  incident: ImpactIncident
  x: number
  y: number
  path: string
}

const RISK_TONE: Record<RiskLevel, string> = {
  critical: 'critical',
  high: 'high',
  moderate: 'moderate',
  low: 'low',
}

function buildSituationLayouts(
  incidents: readonly ImpactIncident[],
  origin: { x: number; y: number },
  islandSize: number,
): SituationNodeLayout[] {
  const visible = incidents.slice(0, MAX_VISIBLE_SITUATION_NODES)
  if (visible.length === 0) return []

  const radiusX = Math.max(118, islandSize * 0.72)
  const radiusY = Math.max(78, islandSize * 0.42)
  const baseY = origin.y + islandSize * 0.42
  const startAngle = visible.length === 1 ? 90 : 48
  const endAngle = visible.length === 1 ? 90 : 132
  const span = endAngle - startAngle

  return visible.map((incident, index) => {
    const t = visible.length === 1 ? 0.5 : index / (visible.length - 1)
    const angleDeg = startAngle + span * t
    const radians = (angleDeg * Math.PI) / 180
    const x = origin.x + Math.cos(radians) * radiusX
    const y = baseY + Math.sin(radians) * radiusY
    const controlY = origin.y + islandSize * 0.28
    const path = `M ${origin.x} ${origin.y + islandSize * 0.18} Q ${origin.x} ${controlY} ${x} ${y}`
    return { incident, x, y, path }
  })
}

function CoordinationSituationNodesView({
  incidents,
  origin,
  islandSize,
  stageSize,
  reducedMotion = false,
  onSelectSituation,
}: CoordinationSituationNodesProps) {
  const layouts = useMemo(
    () => buildSituationLayouts(incidents, origin, islandSize),
    [incidents, islandSize, origin],
  )
  const hiddenCount = Math.max(0, incidents.length - layouts.length)

  if (layouts.length === 0) return null

  return (
    <div
      className="coordination-situation-nodes"
      data-reduced-motion={reducedMotion}
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
        <span>Seleccione una situación</span>
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
            <span className="coordination-situation-node__orb" aria-hidden="true">
              <i />
              <b>{Math.round(incident.riskScore)}</b>
            </span>
            <span className="coordination-situation-node__copy">
              <strong title={incident.title}>{incident.title}</strong>
              <small>
                {riskLabel} · {statusLabel}
              </small>
              <em>Seleccionar situación</em>
            </span>
          </button>
        )
      })}
    </div>
  )
}

export const CoordinationSituationNodes = memo(CoordinationSituationNodesView)
