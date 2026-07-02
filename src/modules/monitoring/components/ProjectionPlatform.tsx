// Componente: Plataforma de Proyección del Centro de Monitoreo.
// Origen físico permanente del Holograma — visible siempre, intensidad según estado.
// Solo presentación.

import type { ReactNode } from 'react'
import { AMBIENT_ACCENT_TRANSITION } from '@/modules/monitoring/constants/ambientLighting'
import {
  PLATFORM_BREATH_ACTIVE,
  PLATFORM_BREATH_IDLE,
} from '@/modules/monitoring/constants/operationalBreathing'
import {
  PLATFORM_ANCHOR_RAIL,
  PLATFORM_BASE_GLOW_ACTIVE,
  PLATFORM_BASE_GLOW_IDLE,
  PLATFORM_COUPBEAM_ACTIVE,
  PLATFORM_COUPBEAM_IDLE,
  PLATFORM_DECK_ACTIVE,
  PLATFORM_DECK_IDLE,
  PLATFORM_EMITTER_ACTIVE,
  PLATFORM_EMITTER_IDLE,
  PLATFORM_EMITTER_RING_ACTIVE,
  PLATFORM_EMITTER_RING_IDLE,
  PLATFORM_HOUSING_ACTIVE,
  PLATFORM_HOUSING_IDLE,
  PLATFORM_LABEL_ACTIVE,
  PLATFORM_LABEL_IDLE,
  PLATFORM_RAIL_ACTIVE,
  PLATFORM_RAIL_IDLE,
  PLATFORM_STEM_ACTIVE,
  PLATFORM_STEM_IDLE,
  PLATFORM_SUPPORT_POST,
  PROJECTION_SYSTEM,
} from '@/modules/monitoring/constants/projectionTheme'
import { PROJECTION_HOLOGRAM_GAP } from '@/modules/monitoring/constants/monitoringTheme'
import {
  PLATFORM_PLANE_IDLE,
  PLATFORM_PLANE_LIFT,
  PLANE_HOLOGRAM,
  PLANE_PLATFORM,
} from '@/modules/monitoring/constants/visualPlanes'

interface ProjectionPlatformProps {
  /** true cuando un expediente está siendo proyectado en el Holograma. */
  isActive: boolean
  /** Riel de la plataforma en reposo (ambientación de la Sala). */
  platformRailIdle?: string
  /** Mesa de la plataforma en reposo (ambientación de la Sala). */
  platformDeckIdle?: string
  children: ReactNode
}

export function ProjectionPlatform({
  isActive,
  platformRailIdle,
  platformDeckIdle,
  children,
}: ProjectionPlatformProps) {
  const housingClass = isActive ? PLATFORM_HOUSING_ACTIVE : PLATFORM_HOUSING_IDLE
  const stemClass = isActive ? PLATFORM_STEM_ACTIVE : PLATFORM_STEM_IDLE
  const couplinkClass = isActive ? PLATFORM_COUPBEAM_ACTIVE : PLATFORM_COUPBEAM_IDLE
  const baseGlowClass = isActive ? PLATFORM_BASE_GLOW_ACTIVE : PLATFORM_BASE_GLOW_IDLE
  const deckClass = isActive
    ? PLATFORM_DECK_ACTIVE
    : [PLATFORM_DECK_IDLE, platformDeckIdle].filter(Boolean).join(' ')

  const railStructure =
    'h-px flex-1 max-w-[5rem] transition-colors duration-500 sm:max-w-[6.5rem]'
  const railClass = isActive
    ? PLATFORM_RAIL_ACTIVE
    : platformRailIdle
      ? platformRailIdle.startsWith('via-')
        ? `${railStructure} bg-gradient-to-r from-transparent ${platformRailIdle} to-transparent ${AMBIENT_ACCENT_TRANSITION}`
        : `${railStructure} ${platformRailIdle} ${AMBIENT_ACCENT_TRANSITION}`
      : PLATFORM_RAIL_IDLE

  const emitterClass = isActive ? PLATFORM_EMITTER_ACTIVE : PLATFORM_EMITTER_IDLE
  const emitterRingClass = isActive
    ? PLATFORM_EMITTER_RING_ACTIVE
    : PLATFORM_EMITTER_RING_IDLE
  const labelClass = isActive ? PLATFORM_LABEL_ACTIVE : PLATFORM_LABEL_IDLE
  const platformBreath = isActive ? PLATFORM_BREATH_ACTIVE : PLATFORM_BREATH_IDLE

  return (
    <div
      className={`${PLANE_PLATFORM} ${PROJECTION_SYSTEM} ${isActive ? PLATFORM_PLANE_LIFT : PLATFORM_PLANE_IDLE}`}
    >
      {/* Holograma: capa visual — la hitbox vive dentro de CommitmentHologram. */}
      <div
        className={`${PLANE_HOLOGRAM} pointer-events-none relative z-20 w-full overflow-visible transition-all duration-500 ${PROJECTION_HOLOGRAM_GAP}`}
      >
        {children}
      </div>

      {/* Plataforma física: decorativa, sin interacción. */}
      <div className={`${housingClass} pointer-events-none z-10 overflow-visible`} aria-hidden="true">
        {/* Tallo de acople: une emisor y holograma. */}
        <div
          className={`pointer-events-none absolute left-1/2 top-0 h-7 w-px -translate-x-1/2 -translate-y-full sm:h-8 lg:h-5 ${stemClass}`}
        />
        {/* Resplandor de acople bajo el holograma. */}
        <div
          className={`pointer-events-none absolute left-1/2 top-0 h-8 w-20 -translate-x-1/2 -translate-y-[calc(100%+0.25rem)] sm:h-10 sm:w-24 lg:h-6 lg:w-16 lg:-translate-y-full ${couplinkClass} ${platformBreath}`}
        />

        {/* Núcleo emisor + rieles laterales. */}
        <div className="relative flex items-center justify-center gap-3 sm:gap-5 lg:gap-3">
          <span className={railClass} />
          <div className="relative -mb-3.5 flex flex-col items-center sm:-mb-4 lg:-mb-2.5">
            <div className="relative">
              <div className={emitterClass} />
              <span className={`${emitterRingClass} ${platformBreath}`} aria-hidden="true" />
            </div>
            <span
              className={`mt-2 font-mono text-[8px] uppercase tracking-[0.22em] transition-colors duration-500 sm:text-[9px] lg:mt-0 ${labelClass}`}
            >
              Proyector O.M.E.G.A.
            </span>
          </div>
          <span className={railClass} />
        </div>

        {/* Mesa de proyección. */}
        <div className={deckClass} />

        {/* Halo de anclaje en el suelo del escenario. */}
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 h-6 ${baseGlowClass} lg:h-4 ${platformBreath}`}
        />

        {/* Bisel de anclaje. */}
        <div className={`mx-auto mt-1.5 lg:mt-1 ${PLATFORM_ANCHOR_RAIL}`} />

        {/* Postes de soporte. */}
        <div className="mx-auto flex w-[76%] justify-between pt-1.5 sm:w-[70%] lg:w-[68%] lg:pt-1">
          <span className={`h-3.5 lg:h-2 ${PLATFORM_SUPPORT_POST}`} />
          <span className={`h-3.5 lg:h-2 ${PLATFORM_SUPPORT_POST}`} />
        </div>
      </div>

      <span className="sr-only">
        Plataforma de proyección del Centro de Monitoreo
        {isActive ? ', expediente en proyección' : ', en espera'}
      </span>
    </div>
  )
}
