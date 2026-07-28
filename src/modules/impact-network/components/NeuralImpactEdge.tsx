import { memo, type CSSProperties } from 'react'
import {
  BaseEdge,
  getBezierPath,
  type Edge,
  type EdgeProps,
} from '@xyflow/react'

export type NeuralImpactEdgeVariant = 'base' | 'real' | 'actual' | 'predicted'

export type NeuralImpactEdgeData = {
  variant?: NeuralImpactEdgeVariant
  active?: boolean
  dimmed?: boolean
  highTraffic?: boolean
  intensity?: number
  incidentCount?: number
  particleCount?: number
  durationSeconds?: number
  reducedMotion?: boolean
  curvature?: number
  accessibleLabel?: string
}

export type NeuralImpactFlowEdge = Edge<
  NeuralImpactEdgeData,
  'neural-impact'
>

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function NeuralImpactEdgeView({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
}: EdgeProps<NeuralImpactFlowEdge>) {
  const variant = data?.variant === 'actual' ? 'real' : (data?.variant ?? 'base')
  const intensity = clamp(data?.intensity ?? 0, 0, 1)
  const incidentCount = Math.max(0, data?.incidentCount ?? 0)
  const isActive = Boolean(data?.active || variant !== 'base')
  const particleCount = data?.reducedMotion
    ? 0
    : clamp(
        Math.round(
          data?.particleCount ??
            (isActive ? Math.max(1, Math.min(3, incidentCount)) : 0),
        ),
        0,
        3,
      )
  const strokeWidth =
    variant === 'base' ? 1.2 + intensity * 0.6 : 1.8 + intensity * 2.7
  const duration = clamp(data?.durationSeconds ?? 2.8 - intensity, 1, 8)
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: data?.curvature ?? 0.32,
  })
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_')
  const motionPathId = `impact-motion-path-${safeId}`
  const className = [
    'impact-edge',
    `impact-edge--${variant}`,
    isActive ? 'impact-edge--active' : '',
    data?.dimmed ? 'impact-edge--dimmed' : '',
    data?.highTraffic ? 'impact-edge--high-traffic' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const edgeStyle = {
    ...style,
    stroke:
      style?.stroke ??
      (variant === 'predicted'
        ? 'var(--impact-edge-predicted, #f5a524)'
        : variant === 'real'
          ? 'var(--impact-edge-real, #63d8ff)'
          : 'var(--impact-edge-base, #21658a)'),
    strokeWidth,
    strokeDasharray:
      variant === 'predicted' ? '9 12' : style?.strokeDasharray,
    '--impact-edge-intensity': intensity,
    '--impact-edge-width': strokeWidth,
  } as CSSProperties
  const accessibleLabel =
    data?.accessibleLabel ??
    `${
      variant === 'predicted'
        ? 'Propagación potencial'
        : variant === 'real'
          ? 'Propagación confirmada'
          : 'Dependencia operacional'
    }${incidentCount > 0 ? `, ${incidentCount} incidentes` : ''}`

  return (
    <g
      className={className}
      data-edge-variant={variant}
      data-edge-intensity={intensity.toFixed(2)}
      data-incident-count={incidentCount}
      role="img"
      aria-label={accessibleLabel}
    >
      <title>{accessibleLabel}</title>
      <path
        id={motionPathId}
        d={edgePath}
        className="impact-edge__motion-path"
        fill="none"
        stroke="transparent"
        strokeWidth="1"
        pointerEvents="none"
        aria-hidden="true"
      />
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        className="impact-edge__path"
        style={edgeStyle}
      />
      {isActive ? (
        <path
          d={edgePath}
          className="impact-edge__energy"
          fill="none"
          aria-hidden="true"
        />
      ) : null}
      {Array.from({ length: particleCount }, (_, index) => (
        <circle
          key={`${id}-particle-${index}`}
          className="impact-edge__particle"
          r={variant === 'predicted' ? 2.2 : 2.6}
          aria-hidden="true"
        >
          <animateMotion
            dur={`${duration}s`}
            begin={`${(-duration * index) / Math.max(1, particleCount)}s`}
            repeatCount="indefinite"
            rotate="auto"
          >
            <mpath href={`#${motionPathId}`} />
          </animateMotion>
        </circle>
      ))}
    </g>
  )
}

export const NeuralImpactEdge = memo(NeuralImpactEdgeView)
NeuralImpactEdge.displayName = 'NeuralImpactEdge'
