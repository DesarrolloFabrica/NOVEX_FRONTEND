import type { SituationRegistryRow } from '@/modules/api/types/situation-registry.types'
import { FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'
import {
  formatManagementDate,
  formatRegistryTableDate,
  SITUATION_STATUS_LABEL,
} from '@/modules/monitoring/utils/situation-management.presentation'
import { CunmarkIcon } from '@/shared/components/CunmarkIcon'

interface SituationRegistryRowProps {
  row: SituationRegistryRow
  selected: boolean
  onSelect: (situationId: string) => void
}

function formatConfidence(value: number | null): string {
  if (value === null) return '—'
  return `${Math.round(value * 100)}%`
}

export function SituationRegistryTableRow({
  row,
  selected,
  onSelect,
}: SituationRegistryRowProps) {
  return (
    <tr
      className="cunmark-events-row"
      data-selected={selected || undefined}
      onClick={() => onSelect(row.id)}
    >
      <td data-label="Situación">
        <div className="cunmark-events-row__identity">
          <button
            type="button"
            className={`cunmark-events-row__title ${FOCUS_VISIBLE}`}
            onClick={(clickEvent) => {
              clickEvent.stopPropagation()
              onSelect(row.id)
            }}
          >
            {row.title}
          </button>
          <span className="cunmark-events-row__ref">{row.code}</span>
        </div>
      </td>
      <td data-label="Contexto">
        <div
          className="cunmark-events-row__context"
          title={`${row.categoryName} · ${row.coordinationName}`}
        >
          <span>{row.categoryName}</span>
          <small>{row.coordinationCode}</small>
        </div>
      </td>
      <td data-label="Estado">
        <span
          className="cunmark-events-row__status cunmark-events-row__status--compact"
          data-status={row.status.toLowerCase()}
        >
          {SITUATION_STATUS_LABEL[row.status] ?? row.status}
        </span>
      </td>
      <td data-label="Riesgo">
        <span
          className="cunmark-events-row__score cunmark-events-row__score--compact"
          data-risk={row.riskLevel ?? 'moderate'}
          title={`Severidad ${row.severity}`}
        >
          {row.riskScore ?? '—'}
        </span>
      </td>
      <td data-label="IA">
        <span className="cunmark-events-row__text">{formatConfidence(row.aiConfidence)}</span>
      </td>
      <td data-label="Fecha">
        <time
          dateTime={row.occurredAt}
          className="cunmark-events-row__date"
          title={formatManagementDate(row.occurredAt)}
        >
          {formatRegistryTableDate(row.occurredAt)}
        </time>
      </td>
      <td data-label="Detalle">
        <button
          type="button"
          className={`cunmark-events-row__action cunmark-events-row__action--detail ${FOCUS_VISIBLE}`}
          onClick={(clickEvent) => {
            clickEvent.stopPropagation()
            onSelect(row.id)
          }}
        >
          <span>Abrir</span>
          <CunmarkIcon name="arrow-up-right" size={13} />
        </button>
      </td>
    </tr>
  )
}
