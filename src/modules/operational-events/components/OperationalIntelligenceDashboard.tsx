// Componente: tablero ejecutivo — arquitectura de mando (Sprint 10).
// Solo consume DashboardMetrics + eventos priorizados. Sin lógica nueva.

import { useEffect, useMemo, type CSSProperties } from 'react'
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
          <p
            className="omega-ai-state omega-ai-state--loading"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            Cargando inteligencia operacional…
          </p>
        ) : error ? (
          <p
            role="alert"
            className="omega-ai-state omega-ai-state--error"
          >
            {error}
          </p>
        ) : (
          <div
            className="omega-intel-board"
            style={
              {
                '--omega-risk-level': `${Math.min(100, metrics.averageRiskScore)}%`,
              } as CSSProperties
            }
          >
            <OperationalStateHero metrics={metrics} />
            <section
              className="omega-orbital-hero"
              aria-label="Gemelo digital de inteligencia operacional"
            >
              <div className="omega-orbital-hero__visual" aria-hidden="true">
                <img
                  src="/assests/scenes/omega-city-intelligence.jpg"
                  alt=""
                  draggable={false}
                />
                <span className="omega-orbital-hero__scan" />
                <span className="omega-orbital-hero__reticle omega-orbital-hero__reticle--one" />
                <span className="omega-orbital-hero__reticle omega-orbital-hero__reticle--two" />
              </div>
              <div className="omega-orbital-node omega-orbital-node--primary">
                <span aria-hidden="true" />
                <div>
                  <small>Concentración activa</small>
                  <strong>{metrics.dominantAreaName ?? 'Cobertura global'}</strong>
                </div>
              </div>
              <div className="omega-orbital-node omega-orbital-node--secondary">
                <span aria-hidden="true" />
                <div>
                  <small>Vector dominante</small>
                  <strong>{metrics.dominantCategoryName ?? 'Operación estable'}</strong>
                </div>
              </div>
              <div className="omega-orbital-hero__coverage">
                <div>
                  <small>Índice de exposición operacional</small>
                  <strong>{metrics.averageRiskScore}%</strong>
                </div>
                <span className="omega-orbital-hero__track">
                  <span />
                </span>
              </div>
            </section>
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
