import type { SituationListItem } from '@/modules/api/types/situation-management.types'
import { FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'
import {
  formatManagementDateShort,
  SITUATION_SEVERITY_LABEL,
  SITUATION_STATUS_LABEL,
} from '@/modules/monitoring/utils/situation-management.presentation'

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
  const severityLabel =
    SITUATION_SEVERITY_LABEL[situation.severity] ?? situation.severity
  const statusLabel = SITUATION_STATUS_LABEL[situation.status] ?? situation.status

  return (
    <button
      type="button"
      onClick={() => onSelect(situation.id)}
      aria-pressed={selected}
      aria-label={`${selected ? 'Seleccionada: ' : 'Seleccionar situación: '}${situation.title}. Severidad ${severityLabel}. Estado ${statusLabel}.`}
      data-situation-id={situation.id}
      data-status={situation.status.toLowerCase()}
      data-priority={situation.severity.toLowerCase()}
      className={`novex-action-row group relative w-full text-left ${FOCUS_VISIBLE}${
        selected ? ' novex-action-row--selected' : ''
      }`}
    >
      <div className="novex-action-row__layout relative z-10">
        <div className="novex-action-row__badges">
          <span className="novex-action-row__priority">
            <i aria-hidden="true" />
            {severityLabel}
          </span>
          <span className="novex-action-row__status">
            <i aria-hidden="true" />
            {statusLabel}
          </span>
          <time dateTime={situation.occurredAt} className="novex-action-row__date">
            {formatManagementDateShort(situation.occurredAt)}
          </time>
        </div>

        <span className="novex-action-row__title" title={situation.title}>
          {situation.title}
        </span>

        <span className="novex-action-row__responsible">
          {situation.coordinationName}
        </span>
      </div>
    </button>
  )
}
