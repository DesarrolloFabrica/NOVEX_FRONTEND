// Componente: cabecera del flujo de Seguimiento (compromisos).

import type { User } from '@/modules/auth/types/user.types'
import type { EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'
import {
  ENVIRONMENT_THEME,
  FOCUS_VISIBLE,
} from '@/modules/monitoring/constants/monitoringTheme'
import { OmegaIcon } from '@/shared/components/OmegaIcon'
import { OmegaUserMenu } from '@/shared/components/OmegaUserMenu'

interface MonitoringHeaderProps {
  user: User | null
  environment: EnvironmentStatus
  areaLabel?: string
  onLogout: () => void
}

export function MonitoringHeader({
  user: _user,
  environment,
  areaLabel,
  onLogout,
}: MonitoringHeaderProps) {
  const theme = ENVIRONMENT_THEME[environment]
  return (
    <header className="omega-os-topbar omega-os-topbar--legacy">
      <div className="omega-os-topbar__heading">
        <p className="omega-os-topbar__eyebrow">
          Centro de Inteligencia Operacional
        </p>
        <h1>Seguimiento</h1>
        <p className="omega-os-topbar__route">
          <span aria-hidden="true" />
          {areaLabel ? `${areaLabel} · ` : ''}
          {theme.label}
        </p>
      </div>

      <div className="omega-os-topbar__legacy-actions">
        <div className="omega-os-topbar__system-status">
          <span className="omega-os-topbar__status-dot" aria-hidden="true" />
          <span>{theme.label}</span>
        </div>
        <OmegaUserMenu onLogout={onLogout} />
        <button
          type="button"
          onClick={onLogout}
          className={`omega-os-topbar__danger-action ${FOCUS_VISIBLE}`}
        >
          <OmegaIcon name="log-out" size={14} />
          Salir
        </button>
      </div>
    </header>
  )
}
