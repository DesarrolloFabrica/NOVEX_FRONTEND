// Página principal: Tablero ejecutivo de Visión general.
// Consume el OperationalEventsProvider global (app/providers).

import { useCallback, useState } from 'react'
import { ScreenDeck } from '@/modules/monitoring/components/ScreenDeck'
import type { EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'
import { OperationalIntelligenceDashboard } from '@/modules/operational-events/components/OperationalIntelligenceDashboard'
import type { OperationalEnvironmentStatus } from '@/modules/operational-events/types/operational-event.types'
import { MainScreen, CunmarkFrame, CunmarkRoom } from '@/modules/room'
import { CunmarkProductHeader } from '@/shared/components/CunmarkProductHeader'

export function OperationalIntelligencePage() {
  const [environment, setEnvironment] =
    useState<EnvironmentStatus>('pending')

  const handleEnvironmentChange = useCallback(
    (next: OperationalEnvironmentStatus) => {
      setEnvironment(next)
    },
    [],
  )

  return (
    <CunmarkRoom environment={environment} scene="intelligence">
      <CunmarkFrame environment={environment}>
        <MainScreen environment={environment}>
          <ScreenDeck
            environment={environment}
            header={
              <CunmarkProductHeader
                title="Dashboard"
                help={
                  <>
                    <p>
                      Aquí puede consultar el registro de situaciones, su estado
                      y el historial de seguimiento institucional.
                    </p>
                    <p>
                      Use <b>Registrar situación</b> cuando ocurra un nuevo evento
                      operativo que deba documentarse.
                    </p>
                  </>
                }
              />
            }
          >
            <OperationalIntelligenceDashboard
              onEnvironmentChange={handleEnvironmentChange}
            />
          </ScreenDeck>
        </MainScreen>
      </CunmarkFrame>
    </CunmarkRoom>
  )
}
