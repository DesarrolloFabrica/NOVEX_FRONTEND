import { PLANE_COMMAND_FLOOR } from '@/modules/monitoring/constants/visualPlanes'

export function CommandCenterFloor() {
  return (
    <div
      className={`command-center-floor ${PLANE_COMMAND_FLOOR}`}
      aria-hidden="true"
    >
      <div className="command-center-floor__surface" />
    </div>
  )
}
