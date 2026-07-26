// Componente: Paso 4 — confirmación y guardado del evento.

import { Link } from 'react-router-dom'
import type {
  AIInterpretation,
  OperationalEventDraft,
} from '@/modules/operational-events/types/operational-event.types'
import {
  FOCUS_VISIBLE,
  TEXT_LABEL,
} from '@/modules/monitoring/constants/monitoringTheme'
import { OPERATIONAL_AREAS_CATALOG } from '@/modules/operational-events/data/operational-areas.mock'
import { resolveOperationalAreaName } from '@/modules/operational-events/utils/operationalArea.utils'

interface EventConfirmSaveProps {
  draft: OperationalEventDraft
  interpretation: AIInterpretation
  saving: boolean
  saved: boolean
  error: string | null
  onBack: () => void
  onSave: () => void
  onRegisterAnother: () => void
}

export function EventConfirmSave({
  draft,
  interpretation,
  saving,
  saved,
  error,
  onBack,
  onSave,
  onRegisterAnother,
}: EventConfirmSaveProps) {
  const areaName = resolveOperationalAreaName(
    OPERATIONAL_AREAS_CATALOG,
    draft.sourceAreaId,
  )

  if (saved) {
    return (
      <section className="omega-event-saved space-y-5">
        <header className="space-y-1">
          <h2 className="text-sm font-semibold tracking-tight text-emerald-800">
            Situación guardada
          </h2>
          <p className="text-[0.8rem] leading-relaxed text-slate-500">
            La situación ya alimenta Situaciones registradas y Análisis IA.
          </p>
        </header>

        <div className="py-1 text-sm text-emerald-900">
          <p className="font-medium text-slate-800">{draft.title}</p>
          <p className="mt-1 text-[0.8rem] text-slate-500">
            {interpretation.categoryName} · Riesgo {interpretation.riskScore}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-400/15 pt-4">
          <div className="flex flex-wrap gap-4 text-[0.7rem] font-semibold uppercase tracking-[0.12em]">
            <Link
              to="/intelligence"
              viewTransition
              className={`text-slate-500 hover:text-slate-800 ${FOCUS_VISIBLE}`}
            >
              Análisis IA
            </Link>
            <Link
              to="/operational-events"
              viewTransition
              className={`text-indigo-700 hover:text-indigo-900 ${FOCUS_VISIBLE}`}
            >
              Situaciones registradas
            </Link>
          </div>
          <button
            type="button"
            onClick={onRegisterAnother}
            className={`bg-indigo-600/90 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 ${FOCUS_VISIBLE}`}
          >
            Registrar otra
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="omega-event-confirm space-y-5">
      <header className="space-y-1">
        <h2 className="text-sm font-semibold tracking-tight text-slate-800">
          Confirmar y guardar
        </h2>
        <p className="text-[0.8rem] leading-relaxed text-slate-500">
          Revise la situación antes de guardarla en el sistema.
        </p>
      </header>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className={TEXT_LABEL}>Título</dt>
          <dd className="mt-1 text-sm text-slate-800">{draft.title}</dd>
        </div>
        <div>
          <dt className={TEXT_LABEL}>Área reportante</dt>
          <dd className="mt-1 text-sm text-slate-700">{areaName}</dd>
        </div>
        <div>
          <dt className={TEXT_LABEL}>Categoría IA</dt>
          <dd className="mt-1 text-sm text-slate-700">
            {interpretation.categoryName}
          </dd>
        </div>
        <div>
          <dt className={TEXT_LABEL}>Riesgo</dt>
          <dd className="mt-1 font-mono text-sm font-semibold tabular-nums text-slate-800">
            {interpretation.riskLevel} · {interpretation.riskScore}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className={TEXT_LABEL}>Resumen ejecutivo</dt>
          <dd className="mt-1 text-[0.85rem] leading-relaxed text-slate-600">
            {interpretation.executiveSummary}
          </dd>
        </div>
      </dl>

      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-400/15 pt-4">
        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className={`px-1 py-2 text-sm text-slate-500 ${FOCUS_VISIBLE}`}
        >
          Volver
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          aria-busy={saving}
          className={`px-4 py-2 text-sm font-semibold text-white ${FOCUS_VISIBLE} ${
            saving
              ? 'cursor-wait bg-indigo-500/60'
              : 'bg-indigo-600/90 hover:bg-indigo-600'
          }`}
        >
          {saving ? 'Guardando…' : 'Guardar situación'}
        </button>
      </div>
    </section>
  )
}
