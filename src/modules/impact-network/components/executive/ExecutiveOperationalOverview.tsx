import { useCallback, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  getCoordination,
  type CoordinationId,
} from '@/modules/impact-network/data/coordination-islands.config'
import {
  isAffectedOperationalStatus,
  resolveCoordinationOperationalState,
} from '@/modules/impact-network/data/executive-operational-overview.mock'
import { OperationalMetricsStrip } from '@/modules/impact-network/components/executive/OperationalMetricsStrip'
import { OperationalMapStage } from '@/modules/impact-network/components/executive/OperationalMapStage'
import { ProblemCategoryList } from '@/modules/impact-network/components/executive/ProblemCategoryList'
import { AttentionQueue } from '@/modules/impact-network/components/executive/AttentionQueue'
import { OperationalPatterns } from '@/modules/impact-network/components/executive/OperationalPatterns'
import { CoordinationContextPanel } from '@/modules/impact-network/components/executive/CoordinationContextPanel'

interface ExecutiveOperationalOverviewProps {
  coordinationIds: readonly CoordinationId[]
  reducedMotion?: boolean
  loading?: boolean
  error?: string | null
}

export function ExecutiveOperationalOverview({
  coordinationIds,
  reducedMotion = false,
  loading = false,
  error = null,
}: ExecutiveOperationalOverviewProps) {
  const [selectedCoordinationId, setSelectedCoordinationId] =
    useState<CoordinationId | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  )
  const fullscreenTargetRef = useRef<HTMLDivElement | null>(null)

  const openCoordination = useCallback((coordinationId: CoordinationId) => {
    const state = resolveCoordinationOperationalState(coordinationId)
    if (!isAffectedOperationalStatus(state.status)) {
      setSelectedCoordinationId(null)
      return
    }
    setSelectedCoordinationId(getCoordination(coordinationId).id)
  }, [])

  const closePanel = useCallback(() => {
    setSelectedCoordinationId(null)
  }, [])

  const panelOpen = selectedCoordinationId !== null

  return (
    <div
      className={[
        'impact-executive',
        panelOpen ? 'impact-executive--panel-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-tour="executive-operational-overview"
      data-selected-coordination={selectedCoordinationId ?? ''}
    >
      <div className="impact-executive__main">
        <OperationalMetricsStrip />

        <div ref={fullscreenTargetRef} className="impact-executive__body">
          <div className="impact-executive__map-column">
            <OperationalMapStage
              coordinationIds={coordinationIds}
              fullscreenTargetRef={fullscreenTargetRef}
              selectedCoordinationId={selectedCoordinationId}
              reducedMotion={reducedMotion}
              loading={loading}
              error={error}
              onSelectCoordination={openCoordination}
            />
            <OperationalPatterns />
          </div>

          <aside className="impact-executive__rail" aria-label="Contexto operacional">
            <AnimatePresence mode="wait" initial={false}>
              {selectedCoordinationId ? (
                <CoordinationContextPanel
                  key={`context-${selectedCoordinationId}`}
                  coordinationId={selectedCoordinationId}
                  reducedMotion={reducedMotion}
                  onClose={closePanel}
                  onViewSituation={() => {
                    // Fase 2: abrir detalle ejecutivo conservando esta transición.
                  }}
                />
              ) : (
                <motion.div
                  key="general-rail"
                  className="impact-executive__rail-general"
                  initial={reducedMotion ? false : { opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, x: -12 }}
                  transition={{ duration: reducedMotion ? 0 : 0.22 }}
                >
                  <AttentionQueue
                    selectedCoordinationId={selectedCoordinationId}
                    onSelect={openCoordination}
                  />
                  <ProblemCategoryList
                    selectedId={selectedCategoryId}
                    onSelect={(id) =>
                      setSelectedCategoryId((current) =>
                        current === id ? null : id,
                      )
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </aside>
        </div>
      </div>
    </div>
  )
}
