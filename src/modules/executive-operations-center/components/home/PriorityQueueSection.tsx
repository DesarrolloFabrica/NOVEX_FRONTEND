import type { EocPrioritySituation } from '@/modules/executive-operations-center/types/executive-home.types'
import { ExecutiveHomeSection } from '@/modules/executive-operations-center/components/home/ExecutiveHomeSection'
import {
  getSeverityLabel,
  severityClass,
} from '@/modules/executive-operations-center/utils/severityDisplay'

interface PriorityQueueSectionProps {
  items: EocPrioritySituation[]
}

export function PriorityQueueSection({ items }: PriorityQueueSectionProps) {
  return (
    <ExecutiveHomeSection
      id="eoc-queue"
      eyebrow="Prioridades"
      title="Qué necesita atención"
      integrationNote="GET /situations/priority-queue — ranking por severidad, SLA, impacto transversal y tiempo de espera. Motor de priorización institucional."
    >
      <ol className="eoc-queue__list">
        {items.map((item) => (
          <li
            key={item.id}
            className={`eoc-queue__item ${severityClass(item.severity)}`}
          >
            <div className="eoc-queue__rank" aria-label={`Prioridad ${item.rank}`}>
              <span>Prioridad</span>
              <strong>{String(item.rank).padStart(2, '0')}</strong>
            </div>
            <div className="eoc-queue__content">
              <div className="eoc-queue__top">
                <div className="eoc-queue__classification">
                  <span className="eoc-queue__coord">{item.coordination}</span>
                  <span className="eoc-queue__severity">
                    {getSeverityLabel(item.severity)}
                  </span>
                </div>
                <span className="eoc-queue__waiting">
                  <small>En espera</small>
                  {item.waitingSince}
                </span>
              </div>
              <h3 className="eoc-queue__title">{item.title}</h3>
              <p className="eoc-queue__reason">{item.reason}</p>
            </div>
          </li>
        ))}
      </ol>
    </ExecutiveHomeSection>
  )
}
