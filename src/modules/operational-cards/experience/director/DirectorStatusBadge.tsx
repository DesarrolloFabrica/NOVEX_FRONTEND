import { OPERATIONAL_STATUS_LABEL } from '@/modules/operational-cards/data/operationalStatusLabel'
import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'

export function DirectorStatusBadge({
  status,
  testId = 'director-status-badge',
  title,
}: {
  status: OperationalIntegrityStatus
  testId?: string
  /** Explicación determinista (tooltip / ayuda contextual). */
  title?: string
}) {
  return (
    <span
      className="director-status-badge"
      data-testid={testId}
      data-status={status}
      title={title || undefined}
      aria-label={
        title
          ? `${OPERATIONAL_STATUS_LABEL[status]}. ${title}`
          : OPERATIONAL_STATUS_LABEL[status]
      }
    >
      <span className="director-status-badge__mark" aria-hidden="true" />
      {OPERATIONAL_STATUS_LABEL[status]}
      {title ? (
        <span
          className="director-status-badge__help"
          aria-hidden="true"
          title={title}
        >
          ?
        </span>
      ) : null}
    </span>
  )
}
