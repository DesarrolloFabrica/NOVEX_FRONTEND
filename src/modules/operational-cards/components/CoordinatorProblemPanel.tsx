import { useState, type CSSProperties } from 'react'
import { hexToRgbChannels } from '@/modules/impact-network/data/coordination-islands.config'
import { ProblemRow } from '@/modules/operational-cards/components/ProblemRow'
import { classifyCoordinatorProblems } from '@/modules/operational-cards/data/coordinatorProblemGroups'
import { buildCoordinationSummary } from '@/modules/operational-cards/services/coordination-problems.service'
import type { CoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import { OPERATIONAL_STATUS_LABEL } from '@/modules/operational-cards/data/operationalStatusLabel'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import type {
  CoordinationProblem,
  OperationalCardsLevel1State,
} from '@/modules/operational-cards/types/operational-cards.state'
import { resolveTicketTheme } from '@/modules/operational-cards/experience/ticketThemes'
import '@/styles/operational-cards.css'

const SKELETON_ROWS = 3

export interface CoordinatorProblemPanelProps {
  coordination: CoordinationOverview
  identity: CoordinationVisualIdentity
  productLabel?: string
  level1: OperationalCardsLevel1State
  selectedProblemId?: string | null
  /** Etiquetas de producto/área por code para «la otra coordinación». */
  labelByCode: Readonly<Record<string, string>>
  /** Colores de overview por code (talón de identidad). */
  colorByCode?: Readonly<Record<string, string>>
  onProblemSelect?: (problemId: string) => void
  onRetry?: () => void
}

function GroupList({
  title,
  testId,
  problems,
  emptyMessage,
  ownCode,
  labelByCode,
  colorByCode,
  selectedProblemId,
  onProblemSelect,
}: {
  title: string
  testId: string
  problems: readonly CoordinationProblem[]
  emptyMessage: string
  ownCode: string
  labelByCode: Readonly<Record<string, string>>
  colorByCode?: Readonly<Record<string, string>>
  selectedProblemId?: string | null
  onProblemSelect?: (problemId: string) => void
}) {
  return (
    <section
      className="coordinator-problems__group"
      data-testid={testId}
      aria-label={title}
    >
      <h3 className="coordinator-problems__group-title">
        {title}
        <span className="coordinator-problems__group-count">{problems.length}</span>
      </h3>
      {problems.length === 0 ? (
        <div
          className="coordinator-problems__group-empty"
          data-testid={`${testId}-empty`}
        >
          <div className="coordinator-problems__empty-icon" aria-hidden="true">
            {testId === 'coordinator-to-resolve' ? (
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" strokeOpacity="0.4" />
                <path
                  d="m8 12 2.5 2.5L16 9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                  strokeLinecap="round"
                />
                <path
                  d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>
          <div className="coordinator-problems__empty-content">
            <strong className="coordinator-problems__empty-heading">
              {testId === 'coordinator-to-resolve'
                ? 'Operación al día'
                : 'Sin bloqueos externos'}
            </strong>
            <p className="coordinator-problems__empty-text">{emptyMessage}</p>
            <span className="coordinator-problems__empty-hint">
              {testId === 'coordinator-to-resolve'
                ? 'Las situaciones asignadas a su área aparecerán aquí ordenadas por severidad y tiempo de respuesta.'
                : 'Si una entrega de otra coordinación presenta retrasos, puede registrarla como dependencia en el panel derecho.'}
            </span>
          </div>
        </div>
      ) : (
        <ul className="coordinator-problems__group-list">
          {problems.map((problem) => (
            <li key={problem.id}>
              {/* La marca representa LA OTRA coordinación respecto de la
                  propia, en los dos grupos; un interno lleva la propia. */}
              <ProblemRow
                problem={problem}
                selectedCoordinationCode={ownCode}
                selected={problem.id === selectedProblemId}
                onSelect={onProblemSelect}
                labelByCode={labelByCode}
                colorByCode={colorByCode}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function CoordinatorProblemPanel({
  coordination,
  identity,
  productLabel,
  level1,
  selectedProblemId,
  labelByCode,
  colorByCode,
  onProblemSelect,
  onRetry,
}: CoordinatorProblemPanelProps) {
  const statusLabel = OPERATIONAL_STATUS_LABEL[coordination.status]
  const name = productLabel ?? identity.name
  const [expanded, setExpanded] = useState(false)
  const ticketThemeId = resolveTicketTheme(coordination.code)
  const ticketPilot = Boolean(ticketThemeId)
  const titleText = ticketPilot ? 'Problemas de mi coordinación' : name
  const contextLabel = ticketPilot ? (productLabel ?? name) : null
  const headingId = `coordinator-problems-title-${coordination.code}`

  const groups =
    level1.status === 'ready'
      ? classifyCoordinatorProblems(level1.problems, coordination.code)
      : { toResolve: [], affecting: [] }

  /*
   * Fase 01B.2 (K-03): la cabecera usa SIEMPRE los conteos oficiales del
   * backend (los mismos de la carta y de la integridad). Antes sumaba «debo
   * resolver + afectan mi coordinación» y contaba críticos sobre la lista, que
   * mezcla dos poblaciones y puede ser parcial (alcance own-only). Las
   * dependencias que afectan al área se nombran aparte, sin sumarse.
   */
  const summary = buildCoordinationSummary({
    activeProblemsCount: coordination.activeProblemsCount,
    criticalCount: coordination.criticalCount,
    affectedCoordinationCount: coordination.affectedCoordinationCount,
    incomingDependencyCount: coordination.incomingDependencyCount ?? 0,
  })

  const bodyContent = (
    <>
      {level1.status === 'loading' || level1.status === 'idle' ? (
        <div
          className="coordination-panel__list"
          data-testid="coordinator-problems-loading"
          aria-busy="true"
        >
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <div
              key={index}
              className="coordination-panel__skeleton"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : null}

      {level1.status === 'error' ? (
        <div data-testid="coordinator-problems-error" role="status">
          <p className="coordination-panel__empty">
            {level1.errorMessage ?? 'No pudimos cargar los problemas.'}
          </p>
          {onRetry ? (
            <button
              type="button"
              className="coordination-panel__retry"
              data-testid="coordinator-problems-retry"
              onClick={onRetry}
            >
              Reintentar
            </button>
          ) : null}
        </div>
      ) : null}

      {level1.status === 'ready' ? (
        <div
          className="coordinator-problems__groups"
          data-testid="coordinator-problems-groups"
        >
          <GroupList
            title="Debo resolver"
            testId="coordinator-to-resolve"
            problems={groups.toResolve}
            emptyMessage="No hay situaciones que deba resolver ahora."
            ownCode={coordination.code}
            labelByCode={labelByCode}
            colorByCode={colorByCode}
            selectedProblemId={selectedProblemId}
            onProblemSelect={onProblemSelect}
          />
          <GroupList
            title="Afectan mi coordinación"
            testId="coordinator-affecting"
            problems={groups.affecting}
            emptyMessage="Ninguna dependencia externa afecta ahora a su área."
            ownCode={coordination.code}
            labelByCode={labelByCode}
            colorByCode={colorByCode}
            selectedProblemId={selectedProblemId}
            onProblemSelect={onProblemSelect}
          />
        </div>
      ) : null}
    </>
  )

  return (
    <article
      className={[
        'coordination-panel',
        'coordination-panel--region',
        'coordinator-problems',
        ticketPilot ? 'coordination-panel--ticket-pilot' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid="coordinator-problem-panel"
      data-surface="coordinator-problems"
      data-code={coordination.code}
      data-status={coordination.status}
      data-level1={level1.status}
      data-expanded={expanded ? 'true' : undefined}
      style={
        {
          '--coord-rgb': hexToRgbChannels(identity.color),
        } as CSSProperties
      }
      aria-labelledby={headingId}
    >
      <header className="coordination-panel__header">
        <div className="coordination-panel__heading">
          <h2
            className={
              ticketPilot
                ? 'coordination-panel__title coordination-panel__name coordination-panel__name--circus'
                : 'coordination-panel__title'
            }
            id={headingId}
          >
            {titleText}
          </h2>
          {ticketPilot && contextLabel ? (
            <p className="coordination-panel__eyebrow">{contextLabel}</p>
          ) : contextLabel ? (
            <p className="coordination-panel__context">{contextLabel}</p>
          ) : null}
          <p
            className="coordination-panel__summary"
            data-testid="coordination-summary"
          >
            {statusLabel}
            {summary ? `. ${summary}` : null}
          </p>
        </div>
      </header>

      <div className="coordination-panel__body">{bodyContent}</div>

      <button
        type="button"
        className="panel-expand-toggle"
        data-testid="coordinator-problems-expand"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? 'Contraer' : 'Expandir'}
      </button>
    </article>
  )
}
