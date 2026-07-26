// Componente: Paso 2 — disparo de análisis IA (mock, sin Gemini).
// Sprint 9: resumen tipográfico sin tarjeta.

import { FOCUS_VISIBLE, TEXT_LABEL } from '@/modules/monitoring/constants/monitoringTheme'
import type { OperationalEventDraft } from '@/modules/operational-events/types/operational-event.types'
import { resolveOperationalAreaName } from '@/modules/operational-events/utils/operationalArea.utils'
import { OPERATIONAL_AREAS_CATALOG } from '@/modules/operational-events/data/operational-areas.mock'

interface EventAnalyzeStepProps {
  draft: OperationalEventDraft
  analyzing: boolean
  error: string | null
  onAnalyze: () => void
  onBack: () => void
}

export function EventAnalyzeStep({
  draft,
  analyzing,
  error,
  onAnalyze,
  onBack,
}: EventAnalyzeStepProps) {
  const areaName = resolveOperationalAreaName(
    OPERATIONAL_AREAS_CATALOG,
    draft.sourceAreaId,
  )

  return (
    <section className="omega-event-analyze space-y-5">
      <header className="space-y-1">
        <h2 className="text-sm font-semibold tracking-tight text-slate-800">
          Analizar
        </h2>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className={TEXT_LABEL}>Situación</p>
          <p className="mt-1 text-sm font-medium text-slate-800">{draft.title}</p>
        </div>
        <div>
          <p className={TEXT_LABEL}>Área reportante</p>
          <p className="mt-1 text-sm text-slate-700">{areaName}</p>
        </div>
        <div className="sm:col-span-2">
          <p className={TEXT_LABEL}>Relato</p>
          <p className="mt-1 text-[0.85rem] leading-relaxed text-slate-600">
            {draft.description}
          </p>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-400/15 pt-4">
        <button
          type="button"
          onClick={onBack}
          disabled={analyzing}
          className={`px-1 py-2 text-sm text-slate-500 ${FOCUS_VISIBLE}`}
        >
          Volver
        </button>
        <button
          type="button"
          onClick={onAnalyze}
          disabled={analyzing}
          aria-busy={analyzing}
          className={`omega-console-action px-4 py-2 text-sm font-semibold text-white ${FOCUS_VISIBLE} ${
            analyzing
              ? 'cursor-wait bg-indigo-500/60'
              : 'bg-indigo-600/90 hover:bg-indigo-600'
          }`}
        >
          {analyzing ? 'Analizando…' : 'Analizar con IA'}
        </button>
      </div>
    </section>
  )
}
