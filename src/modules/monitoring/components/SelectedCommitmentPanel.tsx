import { useEffect, useRef, useState } from 'react'
import type {
  Commitment,
  CommitmentStatus,
} from '@/modules/commitments/types/commitment.types'
import { getCommitmentDisplayStatus } from '@/modules/commitments/utils/commitmentValidation.utils'
import { STATUS_BADGE_CLASSES } from '@/modules/monitoring/components/presentation'
import { FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'
import { OmegaIcon } from '@/shared/components/OmegaIcon'

interface SelectedCommitmentPanelProps {
  commitment: Commitment | null
  canValidate: boolean
  isUpdating: boolean
  onValidate: (status: CommitmentStatus) => void
}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const PANEL_FRAME =
  'omega-subpanel selected-commitment-panel flex h-full min-w-0 min-h-0 w-full flex-col gap-1.5 overflow-x-hidden overflow-y-auto'
const PANEL_TITLE =
  'selected-commitment-title text-sm font-semibold leading-normal text-slate-800'

function formatDueDate(value: string): string {
  const match = DATE_ONLY_PATTERN.exec(value)
  if (!match) return value

  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function SelectedCommitmentPanel({
  commitment,
  canValidate,
  isUpdating,
  onValidate,
}: SelectedCommitmentPanelProps) {
  const [optimisticStatus, setOptimisticStatus] =
    useState<CommitmentStatus | null>(null)
  const wasUpdatingRef = useRef(false)

  useEffect(() => {
    setOptimisticStatus(null)
  }, [commitment?.id])

  useEffect(() => {
    if (wasUpdatingRef.current && !isUpdating) {
      setOptimisticStatus(null)
    }
    wasUpdatingRef.current = isUpdating
  }, [isUpdating])

  if (!commitment) {
    return (
      <section
        className={`${PANEL_FRAME} is-empty omega-surface-open`}
        aria-labelledby="selected-commitment-heading"
      >
        <p
          id="selected-commitment-heading"
          className="omega-type-meta font-medium text-slate-400"
        >
          Acción
        </p>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="w-full px-1 text-center text-sm leading-relaxed text-slate-400">
            Elija un compromiso en la lista central para verlo aquí y
            validarlo.
          </p>
        </div>
      </section>
    )
  }

  const displayStatus =
    optimisticStatus ?? getCommitmentDisplayStatus(commitment)
  const validateDisabled = !canValidate || isUpdating

  const handleValidate = (status: CommitmentStatus) => {
    setOptimisticStatus(status)
    onValidate(status)
  }

  return (
    <section
      className={`${PANEL_FRAME} omega-surface-feature`}
      aria-labelledby="selected-commitment-heading"
      aria-busy={isUpdating}
    >
      <header className="flex min-w-0 items-center justify-between gap-2">
        <p
          id="selected-commitment-heading"
          className="omega-type-meta font-medium text-slate-400"
        >
          Compromiso a validar
        </p>
        <p className="shrink-0 break-all font-mono text-[10px] tracking-[0.08em] text-slate-600">
          {commitment.id}
        </p>
      </header>

      <span
        className={`shrink-0 max-w-full self-start ${STATUS_BADGE_CLASSES[displayStatus]}`}
        title={displayStatus}
      >
        {displayStatus === 'Pendiente de validación'
          ? 'En proceso'
          : displayStatus === 'Incumplido'
            ? 'No cumplido'
            : displayStatus}
      </span>
      <h3 className={`${PANEL_TITLE} shrink-0`}>
        {commitment.title}
      </h3>
      <p className="selected-commitment-description shrink-0 text-[11px] leading-normal text-slate-600">
        {commitment.description}
      </p>

      <dl className="mt-1 grid shrink-0 grid-cols-2 gap-2 border-t border-slate-400/25 pt-2">
        <div className="min-w-0">
          <dt className="omega-section-label text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Fecha
          </dt>
          <dd className="mt-0.5 truncate font-mono text-[10px] font-medium text-slate-700">
            {formatDueDate(commitment.dueDate)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="omega-section-label text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Impacto
          </dt>
          <dd className="mt-0.5 font-mono text-[10px] font-semibold text-slate-700">
            {commitment.operationalImpact}/5
          </dd>
        </div>
      </dl>

      <div className="selected-commitment-panel__decisions mt-1 shrink-0">
        <button
          type="button"
          disabled={validateDisabled}
          aria-pressed={displayStatus === 'Cumplido'}
          onClick={() => handleValidate('Cumplido')}
          className={`selected-commitment-panel__decision selected-commitment-panel__decision--fulfilled ${FOCUS_VISIBLE}`}
        >
          <OmegaIcon name="check" size={17} />
          Cumplido
        </button>
        <button
          type="button"
          disabled={validateDisabled}
          aria-pressed={displayStatus === 'Pendiente de validación'}
          onClick={() => handleValidate('Pendiente de validación')}
          className={`selected-commitment-panel__decision selected-commitment-panel__decision--progress ${FOCUS_VISIBLE}`}
        >
          <OmegaIcon name="clock" size={17} />
          En proceso
        </button>
        <button
          type="button"
          disabled={validateDisabled}
          aria-pressed={displayStatus === 'Incumplido'}
          onClick={() => handleValidate('Incumplido')}
          className={`selected-commitment-panel__decision selected-commitment-panel__decision--breached ${FOCUS_VISIBLE}`}
        >
          <OmegaIcon name="x" size={17} />
          No cumplido
        </button>
      </div>
    </section>
  )
}
