// Componente: tablero ejecutivo — un objetivo: decidir qué atender.

import { useEffect } from 'react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { ROOM_CONTAINER } from '@/modules/monitoring/constants/monitoringTheme'
import { DashboardOperationalSummary } from '@/modules/operational-events/components/dashboard/DashboardOperationalSummary'
import {
  DashboardEmptyState,
  DashboardErrorState,
  DashboardLoadingState,
} from '@/modules/operational-events/components/dashboard/DashboardStateViews'
import { IntelligenceExecutiveBrief } from '@/modules/operational-events/components/dashboard/IntelligenceExecutiveBrief'
import { PrioritySituationsList } from '@/modules/operational-events/components/dashboard/PrioritySituationsList'
import { useExecutiveDashboard } from '@/modules/operational-events/hooks/useExecutiveDashboard'
import type { OperationalEnvironmentStatus } from '@/modules/operational-events/types/operational-event.types'
import { RegisterSituationCta } from '@/shared/components/RegisterSituationCta'
import { CunmarkIcon } from '@/shared/components/CunmarkIcon'

interface OperationalIntelligenceDashboardProps {
  onEnvironmentChange?: (environment: OperationalEnvironmentStatus) => void
}

export function OperationalIntelligenceDashboard({
  onEnvironmentChange,
}: OperationalIntelligenceDashboardProps) {
  const { bootSplashActive } = useAuth()
  const { data, loading, error, isEmpty, reload } = useExecutiveDashboard()

  const showSectionLoader = loading && !bootSplashActive

  useEffect(() => {
    if (data) {
      onEnvironmentChange?.(data.environment)
    }
  }, [data, onEnvironmentChange])

  return (
    <div className={`${ROOM_CONTAINER} relative min-h-0 flex-1`}>
      <div className="cunmark-workstation relative flex min-h-0 flex-1 flex-col">
        {showSectionLoader ? (
          <DashboardLoadingState />
        ) : loading ? null : error ? (
          <DashboardErrorState message={error} onRetry={() => void reload()} />
        ) : isEmpty ? (
          <DashboardEmptyState />
        ) : data ? (
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
                  Capture un evento o incidente para documentarlo y llevar
                  seguimiento de su evolución.
                </p>
              </div>
              <RegisterSituationCta
                variant="footer"
                label="+ Registrar situación"
              />
            </section>

            <IntelligenceExecutiveBrief narrative={data.executiveNarrative} />

            <DashboardOperationalSummary data={data} />

            <div className="cunmark-intel-board">
              <PrioritySituationsList situations={data.prioritySituations} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
