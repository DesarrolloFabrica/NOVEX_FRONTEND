import { useId } from 'react'
import {
  getTicketTheme,
  type TicketPanelVariant,
  type TicketThemeId,
} from '@/modules/operational-cards/experience/ticketThemes'

/**
 * Marco ticket compartido (fases 3–4).
 *
 * Capas presentacionales (atrás → delante), sin eventos ni AT:
 *   1. papel crema opaco (base + grano perimetral + velo central)
 *   2. banda + filete SVG (grosor estable; tinta vía tokens CSS del tema)
 *   3. remates de esquina en SVG de tamaño fijo (no se estiran con el panel)
 *   4. marca de agua del tema, esquina inferior, tenue
 *   5. 1–2 adornos del tema anclados al marco
 *
 * La identidad (tinta, watermark, adornos) sale de `ticketThemes`; el acabado
 * de papel/marco es compartido. Activación: `data-ticket-theme` en el shell.
 */

export type { TicketPanelVariant }

export interface TicketPanelFrameProps {
  themeId: TicketThemeId
  variant: TicketPanelVariant
}

export function TicketPanelFrame({ themeId, variant }: TicketPanelFrameProps) {
  /*
   * Prefijo estable por instancia: ids SVG no colisionan entre los cuatro
   * paneles montados a la vez ni al cambiar de tema.
   */
  const uid = useId().replace(/:/g, '')
  const theme = getTicketTheme(themeId)
  const ornaments = theme.ornaments[variant]

  return (
    <div
      className={`ticket-panel ticket-panel--${variant}`}
      data-testid={`ticket-panel-${variant}`}
      data-ticket-panel={variant}
      data-ticket-theme-frame={themeId}
      aria-hidden="true"
    >
      {/*
        Papel en tres subcapas (fase 3.1, compartidas):
        - base: crema opaca (el escenario no se transparenta)
        - grain: textura con máscara radial — más fuerte en el perímetro
        - veil: velo crema en el centro para legibilidad de textos/campos
        Marcos y adornos quedan por encima y no se atenúan.
      */}
      <div className="ticket-panel__paper">
        <div className="ticket-panel__paper-base" />
        <div className="ticket-panel__paper-grain" />
        <div className="ticket-panel__paper-veil" />
      </div>

      {/*
        Marco adaptable: viewBox porcentual + non-scaling-stroke.
        stroke = currentColor → hereda --ticket-accent-deep del tema.
        Los remates NO van aquí: preserveAspectRatio=none los deformaría.
      */}
      <svg
        className="ticket-panel__frame"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <path id={`ticket-panel-frame-${uid}`} d="M0 0h100v100H0z" />
        </defs>
        <rect
          className="ticket-panel__frame-band"
          x="1.15"
          y="1.15"
          width="97.7"
          height="97.7"
          rx="2.8"
          ry="2.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <rect
          className="ticket-panel__frame-fillet"
          x="2.85"
          y="2.85"
          width="94.3"
          height="94.3"
          rx="2.1"
          ry="2.1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinejoin="round"
        />
      </svg>

      {/*
        Remates: SVG independientes de ~18×18 px anclados a cada esquina.
        Conservan proporción en paneles altos (action) y estrechos (character).
      */}
      <div className="ticket-panel__corners">
        <CornerRemate className="ticket-panel__corner--tl" />
        <CornerRemate className="ticket-panel__corner--tr" flipX />
        <CornerRemate className="ticket-panel__corner--bl" flipY />
        <CornerRemate className="ticket-panel__corner--br" flipX flipY />
      </div>

      <div className="ticket-panel__watermark" />

      <div className="ticket-panel__ornaments">
        {ornaments.map((item) => (
          <img
            key={`${item.corner}-${item.src}`}
            className={`ticket-panel__ornament ticket-panel__ornament--${item.corner}`}
            src={item.src}
            alt=""
            draggable={false}
          />
        ))}
      </div>
    </div>
  )
}

function CornerRemate({
  className,
  flipX = false,
  flipY = false,
}: {
  className: string
  flipX?: boolean
  flipY?: boolean
}) {
  const sx = flipX ? -1 : 1
  const sy = flipY ? -1 : 1
  return (
    <svg
      className={`ticket-panel__corner ${className}`}
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden="true"
      focusable="false"
      style={{ transform: `scale(${sx}, ${sy})` }}
    >
      <path
        d="M 4 11 C 4 6.5 6.2 4 11 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M 7 9.5 C 7 7.2 8.2 6 10.5 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  )
}
