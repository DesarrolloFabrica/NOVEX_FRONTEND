import { ProblemIslandSection } from '@/modules/operational-cards/components/ProblemIslandSection'
import { ProblemIslandShell } from '@/modules/operational-cards/components/ProblemIslandShell'
import type { OperationalCardsLevel2State } from '@/modules/operational-cards/types/operational-cards.state'
import type {
  ProblemSectionId,
  ProblemSectionState,
} from '@/modules/operational-cards/types/problem-detail.types'

/**
 * Isla flotante de inspección de un problema (LEVEL 2).
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

const HEADING_ID = 'problem-island-title'

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
      <p className="island-section__note" data-testid="island-section-loading">
        Cargando…
      </p>
    )
  }

  // El fallo se queda dentro de la sección: la isla sigue utilizable.
  if (section.status === 'error') {
    return (
      <p
        className="island-section__note island-section__note--error"
        data-testid="island-section-error"
        role="alert"
      >
        No pudimos cargar esta sección.
      </p>
    )
  }

  if (section.items.length === 0) {
    return (
      <p className="island-section__note" data-testid="island-section-empty">
        {emptyLabel}
      </p>
    )
  }

  return <>{children(section.items)}</>
}

export interface ProblemIslandProps {
  level2: OperationalCardsLevel2State
  onClose: () => void
  onToggleSection: (section: ProblemSectionId) => void
}

export function ProblemIsland({
  level2,
  onClose,
  onToggleSection,
}: ProblemIslandProps) {
  const { detail, sections, expanded, status } = level2
  const isExpanded = (section: ProblemSectionId) => expanded.includes(section)

  return (
    <ProblemIslandShell labelledBy={HEADING_ID} onClose={onClose}>
      <header className="problem-island__header">
        <div className="problem-island__heading">
          <h2 id={HEADING_ID} className="problem-island__title">
            {detail?.title ?? 'Detalle del problema'}
          </h2>

          {detail && (
            <p className="problem-island__badges">
              <span
                className="problem-island__badge problem-island__badge--severity"
                data-severity={detail.severity}
                data-testid="island-severity"
              >
                {SEVERITY_LABEL[detail.severity]}
              </span>
              <span
                className="problem-island__badge"
                data-testid="island-status"
              >
                {STATUS_LABEL[detail.status] ?? detail.status}
              </span>
              {detail.slaHealth && (
                <span
                  className="problem-island__badge"
                  data-sla={detail.slaHealth}
                  data-testid="island-sla"
                >
                  {SLA_LABEL[detail.slaHealth]}
                </span>
              )}
              {/* Contexto secundario: la coordinación ya se ve detrás. */}
              {detail.coordinationName && (
                <span className="problem-island__context">
                  {detail.coordinationName}
                </span>
              )}
            </p>
          )}
        </div>

        <button
          type="button"
          className="problem-island__close"
          data-testid="island-close"
          aria-label="Cerrar el detalle del problema"
          onClick={onClose}
        >
          ✕
        </button>
      </header>

      {(status === 'loading' || status === 'idle') && (
        <div
          className="problem-island__skeleton"
          data-testid="island-loading"
          aria-hidden="true"
        >
          <span />
          <span />
          <span />
        </div>
      )}

      {status === 'error' && (
        <p
          className="problem-island__notice"
          data-testid="island-error"
          role="alert"
        >
          No pudimos cargar el detalle del problema.
        </p>
      )}

      {status === 'ready' && detail && (
        <>
          <p className="problem-island__summary" data-testid="island-summary">
            {detail.summary}
          </p>

          <div className="problem-island__sections">
            <ProblemIslandSection
              id="impact"
              title="Impacto"
              hint={detail.impact ? String(detail.impact.areas.length) : null}
              expanded={isExpanded('impact')}
              onToggle={onToggleSection}
            >
              {detail.impact ? (
                <>
                  <p className="island-section__text">{detail.impact.summary}</p>
                  <ul className="island-list" data-testid="island-impact-areas">
                    {detail.impact.areas.map((area) => (
                      <li key={area.coordinationCode}>
                        <span className="island-list__label">
                          {area.coordinationCode}
                        </span>
                        <span
                          className="island-list__tag"
                          data-severity={area.impactLevel}
                        >
                          {SEVERITY_LABEL[area.impactLevel]}
                        </span>
                        <span className="island-list__text">
                          {area.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {detail.impact.propagationDepth > 0 && (
                    <p className="island-section__note">
                      Propagación hasta {detail.impact.propagationDepth} nivel
                      {detail.impact.propagationDepth === 1 ? '' : 'es'}.
                    </p>
                  )}
                </>
              ) : (
                <p className="island-section__note">
                  Sin evaluación de impacto registrada.
                </p>
              )}
            </ProblemIslandSection>

            <ProblemIslandSection
              id="ai"
              title="Inteligencia IA"
              expanded={isExpanded('ai')}
              onToggle={onToggleSection}
            >
              {detail.intelligence ? (
                <div data-testid="island-ai">
                  <p className="island-section__text">
                    {detail.intelligence.headline}
                  </p>
                  {detail.intelligence.keyPoints.length > 0 && (
                    <ul className="island-list">
                      {detail.intelligence.keyPoints.map((point) => (
                        <li key={point}>
                          <span className="island-list__text">{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {detail.intelligence.rootCause && (
                    <p className="island-section__text">
                      {detail.intelligence.rootCause}
                    </p>
                  )}
                  {detail.intelligence.risks.length > 0 && (
                    <ul className="island-list">
                      {detail.intelligence.risks.map((risk) => (
                        <li key={risk.title}>
                          <span className="island-list__label">
                            {risk.title}
                          </span>
                          <span
                            className="island-list__tag"
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
                <p className="island-section__note" data-testid="island-ai-absent">
                  Esta situación no tiene análisis de IA.
                </p>
              )}
            </ProblemIslandSection>

            <ProblemIslandSection
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
                  <ul className="island-list" data-testid="island-recommendations">
                    {items.map((item) => (
                      <li key={item.id}>
                        <span className="island-list__label">{item.title}</span>
                        <span className="island-list__text">
                          {item.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionState>
            </ProblemIslandSection>

            <ProblemIslandSection
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
                  <ul className="island-list" data-testid="island-evidences">
                    {items.map((item) => (
                      <li key={item.id}>
                        <span className="island-list__label">
                          {item.title || item.fileName || item.id}
                        </span>
                        <span className="island-list__tag">{item.type}</span>
                        <span className="island-list__text">
                          {item.createdAt}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionState>
            </ProblemIslandSection>

            <ProblemIslandSection
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
                  <ol className="island-list" data-testid="island-timeline">
                    {items.map((item) => (
                      <li key={item.id}>
                        <span className="island-list__label">
                          {item.eventType}
                        </span>
                        <span className="island-list__text">{item.title}</span>
                        <span className="island-list__text">
                          {item.createdAt}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </SectionState>
            </ProblemIslandSection>
          </div>
        </>
      )}
    </ProblemIslandShell>
  )
}
