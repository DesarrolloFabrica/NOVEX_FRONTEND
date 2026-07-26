import { NavLink } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { RegisterSituationCta } from '@/shared/components/RegisterSituationCta'

type IconName = 'intelligence' | 'events' | 'monitoring' | 'logout'

const NAV_ITEMS: Array<{
  to: string
  label: string
  eyebrow: string
  icon: IconName
  end?: boolean
}> = [
  {
    to: '/operational-events',
    label: 'Situaciones registradas',
    eyebrow: 'Historial operativo',
    icon: 'events',
    end: true,
  },
  {
    to: '/intelligence',
    label: 'Análisis IA',
    eyebrow: 'Prioridades',
    icon: 'intelligence',
    end: true,
  },
  {
    to: '/legacy-monitoring',
    label: 'Seguimiento',
    eyebrow: 'Compromisos',
    icon: 'monitoring',
  },
]

function OmegaRailIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    intelligence: (
      <>
        <path d="M12 3.25 19.2 7.4v8.3L12 19.85 4.8 15.7V7.4L12 3.25Z" />
        <path d="m8.7 9.1 3.3-2 3.3 2v3.8l-3.3 2-3.3-2V9.1Z" />
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

function OmegaCoreMark() {
  return (
    <span className="omega-os-mark" aria-hidden="true">
      <span className="omega-os-mark__orbit" />
      <span className="omega-os-mark__core" />
    </span>
  )
}

export function OmegaSystemRail() {
  const { user, logout } = useAuth()

  return (
    <aside className="omega-os-rail" aria-label="Navegación principal">
      <div className="omega-os-rail__brand">
        <OmegaCoreMark />
        <div className="omega-os-rail__brand-copy">
          <strong>O.M.E.G.A.</strong>
          <span>Centro de Inteligencia</span>
        </div>
      </div>

      <div className="omega-os-rail__primary">
        <RegisterSituationCta variant="rail" />
      </div>

      <nav className="omega-os-rail__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            viewTransition
            aria-label={item.label}
            className={({ isActive }) =>
              `omega-os-rail__link ${isActive ? 'is-active' : ''}`
            }
          >
            <span className="omega-os-rail__icon">
              <OmegaRailIcon name={item.icon} />
            </span>
            <span className="omega-os-rail__link-copy">
              <strong>{item.label}</strong>
              <small>{item.eyebrow}</small>
            </span>
            <span className="omega-os-rail__signal" aria-hidden="true" />
          </NavLink>
        ))}
        <button
          type="button"
          className="omega-os-rail__link omega-os-rail__mobile-logout"
          onClick={() => void logout()}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <span className="omega-os-rail__icon">
            <OmegaRailIcon name="logout" />
          </span>
        </button>
      </nav>

      <div className="omega-os-rail__footer">
        <div className="omega-os-rail__identity">
          <span className="omega-os-rail__avatar" aria-hidden="true">
            {(user?.name ?? 'O').slice(0, 1)}
          </span>
          <span className="omega-os-rail__identity-copy">
            <strong>{user?.name ?? 'Sesión activa'}</strong>
            <small>{user?.role ?? 'operador'}</small>
          </span>
        </div>
        <button
          type="button"
          className="omega-os-rail__logout"
          onClick={() => void logout()}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <OmegaRailIcon name="logout" />
        </button>
      </div>
    </aside>
  )
}
