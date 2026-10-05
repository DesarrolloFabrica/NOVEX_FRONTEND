import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { canCreateSituations, hasPermission } from '@/modules/auth/utils/permissions'
import { fetchIncidentCategories } from '@/modules/api/situations.api'
import { DirectionCharacter } from '@/modules/operational-cards/components/DirectionCharacter'
import { OperationalActionPanel } from '@/modules/operational-cards/components/OperationalActionPanel'
import type { OperationalActionPanelProps } from '@/modules/operational-cards/components/OperationalActionPanel'
import { resolveCharacterMood } from '@/modules/operational-cards/data/characterMood'
import { buildCharacterPresentation } from '@/modules/operational-cards/data/characterReaction'
import {
  resolveCharacterCoordination,
  resolveCharacterLives,
} from '@/modules/operational-cards/data/characterLivesSource'
import { buildProductTable } from '@/modules/operational-cards/data/productHierarchy'
import { buildTableLayout } from '@/modules/operational-cards/data/tableLayout'
import { useOperationalOverview } from '@/modules/operational-cards/hooks/useOperationalOverview'
import {
  emptyReportDraft,
  reportDraftKey,
} from '@/modules/operational-cards/state/operationalCards.reducer'
import { nowAsLocalInput } from '@/modules/operational-cards/services/report-submission.service'
import { resolveTicketTheme } from '@/modules/operational-cards/experience/ticketThemes'
import {
  experienceAllowsOperation,
  type OperationalCenterExperienceId,
} from '@/modules/operational-cards/experience/resolveOperationalCenterExperience'
import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'
import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import type { IncidentCategorySummary } from '@/modules/situations/types/situation.types'
import type { ProblemHistoryPeriod } from '@/modules/operational-cards/types/problem-history.types'
import { getErrorMessage } from '@/shared/utils/error'

/**
 * Estado de presentación compartido entre shells.
 *
 * El hook de datos sigue siendo `useOperationalOverview` (un contrato).
 * Las escrituras solo se cablean cuando `experienceAllowsOperation`.
 */
export function useOperationalShellModel(
  experience: OperationalCenterExperienceId,
) {
  const { user } = useAuth()
  const isCoordinator = experience === 'coordinator'
  const canOperate = experienceAllowsOperation(experience)
  const canCreate = canOperate && canCreateSituations(user)
  const allowLifecycleActions = canOperate
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

  const panelMode =
    !canCreate && controller.panelMode === 'report'
      ? 'idle'
      : controller.panelMode

  const noop = () => {}

  const actionPanelProps: OperationalActionPanelProps = {
    mode: panelMode,
    reportFormKind: controller.reportFormKind,
    hasCoordination: selectedCoordination !== null,
    selectedCoordinationCode,
    level2: controller.level2,
    submission: controller.submission,
    learningDraft,
    onToggleSection: controller.toggleSection,
    onRetrySection: controller.retrySection,
    onLearningChange: (value: string) => {
      if (!allowLifecycleActions || !controller.selectedProblemId) return
      controller.setLearningDraft(controller.selectedProblemId, value)
    },
    onResolve: () => {
      if (!allowLifecycleActions || !controller.selectedProblemId) return
      void controller.submitResolution(
        controller.selectedProblemId,
        learningDraft,
      )
    },
    onAdvanceToInProgress: () => {
      if (!allowLifecycleActions) return
      const detail = controller.level2.detail
      if (!detail) return
      void controller.submitStatusAdvance(detail.id, detail.status)
    },
    onReportInternal: canCreate
      ? () => controller.openReportForm('INTERNAL')
      : noop,
    onReportDependency: canCreate
      ? () => controller.openReportForm('INTER_COORDINATION')
      : noop,
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
    allowLifecycleActions,
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
      ownCoordinationId:
        assignedCoordination?.id ?? selectedCoordination?.id ?? null,
      draft,
      submission: controller.submission,
      maxOccurredAt: nowAsLocalInput(),
      onDraftChange: (patch: Partial<typeof draft>) =>
        controller.setReportDraft(draftKey, { ...draft, ...patch }),
      onSubmit: () => {
        if (!canCreate) return
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

  const character = (
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
  )

  const actionPanel = <OperationalActionPanel {...actionPanelProps} />

  return {
    experience,
    controller,
    canCreate,
    allowLifecycleActions,
    coordinatorAssignmentError,
    assignedCoordination,
    selectedCoordination,
    labelByCode,
    rowLabelByCode,
    colorByCode,
    ticketTheme,
    ticketRegionClass,
    character,
    actionPanel,
  }
}

export type OperationalShellModel = ReturnType<typeof useOperationalShellModel>
