import type { SituationListItem } from '@/modules/api/types/situation-management.types'
import { FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'
import {
  formatManagementDateShort,
  SITUATION_SEVERITY_LABEL,
  SITUATION_STATUS_LABEL,
} from '@/modules/monitoring/utils/situation-management.presentation'
import { NovexIcon } from '@/shared/components/NovexIcon'

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
      className={`novex-action-row group relative w-full text-left ${FOCUS_VISIBLE}`}
    >
      <div className="novex-action-row__layout relative z-10">
        <span className="novex-action-row__priority">
          <i aria-hidden="true" />
          {SITUATION_SEVERITY_LABEL[situation.severity] ?? situation.severity}
        </span>
        <span className="novex-action-row__main">
          <span className="novex-action-row__title" title={situation.title}>
            {situation.title}
          </span>
        </span>
        <span className="novex-action-row__responsible">
          <small>Coordinación responsable</small>
          {situation.coordinationName}
        </span>
        <span className="novex-action-row__status">
          <i aria-hidden="true" />
          {SITUATION_STATUS_LABEL[situation.status] ?? situation.status}
        </span>
        <time dateTime={situation.occurredAt} className="novex-action-row__date">
          <NovexIcon name="calendar" size={13} />
          {formatManagementDateShort(situation.occurredAt)}
        </time>
        <NovexIcon name="arrow-up-right" size={18} className="novex-action-row__chevron" />
      </div>
    </button>
  )
}
