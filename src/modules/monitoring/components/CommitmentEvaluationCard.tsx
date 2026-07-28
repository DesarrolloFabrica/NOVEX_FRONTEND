import type { ExecutionAction } from '@/modules/execution-actions/types/execution-action.types'
import { PRIORITY_LABELS } from '@/modules/execution-actions/types/execution-action.types'
import { FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'
import { CunmarkIcon } from '@/shared/components/CunmarkIcon'

interface Props { action: ExecutionAction; selected: boolean; onSelect: (actionId: string) => void }
const statusLabels: Record<ExecutionAction['executionStatus'], string> = { pending: 'En espera', in_progress: 'En proceso', executed: 'Resuelta', not_executable: 'No fue posible resolver' }
const formatDate = (iso: string) => new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })

export function CommitmentEvaluationCard({ action, selected, onSelect }: Props) {
  return <button type="button" onClick={() => onSelect(action.id)} aria-pressed={selected} data-status={action.executionStatus} data-priority={action.priority} className={`cunmark-action-row group relative w-full text-left ${FOCUS_VISIBLE}`}>
    <div className="cunmark-action-row__layout relative z-10">
      <span className="cunmark-action-row__priority"><i aria-hidden="true" />{PRIORITY_LABELS[action.priority]}</span>
      <span className="cunmark-action-row__main"><span className="cunmark-action-row__title" title={action.eventTitle}>{action.eventTitle}</span></span>
      <span className="cunmark-action-row__responsible"><small>Área responsable</small>{action.suggestedAreaName}</span>
      <span className="cunmark-action-row__status"><i aria-hidden="true" />{statusLabels[action.executionStatus]}</span>
      <time dateTime={action.suggestedAt} className="cunmark-action-row__date"><CunmarkIcon name="calendar" size={13} />{formatDate(action.suggestedAt)}</time>
      <CunmarkIcon name="chevron-right" size={18} className="cunmark-action-row__chevron" />
    </div>
  </button>
}
