import {
  memo,
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import {
  getCoordination,
  getIslandPreviewAssetPath,
  type CoordinationId,
} from '@/modules/impact-network/data/coordination-islands.config'
import type { IslandLabelPlacement } from '@/modules/impact-network/components/IslandNode'
import {
  OPERATIONAL_STATUS_LABEL,
  resolveCoordinationOperationalState,
  type CoordinationProblemTag,
  type OperationalStatus,
} from '@/modules/impact-network/data/executive-operational-overview.mock'
import { ProblemCategoryGlyph } from '@/modules/impact-network/components/executive/ProblemCategoryGlyph'
import type { OperationalMapScaleTier } from '@/modules/impact-network/engine/operational-map-layout'

interface OperationalIslandMarkerProps {
  coordinationId: CoordinationId
  territoryId?: string
  x: number
  y: number
  size: number
  scaleTier?: OperationalMapScaleTier
  labelPlacement?: IslandLabelPlacement
  selected?: boolean
  focal?: boolean
  status?: OperationalStatus
  dimmed?: boolean
  reducedMotion?: boolean
  onSelect?: (coordinationId: CoordinationId) => void
}

/** Los rings comunican gravedad sin agrandar la isla ni pintar el terreno. */
const RINGS_BY_STATUS: Readonly<Record<OperationalStatus, number>> = {
  normal: 0,
  attention: 1,
  high: 2,
  critical: 3,
}

function ProblemSatellite({
  problem,
  index,
  count,
}: {
  problem: CoordinationProblemTag
  index: number
  count: number
}) {
  const plural = problem.activeCount === 1 ? '' : 's'

  return (
    <span
      className="impact-executive-island__problem"
      data-index={index}
      data-count={count}
      title={`${problem.label}\n${problem.activeCount} problema${plural} activo${plural}`}
    >
      <ProblemCategoryGlyph categoryId={problem.categoryId} size={12} />
      <span className="impact-executive-island__problem-tip" role="tooltip">
        <b>{problem.label}</b>
        <small>
          {problem.activeCount} problema{plural} activo{plural}
        </small>
      </span>
    </span>
  )
}

/**
 * CoordinationNode: etiqueta, estado, indicadores y isla forman una sola unidad
 * visual anclada a su territorio. La posición nunca depende del estado.
 */
function OperationalIslandMarkerView({
  coordinationId,
  territoryId,
  x,
  y,
  size,
  scaleTier = 'normal',
  labelPlacement = 'top',
  selected = false,
  focal = false,
  status: statusOverride,
  dimmed = false,
  reducedMotion = false,
  onSelect,
}: OperationalIslandMarkerProps) {
  const coordination = getCoordination(coordinationId)
  const resolvedState = resolveCoordinationOperationalState(coordinationId)
  const fullImageAsset = coordination.islandAsset
  const previewImageAsset = getIslandPreviewAssetPath(fullImageAsset)
  const [displayedImageAsset, setDisplayedImageAsset] =
    useState(previewImageAsset)
  const status = statusOverride ?? resolvedState.status
  const statusLabel = OPERATIONAL_STATUS_LABEL[status]
  const problems =
    statusOverride && statusOverride !== resolvedState.status
      ? []
      : resolvedState.problems
  const problemsLabel = problems.length
    ? `. Problemas: ${problems.map((problem) => problem.label).join(', ')}`
    : ''
  const rings = RINGS_BY_STATUS[status]

  useEffect(() => {
    setDisplayedImageAsset(previewImageAsset)
    const image = new Image()
    image.decoding = 'async'
    image.src = fullImageAsset
    const revealFullImage = () => setDisplayedImageAsset(fullImageAsset)
    if (image.complete) {
      revealFullImage()
      return
    }
    image.addEventListener('load', revealFullImage, { once: true })
    return () => image.removeEventListener('load', revealFullImage)
  }, [fullImageAsset, previewImageAsset])

  const handleSelect = useCallback(() => {
    onSelect?.(coordinationId)
  }, [coordinationId, onSelect])

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        handleSelect()
      }
    },
    [handleSelect],
  )

  const style = {
    left: x,
    top: y,
    width: size,
    height: size,
    marginLeft: -size / 2,
    marginTop: -size / 2,
    '--island-size': `${size}px`,
    zIndex: (focal ? 70 : 20) + Math.round(y / 40),
  } as CSSProperties

  return (
    <article
      className={[
        'impact-executive-island',
        selected ? 'impact-executive-island--selected' : '',
        dimmed ? 'impact-executive-island--dimmed' : '',
        reducedMotion ? 'impact-executive-island--reduced' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-status={status}
      data-focal={focal}
      data-scale-tier={scaleTier}
      data-territory-id={territoryId}
      data-label-placement={labelPlacement}
      data-coordination-id={coordination.id}
      style={style}
      role="button"
      tabIndex={0}
      aria-label={`${coordination.name}. Estado: ${statusLabel}${problemsLabel}`}
      aria-pressed={selected}
      onClick={handleSelect}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="impact-executive-island__halo" aria-hidden="true" />
      {rings > 0 ? (
        <div
          className="impact-executive-island__rings"
          data-rings={rings}
          aria-hidden="true"
        >
          {Array.from({ length: rings }, (_, index) => (
            <i key={index} data-ring={index} />
          ))}
        </div>
      ) : null}
      <div className="impact-executive-island__ground" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      {status === 'critical' ? (
        <div className="impact-executive-island__sparks" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      ) : null}
      <div className="impact-executive-island__body" aria-hidden="true">
        <img
          src={displayedImageAsset}
          alt=""
          className="impact-executive-island__image"
          width={320}
          height={320}
          decoding="async"
          draggable={false}
        />
      </div>

      {problems.length > 0 ? (
        <span
          className="impact-executive-island__problems"
          data-count={problems.length}
        >
          {problems.map((problem, index) => (
            <ProblemSatellite
              key={problem.categoryId}
              problem={problem}
              index={index}
              count={problems.length}
            />
          ))}
        </span>
      ) : null}

      <div className="impact-executive-island__meta">
        {focal ? (
          <span className="impact-executive-island__focus">
            Foco operacional
          </span>
        ) : null}
        <span className="impact-executive-island__meta-copy">
          <span className="impact-executive-island__name">
            {coordination.shortName}
          </span>
          <span
            className="impact-executive-island__badge"
            data-status={status}
          >
            <i aria-hidden="true" />
            {statusLabel}
          </span>
        </span>
      </div>
    </article>
  )
}

export const OperationalIslandMarker = memo(OperationalIslandMarkerView)
