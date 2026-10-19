/**
 * Miga de la experiencia: [←] Coordinación.
 *
 * No navega por router ni toca la URL: solo limpia la selección en el estado
 * interno. La sincronización con query params pertenece al hardening.
 *
 * Es el ÚNICO retorno de la baraja. Antes convivía con un «Volver a la mesa»
 * bajo las cartas que llamaba al mismo `clearCoordination`; se retiró para no
 * ofrecer dos controles visibles para la misma transición y devolverle ese
 * alto a la mesa. La flecha conserva un área táctil de 32 px y su nombre
 * accesible dice adónde vuelve; la coordinación actual sigue escrita al lado
 * como ubicación (`aria-current`), no como etiqueta del botón.
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

export const BACK_TO_DIRECTION_LABEL = 'Volver a Dirección de Operaciones'

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
        className="operational-breadcrumb__root"
        data-testid="breadcrumb-direction"
        aria-label={BACK_TO_DIRECTION_LABEL}
        title={BACK_TO_DIRECTION_LABEL}
        onClick={onBackToDirection}
      >
        {/* Decorativa: el nombre accesible lo da `aria-label`. */}
        <svg
          className="operational-breadcrumb__icon"
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
