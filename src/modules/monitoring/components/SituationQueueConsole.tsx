import type { SituationListItem } from '@/modules/api/types/situation-management.types'
import { SituationEvaluationCard } from '@/modules/monitoring/components/SituationEvaluationCard'
import { NovexIcon } from '@/shared/components/NovexIcon'

interface SituationQueueConsoleProps {
  situations: SituationListItem[]
  selectedSituationId: string | null
  loading: boolean
  error: string | null
  onSelectSituation: (situationId: string) => void
}

function QueueSkeleton() {
  return (
    <div className="novex-action-queue__skeleton" aria-hidden="true">
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
    <section className="novex-action-queue" aria-labelledby="situation-list-title">
      <header className="novex-action-queue__header">
        <div>
          <p>Selecciona la situación para actualizar el estado</p>
          <h2 id="situation-list-title">Situaciones</h2>
        </div>
        <span>{situations.length}</span>
      </header>

      {loading ? (
        <div role="status" aria-live="polite">
          <span className="sr-only">Cargando situaciones…</span>
          <QueueSkeleton />
        </div>
      ) : error ? (
        <div className="novex-action-queue__notice" role="alert">
          <NovexIcon name="x" size={22} />
          <strong>No fue posible consultar las situaciones</strong>
          <span>{error}</span>
        </div>
      ) : situations.length === 0 ? (
        <div className="novex-action-queue__notice">
          <NovexIcon name="check" size={24} />
          <strong>No hay situaciones registradas.</strong>
          <span>Las situaciones analizadas por la IA aparecerán aquí.</span>
        </div>
      ) : (
        <ol className="novex-action-queue__list">
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
