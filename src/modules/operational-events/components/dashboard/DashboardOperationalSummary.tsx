import type { ExecutiveDashboardData } from '@/modules/api/types/dashboard.types'

interface DashboardOperationalSummaryProps {
  data: ExecutiveDashboardData
}

export function DashboardOperationalSummary({
  data,
}: DashboardOperationalSummaryProps) {
  const { kpis } = data
  const totalRegistered = kpis.openSituations + kpis.resolvedSituations

  const stats = [
    {
      id: 'total',
      value: totalRegistered,
      label: 'Situaciones registradas',
      hint: 'Historial consolidado en la plataforma',
      tone: 'tracking',
    },
    {
      id: 'open',
      value: kpis.openSituations,
      label: 'En seguimiento',
      hint: 'Casos abiertos o en curso',
      tone: 'tracking',
    },
    {
      id: 'resolved',
      value: kpis.resolvedSituations,
      label: 'Cerradas',
      hint: 'Casos cerrados en el historial',
      tone: 'resolved',
    },
    {
      id: 'coordination',
      value: kpis.affectedCoordinations,
      label: 'Coordinaciones con registros',
      hint: 'Áreas con situaciones documentadas',
      tone: 'impact',
    },
  ] as const

  return (
    <section className="novex-dashboard-status" aria-label="Resumen operativo">
      <div className="novex-dashboard-status__grid">
        {stats.map((stat) => (
          <article
            key={stat.id}
            className="novex-dashboard-status__stat"
            data-tone={stat.tone}
          >
            <strong>{stat.value}</strong>
            <span className="novex-dashboard-status__stat-label">
              {stat.label}
            </span>
            <small>{stat.hint}</small>
          </article>
        ))}
      </div>
    </section>
  )
}
