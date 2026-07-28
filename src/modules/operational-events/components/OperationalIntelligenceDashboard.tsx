// Componente: tablero ejecutivo — un objetivo: decidir qué atender.

import { useEffect, useMemo } from 'react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { ROOM_CONTAINER } from '@/modules/monitoring/constants/monitoringTheme'
import { IntelligenceExecutiveBrief } from '@/modules/operational-events/components/dashboard/IntelligenceExecutiveBrief'
import { OperationalSummaryBar } from '@/modules/operational-events/components/dashboard/OperationalSummaryBar'
import { PriorityEventsList } from '@/modules/operational-events/components/dashboard/PriorityEventsList'
import { useOperationalEvents } from '@/modules/operational-events/hooks/useOperationalEvents'
import { selectGlobalDashboardMetrics } from '@/modules/operational-events/selectors/operationalIntelligence.selectors'
import { selectPriorityEvents } from '@/modules/operational-events/selectors/priorityEvents.selectors'
import type { OperationalEnvironmentStatus } from '@/modules/operational-events/types/operational-event.types'
import { RegisterSituationCta } from '@/shared/components/RegisterSituationCta'
import { CunmarkIcon } from '@/shared/components/CunmarkIcon'
import { CunmarkSectionLoader } from '@/shared/components/CunmarkSectionLoader'

interface OperationalIntelligenceDashboardProps {
  onEnvironmentChange?: (environment: OperationalEnvironmentStatus) => void
}

export function OperationalIntelligenceDashboard({
  onEnvironmentChange,
}: OperationalIntelligenceDashboardProps) {
  const { bootSplashActive } = useAuth()
  const { items, loading, error, loadOperationalEvents } = useOperationalEvents()

  useEffect(() => {
    void loadOperationalEvents()
  }, [loadOperationalEvents])

  // Tras el login el splash de app cubre la transición; el loader de sección
  // solo debe verse en recargas internas (F5), no como segunda pantalla.
  const showSectionLoader = loading && !bootSplashActive

  const metrics = useMemo(
    () => selectGlobalDashboardMetrics(items),
    [items],
  )

  const priorityEvents = useMemo(
    () => selectPriorityEvents(items, 5),
    [items],
  )

  useEffect(() => {
    onEnvironmentChange?.(metrics.environment)
  }, [metrics.environment, onEnvironmentChange])

  return (
    <div
      className={`${ROOM_CONTAINER} relative max-lg:overflow-visible lg:overflow-hidden`}
    >
      <div className="cunmark-workstation relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {showSectionLoader ? (
          <CunmarkSectionLoader />
        ) : loading ? null : error ? (
          <p role="alert" className="cunmark-ai-state cunmark-ai-state--error">
            {error}
          </p>
        ) : (
          <div className="cunmark-intel-shell cunmark-intelligence-v2">
            <section
              className="cunmark-intel-create"
              aria-labelledby="cunmark-intel-create-title"
            >
              <span className="cunmark-intel-create__icon" aria-hidden="true">
                <CunmarkIcon name="plus" size={17} strokeWidth={1.5} />
              </span>
              <div className="cunmark-intel-create__copy">
                <div className="cunmark-intel-create__heading">
                  <h2 id="cunmark-intel-create-title">
                    Registrar nueva situación
                  </h2>
                </div>
                <p>
                  Capture un evento o incidente para que la IA lo analice,
                  priorice y recomiende acciones.
                </p>
              </div>
              <RegisterSituationCta
                variant="footer"
                label="+ Registrar situación"
              />
            </section>

            <IntelligenceExecutiveBrief metrics={metrics} />

            <OperationalSummaryBar
              events={items}
              metrics={metrics}
              topPriority={priorityEvents[0] ?? null}
            />

            <div className="cunmark-intel-focus">
              <PriorityEventsList events={priorityEvents} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
