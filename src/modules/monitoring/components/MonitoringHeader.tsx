// Componente: cabecera de la Sala O.M.E.G.A. (flujo Legacy · Commitments).
// Identidad del sistema, indicador de estado de la sala, sesión y acciones.
// Solo presentación — jerarquía más baja del recorrido visual.

import { Link } from 'react-router-dom'
import type { User } from '@/modules/auth/types/user.types'
import type { EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'
import {
  CRYSTAL_HEADER_PAD,
  ENVIRONMENT_THEME,
  FOCUS_VISIBLE,
  HEADER_SEPARATOR,
} from '@/modules/monitoring/constants/monitoringTheme'
import {
  HEADER_ACTION,
  HEADER_ACTION_QUIET,
  HEADER_BRAND,
  HEADER_SESSION_NAME,
  HEADER_SESSION_ROLE,
  HEADER_SUBTITLE,
  HEADER_ZONE,
} from '@/modules/monitoring/constants/visualHierarchy'

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
    <header
      className={`flex items-center justify-between gap-4 ${CRYSTAL_HEADER_PAD} ${HEADER_ZONE}`}
    >
      <div className="flex items-center gap-3">
        <h1 className={`omega-header-brand ${HEADER_BRAND}`}>
          <span className="omega-brand-icon" aria-hidden="true">
            <img src="/capas/Logoprovisional.png" alt="" draggable={false} />
          </span>
          <span>O.M.E.G.A.</span>
        </h1>
        <span aria-hidden="true" className={HEADER_SEPARATOR} />
        <span className={`hidden sm:inline ${HEADER_SUBTITLE}`}>
          Legacy · Monitoreo de compromisos
        </span>
        <span
          className={`hidden items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium opacity-92 transition-colors duration-500 md:inline-flex ${theme.badge}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${theme.dot}`}
          />
          Sala · {theme.label}
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <Link
          to="/intelligence"
          className={`rounded-lg px-2.5 py-1.5 ${HEADER_ACTION_QUIET} ${FOCUS_VISIBLE}`}
        >
          Ir a Inteligencia
        </Link>
        <div className="hidden text-right sm:block">
          <p className={HEADER_SESSION_NAME}>{user?.name ?? '—'}</p>
          <p className={HEADER_SESSION_ROLE}>{user?.role ?? '—'}</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          title="Restaura los compromisos mock (solo desarrollo)"
          className={`rounded-lg px-2.5 py-1.5 ${HEADER_ACTION_QUIET} ${FOCUS_VISIBLE}`}
        >
          Reiniciar datos
        </button>
        <button
          type="button"
          onClick={onLogout}
          className={`rounded-lg ${HEADER_ACTION} ${FOCUS_VISIBLE}`}
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  )
}
