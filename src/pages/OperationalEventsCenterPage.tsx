// Página: Centro de Eventos Operacionales.
// Consume el OperationalEventsProvider global (app/providers).

import { useCallback, useState } from 'react'
import { ScreenDeck } from '@/modules/monitoring/components/ScreenDeck'
import { OperationalEventsCenter } from '@/modules/operational-events/components/OperationalEventsCenter'
import type { OperationalEnvironmentStatus } from '@/modules/operational-events/types/operational-event.types'
import { MainScreen, CunmarkFrame, CunmarkRoom } from '@/modules/room'
import type { EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'
import { CunmarkProductHeader } from '@/shared/components/CunmarkProductHeader'

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
    <CunmarkRoom environment={environment} scene="events">
      <CunmarkFrame environment={environment}>
        <MainScreen environment={environment}>
          <ScreenDeck
            environment={environment}
            header={
              <CunmarkProductHeader
                title="Situaciones registradas"
                help={
                  <>
                    <p>
                      Aquí encuentra el historial de situaciones operacionales
                      reportadas, con su estado y la interpretación vigente.
                    </p>
                    <p>
                      Abra una situación para revisar el detalle, el análisis de
                      la IA y las acciones recomendadas.
                    </p>
                  </>
                }
              />
            }
          >
            <OperationalEventsCenter
              onEnvironmentChange={handleEnvironmentChange}
            />
          </ScreenDeck>
        </MainScreen>
      </CunmarkFrame>
    </CunmarkRoom>
  )
}
