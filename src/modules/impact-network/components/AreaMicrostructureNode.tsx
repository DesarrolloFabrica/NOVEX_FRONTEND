import { memo, type CSSProperties } from 'react'
import {
  Handle,
  Position,
  type Node,
  type NodeProps,
} from '@xyflow/react'

export type ImpactNodeRisk =
  | 'normal'
  | 'low'
  | 'moderate'
  | 'high'
  | 'critical'

export type AreaNodeRole =
  | 'idle'
  | 'origin'
  | 'affected'
  | 'potential'
  | 'unrelated'

export type AreaMicrostructureNodeData = {
  areaId: string
  name: string
  code?: string
  activeIncidentCount?: number
  incidentCount?: number
  sharedIncidentCount?: number
  riskLevel?: ImpactNodeRisk | null
  riskScore?: number
  role?: AreaNodeRole
  intensity?: number
  lastUpdateLabel?: string
  focused?: boolean
  dimmed?: boolean
  onActivate?: (areaId: string) => void
}

export type AreaMicrostructureFlowNode = Node<
  AreaMicrostructureNodeData,
  'impact-area'
>

const RISK_LABELS: Record<ImpactNodeRisk, string> = {
  normal: 'Normal',
  low: 'Bajo',
  moderate: 'Moderado',
  high: 'Alto',
  critical: 'Crítico',
}

function clampUnit(value: number | undefined): number {
  if (value === undefined || Number.isNaN(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function AreaMicrostructureNodeView({
  data,
  selected,
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
}: NodeProps<AreaMicrostructureFlowNode>) {
  const riskLevel = data.riskLevel ?? 'normal'
  const role = data.role ?? 'idle'
  const activeCount = data.activeIncidentCount ?? 0
  const incidentCount = data.incidentCount ?? activeCount
  const isFocused = Boolean(data.focused || selected)
  const intensity = clampUnit(data.intensity)
  const className = [
    'impact-area-node',
    `impact-area-node--${riskLevel}`,
    `impact-area-node--${role}`,
    isFocused ? 'impact-area-node--focused' : '',
    data.dimmed ? 'impact-area-node--dimmed' : '',
    (data.sharedIncidentCount ?? 0) > 1
      ? 'impact-area-node--convergent'
      : '',
  ]
    .filter(Boolean)
    .join(' ')
  const style = {
    '--impact-intensity': intensity,
    '--impact-risk-score': data.riskScore ?? 0,
  } as CSSProperties
  const situationLabel = `${activeCount} ${
    activeCount === 1 ? 'situación activa' : 'situaciones activas'
  }`
  const accessibleLabel = [
    data.name,
    situationLabel,
    `riesgo ${RISK_LABELS[riskLevel]}`,
    role === 'origin' ? 'área de origen' : '',
    role === 'potential' ? 'impacto potencial' : '',
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <>
      <Handle
        id="impact-target"
        type="target"
        position={targetPosition}
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

      <button
        type="button"
        className={`${className} nodrag nopan`}
        style={style}
        aria-label={accessibleLabel}
        aria-pressed={isFocused}
        data-area-id={data.areaId}
        data-risk={riskLevel}
        data-role={role}
        data-active-incidents={activeCount}
        data-incident-count={incidentCount}
        onClick={
          data.onActivate
            ? (event) => {
                event.stopPropagation()
                data.onActivate?.(data.areaId)
              }
            : undefined
        }
      >
        <span className="impact-area-node__aura" aria-hidden="true" />
        <span className="impact-area-node__shockwave" aria-hidden="true" />

        <span className="impact-area-node__beacon" aria-hidden="true">
          <span className="impact-area-node__beacon-cap" />
          <span className="impact-area-node__beacon-signal" />
        </span>

        <span className="impact-area-node__satellites" aria-hidden="true">
          <span className="impact-area-node__satellite impact-area-node__satellite--north" />
          <span className="impact-area-node__satellite impact-area-node__satellite--east" />
          <span className="impact-area-node__satellite impact-area-node__satellite--south" />
          <span className="impact-area-node__satellite impact-area-node__satellite--west" />
        </span>

        <span className="impact-area-node__chassis" aria-hidden="true">
          <span className="impact-area-node__rail impact-area-node__rail--top" />
          <span className="impact-area-node__rail impact-area-node__rail--right" />
          <span className="impact-area-node__rail impact-area-node__rail--bottom" />
          <span className="impact-area-node__rail impact-area-node__rail--left" />
          <span className="impact-area-node__circuit impact-area-node__circuit--a" />
          <span className="impact-area-node__circuit impact-area-node__circuit--b" />
          <span className="impact-area-node__server-core">
            <span className="impact-area-node__server-core-light" />
          </span>
          <span className="impact-area-node__port-bank">
            <span />
            <span />
            <span />
          </span>
        </span>

        <span className="impact-area-node__identity">
          {data.code ? (
            <span className="impact-area-node__code">{data.code}</span>
          ) : null}
          <strong className="impact-area-node__name">{data.name}</strong>
          <span className="impact-area-node__metrics">
            <span>{situationLabel}</span>
            <span className="impact-area-node__risk">
              Riesgo {RISK_LABELS[riskLevel]}
            </span>
          </span>
        </span>

        {(data.sharedIncidentCount ?? 0) > 1 ? (
          <span
            className="impact-area-node__convergence"
            aria-label={`${data.sharedIncidentCount} incidentes convergen en esta área`}
          >
            ×{data.sharedIncidentCount}
          </span>
        ) : null}

        {data.lastUpdateLabel ? (
          <span className="impact-area-node__last-update">
            {data.lastUpdateLabel}
          </span>
        ) : null}
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

export const AreaMicrostructureNode = memo(AreaMicrostructureNodeView)
AreaMicrostructureNode.displayName = 'AreaMicrostructureNode'
