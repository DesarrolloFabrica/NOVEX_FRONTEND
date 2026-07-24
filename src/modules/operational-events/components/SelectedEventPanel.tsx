// Ficha ejecutiva del evento seleccionado (Sprint 10).
// Primero: riesgo · qué · dónde · impactos. Lo demás, colapsado.

import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'
import { CRYSTAL_ZONE_SUPPORT } from '@/modules/monitoring/constants/monitoringTheme'
import { INTEL_ZONE } from '@/modules/monitoring/constants/visualHierarchy'
import {
  EVENT_STATUS_BADGE_CLASSES,
  EVENT_STATUS_LABEL,
  RISK_LEVEL_BADGE_CLASSES,
  RISK_LEVEL_LABEL,
  eventRef,
  formatEventDate,
} from '@/modules/operational-events/components/eventPresentation'

interface SelectedEventPanelProps {
  event: OperationalEvent | null
}

export function SelectedEventPanel({ event }: SelectedEventPanelProps) {
  if (!event) {
    return (
      <aside
        className={`operations-intelligence-panel omega-brief relative ${INTEL_ZONE} ${CRYSTAL_ZONE_SUPPORT}`}
      >
        <p className="omega-section-eyebrow">Ficha</p>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="text-center text-[0.72rem] text-slate-500">
            Seleccione un expediente.
          </p>
        </div>
      </aside>
    )
  }

  const interpretation = event.interpretation
  const where =
    interpretation?.affectedAreaNames.join(' · ') || event.sourceAreaName
  const confidence =
    interpretation?.confidence !== undefined
      ? `${Math.round(interpretation.confidence * 100)}%`
      : '—'

  return (
    <aside
      className={`operations-intelligence-panel omega-brief relative ${INTEL_ZONE} ${CRYSTAL_ZONE_SUPPORT}`}
    >
      <div className="omega-brief__hero">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="omega-section-eyebrow mb-1">Riesgo</p>
            <p className="omega-brief__score">
              {interpretation?.riskScore ?? '—'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 pb-1">
            <span className="font-mono text-[10px] text-slate-500">
              {eventRef(event.id)}
            </span>
            <span className={EVENT_STATUS_BADGE_CLASSES[event.status]}>
              {EVENT_STATUS_LABEL[event.status]}
            </span>
            {interpretation ? (
              <span
                className={RISK_LEVEL_BADGE_CLASSES[interpretation.riskLevel]}
              >
                {RISK_LEVEL_LABEL[interpretation.riskLevel]}
              </span>
            ) : null}
          </div>
        </div>

        <h3 className="omega-brief__title">{event.title}</h3>
        <p className="omega-brief__where">{where}</p>
        {interpretation ? (
          <p className="omega-brief__summary">
            {interpretation.executiveSummary}
          </p>
        ) : null}

        {interpretation ? (
          <div className="omega-brief__impacts" aria-label="Impactos">
            <div className="omega-exec-metric">
              <p className="omega-exec-metric__value">
                {interpretation.impactInternal}%
              </p>
              <p className="omega-exec-metric__label">Interno</p>
            </div>
            <div className="omega-exec-metric">
              <p className="omega-exec-metric__value">
                {interpretation.impactExternal}%
              </p>
              <p className="omega-exec-metric__label">Externo</p>
            </div>
            <div className="omega-exec-metric">
              <p className="omega-exec-metric__value">
                {interpretation.impactStudents}%
              </p>
              <p className="omega-exec-metric__label">Estudiantes</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="omega-brief__body">
        {interpretation ? (
          <>
            <details>
              <summary>Narrativa</summary>
              <p>{interpretation.narrative}</p>
            </details>
            <details>
              <summary>Indicadores</summary>
              {interpretation.suggestedIndicators.length === 0 ? (
                <p>Sin indicadores.</p>
              ) : (
                <ul className="space-y-1.5">
                  {interpretation.suggestedIndicators.map((indicator) => (
                    <li
                      key={indicator.id}
                      className="flex justify-between gap-2"
                    >
                      <span>{indicator.label}</span>
                      <strong className="font-mono">
                        {indicator.value}
                        {indicator.unit ? ` ${indicator.unit}` : ''}
                      </strong>
                    </li>
                  ))}
                </ul>
              )}
            </details>
            <details>
              <summary>Lectura técnica</summary>
              <ul className="space-y-1">
                <li>
                  Categoría · {interpretation.categoryName}
                </li>
                <li>
                  Severidad · {interpretation.impactSeverity}/5
                </li>
                <li>
                  Afectación · {interpretation.affectationPercentage}%
                </li>
                <li>Confianza · {confidence}</li>
              </ul>
            </details>
          </>
        ) : (
          <p className="text-[0.75rem] text-slate-500">Sin interpretación IA.</p>
        )}

        <details>
          <summary>Descripción</summary>
          <p>{event.description}</p>
        </details>

        <details>
          <summary>Timeline</summary>
          {event.timeline.entries.length === 0 ? (
            <p>Sin entradas.</p>
          ) : (
            <ol className="space-y-2">
              {[...event.timeline.entries]
                .sort((a, b) => a.at.localeCompare(b.at))
                .map((entry) => (
                  <li key={entry.id}>
                    <p className="font-mono text-[10px] text-slate-500">
                      {formatEventDate(entry.at)} · {entry.type}
                    </p>
                    <p className="mt-0.5">{entry.description}</p>
                  </li>
                ))}
            </ol>
          )}
        </details>

        <details>
          <summary>Metadatos</summary>
          <ul className="space-y-1">
            <li>Reportante · {event.sourceAreaName}</li>
            <li>Por · {event.reportedBy.name}</li>
            <li>Fecha · {formatEventDate(event.reportedAt)}</li>
            <li>
              Observaciones ·{' '}
              {event.observations?.trim() || 'Ninguna'}
            </li>
            <li>
              Adjuntos ·{' '}
              {event.attachmentNames?.length
                ? event.attachmentNames.join(', ')
                : 'Ninguno'}
            </li>
          </ul>
        </details>
      </div>
    </aside>
  )
}
