// Tema visual de la Plataforma de Proyección y acople con el Holograma.
// Infraestructura mecánica permanente — mate, sólida, distinta del cristal.

import {
  PLATFORM_EMITTER_MECHANICAL_ACTIVE,
  PLATFORM_EMITTER_MECHANICAL_IDLE,
  PLATFORM_MECHANICAL_BEVEL,
  PLATFORM_MECHANICAL_BODY,
} from '@/modules/monitoring/constants/materialTheme'

/** Contenedor unificado Plataforma + Holograma — capa visual, sin hitbox propio. */
export const PROJECTION_SYSTEM =
  'pointer-events-none relative z-40 mx-auto flex w-full max-w-lg flex-col items-center overflow-visible sm:max-w-xl lg:max-w-[34rem] lg:pb-1'

/** Superficie física del panel — ancho fijo, punto medio (Sprint 12.4C / 12.4D). */
export const PROJECTION_HOLOGRAM_PANEL =
  'relative mx-auto shrink-0 w-[11rem] max-w-[11rem] sm:w-[13rem] sm:max-w-[13rem] lg:w-[15rem] lg:max-w-[15rem]'

/** @deprecated Usar PROJECTION_HOLOGRAM_PANEL en el shell; hitbox hereda w-full. */
export const PROJECTION_HOLOGRAM_WIDTH = PROJECTION_HOLOGRAM_PANEL

/** Hitbox interactiva — ocupa el ancho del panel, sin max-width propio. */
export const PROJECTION_HOLOGRAM_HITBOX =
  'pointer-events-auto relative z-10 w-full'

/** Contenedor en espera — mismo ancho que el panel. */
export const PROJECTION_HOLOGRAM_HITBOX_IDLE =
  'pointer-events-none relative z-10 w-full'

/** Alojamiento de la plataforma: geometría sin caja ni tarjeta. */
export const PLATFORM_HOUSING_IDLE =
  'relative mx-auto w-[92%] max-w-md pt-1 sm:w-[88%] lg:w-[86%] lg:max-w-sm lg:pt-0'

export const PLATFORM_HOUSING_ACTIVE =
  'relative mx-auto w-[94%] max-w-md pt-1 sm:w-[90%] lg:w-[88%] lg:max-w-sm lg:pt-0'

/** Tallo de acople emisor → holograma (conducto mecánico + luz). */
export const PLATFORM_STEM_IDLE =
  'bg-gradient-to-t from-slate-500/50 via-slate-600/28 to-transparent shadow-[0_0_1px_0_rgba(129,140,248,0.12)]'

export const PLATFORM_STEM_ACTIVE =
  'bg-gradient-to-t from-indigo-400/62 via-indigo-300/38 to-transparent shadow-[0_0_2px_0_rgba(165,180,252,0.28)]'

/** Resplandor de acople bajo el holograma (luz, no metal). */
export const PLATFORM_COUPBEAM_IDLE =
  'bg-[radial-gradient(ellipse_72%_58%_at_50%_100%,rgba(129,140,248,0.08)_0%,transparent_58%)]'

export const PLATFORM_COUPBEAM_ACTIVE =
  'bg-[radial-gradient(ellipse_74%_60%_at_50%_100%,rgba(165,180,252,0.18)_0%,transparent_58%)]'

/** Halo inferior sobre el cristal — contacto mecánico con la lámina. */
export const PLATFORM_BASE_GLOW_IDLE =
  'bg-[radial-gradient(ellipse_52%_36%_at_50%_100%,rgba(30,41,59,0.1)_0%,transparent_64%)]'

export const PLATFORM_BASE_GLOW_ACTIVE =
  'bg-[radial-gradient(ellipse_56%_38%_at_50%_100%,rgba(99,102,241,0.09)_0%,transparent_66%)]'

/** Mesa de proyección — chasis mecánico en espera. */
export const PLATFORM_DECK_IDLE =
  `h-3 w-full ${PLATFORM_MECHANICAL_BODY} ring-1 ring-inset ring-slate-600/45 ${PLATFORM_MECHANICAL_BEVEL} shadow-[0_2px_8px_-2px_rgba(0,0,0,0.55)] transition-all duration-500 lg:h-2`

/** Mesa — chasis bajo carga de proyección. */
export const PLATFORM_DECK_ACTIVE =
  `h-3 w-full bg-gradient-to-b from-[#1e2438] via-[#141a28] to-[#0a0e14] ring-1 ring-inset ring-indigo-500/38 ${PLATFORM_MECHANICAL_BEVEL} shadow-[0_2px_12px_-2px_rgba(0,0,0,0.6),0_0_24px_-10px_rgba(99,102,241,0.2)] transition-all duration-500 lg:h-2`

/** Núcleo emisor — lente mecánica en reposo. */
export const PLATFORM_EMITTER_IDLE =
  `h-8 w-8 rounded-full ${PLATFORM_EMITTER_MECHANICAL_IDLE} ring-2 ring-inset ring-slate-500/55 shadow-[inset_0_1px_0_0_rgba(100,116,139,0.28),0_0_10px_-4px_rgba(0,0,0,0.5)] transition-all duration-500 sm:h-9 sm:w-9 lg:h-6 lg:w-6`

/** Núcleo emisor — lente acoplada a proyección. */
export const PLATFORM_EMITTER_ACTIVE =
  `h-8 w-8 rounded-full ${PLATFORM_EMITTER_MECHANICAL_ACTIVE} ring-2 ring-inset ring-indigo-400/52 shadow-[inset_0_1px_0_0_rgba(129,140,248,0.22),0_0_18px_-6px_rgba(99,102,241,0.32)] transition-all duration-500 sm:h-9 sm:w-9 lg:h-6 lg:w-6`

/** Anillo exterior del núcleo — estado base. */
export const PLATFORM_EMITTER_RING_IDLE =
  'absolute inset-0 rounded-full ring-1 ring-slate-500/25'

/** Anillo exterior del núcleo — activo. */
export const PLATFORM_EMITTER_RING_ACTIVE =
  'absolute inset-0 rounded-full ring-1 ring-indigo-400/35'

/** Riel lateral — canal mecanizado. */
export const PLATFORM_RAIL_IDLE =
  'h-px flex-1 bg-gradient-to-r from-transparent via-slate-500/42 to-slate-600/48 shadow-[0_1px_0_0_rgba(0,0,0,0.35)]'

/** Riel lateral — acople activo. */
export const PLATFORM_RAIL_ACTIVE =
  'h-px flex-1 bg-gradient-to-r from-transparent via-indigo-500/36 to-indigo-400/46 shadow-[0_1px_0_0_rgba(0,0,0,0.3)]'

/** Etiqueta técnica del sistema (visible en móvil; oculta en desktop para ahorrar altura). */
export const PLATFORM_LABEL_IDLE = 'text-slate-500 max-lg:inline lg:sr-only'
export const PLATFORM_LABEL_ACTIVE = 'text-indigo-400/75 max-lg:inline lg:sr-only'

/** Bisel de anclaje al cristal. */
export const PLATFORM_ANCHOR_RAIL =
  'h-px w-[90%] bg-gradient-to-r from-transparent via-slate-600/30 to-transparent'

/** Postes de soporte. */
export const PLATFORM_SUPPORT_POST =
  'w-px bg-gradient-to-b from-slate-600/35 to-slate-800/20 lg:from-slate-600/28'
