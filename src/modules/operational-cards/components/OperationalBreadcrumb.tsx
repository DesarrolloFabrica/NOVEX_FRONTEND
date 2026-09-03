/**
 * Migas de la experiencia: Dirección de Operaciones › Coordinación.
 *
 * No navega por router ni toca la URL: solo limpia la selección en el estado
 * interno. La sincronización con query params pertenece al hardening.
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
    </nav>
  )
}
