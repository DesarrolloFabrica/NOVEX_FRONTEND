import type { ReactNode } from 'react'
import type {
  ActionPriority,
  CertaintyLevel,
  ExecutivePriorityLevel,
  ExecutiveUrgency,
  RiskLevel,
} from '@/modules/operational-events/types/operational-event.types'

export const EXEC_PRIORITY_LABEL: Record<ActionPriority, string> = {
  immediate: 'Inmediata',
  high: 'Alta',
  medium: 'Media',
  scheduled: 'Programada',
}

export const EXEC_PRIORITY_LEVEL_LABEL: Record<ExecutivePriorityLevel, string> = {
  CRITICA: 'Crítica',
  ALTA: 'Alta',
  MEDIA: 'Media',
  BAJA: 'Baja',
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
    <section className="novex-sit-section">
      <header className="novex-sit-section__head">
        <span className="novex-sit-section__num" aria-hidden="true">
          {String(number).padStart(2, '0')}
        </span>
        <div className="min-w-0">
          <h3 className="novex-sit-section__title">{question}</h3>
          {hint ? <p className="novex-sit-section__hint">{hint}</p> : null}
        </div>
      </header>
      <div className="novex-sit-section__body">{children}</div>
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
      className="novex-sit-ring"
      aria-label={`Nivel de certeza ${percentage}% (${EXEC_CERTAINTY_LABEL[level]})`}
    >
      <svg viewBox="0 0 88 88" aria-hidden="true">
        <circle className="novex-sit-ring__track" cx="44" cy="44" r={radius} />
        <circle
          className="novex-sit-ring__value"
          cx="44"
          cy="44"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="novex-sit-ring__label">
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
