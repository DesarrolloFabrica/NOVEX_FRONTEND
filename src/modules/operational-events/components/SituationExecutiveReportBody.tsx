import { useState, type MouseEvent } from 'react'
import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'
import { RISK_LEVEL_LABEL } from '@/modules/operational-events/components/eventPresentation'
import { CunmarkIcon } from '@/shared/components/CunmarkIcon'
import {
  CertaintyRing,
  EXEC_CERTAINTY_LABEL,
  EXEC_PRIORITY_LABEL,
  EXEC_URGENCY_LABEL,
  ExecutiveSection,
  riskFromEvent,
} from './situation-executive-report.shared'

interface SituationExecutiveReportBodyProps {
  event: OperationalEvent
  variant?: 'compact' | 'full'
  className?: string
}

export function SituationExecutiveReportBody({
  event,
  variant = 'compact',
  className = '',
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
    } catch (error) {
      console.error('No fue posible generar el reporte PDF.', error)
      setExportState('error')
    }
  }

  if (!report) {
    return (
      <div className={['cunmark-sit-grid', className].filter(Boolean).join(' ')}>
        <article className="cunmark-sit-card">
          <header>
            <h3>Resumen operacional</h3>
          </header>
          <p className="cunmark-sit-narrative">
            {interpretation?.executiveSummary ?? event.description}
          </p>
        </article>
      </div>
    )
  }

  const sections = variant === 'compact' ? (
    <>
      <ExecutiveSection
        number={1}
        question="¿Qué ocurrió?"
        hint="Resumen ejecutivo de la situación origen"
      >
        <article className="cunmark-sit-card">
          <p className="cunmark-sit-narrative">
            {report.incidentSummary.executiveSummary}
          </p>
          {interpretation?.narrative ? (
            <p className="cunmark-sit-card__hint" style={{ marginTop: 10 }}>
              {interpretation.narrative}
            </p>
          ) : null}
        </article>
      </ExecutiveSection>

      <ExecutiveSection
        number={2}
        question="¿Qué tan grave es?"
        hint="Riesgo y certeza del análisis"
      >
        <div className="cunmark-sit-grid">
          <article className="cunmark-sit-card cunmark-sit-card--risk">
            <header>
              <h3>Riesgo actual</h3>
              <span className="cunmark-sit-pill" data-risk={risk}>
                {RISK_LEVEL_LABEL[risk]}
              </span>
            </header>
            <p className="cunmark-sit-risk__score">
              <strong>{report.riskAssessment.riskScore}</strong>
              <span>/ 100</span>
            </p>
          </article>
          <article className="cunmark-sit-card">
            <header>
              <h3>Certeza</h3>
              <span className="cunmark-sit-pill">
                {EXEC_CERTAINTY_LABEL[report.riskAssessment.certainty.level]}
              </span>
            </header>
            <CertaintyRing
              percentage={report.riskAssessment.certainty.percentage}
              level={report.riskAssessment.certainty.level}
            />
          </article>
        </div>
      </ExecutiveSection>

      <ExecutiveSection
        number={3}
        question="Causa raíz"
        hint="Evidencia y dependencias detectadas"
      >
        <article className="cunmark-sit-card">
          <div className="cunmark-sit-cause">
            <p className="cunmark-sit-cause__label">Causas detectadas</p>
            <ul>
              {report.rootCause.detectedCauses.map((cause) => (
                <li key={cause}>{cause}</li>
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
      </ExecutiveSection>

      <ExecutiveSection
        number={4}
        question="Áreas afectadas"
        hint="Coordinaciones impactadas y motivo"
      >
        <ul className="cunmark-sit-areas">
          {report.affectedAreas.map((area) => (
            <li key={area.name}>
              <div className="cunmark-sit-areas__head">
                <strong>{area.name}</strong>
                <span className="cunmark-sit-pill" data-risk={area.affectationLevel}>
                  {RISK_LEVEL_LABEL[area.affectationLevel]}
                </span>
              </div>
              <p>{area.reason}</p>
            </li>
          ))}
        </ul>
      </ExecutiveSection>

      <ExecutiveSection
        number={5}
        question="Recomendaciones prioritarias"
        hint="Acciones sugeridas por la IA"
      >
        <ol className="cunmark-sit-actions">
          {report.recommendedActions.slice(0, 3).map((action, index) => (
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
              </div>
              <strong className="cunmark-sit-action__title">{action.action}</strong>
              <p className="cunmark-sit-action__reason">{action.reason}</p>
            </li>
          ))}
        </ol>
      </ExecutiveSection>

      <ExecutiveSection
        number={6}
        question="Conclusión ejecutiva"
        hint="Lectura final para dirección"
      >
        <article className="cunmark-sit-card cunmark-sit-conclusion" data-risk={risk}>
          <p className="cunmark-sit-conclusion__text">
            {report.executiveConclusion.gravity}
          </p>
          <p className="cunmark-sit-conclusion__urgency">
            Urgencia: {EXEC_URGENCY_LABEL[report.executiveConclusion.urgency]}
          </p>
          <p className="cunmark-sit-conclusion__text">
            {report.executiveConclusion.recommendation}
          </p>
        </article>
      </ExecutiveSection>
    </>
  ) : (
    <>
      <ExecutiveSection number={1} question="¿Qué ocurrió?">
        <article className="cunmark-sit-card">
          <p className="cunmark-sit-narrative">
            {report.incidentSummary.executiveSummary}
          </p>
        </article>
      </ExecutiveSection>
      <ExecutiveSection number={2} question="Recomendaciones">
        <ol className="cunmark-sit-actions">
          {report.recommendedActions.map((action, index) => (
            <li
              key={`${action.action}-${index}`}
              className="cunmark-sit-card cunmark-sit-action"
              data-priority={action.priority}
            >
              <strong className="cunmark-sit-action__title">{action.action}</strong>
              <p className="cunmark-sit-action__reason">{action.reason}</p>
            </li>
          ))}
        </ol>
      </ExecutiveSection>
    </>
  )

  return (
    <div className={['cunmark-sit-report', className].filter(Boolean).join(' ')}>
      {sections}
      <footer className="island-focus-panel__footer">
        <button
          type="button"
          className="island-focus-panel__export"
          onClick={(clickEvent) => void handleExport(clickEvent)}
          disabled={exportState === 'generating'}
          aria-busy={exportState === 'generating'}
        >
          <CunmarkIcon name="download" size={14} />
          {exportState === 'generating'
            ? 'Generando PDF…'
            : exportState === 'error'
              ? 'Reintentar exportación'
              : 'Descargar reporte PDF'}
        </button>
      </footer>
    </div>
  )
}
