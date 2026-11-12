import { NavLink } from 'react-router-dom'
import { preloadAdminConsole } from '@/app/routeChunks'
import { NovexIcon } from '@/shared/components/NovexIcon'
import { NovexPlatformIcon } from '@/shared/components/NovexPlatformIcon'
import type { User } from '@/modules/auth/types/user.types'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import type { OperationalCenterExperienceId } from '@/modules/operational-cards/experience/resolveOperationalCenterExperience'
import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'

export interface OperationalRoleHeaderProps {
  experience: OperationalCenterExperienceId
  user: User | null
  selectedCoordination?: CoordinationOverview | null
  assignedCoordination?: CoordinationOverview | null
  directionStatus?: OperationalIntegrityStatus
  activeProblemsCount?: number
  criticalProblemsCount?: number
  onReportSituation?: () => void
  canCreate?: boolean
  /**
   * Si se indica, la marca «NOVEX · Centro Operacional» es un enlace a esa ruta
   * (la usa la Consola de Administración para volver al Centro).
   */
  brandHref?: string
}

/**
 * Cabecera institucional de orientación del Centro Operacional.
 *
 * Permite a cualquier usuario reconocer de un vistazo:
 * 1. Dónde está (NOVEX · Centro Operacional + ámbito actual).
 * 2. Su rol institucional y estado de salud operativa.
 * 3. Situaciones que requieren atención en su contexto.
 * 4. Atajos de navegación operativa inmediata (Consola Admin, Registro rápido).
 */
export function OperationalRoleHeader({
  experience,
  user,
  selectedCoordination,
  assignedCoordination,
  directionStatus = 'ESTABLE',
  activeProblemsCount,
  criticalProblemsCount = 0,
  onReportSituation,
  canCreate = false,
  brandHref,
}: OperationalRoleHeaderProps) {
  // Sin dato todavía (la consola lo pide aparte), el chip no inventa un «0».
  const activeCount = activeProblemsCount ?? 0
  const userName = user?.name?.trim() || 'Operador NOVEX'
  const userInitial = userName.slice(0, 1).toUpperCase()

  const brand = (
    <>
      <span className="operational-role-header__star" aria-hidden="true">✦</span>
      <span className="operational-role-header__logo" aria-hidden="true">
        NOVEX
      </span>
      <span className="operational-role-header__sep" aria-hidden="true">
        ·
      </span>
      <span className="operational-role-header__venue">
        Centro Operacional
      </span>
      <span className="operational-role-header__star" aria-hidden="true">✦</span>
    </>
  )

  return (
    <header
      className="operational-role-header"
      data-testid="operational-role-header"
      data-experience={experience}
      role="banner"
      aria-label="Orientación del Centro Operacional"
    >
      {brandHref ? (
        <NavLink
          to={brandHref}
          viewTransition
          className="operational-role-header__brand operational-role-header__brand--link"
          aria-label="Volver al Centro Operacional"
          title="Volver al Centro Operacional"
          data-testid="role-header-home-link"
        >
          {brand}
        </NavLink>
      ) : (
        <div className="operational-role-header__brand">{brand}</div>
      )}

      <div className="operational-role-header__center">
        {experience === 'admin' && (
          <div
            className="operational-role-header__role-group"
            data-testid="admin-role-header-content"
          >
            <span className="operational-role-header__badge operational-role-header__badge--admin">
              <NovexIcon name="shield" />
              <span>Administración del Sistema</span>
            </span>
            <NavLink
              to="/admin"
              viewTransition
              className="operational-role-header__admin-link"
              data-testid="admin-tools-quicklink"
              title="Abrir la Consola de Administración"
              // Código y datos de la consola se piden al señalar el enlace:
              // al hacer clic la transición no espera a la red.
              onPointerEnter={preloadAdminConsole}
              onFocus={preloadAdminConsole}
              onPointerDown={preloadAdminConsole}
            >
              <NovexPlatformIcon name="admin" />
              <span>Consola de Administración</span>
            </NavLink>
            <span
              className="operational-role-header__metric-chip operational-role-header__metric-chip--active"
              data-testid="admin-overview-metric"
            >
              <span className="operational-role-header__pulse-dot" aria-hidden="true" />
              <span>
                {activeProblemsCount === undefined
                  ? 'Situaciones activas'
                  : `${activeProblemsCount} situaciones activas`}
              </span>
            </span>
          </div>
        )}

        {experience === 'director' && (
          <div
            className="operational-role-header__role-group"
            data-testid="director-role-header-content"
          >
            <span className="operational-role-header__badge operational-role-header__badge--director">
              <NovexIcon name="activity" />
              <span>Dirección de Operaciones</span>
            </span>
            <span
              className={`operational-role-header__health-pill operational-role-header__health-pill--${directionStatus.toLowerCase()}`}
              data-testid="director-health-pill"
            >
              Salud Global: <strong>{directionStatus}</strong>
            </span>
            <span
              className="operational-role-header__metric-chip"
              data-testid="director-attention-chip"
            >
              {selectedCoordination ? (
                <span>Observando: {selectedCoordination.name}</span>
              ) : criticalProblemsCount > 0 ? (
                <span className="is-critical">
                  {criticalProblemsCount} críticas
                </span>
              ) : (
                <span>{activeCount} activas</span>
              )}
            </span>
          </div>
        )}

        {experience === 'analyst' && (
          <div
            className="operational-role-header__role-group"
            data-testid="analyst-role-header-content"
          >
            <span className="operational-role-header__badge operational-role-header__badge--analyst">
              <NovexIcon name="users" />
              <span>Analista de Operaciones</span>
            </span>
            <span
              className="operational-role-header__metric-chip"
              data-testid="analyst-scope-chip"
            >
              {selectedCoordination ? (
                <span>Área: {selectedCoordination.name}</span>
              ) : (
                <span>Mesa global (9 áreas)</span>
              )}
            </span>
            {canCreate && onReportSituation && (
              <button
                type="button"
                className="operational-role-header__quick-cta"
                data-testid="analyst-quick-report"
                onClick={onReportSituation}
              >
                <NovexIcon name="plus" />
                <span>Registrar situación</span>
              </button>
            )}
          </div>
        )}

        {experience === 'coordinator' && (
          <div
            className="operational-role-header__role-group"
            data-testid="coordinator-role-header-content"
          >
            <span className="operational-role-header__badge operational-role-header__badge--coordinator">
              <NovexIcon name="sparkles" />
              <span>
                Coordinación:{' '}
                <strong>
                  {assignedCoordination?.name || 'Fábrica de Contenidos'}
                </strong>
              </span>
            </span>
            <span
              className={`operational-role-header__health-pill operational-role-header__health-pill--${(
                assignedCoordination?.status || 'ESTABLE'
              ).toLowerCase()}`}
              data-testid="coordinator-health-pill"
            >
              Estado:{' '}
              <strong>{assignedCoordination?.status || 'ESTABLE'}</strong>
            </span>
            {canCreate && onReportSituation && (
              <button
                type="button"
                className="operational-role-header__quick-cta"
                data-testid="coordinator-quick-report"
                onClick={onReportSituation}
              >
                <NovexIcon name="plus" />
                <span>Registrar situación</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="operational-role-header__right">
        <span className="operational-role-header__star operational-role-header__star--right" aria-hidden="true">✦</span>
        <div className="operational-role-header__user" data-testid="role-header-user">
          <span
            className="operational-role-header__user-avatar"
            aria-hidden="true"
          >
            {userInitial}
          </span>
          <span className="operational-role-header__user-name">{userName}</span>
          <span className="operational-role-header__user-caret" aria-hidden="true">▾</span>
        </div>
        <button
          type="button"
          className="operational-role-header__menu-btn"
          aria-label="Menú principal"
          title="Menú"
        >
          <span className="operational-role-header__menu-icon">≡</span>
        </button>
      </div>
    </header>
  )
}
