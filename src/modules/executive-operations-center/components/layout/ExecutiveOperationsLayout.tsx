import { useLayoutEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ScreenDeck } from '@/modules/monitoring/components/ScreenDeck'
import { MainScreen, NovexFrame, NovexRoom } from '@/modules/room'
import { ExecutiveOperationsChrome } from '@/modules/executive-operations-center/components/layout/ExecutiveOperationsChrome'
import { ExecutiveOperationsProvider } from '@/modules/executive-operations-center/context/ExecutiveOperationsProvider'
import '@/modules/executive-operations-center/styles/executive-home.css'

/**
 * Shell del Centro Operacional.
 *
 * Desde R2 esta experiencia NO monta el carril vertical: recupera esos 228 px
 * de ancho para la escena y sirve la navegación de plataforma en un menú
 * compacto dentro del chrome. El carril sigue existiendo y funcionando en las
 * demás experiencias, que no declaran nada y conservan el default.
 *
 * El opt-out es explícito y por componente (`rail={false}`), no por ruta: este
 * layout sirve exclusivamente `/centro-operacional` y sus tres secciones
 * hijas —Panorama, Inteligencia y Auditoría—, que son partes del mismo Centro
 * y comparten su chrome. Ninguna otra ruta pasa por aquí, así que no hay nada
 * que condicionar por `pathname`.
 */
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
    <ExecutiveOperationsProvider enabled={!isHome}>
      <NovexRoom scene="intelligence" environment="pending" rail={false}>
        <NovexFrame environment="pending">
          <MainScreen environment="pending">
            <ScreenDeck
              environment="pending"
              className={`eoc-deck ${isHome ? 'eoc-deck--home' : ''}`}
              header={
                <ExecutiveOperationsChrome
                  helpTitle="Centro operacional"
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
                />
              }
            >
              {/*
                La home reparte su alto entre bandas, así que necesita un alto
                DEFINIDO; las otras tres secciones conservan el alto automático y
                su scroll de siempre. Por eso la variante es una clase de la
                home y no un cambio en la envoltura compartida.
              */}
              <div
                className={`eoc-embedded ${isHome ? 'eoc-embedded--shell' : ''}`.trim()}
              >
                <Outlet />
              </div>
            </ScreenDeck>
          </MainScreen>
        </NovexFrame>
      </NovexRoom>
    </ExecutiveOperationsProvider>
  )
}
