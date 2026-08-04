import { Link } from 'react-router-dom'
import type { ExecutiveDashboardData } from '@/modules/api/types/dashboard.types'
import type { NovexRoleCode } from '@/modules/auth/utils/roleExperience'
import { AiIndicatorsPanel } from './AiIndicatorsPanel'
import { CoordinationImpactMap } from './CoordinationImpactMap'
import { DashboardOperationalSummary } from './DashboardOperationalSummary'
import { ExecutiveKpiBar } from './ExecutiveKpiBar'
import { IntelligenceExecutiveBrief } from './IntelligenceExecutiveBrief'
import { PrioritySituationsList } from './PrioritySituationsList'
import { RecentActivityFeed } from './RecentActivityFeed'
import { RegisterSituationCta } from '@/shared/components/RegisterSituationCta'
import { NovexIcon } from '@/shared/components/NovexIcon'

interface RoleDashboardExperienceProps {
  data: ExecutiveDashboardData
  role: NovexRoleCode
  previewing?: boolean
}

const ROLE_COPY: Record<
  NovexRoleCode,
  { label: string; title: string; copy: string }
> = {
  COORDINADOR: {
    label: 'Operación de coordinación',
    title: 'Su operación, en contexto',
    copy: 'Registre, consulte y acompañe el ciclo completo de las situaciones de su coordinación.',
  },
  ANALISTA: {
    label: 'Centro de monitoreo',
    title: 'Supervisión operacional global',
    copy: 'Prioridades, actividad e inteligencia de todas las coordinaciones en una sola vista.',
  },
  DIRECTOR: {
    label: 'Command Center ejecutivo',
    title: 'Estado operativo institucional',
    copy: 'Señales de riesgo, impacto y tendencia preparadas para decidir sin ruido operativo.',
  },
  ADMIN: {
    label: 'Soporte de plataforma',
    title: 'Vista operacional global',
    copy: 'Supervise el producto y cambie de perspectiva para asistir a cada rol.',
  },
}

export function RoleDashboardExperience({
  data,
  role,
  previewing = false,
}: RoleDashboardExperienceProps) {
  const copy = ROLE_COPY[role]

  if (role === 'COORDINADOR') {
    return (
      <div
        className="novex-intel-shell novex-intelligence-v2 novex-role-dashboard"
        data-role={role}
      >
        <RoleHero {...copy} previewing={previewing} />
        <section
          className="novex-intel-create"
          data-tour="dashboard-register"
          aria-labelledby="novex-intel-create-title"
        >
          <span className="novex-intel-create__icon" aria-hidden="true">
            <NovexIcon name="plus" size={17} />
          </span>
          <div className="novex-intel-create__copy">
            <div className="novex-intel-create__heading">
              <h2 id="novex-intel-create-title">Registrar nueva situación</h2>
            </div>
            <p>Capture un evento para iniciar su análisis y seguimiento.</p>
          </div>
          <RegisterSituationCta variant="footer" />
        </section>
        <div data-tour="dashboard-overview">
          <IntelligenceExecutiveBrief narrative={data.executiveNarrative} />
        </div>
        <DashboardOperationalSummary data={data} />
        <div className="novex-intel-board">
          <PrioritySituationsList situations={data.latestSituations} />
        </div>
      </div>
    )
  }

  return (
    <div className="novex-intel-shell novex-role-dashboard" data-role={role}>
      <RoleHero {...copy} previewing={previewing} />
      {role === 'ANALISTA' ? (
        <section
          className="novex-role-dashboard__analyst-action"
          data-tour="analyst-register"
        >
          <div>
            <NovexIcon name="activity" />
            <span>
              <strong>Captura y supervisión</strong>
              <small>
                Registre contexto nuevo sin abandonar la vista global.
              </small>
            </span>
          </div>
          <RegisterSituationCta variant="footer" />
        </section>
      ) : null}
      <div data-tour="executive-brief">
        <IntelligenceExecutiveBrief narrative={data.executiveNarrative} />
      </div>
      <div data-tour="executive-kpis">
        <ExecutiveKpiBar
          kpis={data.kpis}
          topPriority={data.prioritySituations[0] ?? null}
        />
      </div>
      <div className="novex-role-dashboard__grid">
        <div
          className="novex-role-dashboard__wide"
          data-tour="priority-situations"
        >
          <PrioritySituationsList
            situations={
              role === 'ANALISTA'
                ? data.latestSituations
                : data.prioritySituations
            }
            title={
              role === 'ANALISTA'
                ? 'Últimas situaciones'
                : 'Eventos críticos y prioritarios'
            }
            description={
              role === 'ANALISTA'
                ? 'Actividad reciente de todas las coordinaciones.'
                : 'Señales que requieren atención ejecutiva.'
            }
          />
        </div>
        <div data-tour="impact-summary">
          <CoordinationImpactMap entries={data.coordinationImpact} />
        </div>
        <div data-tour="recent-activity">
          <RecentActivityFeed activity={data.recentActivity} />
        </div>
        <div data-tour="ai-indicators">
          <AiIndicatorsPanel indicators={data.aiIndicators} />
        </div>
        <OperationalTrend data={data} />
      </div>
    </div>
  )
}

function RoleHero({
  label,
  title,
  copy,
  previewing,
}: {
  label: string
  title: string
  copy: string
  previewing: boolean
}) {
  return (
    <header className="novex-role-dashboard__hero" data-tour="role-dashboard">
      <div>
        <span className="novex-role-dashboard__kicker">
          <i />
          {label}
        </span>
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
      {previewing ? (
        <Link to="/admin" className="novex-role-dashboard__return">
          <NovexIcon name="chevron-left" />
          Volver a administración
        </Link>
      ) : (
        <span className="novex-role-dashboard__live">
          <i />
          Datos en vivo
        </span>
      )}
    </header>
  )
}

function OperationalTrend({ data }: { data: ExecutiveDashboardData }) {
  const total = Math.max(
    1,
    data.kpis.openSituations + data.kpis.resolvedSituations,
  )
  const series = [
    { label: 'Activas', value: data.kpis.openSituations, tone: 'active' },
    {
      label: 'Críticas',
      value: data.kpis.criticalSituations,
      tone: 'critical',
    },
    {
      label: 'Resueltas',
      value: data.kpis.resolvedSituations,
      tone: 'resolved',
    },
    {
      label: 'Pendientes IA',
      value: data.kpis.pendingRecommendations,
      tone: 'ai',
    },
  ]
  return (
    <section
      className="novex-role-dashboard__trend"
      data-tour="operational-trend"
      aria-labelledby="trend-title"
    >
      <div>
        <span>Tendencia consolidada</span>
        <h3 id="trend-title">Distribución operativa</h3>
      </div>
      <ul>
        {series.map((item) => (
          <li key={item.label} data-tone={item.tone}>
            <span>{item.label}</span>
            <div
              role="meter"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={item.value}
            >
              <i
                style={{
                  width: `${Math.min(100, (item.value / total) * 100)}%`,
                }}
              />
            </div>
            <strong>{item.value}</strong>
          </li>
        ))}
      </ul>
    </section>
  )
}
