import { memo } from 'react'
import { buildCubicEdgePath } from '@/modules/impact-network/engine/radial-layout'
import type { RiskLevel } from '@/modules/operational-events/types/operational-event.types'

export type PropagationEdgeState = 'dormant' | 'active' | 'completed'

export interface PropagationEdgeProps {
  id: string
  path: string
  state: PropagationEdgeState
  riskLevel?: RiskLevel | null
  reducedMotion?: boolean
  order?: number
}

const PARTICLE_DURATIONS = ['1.8s', '2.4s', '3s'] as const

function PropagationEdgeView({
  id,
  path,
  state,
  riskLevel = null,
  reducedMotion = false,
  order = 0,
}: PropagationEdgeProps) {
  const risk = riskLevel ?? 'moderate'
  const pathId = `propagation-edge-path-${id}`
  const isFlowing = state === 'active' || state === 'completed'
  const particleCount = state === 'active' ? 4 : state === 'completed' ? 2 : 0

  return (
    <g
      className="propagation-edge"
      data-edge-id={id}
      data-state={state}
      data-risk={risk}
    >
      <defs>
        <path id={pathId} d={path} />
        <linearGradient
          id={`${pathId}-gradient`}
          gradientUnits="userSpaceOnUse"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor="rgb(var(--edge-flow-rgb) / 0.12)" />
          <stop offset="45%" stopColor="rgb(var(--edge-flow-rgb) / 0.95)" />
          <stop offset="100%" stopColor="rgb(var(--edge-flow-rgb) / 0.28)" />
        </linearGradient>
      </defs>
      <path
        className="propagation-edge__track"
        d={path}
        pathLength={1}
        vectorEffect="non-scaling-stroke"
      />
      <path
        className="propagation-edge__glow"
        d={path}
        pathLength={1}
        vectorEffect="non-scaling-stroke"
      />
      {isFlowing ? (
        <path
          className="propagation-edge__flow"
          d={path}
          pathLength={1}
          vectorEffect="non-scaling-stroke"
          stroke={`url(#${pathId}-gradient)`}
        />
      ) : null}
      {!reducedMotion && isFlowing
        ? Array.from({ length: particleCount }, (_, index) => (
            <circle
              key={index}
              className="propagation-edge__particle"
              r={index === 0 ? 3.4 : 2.2}
              opacity={index === 0 ? 1 : 0.6}
              aria-hidden="true"
            >
              <animateMotion
                begin={`${index * 0.35 + order * 0.08}s`}
                dur={PARTICLE_DURATIONS[index % PARTICLE_DURATIONS.length]}
                repeatCount="indefinite"
                rotate="auto"
              >
                <mpath href={`#${pathId}`} />
              </animateMotion>
            </circle>
          ))
        : null}
    </g>
  )
}

export function buildPropagationEdgePath(
  source: { x: number; y: number },
  target: { x: number; y: number },
  curvature?: number,
): string {
  const sign = curvature && curvature < 0 ? -1 : 1
  return buildCubicEdgePath(source, target, Math.abs(curvature ?? 0.22) * sign)
}

export const PropagationEdge = memo(PropagationEdgeView)
