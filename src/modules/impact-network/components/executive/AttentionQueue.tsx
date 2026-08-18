import type { ExecutivePriorityItem } from '@/modules/impact-network/data/executive-operational-overview.model'
import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import { NovexIcon } from '@/shared/components/NovexIcon'

interface AttentionQueueProps {
  items: readonly ExecutivePriorityItem[]
  criticalCount: number
  selectedCoordinationId?: CoordinationId | null
  onSelect?: (coordinationId: CoordinationId) => void
  onShowAll?: () => void
}

export function AttentionQueue({
  items,
  criticalCount,
  selectedCoordinationId = null,
  onSelect,
  onShowAll,
}: AttentionQueueProps) {
  return (
    <section className="impact-executive__panel" aria-label="Prioridad operacional">
      <header className="impact-executive__panel-header">
        <span>Ahora mismo</span>
        <h3>
          {criticalCount > 0
            ? `${criticalCount} coordinación${criticalCount === 1 ? '' : 'es'} requiere${criticalCount === 1 ? '' : 'n'} atención inmediata`
            : 'No hay coordinaciones en estado crítico'}
        </h3>
        <p>Prioridades ordenadas por severidad y estado del SLA.</p>
      </header>

      {items.length > 0 ? (
        <ul className="impact-executive__attention-list">
          {items.slice(0, 3).map((item) => (
            <li key={item.coordinationId}>
              <button
                type="button"
                className="impact-executive__attention-item"
                data-status={item.status}
                data-selected={selectedCoordinationId === item.coordinationId}
                data-coordination-id={item.coordinationId}
                aria-label={`Revisar ${item.name}, prioridad ${item.rank}`}
                onClick={() => onSelect?.(item.coordinationId)}
              >
                <span className="impact-executive__attention-rank" aria-hidden="true">
                  {String(item.rank).padStart(2, '0')}
                </span>
                <span className="impact-executive__attention-copy">
                  <span className="impact-executive__attention-top">
                    <strong>{item.name}</strong>
                    <span data-status={item.status}>{item.statusLabel}</span>
                  </span>
                  <span className="impact-executive__attention-summary">
                    {item.summary}
                  </span>
                  <span className="impact-executive__attention-detail">
                    {item.affectedCoordinationCount > 1
                      ? `Afecta ${item.affectedCoordinationCount} coordinaciones`
                      : 'Impacto contenido'}
                  </span>
                </span>
                <span className="impact-executive__attention-review" aria-hidden="true">
                  Revisar
                  <NovexIcon name="chevron-right" size={12} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="impact-executive__priority-clear">
          <NovexIcon name="shield" size={21} />
          <strong>Sin prioridades activas</strong>
          <small>La operación se encuentra estable.</small>
        </div>
      )}

      {items.length > 3 ? (
        <button
          type="button"
          className="impact-executive__panel-link"
          onClick={onShowAll}
        >
          Ver todas las prioridades
          <NovexIcon name="arrow-up-right" size={13} />
        </button>
      ) : null}
    </section>
  )
}
