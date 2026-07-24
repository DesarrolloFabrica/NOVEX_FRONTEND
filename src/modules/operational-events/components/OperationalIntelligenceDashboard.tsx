// Componente: tablero ejecutivo — arquitectura de mando (Sprint 10).
// Solo consume DashboardMetrics + eventos priorizados. Sin lógica nueva.

import { useEffect, useMemo } from 'react'
import {
  CRYSTAL_WORKSTATION_PLATE,
  ROOM_CONTAINER,
} from '@/modules/monitoring/constants/monitoringTheme'
import { PLANE_ETCHED } from '@/modules/monitoring/constants/visualPlanes'
import {
  OperationalContextStrip,
  OperationalStateHero,
} from '@/modules/operational-events/components/dashboard/OperationalStateHero'
import { PriorityEventsList } from '@/modules/operational-events/components/dashboard/PriorityEventsList'
import { RecentOperationalChange } from '@/modules/operational-events/components/dashboard/RecentOperationalChange'
import { useOperationalEvents } from '@/modules/operational-events/hooks/useOperationalEvents'
import { selectGlobalDashboardMetrics } from '@/modules/operational-events/selectors/operationalIntelligence.selectors'
import { selectPriorityEvents } from '@/modules/operational-events/selectors/priorityEvents.selectors'
import type { OperationalEnvironmentStatus } from '@/modules/operational-events/types/operational-event.types'

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
      <div
        className={`omega-workstation ${PLANE_ETCHED} ${CRYSTAL_WORKSTATION_PLATE} relative flex min-h-0 flex-1 flex-col overflow-hidden`}
      >
        {loading ? (
          <p className="py-10 text-center text-sm text-slate-500">
            Cargando inteligencia operacional…
          </p>
        ) : error ? (
          <p role="alert" className="py-10 text-center text-sm text-red-700">
            {error}
          </p>
        ) : (
          <div className="omega-intel-board">
            <OperationalStateHero metrics={metrics} />
            <OperationalContextStrip metrics={metrics} />
            <div className="omega-cmd-main">
              <PriorityEventsList events={priorityEvents} />
              <RecentOperationalChange metrics={metrics} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
