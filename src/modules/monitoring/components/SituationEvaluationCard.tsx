import type { SituationListItem } from '@/modules/api/types/situation-management.types'
import { FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'
import {
  formatManagementDateShort,
  SITUATION_SEVERITY_LABEL,
  SITUATION_STATUS_LABEL,
} from '@/modules/monitoring/utils/situation-management.presentation'
import { CunmarkIcon } from '@/shared/components/CunmarkIcon'

interface SituationEvaluationCardProps {
  situation: SituationListItem
  selected: boolean
  onSelect: (situationId: string) => void
}

export function SituationEvaluationCard({
  situation,
  selected,
  onSelect,
}: SituationEvaluationCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(situation.id)}
      aria-pressed={selected}
      data-status={situation.status.toLowerCase()}
      data-priority={situation.severity.toLowerCase()}
      className={`cunmark-action-row group relative w-full text-left ${FOCUS_VISIBLE}`}
    >
      <div className="cunmark-action-row__layout relative z-10">
        <span className="cunmark-action-row__priority">
          <i aria-hidden="true" />
          {SITUATION_SEVERITY_LABEL[situation.severity] ?? situation.severity}
        </span>
        <span className="cunmark-action-row__main">
          <span className="cunmark-action-row__title" title={situation.title}>
            {situation.title}
          </span>
        </span>
        <span className="cunmark-action-row__responsible">
          <small>Coordinación responsable</small>
          {situation.coordinationName}
        </span>
        <span className="cunmark-action-row__status">
          <i aria-hidden="true" />
          {SITUATION_STATUS_LABEL[situation.status] ?? situation.status}
        </span>
        <time dateTime={situation.occurredAt} className="cunmark-action-row__date">
          <CunmarkIcon name="calendar" size={13} />
          {formatManagementDateShort(situation.occurredAt)}
        </time>
        <CunmarkIcon name="arrow-up-right" size={18} className="cunmark-action-row__chevron" />
      </div>
    </button>
  )
}
