import {
  attentionItems,
  type AttentionItem,
} from '@/modules/impact-network/data/executive-operational-overview.mock'
import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import { NovexIcon } from '@/shared/components/NovexIcon'

interface AttentionQueueProps {
  items?: readonly AttentionItem[]
  selectedCoordinationId?: CoordinationId | null
  onSelect?: (coordinationId: CoordinationId) => void
}

export function AttentionQueue({
  items = attentionItems,
  selectedCoordinationId = null,
  onSelect,
}: AttentionQueueProps) {
  return (
    <section
      className="impact-executive__panel"
      aria-label="Requiere atención"
    >
      <header className="impact-executive__panel-header">
        <span>Prioridad operacional</span>
        <h3>Requiere atención</h3>
        <p>Seleccione una coordinación para conocer el contexto.</p>
      </header>
      <ul className="impact-executive__attention-list">
        {items.map((item) => (
          <li key={item.coordinationId}>
            <button
              type="button"
              className="impact-executive__attention-item"
              data-status={item.status}
              data-selected={selectedCoordinationId === item.coordinationId}
              data-coordination-id={item.coordinationId}
              onClick={() => onSelect?.(item.coordinationId)}
            >
              <span className="impact-executive__attention-icon" aria-hidden="true">
                <NovexIcon name="alert" size={15} />
              </span>
              <span className="impact-executive__attention-copy">
                <span className="impact-executive__attention-top">
                  <strong>{item.name}</strong>
                  <span data-status={item.status}>{item.statusLabel}</span>
                </span>
                <span className="impact-executive__attention-summary">{item.summary}</span>
                <span className="impact-executive__attention-detail">
                  {item.detail ?? 'Ver contexto operacional'}
                </span>
              </span>
              <span className="impact-executive__attention-meta">
                <NovexIcon name="chevron-right" size={13} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
