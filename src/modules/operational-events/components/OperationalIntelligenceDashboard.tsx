// Componente: tablero ejecutivo — un objetivo: decidir qué atender.

import { useEffect, useMemo } from 'react'
import { ROOM_CONTAINER } from '@/modules/monitoring/constants/monitoringTheme'
import { IntelligenceExecutiveBrief } from '@/modules/operational-events/components/dashboard/IntelligenceExecutiveBrief'
import { OperationalSummaryBar } from '@/modules/operational-events/components/dashboard/OperationalSummaryBar'
import { PriorityEventsList } from '@/modules/operational-events/components/dashboard/PriorityEventsList'
import { useOperationalEvents } from '@/modules/operational-events/hooks/useOperationalEvents'
import { selectGlobalDashboardMetrics } from '@/modules/operational-events/selectors/operationalIntelligence.selectors'
import { selectPriorityEvents } from '@/modules/operational-events/selectors/priorityEvents.selectors'
import type { OperationalEnvironmentStatus } from '@/modules/operational-events/types/operational-event.types'
import { RegisterSituationCta } from '@/shared/components/RegisterSituationCta'
import { OmegaIcon } from '@/shared/components/OmegaIcon'

interface OperationalIntelligenceDashboardProps {
  onEnvironmentChange?: (environment: OperationalEnvironmentStatus) => void
}

export function OperationalIntelligenceDashboard({
  onEnvironmentChange,
}: OperationalIntelligenceDashboardProps) {
  const { items, loading, error, loadOperationalEvents } = useOperationalEvents()

  useEffect(() => {
    void loadOperationalEvents()
  }, [loadOperationalEvents])

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
      <div className="omega-workstation relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {loading ? (
          <p
            className="omega-ai-state omega-ai-state--loading"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            Cargando análisis operacional…
          </p>
        ) : error ? (
          <p role="alert" className="omega-ai-state omega-ai-state--error">
            {error}
          </p>
        ) : (
          <div className="omega-intel-shell omega-intelligence-v2">
            <section
              className="omega-intel-create"
              aria-labelledby="omega-intel-create-title"
            >
              <span className="omega-intel-create__icon" aria-hidden="true">
                <OmegaIcon name="plus" size={17} strokeWidth={1.5} />
              </span>
              <div className="omega-intel-create__copy">
                <div className="omega-intel-create__heading">
                  <h2 id="omega-intel-create-title">
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

            <div className="omega-intel-focus">
              <PriorityEventsList events={priorityEvents} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
