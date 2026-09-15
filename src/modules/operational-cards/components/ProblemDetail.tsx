import { ProblemDetailSection } from '@/modules/operational-cards/components/ProblemDetailSection'
import type { OperationalCardsLevel2State } from '@/modules/operational-cards/types/operational-cards.state'
import type {
  ProblemSectionId,
  ProblemSectionState,
} from '@/modules/operational-cards/types/problem-detail.types'
import '@/styles/operational-problem-detail.css'

/**
 * Detalle de un problema (LEVEL 2), en la región permanente del shell.
 *
 * Es el CONTENIDO de la antigua isla flotante, que dejó de ser una capa sobre
 * la escena para pasar a ser una de sus tres lecturas permanentes. La lectura
 * no cambió; cambió dónde vive. Por eso no hay velo, ni `role="dialog"`, ni
 * botón de cerrar: no se cierra nada, se mira otro problema.
 *
 * Solo lectura, sin excepción: no hay editar, cambiar estado, cerrar
 * situación, reanalizar, simular impacto, ni tocar recomendaciones o
 * evidencias. Por eso no se compone con el expediente legacy, que arrastra
 * acciones mutables y condiciones de permiso: se reutilizan sus ENDPOINTS y su
 * modelo de datos, no su UI.
 *
 * Impacto e Inteligencia IA se leen del análisis que ya viene en la apertura,
 * así que desplegarlos no cuesta ninguna petición. Recomendaciones, Evidencias
 * y Timeline se piden al abrirse por primera vez.
 */

const SEVERITY_LABEL = {
  CRITICAL: 'Crítica',
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
} as const

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Registrada',
  IN_PROGRESS: 'En atención',
  RESOLVED: 'En atención',
  CLOSED: 'Cerrada',
}

const SLA_LABEL = {
  on_track: 'SLA en plazo',
  at_risk: 'SLA en riesgo',
  overdue: 'SLA vencido',
  closed: 'SLA cerrado',
} as const

const HEADING_ID = 'problem-detail-title'

function sectionHint<T>(section: ProblemSectionState<T>): string | null {
  if (section.status === 'loading') return 'Cargando…'
  if (section.status === 'error') return 'Error'
  if (section.status === 'ready') return String(section.items.length)
  return null
}

/** Estado uniforme de una sección perezosa: carga, error o vacío. */
function SectionState<T>({
  section,
  emptyLabel,
  children,
}: {
  section: ProblemSectionState<T>
  emptyLabel: string
  children: (items: readonly T[]) => React.ReactNode
}) {
  if (section.status === 'loading' || section.status === 'idle') {
    return (
      <p className="detail-section__note" data-testid="detail-section-loading">
        Cargando…
      </p>
    )
  }

  // El fallo se queda dentro de la sección: la isla sigue utilizable.
  if (section.status === 'error') {
    return (
      <p
        className="detail-section__note detail-section__note--error"
        data-testid="detail-section-error"
        role="alert"
      >
        No pudimos cargar esta sección.
      </p>
    )
  }

  if (section.items.length === 0) {
    return (
      <p className="detail-section__note" data-testid="detail-section-empty">
        {emptyLabel}
      </p>
    )
  }

  return <>{children(section.items)}</>
}

export interface ProblemDetailProps {
  level2: OperationalCardsLevel2State
  onToggleSection: (section: ProblemSectionId) => void
}

export function ProblemDetail({ level2, onToggleSection }: ProblemDetailProps) {
  const { detail, sections, expanded, status } = level2
  const isExpanded = (section: ProblemSectionId) => expanded.includes(section)

  return (
    <section
      className="problem-detail"
      data-testid="problem-detail"
      data-level2={status}
      data-problem={level2.problemId ?? ''}
      aria-labelledby={HEADING_ID}
    >
      <header className="problem-detail__header">
        <div className="problem-detail__heading">
          <h3 id={HEADING_ID} className="problem-detail__title">
            {detail?.title ?? 'Detalle del problema'}
          </h3>

          {detail && (
            <p className="problem-detail__badges">
              <span
                className="problem-detail__badge problem-detail__badge--severity"
                data-severity={detail.severity}
                data-testid="detail-severity"
              >
                {SEVERITY_LABEL[detail.severity]}
              </span>
              <span
                className="problem-detail__badge"
                data-testid="detail-status"
              >
                {STATUS_LABEL[detail.status] ?? detail.status}
              </span>
              {detail.slaHealth && (
                <span
                  className="problem-detail__badge"
                  data-sla={detail.slaHealth}
                  data-testid="detail-sla"
                >
                  {SLA_LABEL[detail.slaHealth]}
                </span>
              )}
              {/* Contexto secundario: la coordinación ya se ve detrás. */}
              {detail.coordinationName && (
                <span className="problem-detail__context">
                  {detail.coordinationName}
                </span>
              )}
            </p>
          )}
        </div>
      </header>

      {(status === 'loading' || status === 'idle') && (
        <div
          className="problem-detail__skeleton"
          data-testid="detail-loading"
          aria-hidden="true"
        >
          <span />
          <span />
          <span />
        </div>
      )}

      {status === 'error' && (
        <p
          className="problem-detail__notice"
          data-testid="detail-error"
          role="alert"
        >
          No pudimos cargar el detalle del problema.
        </p>
      )}

      {status === 'ready' && detail && (
        <>
          <p className="problem-detail__summary" data-testid="detail-summary">
            {detail.summary}
          </p>

          <div className="problem-detail__sections">
            <ProblemDetailSection
              id="impact"
              title="Impacto"
              hint={detail.impact ? String(detail.impact.areas.length) : null}
              expanded={isExpanded('impact')}
              onToggle={onToggleSection}
            >
              {detail.impact ? (
                <>
                  <p className="detail-section__text">{detail.impact.summary}</p>
                  <ul className="detail-list" data-testid="detail-impact-areas">
                    {detail.impact.areas.map((area) => (
                      <li key={area.coordinationCode}>
                        <span className="detail-list__label">
                          {area.coordinationCode}
                        </span>
                        <span
                          className="detail-list__tag"
                          data-severity={area.impactLevel}
                        >
                          {SEVERITY_LABEL[area.impactLevel]}
                        </span>
                        <span className="detail-list__text">
                          {area.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {detail.impact.propagationDepth > 0 && (
                    <p className="detail-section__note">
                      Propagación hasta {detail.impact.propagationDepth} nivel
                      {detail.impact.propagationDepth === 1 ? '' : 'es'}.
                    </p>
                  )}
                </>
              ) : (
                <p className="detail-section__note">
                  Sin evaluación de impacto registrada.
                </p>
              )}
            </ProblemDetailSection>

            <ProblemDetailSection
              id="ai"
              title="Inteligencia IA"
              expanded={isExpanded('ai')}
              onToggle={onToggleSection}
            >
              {detail.intelligence ? (
                <div data-testid="detail-ai">
                  <p className="detail-section__text">
                    {detail.intelligence.headline}
                  </p>
                  {detail.intelligence.keyPoints.length > 0 && (
                    <ul className="detail-list">
                      {detail.intelligence.keyPoints.map((point) => (
                        <li key={point}>
                          <span className="detail-list__text">{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {detail.intelligence.rootCause && (
                    <p className="detail-section__text">
                      {detail.intelligence.rootCause}
                    </p>
                  )}
                  {detail.intelligence.risks.length > 0 && (
                    <ul className="detail-list">
                      {detail.intelligence.risks.map((risk) => (
                        <li key={risk.title}>
                          <span className="detail-list__label">
                            {risk.title}
                          </span>
                          <span
                            className="detail-list__tag"
                            data-severity={risk.severity}
                          >
                            {risk.severity}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="detail-section__note" data-testid="detail-ai-absent">
                  Esta situación no tiene análisis de IA.
                </p>
              )}
            </ProblemDetailSection>

            <ProblemDetailSection
              id="recommendations"
              title="Recomendaciones"
              hint={sectionHint(sections.recommendations)}
              expanded={isExpanded('recommendations')}
              onToggle={onToggleSection}
            >
              <SectionState
                section={sections.recommendations}
                emptyLabel="Sin recomendaciones registradas."
              >
                {(items) => (
                  <ul className="detail-list" data-testid="detail-recommendations">
                    {items.map((item) => (
                      <li key={item.id}>
                        <span className="detail-list__label">{item.title}</span>
                        <span className="detail-list__text">
                          {item.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionState>
            </ProblemDetailSection>

            <ProblemDetailSection
              id="evidences"
              title="Evidencias"
              hint={sectionHint(sections.evidences)}
              expanded={isExpanded('evidences')}
              onToggle={onToggleSection}
            >
              <SectionState
                section={sections.evidences}
                emptyLabel="Sin evidencias registradas."
              >
                {(items) => (
                  <ul className="detail-list" data-testid="detail-evidences">
                    {items.map((item) => (
                      <li key={item.id}>
                        <span className="detail-list__label">
                          {item.title || item.fileName || item.id}
                        </span>
                        <span className="detail-list__tag">{item.type}</span>
                        <span className="detail-list__text">
                          {item.createdAt}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionState>
            </ProblemDetailSection>

            <ProblemDetailSection
              id="timeline"
              title="Timeline"
              hint={sectionHint(sections.timeline)}
              expanded={isExpanded('timeline')}
              onToggle={onToggleSection}
            >
              <SectionState
                section={sections.timeline}
                emptyLabel="Sin actividad registrada."
              >
                {(items) => (
                  <ol className="detail-list" data-testid="detail-timeline">
                    {items.map((item) => (
                      <li key={item.id}>
                        <span className="detail-list__label">
                          {item.eventType}
                        </span>
                        <span className="detail-list__text">{item.title}</span>
                        <span className="detail-list__text">
                          {item.createdAt}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </SectionState>
            </ProblemDetailSection>
          </div>
        </>
      )}
    </section>
  )
}
