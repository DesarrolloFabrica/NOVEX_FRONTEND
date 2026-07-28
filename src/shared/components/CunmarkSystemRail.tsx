import { NavLink } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { CunmarkBrandMark } from '@/shared/components/CunmarkBrandMark'
import { RegisterSituationCta } from '@/shared/components/RegisterSituationCta'

type IconName = 'intelligence' | 'impact' | 'events' | 'monitoring' | 'logout'

const NAV_ITEMS: Array<{
  to: string
  label: string
  eyebrow: string
  icon: IconName
  end?: boolean
}> = [
  {
    to: '/situaciones',
    label: 'Situaciones registradas',
    eyebrow: 'Historial operativo',
    icon: 'events',
    end: true,
  },
  {
    to: '/dashboard',
    label: 'Dashboard',
    eyebrow: 'Visión general',
    icon: 'intelligence',
    end: true,
  },
  {
    to: '/red-impacto',
    label: 'Red de impacto',
    eyebrow: 'Mapa operacional',
    icon: 'impact',
    end: true,
  },
  {
    to: '/gestion',
    label: 'Gestión de situaciones',
    eyebrow: 'Ciclo operativo',
    icon: 'monitoring',
  },
]

function CunmarkRailIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    intelligence: (
      <>
        <path d="M12 3.25 19.2 7.4v8.3L12 19.85 4.8 15.7V7.4L12 3.25Z" />
        <path d="m8.7 9.1 3.3-2 3.3 2v3.8l-3.3 2-3.3-2V9.1Z" />
      </>
    ),
    impact: (
      <>
        <path d="M12 4.75v4M5.25 8.25l3.65 2.1M18.75 8.25l-3.65 2.1M5.25 15.75l3.65-2.1M18.75 15.75l-3.65-2.1M12 15.25v4" />
        <circle cx="12" cy="12" r="3.25" />
        <circle cx="12" cy="3.5" r="1.25" />
        <circle cx="4.5" cy="7.75" r="1.25" />
        <circle cx="19.5" cy="7.75" r="1.25" />
        <circle cx="4.5" cy="16.25" r="1.25" />
        <circle cx="19.5" cy="16.25" r="1.25" />
        <circle cx="12" cy="20.5" r="1.25" />
      </>
    ),
    events: (
      <>
        <path d="M5 4.5h14v15H5z" />
        <path d="M8 8h5M8 12h8M8 16h6" />
        <path d="M16.75 6.25v3.5M15 8h3.5" />
      </>
    ),
    monitoring: (
      <>
        <path d="M4 18.5V11h4v7.5M10 18.5V5.5h4v13M16 18.5V8h4v10.5" />
        <path d="M3 20h18" />
      </>
    ),
    logout: (
      <>
        <path d="M10 5H5v14h5M14 8l4 4-4 4M9 12h9" />
      </>
    ),
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

export function CunmarkSystemRail() {
  const { user, logout } = useAuth()

  return (
    <aside className="cunmark-os-rail" aria-label="Navegación principal">
      <div className="cunmark-os-rail__brand">
        <CunmarkBrandMark size="rail" className="cunmark-os-mark" />
        <div className="cunmark-os-rail__brand-copy">
          <strong>CUNMARK</strong>
          <span>Visión general</span>
        </div>
      </div>

      <div className="cunmark-os-rail__primary">
        <RegisterSituationCta variant="rail" />
      </div>

      <nav className="cunmark-os-rail__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            viewTransition
            aria-label={item.label}
            className={({ isActive }) =>
              `cunmark-os-rail__link ${isActive ? 'is-active' : ''}`
            }
          >
            <span className="cunmark-os-rail__icon">
              <CunmarkRailIcon name={item.icon} />
            </span>
            <span className="cunmark-os-rail__link-copy">
              <strong>{item.label}</strong>
              <small>{item.eyebrow}</small>
            </span>
            <span className="cunmark-os-rail__signal" aria-hidden="true" />
          </NavLink>
        ))}
        <button
          type="button"
          className="cunmark-os-rail__link cunmark-os-rail__mobile-logout"
          onClick={() => void logout()}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <span className="cunmark-os-rail__icon">
            <CunmarkRailIcon name="logout" />
          </span>
        </button>
      </nav>

      <div className="cunmark-os-rail__footer">
        <div className="cunmark-os-rail__identity">
          <span className="cunmark-os-rail__avatar" aria-hidden="true">
            {(user?.name ?? 'O').slice(0, 1)}
          </span>
          <span className="cunmark-os-rail__identity-copy">
            <strong>{user?.name ?? 'Sesión activa'}</strong>
            <small>{user?.role ?? 'operador'}</small>
          </span>
        </div>
        <button
          type="button"
          className="cunmark-os-rail__logout"
          onClick={() => void logout()}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <CunmarkRailIcon name="logout" />
        </button>
      </div>
    </aside>
  )
}
