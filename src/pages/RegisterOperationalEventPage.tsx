// Página: captura de eventos operacionales.
// Consume el OperationalEventsProvider global (app/providers).

import { MainScreen, OmegaFrame, OmegaRoom } from '@/modules/room'
import { OperationalEventWizard } from '@/modules/operational-events/components/OperationalEventWizard'
import { ScreenDeck } from '@/modules/monitoring/components/ScreenDeck'
import { OmegaProductHeader } from '@/shared/components/OmegaProductHeader'

export function RegisterOperationalEventPage() {
  return (
    <OmegaRoom environment="pending" scene="register">
      <OmegaFrame environment="pending">
        <MainScreen environment="pending">
          <ScreenDeck
            environment="pending"
            header={<OmegaProductHeader title="Registro" />}
          >
            <OperationalEventWizard />
          </ScreenDeck>
        </MainScreen>
      </OmegaFrame>
    </OmegaRoom>
  )
}
