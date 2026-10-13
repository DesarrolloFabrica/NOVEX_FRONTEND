import { useEffect, useId, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { getRoleDisplayName } from '@/modules/auth/utils/roleDisplay'
import { useOnboarding } from '@/modules/onboarding/OnboardingContext'
import { NovexIcon } from '@/shared/components/NovexIcon'
import { NovexPlatformIcon } from '@/shared/components/NovexPlatformIcon'
import { NovexViewHelp } from '@/shared/components/NovexViewHelp'
import { RegisterSituationCta } from '@/shared/components/RegisterSituationCta'
import { resolvePlatformNavItems } from '@/shared/constants/platformNavigation'

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
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const panelId = `operational-center-menu-${useId().replace(/:/g, '')}`
  const titleId = `${panelId}-title`
  const destinations = resolvePlatformNavItems(user?.roleCode)
  const tutorialAvailable = steps.length > 0

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
          className="operational-shell__menu-panel"
          data-testid="shell-menu-panel"
          aria-labelledby={titleId}
          ref={panelRef}
        >
          <header className="operational-shell__menu-head">
            <h2 id={titleId} className="operational-shell__menu-sr-title">
              Menú del Centro operacional
            </h2>
            <div className="operational-shell__menu-user">
              <span aria-hidden="true">
                {(user?.name ?? 'Operador Novex').slice(0, 1)}
              </span>
              <div>
                <strong>{user?.name ?? 'Operador Novex'}</strong>
                <small>{getRoleDisplayName(user)}</small>
              </div>
            </div>
          </header>

          <nav
            className="operational-shell__menu-navigation"
            aria-label="Navegación del Centro Operacional"
          >
            {destinations.map((item, index) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                viewTransition
                data-testid={`shell-menu-option-${
                  item.to === '/admin' ? 'admin' : 'center'
                }`}
                data-shell-menu-autofocus={index === 0 ? 'true' : undefined}
                className={({ isActive }) =>
                  `operational-shell__menu-option ${isActive ? 'is-active' : ''}`
                }
                onClick={closeWithoutRestoringFocus}
              >
                <span className="operational-shell__menu-option-icon">
                  <NovexPlatformIcon name={item.icon} />
                </span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.eyebrow}</small>
                </span>
              </NavLink>
            ))}
          </nav>

          <div className="operational-shell__menu-actions">
            <RegisterSituationCta
              variant="inline"
              label="Registrar problema"
              className="operational-shell__menu-option operational-shell__menu-register"
              data-testid="shell-menu-register"
              onClick={closeWithoutRestoringFocus}
            />

            <NovexViewHelp
              title="Ayuda del Centro operacional"
              triggerLabel="Ayuda"
              variant="panel"
            >
              <p>
                Cada carta representa una coordinación. Al seleccionarla, la
                lectura, los problemas y las acciones de su rol cambian a esa
                coordinación.
              </p>
              <p>
                El personaje refleja el estado operacional de la coordinación.
              </p>
            </NovexViewHelp>

            {tutorialAvailable ? (
              <button
                type="button"
                className="operational-shell__menu-option"
                data-testid="shell-menu-tutorial"
                onClick={startTutorial}
              >
                <span className="operational-shell__menu-option-icon">
                  <NovexIcon name="sparkles" />
                </span>
                <span>
                  <strong>
                    {user?.onboardingCompleted
                      ? 'Ver tutorial nuevamente'
                      : 'Continuar tutorial'}
                  </strong>
                  <small>Recorrido guiado de NOVEX</small>
                </span>
              </button>
            ) : null}
          </div>

          <button
            type="button"
            className="operational-shell__menu-logout"
            data-testid="shell-menu-logout"
            onClick={() => void handleLogout()}
          >
            <NovexIcon name="log-out" />
            <span>
              <strong>Cerrar sesión</strong>
              <small>Salir de NOVEX de forma segura</small>
            </span>
          </button>
        </section>
      ) : null}
    </div>
  )
}
