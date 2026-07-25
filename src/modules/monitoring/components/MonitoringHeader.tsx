// Componente: cabecera de la Sala O.M.E.G.A. (flujo Legacy · Commitments).
// Identidad del sistema, indicador de estado de la sala, sesión y acciones.
// Solo presentación — jerarquía más baja del recorrido visual.

import { Link } from 'react-router-dom'
import type { User } from '@/modules/auth/types/user.types'
import type { EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'
import {
  ENVIRONMENT_THEME,
  FOCUS_VISIBLE,
} from '@/modules/monitoring/constants/monitoringTheme'

interface MonitoringHeaderProps {
  user: User | null
  environment: EnvironmentStatus
  onLogout: () => void
  /** Reinicia los datos de demo (solo desarrollo). */
  onReset: () => void
}

export function MonitoringHeader({
  user,
  environment,
  onLogout,
  onReset,
}: MonitoringHeaderProps) {
  const theme = ENVIRONMENT_THEME[environment]

  return (
    <header className="omega-os-topbar omega-os-topbar--legacy">
      <div className="omega-os-topbar__heading">
        <p className="omega-os-topbar__eyebrow">
          Centro de Inteligencia Operacional
        </p>
        <h1>
          Monitoreo de <span>compromisos</span>
        </h1>
        <p className="omega-os-topbar__route">
          <span aria-hidden="true" />
          Sala · {theme.label}
        </p>
      </div>

      <div className="omega-os-topbar__legacy-actions">
        <Link
          to="/intelligence"
          viewTransition
          className={`omega-os-topbar__quiet-action ${FOCUS_VISIBLE}`}
        >
          Inteligencia
        </Link>
        <div className="omega-os-topbar__profile omega-os-topbar__profile--compact">
          <span className="omega-os-topbar__avatar" aria-hidden="true">
            {(user?.name ?? 'O').slice(0, 1)}
          </span>
          <div>
            <strong>{user?.name ?? 'Operador'}</strong>
            <small>{user?.role ?? 'sesión'}</small>
          </div>
        </div>
        <button
          type="button"
          onClick={onReset}
          title="Restaura los compromisos mock (solo desarrollo)"
          className={`omega-os-topbar__quiet-action ${FOCUS_VISIBLE}`}
        >
          Reiniciar datos
        </button>
        <button
          type="button"
          onClick={onLogout}
          className={`omega-os-topbar__danger-action ${FOCUS_VISIBLE}`}
        >
          Salir
        </button>
      </div>
    </header>
  )
}
