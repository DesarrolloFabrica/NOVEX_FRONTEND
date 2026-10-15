/**
 * Regreso de la experiencia: ← Coordinación observada.
 *
 * Es el ÚNICO control de vuelta a la mesa. Convivía con un botón «Volver a la
 * mesa» bajo las cartas que ejecutaba exactamente la misma transición; dos
 * caminos para lo mismo eran ruido, y el de abajo además robaba alto a la
 * baraja. Queda este, encima de la mesa.
 *
 * Solo la FLECHA es botón. El nombre de la coordinación es texto informativo:
 * dice dónde está el usuario, no es otro destino. Por eso el botón lleva su
 * propio nombre accesible —la flecha sola no dice nada a un lector de
 * pantalla— y el icono es decorativo.
 *
 * No navega por router ni toca la URL: solo limpia la selección en el estado
 * interno (`clearCoordination`, que la experiencia cablea a
 * `onBackToDirection`). Desde un mazo o una subcarta vuelve igualmente a la
 * mesa global: no hay niveles intermedios de navegación.
 */

/*
 * La lectura institucional dejó de vivir aquí: se mudó con el personaje a su
 * región del shell, que es donde está siempre visible. Mantenerla también en la
 * miga habría dejado dos regiones `aria-live` anunciando la misma frase a un
 * lector de pantalla cada vez que cambiara el estado de la Dirección.
 */
export interface OperationalBreadcrumbProps {
  coordinationName: string
  onBackToDirection: () => void
}

export function OperationalBreadcrumb({
  coordinationName,
  onBackToDirection,
}: OperationalBreadcrumbProps) {
  return (
    <nav
      className="operational-breadcrumb"
      data-testid="operational-breadcrumb"
      aria-label="Ubicación en la experiencia operacional"
    >
      <button
        type="button"
        className="operational-breadcrumb__back"
        data-testid="breadcrumb-direction"
        aria-label="Volver a Dirección de Operaciones"
        title="Volver a Dirección de Operaciones"
        onClick={onBackToDirection}
      >
        <svg
          className="operational-breadcrumb__back-icon"
          viewBox="0 0 16 16"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M9.5 3.5 5 8l4.5 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 8h6.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <span className="operational-breadcrumb__current" aria-current="page">
        {coordinationName}
      </span>
    </nav>
  )
}
