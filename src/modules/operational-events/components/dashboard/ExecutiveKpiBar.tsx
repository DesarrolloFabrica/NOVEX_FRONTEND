import type { ExecutiveDashboardKpis } from '@/modules/api/types/dashboard.types'
import type { PrioritySituationCard } from '@/modules/api/types/dashboard.types'
import { CunmarkIcon, type CunmarkIconName } from '@/shared/components/CunmarkIcon'

interface ExecutiveKpiBarProps {
  kpis: ExecutiveDashboardKpis
  topPriority: PrioritySituationCard | null
}

function formatConfidence(value: number | null): string {
  if (value === null) return '—'
  return `${Math.round(value * 100)}%`
}

function formatMinutes(value: number | null): string {
  if (value === null) return '—'
  if (value < 60) return `${value} min`
  const hours = Math.round(value / 60)
  return `${hours} h`
}

export function ExecutiveKpiBar({ kpis, topPriority }: ExecutiveKpiBarProps) {
  const cards: Array<{
    icon: CunmarkIconName
    tone: string
    value: string | number
    label: string
    detail: string
  }> = [
    {
      icon: 'alert',
      tone: 'critical',
      value: topPriority?.riskScore ?? kpis.criticalSituations,
      label: topPriority?.title ?? 'Sin prioridad crítica',
      detail: 'Situación más crítica',
    },
    {
      icon: 'activity',
      tone: 'tracking',
      value: kpis.openSituations,
      label: 'Abiertas',
      detail: 'Situaciones activas',
    },
    {
      icon: 'check',
      tone: 'resolved',
      value: kpis.resolvedSituations,
      label: 'Resueltas',
      detail: 'Situaciones cerradas',
    },
    {
      icon: 'clock',
      tone: 'trend',
      value: formatMinutes(kpis.averageAttentionMinutes),
      label: 'Atención promedio',
      detail: 'Tiempo hasta cierre',
    },
    {
      icon: 'file',
      tone: 'tracking',
      value: kpis.pendingRecommendations,
      label: 'Recomendaciones pendientes',
      detail: 'Acciones por ejecutar',
    },
    {
      icon: 'check',
      tone: 'resolved',
      value: kpis.completedRecommendations,
      label: 'Recomendaciones completadas',
      detail: 'Acciones ejecutadas',
    },
    {
      icon: 'grid',
      tone: 'trend',
      value: kpis.affectedCoordinations,
      label: 'Coordinaciones afectadas',
      detail: 'Impacto institucional',
    },
    {
      icon: 'sparkles',
      tone: 'copilot',
      value: formatConfidence(kpis.averageAiConfidence),
      label: 'Confianza IA',
      detail: 'Promedio de análisis',
    },
  ]

  return (
    <section
      className="cunmark-summary-bar cunmark-summary-bar--executive"
      aria-label="Indicadores ejecutivos"
    >
      {cards.map((card) => (
        <article
          className="cunmark-summary-bar__item"
          data-tone={card.tone}
          key={card.detail}
        >
          <span className="cunmark-summary-bar__icon" aria-hidden="true">
            <CunmarkIcon name={card.icon} size={17} strokeWidth={1.45} />
          </span>
          <div className="cunmark-summary-bar__content">
            <strong>{card.value}</strong>
            <span className="cunmark-summary-bar__label">{card.label}</span>
            <small>{card.detail}</small>
          </div>
        </article>
      ))}
    </section>
  )
}
