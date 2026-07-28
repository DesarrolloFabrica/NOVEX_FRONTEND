import type { User } from '@/modules/auth/types/user.types'
import type {
  ExecutionAction,
  ExecutionActionStatus,
} from '@/modules/execution-actions/types/execution-action.types'
import type { EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'
import { MonitoringHeader } from '@/modules/monitoring/components/MonitoringHeader'
import { ScreenDeck } from '@/modules/monitoring/components/ScreenDeck'
import { SelectedCommitmentPanel } from '@/modules/monitoring/components/SelectedCommitmentPanel'
import { EvaluationConsole } from '@/modules/monitoring/components/EvaluationConsole'
import { IntelligencePanel } from '@/modules/monitoring/components/IntelligencePanel'
import { SituationDetailModal } from '@/modules/operational-events/components/SituationDetailModal'
import { OPERATIONAL_EVENTS } from '@/modules/operational-events/data/operational-events.mock'
import { useState } from 'react'

interface MonitoringCenterProps {
  user: User | null
  actions: ExecutionAction[]
  selectedAction: ExecutionAction | null
  selectedActionId: string | null
  loading: boolean
  error: string | null
  canUpdate: boolean
  isUpdating: boolean
  environment: EnvironmentStatus
  onSelectAction: (actionId: string) => void
  onUpdateStatus: (input: {
    status: ExecutionActionStatus
    note?: string
    observation?: string
  }) => Promise<void> | void
  onLogout: () => void
}

function ExecutionSummary({ actions }: { actions: ExecutionAction[] }) {
  const counts = {
    pending: actions.filter((item) => item.executionStatus === 'pending').length,
    inProgress: actions.filter(
      (item) => item.executionStatus === 'in_progress',
    ).length,
    executed: actions.filter((item) => item.executionStatus === 'executed')
      .length,
    notExecutable: actions.filter(
      (item) => item.executionStatus === 'not_executable',
    ).length,
    critical: actions.filter((item) => item.priority === 'immediate').length,
  }

  const indicators = [
    ['En espera', counts.pending],
    ['En proceso', counts.inProgress],
    ['Resueltas', counts.executed],
    ['No fue posible resolver', counts.notExecutable],
    ['Atención inmediata', counts.critical],
  ] as const

  return (
    <section className="cunmark-execution-summary" aria-label="Resumen ejecutivo">
      {indicators.map(([label, value]) => (
        <div key={label} className="cunmark-execution-summary__item">
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </section>
  )
}

export function MonitoringCenter({
  user,
  actions,
  selectedAction,
  selectedActionId,
  loading,
  error,
  canUpdate,
  isUpdating,
  environment,
  onSelectAction,
  onUpdateStatus,
  onLogout,
}: MonitoringCenterProps) {
  const [showAnalysis, setShowAnalysis] = useState(false)
  const executiveEvent = selectedAction
    ? OPERATIONAL_EVENTS.find((event) => event.id === selectedAction.eventId) ?? OPERATIONAL_EVENTS[0]
    : null
  return (
    <ScreenDeck
      environment={environment}
      className="cunmark-monitoring-deck"
      header={
        <MonitoringHeader
          user={user}
          environment={environment}
          onLogout={onLogout}
        />
      }
    >
      <main className="cunmark-execution-flow">
        <ExecutionSummary actions={actions} />

        <EvaluationConsole
          actions={actions}
          selectedActionId={selectedActionId}
          loading={loading}
          error={error}
          onSelectAction={onSelectAction}
        />

        <section
          className="cunmark-execution-detail"
          aria-label="Expediente operativo de la situación"
        >
          <SelectedCommitmentPanel
            action={selectedAction}
            canUpdate={canUpdate}
            isUpdating={isUpdating}
            onUpdateStatus={onUpdateStatus}
          />
          <IntelligencePanel action={selectedAction} onOpenAnalysis={() => setShowAnalysis(true)} />
        </section>
      </main>
      {showAnalysis && executiveEvent ? <SituationDetailModal event={executiveEvent} onClose={() => setShowAnalysis(false)} /> : null}
    </ScreenDeck>
  )
}
