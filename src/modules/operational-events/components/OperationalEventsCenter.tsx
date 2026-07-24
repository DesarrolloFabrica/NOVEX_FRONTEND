// Componente: orquestador del Centro de Eventos Operacionales.
// Carga eventos del módulo, deriva métricas con el motor y compone la sala.

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MonitoringLayout } from '@/modules/monitoring/components/MonitoringLayout'
import { EventsCenterSummary } from '@/modules/operational-events/components/EventsCenterSummary'
import { EventsConsole } from '@/modules/operational-events/components/EventsConsole'
import { SelectedEventPanel } from '@/modules/operational-events/components/SelectedEventPanel'
import { useOperationalEvents } from '@/modules/operational-events/hooks/useOperationalEvents'
import {
  selectEventById,
  selectGlobalDashboardMetrics,
} from '@/modules/operational-events/selectors/operationalIntelligence.selectors'
import {
  DEFAULT_EVENT_LIST_QUERY,
  type EventListQuery,
} from '@/modules/operational-events/utils/eventListQuery'
import type { OperationalEnvironmentStatus } from '@/modules/operational-events/types/operational-event.types'

interface OperationalEventsCenterProps {
  onEnvironmentChange?: (environment: OperationalEnvironmentStatus) => void
}

export function OperationalEventsCenter({
  onEnvironmentChange,
}: OperationalEventsCenterProps) {
  const { items, loading, error, loadOperationalEvents } = useOperationalEvents()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState<EventListQuery>(DEFAULT_EVENT_LIST_QUERY)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  useEffect(() => {
    void loadOperationalEvents()
  }, [loadOperationalEvents])

  // Deep-link desde el tablero ejecutivo: /operational-events?event=evt-xxx
  useEffect(() => {
    const focusId = searchParams.get('event')
    if (focusId) setSelectedEventId(focusId)
  }, [searchParams])

  const metrics = useMemo(
    () => selectGlobalDashboardMetrics(items),
    [items],
  )

  useEffect(() => {
    onEnvironmentChange?.(metrics.environment)
  }, [metrics.environment, onEnvironmentChange])

  const selectedEvent = useMemo(
    () => selectEventById(items, selectedEventId),
    [items, selectedEventId],
  )

  return (
    <div className="omega-events-center flex min-h-0 flex-1 flex-col overflow-hidden">
      <MonitoringLayout
        left={<EventsCenterSummary metrics={metrics} />}
        main={
          <EventsConsole
            events={items}
            query={query}
            selectedEventId={selectedEventId}
            loading={loading}
            error={error}
            onQueryChange={setQuery}
            onSelectEvent={setSelectedEventId}
          />
        }
        right={<SelectedEventPanel event={selectedEvent} />}
      />
    </div>
  )
}
