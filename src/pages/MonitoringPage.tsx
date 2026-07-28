// Capa: página Gestión de situaciones — Centro de Gestión Operativa.
// Ruta: /legacy-monitoring
// Responsabilidad: administrar el ciclo de vida de situaciones analizadas por IA.

import { useCallback, useMemo } from 'react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { useExecutionActions } from '@/modules/execution-actions/hooks/useExecutionActions'
import type { ExecutionActionStatus } from '@/modules/execution-actions/types/execution-action.types'
import { MonitoringCenter } from '@/modules/monitoring/components/MonitoringCenter'
import { MainScreen, CunmarkFrame, CunmarkRoom } from '@/modules/room'
import type { EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'

function resolveEnvironment(
  actions: { executionStatus: ExecutionActionStatus }[],
): EnvironmentStatus {
  if (actions.length === 0) return 'pending'
  const blocked = actions.filter(
    (action) => action.executionStatus === 'not_executable',
  ).length
  const pending = actions.filter(
    (action) =>
      action.executionStatus === 'pending' ||
      action.executionStatus === 'in_progress',
  ).length
  if (blocked > 0) return 'critical'
  if (pending > actions.length / 2) return 'attention'
  if (pending > 0) return 'attention'
  return 'healthy'
}

export function MonitoringPage() {
  const { user, logout } = useAuth()
  const canUpdate = user != null

  const {
    actions,
    selectedAction,
    selectedActionId,
    setSelectedActionId,
    loading,
    error,
    isUpdating,
    updateStatus,
  } = useExecutionActions()

  const environment = useMemo(
    () => resolveEnvironment(actions),
    [actions],
  )

  const handleUpdateStatus = useCallback(
    async (input: {
      status: ExecutionActionStatus
      note?: string
      observation?: string
    }) => {
      if (!user || !canUpdate) return
      await updateStatus({
        ...input,
        byUserId: user.id,
        byUserName: user.name,
      })
    },
    [user, canUpdate, updateStatus],
  )

  return (
    <CunmarkRoom environment={environment} scene="commitments">
      <CunmarkFrame environment={environment}>
        <MainScreen environment={environment}>
          <MonitoringCenter
            user={user}
            actions={actions}
            selectedAction={selectedAction}
            selectedActionId={selectedActionId}
            loading={loading}
            error={error}
            canUpdate={canUpdate}
            isUpdating={isUpdating}
            environment={environment}
            onSelectAction={setSelectedActionId}
            onUpdateStatus={handleUpdateStatus}
            onLogout={() => void logout()}
          />
        </MainScreen>
      </CunmarkFrame>
    </CunmarkRoom>
  )
}
