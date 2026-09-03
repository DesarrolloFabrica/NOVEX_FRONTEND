import type { CSSProperties } from 'react'
import { hexToRgbChannels } from '@/modules/impact-network/data/coordination-islands.config'
import { OPERATIONAL_STATUS_LABEL } from '@/modules/operational-cards/data/operationalStatusLabel'
import type { CoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'

/**
 * Carta de coordinación en la baraja.
 *
 * Dos lenguajes visuales que no se cruzan:
 * - la IDENTIDAD de la coordinación (isla, icono y color) vive en la carta;
 * - la INTEGRIDAD operacional vive en el aura, en el texto de estado y en
 *   `data-status`.
 *
 * Una coordinación azul en estado crítico sigue siendo azul: el rojo se queda
 * en el aura y en la etiqueta.
 *
 * `aria-pressed` refleja la selección, de modo que un lector de pantalla
 * distingue la coordinación bajo observación sin depender del tamaño ni de la
 * posición.
 */

export interface CoordinationCardProps {
  identity: CoordinationVisualIdentity
  status: OperationalIntegrityStatus
  selected?: boolean
  onSelect?: (code: string) => void
  onHoverChange?: (code: string | null) => void
}

export function CoordinationCard({
  identity,
  status,
  selected = false,
  onSelect,
  onHoverChange,
}: CoordinationCardProps) {
  const statusLabel = OPERATIONAL_STATUS_LABEL[status]

  return (
    <button
      type="button"
      className="coordination-card"
      data-testid="coordination-card"
      data-code={identity.code}
      data-status={status}
      data-selected={selected ? 'true' : 'false'}
      aria-pressed={selected}
      style={{ '--coord-rgb': hexToRgbChannels(identity.color) } as CSSProperties}
      aria-label={`${identity.name}. Estado operacional: ${statusLabel}.`}
      onClick={onSelect ? () => onSelect(identity.code) : undefined}
      // El hover y el foco producen la misma reacción: nada de información
      // reservada al ratón.
      onPointerEnter={onHoverChange ? () => onHoverChange(identity.code) : undefined}
      onPointerLeave={onHoverChange ? () => onHoverChange(null) : undefined}
      onFocus={onHoverChange ? () => onHoverChange(identity.code) : undefined}
      onBlur={onHoverChange ? () => onHoverChange(null) : undefined}
    >
      <span className="coordination-card__aura" aria-hidden="true" />

      <span className="coordination-card__island">
        <img src={identity.islandAsset} alt="" aria-hidden="true" />
      </span>

      <img
        className="coordination-card__icon"
        src={identity.iconAsset}
        alt=""
        aria-hidden="true"
      />

      <span className="coordination-card__name" title={identity.name}>
        {identity.shortName}
      </span>

      {/* El estado nunca se comunica solo con color: siempre hay texto. */}
      <span className="coordination-card__status" data-testid="coordination-card-status">
        <span className="coordination-card__status-dot" aria-hidden="true" />
        {statusLabel}
      </span>
    </button>
  )
}
