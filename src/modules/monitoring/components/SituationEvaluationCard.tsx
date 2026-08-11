import type { SituationListItem } from '@/modules/api/types/situation-management.types'
import { FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'
import {
  formatManagementDateShort,
  SITUATION_SEVERITY_LABEL,
  SITUATION_STATUS_LABEL,
} from '@/modules/monitoring/utils/situation-management.presentation'
import {
  formatSlaDeadlineLabel,
  getSituationSlaHealth,
} from '@/modules/situations/utils/situation-sla'

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
  const slaHealth =
    situation.slaHealth ??
    getSituationSlaHealth({
      dueAt: situation.dueAt,
      status: situation.status,
      severity: situation.severity,
    })
  const slaLabel = formatSlaDeadlineLabel(situation.dueAt, slaHealth)

  return (
    <button
      type="button"
      onClick={() => onSelect(situation.id)}
      aria-pressed={selected}
      aria-label={`${selected ? 'Seleccionada: ' : 'Seleccionar situación: '}${situation.title}. Severidad ${severityLabel}. Estado ${statusLabel}. Plazo ${slaLabel}.`}
      data-situation-id={situation.id}
      data-status={situation.status.toLowerCase()}
      data-priority={situation.severity.toLowerCase()}
      data-sla={slaHealth}
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
          {situation.dueAt && slaHealth !== 'closed' ? (
            <span
              className="novex-action-row__sla"
              data-sla={slaHealth}
              title={situation.dueAt}
            >
              <i aria-hidden="true" />
              {slaLabel}
            </span>
          ) : null}
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
