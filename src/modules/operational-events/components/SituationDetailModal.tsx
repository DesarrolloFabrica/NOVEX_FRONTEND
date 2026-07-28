import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import type {
  IndicatorTrend,
  OperationalEvent,
  RiskLevel,
} from '@/modules/operational-events/types/operational-event.types'
import {
  EVENT_STATUS_LABEL,
  RISK_LEVEL_LABEL,
  eventRef,
  formatEventDate,
  timelineTypeLabel,
} from '@/modules/operational-events/components/eventPresentation'
import { CunmarkIcon } from '@/shared/components/CunmarkIcon'
import {
  CertaintyRing,
  EXEC_CERTAINTY_LABEL,
  EXEC_PRIORITY_LABEL,
  EXEC_URGENCY_LABEL,
  ExecutiveSection,
} from '@/modules/operational-events/components/situation-executive-report.shared'

interface SituationDetailModalProps {
  event: OperationalEvent
  onClose: () => void
}

const TREND_LABEL: Record<IndicatorTrend, string> = {
  up: 'Debe subir',
  down: 'Debe bajar',
  stable: 'Debe mantenerse',
}

function formatEventDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function SituationDetailModal({
  event,
  onClose,
}: SituationDetailModalProps) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const [exportState, setExportState] = useState<
    'idle' | 'generating' | 'error'
  >('idle')
  const interpretation = event.interpretation
  const report = interpretation?.executiveReport ?? null
  const risk: RiskLevel =
    report?.riskAssessment.riskLevel ?? interpretation?.riskLevel ?? 'moderate'
  const where =
    interpretation?.affectedAreaNames.join(' · ') || event.sourceAreaName

  const timeline = useMemo(
    () =>
      [...event.timeline.entries].sort((a, b) => a.at.localeCompare(b.at)),
    [event.timeline.entries],
  )

  const responsibleAreas = useMemo(() => {
    if (!report) return []
    const map = new Map<string, string>()
    for (const action of report.recommendedActions) {
      if (!map.has(action.suggestedArea)) {
        map.set(action.suggestedArea, action.action)
      }
    }
    return [...map.entries()].map(([area, mandate]) => ({ area, mandate }))
  }, [report])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    function handleKeyDown(eventKey: KeyboardEvent) {
      if (eventKey.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  async function handleExport(
    clickEvent?: MouseEvent<HTMLButtonElement>,
  ) {
    clickEvent?.preventDefault()
    clickEvent?.stopPropagation()
    if (exportState === 'generating') return
    setExportState('generating')
    try {
      const { exportSituationReportPdf } = await import(
        '@/modules/operational-events/utils/exportSituationReportPdf'
      )
      await exportSituationReportPdf(event)
      setExportState('idle')
    } catch {
      setExportState('error')
    }
  }

  return createPortal(
    <div className="cunmark-situation-modal" role="presentation">
      <button
        type="button"
        className="cunmark-situation-modal__backdrop"
        aria-label="Cerrar"
        onClick={onClose}
      />

      <div
        className="cunmark-situation-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-risk={risk}
      >
        <header className="cunmark-sit-header">
          <div className="cunmark-sit-header__lead">
            <span className="cunmark-sit-header__icon" aria-hidden="true">
              <CunmarkIcon name="alert" size={16} strokeWidth={1.7} />
            </span>
            <div className="min-w-0">
              <p className="cunmark-sit-header__eyebrow">
                Análisis ejecutivo de la situación
              </p>
              <h2 id={titleId} className="cunmark-sit-header__title">
                {report?.incidentSummary.executiveTitle ?? event.title}
              </h2>
              <p className="cunmark-sit-header__meta">
                <span>{eventRef(event.id)}</span>
                <span aria-hidden="true">·</span>
                <span>{where}</span>
                <span aria-hidden="true">·</span>
                <span>{event.reportedBy.name}</span>
              </p>
            </div>
          </div>

          <div className="cunmark-sit-header__aside">
            <button
              ref={closeRef}
              type="button"
              className="cunmark-sit-header__close"
              aria-label="Cerrar"
              onClick={onClose}
            >
              <CunmarkIcon name="x" size={15} strokeWidth={1.7} />
            </button>
            <div className="cunmark-sit-header__status" data-status={event.status}>
              <span className="cunmark-sit-header__status-dot" aria-hidden="true" />
              <strong>
                {EVENT_STATUS_LABEL[event.status]} · {RISK_LEVEL_LABEL[risk]}
              </strong>
            </div>
            <p className="cunmark-sit-header__date">
              <CunmarkIcon name="calendar" size={12} strokeWidth={1.6} />
              <time dateTime={event.reportedAt}>
                {formatEventDateTime(event.reportedAt)}
              </time>
            </p>
          </div>
        </header>

        <div className="cunmark-sit-scroll">
          {report ? (
            <div className="cunmark-sit-report">
              {/* 1. ¿Qué ocurrió? */}
              <ExecutiveSection
                number={1}
                question="¿Qué ocurrió?"
                hint="Resumen ejecutivo y causa raíz sobre el contexto recibido"
              >
                <div className="cunmark-sit-grid">
                  <article className="cunmark-sit-card">
                    <header>
                      <h3>Resumen para dirección</h3>
                    </header>
                    <p className="cunmark-sit-narrative">
                      {report.incidentSummary.executiveSummary}
                    </p>
                    {interpretation?.narrative ? (
                      <p className="cunmark-sit-card__hint" style={{ marginTop: 10 }}>
                        {interpretation.narrative}
                      </p>
                    ) : null}
                  </article>
                  <article className="cunmark-sit-card">
                    <header>
                      <h3>¿Por qué ocurrió?</h3>
                    </header>
                    <div className="cunmark-sit-cause">
                      <p className="cunmark-sit-cause__label">Causas detectadas</p>
                      <ul>
                        {report.rootCause.detectedCauses.map((cause) => (
                          <li key={cause}>{cause}</li>
                        ))}
                      </ul>
                      <p className="cunmark-sit-cause__label">Hipótesis</p>
                      <ul data-variant="hypothesis">
                        {report.rootCause.hypotheses.map((hypothesis) => (
                          <li key={hypothesis}>{hypothesis}</li>
                        ))}
                      </ul>
                      <p className="cunmark-sit-cause__label">Dependencias</p>
                      <ul>
                        {report.rootCause.dependencies.map((dependency) => (
                          <li key={dependency}>{dependency}</li>
                        ))}
                      </ul>
                    </div>
                  </article>
                </div>
              </ExecutiveSection>

              {/* 2. ¿Qué tan grave es? */}
              <ExecutiveSection
                number={2}
                question="¿Qué tan grave es?"
                hint="Riesgo, severidad y nivel de certeza del análisis"
              >
                <div className="cunmark-sit-grid">
                  <article className="cunmark-sit-card cunmark-sit-card--risk">
                    <header>
                      <h3>Riesgo actual</h3>
                      <span className="cunmark-sit-pill" data-risk={risk}>
                        {RISK_LEVEL_LABEL[risk]}
                      </span>
                    </header>
                    <div className="cunmark-sit-risk">
                      <p className="cunmark-sit-risk__score">
                        <strong>{report.riskAssessment.riskScore}</strong>
                        <span>/ 100</span>
                      </p>
                      <div
                        className="cunmark-sit-risk__bar"
                        role="meter"
                        aria-label="Nivel de riesgo"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={report.riskAssessment.riskScore}
                      >
                        <span
                          style={{ width: `${report.riskAssessment.riskScore}%` }}
                        />
                      </div>
                      <p className="cunmark-sit-card__hint">
                        Severidad {report.riskAssessment.severity}/5 · Categoría:{' '}
                        {interpretation?.categoryName ?? 'Sin clasificar'}
                      </p>
                    </div>
                  </article>
                  <article className="cunmark-sit-card">
                    <header>
                      <h3>Nivel de certeza</h3>
                      <span
                        className="cunmark-sit-pill"
                        data-risk={
                          report.riskAssessment.certainty.level === 'high'
                            ? 'low'
                            : report.riskAssessment.certainty.level === 'medium'
                              ? 'moderate'
                              : 'high'
                        }
                      >
                        {EXEC_CERTAINTY_LABEL[report.riskAssessment.certainty.level]}
                      </span>
                    </header>
                    <div className="cunmark-sit-tech">
                      <p className="cunmark-sit-card__hint">
                        {report.riskAssessment.certainty.explanation}
                      </p>
                      <CertaintyRing
                        percentage={report.riskAssessment.certainty.percentage}
                        level={report.riskAssessment.certainty.level}
                      />
                    </div>
                  </article>
                </div>
              </ExecutiveSection>

              {/* 3. ¿Por qué es grave? */}
              <ExecutiveSection
                number={3}
                question="¿Por qué es grave?"
                hint="Factores que determinaron la clasificación de la IA"
              >
                <article className="cunmark-sit-card">
                  <ul className="cunmark-sit-factors">
                    {report.decisionFactors.map((factor) => (
                      <li key={factor}>
                        <span aria-hidden="true">
                          <CunmarkIcon name="check" size={12} strokeWidth={2} />
                        </span>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </article>
              </ExecutiveSection>

              {/* 4. ¿Quién está siendo afectado? */}
              <ExecutiveSection
                number={4}
                question="¿Quién está siendo afectado?"
                hint="Impacto cuantificado y áreas afectadas con su motivo"
              >
                <div className="cunmark-sit-grid">
                  <article className="cunmark-sit-card">
                    <header>
                      <h3>Distribución del impacto</h3>
                    </header>
                    <ul className="cunmark-sit-dist">
                      <li data-tone="cyan">
                        <strong>
                          {report.impactAnalysis.internalImpactPercentage}%
                        </strong>
                        <span>Interno</span>
                        <p>Procesos y operación institucional</p>
                      </li>
                      <li data-tone="violet">
                        <strong>
                          {report.impactAnalysis.externalImpactPercentage}%
                        </strong>
                        <span>Externo</span>
                        <p>Aliados, proveedores y reputación</p>
                      </li>
                      <li data-tone="amber">
                        <strong>
                          {report.impactAnalysis.studentImpactPercentage}%
                        </strong>
                        <span>Estudiantes</span>
                        <p>Experiencia y continuidad académica</p>
                      </li>
                    </ul>
                    <dl className="cunmark-sit-impact-facts">
                      <div>
                        <dt>Estudiantes afectados (estimado)</dt>
                        <dd>
                          {report.impactAnalysis.estimatedAffectedStudents !==
                          null
                            ? `≈ ${report.impactAnalysis.estimatedAffectedStudents.toLocaleString('es-CO')}`
                            : 'No inferible con el contexto actual'}
                        </dd>
                      </div>
                      <div>
                        <dt>Áreas afectadas</dt>
                        <dd>{report.impactAnalysis.estimatedAffectedAreas}</dd>
                      </div>
                    </dl>
                    <p className="cunmark-sit-cause__label">Procesos afectados</p>
                    <ul className="cunmark-sit-chips">
                      {report.impactAnalysis.affectedProcesses.map((process) => (
                        <li key={process}>{process}</li>
                      ))}
                    </ul>
                  </article>
                  <article className="cunmark-sit-card">
                    <header>
                      <h3>Áreas afectadas</h3>
                    </header>
                    <ul className="cunmark-sit-areas">
                      {report.affectedAreas.map((area) => (
                        <li key={area.name}>
                          <div className="cunmark-sit-areas__head">
                            <strong>{area.name}</strong>
                            <span
                              className="cunmark-sit-pill"
                              data-risk={area.affectationLevel}
                            >
                              {RISK_LEVEL_LABEL[area.affectationLevel]}
                            </span>
                          </div>
                          <p>{area.reason}</p>
                        </li>
                      ))}
                    </ul>
                  </article>
                </div>
              </ExecutiveSection>

              {/* 5. ¿Qué recomienda la IA? */}
              <ExecutiveSection
                number={5}
                question="¿Qué recomienda la IA?"
                hint="Acciones priorizadas con motivo, área y tiempo recomendado"
              >
                <ol className="cunmark-sit-actions">
                  {report.recommendedActions.map((action, index) => (
                    <li
                      key={`${action.action}-${index}`}
                      className="cunmark-sit-card cunmark-sit-action"
                      data-priority={action.priority}
                    >
                      <div className="cunmark-sit-action__head">
                        <span
                          className="cunmark-sit-action__priority"
                          data-priority={action.priority}
                        >
                          {EXEC_PRIORITY_LABEL[action.priority]}
                        </span>
                        <span className="cunmark-sit-action__time">
                          <CunmarkIcon name="clock" size={11} strokeWidth={1.8} />
                          {action.recommendedTime}
                        </span>
                      </div>
                      <strong className="cunmark-sit-action__title">
                        {action.action}
                      </strong>
                      <p className="cunmark-sit-action__reason">{action.reason}</p>
                      <p className="cunmark-sit-action__area">
                        <CunmarkIcon name="users" size={11} strokeWidth={1.8} />
                        {action.suggestedArea}
                      </p>
                    </li>
                  ))}
                </ol>
              </ExecutiveSection>

              {/* 6. ¿Qué pasa si no actuamos? */}
              <ExecutiveSection
                number={6}
                question="¿Qué pasa si no actuamos?"
                hint="Consecuencias operacionales proyectadas por la IA"
              >
                <article className="cunmark-sit-card">
                  <ul className="cunmark-sit-factors" data-variant="warning">
                    {report.operationalConsequences.map((consequence) => (
                      <li key={consequence}>
                        <span aria-hidden="true">
                          <CunmarkIcon name="alert" size={12} strokeWidth={1.8} />
                        </span>
                        {consequence}
                      </li>
                    ))}
                  </ul>
                </article>
              </ExecutiveSection>

              {/* 7. Indicadores afectados */}
              <ExecutiveSection
                number={7}
                question="Indicadores afectados"
                hint="Qué medir, en qué unidad y hacia dónde debe moverse"
              >
                <div className="cunmark-sit-indicators">
                  {report.operationalIndicators.map((indicator) => (
                    <article
                      key={indicator.name}
                      className="cunmark-sit-card cunmark-sit-indicator"
                    >
                      <header>
                        <h3>{indicator.name}</h3>
                        <span
                          className="cunmark-sit-indicator__trend"
                          data-trend={indicator.trend}
                        >
                          {TREND_LABEL[indicator.trend]}
                        </span>
                      </header>
                      <p className="cunmark-sit-indicator__value">
                        <strong>
                          {indicator.suggestedValue.toLocaleString('es-CO')}
                        </strong>
                        <span>{indicator.unit}</span>
                      </p>
                      <p className="cunmark-sit-card__hint">
                        {indicator.explanation}
                      </p>
                    </article>
                  ))}
                </div>
              </ExecutiveSection>

              {/* 8. Áreas responsables */}
              <ExecutiveSection
                number={8}
                question="Áreas responsables"
                hint="Quién debe intervenir y con qué mandato inicial"
              >
                <article className="cunmark-sit-card">
                  <ul className="cunmark-sit-areas">
                    {responsibleAreas.map(({ area, mandate }) => (
                      <li key={area}>
                        <div className="cunmark-sit-areas__head">
                          <strong>{area}</strong>
                        </div>
                        <p>{mandate}</p>
                      </li>
                    ))}
                  </ul>
                </article>
              </ExecutiveSection>

              {/* 9. Cronología sugerida */}
              <ExecutiveSection
                number={9}
                question="Cronología sugerida"
                hint="Hitos de seguimiento propuestos y registro del evento"
              >
                <div className="cunmark-sit-grid">
                  <article className="cunmark-sit-card">
                    <header>
                      <h3>Próximos hitos</h3>
                    </header>
                    <ol className="cunmark-sit-timeline">
                      {report.timelineSuggestions.map((milestone) => (
                        <li key={milestone.horizon}>
                          <time>{milestone.horizon}</time>
                          <div>
                            <strong>Punto de control</strong>
                            <p>{milestone.checkpoint}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </article>
                  <article className="cunmark-sit-card">
                    <header>
                      <h3>Registro del evento</h3>
                    </header>
                    {timeline.length === 0 ? (
                      <p className="cunmark-sit-card__empty">Sin entradas.</p>
                    ) : (
                      <ol className="cunmark-sit-timeline">
                        {timeline.map((entry) => (
                          <li key={entry.id}>
                            <time dateTime={entry.at}>
                              {formatEventDateTime(entry.at)}
                            </time>
                            <div>
                              <strong>{timelineTypeLabel(entry.type)}</strong>
                              <p>{entry.description}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </article>
                </div>
              </ExecutiveSection>

              {/* 10. Conclusión ejecutiva */}
              <ExecutiveSection
                number={10}
                question="Conclusión ejecutiva"
                hint="Lectura final dirigida a la Dirección de Operaciones"
              >
                <article
                  className="cunmark-sit-card cunmark-sit-conclusion"
                  data-risk={risk}
                >
                  <div className="cunmark-sit-conclusion__grid">
                    <div>
                      <p className="cunmark-sit-cause__label">Gravedad</p>
                      <p className="cunmark-sit-conclusion__text">
                        {report.executiveConclusion.gravity}
                      </p>
                    </div>
                    <div>
                      <p className="cunmark-sit-cause__label">Urgencia</p>
                      <p className="cunmark-sit-conclusion__urgency">
                        {EXEC_URGENCY_LABEL[report.executiveConclusion.urgency]}
                      </p>
                    </div>
                    <div>
                      <p className="cunmark-sit-cause__label">Recomendación general</p>
                      <p className="cunmark-sit-conclusion__text">
                        {report.executiveConclusion.recommendation}
                      </p>
                    </div>
                  </div>
                  {report.dataGaps.length > 0 ? (
                    <div className="cunmark-sit-gaps">
                      <p className="cunmark-sit-cause__label">
                        Vacíos de información declarados por la IA
                      </p>
                      <ul>
                        {report.dataGaps.map((gap) => (
                          <li key={gap}>{gap}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </article>
              </ExecutiveSection>
            </div>
          ) : (
            <div className="cunmark-sit-grid">
              <article className="cunmark-sit-card">
                <header>
                  <h3>Descripción</h3>
                </header>
                <p className="cunmark-sit-narrative">
                  {interpretation?.narrative ?? event.description}
                </p>
                <p className="cunmark-sit-card__hint" style={{ marginTop: 10 }}>
                  Esta situación no cuenta con reporte ejecutivo de inteligencia
                  (contrato v2). Registrada el {formatEventDate(event.reportedAt)}.
                </p>
              </article>
            </div>
          )}
        </div>

        <footer className="cunmark-sit-footer">
          <button
            type="button"
            className="cunmark-sit-footer__secondary"
            onClick={(clickEvent) => void handleExport(clickEvent)}
            disabled={exportState === 'generating'}
            aria-busy={exportState === 'generating'}
          >
            <CunmarkIcon name="download" size={14} />
            {exportState === 'generating'
              ? 'Generando PDF…'
              : exportState === 'error'
                ? 'Reintentar exportación'
                : 'Exportar reporte PDF'}
          </button>
          <button
            type="button"
            className="cunmark-sit-footer__primary"
            onClick={onClose}
          >
            Cerrar detalle
            <CunmarkIcon name="chevron-right" size={14} />
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
