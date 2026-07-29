// Gauge técnico Novex — SVG nativo, animable, sin librerías externas.

import type { CSSProperties } from 'react'

export type RiskLevel = 'stable' | 'attention' | 'critical'

export type TechnicalRiskGaugeProps = {
  value: number
  level: RiskLevel
  label?: string
  size?: number
}

const LEVEL_ACCENT: Record<RiskLevel, string> = {
  stable: '#059669',
  attention: '#d97706',
  critical: '#dc2626',
}

const TRACK = '#cbd5e1'
const OUTER_RING = '#94a3b8'
const TICK = '#94a3b8'

/** Arco visible ~86 %; hueco inferior ~14 % */
const ARC_RATIO = 0.86
/** Rotación para centrar el hueco abajo */
const ROTATION_DEG = 117
const TICK_COUNT = 24

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)))
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

export function TechnicalRiskGauge({
  value,
  level,
  label = 'Riesgo',
  size = 108,
}: TechnicalRiskGaugeProps) {
  const percent = clampPercent(value)
  const accent = LEVEL_ACCENT[level]

  const stroke = Math.max(6, Math.round(size * 0.083))
  const cx = size / 2
  const cy = size / 2
  const r = (size - stroke) / 2 - 4
  const circumference = 2 * Math.PI * r
  const arcLength = circumference * ARC_RATIO
  const gapLength = circumference - arcLength
  const progress = (percent / 100) * arcLength

  const outerR = r + stroke / 2 + 3
  const tickInner = outerR + 1
  const tickOuterMajor = outerR + 5
  const tickOuterMinor = outerR + 3

  const ticks = Array.from({ length: TICK_COUNT }, (_, i) => {
    const t = i / TICK_COUNT
    if (t > ARC_RATIO) return null
    const angle = ROTATION_DEG + t * 360 * ARC_RATIO
    const major = i % 4 === 0
    const a = polar(cx, cy, tickInner, angle)
    const b = polar(cx, cy, major ? tickOuterMajor : tickOuterMinor, angle)
    return { i, a, b, major }
  }).filter(Boolean) as Array<{
    i: number
    a: { x: number; y: number }
    b: { x: number; y: number }
    major: boolean
  }>

  const endAngle = ROTATION_DEG + (percent / 100) * 360 * ARC_RATIO
  const tip = polar(cx, cy, r, endAngle)

  return (
    <div
      className="technical-risk-gauge relative mx-auto flex items-center justify-center"
      style={
        {
          '--trg-size': `${size}px`,
          '--trg-stroke': `${stroke}px`,
          '--trg-accent': accent,
          '--trg-value-size': `${Math.round(size * 0.2)}px`,
          width: 'var(--trg-size)',
          height: 'var(--trg-size)',
        } as CSSProperties
      }
      role="img"
      aria-label={`${label} ${percent} por ciento, nivel ${level}`}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="overflow-visible"
        aria-hidden="true"
      >
        <circle
          cx={cx}
          cy={cy}
          r={outerR}
          fill="none"
          stroke={OUTER_RING}
          strokeWidth={1}
          strokeOpacity={0.45}
          strokeDasharray={`${arcLength * 1.02} ${gapLength * 0.85}`}
          transform={`rotate(${ROTATION_DEG} ${cx} ${cy})`}
        />

        {ticks.map((tick) => (
          <line
            key={tick.i}
            x1={tick.a.x}
            y1={tick.a.y}
            x2={tick.b.x}
            y2={tick.b.y}
            stroke={TICK}
            strokeWidth={tick.major ? 1.25 : 0.75}
            strokeOpacity={tick.major ? 0.7 : 0.4}
            strokeLinecap="round"
          />
        ))}

        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={TRACK}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${gapLength}`}
          transform={`rotate(${ROTATION_DEG} ${cx} ${cy})`}
        />

        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          transform={`rotate(${ROTATION_DEG} ${cx} ${cy})`}
          className="transition-[stroke-dasharray,stroke] duration-[600ms] ease-out"
        />

        {percent > 0 && (
          <circle
            cx={tip.x}
            cy={tip.y}
            r={Math.max(2.5, stroke * 0.32)}
            fill={accent}
            className="transition-[cx,cy,fill] duration-[600ms] ease-out"
          />
        )}

        <circle
          cx={polar(cx, cy, outerR, ROTATION_DEG).x}
          cy={polar(cx, cy, outerR, ROTATION_DEG).y}
          r={1.5}
          fill={accent}
          fillOpacity={0.85}
        />
        <circle
          cx={polar(cx, cy, outerR, ROTATION_DEG + 360 * ARC_RATIO).x}
          cy={polar(cx, cy, outerR, ROTATION_DEG + 360 * ARC_RATIO).y}
          r={1.5}
          fill={accent}
          fillOpacity={0.85}
        />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p
          className="font-mono font-bold leading-none tracking-tight text-slate-800"
          style={{ fontSize: 'var(--trg-value-size, 1.35rem)' }}
        >
          {percent}
          <span className="ml-0.5 text-[0.55em] font-semibold text-slate-500">
            %
          </span>
        </p>
        <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          {label}
        </p>
      </div>
    </div>
  )
}

