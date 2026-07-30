import { useState, type MouseEvent } from 'react'
import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'
import { RISK_LEVEL_LABEL } from '@/modules/operational-events/components/eventPresentation'
import { NovexIcon } from '@/shared/components/NovexIcon'
import {
  CertaintyRing,
  EXEC_CERTAINTY_LABEL,
  EXEC_PRIORITY_LABEL,
  EXEC_PRIORITY_LEVEL_LABEL,
  EXEC_URGENCY_LABEL,
  ExecutiveSection,
  riskFromEvent,
} from './situation-executive-report.shared'

interface SituationExecutiveReportBodyProps {
  event: OperationalEvent
  variant?: 'compact' | 'full'
  className?: string
  showExport?: boolean
}

export function SituationExecutiveReportBody({
  event,
  variant = 'compact',
  className = '',
  showExport = true,
}: SituationExecutiveReportBodyProps) {
  const [exportState, setExportState] = useState<
    'idle' | 'generating' | 'error'
  >('idle')
  const interpretation = event.interpretation
  const report = interpretation?.executiveReport ?? null
  const risk = riskFromEvent(
    report?.riskAssessment.riskLevel ?? interpretation?.riskLevel,
  )

  async function handleExport(clickEvent?: MouseEvent<HTMLButtonElement>) {
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

  if (!report) {
    return (
      <div className={['novex-sit-grid', className].filter(Boolean).join(' ')}>
        <article className="novex-sit-card">
          <header>
            <h3>Resumen operacional</h3>
          </header>
          <p className="novex-sit-narrative">
            {interpretation?.executiveSummary ?? event.description}
          </p>
        </article>
      </div>
    )
  }

  const sections = variant === 'compact' ? (
    <>
      {report.executiveNarrative ? (
        <ExecutiveSection
          number={1}
          question="Lectura ejecutiva"
          hint="Análisis de inteligencia operacional NOVEX"
        >
          <article className="novex-sit-card novex-sit-card--narrative">
            <p className="novex-sit-narrative">{report.executiveNarrative}</p>
          </article>
        </ExecutiveSection>
      ) : null}

      {report.executiveDecision ? (
        <ExecutiveSection
          number={report.executiveNarrative ? 2 : 1}
          question="¿Qué debe decidir la dirección?"
          hint="Decisión inmediata recomendada"
        >
          <article className="novex-sit-card novex-sit-card--decision" data-risk={risk}>
            <p className="novex-sit-narrative">{report.executiveDecision.decision}</p>
            <div className="novex-sit-grid" style={{ marginTop: 12 }}>
              <div>
                <p className="novex-sit-cause__label">Urgencia</p>
                <span className="novex-sit-pill">
                  {EXEC_URGENCY_LABEL[report.executiveDecision.urgencyLevel]}
                </span>
              </div>
              <div>
                <p className="novex-sit-cause__label">Tiempo para actuar</p>
                <strong>{report.executiveDecision.recommendedActionTime}</strong>
              </div>
              <div>
                <p className="novex-sit-cause__label">Responsable inicial</p>
                <strong>{report.executiveDecision.initialResponsible}</strong>
              </div>
            </div>
          </article>
        </ExecutiveSection>
      ) : null}

      <ExecutiveSection
        number={report.executiveNarrative ? (report.executiveDecision ? 3 : 2) : 1}
        question="¿Qué ocurrió?"
        hint="Estado actual de la situación"
      >
        <article className="novex-sit-card">
          <p className="novex-sit-narrative">
            {report.incidentSummary.executiveSummary}
          </p>
          {interpretation?.narrative ? (
            <p className="novex-sit-card__hint" style={{ marginTop: 10 }}>
              {interpretation.narrative}
            </p>
          ) : null}
        </article>
      </ExecutiveSection>

      <ExecutiveSection
        number={report.executiveNarrative ? (report.executiveDecision ? 4 : 3) : 2}
        question="¿Qué tan grave es?"
        hint="Riesgo, prioridad y certeza del análisis"
      >
        <div className="novex-sit-grid">
          {report.executivePriority ? (
            <article className="novex-sit-card">
              <header>
                <h3>Prioridad ejecutiva</h3>
                <span className="novex-sit-pill" data-risk={risk}>
                  {EXEC_PRIORITY_LEVEL_LABEL[report.executivePriority.level]}
                </span>
              </header>
              <p className="novex-sit-card__hint">
                {report.executivePriority.justification}
              </p>
            </article>
          ) : null}
          <article className="novex-sit-card novex-sit-card--risk">
            <header>
              <h3>Riesgo actual</h3>
              <span className="novex-sit-pill" data-risk={risk}>
                {RISK_LEVEL_LABEL[risk]}
              </span>
            </header>
            <p className="novex-sit-risk__score">
              <strong>{report.riskAssessment.riskScore}</strong>
              <span>/ 100</span>
            </p>
          </article>
          <article className="novex-sit-card">
            <header>
              <h3>Certeza</h3>
              <span className="novex-sit-pill">
                {EXEC_CERTAINTY_LABEL[report.riskAssessment.certainty.level]}
              </span>
            </header>
            <CertaintyRing
              percentage={report.riskAssessment.certainty.percentage}
              level={report.riskAssessment.certainty.level}
            />
            {report.confidenceExplanation ? (
              <div className="novex-sit-cause" style={{ marginTop: 10 }}>
                {report.confidenceExplanation.supportingFactors.length > 0 ? (
                  <ul>
                    {report.confidenceExplanation.supportingFactors.map((factor) => (
                      <li key={factor}>✓ {factor}</li>
                    ))}
                  </ul>
                ) : null}
                {report.confidenceExplanation.reducingFactors.length > 0 ? (
                  <ul>
                    {report.confidenceExplanation.reducingFactors.map((factor) => (
                      <li key={factor}>• {factor}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </article>
          {report.riskBreakdown ? (
            <article className="novex-sit-card">
              <header>
                <h3>Desglose de riesgo</h3>
                <span className="novex-sit-pill">
                  {report.riskBreakdown.totalScore}/100
                </span>
              </header>
              <ul className="novex-sit-areas">
                {report.riskBreakdown.components.map((component) => (
                  <li key={component.name}>
                    <div className="novex-sit-areas__head">
                      <strong>{component.name}</strong>
                      <span>{component.score}</span>
                    </div>
                    <p>{component.explanation}</p>
                  </li>
                ))}
              </ul>
            </article>
          ) : null}
        </div>
      </ExecutiveSection>

      {report.criticalWindow ? (
        <ExecutiveSection
          number={report.executiveNarrative ? 5 : 3}
          question="¿Qué pasa si no actuamos?"
          hint="Ventana crítica de impacto"
        >
          <article className="novex-sit-card">
            <p className="novex-sit-narrative">
              <strong>{report.criticalWindow.timeBeforeEscalation}</strong>
              {' — '}
              {report.criticalWindow.explanation}
            </p>
          </article>
        </ExecutiveSection>
      ) : null}

      <ExecutiveSection
        number={report.executiveNarrative ? (report.criticalWindow ? 6 : 5) : 3}
        question="Causa raíz e hipótesis"
        hint="Evidencia y dependencias detectadas"
      >
        <article className="novex-sit-card">
          <div className="novex-sit-cause">
            <p className="novex-sit-cause__label">Causas detectadas</p>
            <ul>
              {report.rootCause.detectedCauses.map((cause) => (
                <li key={cause}>{cause}</li>
              ))}
            </ul>
            <p className="novex-sit-cause__label">Hipótesis más probables</p>
            <ul>
              {(report.probableCauses ?? []).map((cause) => (
                <li key={cause.hypothesis}>
                  <strong>{cause.hypothesis}</strong> ({cause.probability}%):{' '}
                  {cause.justification}
                </li>
              ))}
              {!(report.probableCauses?.length) &&
                report.rootCause.hypotheses.map((hypothesis) => (
                  <li key={hypothesis}>{hypothesis}</li>
                ))}
            </ul>
            {report.operationalPropagation ? (
              <>
                <p className="novex-sit-cause__label">Propagación operacional</p>
                <ol className="novex-sit-propagation">
                  {report.operationalPropagation.chain.map((step) => (
                    <li key={step.stage}>
                      <strong>{step.stage}</strong>
                      <span>{step.description}</span>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <>
                <p className="novex-sit-cause__label">Dependencias</p>
                <ul>
                  {report.rootCause.dependencies.map((dependency) => (
                    <li key={dependency}>{dependency}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </article>
      </ExecutiveSection>

      {report.decisionMatrix ? (
        <ExecutiveSection
          number={7}
          question="Matriz de decisiones"
          hint="Clasificación de acciones por horizonte"
        >
          <div className="novex-sit-grid">
            {(
              [
                ['Resolver ahora', report.decisionMatrix.resolveNow],
                ['Resolver hoy', report.decisionMatrix.resolveToday],
                ['Monitorear', report.decisionMatrix.monitor],
                ['Escalar', report.decisionMatrix.escalate],
              ] as const
            ).map(([label, actions]) =>
              actions.length > 0 ? (
                <article key={label} className="novex-sit-card">
                  <header>
                    <h3>{label}</h3>
                  </header>
                  <ul>
                    {actions.map((action) => (
                      <li key={action.action}>
                        <strong>{action.action}</strong>
                        <p className="novex-sit-card__hint">{action.reason}</p>
                      </li>
                    ))}
                  </ul>
                </article>
              ) : null,
            )}
          </div>
        </ExecutiveSection>
      ) : null}

      <ExecutiveSection
        number={report.decisionMatrix ? 8 : 4}
        question="Áreas afectadas"
        hint="Coordinaciones impactadas y motivo"
      >
        <ul className="novex-sit-areas">
          {report.affectedAreas.map((area) => (
            <li key={area.name}>
              <div className="novex-sit-areas__head">
                <strong>{area.name}</strong>
                <span className="novex-sit-pill" data-risk={area.affectationLevel}>
                  {RISK_LEVEL_LABEL[area.affectationLevel]}
                </span>
              </div>
              <p>{area.reason}</p>
            </li>
          ))}
        </ul>
      </ExecutiveSection>

      <ExecutiveSection
        number={report.decisionMatrix ? 9 : 5}
        question="Recomendaciones prioritarias"
        hint="Acciones sugeridas por la IA"
      >
        <ol className="novex-sit-actions">
          {report.recommendedActions.slice(0, 3).map((action, index) => (
            <li
              key={`${action.action}-${index}`}
              className="novex-sit-card novex-sit-action"
              data-priority={action.priority}
            >
              <div className="novex-sit-action__head">
                <span
                  className="novex-sit-action__priority"
                  data-priority={action.priority}
                >
                  {EXEC_PRIORITY_LABEL[action.priority]}
                </span>
              </div>
              <strong className="novex-sit-action__title">{action.action}</strong>
              <p className="novex-sit-action__reason">{action.reason}</p>
            </li>
          ))}
        </ol>
      </ExecutiveSection>

      <ExecutiveSection
        number={report.decisionMatrix ? 10 : 6}
        question="Conclusión ejecutiva"
        hint="Lectura final para dirección"
      >
        <article className="novex-sit-card novex-sit-conclusion" data-risk={risk}>
          <p className="novex-sit-conclusion__text">
            {report.executiveConclusion.gravity}
          </p>
          <p className="novex-sit-conclusion__urgency">
            Urgencia: {EXEC_URGENCY_LABEL[report.executiveConclusion.urgency]}
          </p>
          <p className="novex-sit-conclusion__text">
            {report.executiveConclusion.recommendation}
          </p>
        </article>
      </ExecutiveSection>
    </>
  ) : (
    <>
      <ExecutiveSection number={1} question="¿Qué ocurrió?">
        <article className="novex-sit-card">
          <p className="novex-sit-narrative">
            {report.incidentSummary.executiveSummary}
          </p>
        </article>
      </ExecutiveSection>
      <ExecutiveSection number={2} question="Recomendaciones">
        <ol className="novex-sit-actions">
          {report.recommendedActions.map((action, index) => (
            <li
              key={`${action.action}-${index}`}
              className="novex-sit-card novex-sit-action"
              data-priority={action.priority}
            >
              <strong className="novex-sit-action__title">{action.action}</strong>
              <p className="novex-sit-action__reason">{action.reason}</p>
            </li>
          ))}
        </ol>
      </ExecutiveSection>
    </>
  )

  return (
    <div className={['novex-sit-report', className].filter(Boolean).join(' ')}>
      {sections}
      {showExport ? (
        <footer className="island-focus-panel__footer">
          <button
            type="button"
            className="island-focus-panel__export"
            onClick={(clickEvent) => void handleExport(clickEvent)}
            disabled={exportState === 'generating'}
            aria-busy={exportState === 'generating'}
          >
            <NovexIcon name="download" size={14} />
            {exportState === 'generating'
              ? 'Generando PDF…'
              : exportState === 'error'
                ? 'Reintentar exportación'
                : 'Descargar reporte PDF'}
          </button>
        </footer>
      ) : null}
    </div>
  )
}
