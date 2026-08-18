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
  OperationalEvent,
  RiskLevel,
} from '@/modules/operational-events/types/operational-event.types'
import {
  EVENT_STATUS_LABEL,
  RISK_LEVEL_LABEL,
  eventRef,
  formatEventDate,
} from '@/modules/operational-events/components/eventPresentation'
import { NovexIcon } from '@/shared/components/NovexIcon'
import {
  EXEC_CERTAINTY_LABEL,
  EXEC_PRIORITY_LABEL,
  EXEC_URGENCY_LABEL,
} from '@/modules/operational-events/components/situation-executive-report.shared'

interface SituationDetailModalProps {
  event: OperationalEvent
  onClose: () => void
  /** Muestra ficha de auditoría (quién, cuándo, coordinación) para roles institucionales. */
  showAuditTrail?: boolean
  /** Reduce la lectura en pantalla a decisión, impacto y seguimiento. */
  executiveSummary?: boolean
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
  showAuditTrail = false,
  executiveSummary = false,
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

  const actions = useMemo(
    () => report?.recommendedActions.slice(0, 5) ?? [],
    [report],
  )
  const causes = useMemo(
    () => report?.rootCause.detectedCauses.slice(0, 4) ?? [],
    [report],
  )
  const hypotheses = useMemo(
    () => report?.rootCause.hypotheses.slice(0, 3) ?? [],
    [report],
  )
  const dependencies = useMemo(
    () => report?.rootCause.dependencies.slice(0, 4) ?? [],
    [report],
  )
  const decisionFactors = useMemo(
    () => report?.decisionFactors.slice(0, 5) ?? [],
    [report],
  )
  const consequences = useMemo(
    () => report?.operationalConsequences.slice(0, 4) ?? [],
    [report],
  )
  const affectedAreas = useMemo(
    () => report?.affectedAreas.slice(0, 5) ?? [],
    [report],
  )
  const processes = useMemo(
    () => report?.impactAnalysis.affectedProcesses.slice(0, 6) ?? [],
    [report],
  )

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

  async function handleExport(clickEvent?: MouseEvent<HTMLButtonElement>) {
    clickEvent?.preventDefault()
    clickEvent?.stopPropagation()
    if (exportState === 'generating') return
    setExportState('generating')
    try {
      const { exportSituationReportPdf } =
        await import('@/modules/operational-events/utils/exportSituationReportPdf')
      await exportSituationReportPdf(event)
      setExportState('idle')
    } catch {
      setExportState('error')
    }
  }

  return createPortal(
    <div className="novex-situation-modal" role="presentation">
      <button
        type="button"
        className="novex-situation-modal__backdrop"
        aria-label="Cerrar"
        onClick={onClose}
      />

      <div
        className="novex-situation-modal__dialog novex-situation-modal__dialog--brief"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-risk={risk}
        data-tour="report-modal"
      >
        <header className="novex-sit-header novex-sit-header--brief">
          <div className="novex-sit-header__lead">
            <div className="min-w-0">
              <p className="novex-sit-header__eyebrow">
                {executiveSummary ? 'Análisis de la situación' : 'Detalle de situación'}
              </p>
              <h2 id={titleId} className="novex-sit-header__title">
                {report?.incidentSummary.executiveTitle ?? event.title}
              </h2>
              <p className="novex-sit-header__meta">
                <span>{eventRef(event.id)}</span>
                {!showAuditTrail ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{event.sourceAreaName}</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>

          <div className="novex-sit-header__aside">
            <button
              ref={closeRef}
              type="button"
              className="novex-sit-header__close"
              aria-label="Cerrar"
              onClick={onClose}
            >
              <NovexIcon name="x" size={15} strokeWidth={1.7} />
            </button>
            <div
              className="novex-sit-header__status"
              data-status={event.status}
            >
              <span
                className="novex-sit-header__status-dot"
                aria-hidden="true"
              />
              <strong>
                {EVENT_STATUS_LABEL[event.status]} · {RISK_LEVEL_LABEL[risk]}
              </strong>
            </div>
          </div>
        </header>

        {showAuditTrail ? (
          <section
            className="novex-sit-audit novex-sit-audit--brief"
            aria-label="Información de auditoría"
          >
            <div className="novex-sit-audit__item">
              <span>Coordinación</span>
              <strong>{event.sourceAreaName}</strong>
            </div>
            <div className="novex-sit-audit__item">
              <span>Registró</span>
              <strong>{event.reportedBy.name || 'Sin autor'}</strong>
            </div>
            <div className="novex-sit-audit__item">
              <span>Registrada</span>
              <strong>
                <time dateTime={event.createdAt}>
                  {formatEventDateTime(event.createdAt)}
                </time>
              </strong>
            </div>
          </section>
        ) : null}

        <div className="novex-sit-scroll novex-sit-scroll--brief" data-tour="report-scroll">
          {executiveSummary && report ? (
            <div className="novex-sit-executive-analysis">
              <section className="novex-sit-executive-analysis__lead">
                <span>Lectura ejecutiva</span>
                <h3>{report.incidentSummary.executiveTitle}</h3>
                <p>{report.incidentSummary.executiveSummary}</p>
              </section>

              <div className="novex-sit-executive-analysis__questions">
                <section>
                  <span>Qué está ocurriendo</span>
                  <p>
                    {interpretation?.narrative ??
                      report.incidentSummary.executiveSummary}
                  </p>
                </section>
                <section>
                  <span>Qué puede pasar</span>
                  <p>
                    {report.operationalConsequences[0] ??
                      'No se proyecta una propagación adicional con la evidencia disponible.'}
                  </p>
                </section>
                <section data-tone="attention">
                  <span>Qué requiere atención</span>
                  <p>
                    {report.recommendedActions[0]?.action ??
                      report.executiveConclusion.recommendation}
                  </p>
                </section>
              </div>

              <dl className="novex-sit-executive-analysis__metrics">
                <div>
                  <dt>Impacto actual</dt>
                  <dd>
                    {report.affectedAreas.length > 0
                      ? `${report.affectedAreas.length} área${report.affectedAreas.length === 1 ? '' : 's'}`
                      : 'Contenido en origen'}
                  </dd>
                </div>
                <div>
                  <dt>Riesgo</dt>
                  <dd>
                    {RISK_LEVEL_LABEL[risk]} · {report.riskAssessment.riskScore}/100
                  </dd>
                </div>
                <div>
                  <dt>Confianza</dt>
                  <dd>
                    {Math.round(report.riskAssessment.certainty.percentage)}% ·{' '}
                    {EXEC_CERTAINTY_LABEL[report.riskAssessment.certainty.level]}
                  </dd>
                </div>
              </dl>
            </div>
          ) : report ? (
            <div className="novex-sit-brief">
              <section className="novex-sit-brief__metrics" aria-label="Indicadores">
                <div data-tone="risk">
                  <span>Riesgo</span>
                  <strong>
                    {RISK_LEVEL_LABEL[risk]} · {report.riskAssessment.riskScore}
                    /100
                  </strong>
                </div>
                <div data-tone="urgency">
                  <span>Urgencia</span>
                  <strong>
                    {EXEC_URGENCY_LABEL[report.executiveConclusion.urgency]}
                  </strong>
                </div>
                <div data-tone="ai">
                  <span>Confianza IA</span>
                  <strong>
                    {Math.round(report.riskAssessment.certainty.percentage)}% ·{' '}
                    {
                      EXEC_CERTAINTY_LABEL[
                        report.riskAssessment.certainty.level
                      ]
                    }
                  </strong>
                </div>
              </section>

              <section className="novex-sit-brief__panel">
                <header className="novex-sit-brief__panel-head">
                  <h3>Resumen</h3>
                </header>
                <p className="novex-sit-brief__lead">
                  {report.incidentSummary.executiveSummary}
                </p>
                {interpretation?.narrative &&
                interpretation.narrative !==
                  report.incidentSummary.executiveSummary ? (
                  <p className="novex-sit-brief__secondary">
                    {interpretation.narrative}
                  </p>
                ) : null}
              </section>

              {(causes.length > 0 ||
                hypotheses.length > 0 ||
                dependencies.length > 0) && (
                <section className="novex-sit-brief__panel">
                  <header className="novex-sit-brief__panel-head">
                    <h3>Por qué ocurrió</h3>
                  </header>
                  <div className="novex-sit-brief__cause-grid">
                    {causes.length > 0 ? (
                      <article className="novex-sit-brief__tile">
                        <p className="novex-sit-brief__label">Causas detectadas</p>
                        <ul>
                          {causes.map((cause) => (
                            <li key={cause}>{cause}</li>
                          ))}
                        </ul>
                      </article>
                    ) : null}
                    {hypotheses.length > 0 ? (
                      <article className="novex-sit-brief__tile">
                        <p className="novex-sit-brief__label">Hipótesis</p>
                        <ul>
                          {hypotheses.map((hypothesis) => (
                            <li key={hypothesis}>{hypothesis}</li>
                          ))}
                        </ul>
                      </article>
                    ) : null}
                    {dependencies.length > 0 ? (
                      <article className="novex-sit-brief__tile novex-sit-brief__tile--wide">
                        <p className="novex-sit-brief__label">Dependencias</p>
                        <ul>
                          {dependencies.map((dependency) => (
                            <li key={dependency}>{dependency}</li>
                          ))}
                        </ul>
                      </article>
                    ) : null}
                  </div>
                </section>
              )}

              {report.riskAssessment.certainty.explanation ? (
                <p className="novex-sit-brief__callout">
                  {report.riskAssessment.certainty.explanation}
                </p>
              ) : null}

              {decisionFactors.length > 0 ? (
                <section className="novex-sit-brief__panel">
                  <header className="novex-sit-brief__panel-head">
                    <h3>Por qué es grave</h3>
                  </header>
                  <ul className="novex-sit-brief__checks">
                    {decisionFactors.map((factor) => (
                      <li key={factor}>
                        <span className="novex-sit-brief__icon" aria-hidden="true">
                          <NovexIcon name="check" size={12} strokeWidth={2} />
                        </span>
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section className="novex-sit-brief__panel">
                <header className="novex-sit-brief__panel-head">
                  <h3>Impacto</h3>
                  {report.impactAnalysis.estimatedAffectedStudents !== null ? (
                    <small>
                      ≈{' '}
                      {report.impactAnalysis.estimatedAffectedStudents.toLocaleString(
                        'es-CO',
                      )}{' '}
                      estudiantes
                    </small>
                  ) : null}
                </header>
                <ul className="novex-sit-brief__impact">
                  <li data-tone="cyan">
                    <strong>
                      {report.impactAnalysis.internalImpactPercentage}%
                    </strong>
                    <span>Interno</span>
                  </li>
                  <li data-tone="violet">
                    <strong>
                      {report.impactAnalysis.externalImpactPercentage}%
                    </strong>
                    <span>Externo</span>
                  </li>
                  <li data-tone="amber">
                    <strong>
                      {report.impactAnalysis.studentImpactPercentage}%
                    </strong>
                    <span>Estudiantes</span>
                  </li>
                </ul>
                {processes.filter((process) => process.length <= 42).length >
                0 ? (
                  <div className="novex-sit-brief__chips">
                    {processes
                      .filter((process) => process.length <= 42)
                      .map((process) => (
                        <span key={process}>{process}</span>
                      ))}
                  </div>
                ) : null}
              </section>

              {affectedAreas.length > 0 ? (
                <section className="novex-sit-brief__panel">
                  <header className="novex-sit-brief__panel-head">
                    <h3>Áreas afectadas</h3>
                  </header>
                  <ul className="novex-sit-brief__areas">
                    {affectedAreas.map((area) => (
                      <li key={area.name}>
                        <div>
                          <strong>{area.name}</strong>
                          <span data-risk={area.affectationLevel}>
                            {RISK_LEVEL_LABEL[area.affectationLevel]}
                          </span>
                        </div>
                        <p>{area.reason}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {actions.length > 0 ? (
                <section className="novex-sit-brief__panel">
                  <header className="novex-sit-brief__panel-head">
                    <h3>Acciones prioritarias</h3>
                  </header>
                  <ol className="novex-sit-brief__actions">
                    {actions.map((action, index) => (
                      <li key={`${action.action}-${index}`}>
                        <span className="novex-sit-brief__step" aria-hidden="true">
                          {index + 1}
                        </span>
                        <div className="novex-sit-brief__action-body">
                          <div className="novex-sit-brief__action-top">
                            <strong>{action.action}</strong>
                            <span data-priority={action.priority}>
                              {EXEC_PRIORITY_LABEL[action.priority]}
                            </span>
                          </div>
                          <p className="novex-sit-brief__action-meta">
                            {action.suggestedArea}
                            {action.recommendedTime
                              ? ` · ${action.recommendedTime}`
                              : ''}
                          </p>
                          {action.reason ? (
                            <p className="novex-sit-brief__action-reason">
                              {action.reason}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              {consequences.length > 0 ? (
                <section className="novex-sit-brief__panel">
                  <header className="novex-sit-brief__panel-head">
                    <h3>Si no se actúa</h3>
                  </header>
                  <ul className="novex-sit-brief__checks novex-sit-brief__checks--warn">
                    {consequences.map((consequence) => (
                      <li key={consequence}>
                        <span className="novex-sit-brief__icon" aria-hidden="true">
                          <NovexIcon name="alert" size={12} strokeWidth={1.8} />
                        </span>
                        <span>{consequence}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section className="novex-sit-brief__panel novex-sit-brief__panel--conclusion">
                <header className="novex-sit-brief__panel-head">
                  <h3>Conclusión</h3>
                </header>
                {report.executiveConclusion.gravity ? (
                  <p className="novex-sit-brief__secondary">
                    {report.executiveConclusion.gravity}
                  </p>
                ) : null}
                <p className="novex-sit-brief__lead">
                  {report.executiveConclusion.recommendation}
                </p>
              </section>
            </div>
          ) : (
            <div className="novex-sit-brief">
              <section className="novex-sit-brief__panel">
                <header className="novex-sit-brief__panel-head">
                  <h3>Descripción</h3>
                </header>
                <p className="novex-sit-brief__lead">
                  {interpretation?.narrative ?? event.description}
                </p>
                <p className="novex-sit-brief__hint">
                  Sin reporte ejecutivo de inteligencia. Registrada el{' '}
                  {formatEventDate(event.reportedAt)}.
                </p>
              </section>
            </div>
          )}
          <span
            className="novex-sit-report-end"
            data-tour="report-end"
            aria-hidden="true"
          />
        </div>

        <footer className="novex-sit-footer">
          <button
            data-tour="download-report"
            type="button"
            className="novex-sit-footer__secondary"
            onClick={(clickEvent) => void handleExport(clickEvent)}
            disabled={exportState === 'generating'}
            aria-busy={exportState === 'generating'}
          >
            <NovexIcon name="download" size={14} />
            {exportState === 'generating'
              ? 'Generando PDF…'
              : exportState === 'error'
                ? 'Reintentar exportación'
                : executiveSummary
                  ? 'Descargar informe técnico PDF'
                  : 'Exportar reporte PDF'}
          </button>
          <button
            type="button"
            className="novex-sit-footer__primary"
            onClick={onClose}
          >
            Cerrar
            <NovexIcon name="chevron-right" size={14} />
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
