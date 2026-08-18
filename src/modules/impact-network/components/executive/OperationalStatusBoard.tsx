import {
  useMemo,
  type CSSProperties,
  type RefObject,
} from 'react'
import { motion } from 'motion/react'
import {
  EXECUTIVE_STATUS_ORDER,
  type ExecutiveCoordinationView,
  type ExecutiveOverviewModel,
} from '@/modules/impact-network/data/executive-operational-overview.model'
import { getCoordinationIconAsset } from '@/modules/impact-network/data/coordination-icons.config'
import type {
  OperationalStatus,
  ProblemCategoryId,
} from '@/modules/impact-network/data/executive-operational-overview.mock'
import { OperationalMapControls } from '@/modules/impact-network/components/executive/OperationalMapControls'
import {
  STATUS_BOARD_MAX_ZOOM,
  STATUS_BOARD_MIN_ZOOM,
  useStatusBoardViewport,
} from '@/modules/impact-network/hooks/useStatusBoardViewport'
import { NovexIcon } from '@/shared/components/NovexIcon'

export type OperationalStatusFilter = OperationalStatus | 'all'

interface OperationalStatusBoardProps {
  model: ExecutiveOverviewModel
  fullscreenTargetRef: RefObject<HTMLDivElement | null>
  selectedCoordinationId?: string | null
  selectedCategoryId?: ProblemCategoryId | null
  statusFilter: OperationalStatusFilter
  reducedMotion?: boolean
  onStatusFilterChange: (filter: OperationalStatusFilter) => void
  onClearCategory: () => void
  onSelectCoordination: (coordinationId: string) => void
}

const STATUS_META: Readonly<
  Record<OperationalStatus, { title: string; description: string }>
> = {
  critical: { title: 'Crítico', description: 'Requiere acción inmediata' },
  high: { title: 'Alto', description: 'Debe revisarse hoy' },
  attention: { title: 'Atención', description: 'Requiere seguimiento' },
  normal: { title: 'Normal', description: 'Operación estable' },
}

const MAX_COORDINATIONS_PER_ROW = 8
const COORDINATION_COLUMN_WIDTH = 124
const COORDINATION_ROW_HEIGHT = 136
const LANE_HEADER_HEIGHT = 44
const CANVAS_MIN_WIDTH = 1050
const CANVAS_MIN_HEIGHT = 500

function StatusCoordinationCard({
  coordination,
  priorityRank,
  selected,
  reducedMotion,
  index,
  onSelect,
}: {
  coordination: ExecutiveCoordinationView
  priorityRank?: number | null
  selected: boolean
  reducedMotion: boolean
  index: number
  onSelect: (coordinationId: string) => void
}) {
  const iconAsset = getCoordinationIconAsset(coordination.id)

  const incidentLabel =
    coordination.activeSituationCount === 0
      ? 'Sin situaciones activas'
      : `${coordination.activeSituationCount} situación${coordination.activeSituationCount === 1 ? '' : 'es'} activa${coordination.activeSituationCount === 1 ? '' : 's'}`

  return (
    <motion.button
      type="button"
      className="impact-status-island impact-status-coordination"
      data-visual="coordination-icon"
      data-status={coordination.status}
      data-priority={priorityRank ?? undefined}
      data-selected={selected}
      data-coordination-id={coordination.id}
      aria-pressed={selected}
      aria-label={`${coordination.name}. ${coordination.statusLabel}. ${incidentLabel}. Abrir resumen.`}
      onClick={() => onSelect(coordination.id)}
      initial={reducedMotion ? false : { opacity: 0, y: 16, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: reducedMotion ? 0 : 0.42,
        delay: reducedMotion ? 0 : Math.min(index * 0.04, 0.42),
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <span className="impact-status-island__scene" aria-hidden="true">
        <span className="impact-status-coordination__effect">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
        <img
          className="impact-status-island__image"
          src={iconAsset}
          alt=""
          width={128}
          height={128}
          sizes="96px"
          decoding="async"
          loading="eager"
          draggable={false}
        />
      </span>

      <span className="impact-status-island__copy">
        {priorityRank ? (
          <span className="impact-status-island__priority">
            Prioridad {String(priorityRank).padStart(2, '0')}
          </span>
        ) : null}
        <strong title={coordination.name}>{coordination.shortName}</strong>
        <span className="impact-status-island__state">
          <span className="impact-status-island__signal" aria-hidden="true">
            <i />
          </span>
          {coordination.statusLabel}
        </span>
      </span>
    </motion.button>
  )
}

export function OperationalStatusBoard({
  model,
  fullscreenTargetRef,
  selectedCoordinationId = null,
  selectedCategoryId = null,
  statusFilter,
  reducedMotion = false,
  onStatusFilterChange,
  onClearCategory,
  onSelectCoordination,
}: OperationalStatusBoardProps) {
  const filteredGroups = useMemo(() => {
    const filterGroup = (status: OperationalStatus) =>
      model.groups[status].filter(
        (coordination) =>
          !selectedCategoryId ||
          coordination.categories.includes(selectedCategoryId),
      )

    return {
      critical: filterGroup('critical'),
      high: filterGroup('high'),
      attention: filterGroup('attention'),
      normal: filterGroup('normal'),
    } satisfies Record<
      OperationalStatus,
      readonly ExecutiveCoordinationView[]
    >
  }, [model.groups, selectedCategoryId])

  const visibleLanes = useMemo(
    () =>
      EXECUTIVE_STATUS_ORDER.filter(
        (status) =>
          (statusFilter === 'all' || statusFilter === status) &&
          filteredGroups[status].length > 0,
      ).map((status) => {
        const coordinations = filteredGroups[status]
        const columns = Math.min(
          MAX_COORDINATIONS_PER_ROW,
          coordinations.length,
        )
        const rows = Math.ceil(
          coordinations.length / MAX_COORDINATIONS_PER_ROW,
        )
        return {
          status,
          coordinations,
          columns,
          height: LANE_HEADER_HEIGHT + rows * COORDINATION_ROW_HEIGHT,
        }
      }),
    [filteredGroups, statusFilter],
  )

  const maxColumns = Math.max(1, ...visibleLanes.map((lane) => lane.columns))
  const canvasWidth = Math.max(
    CANVAS_MIN_WIDTH,
    maxColumns * COORDINATION_COLUMN_WIDTH + 64,
  )
  const naturalCanvasHeight =
    visibleLanes.reduce((total, lane) => total + lane.height, 0) +
    Math.max(0, visibleLanes.length - 1) * 8 +
    20
  const canvasHeight = Math.max(CANVAS_MIN_HEIGHT, naturalCanvasHeight)
  const laneExpansion = visibleLanes.length
    ? Math.max(0, canvasHeight - naturalCanvasHeight) / visibleLanes.length
    : 0
  const viewport = useStatusBoardViewport({
    contentWidth: canvasWidth,
    contentHeight: canvasHeight,
    fullscreenTargetRef,
    reducedMotion,
  })

  const laneRows = visibleLanes
    .map((lane) => `${lane.height + laneExpansion}px`)
    .join(' ')
  const hasAnyResult = visibleLanes.length > 0
  const priorityRankByCoordination = useMemo(
    () =>
      new Map(
        model.priorities
          .filter((item) => item.rank <= 2)
          .map((item) => [item.coordinationId, item.rank] as const),
      ),
    [model.priorities],
  )

  return (
    <section
      className="impact-executive__status-board"
      aria-label="Coordinaciones agrupadas por estado operacional"
      data-impact-tour="coordination-board"
      data-fullscreen={viewport.isFullscreen}
      data-dragging={viewport.isDragging}
      data-zoom={Math.round(viewport.view.zoom * 100)}
      data-overview={viewport.view.zoom <= 0.68}
    >
      {selectedCategoryId ? (
        <button
          type="button"
          className="impact-executive__active-filter impact-executive__active-filter--canvas"
          onClick={onClearCategory}
        >
          Categoría activa
          <NovexIcon name="x" size={12} />
        </button>
      ) : null}

      <div
        ref={viewport.containerRef}
        className="impact-executive__status-canvas"
        onPointerDown={viewport.onPointerDown}
        onPointerMove={viewport.onPointerMove}
        onPointerUp={viewport.onPointerUp}
        onPointerCancel={viewport.onPointerCancel}
        onClickCapture={viewport.onClickCapture}
      >
        <div className="impact-executive__status-ambient" aria-hidden="true" />

        {hasAnyResult ? (
          <div
            className="impact-executive__status-viewport"
            style={
              {
                width: canvasWidth,
                height: canvasHeight,
                '--status-pan-x': `${viewport.view.x}px`,
                '--status-pan-y': `${viewport.view.y}px`,
                '--status-zoom': viewport.view.zoom,
                '--status-transition': viewport.transitionDuration,
              } as CSSProperties
            }
          >
            <div
              className="impact-executive__status-groups"
              data-lane-count={visibleLanes.length}
              style={{ gridTemplateRows: laneRows }}
            >
              {visibleLanes.map(({ status, coordinations, columns }, laneIndex) => {
                const meta = STATUS_META[status]
                const coordinationOffset = visibleLanes
                  .slice(0, laneIndex)
                  .reduce((total, lane) => total + lane.coordinations.length, 0)
                return (
                  <motion.section
                    key={status}
                    className="impact-status-group"
                    data-status={status}
                    aria-label={`${meta.title}: ${coordinations.length} coordinaciones`}
                    initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: reducedMotion ? 0 : 0.34,
                      delay: reducedMotion ? 0 : laneIndex * 0.07,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <header className="impact-status-group__header">
                      <span className="impact-status-group__title">
                        <i aria-hidden="true" />
                        <strong>{meta.title}</strong>
                        <b>{coordinations.length}</b>
                      </span>
                      <small>{meta.description}</small>
                    </header>

                    <div
                      className="impact-status-group__grid"
                      style={{
                        '--status-grid-columns': columns,
                      } as CSSProperties}
                    >
                      {coordinations.map((coordination, coordinationIndex) => (
                        <StatusCoordinationCard
                          key={coordination.id}
                          coordination={coordination}
                          priorityRank={
                            priorityRankByCoordination.get(coordination.id) ?? null
                          }
                          selected={selectedCoordinationId === coordination.id}
                          reducedMotion={reducedMotion}
                          index={coordinationOffset + coordinationIndex}
                          onSelect={onSelectCoordination}
                        />
                      ))}
                    </div>
                  </motion.section>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="impact-executive__no-results">
            <NovexIcon name="search" size={22} />
            <strong>No hay coordinaciones con este filtro</strong>
            <button
              type="button"
              onClick={() => {
                onClearCategory()
                onStatusFilterChange('all')
              }}
            >
              Restablecer vista
            </button>
          </div>
        )}

        <p className="impact-executive__status-gesture" aria-hidden="true">
          Arrastrar para mover · rueda para zoom
        </p>
      </div>

      <OperationalMapControls
        zoom={viewport.view.zoom}
        zoomLabelRef={viewport.zoomLabelRef}
        isFullscreen={viewport.isFullscreen}
        canReset={viewport.hasCustomView}
        minZoom={STATUS_BOARD_MIN_ZOOM}
        maxZoom={STATUS_BOARD_MAX_ZOOM}
        surfaceLabel="tablero"
        onZoomIn={viewport.zoomIn}
        onZoomOut={viewport.zoomOut}
        onReset={viewport.resetView}
        onToggleFullscreen={() => void viewport.toggleFullscreen()}
      />
    </section>
  )
}
