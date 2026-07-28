import type { SituationListItem } from '@/modules/api/types/situation-management.types'
import { SituationEvaluationCard } from '@/modules/monitoring/components/SituationEvaluationCard'
import { CunmarkIcon } from '@/shared/components/CunmarkIcon'

interface SituationQueueConsoleProps {
  situations: SituationListItem[]
  selectedSituationId: string | null
  loading: boolean
  error: string | null
  onSelectSituation: (situationId: string) => void
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

export function SituationQueueConsole({
  situations,
  selectedSituationId,
  loading,
  error,
  onSelectSituation,
}: SituationQueueConsoleProps) {
  return (
    <section className="cunmark-action-queue" aria-labelledby="situation-list-title">
      <header className="cunmark-action-queue__header">
        <div>
          <p>Prioridad operativa</p>
          <h2 id="situation-list-title">Situaciones registradas</h2>
        </div>
        <span>{situations.length} situaciones</span>
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
      ) : situations.length === 0 ? (
        <div className="cunmark-action-queue__notice">
          <CunmarkIcon name="check" size={24} />
          <strong>No hay situaciones registradas.</strong>
          <span>Las situaciones analizadas por la IA aparecerán aquí.</span>
        </div>
      ) : (
        <ol className="cunmark-action-queue__list">
          {situations.map((situation) => (
            <li key={situation.id}>
              <SituationEvaluationCard
                situation={situation}
                selected={situation.id === selectedSituationId}
                onSelect={onSelectSituation}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
