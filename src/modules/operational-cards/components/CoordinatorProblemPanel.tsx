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
        <p
          className="coordinator-problems__group-empty"
          data-testid={`${testId}-empty`}
        >
          {emptyMessage}
        </p>
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

  const summary = buildCoordinationSummary({
    activeProblemsCount:
      level1.status === 'ready'
        ? groups.toResolve.length + groups.affecting.length
        : coordination.activeProblemsCount,
    criticalCount:
      level1.status === 'ready'
        ? [...groups.toResolve, ...groups.affecting].filter(
            (p) => p.severity === 'CRITICAL',
          ).length
        : coordination.criticalCount,
    affectedCoordinationCount: coordination.affectedCoordinationCount,
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
