import type {
  DashboardMetrics,
  OperationalEvent,
} from '@/modules/operational-events/types/operational-event.types'
import { NovexIcon, type NovexIconName } from '@/shared/components/NovexIcon'

interface OperationalSummaryBarProps {
  events: OperationalEvent[]
  metrics: DashboardMetrics
  topPriority: OperationalEvent | null
}

const TREND_LABEL: Record<DashboardMetrics['trend'], string> = {
  improving: 'Mejorando',
  stable: 'Estable',
  deteriorating: 'En deterioro',
  insufficient_data: 'Por confirmar',
}

function isResolvedToday(event: OperationalEvent, todayKey: string): boolean {
  if (event.status !== 'resolved') return false
  const stamp = event.lastUpdateAt ?? event.createdAt
  const day = new Date(stamp)
  if (Number.isNaN(day.getTime())) return false
  return day.toISOString().slice(0, 10) === todayKey
}

export function OperationalSummaryBar({
  events,
  metrics,
  topPriority,
}: OperationalSummaryBarProps) {
  const todayKey = new Date().toISOString().slice(0, 10)
  const resolvedToday = events.filter((event) =>
    isResolvedToday(event, todayKey),
  ).length

  const cards: Array<{
    icon: NovexIconName
    tone: string
    value: string | number
    label: string
    detail: string
  }> = [
    {
      icon: 'alert',
      tone: 'critical',
      value: topPriority?.interpretation?.riskScore ?? metrics.criticalCount,
      label: topPriority?.title ?? 'Sin prioridad crítica',
      detail: 'Situación más crítica',
    },
    {
      icon: 'activity',
      tone: 'tracking',
      value: metrics.monitoringCount,
      label: 'En seguimiento',
      detail: 'Situaciones activas',
    },
    {
      icon: 'check',
      tone: 'resolved',
      value: resolvedToday,
      label: 'Resueltas hoy',
      detail: 'Situaciones cerradas',
    },
    {
      icon: 'arrow-up-right',
      tone: 'trend',
      value: metrics.trend === 'deteriorating' ? '↓' : metrics.trend === 'improving' ? '↑' : '—',
      label: 'Tendencia',
      detail: TREND_LABEL[metrics.trend],
    },
  ]

  return (
    <section className="novex-summary-bar" aria-label="Resumen operacional">
      {cards.map((card) => (
        <article
          className="novex-summary-bar__item"
          data-tone={card.tone}
          key={card.label}
        >
          <span className="novex-summary-bar__icon" aria-hidden="true">
            <NovexIcon name={card.icon} size={17} strokeWidth={1.45} />
          </span>
          <div className="novex-summary-bar__content">
            <strong>{card.value}</strong>
            <span className="novex-summary-bar__label">{card.label}</span>
            <small>{card.detail}</small>
          </div>
        </article>
      ))}
    </section>
  )
}
