import {
  operationalOverview,
  type OperationalOverviewMetrics,
} from '@/modules/impact-network/data/executive-operational-overview.mock'
import { NovexIcon } from '@/shared/components/NovexIcon'

interface OperationalMetricsStripProps {
  metrics?: OperationalOverviewMetrics
}

export function OperationalMetricsStrip({
  metrics = operationalOverview,
}: OperationalMetricsStripProps) {
  const items = [
    {
      key: 'attention',
      eyebrow: 'Requieren atención',
      label: 'Coordinaciones afectadas',
      value: String(metrics.affected),
      tone: 'critical' as const,
      icon: 'alert' as const,
    },
    {
      key: 'coordinations',
      eyebrow: 'Coordinaciones',
      label: 'En la operación',
      value: String(metrics.coordinations),
      tone: 'amber' as const,
      icon: 'building' as const,
    },
    {
      key: 'situations',
      eyebrow: 'Situaciones activas',
      label: 'Requieren seguimiento',
      value: String(metrics.openSituations),
      tone: 'violet' as const,
      icon: 'target' as const,
    },
    {
      key: 'risk',
      eyebrow: 'Riesgo operacional',
      label: 'Nivel general',
      value: `${metrics.operationalRisk}/${metrics.operationalRiskMax}`,
      tone: 'green' as const,
      icon: 'shield' as const,
    },
  ]

  return (
    <section className="impact-executive__metrics" aria-label="Resumen ejecutivo">
      {items.map((item) => (
        <article
          key={item.key}
          className="impact-executive__metric"
          data-tone={item.tone}
          data-metric={item.key}
        >
          <span className="impact-executive__metric-icon" aria-hidden="true">
            {item.icon === 'building' ? (
              <svg viewBox="0 0 24 24">
                <path d="M4 21V8l8-4v17M12 10h8v11M2 21h20M7 10v2M7 15v2M10 9v2M10 14v2M15 13v2M18 13v2M15 17v2M18 17v2" />
              </svg>
            ) : item.icon === 'target' ? (
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8" />
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
            ) : (
              <NovexIcon name={item.icon} size={20} strokeWidth={1.65} />
            )}
          </span>
          <span className="impact-executive__metric-copy">
            <span className="impact-executive__metric-eyebrow">{item.eyebrow}</span>
            <strong className="impact-executive__metric-value">{item.value}</strong>
            <span className="impact-executive__metric-label">{item.label}</span>
          </span>
          {item.key === 'risk' ? (
            <svg
              className="impact-executive__metric-trend"
              viewBox="0 0 150 42"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="executive-risk-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="currentColor" stopOpacity=".22" />
                  <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path className="impact-executive__metric-trend-area" d="M1 39 13 34 25 35 37 28 49 30 61 24 73 27 85 18 97 20 109 13 121 18 133 11 149 4 149 42 1 42Z" />
              <path d="M1 39 13 34 25 35 37 28 49 30 61 24 73 27 85 18 97 20 109 13 121 18 133 11 149 4" />
              <circle cx="149" cy="4" r="2.2" />
            </svg>
          ) : null}
        </article>
      ))}
    </section>
  )
}
