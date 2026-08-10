import { Link } from 'react-router-dom'
import type { ExecutiveDashboardData } from '@/modules/api/types/dashboard.types'
import type { NovexRoleCode } from '@/modules/auth/utils/roleExperience'
import { DashboardOperationalSummary } from './DashboardOperationalSummary'
import { ExecutiveKpiBar } from './ExecutiveKpiBar'
import { PrioritySituationsList } from './PrioritySituationsList'
import { RegisterSituationCta } from '@/shared/components/RegisterSituationCta'
import { NovexIcon } from '@/shared/components/NovexIcon'

interface RoleDashboardExperienceProps {
  data: ExecutiveDashboardData
  role: NovexRoleCode
  previewing?: boolean
}

type RoleHeroCopy = {
  label: string
  title: string
  copy: string
  action?: { to: string; label: string }
}

function pluralSituations(count: number): string {
  return count === 1 ? '1 situación' : `${count} situaciones`
}

function buildRoleHeroCopy(
  role: NovexRoleCode,
  data: ExecutiveDashboardData,
): RoleHeroCopy {
  const { openSituations, criticalSituations, pendingRecommendations } =
    data.kpis
  const topPriority = data.prioritySituations[0] ?? data.latestSituations[0]

  switch (role) {
    case 'COORDINADOR': {
      const action = {
        to: '/gestion',
        label: 'Ir a Gestión de situaciones',
      }

      if (openSituations <= 0) {
        return {
          label: 'Qué hacer ahora',
          title: 'Sin situaciones pendientes por ahora',
          copy: 'Cuando registre un evento, use Gestión de situaciones para dar seguimiento hasta el cierre. También puede capturar una nueva desde este panel.',
          action,
        }
      }

      const criticalHint =
        criticalSituations > 0
          ? ` Priorice ${pluralSituations(criticalSituations)} críticas.`
          : ''

      return {
        label: 'Qué hacer ahora',
        title: `Tiene ${pluralSituations(openSituations)} pendientes de actualización`,
        copy: `Vaya a Gestión de situaciones, revise las que siguen en seguimiento y actualice estado, evidencias o notas.${criticalHint}`,
        action,
      }
    }
    case 'ANALISTA': {
      if (openSituations <= 0) {
        return {
          label: 'Qué monitorear',
          title: 'Sin alertas abiertas en este momento',
          copy: 'Revise la actividad reciente de todas las coordinaciones y registre contexto nuevo si aparece una señal.',
          action: {
            to: '/gestion',
            label: 'Abrir Gestión de situaciones',
          },
        }
      }

      return {
        label: 'Qué monitorear',
        title: `${pluralSituations(openSituations)} activas en la red`,
        copy:
          criticalSituations > 0
            ? `Hay ${pluralSituations(criticalSituations)} críticas. Priorice supervisión global y valide el seguimiento en Gestión de situaciones.`
            : 'Supervise la actividad de todas las coordinaciones y confirme que los casos abiertos tengan seguimiento actualizado.',
        action: {
          to: '/gestion',
          label: 'Abrir Gestión de situaciones',
        },
      }
    }
    case 'DIRECTOR': {
      if (criticalSituations > 0) {
        return {
          label: 'Señal ejecutiva',
          title: `${pluralSituations(criticalSituations)} críticas requieren atención`,
          copy: topPriority
            ? `Prioridad actual: «${topPriority.title}» (${topPriority.coordinationName}). Revise impacto y decida el siguiente paso.`
            : 'Revise impacto institucional y la distribución operativa antes de decidir.',
          action: {
            to: '/red-impacto',
            label: 'Ver red de impacto',
          },
        }
      }

      if (openSituations > 0) {
        return {
          label: 'Señal ejecutiva',
          title: `${pluralSituations(openSituations)} en seguimiento institucional`,
          copy:
            pendingRecommendations > 0
              ? `Hay ${pendingRecommendations} recomendaciones pendientes. Use esta vista para priorizar sin entrar al detalle operativo.`
              : 'No hay críticas abiertas. Mantenga el panorama de impacto y tendencia bajo observación.',
          action: {
            to: '/red-impacto',
            label: 'Ver red de impacto',
          },
        }
      }

      return {
        label: 'Señal ejecutiva',
        title: 'Operación estable por ahora',
        copy: 'No hay situaciones abiertas. Conserve esta vista para detectar cambios de riesgo o impacto institucional.',
      }
    }
    case 'ADMIN': {
      return {
        label: 'Soporte de plataforma',
        title:
          openSituations > 0
            ? `Vista global: ${pluralSituations(openSituations)} abiertas`
            : 'Vista global sin carga operativa abierta',
        copy: 'Use esta perspectiva para asistir a coordinadores, analistas o dirección según lo que vean en su rol.',
        action: {
          to: '/admin',
          label: 'Ir a administración',
        },
      }
    }
    default: {
      const _exhaustive: never = role
      return _exhaustive
    }
  }
}

export function RoleDashboardExperience({
  data,
  role,
  previewing = false,
}: RoleDashboardExperienceProps) {
  const copy = buildRoleHeroCopy(role, data)

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
        <div className="novex-role-dashboard__wide" data-tour="operational-trend">
          <OperationalTrend data={data} />
        </div>
      </div>
    </div>
  )
}

function RoleHero({
  label,
  title,
  copy,
  action,
  previewing,
}: RoleHeroCopy & { previewing: boolean }) {
  return (
    <header className="novex-role-dashboard__hero" data-tour="role-dashboard">
      <div>
        <span className="novex-role-dashboard__kicker">
          <i />
          {label}
        </span>
        <h2>{title}</h2>
        <p>{copy}</p>
        {action && !previewing ? (
          <Link to={action.to} className="novex-role-dashboard__cta">
            {action.label}
            <NovexIcon name="chevron-right" />
          </Link>
        ) : null}
      </div>
      {previewing ? (
        <Link to="/admin" className="novex-role-dashboard__return">
          <NovexIcon name="chevron-left" />
          Volver a administración
        </Link>
      ) : action ? null : (
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
      aria-labelledby="trend-title"
    >
      <div className="novex-role-dashboard__trend-header">
        <div>
          <span>Tendencia consolidada</span>
          <h3 id="trend-title">Distribución operativa</h3>
          <p>
            Resumen de la carga actual. Gestione el historial completo de
            situaciones desde el registro operativo.
          </p>
        </div>
        <Link to="/situaciones" className="novex-role-dashboard__trend-cta">
          Ir a gestionar
          <NovexIcon name="chevron-right" />
        </Link>
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
