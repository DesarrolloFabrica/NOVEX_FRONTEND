import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { canCreateSituations } from '@/modules/auth/utils/permissions'
import { buildInternalReportUrl } from '@/modules/operational-cards/experience/reportIntent'
import { getRoleDisplayName } from '@/modules/auth/utils/roleDisplay'
import { normalizeRoleCode } from '@/modules/auth/utils/roleExperience'
import { useOnboarding } from '@/modules/onboarding/useOnboarding'
import { CoordinatorPilotInvitation } from '@/modules/onboarding/tours/CoordinatorPilotInvitation'
import { CoordinatorPilotTour } from '@/modules/onboarding/tours/CoordinatorPilotTour'
import { NovexIcon } from '@/shared/components/NovexIcon'
import { NovexPlatformIcon } from '@/shared/components/NovexPlatformIcon'
import { resolvePlatformNavItems } from '@/shared/constants/platformNavigation'

/** Ayuda breve según el rol: qué ve y qué puede hacer en su panel. */
const ROLE_HELP: Record<string, readonly string[]> = {
  COORDINADOR: [
    'Su panel muestra solo su coordinación. En «Por resolver» atienda primero las situaciones críticas; «Afectan mi área» reúne las dependencias de otras áreas y «Mis reportes», lo que usted registró.',
    'Abra una situación para pasarla a «En atención» y ciérrela registrando su aprendizaje.',
    'Registre cualquier novedad desde «Registrar situación»; en «Consultar» encontrará el historial y la gestión.',
  ],
  ANALISTA: [
    'Elija una carta de la mesa para ver en el centro las situaciones de esa coordinación.',
    'Desde el panel derecho registre una situación en la coordinación elegida o consulte el historial y la gestión de situaciones.',
    'En «Indicadores» revise los KPIs de la operación, de toda la mesa o por coordinación.',
  ],
  DIRECTOR: [
    'La vista inicial resume la Dirección: qué es lo más urgente y qué áreas piden atención.',
    'Elija una carta o un área para ver sus situaciones; a la derecha, los indicadores.',
  ],
  ADMIN: [
    'Cada carta es una coordinación: al elegirla, el centro muestra sus situaciones.',
    'En el panel derecho consulte la gestión de situaciones y las acciones administrativas; desde el detalle de una situación puede anularla o trasladarla.',
    'La Consola de administración gestiona usuarios, roles, permisos y coordinaciones.',
  ],
}

/**
 * Navegación institucional del Centro Operacional.
 *
 * Es un disclosure no modal: se superpone al escenario sin sacarlo del orden
 * de foco ni alterar su geometría. Las rutas, permisos, sesión y onboarding
 * proceden de los mismos resolutores que utilizaba el chrome retirado.
 */
export function OperationalCenterMenu() {
  const { user, logout } = useAuth()
  const { restart, resume, steps } = useOnboarding()
  const [open, setOpen] = useState(false)
  const [pilotOpen, setPilotOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const helpId = `${useId().replace(/:/g, '')}-help`
  const roleCode = normalizeRoleCode(user?.roleCode)
  const helpLines = ROLE_HELP[roleCode] ?? ROLE_HELP.ADMIN
  const canRegister = canCreateSituations(user)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const panelId = `operational-center-menu-${useId().replace(/:/g, '')}`
  const titleId = `${panelId}-title`
  const destinations = resolvePlatformNavItems(user?.roleCode)
  const tutorialAvailable = steps.length > 0
  // Recorrido guiado del COORDINADOR: siempre en el servidor de desarrollo y,
  // en un despliegue, solo si `VITE_ENABLE_COORDINATOR_TOUR=true` (por defecto
  // apagado: producción no cambia sin decidirlo). No inicia nada solo.
  const pilotAvailable =
    (import.meta.env.DEV || import.meta.env.VITE_ENABLE_COORDINATOR_TOUR === 'true') &&
    normalizeRoleCode(user?.roleCode) === 'COORDINADOR'

  useEffect(() => {
    if (!open) return

    panelRef.current
      ?.querySelector<HTMLElement>('[data-shell-menu-autofocus]')
      ?.focus()

    function closeAndRestoreFocus(defer = false) {
      setOpen(false)
      if (defer) {
        window.setTimeout(() => triggerRef.current?.focus(), 0)
      } else {
        triggerRef.current?.focus()
      }
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        // El foco se restaura después de la acción predeterminada del puntero;
        // hacerlo dentro de pointerdown permite que el navegador lo quite de
        // nuevo al completar el clic exterior.
        closeAndRestoreFocus(true)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      closeAndRestoreFocus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function closeWithoutRestoringFocus() {
    setOpen(false)
  }

  function startTutorial() {
    closeWithoutRestoringFocus()
    if (user?.onboardingCompleted) restart()
    else resume()
  }

  async function handleLogout() {
    closeWithoutRestoringFocus()
    await logout()
  }

  return (
    <div
      className="operational-shell__menu-anchor"
      data-testid="shell-menu-anchor"
      data-menu-open={open ? 'true' : 'false'}
      ref={rootRef}
    >
      <button
        type="button"
        className="operational-shell__menu-trigger"
        data-testid="shell-menu-trigger"
        data-tour="center-menu"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Cerrar el menú' : 'Abrir el menú'}
        ref={triggerRef}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="operational-shell__menu-hamburger" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      {open ? (
        <section
          id={panelId}
          className="operational-shell__menu-panel shell-menu"
          data-testid="shell-menu-panel"
          data-tour="center-menu-panel"
          aria-labelledby={titleId}
          ref={panelRef}
        >
          <h2 id={titleId} className="operational-shell__menu-sr-title">
            Menú del Centro operacional
          </h2>

          <header className="shell-menu__user">
            <span className="shell-menu__avatar" aria-hidden="true">
              {(user?.name ?? 'Operador NOVEX').slice(0, 1)}
            </span>
            <div className="shell-menu__identity">
              <strong>{user?.name ?? 'Operador NOVEX'}</strong>
              <small>{getRoleDisplayName(user)}</small>
            </div>
          </header>

          <span className="shell-menu__section">Navegación</span>
          <nav className="shell-menu__group" aria-label="Navegación del Centro Operacional">
            {destinations.map((item, index) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                viewTransition
                data-testid={`shell-menu-option-${item.to === '/admin' ? 'admin' : 'center'}`}
                data-shell-menu-autofocus={index === 0 ? 'true' : undefined}
                className={({ isActive }) => `shell-menu__item ${isActive ? 'is-active' : ''}`}
                onClick={closeWithoutRestoringFocus}
              >
                <span className="shell-menu__icon" aria-hidden="true">
                  <NovexPlatformIcon name={item.icon} />
                </span>
                <span className="shell-menu__text">
                  <strong>{item.label}</strong>
                  <small>{item.eyebrow}</small>
                </span>
              </NavLink>
            ))}
          </nav>

          <span className="shell-menu__section">Acciones</span>
          <div className="shell-menu__group">
            {canRegister ? (
              <Link
                to={buildInternalReportUrl()}
                viewTransition
                className="shell-menu__item"
                data-testid="shell-menu-register"
                aria-label="Registrar nueva situación"
                onClick={closeWithoutRestoringFocus}
              >
                <span className="shell-menu__icon" aria-hidden="true">
                  <NovexIcon name="plus" />
                </span>
                <span className="shell-menu__text">
                  <strong>Registrar situación</strong>
                  <small>Reportar una situación nueva</small>
                </span>
              </Link>
            ) : null}

            <button
              type="button"
              className="shell-menu__item"
              data-testid="shell-menu-help"
              aria-expanded={helpOpen}
              aria-controls={helpId}
              onClick={() => setHelpOpen((value) => !value)}
            >
              <span className="shell-menu__icon" aria-hidden="true">
                <NovexIcon name="help" />
              </span>
              <span className="shell-menu__text">
                <strong>Ayuda</strong>
                <small>Cómo usar este panel</small>
              </span>
              <span className="shell-menu__chevron" aria-hidden="true" />
            </button>
            {helpOpen ? (
              <div className="shell-menu__help" id={helpId} role="note">
                {helpLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : null}

            {tutorialAvailable ? (
              <button
                type="button"
                className="shell-menu__item"
                data-testid="shell-menu-tutorial"
                onClick={startTutorial}
              >
                <span className="shell-menu__icon" aria-hidden="true">
                  <NovexIcon name="sparkles" />
                </span>
                <span className="shell-menu__text">
                  <strong>
                    {user?.onboardingCompleted ? 'Ver tutorial nuevamente' : 'Continuar tutorial'}
                  </strong>
                  <small>Recorrido guiado de NOVEX</small>
                </span>
              </button>
            ) : null}

            {pilotAvailable ? (
              <button
                type="button"
                className="shell-menu__item"
                data-testid="shell-menu-pilot"
                onClick={() => {
                  closeWithoutRestoringFocus()
                  setPilotOpen(true)
                }}
              >
                <span className="shell-menu__icon" aria-hidden="true">
                  <NovexIcon name="sparkles" />
                </span>
                <span className="shell-menu__text">
                  <strong>Recorrido guiado</strong>
                  <small>Conozca su Centro Operacional</small>
                </span>
              </button>
            ) : null}
          </div>

          <div className="shell-menu__footer">
            <button
              type="button"
              className="shell-menu__item shell-menu__item--logout"
              data-testid="shell-menu-logout"
              onClick={() => void handleLogout()}
            >
              <span className="shell-menu__icon" aria-hidden="true">
                <NovexIcon name="log-out" />
              </span>
              <span className="shell-menu__text">
                <strong>Cerrar sesión</strong>
                <small>Salir de NOVEX de forma segura</small>
              </span>
            </button>
          </div>
        </section>
      ) : null}

      {pilotAvailable && !pilotOpen ? (
        <CoordinatorPilotInvitation onStart={() => setPilotOpen(true)} />
      ) : null}

      {pilotOpen ? (
        <CoordinatorPilotTour
          onClose={() => {
            setPilotOpen(false)
            // El menú puede estar cerrado: el foco vuelve a su disparador.
            triggerRef.current?.focus()
          }}
        />
      ) : null}
    </div>
  )
}
