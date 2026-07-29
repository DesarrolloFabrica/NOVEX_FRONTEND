// Componente: Paso 3 — visualización de la interpretación IA (solo lectura).
// Sprint 9: métricas tipográficas sin celdas en caja.

import type { AIInterpretation } from '@/modules/operational-events/types/operational-event.types'
import {
  FOCUS_VISIBLE,
  TEXT_LABEL,
  TEXT_METRIC,
} from '@/modules/monitoring/constants/monitoringTheme'

const RISK_LABEL: Record<AIInterpretation['riskLevel'], string> = {
  low: 'Bajo',
  moderate: 'Moderado',
  high: 'Alto',
  critical: 'Crítico',
}

interface EventInterpretationViewProps {
  interpretation: AIInterpretation
  onBack: () => void
  onSave: () => void
  saving?: boolean
  error?: string | null
}

function MetricCell({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="novex-exec-metric">
      <p className="novex-exec-metric__value">{value}</p>
      <p className="novex-exec-metric__label">{label}</p>
    </div>
  )
}

export function EventInterpretationView({
  interpretation,
  onBack,
  onSave,
  saving = false,
  error = null,
}: EventInterpretationViewProps) {
  const confidencePct =
    interpretation.confidence !== undefined
      ? `${Math.round(interpretation.confidence * 100)}%`
      : '—'

  return (
    <section className="novex-event-interpretation space-y-5">
      <header className="space-y-1">
        <h2 className="text-sm font-semibold tracking-tight text-slate-800">
          Interpretación
        </h2>
        <p className="text-[0.8rem] text-slate-500">
          Generada por {interpretation.modelLabel} · solo lectura
        </p>
      </header>

      <div className="space-y-4">
        <article className="space-y-1.5">
          <p className={TEXT_LABEL}>Resumen ejecutivo</p>
          <p className="text-[0.9rem] font-medium leading-relaxed text-slate-800">
            {interpretation.executiveSummary}
          </p>
        </article>

        <article className="space-y-1.5">
          <p className={TEXT_LABEL}>Narrativa</p>
          <p className="text-[0.8rem] leading-relaxed text-slate-600">
            {interpretation.narrative}
          </p>
        </article>

        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCell label="Categoría" value={interpretation.categoryName} />
          <MetricCell
            label="Riesgo"
            value={`${RISK_LABEL[interpretation.riskLevel]} · ${interpretation.riskScore}`}
          />
          <MetricCell label="Confianza" value={confidencePct} />
          <MetricCell
            label="Severidad"
            value={`${interpretation.impactSeverity}/5`}
          />
          <MetricCell
            label="Interno"
            value={`${interpretation.impactInternal}%`}
          />
          <MetricCell
            label="Externo"
            value={`${interpretation.impactExternal}%`}
          />
          <MetricCell
            label="Estudiantes"
            value={`${interpretation.impactStudents}%`}
          />
          <MetricCell
            label="Afectación"
            value={`${interpretation.affectationPercentage}%`}
          />
        </div>

        <article className="space-y-1.5">
          <p className={TEXT_LABEL}>Áreas afectadas</p>
          <p className="text-[0.8rem] text-slate-700">
            {interpretation.affectedAreaNames.join(' · ')}
          </p>
        </article>

        <article className="space-y-1.5">
          <p className={TEXT_LABEL}>Indicadores sugeridos</p>
          <ul className="space-y-1.5">
            {interpretation.suggestedIndicators.map((indicator) => (
              <li
                key={indicator.id}
                className="flex items-center justify-between gap-3 text-[0.8rem]"
              >
                <span className="text-slate-600">{indicator.label}</span>
                <span className={`shrink-0 ${TEXT_METRIC}`}>
                  {indicator.value}
                  {indicator.unit ? ` ${indicator.unit}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </article>

        {interpretation.detectedPatterns.length > 0 ? (
          <article className="space-y-1.5">
            <p className={TEXT_LABEL}>Patrones detectados</p>
            <ul className="space-y-1 text-[0.8rem] text-slate-600">
              {interpretation.detectedPatterns.map((pattern) => (
                <li key={pattern}>{pattern}</li>
              ))}
            </ul>
          </article>
        ) : null}
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
              ? 'cursor-wait bg-emerald-500/60'
              : 'bg-emerald-600/90 hover:bg-emerald-600'
          }`}
        >
          {saving ? 'Guardando…' : 'Guardar situación'}
        </button>
      </div>
    </section>
  )
}
