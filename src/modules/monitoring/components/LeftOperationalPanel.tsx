import type { Commitment } from '@/modules/commitments/types/commitment.types'
import { OperationalAnimationSlot } from '@/modules/monitoring/components/OperationalAnimationSlot'
import { SelectedCommitmentPanel } from '@/modules/monitoring/components/SelectedCommitmentPanel'

interface LeftOperationalPanelProps {
  selectedCommitment: Commitment | null
  canValidate: boolean
  isUpdating: boolean
  onValidateCommitment: (status: 'Cumplido' | 'Incumplido') => void
}

export function LeftOperationalPanel({
  selectedCommitment,
  canValidate,
  isUpdating,
  onValidateCommitment,
}: LeftOperationalPanelProps) {
  return (
    <aside className="left-operational-panel">
      <div className="left-operational-panel__animation">
        <OperationalAnimationSlot />
      </div>
      <div className="left-operational-panel__commitment">
        <SelectedCommitmentPanel
          commitment={selectedCommitment}
          canValidate={canValidate}
          isUpdating={isUpdating}
          onValidate={onValidateCommitment}
        />
      </div>
    </aside>
  )
}
