// Página: Centro de Eventos Operacionales.
// Consume el OperationalEventsProvider global (app/providers).

import { useCallback, useState } from 'react'
import { ScreenDeck } from '@/modules/monitoring/components/ScreenDeck'
import { OperationalEventsCenter } from '@/modules/operational-events/components/OperationalEventsCenter'
import type { OperationalEnvironmentStatus } from '@/modules/operational-events/types/operational-event.types'
import { MainScreen, OmegaFrame, OmegaRoom } from '@/modules/room'
import type { EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'
import { OmegaProductHeader } from '@/shared/components/OmegaProductHeader'

function toRoomEnvironment(
  status: OperationalEnvironmentStatus,
): EnvironmentStatus {
  return status
}

export function OperationalEventsCenterPage() {
  const [environment, setEnvironment] =
    useState<EnvironmentStatus>('pending')

  const handleEnvironmentChange = useCallback(
    (next: OperationalEnvironmentStatus) => {
      setEnvironment(toRoomEnvironment(next))
    },
    [],
  )

  return (
    <OmegaRoom environment={environment}>
      <OmegaFrame environment={environment}>
        <MainScreen environment={environment}>
          <ScreenDeck
            environment={environment}
            header={
              <OmegaProductHeader title="Eventos" />
            }
          >
            <OperationalEventsCenter
              onEnvironmentChange={handleEnvironmentChange}
            />
          </ScreenDeck>
        </MainScreen>
      </OmegaFrame>
    </OmegaRoom>
  )
}
