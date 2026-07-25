// Página principal: Tablero ejecutivo del Centro de Inteligencia Operacional.
// Consume el OperationalEventsProvider global (app/providers).

import { useCallback, useState } from 'react'
import { ScreenDeck } from '@/modules/monitoring/components/ScreenDeck'
import type { EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'
import { OperationalIntelligenceDashboard } from '@/modules/operational-events/components/OperationalIntelligenceDashboard'
import type { OperationalEnvironmentStatus } from '@/modules/operational-events/types/operational-event.types'
import { MainScreen, OmegaFrame, OmegaRoom } from '@/modules/room'
import { OmegaProductHeader } from '@/shared/components/OmegaProductHeader'

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
    <OmegaRoom environment={environment} scene="intelligence">
      <OmegaFrame environment={environment}>
        <MainScreen environment={environment}>
          <ScreenDeck
            environment={environment}
            header={<OmegaProductHeader title="Inteligencia" />}
          >
            <OperationalIntelligenceDashboard
              onEnvironmentChange={handleEnvironmentChange}
            />
          </ScreenDeck>
        </MainScreen>
      </OmegaFrame>
    </OmegaRoom>
  )
}
