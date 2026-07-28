// Componente: orquestador del Centro de Situaciones.
// Objetivo único: encontrar y abrir una situación.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MonitoringLayout } from '@/modules/monitoring/components/MonitoringLayout'
import { EventsConsole } from '@/modules/operational-events/components/EventsConsole'
import { SituationDetailModal } from '@/modules/operational-events/components/SituationDetailModal'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState<EventListQuery>(DEFAULT_EVENT_LIST_QUERY)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  useEffect(() => {
    void loadOperationalEvents()
  }, [loadOperationalEvents])

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

  const handleSelectEvent = useCallback(
    (eventId: string) => {
      setSelectedEventId(eventId)
      const next = new URLSearchParams(searchParams)
      next.set('event', eventId)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const handleCloseDetail = useCallback(() => {
    setSelectedEventId(null)
    const next = new URLSearchParams(searchParams)
    next.delete('event')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  return (
    <div className="cunmark-events-center cunmark-events-center--feed flex min-h-0 flex-1 flex-col overflow-hidden">
      <MonitoringLayout
        main={
          <EventsConsole
            events={items}
            query={query}
            selectedEventId={selectedEventId}
            loading={loading}
            error={error}
            onQueryChange={setQuery}
            onSelectEvent={handleSelectEvent}
          />
        }
      />

      {selectedEvent ? (
        <SituationDetailModal
          event={selectedEvent}
          onClose={handleCloseDetail}
        />
      ) : null}
    </div>
  )
}
