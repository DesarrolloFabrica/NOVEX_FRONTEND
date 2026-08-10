import { useLayoutEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ScreenDeck } from '@/modules/monitoring/components/ScreenDeck'
import { MainScreen, NovexFrame, NovexRoom } from '@/modules/room'
import { EOC_SUB_NAV_ITEMS } from '@/modules/executive-operations-center/constants/navigation'
import { ExecutiveOperationsProvider } from '@/modules/executive-operations-center/context/ExecutiveOperationsProvider'
import { NovexProductHeader } from '@/shared/components/NovexProductHeader'
import '@/modules/executive-operations-center/styles/executive-home.css'

export function ExecutiveOperationsLayout() {
  const location = useLocation()
  const isHome = location.pathname === '/centro-operacional'

  useLayoutEffect(() => {
    const scrollContainer = document.querySelector<HTMLElement>(
      '.eoc-deck > .novex-os-deck__content',
    )
    if (!scrollContainer) return
    scrollContainer.scrollTop = 0
    scrollContainer.scrollLeft = 0
  }, [location.pathname])

  return (
    <ExecutiveOperationsProvider>
      <NovexRoom scene="intelligence" environment="pending">
        <NovexFrame environment="pending">
          <MainScreen environment="pending">
            <ScreenDeck
              environment="pending"
              className={`eoc-deck ${isHome ? 'eoc-deck--home' : ''}`}
              header={
                <div className="eoc-deck__chrome">
                  <NovexProductHeader
                    eyebrow="Visión ejecutiva"
                    title="Centro operacional"
                    context="Control, inteligencia y trazabilidad"
                    help={
                      <>
                        <p>
                          Lectura consolidada de situaciones, prioridad operativa,
                          inteligencia asistida y trazabilidad institucional.
                        </p>
                        <p>
                          Use las pestañas para pasar del resumen ejecutivo al
                          panorama, al análisis IA o a la auditoría completa.
                        </p>
                      </>
                    }
                    helpTitle="Centro operacional"
                  />
                  <nav
                    className="eoc-subnav"
                    aria-label="Secciones del centro operacional"
                  >
                    {EOC_SUB_NAV_ITEMS.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        viewTransition
                        className={({ isActive }) =>
                          `eoc-subnav__link ${isActive ? 'is-active' : ''}`
                        }
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </nav>
                </div>
              }
            >
              <div className="eoc-embedded">
                <Outlet />
              </div>
            </ScreenDeck>
          </MainScreen>
        </NovexFrame>
      </NovexRoom>
    </ExecutiveOperationsProvider>
  )
}
