// Donut de riesgo operativo — aro ~86 %, SVG nativo, animación suave al cambiar área.

import type { CSSProperties } from 'react'
import type { EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'

interface RiskDonutProps {
  percentage: number
  environment: EnvironmentStatus
}

/** Colores del sistema O.M.E.G.A. sobre cristal blanco */
const RISK_ACCENT: Record<EnvironmentStatus, string> = {
  pending: '#64748b',
  healthy: '#059669',
  attention: '#d97706',
  critical: '#dc2626',
}

const TRACK_COLOR = '#cbd5e1'

const SIZE = 108
const STROKE = 9
const CX = SIZE / 2
const CY = SIZE / 2
const R = (SIZE - STROKE) / 2 - 1
const CIRCUMFERENCE = 2 * Math.PI * R
/** Aro visible: 86 % del círculo; hueco inferior ~14 % */
const ARC_RATIO = 0.86
const ARC_LENGTH = CIRCUMFERENCE * ARC_RATIO
const GAP_LENGTH = CIRCUMFERENCE - ARC_LENGTH
/** Inicio del arco: hueco centrado en la parte inferior */
const ROTATION = 117

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}

export function RiskDonut({ percentage, environment }: RiskDonutProps) {
  const percent = clampPercent(percentage)
  const accent = RISK_ACCENT[environment]
  const progress = (percent / 100) * ARC_LENGTH

  return (
    <div
      className="risk-donut relative mx-auto flex items-center justify-center"
      style={
        {
          '--risk-donut-size': `${SIZE}px`,
          '--risk-donut-stroke': `${STROKE}px`,
          width: 'var(--risk-donut-size)',
          height: 'var(--risk-donut-size)',
        } as CSSProperties
      }
      role="img"
      aria-label={`Riesgo operativo ${percent} por ciento`}
    >
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-full w-full -rotate-0"
        aria-hidden="true"
      >
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke={TRACK_COLOR}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${ARC_LENGTH} ${GAP_LENGTH}`}
          transform={`rotate(${ROTATION} ${CX} ${CY})`}
        />
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke={accent}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${CIRCUMFERENCE}`}
          transform={`rotate(${ROTATION} ${CX} ${CY})`}
          className="transition-[stroke-dasharray,stroke] duration-[600ms] ease-out"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p
          className="risk-donut__value font-mono text-[1.35rem] font-bold leading-none tracking-tight text-slate-800"
          style={{ fontSize: 'var(--risk-donut-value-size, 1.35rem)' }}
        >
          {percent}%
        </p>
        <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          Riesgo
        </p>
      </div>
    </div>
  )
}
