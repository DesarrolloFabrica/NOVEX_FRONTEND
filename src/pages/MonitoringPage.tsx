// Capa: página Gestión de situaciones — Centro de Gestión Operativa.
// Ruta: /gestion

import { useMemo } from 'react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { canUpdateSituationStatus } from '@/modules/auth/utils/permissions'
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

  const {
    pageItems,
    summary,
    queueQuery,
    totalFiltered,
    totalPages,
    totalAvailable,
    selectedSituationId,
    dossier,
    loadingList,
    loadingDossier,
    updatingStatus,
    listError,
    dossierError,
    updateError,
    selectSituation,
    setQueueSearch,
    setQueueStatus,
    setQueueSeverity,
    setQueueSla,
    setQueuePage,
    setQueuePageSize,
    applySummaryFilter,
    updateStatus,
  } = useSituationManagement()

  const environment = useMemo(() => resolveEnvironment(summary), [summary])
  const canUpdate = canUpdateSituationStatus(user, dossier?.situation)

  return (
    <NovexRoom environment={environment} scene="commitments">
      <NovexFrame environment={environment}>
        <MainScreen environment={environment}>
          <MonitoringCenter
            user={user}
            pageItems={pageItems}
            summary={summary}
            queueQuery={queueQuery}
            totalFiltered={totalFiltered}
            totalPages={totalPages}
            totalAvailable={totalAvailable}
            selectedSituationId={selectedSituationId}
            dossier={dossier}
            listLoading={loadingList}
            dossierLoading={loadingDossier}
            listError={listError}
            dossierError={dossierError}
            updateError={updateError}
            canUpdate={canUpdate}
            isUpdating={updatingStatus}
            environment={environment}
            onSelectSituation={selectSituation}
            onSearchChange={setQueueSearch}
            onStatusFilterChange={setQueueStatus}
            onSeverityFilterChange={setQueueSeverity}
            onSlaFilterChange={setQueueSla}
            onPageChange={setQueuePage}
            onPageSizeChange={setQueuePageSize}
            onSummaryFilter={applySummaryFilter}
            onUpdateSituationStatus={updateStatus}
            onLogout={() => void logout()}
          />
        </MainScreen>
      </NovexFrame>
    </NovexRoom>
  )
}
