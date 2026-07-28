import type { User } from '@/modules/auth/types/user.types'
import type { EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'
import {
  ENVIRONMENT_THEME,
  FOCUS_VISIBLE,
} from '@/modules/monitoring/constants/monitoringTheme'
import { CunmarkIcon } from '@/shared/components/CunmarkIcon'
import { CunmarkUserMenu } from '@/shared/components/CunmarkUserMenu'
import { CunmarkViewHelp } from '@/shared/components/CunmarkViewHelp'

interface MonitoringHeaderProps {
  user: User | null
  environment: EnvironmentStatus
  onLogout: () => void
}

export function MonitoringHeader({
  user: _user,
  environment,
  onLogout,
}: MonitoringHeaderProps) {
  const theme = ENVIRONMENT_THEME[environment]

  return (
    <header className="cunmark-os-topbar cunmark-os-topbar--legacy">
      <div className="cunmark-os-topbar__heading">
        <p className="cunmark-os-topbar__eyebrow">Centro de Gestión Operativa</p>
        <h1>Gestión de situaciones</h1>
        <p className="cunmark-os-topbar__route">
          <span aria-hidden="true" />
          Entender · decidir · actualizar · cerrar
        </p>
      </div>

      <div className="cunmark-os-topbar__legacy-actions">
        <div className="cunmark-os-topbar__system-status">
          <span className="cunmark-os-topbar__status-dot" aria-hidden="true" />
          <span>{theme.label}</span>
        </div>
        <CunmarkUserMenu onLogout={onLogout} />
        <CunmarkViewHelp>
          <p>
            Aquí gestionas el estado operativo de cada situación analizada por la IA.
          </p>
          <p>
            Selecciona una situación, revisa su expediente y actualiza su ciclo de vida.
          </p>
        </CunmarkViewHelp>
        <button
          type="button"
          onClick={onLogout}
          className={`cunmark-os-topbar__danger-action ${FOCUS_VISIBLE}`}
        >
          <CunmarkIcon name="log-out" size={14} />
          Salir
        </button>
      </div>
    </header>
  )
}
