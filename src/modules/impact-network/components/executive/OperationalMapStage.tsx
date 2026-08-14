import { useEffect, useMemo, useRef, type RefObject } from 'react'
import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import { buildOperationalMapLayout } from '@/modules/impact-network/engine/operational-map-layout'
import {
  OPERATIONAL_MAP_SELECTION_ZOOM,
  useOperationalMapViewport,
} from '@/modules/impact-network/hooks/useOperationalMapViewport'
import { OperationalIslandMarker } from '@/modules/impact-network/components/executive/OperationalIslandMarker'
import { SceneBackdrop } from '@/modules/impact-network/components/PropagationScene'
import { OperationalTerritoryBackdrop } from '@/modules/impact-network/components/executive/OperationalTerritoryBackdrop'
import { OperationalMapControls } from '@/modules/impact-network/components/executive/OperationalMapControls'

interface OperationalMapStageProps {
  coordinationIds: readonly CoordinationId[]
  fullscreenTargetRef?: RefObject<HTMLElement | null>
  selectedCoordinationId?: CoordinationId | null
  reducedMotion?: boolean
  loading?: boolean
  error?: string | null
  onSelectCoordination?: (coordinationId: CoordinationId) => void
}

export function OperationalMapStage({
  coordinationIds,
  fullscreenTargetRef,
  selectedCoordinationId = null,
  reducedMotion = false,
  loading = false,
  error = null,
  onSelectCoordination,
}: OperationalMapStageProps) {
  const viewport = useOperationalMapViewport({
    fullscreenTargetRef,
    reducedMotion,
  })
  const density = viewport.isFullscreen ? 'expanded' : 'standard'

  const layout = useMemo(
    () =>
      buildOperationalMapLayout(
        coordinationIds,
        viewport.size.width,
        viewport.size.height,
        { density },
      ),
    [coordinationIds, density, viewport.size.height, viewport.size.width],
  )

  const layoutRef = useRef(layout)
  const { revealPoint } = viewport

  useEffect(() => {
    layoutRef.current = layout
  }, [layout])

  useEffect(() => {
    if (!selectedCoordinationId) return
    const node = layoutRef.current.nodes.find(
      (candidate) => candidate.coordinationId === selectedCoordinationId,
    )
    if (!node) return

    revealPoint(node.x, node.y, {
      paddingX: node.size * 0.9,
      paddingY: node.size,
      minZoom: OPERATIONAL_MAP_SELECTION_ZOOM,
    })
  }, [revealPoint, selectedCoordinationId])

  return (
    <section
      className={[
        'impact-executive__map',
        viewport.isDragging ? 'impact-executive__map--dragging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Mapa operacional"
      data-has-selection={selectedCoordinationId !== null}
      data-fullscreen={viewport.isFullscreen}
      data-density={density}
      data-zoom={Math.round(viewport.zoom * 100)}
      data-status-scenario={layout.statusScenario}
    >
      <header className="impact-executive__map-header">
        <div>
          <p className="impact-executive__map-eyebrow">Mapa operacional</p>
          <h3>Panorama general de las coordinaciones</h3>
        </div>
      </header>

      <div
        ref={viewport.containerRef}
        className="impact-executive__map-stage"
        onPointerDown={viewport.onPointerDown}
        onPointerMove={viewport.onPointerMove}
        onPointerUp={viewport.onPointerUp}
        onPointerCancel={viewport.onPointerCancel}
      >
        <div className="impact-executive__map-ambient" aria-hidden="true" />
        <div className="impact-executive__cartography" aria-hidden="true">
          <SceneBackdrop
            particleCount={reducedMotion ? 0 : 8}
            softAtlasBlur={false}
            liteEffects
          />
          <OperationalTerritoryBackdrop
            terrain={layout.terrain}
            territories={layout.territories}
            density={density}
          />
        </div>
        <div className="impact-executive__map-vignette" aria-hidden="true" />

        {loading ? (
          <p className="impact-executive__map-state">Cargando mapa…</p>
        ) : error ? (
          <p className="impact-executive__map-state" role="alert">
            {error}
          </p>
        ) : (
          <div
            ref={viewport.stageRef}
            className="impact-executive__map-viewport"
            style={{
              width: viewport.size.width,
              height: viewport.size.height,
              transitionDuration: viewport.transitionDuration,
            }}
          >
            <div
              className="impact-executive__map-canvas"
              style={{
                width: viewport.size.width,
                height: viewport.size.height,
              }}
            >
              {layout.nodes.map((node) => (
                <OperationalIslandMarker
                  key={node.coordinationId}
                  coordinationId={node.coordinationId}
                  territoryId={node.territoryId}
                  x={node.x}
                  y={node.y}
                  size={node.size}
                  scaleTier={node.scaleTier}
                  labelPlacement={node.labelPlacement}
                  selected={selectedCoordinationId === node.coordinationId}
                  focal={node.focal}
                  status={node.status}
                  dimmed={
                    selectedCoordinationId !== null &&
                    selectedCoordinationId !== node.coordinationId
                  }
                  reducedMotion={reducedMotion}
                  onSelect={onSelectCoordination}
                />
              ))}
            </div>
          </div>
        )}

        <div className="impact-executive__map-hud" aria-hidden="true">
          <span className="impact-executive__map-hud-north">N-04 / OPERACIÓN</span>
          <span className="impact-executive__map-hud-west">LAT 04.7109 N</span>
          <span className="impact-executive__map-hud-south">NOVEX / OPS · SYNC 14/14</span>
          <span className="impact-executive__map-hud-east">LONG 74.0721 W</span>
        </div>

        <p className="impact-executive__map-gesture" aria-hidden="true">
          <span /> Arrastre para explorar · rueda para zoom
        </p>
      </div>

      <OperationalMapControls
        zoom={viewport.zoom}
        zoomLabelRef={viewport.zoomLabelRef}
        isFullscreen={viewport.isFullscreen}
        canReset={viewport.hasCustomView}
        onZoomIn={viewport.zoomIn}
        onZoomOut={viewport.zoomOut}
        onReset={viewport.resetView}
        onToggleFullscreen={() => void viewport.toggleFullscreen()}
      />
    </section>
  )
}
