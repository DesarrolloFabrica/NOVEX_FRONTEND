import { NavLink } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { getRoleDisplayName } from '@/modules/auth/utils/roleDisplay'
import { NovexBrandMark } from '@/shared/components/NovexBrandMark'
import { RegisterSituationCta } from '@/shared/components/RegisterSituationCta'
import {
  NOVEX_BETA_HINT,
  NOVEX_BETA_LABEL,
} from '@/shared/constants/platformStatus'
import { EXECUTIVE_CENTER_RAIL_ITEM } from '@/modules/executive-operations-center/constants/navigation'

type IconName =
  | 'intelligence'
  | 'impact'
  | 'events'
  | 'monitoring'
  | 'admin'
  | 'command'
  | 'logout'

type NavItem = {
  to: string
  label: string
  eyebrow: string
  icon: IconName
  end?: boolean
}

const OPERATIONAL_NAV_ITEMS: NavItem[] = [
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

const DIRECTOR_NAV_ITEMS: NavItem[] = [
  EXECUTIVE_CENTER_RAIL_ITEM,
  ...OPERATIONAL_NAV_ITEMS.filter((item) => item.to !== '/gestion'),
]

const ANALISTA_NAV_ITEMS: NavItem[] = [
  EXECUTIVE_CENTER_RAIL_ITEM,
  ...OPERATIONAL_NAV_ITEMS,
]

const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    to: '/admin',
    label: 'Administración',
    eyebrow: 'Control del sistema',
    icon: 'admin',
    end: true,
  },
  EXECUTIVE_CENTER_RAIL_ITEM,
  ...OPERATIONAL_NAV_ITEMS.filter((item) => item.to !== '/gestion'),
]

function NovexRailIcon({ name }: { name: IconName }) {
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
    admin: (
      <>
        <path d="M4.5 6.5h15v12h-15z" />
        <path d="M8 10h3M8 14h5M16.5 9.5v5" />
      </>
    ),
    command: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 4v2M12 18v2M4 12h2M18 12h2" />
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

export function NovexSystemRail() {
  const { user, logout } = useAuth()
  const roleCode = user?.roleCode ?? 'COORDINADOR'
  const navItems =
    roleCode === 'ADMIN'
      ? ADMIN_NAV_ITEMS
      : roleCode === 'DIRECTOR'
        ? DIRECTOR_NAV_ITEMS
        : roleCode === 'ANALISTA'
          ? ANALISTA_NAV_ITEMS
          : OPERATIONAL_NAV_ITEMS

  return (
    <aside className="novex-os-rail" aria-label="Navegación principal">
      <div className="novex-os-rail__brand" data-tour="platform-brand">
        <span className="novex-os-rail__mark-wrap" title={NOVEX_BETA_HINT}>
          <NovexBrandMark size="rail" className="novex-os-mark" />
          <span className="novex-os-rail__mark-beta" aria-hidden="true">
            {NOVEX_BETA_LABEL}
          </span>
        </span>
        <div className="novex-os-rail__brand-copy">
          <div className="novex-os-rail__brand-title">
            <strong>NOVEX</strong>
            <span
              className="novex-beta-mark"
              title={NOVEX_BETA_HINT}
              aria-label={NOVEX_BETA_HINT}
            >
              {NOVEX_BETA_LABEL}
            </span>
          </div>
          <span>Despliegue piloto</span>
        </div>
      </div>

      <div className="novex-os-rail__primary" data-tour="register-situation">
        {roleCode === 'COORDINADOR' || roleCode === 'ANALISTA' ? (
          <RegisterSituationCta variant="rail" />
        ) : null}
      </div>

      <nav className="novex-os-rail__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            viewTransition
            aria-label={item.label}
            className={({ isActive }) =>
              `novex-os-rail__link ${isActive ? 'is-active' : ''}`
            }
          >
            <span className="novex-os-rail__icon">
              <NovexRailIcon name={item.icon} />
            </span>
            <span className="novex-os-rail__link-copy">
              <strong>{item.label}</strong>
              <small>{item.eyebrow}</small>
            </span>
            <span className="novex-os-rail__signal" aria-hidden="true" />
          </NavLink>
        ))}
        <button
          type="button"
          className="novex-os-rail__link novex-os-rail__mobile-logout"
          onClick={() => void logout()}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <span className="novex-os-rail__icon">
            <NovexRailIcon name="logout" />
          </span>
        </button>
      </nav>

      <div className="novex-os-rail__footer">
        <div className="novex-os-rail__identity">
          <span className="novex-os-rail__avatar" aria-hidden="true">
            {(user?.name ?? 'O').slice(0, 1)}
          </span>
          <span className="novex-os-rail__identity-copy">
            <strong>{user?.name ?? 'Sesión activa'}</strong>
            <small>{getRoleDisplayName(user)}</small>
          </span>
        </div>
        <button
          type="button"
          className="novex-os-rail__logout"
          onClick={() => void logout()}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <NovexRailIcon name="logout" />
        </button>
      </div>
    </aside>
  )
}
