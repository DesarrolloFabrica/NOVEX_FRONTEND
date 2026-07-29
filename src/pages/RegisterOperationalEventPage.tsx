// Página: captura de eventos operacionales.
// Consume el OperationalEventsProvider global (app/providers).

import { MainScreen, NovexFrame, NovexRoom } from '@/modules/room'
import { OperationalEventWizard } from '@/modules/operational-events/components/OperationalEventWizard'
import { ScreenDeck } from '@/modules/monitoring/components/ScreenDeck'
import { NovexProductHeader } from '@/shared/components/NovexProductHeader'

export function RegisterOperationalEventPage() {
  return (
    <NovexRoom environment="pending" scene="register">
      <NovexFrame environment="pending">
        <MainScreen environment="pending">
          <ScreenDeck
            environment="pending"
            header={
              <NovexProductHeader
                title="Registrar situación"
                help={
                  <>
                    <p>
                      Use esta vista para capturar un nuevo evento operativo:
                      qué ocurrió, en qué área y con qué evidencia disponible.
                    </p>
                    <p>
                      Al finalizar, la Inteligencia Operacional generará el
                      análisis y las acciones recomendadas para el seguimiento.
                    </p>
                  </>
                }
              />
            }
          >
            <OperationalEventWizard />
          </ScreenDeck>
        </MainScreen>
      </NovexFrame>
    </NovexRoom>
  )
}
