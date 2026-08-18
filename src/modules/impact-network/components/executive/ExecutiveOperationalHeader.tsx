import {
  EXECUTIVE_STATUS_ORDER,
  type ExecutiveOverviewModel,
} from '@/modules/impact-network/data/executive-operational-overview.model'
import type { OperationalStatusFilter } from '@/modules/impact-network/components/executive/OperationalStatusBoard'
import { NovexIcon } from '@/shared/components/NovexIcon'

interface ExecutiveOperationalHeaderProps {
  model: ExecutiveOverviewModel
  statusFilter: OperationalStatusFilter
  loading?: boolean
  onStatusFilterChange: (filter: OperationalStatusFilter) => void
}

const STATUS_LABEL = {
  critical: 'Crítico',
  high: 'Alto',
  attention: 'Atención',
  normal: 'Normal',
} as const

export function ExecutiveOperationalHeader({
  model,
  statusFilter,
  loading = false,
  onStatusFilterChange,
}: ExecutiveOperationalHeaderProps) {
  return (
    <div
      className="impact-executive-header"
      aria-label="Estado operacional actual"
      data-loading={loading}
    >
      <span className="impact-executive-header__updated" aria-live="polite">
        <i aria-hidden="true" />
        {model.metrics.updatedLabel}
      </span>

      <div className="impact-executive-header__states" aria-label="Filtrar por estado">
        {EXECUTIVE_STATUS_ORDER.map((status) => (
          <button
            key={status}
            type="button"
            data-status={status}
            data-active={statusFilter === status}
            aria-pressed={statusFilter === status}
            onClick={() =>
              onStatusFilterChange(statusFilter === status ? 'all' : status)
            }
          >
            <i aria-hidden="true" />
            <span>{STATUS_LABEL[status]}</span>
            <strong>{loading ? '—' : model.groups[status].length}</strong>
          </button>
        ))}
      </div>

      <details className="impact-executive-header__criteria">
        <summary aria-label="Cómo se calcula el estado de una coordinación">
          <NovexIcon name="help" size={14} />
          <span>Criterio</span>
        </summary>
        <div>
          <strong>¿Por qué una coordinación es crítica?</strong>
          <p>
            Se toma su situación vigente más severa y el estado del SLA. La
            cantidad de situaciones no aumenta por sí sola la criticidad.
          </p>
          <ul>
            <li><b>Crítico:</b> severidad crítica activa o SLA alto vencido.</li>
            <li><b>Alto:</b> severidad alta o situación media con SLA vencido.</li>
            <li><b>Atención:</b> severidad baja/media o caso resuelto en verificación.</li>
            <li><b>Normal:</b> sin situaciones vigentes.</li>
          </ul>
        </div>
      </details>
    </div>
  )
}
