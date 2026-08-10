import type { SituationRegistryRow } from '@/modules/api/types/situation-registry.types'
import { FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'
import {
  formatManagementDate,
  formatRegistryTableDateTime,
  SITUATION_STATUS_LABEL,
} from '@/modules/monitoring/utils/situation-management.presentation'
import { NovexIcon } from '@/shared/components/NovexIcon'

export type SituationRegistryTableVariant = 'own' | 'audit'

interface SituationRegistryRowProps {
  row: SituationRegistryRow
  selected: boolean
  variant: SituationRegistryTableVariant
  onSelect: (situationId: string) => void
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className="novex-events-row__status novex-events-row__status--compact"
      data-status={status.toLowerCase()}
    >
      {SITUATION_STATUS_LABEL[status] ?? status}
    </span>
  )
}

function RegisteredAt({ value }: { value: string }) {
  return (
    <time
      dateTime={value}
      className="novex-events-row__when"
      title={formatManagementDate(value)}
    >
      <span>{formatRegistryTableDateTime(value)}</span>
    </time>
  )
}

function OpenAction({
  onSelect,
  situationId,
}: {
  onSelect: (situationId: string) => void
  situationId: string
}) {
  return (
    <button
      type="button"
      className={`novex-events-row__action novex-events-row__action--detail ${FOCUS_VISIBLE}`}
      onClick={(clickEvent) => {
        clickEvent.stopPropagation()
        onSelect(situationId)
      }}
    >
      <span>Ver detalle</span>
      <NovexIcon name="arrow-up-right" size={13} />
    </button>
  )
}

export function SituationRegistryTableRow({
  row,
  selected,
  variant,
  onSelect,
}: SituationRegistryRowProps) {
  return (
    <tr
      className="novex-events-row"
      data-selected={selected || undefined}
      data-variant={variant}
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
          <span className="novex-events-row__ref">
            {variant === 'own' ? row.categoryName : row.code}
          </span>
        </div>
      </td>

      {variant === 'audit' ? (
        <>
          <td data-label="Coordinación">
            <div
              className="novex-events-row__coord"
              title={`${row.coordinationName} · ${row.categoryName}`}
            >
              <span>{row.coordinationName}</span>
              <small>{row.categoryName}</small>
            </div>
          </td>
          <td data-label="Registró">
            <div className="novex-events-row__person" title={row.createdByUserName}>
              <span>{row.createdByUserName || 'Sin autor'}</span>
            </div>
          </td>
        </>
      ) : (
        <td data-label="Estado">
          <StatusBadge status={row.status} />
        </td>
      )}

      {variant === 'audit' ? (
        <td data-label="Estado">
          <StatusBadge status={row.status} />
        </td>
      ) : (
        <td data-label="Riesgo">
          <span
            className="novex-events-row__score novex-events-row__score--compact"
            data-risk={row.riskLevel ?? 'moderate'}
            title={`Severidad ${row.severity}`}
          >
            {row.riskScore ?? '—'}
          </span>
        </td>
      )}

      <td data-label="Registrada">
        <RegisteredAt value={row.createdAt || row.occurredAt} />
      </td>

      <td data-label="Detalle">
        <OpenAction onSelect={onSelect} situationId={row.id} />
      </td>
    </tr>
  )
}
