import { useEffect, useRef, useState } from 'react'
import type {
  Commitment,
  CommitmentStatus,
} from '@/modules/commitments/types/commitment.types'
import { getCommitmentDisplayStatus } from '@/modules/commitments/utils/commitmentValidation.utils'
import { STATUS_BADGE_CLASSES } from '@/modules/monitoring/components/presentation'
import { FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'

interface SelectedCommitmentPanelProps {
  commitment: Commitment | null
  canValidate: boolean
  isUpdating: boolean
  onValidate: (status: 'Cumplido' | 'Incumplido') => void
}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const PANEL_FRAME =
  'omega-subpanel selected-commitment-panel flex h-full min-w-0 min-h-0 w-full flex-col gap-1.5 overflow-x-hidden overflow-y-auto border'
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
        className={`${PANEL_FRAME} is-empty`}
        aria-labelledby="selected-commitment-heading"
      >
        <p
          id="selected-commitment-heading"
          className="omega-section-title text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600"
        >
          Compromiso seleccionado
        </p>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="w-full px-1 text-center text-xs leading-snug text-slate-600">
            Seleccione un compromiso en la consola central para consultar su
            información.
          </p>
        </div>
      </section>
    )
  }

  const displayStatus =
    optimisticStatus ?? getCommitmentDisplayStatus(commitment)
  const validateDisabled = !canValidate || isUpdating

  const handleValidate = (status: 'Cumplido' | 'Incumplido') => {
    setOptimisticStatus(status)
    onValidate(status)
  }

  return (
    <section
      className={PANEL_FRAME}
      aria-labelledby="selected-commitment-heading"
      aria-busy={isUpdating}
    >
      <header className="flex min-w-0 items-center justify-between gap-2">
        <p
          id="selected-commitment-heading"
          className="omega-section-title text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600"
        >
          Compromiso seleccionado
        </p>
        <p className="shrink-0 break-all font-mono text-[10px] tracking-[0.08em] text-slate-600">
          {commitment.id}
        </p>
      </header>

      <span
        className={`shrink-0 max-w-full self-start ${STATUS_BADGE_CLASSES[displayStatus]}`}
        title={displayStatus}
      >
        {displayStatus}
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

      <div className="mt-1 grid shrink-0 grid-cols-2 gap-1.5">
        <button
          type="button"
          disabled={validateDisabled}
          onClick={() => handleValidate('Cumplido')}
          className={`rounded-sm border border-emerald-600/30 bg-emerald-50/45 px-1.5 py-1 text-[10px] font-semibold text-emerald-800 transition-colors hover:bg-emerald-50/70 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_VISIBLE}`}
        >
          Cumplido
        </button>
        <button
          type="button"
          disabled={validateDisabled}
          onClick={() => handleValidate('Incumplido')}
          className={`rounded-sm border border-red-600/30 bg-red-50/40 px-1.5 py-1 text-[10px] font-semibold text-red-800 transition-colors hover:bg-red-50/65 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_VISIBLE}`}
        >
          Incumplido
        </button>
      </div>
    </section>
  )
}
