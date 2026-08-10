import type {
  SituationRegistryIndicators,
  SituationRegistrySummary,
} from '@/modules/api/types/situation-registry.types'
import {
  NovexIcon,
  type NovexIconName,
} from '@/shared/components/NovexIcon'

interface SituationRegistrySummaryBarProps {
  summary: SituationRegistrySummary
  indicators: SituationRegistryIndicators
}

function formatConfidence(value: number | null): string {
  if (value === null) return '—'
  return `${Math.round(value * 100)}%`
}

export function SituationRegistrySummaryBar({
  summary,
  indicators,
}: SituationRegistrySummaryBarProps) {
  const items: Array<{
    label: string
    value: string | number
    detail: string
    icon: NovexIconName
    tone: 'open' | 'resolved' | 'ai' | 'recommendations'
    badge?: string
  }> = [
    {
      label: 'En curso',
      value: summary.openSituations,
      detail:
        summary.criticalSituations === 1
          ? '1 situación crítica'
          : `${summary.criticalSituations} situaciones críticas`,
      icon: 'activity',
      tone: 'open',
    },
    {
      label: 'Cerradas',
      value: summary.closedSituations,
      detail: 'Situaciones cerradas',
      icon: 'check',
      tone: 'resolved',
    },
    {
      label: 'Análisis IA',
      value: indicators.withAnalysis,
      detail: `${indicators.withoutAnalysis} pendientes · ${indicators.reanalyzed} reanalizadas`,
      icon: 'sparkles',
      tone: 'ai',
      badge:
        summary.averageAiConfidence === null
          ? undefined
          : `${formatConfidence(summary.averageAiConfidence)} confianza`,
    },
    {
      label: 'Recomendaciones',
      value: summary.pendingRecommendations,
      detail: `${indicators.withPendingRecommendations} situaciones requieren atención`,
      icon: 'file',
      tone: 'recommendations',
    },
  ]

  return (
    <section
      className="novex-execution-summary"
      aria-label="Resumen del registro"
    >
      {items.map((item) => (
        <article
          key={item.label}
          className="novex-execution-summary__item"
          data-tone={item.tone}
        >
          <span className="novex-execution-summary__icon" aria-hidden="true">
            <NovexIcon name={item.icon} size={17} />
          </span>
          <span className="novex-execution-summary__content">
            <span className="novex-execution-summary__label">{item.label}</span>
            <span className="novex-execution-summary__value-row">
              <strong>{item.value}</strong>
              {item.badge ? (
                <span className="novex-execution-summary__badge">
                  {item.badge}
                </span>
              ) : null}
            </span>
            <span className="novex-execution-summary__detail">
              {item.detail}
            </span>
          </span>
        </article>
      ))}
    </section>
  )
}
