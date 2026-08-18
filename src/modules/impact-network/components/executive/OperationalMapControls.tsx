import type { RefObject } from 'react'
import {
  OPERATIONAL_MAP_MAX_ZOOM,
  OPERATIONAL_MAP_MIN_ZOOM,
} from '@/modules/impact-network/hooks/useOperationalMapViewport'

interface OperationalMapControlsProps {
  zoom: number
  zoomLabelRef: RefObject<HTMLSpanElement | null>
  isFullscreen: boolean
  canReset: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  onToggleFullscreen: () => void
  minZoom?: number
  maxZoom?: number
  surfaceLabel?: string
}

function FullscreenGlyph({ active }: { active: boolean }) {
  return active ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 4v5H4M15 4v5h5M20 15h-5v5M4 15h5v5" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 4H4v5M15 4h5v5M20 15v5h-5M4 15v5h5" />
    </svg>
  )
}

function FitGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
    </svg>
  )
}

export function OperationalMapControls({
  zoom,
  zoomLabelRef,
  isFullscreen,
  canReset,
  onZoomIn,
  onZoomOut,
  onReset,
  onToggleFullscreen,
  minZoom = OPERATIONAL_MAP_MIN_ZOOM,
  maxZoom = OPERATIONAL_MAP_MAX_ZOOM,
  surfaceLabel = 'mapa',
}: OperationalMapControlsProps) {
  return (
    <div
      className="impact-executive__map-controls"
      aria-label={`Controles del ${surfaceLabel} operacional`}
      data-operational-map-control="true"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="impact-executive__map-control"
        aria-label={
          isFullscreen
            ? 'Salir de pantalla completa'
            : `Ver ${surfaceLabel} en pantalla completa`
        }
        title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        onClick={onToggleFullscreen}
      >
        <FullscreenGlyph active={isFullscreen} />
      </button>
      <button
        type="button"
        className="impact-executive__map-control"
        aria-label="Centrar mapa"
        title="Centrar y ajustar vista"
        disabled={!canReset}
        onClick={onReset}
      >
        <FitGlyph />
      </button>
      <span className="impact-executive__map-controls-divider" aria-hidden="true" />
      <button
        type="button"
        className="impact-executive__map-control impact-executive__map-control--zoom"
        aria-label="Alejar mapa"
        title="Alejar"
        disabled={zoom <= minZoom + 0.005}
        onClick={onZoomOut}
      >
        −
      </button>
      <span
        ref={zoomLabelRef}
        className="impact-executive__map-zoom"
        aria-live="polite"
      >
        {Math.round(zoom * 100)}%
      </span>
      <button
        type="button"
        className="impact-executive__map-control impact-executive__map-control--zoom"
        aria-label="Acercar mapa"
        title="Acercar"
        disabled={zoom >= maxZoom - 0.005}
        onClick={onZoomIn}
      >
        +
      </button>
    </div>
  )
}
