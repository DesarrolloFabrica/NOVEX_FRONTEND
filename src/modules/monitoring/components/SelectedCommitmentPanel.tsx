import { useEffect, useRef, useState } from 'react'
import type {
  Commitment,
  CommitmentStatus,
} from '@/modules/commitments/types/commitment.types'
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
  'selected-commitment-panel flex w-full min-w-0 flex-col overflow-hidden rounded-sm border border-slate-400/30 bg-white/30 shadow-none'
const PANEL_TITLE =
  'selected-commitment-title mt-1 line-clamp-2 text-sm font-semibold leading-snug text-slate-800'

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
        className={PANEL_FRAME}
        aria-labelledby="selected-commitment-heading"
      >
        <p
          id="selected-commitment-heading"
          className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600"
        >
          Compromiso seleccionado
        </p>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="max-w-[8rem] text-center text-xs leading-relaxed text-slate-600">
            Seleccione un compromiso en la consola central para consultar su
            información.
          </p>
        </div>
      </section>
    )
  }

  const displayStatus = optimisticStatus ?? commitment.status
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
          className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600"
        >
          Compromiso seleccionado
        </p>
        <p className="min-w-0 truncate font-mono text-[10px] tracking-[0.12em] text-slate-600">
          {commitment.id}
        </p>
      </header>

      <span
        className={`mt-1.5 max-w-full self-start truncate ${STATUS_BADGE_CLASSES[displayStatus]}`}
        title={displayStatus}
      >
        {displayStatus}
      </span>
      <h3 className={PANEL_TITLE}>
        {commitment.title}
      </h3>
      <p className="selected-commitment-description mt-1 line-clamp-2 text-[11px] leading-snug text-slate-600">
        {commitment.description}
      </p>

      <dl className="mt-auto grid grid-cols-2 gap-2 border-t border-slate-400/25 pt-2">
        <div className="min-w-0">
          <dt className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Fecha
          </dt>
          <dd className="mt-0.5 truncate font-mono text-[10px] font-medium text-slate-700">
            {formatDueDate(commitment.dueDate)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Impacto
          </dt>
          <dd className="mt-0.5 font-mono text-[10px] font-semibold text-slate-700">
            {commitment.operationalImpact}/5
          </dd>
        </div>
      </dl>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
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
