import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import {
  type ExecutiveCoordinationView,
  type ExecutiveOverviewModel,
} from '@/modules/impact-network/data/executive-operational-overview.model'
import type { ProblemCategoryId } from '@/modules/impact-network/data/executive-operational-overview.mock'
import { OperationalMetricsStrip } from '@/modules/impact-network/components/executive/OperationalMetricsStrip'
import {
  OperationalStatusBoard,
  type OperationalStatusFilter,
} from '@/modules/impact-network/components/executive/OperationalStatusBoard'
import { ProblemCategoryList } from '@/modules/impact-network/components/executive/ProblemCategoryList'
import { AttentionQueue } from '@/modules/impact-network/components/executive/AttentionQueue'
import { CoordinationContextPanel } from '@/modules/impact-network/components/executive/CoordinationContextPanel'
import { ExecutiveOverviewSkeleton } from '@/modules/impact-network/components/executive/ExecutiveOverviewSkeleton'
import { NovexIcon } from '@/shared/components/NovexIcon'

interface ExecutiveOperationalOverviewProps {
  model: ExecutiveOverviewModel
  statusFilter: OperationalStatusFilter
  fullscreenTargetRef: RefObject<HTMLDivElement | null>
  guidedCoordinationId?: CoordinationId | null
  reducedMotion?: boolean
  loading?: boolean
  error?: string | null
  onOpenCoordination?: (coordinationId: CoordinationId) => void
  onOpenSituation?: (situationId: string) => void
  onStatusFilterChange: (filter: OperationalStatusFilter) => void
}

export function ExecutiveOperationalOverview({
  model,
  statusFilter,
  fullscreenTargetRef,
  guidedCoordinationId,
  reducedMotion = false,
  loading = false,
  error = null,
  onOpenCoordination,
  onOpenSituation,
  onStatusFilterChange,
}: ExecutiveOperationalOverviewProps) {
  const [selectedCoordinationId, setSelectedCoordinationId] =
    useState<CoordinationId | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<ProblemCategoryId | null>(null)
  useEffect(() => {
    if (guidedCoordinationId !== undefined) {
      setSelectedCoordinationId(guidedCoordinationId)
    }
  }, [guidedCoordinationId])

  const selectedCoordination = useMemo<ExecutiveCoordinationView | null>(
    () =>
      model.coordinations.find(
        (coordination) => coordination.id === selectedCoordinationId,
      ) ?? null,
    [model.coordinations, selectedCoordinationId],
  )

  useEffect(() => {
    if (selectedCoordinationId && !selectedCoordination) {
      setSelectedCoordinationId(null)
    }
  }, [selectedCoordination, selectedCoordinationId])

  const openCoordinationSummary = useCallback(
    (coordinationId: CoordinationId) => {
      setSelectedCoordinationId(coordinationId)
    },
    [],
  )

  const closePanel = useCallback(() => {
    setSelectedCoordinationId(null)
  }, [])

  const panelOpen = selectedCoordination !== null
  const showLoading = loading && !error
  const enter = reducedMotion
    ? undefined
    : { opacity: 0, y: 10 }
  const settle = { opacity: 1, y: 0 }

  return (
    <div
      className={[
        'impact-executive',
        panelOpen ? 'impact-executive--panel-open' : '',
        showLoading ? 'impact-executive--loading' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-tour="executive-operational-overview"
      data-impact-tour="overview"
      data-selected-coordination={selectedCoordinationId ?? ''}
    >
      <div className="impact-executive__main">
        <AnimatePresence mode="wait" initial={false}>
          {showLoading ? (
            <motion.div
              key="executive-skeleton"
              className="impact-executive__stage"
              initial={enter}
              animate={settle}
              exit={reducedMotion ? undefined : { opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.28 }}
            >
              <ExecutiveOverviewSkeleton />
            </motion.div>
          ) : error ? (
            <motion.div
              key="executive-error"
              className="impact-executive__stage"
              initial={enter}
              animate={settle}
              exit={reducedMotion ? undefined : { opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.22 }}
            >
              <div className="impact-executive__loading" role="alert">
                {error}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="executive-ready"
              className="impact-executive__stage"
              initial={enter}
              animate={settle}
              transition={{ duration: reducedMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <OperationalMetricsStrip metrics={model.metrics} />

              <div className="impact-executive__body">
                <div className="impact-executive__map-column">
                  <OperationalStatusBoard
                    model={model}
                    fullscreenTargetRef={fullscreenTargetRef}
                    selectedCoordinationId={selectedCoordinationId}
                    selectedCategoryId={selectedCategoryId}
                    statusFilter={statusFilter}
                    reducedMotion={reducedMotion}
                    onStatusFilterChange={onStatusFilterChange}
                    onClearCategory={() => setSelectedCategoryId(null)}
                    onSelectCoordination={openCoordinationSummary}
                  />
                </div>

                <aside className="impact-executive__rail" aria-label="Contexto operacional">
                  <AnimatePresence mode="wait" initial={false}>
                    {selectedCoordination ? (
                      <CoordinationContextPanel
                        key={`context-${selectedCoordination.id}`}
                        coordination={selectedCoordination}
                        reducedMotion={reducedMotion}
                        onClose={closePanel}
                        onOpenCoordination={onOpenCoordination}
                        onOpenSituation={onOpenSituation}
                      />
                    ) : (
                      <motion.div
                        key="general-rail"
                        className="impact-executive__rail-general"
                        initial={reducedMotion ? false : { opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={reducedMotion ? undefined : { opacity: 0, x: 10 }}
                        transition={{ duration: reducedMotion ? 0 : 0.22 }}
                      >
                        <p className="impact-executive__selection-cta" role="status">
                          <span className="impact-executive__selection-cta-icon" aria-hidden="true">
                            <NovexIcon name="sparkles" size={16} />
                          </span>
                          <span className="impact-executive__selection-cta-copy">
                            <strong>Seleccione una coordinación</strong>
                            <small>Pulse un icono para ver su estado y situaciones.</small>
                          </span>
                        </p>
                        <AttentionQueue
                          items={model.priorities}
                          criticalCount={model.groups.critical.length}
                          selectedCoordinationId={selectedCoordinationId}
                          onSelect={openCoordinationSummary}
                          onShowAll={() => {
                            onStatusFilterChange('all')
                            setSelectedCategoryId(null)
                          }}
                        />
                        <ProblemCategoryList
                          items={model.categories}
                          selectedId={selectedCategoryId}
                          onSelect={(id) =>
                            setSelectedCategoryId((current) =>
                              current === id ? null : (id as ProblemCategoryId),
                            )
                          }
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </aside>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
