import type { EocPlatformMetric } from '@/modules/executive-operations-center/types/executive-home.types'
import { ExecutiveHomeSection } from '@/modules/executive-operations-center/components/home/ExecutiveHomeSection'
import {
  getHealthLabel,
  severityClass,
} from '@/modules/executive-operations-center/utils/severityDisplay'

interface PlatformStatusSectionProps {
  metrics: EocPlatformMetric[]
}

export function PlatformStatusSection({ metrics }: PlatformStatusSectionProps) {
  return (
    <ExecutiveHomeSection
      id="eoc-platform"
      variant="compact"
      eyebrow="Estado actual"
      title="Indicadores clave"
      integrationNote="GET /intelligence/dashboard/metrics — KPIs agregados de situaciones activas, coordinaciones en alerta, análisis IA y tendencias comparativas."
    >
      <div className="eoc-platform__grid">
        {metrics.map((metric) => (
          <article
            key={metric.id}
            className="eoc-platform__metric"
            data-health={metric.health}
          >
            <span
              className={`eoc-platform__signal ${severityClass(metric.health)}`}
              aria-hidden="true"
            />
            <div className="eoc-platform__reading">
              <span className="eoc-platform__label">{metric.label}</span>
              <span className="eoc-platform__value">{metric.value}</span>
            </div>
            <div className="eoc-platform__context">
              <span
                className={`eoc-platform__health ${severityClass(metric.health)}`}
              >
                {getHealthLabel(metric.health)}
              </span>
              {metric.delta ? (
                <span
                  className={`eoc-platform__delta eoc-platform__delta--${metric.trend}`}
                >
                  {metric.delta}
                </span>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </ExecutiveHomeSection>
  )
}
