import cityBlue from '@/assets/scenes/city/city_blue.webp'
import cityGreen from '@/assets/scenes/city/city_green.webp'
import cityRed from '@/assets/scenes/city/city_red.webp'
import cityYellow from '@/assets/scenes/city/city_yellow.webp'
import { PLANE_CITY } from '@/modules/monitoring/constants/visualPlanes'
import type { EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'

interface RoomCityLayerProps {
  environment: EnvironmentStatus
}

const CITY_ASSET_BY_ENVIRONMENT = {
  pending: cityBlue,
  healthy: cityGreen,
  attention: cityYellow,
  critical: cityRed,
} satisfies Record<EnvironmentStatus, string>

const CITY_ENVIRONMENTS = [
  'pending',
  'healthy',
  'attention',
  'critical',
] as const satisfies readonly EnvironmentStatus[]

/**
 * Capa decorativa de ciudad. Las cuatro variantes permanecen montadas para
 * evitar descargas tardías y permitir un crossfade sin parpadeos.
 *
 * El encuadre, escala y transición viven en `.room-city-image` para poder
 * ajustar la composición de los assets sin mezclarla con el estado operativo.
 */
export function RoomCityLayer({ environment }: RoomCityLayerProps) {
  return (
    <div className={PLANE_CITY} aria-hidden="true">
      {CITY_ENVIRONMENTS.map((variant) => (
        <img
          key={variant}
          src={CITY_ASSET_BY_ENVIRONMENT[variant]}
          alt=""
          draggable={false}
          className="room-city-image"
          data-active={variant === environment}
        />
      ))}
    </div>
  )
}
