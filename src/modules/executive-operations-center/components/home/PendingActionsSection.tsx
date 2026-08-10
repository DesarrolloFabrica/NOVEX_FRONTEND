import type { EocPendingAction } from '@/modules/executive-operations-center/types/executive-home.types'
import { ExecutiveHomeSection } from '@/modules/executive-operations-center/components/home/ExecutiveHomeSection'
import {
  getSeverityLabel,
  severityClass,
} from '@/modules/executive-operations-center/utils/severityDisplay'

interface PendingActionsSectionProps {
  actions: EocPendingAction[]
}

export function PendingActionsSection({ actions }: PendingActionsSectionProps) {
  return (
    <ExecutiveHomeSection
      id="eoc-actions"
      eyebrow="Siguiente paso"
      title="Acciones pendientes"
      integrationNote="GET /operational-actions/pending — tareas de validación, aprobaciones y seguimientos asignados por rol con plazos y prioridad."
    >
      <ul className="eoc-actions__list">
        {actions.map((action, index) => (
          <li
            key={action.id}
            className={`eoc-actions__item ${severityClass(action.priority)}`}
          >
            <div className="eoc-actions__schedule">
              <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <strong>{action.dueLabel}</strong>
            </div>
            <div className="eoc-actions__content">
              <div className="eoc-actions__top">
                <span className="eoc-actions__owner">{action.owner}</span>
                <span
                  className="eoc-actions__priority"
                >
                  {getSeverityLabel(action.priority)}
                </span>
              </div>
              <h3 className="eoc-actions__title">{action.title}</h3>
            </div>
          </li>
        ))}
      </ul>
    </ExecutiveHomeSection>
  )
}
