import { useLayoutEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ScreenDeck } from '@/modules/monitoring/components/ScreenDeck'
import { MainScreen, NovexFrame, NovexRoom } from '@/modules/room'
import { ExecutiveOperationsProvider } from '@/modules/executive-operations-center/context/ExecutiveOperationsProvider'
import '@/modules/executive-operations-center/styles/executive-home.css'

/**
 * Shell del Centro Operacional.
 *
 * Desde R2 esta experiencia NO monta el carril vertical: recupera esos 228 px
 * de ancho para la escena y sirve la navegación de plataforma en un menú
 * compacto flotante. El carril sigue existiendo y funcionando en las
 * demás experiencias, que no declaran nada y conservan el default.
 *
 * El opt-out es explícito y por componente (`rail={false}`), no por ruta: este
 * layout sirve exclusivamente `/centro-operacional` (home de cartas). Las
 * secciones legadas Panorama / Inteligencia / Reportes redirigen fuera de este
 * layout para no montar el proveedor ni disparar su carga masiva (FE-04).
 */
export function ExecutiveOperationsLayout() {
  const location = useLocation()

  useLayoutEffect(() => {
    const scrollContainer = document.querySelector<HTMLElement>(
      '.eoc-deck > .novex-os-deck__content',
    )
    if (!scrollContainer) return
    scrollContainer.scrollTop = 0
    scrollContainer.scrollLeft = 0
  }, [location.pathname])

  return (
    <ExecutiveOperationsProvider enabled={false}>
      <NovexRoom scene="intelligence" environment="pending" rail={false}>
        <NovexFrame environment="pending">
          <MainScreen environment="pending">
            <ScreenDeck
              environment="pending"
              className="eoc-deck eoc-deck--home"
              header={null}
            >
              <div className="eoc-embedded eoc-embedded--shell">
                <h1 className="eoc-accessible-title">Centro operacional</h1>
                <Outlet />
              </div>
            </ScreenDeck>
          </MainScreen>
        </NovexFrame>
      </NovexRoom>
    </ExecutiveOperationsProvider>
  )
}
