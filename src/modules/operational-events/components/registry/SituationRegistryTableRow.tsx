import type { SituationRegistryRow } from '@/modules/api/types/situation-registry.types'
import { FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'
import {
  formatManagementDate,
  formatRegistryTableDate,
  SITUATION_STATUS_LABEL,
} from '@/modules/monitoring/utils/situation-management.presentation'
import { NovexIcon } from '@/shared/components/NovexIcon'

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
      className="novex-events-row"
      data-selected={selected || undefined}
      onClick={() => onSelect(row.id)}
    >
      <td data-label="Situación">
        <div className="novex-events-row__identity">
          <button
            type="button"
            className={`novex-events-row__title ${FOCUS_VISIBLE}`}
            onClick={(clickEvent) => {
              clickEvent.stopPropagation()
              onSelect(row.id)
            }}
          >
            {row.title}
          </button>
          <span className="novex-events-row__ref">{row.code}</span>
        </div>
      </td>
      <td data-label="Contexto">
        <div
          className="novex-events-row__context"
          title={`${row.categoryName} · ${row.coordinationName}`}
        >
          <span>{row.categoryName}</span>
          <small>{row.coordinationCode}</small>
        </div>
      </td>
      <td data-label="Estado">
        <span
          className="novex-events-row__status novex-events-row__status--compact"
          data-status={row.status.toLowerCase()}
        >
          {SITUATION_STATUS_LABEL[row.status] ?? row.status}
        </span>
      </td>
      <td data-label="Riesgo">
        <span
          className="novex-events-row__score novex-events-row__score--compact"
          data-risk={row.riskLevel ?? 'moderate'}
          title={`Severidad ${row.severity}`}
        >
          {row.riskScore ?? '—'}
        </span>
      </td>
      <td data-label="IA">
        <span className="novex-events-row__text">{formatConfidence(row.aiConfidence)}</span>
      </td>
      <td data-label="Fecha">
        <time
          dateTime={row.occurredAt}
          className="novex-events-row__date"
          title={formatManagementDate(row.occurredAt)}
        >
          {formatRegistryTableDate(row.occurredAt)}
        </time>
      </td>
      <td data-label="Detalle">
        <button
          type="button"
          className={`novex-events-row__action novex-events-row__action--detail ${FOCUS_VISIBLE}`}
          onClick={(clickEvent) => {
            clickEvent.stopPropagation()
            onSelect(row.id)
          }}
        >
          <span>Abrir</span>
          <NovexIcon name="arrow-up-right" size={13} />
        </button>
      </td>
    </tr>
  )
}
