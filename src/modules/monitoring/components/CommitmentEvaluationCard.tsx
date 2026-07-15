// Componente: registro de evaluación en la consola compacta (Sprint 10.1).
// Fila de alta densidad para navegación — detalle en la columna derecha.

import type { Commitment } from '@/modules/commitments/types/commitment.types'
import { STATUS_BADGE_CLASSES } from '@/modules/monitoring/components/presentation'
import {
  CONSOLE_DOSSIER_ROW,
  DOSSIER_DUE_IDLE,
  DOSSIER_DUE_PROJECTED,
  DOSSIER_IDLE,
  DOSSIER_PROJECTED,
  DOSSIER_REF_IDLE,
  DOSSIER_REF_PROJECTED,
  DOSSIER_ROW_SELECTED,
  DOSSIER_TITLE_IDLE,
  DOSSIER_TITLE_PROJECTED,
} from '@/modules/monitoring/constants/visualHierarchy'
import {
  CRYSTAL_DOSSIER_PAD,
  DOSSIER_PROJECT_RAIL,
  FOCUS_VISIBLE,
} from '@/modules/monitoring/constants/monitoringTheme'
import { CRYSTAL_INTERACTION_HOVER } from '@/modules/monitoring/constants/materialTheme'

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
  return (
    <button
      type="button"
      onClick={() => onSelect(commitment.id)}
      aria-pressed={selected}
      className={`group relative w-full text-left transition-colors duration-200 ease-out ${CRYSTAL_DOSSIER_PAD} ${FOCUS_VISIBLE} ${
        selected ? `${DOSSIER_PROJECTED} ${DOSSIER_ROW_SELECTED}` : DOSSIER_IDLE
      } ${selected ? '' : CRYSTAL_INTERACTION_HOVER}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-0.5 transition-colors duration-200 ${
          selected ? DOSSIER_PROJECT_RAIL : 'bg-transparent'
        }`}
      />

      <div className={`relative z-10 ${CONSOLE_DOSSIER_ROW}`}>
        <span
          className={`transition-colors duration-200 ${
            selected ? DOSSIER_REF_PROJECTED : DOSSIER_REF_IDLE
          }`}
        >
          {expeditionRef(commitment.id)}
        </span>

        <span
          className={`transition-colors duration-200 ${
            selected ? DOSSIER_TITLE_PROJECTED : DOSSIER_TITLE_IDLE
          }`}
        >
          {commitment.title}
        </span>

        <span
          className={`max-w-[5.5rem] shrink-0 truncate sm:max-w-none ${STATUS_BADGE_CLASSES[commitment.status]}`}
        >
          {commitment.status}
        </span>

        <span
          className={`transition-colors duration-200 ${
            selected ? DOSSIER_DUE_PROJECTED : DOSSIER_DUE_IDLE
          }`}
        >
          {formatDueDate(commitment.dueDate)}
        </span>
      </div>
    </button>
  )
}
