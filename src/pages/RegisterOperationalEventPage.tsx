// Página: captura de eventos operacionales.
// Consume el OperationalEventsProvider global (app/providers).

import { MainScreen, CunmarkFrame, CunmarkRoom } from '@/modules/room'
import { OperationalEventWizard } from '@/modules/operational-events/components/OperationalEventWizard'
import { ScreenDeck } from '@/modules/monitoring/components/ScreenDeck'
import { CunmarkProductHeader } from '@/shared/components/CunmarkProductHeader'

export function RegisterOperationalEventPage() {
  return (
    <CunmarkRoom environment="pending" scene="register">
      <CunmarkFrame environment="pending">
        <MainScreen environment="pending">
          <ScreenDeck
            environment="pending"
            header={
              <CunmarkProductHeader
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
      </CunmarkFrame>
    </CunmarkRoom>
  )
}
