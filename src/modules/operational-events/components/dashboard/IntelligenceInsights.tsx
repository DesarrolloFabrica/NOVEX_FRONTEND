import { Link } from 'react-router-dom'
import type { DashboardMetrics } from '@/modules/operational-events/types/operational-event.types'
import { CunmarkIcon, type CunmarkIconName } from '@/shared/components/CunmarkIcon'

interface IntelligenceInsightsProps {
  metrics: DashboardMetrics
}

const TREND_LABEL: Record<DashboardMetrics['trend'], string> = {
  improving: 'Tendencia favorable',
  stable: 'Tendencia estable',
  deteriorating: 'Tendencia de deterioro',
  insufficient_data: 'Tendencia por confirmar',
}

export function IntelligenceInsights({ metrics }: IntelligenceInsightsProps) {
  const insights: Array<{
    icon: CunmarkIconName
    tone: string
    title: string
    copy: string
    action: string
  }> = [
    {
      icon: 'alert',
      tone: 'critical',
      title: `${metrics.criticalCount} prioridad${metrics.criticalCount === 1 ? '' : 'es'} críticas`,
      copy: 'Requieren una decisión operativa antes de continuar.',
      action: 'Abrir cola',
    },
    {
      icon: 'activity',
      tone: 'trend',
      title: `Riesgo ${metrics.operationalRiskLevel === 'critical' ? 'crítico' : metrics.operationalRiskLevel === 'high' ? 'alto' : 'controlado'}`,
      copy: metrics.dominantAreaName
        ? `La mayor concentración está en ${metrics.dominantAreaName}.`
        : 'La fotografía aún no tiene concentración dominante.',
      action: 'Ver situaciones',
    },
    {
      icon: 'sparkles',
      tone: 'copilot',
      title: TREND_LABEL[metrics.trend],
      copy: 'La lectura consolidada orienta el siguiente movimiento.',
      action: 'Registrar contexto',
    },
  ]

  return (
    <section className="cunmark-insight-grid" aria-label="Insights operativos">
      {insights.map((insight, index) => (
        <article className="cunmark-insight-card" data-tone={insight.tone} key={insight.title}>
          <div className="cunmark-insight-card__icon"><CunmarkIcon name={insight.icon} size={17} /></div>
          <div className="cunmark-insight-card__body">
            <p className="cunmark-insight-card__title">{insight.title}</p>
            <p className="cunmark-insight-card__copy">{insight.copy}</p>
            <Link
              to={index === 2 ? '/situaciones/nueva' : '/situaciones'}
              viewTransition
              className="cunmark-insight-card__action"
            >
              {insight.action}
              <CunmarkIcon name="arrow-up-right" size={13} />
            </Link>
          </div>
        </article>
      ))}
    </section>
  )
}
