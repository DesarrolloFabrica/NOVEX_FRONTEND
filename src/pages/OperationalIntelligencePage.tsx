// Página principal: Tablero ejecutivo de Visión general.
// Consume el OperationalEventsProvider global (app/providers).

import { useCallback, useState } from 'react'
import { ScreenDeck } from '@/modules/monitoring/components/ScreenDeck'
import type { EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'
import { OperationalIntelligenceDashboard } from '@/modules/operational-events/components/OperationalIntelligenceDashboard'
import type { OperationalEnvironmentStatus } from '@/modules/operational-events/types/operational-event.types'
import { MainScreen, NovexFrame, NovexRoom } from '@/modules/room'
import { NovexProductHeader } from '@/shared/components/NovexProductHeader'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { getEffectiveDashboardRole } from '@/modules/auth/utils/roleExperience'
import { useSearchParams } from 'react-router-dom'

const HEADER_BY_ROLE = {
  COORDINADOR: {
    title: 'Panel de coordinación',
    eyebrow: 'Operación local',
    context: 'Registro, historial y seguimiento de su coordinación',
  },
  ANALISTA: {
    title: 'Centro de monitoreo',
    eyebrow: 'Supervisión operacional',
    context: 'Visión global, prioridades y actividad reciente',
  },
  DIRECTOR: {
    title: 'Command Center',
    eyebrow: 'Dirección ejecutiva',
    context: 'Riesgos, impacto e indicadores institucionales',
  },
  ADMIN: {
    title: 'Vista operacional',
    eyebrow: 'Soporte de plataforma',
    context: 'Supervisión global de la operación',
  },
} as const

export function OperationalIntelligencePage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const role = getEffectiveDashboardRole(user, searchParams.get('preview'))
  const header = HEADER_BY_ROLE[role]
  const [environment, setEnvironment] = useState<EnvironmentStatus>('pending')

  const handleEnvironmentChange = useCallback(
    (next: OperationalEnvironmentStatus) => {
      setEnvironment(next)
    },
    [],
  )

  return (
    <NovexRoom environment={environment} scene="intelligence">
      <NovexFrame environment={environment}>
        <MainScreen environment={environment}>
          <ScreenDeck
            environment={environment}
            header={
              <NovexProductHeader
                title={header.title}
                eyebrow={header.eyebrow}
                context={header.context}
                help={
                  <>
                    <p>
                      Aquí puede consultar el registro de situaciones, su estado
                      y el historial de seguimiento institucional.
                    </p>
                    <p>
                      Use <b>Registrar situación</b> cuando ocurra un nuevo
                      evento operativo que deba documentarse.
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
      </NovexFrame>
    </NovexRoom>
  )
}
