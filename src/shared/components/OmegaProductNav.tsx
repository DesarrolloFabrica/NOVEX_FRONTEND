// Navegación institucional del Centro de Inteligencia Operacional.
// Estaciones grabadas — no navbar de aplicación web tradicional.

import { NavLink } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'

const PRODUCT_LINKS = [
  { to: '/intelligence', label: 'Inteligencia', end: true },
  { to: '/operational-events', label: 'Eventos', end: true },
  { to: '/operational-events/register', label: 'Registrar', end: false },
] as const

interface OmegaProductNavProps {
  showSession?: boolean
}

export function OmegaProductNav({ showSession = true }: OmegaProductNavProps) {
  const { user, logout } = useAuth()

  return (
    <div className="omega-product-nav">
      <nav aria-label="Estaciones operativas" className="omega-product-nav__stations">
        {PRODUCT_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `omega-product-nav__link ${FOCUS_VISIBLE} ${
                isActive ? 'omega-product-nav__link--active' : ''
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      {showSession ? (
        <div className="omega-product-nav__session">
          <p className="omega-product-nav__user hidden sm:block">
            {user?.name ?? 'Sesión'}
          </p>
          <button
            type="button"
            onClick={() => void logout()}
            className={`omega-product-nav__logout ${FOCUS_VISIBLE}`}
          >
            Salir
          </button>
        </div>
      ) : null}
    </div>
  )
}
