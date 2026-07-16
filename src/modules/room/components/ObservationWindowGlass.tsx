import { PLANE_WINDOW_GLASS } from '@/modules/monitoring/constants/visualPlanes'

/**
 * Vidrio arquitectónico de la apertura. Mantiene sus reflejos separados de la
 * ciudad, del marco estructural y del Cristal Maestro interactivo.
 */
export function ObservationWindowGlass() {
  return (
    <div
      className={`observation-window-glass ${PLANE_WINDOW_GLASS}`}
      aria-hidden="true"
    >
      <div className="observation-window-glass__pane observation-window-glass__pane--left" />
      <div className="observation-window-glass__pane observation-window-glass__pane--center" />
      <div className="observation-window-glass__pane observation-window-glass__pane--right" />
      <div className="observation-window-glass__reflection" />
    </div>
  )
}
