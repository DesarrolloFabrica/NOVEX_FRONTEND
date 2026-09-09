/**
 * Migas de la experiencia: Dirección de Operaciones › Coordinación.
 *
 * No navega por router ni toca la URL: solo limpia la selección en el estado
 * interno. La sincronización con query params pertenece al hardening.
 *
 * Con una coordinación seleccionada, la miga también acoge la lectura
 * institucional. Esa fila tiene espacio horizontal de sobra, mientras que el
 * alto es el recurso escaso en LEVEL 1: sacarla del stage libera el espacio
 * que necesita el carrusel sin perder el dato ni tocar la baraja en reposo.
 */

export interface OperationalBreadcrumbProps {
  coordinationName: string
  /** Lectura institucional. Ausente mientras LEVEL 0 no esté resuelto. */
  summary?: string
  onBackToDirection: () => void
}

export function OperationalBreadcrumb({
  coordinationName,
  summary,
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
        onClick={onBackToDirection}
      >
        Dirección de Operaciones
      </button>
      <span className="operational-breadcrumb__separator" aria-hidden="true">
        ›
      </span>
      <span className="operational-breadcrumb__current" aria-current="page">
        {coordinationName}
      </span>

      {summary && (
        <p
          className="operational-breadcrumb__summary"
          data-testid="direction-summary"
          aria-live="polite"
        >
          {summary}
        </p>
      )}
    </nav>
  )
}
