// Capa: página Gestión de situaciones — Centro de Gestión Operativa.
// Ruta: /gestion

import { useMemo } from 'react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { canUpdateSituations } from '@/modules/auth/utils/permissions'
import { useSituationManagement } from '@/modules/monitoring/hooks/useSituationManagement'
import { MonitoringCenter } from '@/modules/monitoring/components/MonitoringCenter'
import { MainScreen, NovexFrame, NovexRoom } from '@/modules/room'
import type { EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'
import type { SituationManagementSummary } from '@/modules/api/types/situation-management.types'

function resolveEnvironment(summary: SituationManagementSummary): EnvironmentStatus {
  if (summary.total === 0) return 'pending'
  if (summary.critical > 0) return 'critical'
  if (summary.open + summary.inProgress > summary.total / 2) return 'attention'
  if (summary.open + summary.inProgress > 0) return 'attention'
  return 'healthy'
}

export function MonitoringPage() {
  const { user, logout } = useAuth()
  const canUpdate = canUpdateSituations(user)

  const {
    situations,
    summary,
    selectedSituationId,
    dossier,
    listLoading,
    dossierLoading,
    listError,
    dossierError,
    isUpdating,
    setSelectedSituationId,
    updateSituation,
  } = useSituationManagement()

  const environment = useMemo(() => resolveEnvironment(summary), [summary])

  return (
    <NovexRoom environment={environment} scene="commitments">
      <NovexFrame environment={environment}>
        <MainScreen environment={environment}>
          <MonitoringCenter
            user={user}
            situations={situations}
            summary={summary}
            selectedSituationId={selectedSituationId}
            dossier={dossier}
            listLoading={listLoading}
            dossierLoading={dossierLoading}
            listError={listError}
            dossierError={dossierError}
            canUpdate={canUpdate}
            isUpdating={isUpdating}
            environment={environment}
            onSelectSituation={setSelectedSituationId}
            onUpdateSituationStatus={updateSituation}
            onLogout={() => void logout()}
          />
        </MainScreen>
      </NovexFrame>
    </NovexRoom>
  )
}
