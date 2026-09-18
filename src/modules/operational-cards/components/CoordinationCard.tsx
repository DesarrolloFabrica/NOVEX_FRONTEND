import { useState, type CSSProperties } from 'react'
import { hexToRgbChannels } from '@/modules/impact-network/data/coordination-islands.config'
import { resolveCoordinationCardFace } from '@/modules/operational-cards/data/coordinationCardFace'
import { OPERATIONAL_STATUS_LABEL } from '@/modules/operational-cards/data/operationalStatusLabel'
import type { CoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'

/**
 * Carta de coordinación en la baraja.
 *
 * Dos lenguajes visuales que no se cruzan:
 * - la IDENTIDAD de la coordinación (la cara ilustrada y el color) vive en la
 *   carta;
 * - la INTEGRIDAD operacional vive en el aura, en el texto de estado y en
 *   `data-status`.
 *
 * La carta tiene dos presentaciones y elige sola:
 * - ILUSTRADA, cuando la coordinación tiene cara propia en `/CoordCards`. El
 *   arte ya rotula el nombre, así que el nombre funcional se oculta a la vista
 *   pero permanece en el DOM.
 * - LEGACY, con isla, icono y nombre visible, cuando no hay arte para ese code
 *   o cuando el suyo no carga. Nunca se toma prestada la cara de otra
 *   coordinación: mostrar una identidad ajena se lee como un error de datos.
 *
 * En ambas, el estado y el aura no cambian: el arte es presentación y jamás
 * sustituye a la integridad operacional.
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
  /**
   * Nombre de PRODUCTO, cuando difiere del nombre técnico de la fila.
   *
   * Existe por el caso Servicio: el nodo de producto se llama «Servicio» y se
   * apoya en `coord-homologaciones`. El `aria-label` y el texto del DOM usan
   * esta etiqueta; la cara ilustrada (`servicio.png` vía `artCode`) ya rotula
   * «SERVICIO», así que el nombre funcional se oculta a la vista como en el
   * resto de cartas ilustradas.
   */
  productLabel?: string
  /**
   * Code con el que se resuelve la CARA ilustrada, si difiere del propio.
   *
   * Por defecto es `identity.code`. El nodo de producto «Servicio» lo usa para
   * pintar `servicio.png` (`coord-servicios`) en lugar de `Homologaciones.png`.
   * El `code` técnico no cambia: sigue siendo el de la selección, el
   * `data-code` y el estado.
   */
  artCode?: string
  /** Subordinaciones declaradas. Solo alimenta el nombre accesible. */
  subordinationCount?: number
  selected?: boolean
  onSelect?: (code: string) => void
  onHoverChange?: (code: string | null) => void
}

export function CoordinationCard({
  identity,
  status,
  productLabel,
  artCode,
  subordinationCount = 0,
  selected = false,
  onSelect,
  onHoverChange,
}: CoordinationCardProps) {
  const statusLabel = OPERATIONAL_STATUS_LABEL[status]
  const face = resolveCoordinationCardFace(artCode ?? identity.code)

  // Si el arte no carga, la carta vuelve a la presentación legacy de SU
  // coordinación. Se prefiere una carta funcional a un hueco negro.
  const [faceFailed, setFaceFailed] = useState(false)
  const illustrated = face !== null && !faceFailed

  // El nombre de producto manda cuando existe.
  const displayName = productLabel ?? identity.shortName

  // La estructura se comunica por TEXTO, no solo por la geometría del mazo:
  // quien usa lector de pantalla no ve los peeks.
  const subordinations =
    subordinationCount > 0
      ? ` ${subordinationCount} ${subordinationCount === 1 ? 'subordinación' : 'subordinaciones'}.`
      : ''

  return (
    <button
      type="button"
      className="coordination-card"
      data-testid="coordination-card"
      data-code={identity.code}
      data-status={status}
      data-selected={selected ? 'true' : 'false'}
      aria-pressed={selected}
      data-subordinations={subordinationCount}
      style={{ '--coord-rgb': hexToRgbChannels(identity.color) } as CSSProperties}
      aria-label={`${productLabel ?? identity.name}. Estado operacional: ${statusLabel}.${subordinations}`}
      onClick={onSelect ? () => onSelect(identity.code) : undefined}
      // El hover y el foco producen la misma reacción: nada de información
      // reservada al ratón.
      onPointerEnter={onHoverChange ? () => onHoverChange(identity.code) : undefined}
      onPointerLeave={onHoverChange ? () => onHoverChange(null) : undefined}
      onFocus={onHoverChange ? () => onHoverChange(identity.code) : undefined}
      onBlur={onHoverChange ? () => onHoverChange(null) : undefined}
    >
      <span className="coordination-card__aura" aria-hidden="true" />

      {/* Cara ilustrada. Va en su propia capa con `overflow: hidden` en vez de
          recortar el botón, porque el aura vive fuera de la carta y un
          `overflow` en el botón se la comería. El recorte cae por abajo, donde
          el arte solo lleva el pie de marca, y el scrim lo disimula. */}
      {illustrated && (
        <span className="coordination-card__face" aria-hidden="true">
          <img src={face} alt="" onError={() => setFaceFailed(true)} />
          <span className="coordination-card__scrim" />
        </span>
      )}

      {/* Presentación legacy: solo cuando esta coordinación no tiene arte
          propio, o cuando el suyo no cargó. Nunca se sustituye por el de otra. */}
      {!illustrated && (
        <>
          <span className="coordination-card__island">
            <img src={identity.islandAsset} alt="" aria-hidden="true" />
          </span>

          <img
            className="coordination-card__icon"
            src={identity.iconAsset}
            alt=""
            aria-hidden="true"
          />
        </>
      )}

      {/* El arte ya lleva el nombre rotulado, así que repetirlo debajo duplica.
          Se oculta a la vista, no al DOM: sigue siendo el nombre funcional y el
          que queda si el arte no carga. Sin arte, se muestra. */}
      <span
        className={
          illustrated
            ? 'coordination-card__name coordination-card__name--hidden'
            : 'coordination-card__name'
        }
        title={productLabel ?? identity.name}
      >
        {displayName}
      </span>

      {/* El estado nunca se comunica solo con color: siempre hay texto. */}
      <span className="coordination-card__status" data-testid="coordination-card-status">
        <span className="coordination-card__status-dot" aria-hidden="true" />
        {statusLabel}
      </span>
    </button>
  )
}
