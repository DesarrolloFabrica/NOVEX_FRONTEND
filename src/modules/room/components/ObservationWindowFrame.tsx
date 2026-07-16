import { PLANE_WINDOW_FRAME } from '@/modules/monitoring/constants/visualPlanes'

/**
 * Estructura arquitectónica que sitúa la ciudad tras un ventanal de observación.
 * Es puramente decorativa y permanece separada de RoomCityLayer.
 */
export function ObservationWindowFrame() {
  return (
    <div
      className={`observation-window-frame ${PLANE_WINDOW_FRAME}`}
      aria-hidden="true"
    >
      <div className="observation-window-frame__top" />
      <div className="observation-window-frame__left" />
      <div className="observation-window-frame__right" />
      <div className="observation-window-frame__bottom" />
    </div>
  )
}
