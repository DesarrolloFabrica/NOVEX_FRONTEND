// Capa: componente compartido (carga de ruta y de sesión).
// Responsabilidad: ocupar la pantalla mientras llega el chunk de un destino o
// se valida la sesión.
//
// Pinta el mismo escenario del circo que el Centro muestra al terminar, con el
// mismo encuadre: la secuencia de arranque no cambia de fondo ni de color (antes
// era un azul marino que dejaba ver, después, la ciudad del tema anterior). En
// el login solo el tono base: su escenario entra con su propio encendido.
// El indicador aparece con retraso (CSS): si la espera es corta no se ve.

import { useLocation } from 'react-router-dom'

interface RouteFallbackProps {
  label?: string
}

export function RouteFallback({ label = 'Cargando…' }: RouteFallbackProps) {
  const { pathname } = useLocation()
  const plain = pathname.startsWith('/login')

  return (
    <div
      className={plain ? 'route-fallback route-fallback--plain' : 'route-fallback'}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="route-fallback__dot" aria-hidden="true" />
      <span className="route-fallback__label">{label}</span>
    </div>
  )
}
