import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { getEffectiveDashboardRole } from '@/modules/auth/utils/roleExperience'
import { ROOM_CONTAINER } from '@/modules/monitoring/constants/monitoringTheme'
import {
  DashboardErrorState,
  DashboardLoadingState,
} from '@/modules/operational-events/components/dashboard/DashboardStateViews'
import { RoleDashboardExperience } from '@/modules/operational-events/components/dashboard/RoleDashboardExperience'
import { useExecutiveDashboard } from '@/modules/operational-events/hooks/useExecutiveDashboard'
import type { OperationalEnvironmentStatus } from '@/modules/operational-events/types/operational-event.types'

interface OperationalIntelligenceDashboardProps {
  onEnvironmentChange?: (environment: OperationalEnvironmentStatus) => void
}

export function OperationalIntelligenceDashboard({
  onEnvironmentChange,
}: OperationalIntelligenceDashboardProps) {
  const { bootSplashActive, user } = useAuth()
  const [searchParams] = useSearchParams()
  const role = getEffectiveDashboardRole(user, searchParams.get('preview'))
  const { data, loading, error, reload } = useExecutiveDashboard()
  const showSectionLoader = loading && !bootSplashActive

  useEffect(() => {
    if (data) onEnvironmentChange?.(data.environment)
  }, [data, onEnvironmentChange])

  return (
    <div className={`${ROOM_CONTAINER} relative min-h-0 flex-1`}>
      <div className="novex-workstation relative flex min-h-0 flex-1 flex-col">
        {showSectionLoader ? (
          <DashboardLoadingState />
        ) : loading ? null : error ? (
          <DashboardErrorState message={error} onRetry={() => void reload()} />
        ) : data ? (
          <RoleDashboardExperience
            data={data}
            role={role}
            previewing={
              user?.roleCode === 'ADMIN' && Boolean(searchParams.get('preview'))
            }
          />
        ) : null}
      </div>
    </div>
  )
}
