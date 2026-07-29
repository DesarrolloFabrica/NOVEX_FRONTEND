import type { ExecutiveDashboardData } from '@/modules/api/types/dashboard.types'
import { Link } from 'react-router-dom'
import { NovexIcon, type NovexIconName } from '@/shared/components/NovexIcon'

interface ExecutiveInsightsProps {
  data: ExecutiveDashboardData
}

export function ExecutiveInsights({ data }: ExecutiveInsightsProps) {
  const { kpis } = data
  const top = data.prioritySituations[0]

  const insights: Array<{
    icon: NovexIconName
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
    <section className="novex-insight-grid" aria-label="Insights operativos">
      {insights.map((insight) => (
        <article className="novex-insight-card" data-tone={insight.tone} key={insight.title}>
          <div className="novex-insight-card__icon">
            <NovexIcon name={insight.icon} size={17} />
          </div>
          <div className="novex-insight-card__body">
            <p className="novex-insight-card__title">{insight.title}</p>
            <p className="novex-insight-card__copy">{insight.copy}</p>
            <Link
              to={insight.href}
              viewTransition
              className="novex-insight-card__action"
            >
              {insight.action}
              <NovexIcon name="arrow-up-right" size={13} />
            </Link>
          </div>
        </article>
      ))}
    </section>
  )
}
