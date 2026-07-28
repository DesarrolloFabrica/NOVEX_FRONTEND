import type { ExecutiveDashboardData } from '@/modules/api/types/dashboard.types'
import { Link } from 'react-router-dom'
import { CunmarkIcon, type CunmarkIconName } from '@/shared/components/CunmarkIcon'

interface ExecutiveInsightsProps {
  data: ExecutiveDashboardData
}

export function ExecutiveInsights({ data }: ExecutiveInsightsProps) {
  const { kpis } = data
  const top = data.prioritySituations[0]

  const insights: Array<{
    icon: CunmarkIconName
    tone: string
    title: string
    copy: string
    action: string
    href: string
  }> = [
    {
      icon: 'alert',
      tone: 'critical',
      title: `${kpis.criticalSituations} prioridad${kpis.criticalSituations === 1 ? '' : 'es'} críticas`,
      copy:
        kpis.criticalSituations > 0
          ? 'Requieren una decisión operativa antes de continuar.'
          : 'No hay situaciones críticas en este momento.',
      action: 'Abrir cola',
      href: '/situaciones',
    },
    {
      icon: 'activity',
      tone: 'trend',
      title: `${kpis.openSituations} situación${kpis.openSituations === 1 ? '' : 'es'} abierta${kpis.openSituations === 1 ? '' : 's'}`,
      copy: top
        ? `La mayor urgencia está en ${top.coordinationName}.`
        : 'No hay concentración dominante en este momento.',
      action: 'Ver situaciones',
      href: '/situaciones',
    },
    {
      icon: 'sparkles',
      tone: 'copilot',
      title: `${kpis.pendingRecommendations} recomendación${kpis.pendingRecommendations === 1 ? '' : 'es'} pendiente${kpis.pendingRecommendations === 1 ? '' : 's'}`,
      copy: 'Acciones sugeridas por la IA que aún requieren seguimiento.',
      action: 'Registrar contexto',
      href: '/situaciones/nueva',
    },
  ]

  return (
    <section className="cunmark-insight-grid" aria-label="Insights operativos">
      {insights.map((insight) => (
        <article className="cunmark-insight-card" data-tone={insight.tone} key={insight.title}>
          <div className="cunmark-insight-card__icon">
            <CunmarkIcon name={insight.icon} size={17} />
          </div>
          <div className="cunmark-insight-card__body">
            <p className="cunmark-insight-card__title">{insight.title}</p>
            <p className="cunmark-insight-card__copy">{insight.copy}</p>
            <Link
              to={insight.href}
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
