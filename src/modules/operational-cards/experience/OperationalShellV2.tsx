import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CoordinationCard } from '@/modules/operational-cards/components/CoordinationCard'
import { CoordinationProblemList } from '@/modules/operational-cards/components/CoordinationProblemList'
import { CoordinatorProblemPanel } from '@/modules/operational-cards/components/CoordinatorProblemPanel'
import { DirectionCharacter } from '@/modules/operational-cards/components/DirectionCharacter'
import { MyReportsPanel } from '@/modules/operational-cards/components/MyReportsPanel'
import { OperationalActionPanel } from '@/modules/operational-cards/components/OperationalActionPanel'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { canCreateSituations, hasPermission } from '@/modules/auth/utils/permissions'
import { resolveCharacterMood } from '@/modules/operational-cards/data/characterMood'
import { buildCharacterPresentation } from '@/modules/operational-cards/data/characterReaction'
import {
  resolveCharacterCoordination,
  resolveCharacterLives,
} from '@/modules/operational-cards/data/characterLivesSource'
import { resolveCoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import { buildProductTable } from '@/modules/operational-cards/data/productHierarchy'
import { buildTableLayout } from '@/modules/operational-cards/data/tableLayout'
import { OperationalCardExperience } from '@/modules/operational-cards/experience/OperationalCardExperience'
import {
  TicketPanelFrame,
  type TicketPanelVariant,
} from '@/modules/operational-cards/experience/TicketPanelFrame'
import {
  resolveTicketTheme,
  type TicketThemeId,
} from '@/modules/operational-cards/experience/ticketThemes'
import { useOperationalOverview } from '@/modules/operational-cards/hooks/useOperationalOverview'
import {
  emptyReportDraft,
  reportDraftKey,
} from '@/modules/operational-cards/state/operationalCards.reducer'
import { nowAsLocalInput } from '@/modules/operational-cards/services/report-submission.service'
import { fetchIncidentCategories } from '@/modules/api/situations.api'
import { getErrorMessage } from '@/shared/utils/error'
import type { IncidentCategorySummary } from '@/modules/situations/types/situation.types'
import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'
import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import type { ProblemHistoryPeriod } from '@/modules/operational-cards/types/problem-history.types'
import '@/styles/operational-character.css'
import '@/styles/operational-shell.css'
import '@/styles/operational-shell-ticket-fabrica.css'
import '@/styles/operational-shell-ticket-fabrica-pilot.css'
import '@/styles/operational-problem-dossier.css'

/**
 * SHELL del Centro Operacional.
 *
 * ANALISTA / ADMIN / DIRECTOR — baraja + tres regiones superiores + acción:
 *
 *   ┌──────────┬──────────────┬──────────────┬─────────────┐
 *   │personaje │ MIS REPORTES │ PROBLEMAS DE │  REPORTAR / │
 *   ├──────────┴──────────────┤ LA COORDIN.  │   DETALLE   │
 *   │        BARAJA           │              │  + ACCIONES │
 *   └─────────────────────────┴──────────────┴─────────────┘
 *
 * COORDINADOR — cuatro columnas a altura completa, sin baraja:
 *
 *   ┌────────┬──────────────┬──────────────┬─────────────┐
 *   │personaje│ MIS REPORTES │ PROBLEMAS DE │  REPORTAR / │
 *   │ + carta │              │ MI COORDIN.  │   DETALLE   │
 *   └────────┴──────────────┴──────────────┴─────────────┘
 */

function ShellRegion({
  region,
  title,
  hint,
  className = '',
  showTitle = true,
  ticketTheme,
  ticketPanel,
  children,
}: {
  region: string
  title: string
  hint?: string
  className?: string
  showTitle?: boolean
  ticketTheme?: TicketThemeId
  ticketPanel?: TicketPanelVariant
  children?: ReactNode
}) {
  return (
    <section
      className={`operational-shell__region ${className}`.trim()}
      data-testid={`shell-region-${region}`}
      data-region={region}
      aria-label={title}
    >
      {ticketTheme && ticketPanel ? (
        <TicketPanelFrame themeId={ticketTheme} variant={ticketPanel} />
      ) : null}
      {showTitle && <h2 className="operational-shell__region-title">{title}</h2>}
      {showTitle && hint && (
        <p className="operational-shell__region-hint">{hint}</p>
      )}
      {children}
    </section>
  )
}

function CircusScene() {
  return (
    <div
      className="operational-shell__scene"
      data-testid="shell-circus-scene"
      aria-hidden="true"
    >
      <img
        className="operational-shell__scene-image"
        src="/assets/scenes/circus-stage-background.png"
        alt=""
        decoding="async"
        draggable={false}
      />
    </div>
  )
}

export function OperationalShellV2() {
  const { user } = useAuth()
  const isCoordinator = user?.roleCode === 'COORDINADOR'
  const canCreate = canCreateSituations(user)
  const canViewHistory = hasPermission(user, 'SITUATIONS_VIEW')
  const assignedCoordinationId = user?.coordinationId?.trim() || null

  const controller = useOperationalOverview()
  const { level0, overview, selectedCoordinationCode, hoveredCoordinationCode } =
    controller

  const directionStatus: OperationalIntegrityStatus =
    level0 === 'ready' && overview ? overview.directionStatus : 'DESCONOCIDO'

  const [categories, setCategories] = useState<IncidentCategorySummary[]>([])
  const [categoriesError, setCategoriesError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void fetchIncidentCategories()
      .then((items) => {
        if (!active) return
        setCategories(items.filter((item) => item.isSelectable !== false))
      })
      .catch((error: unknown) => {
        if (!active) return
        setCategoriesError(getErrorMessage(error))
      })
    return () => {
      active = false
    }
  }, [])

  const { orientationByCode, labelByCode, rowLabelByCode, colorByCode } =
    useMemo(() => {
    const productTable = buildProductTable(overview?.coordinations ?? [])
    const topLevelRows = productTable.nodes.map((node) => node.coordination)
    const labels: Record<string, string> = {}
    for (const node of productTable.nodes) {
      labels[node.coordination.code] = node.label
      for (const child of node.children) labels[child.code] = child.label
    }
    /*
     * Nombres de las FILAS de problema: el de producto cuando existe y, para las
     * filas técnicas que la mesa no pinta (`coord-servicios`), su `shortName`.
     * Una fila puede nombrar cualquier coordinación del overview.
     */
    const rowLabels: Record<string, string> = {}
    const colors: Record<string, string> = {}
    for (const row of overview?.coordinations ?? []) {
      rowLabels[row.code] = labels[row.code] ?? row.shortName
      colors[row.code] = row.color
    }
    return {
      orientationByCode: buildTableLayout(topLevelRows, {
        sortByDisplayOrder: false,
      }).orientationByCode,
      labelByCode: labels,
      rowLabelByCode: rowLabels,
      colorByCode: colors,
    }
  }, [overview])

  const assignedCoordination = useMemo(() => {
    if (!isCoordinator || !overview || !assignedCoordinationId) return null
    return (
      overview.coordinations.find((row) => row.id === assignedCoordinationId) ??
      null
    )
  }, [isCoordinator, overview, assignedCoordinationId])

  const coordinatorAssignmentError =
    isCoordinator &&
    level0 === 'ready' &&
    overview !== null &&
    assignedCoordination === null

  /*
   * Entrada COORDINADOR: seleccionar automáticamente su coordinación.
   * Nunca se elige una carta arbitraria ni se cae a la mesa completa.
   */
  const selectCoordination = controller.selectCoordination
  useEffect(() => {
    if (!isCoordinator || !assignedCoordination) return
    if (selectedCoordinationCode === assignedCoordination.code) return
    selectCoordination(assignedCoordination.code as CoordinationId)
  }, [
    isCoordinator,
    assignedCoordination,
    selectedCoordinationCode,
    selectCoordination,
  ])

  const selectedCoordination = useMemo(
    () =>
      overview?.coordinations.find(
        (coordination) => coordination.code === selectedCoordinationCode,
      ) ?? null,
    [overview, selectedCoordinationCode],
  )

  const characterCoordination = resolveCharacterCoordination({
    isCoordinator,
    assignedCoordination,
    selectedCoordination,
  })
  const characterLives = resolveCharacterLives(characterCoordination)

  const characterPresentation = buildCharacterPresentation({
    directionStatus,
    selectedStatus: characterCoordination?.status ?? null,
    orientation:
      (characterCoordination
        ? orientationByCode[characterCoordination.code]
        : hoveredCoordinationCode
          ? orientationByCode[hoveredCoordinationCode]
          : null) ?? 'NEUTRAL',
    hovering: !isCoordinator && Boolean(hoveredCoordinationCode),
    selecting: Boolean(characterCoordination),
  })

  const characterMood = resolveCharacterMood({
    selectedCoordination: characterCoordination,
  })

  const pending = controller.pendingCharacterReaction
  const reactionCode = characterCoordination?.code ?? selectedCoordinationCode
  const reaccionVisible =
    pending !== null && pending.coordinationCode === reactionCode

  useEffect(() => {
    if (pending && !reaccionVisible) {
      controller.consumeCharacterReaction(pending.id)
    }
  }, [pending, reaccionVisible, controller])

  const reportKind = controller.reportFormKind ?? 'INTERNAL'
  const draftKey = reportDraftKey(selectedCoordinationCode, reportKind)
  const draft =
    controller.reportDrafts[draftKey] ?? emptyReportDraft(nowAsLocalInput())

  const learningDraft = controller.selectedProblemId
    ? (controller.learningDrafts[controller.selectedProblemId] ?? '')
    : ''

  const responsibleOptions = useMemo(() => {
    if (!overview) return []
    const excludeCode = isCoordinator
      ? assignedCoordination?.code
      : selectedCoordinationCode
    return overview.coordinations
      .filter((row) => row.code !== excludeCode)
      .map((row) => ({
        id: row.id,
        label: labelByCode[row.code] ?? row.shortName,
        code: row.code,
      }))
  }, [
    overview,
    selectedCoordinationCode,
    labelByCode,
    isCoordinator,
    assignedCoordination,
  ])

  const destinationOptions = useMemo(() => {
    if (!isCoordinator || !overview || !assignedCoordination) return null
    return overview.coordinations.map((row) => ({
      id: row.id,
      label: labelByCode[row.code] ?? row.shortName,
      code: row.code,
    }))
  }, [isCoordinator, overview, assignedCoordination, labelByCode])

  const responsibleCodeForSubmit = useMemo(() => {
    if (reportKind === 'INTERNAL') {
      const destId = draft.internalDestinationCoordinationId.trim()
      if (destId && overview) {
        const match = overview.coordinations.find((row) => row.id === destId)
        return (match?.code as CoordinationId | undefined) ?? null
      }
      return selectedCoordinationCode
    }
    const match = overview?.coordinations.find(
      (row) => row.id === draft.responsibleCoordinationId,
    )
    return (match?.code as CoordinationId | undefined) ?? null
  }, [
    reportKind,
    selectedCoordinationCode,
    overview,
    draft.responsibleCoordinationId,
    draft.internalDestinationCoordinationId,
  ])

  const ticketTheme = resolveTicketTheme(
    isCoordinator
      ? (assignedCoordination?.code ?? null)
      : selectedCoordinationCode,
  )
  const ticketRegionClass = ticketTheme
    ? ' operational-shell__region--ticket-panel'
    : ''

  const actionPanelProps = {
    mode: controller.panelMode,
    reportFormKind: controller.reportFormKind,
    hasCoordination: selectedCoordination !== null,
    selectedCoordinationCode,
    level2: controller.level2,
    submission: controller.submission,
    learningDraft,
    onToggleSection: controller.toggleSection,
    onRetrySection: controller.retrySection,
    onLearningChange: (value: string) => {
      if (!controller.selectedProblemId) return
      controller.setLearningDraft(controller.selectedProblemId, value)
    },
    onResolve: () => {
      if (!controller.selectedProblemId) return
      void controller.submitResolution(
        controller.selectedProblemId,
        learningDraft,
      )
    },
    onAdvanceToInProgress: () => {
      const detail = controller.level2.detail
      if (!detail) return
      void controller.submitStatusAdvance(detail.id, detail.status)
    },
    onReportInternal: () => controller.openReportForm('INTERNAL'),
    onReportDependency: () => controller.openReportForm('INTER_COORDINATION'),
    onCancelReport: () => controller.closeReportForm(),
    onCloseDetail: () => controller.closeProblem(),
    onRetryDetail: () => {
      const id = controller.selectedProblemId
      if (!id) return
      controller.closeProblem()
      controller.selectProblem(id)
    },
    history: controller.history,
    onOpenHistory: () => controller.openHistory(),
    onCloseHistory: () => controller.closeHistory(),
    onHistoryPeriodChange: (period: ProblemHistoryPeriod) =>
      controller.setHistoryPeriod(period),
    onSelectHistoryProblem: (problemId: string) =>
      controller.selectProblem(problemId),
    onLoadMoreHistory: () => controller.loadMoreHistory(),
    onRetryHistory: () => controller.reloadHistory(),
    canCreate,
    canViewHistory,
    labelByCode: rowLabelByCode,
    colorByCode,
    idleHint: isCoordinator
      ? 'También puede seleccionar un problema de «Mis reportes» o de su coordinación para consultar el detalle.'
      : null,
    reportForm: {
      reportKind,
      affectedLabel: selectedCoordination
        ? (labelByCode[selectedCoordination.code] ??
          selectedCoordination.shortName)
        : null,
      categories,
      categoriesError,
      responsibleOptions,
      destinationOptions,
      ownCoordinationId: assignedCoordination?.id ?? selectedCoordination?.id ?? null,
      draft,
      submission: controller.submission,
      maxOccurredAt: nowAsLocalInput(),
      onDraftChange: (patch: Partial<typeof draft>) =>
        controller.setReportDraft(draftKey, { ...draft, ...patch }),
      onSubmit: () => {
        void controller.submitReport({
          draftKey,
          reportKind,
          selectedCoordinationCode,
          selectedCoordinationId: selectedCoordination?.id ?? null,
          responsibleCoordinationCode: responsibleCodeForSubmit,
          draft,
        })
      },
    },
  }

  if (coordinatorAssignmentError) {
    return (
      <div
        className="operational-shell operational-shell--coordinator"
        data-testid="operational-shell"
        data-surface="operational-shell"
        data-shell-layout="coordinator"
        data-assignment="missing"
      >
        <CircusScene />
        <div
          className="operational-shell__assignment-error"
          data-testid="coordinator-assignment-error"
          role="alert"
        >
          <h1>Coordinación no asignada</h1>
          <p>
            Su cuenta de coordinador no tiene una coordinación válida vinculada.
            No se mostrará la mesa completa ni se elegirá un área arbitraria.
            Contacte al administrador para corregir la asignación.
          </p>
        </div>
        <div className="operational-shell__bottom" data-testid="shell-bottom">
          <span className="operational-shell__bottom-label">Menú</span>
        </div>
      </div>
    )
  }

  if (isCoordinator) {
    const own = assignedCoordination
    const ownIdentity = own ? resolveCoordinationVisualIdentity(own) : null

    return (
      <div
        className="operational-shell operational-shell--coordinator"
        data-testid="operational-shell"
        data-surface="operational-shell"
        data-shell-layout="coordinator"
        data-ticket-theme={ticketTheme}
        data-assigned-code={own?.code ?? undefined}
      >
        <CircusScene />

        <div
          className="operational-shell__rail-stack"
          data-testid="shell-region-rail"
        >
          <ShellRegion
            region="character"
            title="Estado del personaje"
            className={`operational-shell__region--character operational-shell__region--coordinator-character${ticketRegionClass}`}
            showTitle={false}
            ticketTheme={ticketTheme}
            ticketPanel={ticketTheme ? 'character' : undefined}
          >
            <DirectionCharacter
              presentation={characterPresentation}
              mood={characterMood}
              reactionId={reaccionVisible && pending ? pending.id : null}
              reactionTrigger={pending?.trigger ?? 'approve'}
              onReactionPlayed={controller.consumeCharacterReaction}
              showLives={characterLives.showLives}
              lifePoints={characterLives.lifePoints}
              livesOwnerKey={characterLives.ownerKey}
            />
          </ShellRegion>

          {own && ownIdentity ? (
            <div
              className="operational-shell__own-card"
              data-testid="coordinator-own-card"
              data-region="own-card"
              aria-label="Mi coordinación"
            >
              <CoordinationCard
                identity={ownIdentity}
                status={own.status}
                productLabel={labelByCode[own.code]}
                selected
              />
            </div>
          ) : null}
        </div>

        <ShellRegion
          region="my-reports"
          title="Mis reportes"
          className={`operational-shell__region--my-reports${ticketRegionClass}`}
          showTitle={false}
          ticketTheme={ticketTheme}
          ticketPanel={ticketTheme ? 'reports' : undefined}
        >
          <MyReportsPanel
            myReports={controller.myReports}
            selectedProblemId={controller.selectedProblemId}
            onSelect={(problemId, coordinationCode) =>
              controller.openMyReport(
                problemId,
                coordinationCode as CoordinationId | null,
                { keepSelection: true },
              )
            }
            onLoadMore={controller.loadMoreMyReports}
            labelByCode={rowLabelByCode}
            colorByCode={colorByCode}
          />
        </ShellRegion>

        <ShellRegion
          region="coordination-problems"
          title="Problemas de mi coordinación"
          className={`operational-shell__region--coordination-problems${ticketRegionClass}`}
          showTitle={false}
          ticketTheme={ticketTheme}
          ticketPanel={ticketTheme ? 'problems' : undefined}
        >
          {own && ownIdentity ? (
            <CoordinatorProblemPanel
              coordination={own}
              identity={ownIdentity}
              productLabel={labelByCode[own.code]}
              level1={controller.level1}
              selectedProblemId={controller.selectedProblemId}
              labelByCode={rowLabelByCode}
              colorByCode={colorByCode}
              onProblemSelect={controller.selectProblem}
              onRetry={controller.retryCoordinationProblems}
            />
          ) : null}
        </ShellRegion>

        <ShellRegion
          region="action"
          title="Reportar o consultar"
          className={`operational-shell__action${ticketRegionClass}`}
          showTitle={false}
          ticketTheme={ticketTheme}
          ticketPanel={ticketTheme ? 'action' : undefined}
        >
          <OperationalActionPanel {...actionPanelProps} />
        </ShellRegion>

        <div className="operational-shell__bottom" data-testid="shell-bottom">
          <span className="operational-shell__bottom-label">Menú</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="operational-shell"
      data-testid="operational-shell"
      data-surface="operational-shell"
      data-shell-layout="deck"
      data-ticket-theme={ticketTheme}
    >
      <CircusScene />

      <div className="operational-shell__main" data-testid="shell-main">
        <div className="operational-shell__top" data-testid="shell-top">
          <ShellRegion
            region="character"
            title="Estado del personaje"
            className={`operational-shell__region--character${ticketRegionClass}`}
            showTitle={false}
            ticketTheme={ticketTheme}
            ticketPanel={ticketTheme ? 'character' : undefined}
          >
            <DirectionCharacter
              presentation={characterPresentation}
              mood={characterMood}
              reactionId={reaccionVisible && pending ? pending.id : null}
              reactionTrigger={pending?.trigger ?? 'approve'}
              onReactionPlayed={controller.consumeCharacterReaction}
              showLives={characterLives.showLives}
              lifePoints={characterLives.lifePoints}
              livesOwnerKey={characterLives.ownerKey}
            />
          </ShellRegion>

          <ShellRegion
            region="my-reports"
            title="Mis reportes"
            className={`operational-shell__region--my-reports${ticketRegionClass}`}
            showTitle={false}
            ticketTheme={ticketTheme}
            ticketPanel={ticketTheme ? 'reports' : undefined}
          >
            <MyReportsPanel
              myReports={controller.myReports}
              selectedProblemId={controller.selectedProblemId}
              onSelect={(problemId, coordinationCode) =>
                controller.openMyReport(
                  problemId,
                  coordinationCode as CoordinationId | null,
                )
              }
              onLoadMore={controller.loadMoreMyReports}
              labelByCode={rowLabelByCode}
              colorByCode={colorByCode}
            />
          </ShellRegion>

          <ShellRegion
            region="coordination-problems"
            title="Problemas de la coordinación"
            hint={
              selectedCoordination ? undefined : 'Seleccione una coordinación'
            }
            className={`operational-shell__region--coordination-problems${ticketRegionClass}`}
            showTitle={!selectedCoordination}
            ticketTheme={ticketTheme}
            ticketPanel={ticketTheme ? 'problems' : undefined}
          >
            {selectedCoordination && (
              <CoordinationProblemList
                coordination={selectedCoordination}
                identity={resolveCoordinationVisualIdentity(
                  selectedCoordination,
                )}
                productLabel={labelByCode[selectedCoordination.code]}
                level1={controller.level1}
                selectedProblemId={controller.selectedProblemId}
                onProblemSelect={controller.selectProblem}
                onRetry={controller.retryCoordinationProblems}
                labelByCode={rowLabelByCode}
                colorByCode={colorByCode}
              />
            )}
          </ShellRegion>
        </div>

        <div
          className="operational-shell__stage"
          data-testid="shell-stage"
          data-surface="operational-deck"
        >
          <OperationalCardExperience controller={controller} />
        </div>
      </div>

      <ShellRegion
        region="action"
        title="Reportar o resolver"
        className={`operational-shell__action${ticketRegionClass}`}
        showTitle={false}
        ticketTheme={ticketTheme}
        ticketPanel={ticketTheme ? 'action' : undefined}
      >
        <OperationalActionPanel {...actionPanelProps} />
      </ShellRegion>

      <div className="operational-shell__bottom" data-testid="shell-bottom">
        <span className="operational-shell__bottom-label">Menú</span>
      </div>
    </div>
  )
}
