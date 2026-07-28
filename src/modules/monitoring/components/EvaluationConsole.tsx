import type { ExecutionAction } from '@/modules/execution-actions/types/execution-action.types'
import { CommitmentEvaluationCard } from '@/modules/monitoring/components/CommitmentEvaluationCard'
import { CunmarkIcon } from '@/shared/components/CunmarkIcon'

interface EvaluationConsoleProps {
  actions: ExecutionAction[]
  selectedActionId: string | null
  loading: boolean
  error: string | null
  onSelectAction: (actionId: string) => void
}

function QueueSkeleton() {
  return (
    <div className="cunmark-action-queue__skeleton" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  )
}

export function EvaluationConsole({
  actions,
  selectedActionId,
  loading,
  error,
  onSelectAction,
}: EvaluationConsoleProps) {
  return (
    <section className="cunmark-action-queue" aria-labelledby="situation-list-title">
      <header className="cunmark-action-queue__header">
        <div>
          <p>Prioridad operativa</p>
          <h2 id="situation-list-title">Situaciones registradas</h2>
        </div>
        <span>{actions.length} situaciones</span>
      </header>

      {loading ? (
        <div role="status" aria-live="polite">
          <span className="sr-only">Cargando situaciones…</span>
          <QueueSkeleton />
        </div>
      ) : error ? (
        <div className="cunmark-action-queue__notice" role="alert">
          <CunmarkIcon name="x" size={22} />
          <strong>No fue posible consultar las situaciones</strong>
          <span>{error}</span>
        </div>
      ) : actions.length === 0 ? (
        <div className="cunmark-action-queue__notice">
          <CunmarkIcon name="check" size={24} />
          <strong>No hay situaciones registradas.</strong>
          <span>
            Las situaciones analizadas por la IA aparecerán aquí.
          </span>
        </div>
      ) : (
        <ol className="cunmark-action-queue__list">
          {actions.map((action) => (
            <li key={action.id}>
              <CommitmentEvaluationCard
                action={action}
                selected={action.id === selectedActionId}
                onSelect={onSelectAction}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
