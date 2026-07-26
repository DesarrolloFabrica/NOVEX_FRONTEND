import type { Commitment, CommitmentStatus } from '@/modules/commitments/types/commitment.types'
import type { AreaHealth } from '@/modules/monitoring/types/monitoring.types'
import { SelectedCommitmentPanel } from '@/modules/monitoring/components/SelectedCommitmentPanel'

interface LeftOperationalPanelProps {
  selectedCommitment: Commitment | null
  health: AreaHealth
  canValidate: boolean
  isUpdating: boolean
  onValidateCommitment: (status: CommitmentStatus) => void
}

export function LeftOperationalPanel({
  selectedCommitment,
  health,
  canValidate,
  isUpdating,
  onValidateCommitment,
}: LeftOperationalPanelProps) {
  return (
    <aside className="left-operational-panel">
      <div className="left-operational-panel__commitment left-operational-panel__commitment--solo">
        <SelectedCommitmentPanel
          commitment={selectedCommitment}
          canValidate={canValidate}
          isUpdating={isUpdating}
          onValidate={onValidateCommitment}
        />
      </div>
      <div className="left-operational-panel__summary" aria-label="Resumen de validaciones">
        <div data-tone="fulfilled">
          <span>✓</span>
          <small>Cumplidos</small>
          <strong>{health.fulfilledCount}</strong>
        </div>
        <div data-tone="breached">
          <span>×</span>
          <small>No cumplidos</small>
          <strong>{health.breachedCount}</strong>
        </div>
      </div>
    </aside>
  )
}
