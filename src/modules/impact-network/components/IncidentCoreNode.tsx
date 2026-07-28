import { memo, type CSSProperties } from 'react'
import {
  Handle,
  Position,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import type { ImpactNodeRisk } from './AreaMicrostructureNode'

export type IncidentExpansionState =
  | 'active'
  | 'contained'
  | 'recovering'
  | 'resolved'
  | 'closed'

export type IncidentCoreNodeData = {
  eventId: string
  title: string
  riskScore?: number
  riskLevel?: Exclude<ImpactNodeRisk, 'normal'> | null
  detectedAtLabel?: string
  expansionState?: IncidentExpansionState
  affectedAreaCount?: number
  focused?: boolean
  dimmed?: boolean
  compact?: boolean
  intensity?: number
  onActivate?: (eventId: string) => void
}

export type IncidentCoreFlowNode = Node<
  IncidentCoreNodeData,
  'impact-incident'
>

const EXPANSION_LABELS: Record<IncidentExpansionState, string> = {
  active: 'Expansión activa',
  contained: 'Expansión contenida',
  recovering: 'En recuperación',
  resolved: 'Resuelta',
  closed: 'Resuelta',
}

function normalizeScore(score: number | undefined): number {
  if (score === undefined || Number.isNaN(score)) return 0
  return Math.round(Math.min(100, Math.max(0, score)))
}

function IncidentCoreNodeView({
  data,
  selected,
  sourcePosition = Position.Bottom,
}: NodeProps<IncidentCoreFlowNode>) {
  const riskLevel = data.riskLevel ?? 'moderate'
  const riskScore = normalizeScore(data.riskScore)
  const expansionState = data.expansionState ?? 'active'
  const isFocused = Boolean(data.focused || selected)
  const intensity = Math.min(1, Math.max(0, data.intensity ?? riskScore / 100))
  const className = [
    'impact-incident-node',
    `impact-incident-node--${riskLevel}`,
    `impact-incident-node--${expansionState}`,
    isFocused ? 'impact-incident-node--focused' : '',
    data.dimmed ? 'impact-incident-node--dimmed' : '',
    data.compact ? 'impact-incident-node--compact' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const style = {
    '--impact-intensity': intensity,
    '--impact-risk-score': riskScore,
  } as CSSProperties
  const affectedLabel = `${data.affectedAreaCount ?? 0} ${
    data.affectedAreaCount === 1 ? 'área afectada' : 'áreas afectadas'
  }`

  return (
    <>
      <button
        type="button"
        className={`${className} nodrag nopan`}
        style={style}
        aria-label={`${data.title}, riesgo ${riskScore} de 100, ${EXPANSION_LABELS[expansionState]}, ${affectedLabel}`}
        aria-pressed={isFocused}
        data-event-id={data.eventId}
        data-risk={riskLevel}
        data-expansion={expansionState}
        onClick={
          data.onActivate
            ? (event) => {
                event.stopPropagation()
                data.onActivate?.(data.eventId)
              }
            : undefined
        }
      >
        <span className="impact-incident-node__field" aria-hidden="true" />
        <span
          className="impact-incident-node__orbit impact-incident-node__orbit--outer"
          aria-hidden="true"
        >
          <span />
          <span />
          <span />
        </span>
        <span
          className="impact-incident-node__orbit impact-incident-node__orbit--inner"
          aria-hidden="true"
        >
          <span />
          <span />
        </span>
        <span className="impact-incident-node__reactor" aria-hidden="true">
          <span className="impact-incident-node__reactor-core" />
          <span className="impact-incident-node__reactor-scan" />
        </span>
        <span className="impact-incident-node__telemetry" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </span>

        <span className="impact-incident-node__content">
          <span className="impact-incident-node__eyebrow">
            Incidente operacional
          </span>
          <strong className="impact-incident-node__title">{data.title}</strong>
          <span className="impact-incident-node__risk">
            <span>Riesgo</span>
            <b>{riskScore}</b>
          </span>
          <span className="impact-incident-node__meta">
            {data.detectedAtLabel ? <time>{data.detectedAtLabel}</time> : null}
            <span>{EXPANSION_LABELS[expansionState]}</span>
          </span>
        </span>
      </button>

      <Handle
        id="impact-source"
        type="source"
        position={sourcePosition}
        isConnectable={false}
        className="impact-node__handle"
        aria-hidden="true"
        style={{
          width: 1,
          height: 1,
          border: 0,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
    </>
  )
}

export const IncidentCoreNode = memo(IncidentCoreNodeView)
IncidentCoreNode.displayName = 'IncidentCoreNode'
