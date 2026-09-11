/**
 * Acción de retorno de la composición: «Volver a la mesa».
 *
 * Pertenece a la MESA, no al panel. Lo que deshace es dónde está el usuario
 * —deja de observar una coordinación y vuelve a ver la Dirección entera—, y eso
 * no es una acción sobre el problema que el panel muestra. Por eso vive en la
 * composición de las cartas y no dentro de `CoordinationProblemPanel`, y por eso
 * tampoco es un control del encabezado global: no navega la aplicación, recoge
 * la mesa.
 *
 * NO tiene lógica propia de retorno. Llama al mismo `clearCoordination` que ya
 * limpia la selección, de modo que no existen dos caminos de vuelta capaces de
 * dejar estados distintos. La miga sigue ofreciendo el suyo mientras se decida
 * su destino; ambos ejecutan exactamente la misma transición.
 *
 * Icono + texto, deliberadamente sobrio: el refinamiento visual de esta acción
 * está abierto y no conviene invertirlo antes de que la composición esté fija.
 */

export interface TableReturnActionProps {
  /** Texto visible. El día que un mazo tenga su «Recoger mazo», pasa por aquí. */
  label: string
  onReturn: () => void
}

export function TableReturnAction({ label, onReturn }: TableReturnActionProps) {
  return (
    <div className="operational-deck__return">
      <button
        type="button"
        className="operational-deck__return-button"
        data-testid="return-to-table"
        onClick={onReturn}
      >
        {/* Decorativo: el nombre accesible lo da el texto de al lado. Una flecha
            que además se anunciara duplicaría la etiqueta del botón. */}
        <svg
          className="operational-deck__return-icon"
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
        {label}
      </button>
    </div>
  )
}
