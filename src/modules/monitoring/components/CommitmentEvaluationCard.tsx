// Componente: registro de evaluación en la consola compacta (Sprint 10.1).
// Fila de alta densidad para navegación — detalle en la columna derecha.

import type { Commitment } from '@/modules/commitments/types/commitment.types'
import { getCommitmentDisplayStatus } from '@/modules/commitments/utils/commitmentValidation.utils'
import { STATUS_BADGE_CLASSES } from '@/modules/monitoring/components/presentation'
import {
  FOCUS_VISIBLE,
} from '@/modules/monitoring/constants/monitoringTheme'

interface CommitmentEvaluationCardProps {
  commitment: Commitment
  selected: boolean
  onSelect: (commitmentId: string) => void
}

function expeditionRef(id: string): string {
  return id.replace(/^cmt-/i, 'EXP-').toUpperCase()
}

function formatDueDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('es-CO')
}

export function CommitmentEvaluationCard({
  commitment,
  selected,
  onSelect,
}: CommitmentEvaluationCardProps) {
  const displayStatus = getCommitmentDisplayStatus(commitment)

  return (
    <button
      type="button"
      onClick={() => onSelect(commitment.id)}
      aria-pressed={selected}
      data-status={displayStatus}
      className={`omega-commitment-row group relative w-full text-left ${FOCUS_VISIBLE}`}
    >
      <span
        aria-hidden="true"
        className={`omega-commitment-row__rail absolute inset-y-0 left-0 w-0.5 transition-colors duration-200 ${
          selected ? 'omega-commitment-row__rail--active' : 'bg-transparent'
        }`}
      />

      <div className="omega-commitment-row__layout relative z-10">
        <span className="omega-commitment-row__identity">
          {expeditionRef(commitment.id)}
        </span>

        <span className="omega-commitment-row__main">
          <span className="omega-commitment-row__title" title={commitment.title}>
            {commitment.title}
          </span>
          <span className="omega-commitment-row__meta">
            Impacto {commitment.operationalImpact}/5
          </span>
        </span>

        <span
          data-status={displayStatus}
          className={`omega-commitment-row__status ${STATUS_BADGE_CLASSES[displayStatus]}`}
        >
          {displayStatus}
        </span>

        <time
          dateTime={commitment.dueDate}
          className="omega-commitment-row__date"
        >
          {formatDueDate(commitment.dueDate)}
        </time>
      </div>
    </button>
  )
}
