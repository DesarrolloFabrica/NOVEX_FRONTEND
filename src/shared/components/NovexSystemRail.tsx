import { NavLink } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { getRoleDisplayName } from '@/modules/auth/utils/roleDisplay'
import { NovexBrandMark } from '@/shared/components/NovexBrandMark'
import { NovexPlatformIcon } from '@/shared/components/NovexPlatformIcon'
import { RegisterSituationCta } from '@/shared/components/RegisterSituationCta'
import {
  NOVEX_BETA_HINT,
  NOVEX_BETA_LABEL,
} from '@/shared/constants/platformStatus'
import { resolvePlatformNavItems } from '@/shared/constants/platformNavigation'

/**
 * Carril vertical de navegación de plataforma.
 *
 * Desde R2 ya NO es la única superficie que pinta estos destinos: el Centro
 * Operacional los sirve en un menú compacto (`NovexPlatformMenu`) porque ha
 * dejado de montar el carril. Por eso el reparto por rol vive en
 * `shared/constants/platformNavigation` y los glifos en `NovexPlatformIcon`,
 * en lugar de aquí: dos superficies que ofrecieran destinos distintos al mismo
 * usuario es la forma habitual en que una navegación duplicada se desincroniza.
 *
 * El comportamiento del carril NO cambió en R2: mismos destinos, mismos
 * rótulos, mismo reparto por rol y mismas clases CSS.
 */

export function NovexSystemRail() {
  const { user, logout } = useAuth()
  const roleCode = user?.roleCode ?? 'COORDINADOR'
  const navItems = resolvePlatformNavItems(roleCode)

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
              <NovexPlatformIcon name={item.icon} />
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
            <NovexPlatformIcon name="logout" />
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
          <NovexPlatformIcon name="logout" />
        </button>
      </div>
    </aside>
  )
}
