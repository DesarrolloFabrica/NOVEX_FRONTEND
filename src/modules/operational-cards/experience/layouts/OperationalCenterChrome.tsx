import type { ReactNode } from 'react'
import {
  TicketPanelFrame,
  type TicketPanelVariant,
} from '@/modules/operational-cards/experience/TicketPanelFrame'
import { OperationalCenterMenu } from '@/modules/operational-cards/experience/layouts/OperationalCenterMenu'
import type { TicketThemeId } from '@/modules/operational-cards/experience/ticketThemes'

/**
 * Piezas visuales compartidas del Centro Operacional.
 * No conocen el rol: el shell decide qué regiones montar.
 */
export function ShellRegion({
  region,
  title,
  hint,
  className = '',
  showTitle = true,
  ticketTheme,
  ticketPanel,
  tourId,
  children,
}: {
  region: string
  title: string
  hint?: string
  className?: string
  showTitle?: boolean
  ticketTheme?: TicketThemeId
  ticketPanel?: TicketPanelVariant
  /** Ancla `data-tour` estable para el recorrido guiado. Pasiva: no altera nada. */
  tourId?: string
  children?: ReactNode
}) {
  return (
    <section
      className={`operational-shell__region ${className}`.trim()}
      data-testid={`shell-region-${region}`}
      data-region={region}
      data-tour={tourId}
      aria-label={title}
    >
      {ticketTheme && ticketPanel ? (
        <TicketPanelFrame themeId={ticketTheme} variant={ticketPanel} />
      ) : null}
      {showTitle && <h2 className="operational-shell__region-title">{title}</h2>}
      {showTitle && hint && (
        <p className="operational-shell__region-hint">{hint}</p>
      )}
      {children}
    </section>
  )
}

export function CircusScene() {
  return (
    <div
      className="operational-shell__scene"
      data-testid="shell-circus-scene"
      aria-hidden="true"
    >
      <img
        className="operational-shell__scene-image"
        src="/assets/scenes/circus-stage-background.png"
        alt=""
        decoding="async"
        draggable={false}
      />
    </div>
  )
}

export function ShellBottom() {
  return <OperationalCenterMenu />
}
