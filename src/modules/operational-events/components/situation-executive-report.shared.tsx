import type { ReactNode } from 'react'
import type {
  ActionPriority,
  CertaintyLevel,
  ExecutiveUrgency,
  RiskLevel,
} from '@/modules/operational-events/types/operational-event.types'

export const EXEC_PRIORITY_LABEL: Record<ActionPriority, string> = {
  immediate: 'Inmediata',
  high: 'Alta',
  medium: 'Media',
  scheduled: 'Programada',
}

export const EXEC_URGENCY_LABEL: Record<ExecutiveUrgency, string> = {
  immediate: 'Inmediata',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

export const EXEC_CERTAINTY_LABEL: Record<CertaintyLevel, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

export function ExecutiveSection({
  number,
  question,
  hint,
  children,
}: {
  number: number
  question: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="cunmark-sit-section">
      <header className="cunmark-sit-section__head">
        <span className="cunmark-sit-section__num" aria-hidden="true">
          {String(number).padStart(2, '0')}
        </span>
        <div className="min-w-0">
          <h3 className="cunmark-sit-section__title">{question}</h3>
          {hint ? <p className="cunmark-sit-section__hint">{hint}</p> : null}
        </div>
      </header>
      <div className="cunmark-sit-section__body">{children}</div>
    </section>
  )
}

export function CertaintyRing({
  percentage,
  level,
}: {
  percentage: number
  level: CertaintyLevel
}) {
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(1, Math.max(0, percentage / 100)))

  return (
    <div
      className="cunmark-sit-ring"
      aria-label={`Nivel de certeza ${percentage}% (${EXEC_CERTAINTY_LABEL[level]})`}
    >
      <svg viewBox="0 0 88 88" aria-hidden="true">
        <circle className="cunmark-sit-ring__track" cx="44" cy="44" r={radius} />
        <circle
          className="cunmark-sit-ring__value"
          cx="44"
          cy="44"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="cunmark-sit-ring__label">
        <strong>{percentage}%</strong>
        <span>Certeza</span>
      </div>
    </div>
  )
}

export function riskFromEvent(
  riskLevel: RiskLevel | undefined,
  fallback: RiskLevel = 'moderate',
): RiskLevel {
  return riskLevel ?? fallback
}
