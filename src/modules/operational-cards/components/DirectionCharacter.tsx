import type { CharacterPresentation } from '@/modules/operational-cards/types/character.types'
import { OPERATIONAL_STATUS_LABEL } from '@/modules/operational-cards/data/operationalStatusLabel'

/**
 * Personaje de la Dirección de Operaciones: un reactor guardián, no una
 * mascota ni un asistente conversacional.
 *
 * Recibe únicamente `CharacterPresentation` (status / orientation /
 * interaction). No conoce el DTO del overview, ni coordinaciones, ni
 * problemas: la traducción de datos a presentación ocurre fuera.
 *
 * El render es SVG inline + CSS, sin dependencias nuevas. Toda la reacción
 * visual cuelga de los atributos `data-status`, `data-orientation` y
 * `data-interaction` del contenedor, así que sustituir este SVG por un sprite,
 * un SVG final, Rive o Lottie no obliga a cambiar el contrato ni el lugar
 * donde se decide el estado.
 *
 * Los estados no se distinguen solo por color: cambian la postura del núcleo,
 * la forma de los sensores, el anillo técnico y la posición de los soportes.
 */

export interface DirectionCharacterProps {
  presentation: CharacterPresentation
}

export function DirectionCharacter({ presentation }: DirectionCharacterProps) {
  const { status, orientation, interaction } = presentation
  const statusLabel = OPERATIONAL_STATUS_LABEL[status]

  return (
    <div
      className="direction-character"
      data-testid="direction-character"
      data-status={status}
      data-orientation={orientation}
      data-interaction={interaction}
      role="img"
      aria-label={`Dirección de Operaciones. Estado: ${statusLabel}.`}
    >
      <svg
        className="direction-character__figure"
        viewBox="0 0 200 190"
        preserveAspectRatio="xMidYMax meet"
        aria-hidden="true"
        focusable="false"
      >
        {/* Halo de energía: el único elemento puramente cromático. */}
        <ellipse className="dc-glow" cx="100" cy="104" rx="74" ry="70" />

        {/* Anillo técnico exterior: gira lento y cambia de trazo por estado. */}
        <g className="dc-ring">
          <circle className="dc-ring__track" cx="100" cy="104" r="66" />
          <circle className="dc-ring__arc" cx="100" cy="104" r="66" />
        </g>

        {/* Soportes laterales: su ángulo y separación cambian con el estado. */}
        <g className="dc-braces">
          <path className="dc-brace dc-brace--left" d="M44 118 L30 104 L44 90" />
          <path
            className="dc-brace dc-brace--right"
            d="M156 118 L170 104 L156 90"
          />
        </g>

        {/* Núcleo: se inclina hacia la baraja según la tensión del estado. */}
        <g className="dc-core">
          <path
            className="dc-core__shell"
            d="M100 46 L146 70 L146 122 L100 148 L54 122 L54 70 Z"
          />
          <path className="dc-core__visor" d="M66 84 L134 84 L134 116 L66 116 Z" />

          {/* Sensores: relleno suave, ranura atenta o anillo hueco. */}
          <g className="dc-eyes">
            <ellipse className="dc-eye dc-eye--soft" cx="84" cy="100" rx="9" ry="8" />
            <ellipse
              className="dc-eye dc-eye--soft"
              cx="116"
              cy="100"
              rx="9"
              ry="8"
            />
            <rect className="dc-eye dc-eye--slit" x="74" y="96" width="20" height="7" rx="3.5" />
            <rect
              className="dc-eye dc-eye--slit"
              x="106"
              y="96"
              width="20"
              height="7"
              rx="3.5"
            />
            <circle className="dc-eye dc-eye--hollow" cx="84" cy="100" r="8" />
            <circle className="dc-eye dc-eye--hollow" cx="116" cy="100" r="8" />
          </g>

          {/* Marca de núcleo: late solo en crítico. */}
          <circle className="dc-core__mark" cx="100" cy="134" r="5" />
        </g>

        {/* Base: pedestal mínimo que ancla la figura sobre la baraja. */}
        <g className="dc-base">
          <path className="dc-base__plate" d="M62 168 L138 168 L124 178 L76 178 Z" />
          <path className="dc-base__stem" d="M94 148 L106 148 L106 168 L94 168 Z" />
        </g>
      </svg>

      {/* Apoyo textual accesible: discreto, no una pastilla como las cartas. */}
      <p className="direction-character__readout">
        <span className="direction-character__eyebrow">
          Dirección de Operaciones
        </span>
        <span
          className="direction-character__status"
          data-testid="direction-character-status"
        >
          {statusLabel}
        </span>
      </p>
    </div>
  )
}
