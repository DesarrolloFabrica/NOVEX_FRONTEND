// Capa: página Gestión de situaciones — Centro de Gestión Operativa.
// Ruta: /gestion

import { useCallback, useMemo } from 'react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { useSituationManagement } from '@/modules/monitoring/hooks/useSituationManagement'
import { MonitoringCenter } from '@/modules/monitoring/components/MonitoringCenter'
import { MainScreen, CunmarkFrame, CunmarkRoom } from '@/modules/room'
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
  const canUpdate = user != null

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
    updateRecommendation,
  } = useSituationManagement()

  const environment = useMemo(() => resolveEnvironment(summary), [summary])

  const handleUpdateRecommendationStatus = useCallback(
    async (recommendationId: string, status: string) => {
      if (!canUpdate) return
      await updateRecommendation(recommendationId, { status })
    },
    [canUpdate, updateRecommendation],
  )

  return (
    <CunmarkRoom environment={environment} scene="commitments">
      <CunmarkFrame environment={environment}>
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
            onUpdateRecommendationStatus={handleUpdateRecommendationStatus}
            onLogout={() => void logout()}
          />
        </MainScreen>
      </CunmarkFrame>
    </CunmarkRoom>
  )
}
