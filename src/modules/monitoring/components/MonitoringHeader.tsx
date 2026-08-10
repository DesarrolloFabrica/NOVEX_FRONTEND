import type { User } from '@/modules/auth/types/user.types'
import type { EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'
import {
  ENVIRONMENT_THEME,
  FOCUS_VISIBLE,
} from '@/modules/monitoring/constants/monitoringTheme'
import { NovexIcon } from '@/shared/components/NovexIcon'
import { NovexUserMenu } from '@/shared/components/NovexUserMenu'
import { NovexViewHelp } from '@/shared/components/NovexViewHelp'

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
    <header className="novex-os-topbar novex-os-topbar--legacy">
      <div className="novex-os-topbar__heading">
        <p className="novex-os-topbar__eyebrow">Centro de Gestión Operativa</p>
        <h1>Gestión de situaciones</h1>
        <p className="novex-os-topbar__route">
          <span aria-hidden="true" />
          Entender · decidir · actualizar · cerrar
        </p>
      </div>

      <div className="novex-os-topbar__legacy-actions">
        <div className="novex-os-topbar__system-status">
          <span className="novex-os-topbar__status-dot" aria-hidden="true" />
          <span>{theme.label}</span>
        </div>
        <NovexUserMenu onLogout={onLogout} />
        <NovexViewHelp>
          <p>
            Supervisa el ciclo de vida de cada situación: Registrada, En atención
            y Cerrada. Al cerrar, sale del mapa y de la cola; permanece en
            Situaciones registradas.
          </p>
          <p>
            La IA entrega inteligencia estratégica. Tú tomas la decisión operacional
            con un único botón de actualización de estado.
          </p>
        </NovexViewHelp>
        <button
          type="button"
          onClick={onLogout}
          className={`novex-os-topbar__danger-action ${FOCUS_VISIBLE}`}
        >
          <NovexIcon name="log-out" size={14} />
          Salir
        </button>
      </div>
    </header>
  )
}
