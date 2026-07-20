// Sistema de estados operativos visuales de la Sala O.M.E.G.A. (solo presentación).
// Sprint 4.4.1: temperatura de luz perceptible — iluminar, no pintar.
// La Sala comunica el estado del área; el videowall presenta el expediente.
import type { EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'

/** Intención ambiental de la Sala (no confundir con EnvironmentStatus del motor). */
export type OperationalRoomState =
  | 'neutral'
  | 'healthy'
  | 'attention'
  | 'risk'
  | 'critical'

/** Tokens de iluminación ambiental por estado operativo de la Sala. */
export interface OperationalRoomVisual {
  /** Luz ambiental del fondo (gradiente direccional, reacción mínima). */
  backgroundOverlay: string
  /** Profundidad atmosférica del plano 0 (reacción mínima). */
  roomDepthAccent: string
  /** Reflejo en el bisel metálico del marco. */
  frameRing: string
  /** Luz de borde y sombra proyectada del marco. */
  frameGlow: string
  /** Brillo direccional sobre el chasis del marco. */
  frameSurfaceTint: string
  /** Iluminación principal del cristal (gradiente radial). */
  crystalTint: string
  /** Brillo de bisel superior del laminado. */
  crystalSheen: string
  /** Riel de luz en surco superior del cristal. */
  mainRail: string
  /** Luz de deck en cabecera del cristal. */
  deckGradient: string
  /** Indicador luminoso de estación lateral. */
  sidePanelAccent: string
  /** Pool de luz en esquina de estación lateral. */
  sidePanelVeil: string
  /** Indicador luminoso de consola central. */
  consoleAccent: string
  /** Pool de luz en consola central. */
  consoleVeil: string
  /** Intensidad tipográfica base (sin variación emocional). */
  textIntensity: string
  /** Borde perimetral del cristal — tema claro (Sprint 10.5C). */
  crystalStatePerimeter: string
  /** Lavado inferior translúcido — contaminación de luz ambiental. */
  crystalStateLowerWash: string
  /** Glow exterior suave — luz reflejada, no neón. */
  crystalStateEdgeGlow: string
  /** Acento en líneas estructurales (rieles, esquinas, reglas). */
  crystalStateStructuralAccent: string
}

export function mapEnvironmentToOperationalState(
  environment: EnvironmentStatus,
): OperationalRoomState {
  switch (environment) {
    case 'pending':
      return 'neutral'
    case 'healthy':
      return 'healthy'
    case 'attention':
      return 'attention'
    case 'critical':
      return 'critical'
  }
}

export function getOperationalRoomVisual(
  environment: EnvironmentStatus,
): OperationalRoomVisual {
  return OPERATIONAL_ROOM_VISUAL[mapEnvironmentToOperationalState(environment)]
}

/** Fondo de sala: reacción mínima — techo frío casi constante. */
const ROOM_CEILING_COLD =
  'bg-[radial-gradient(ellipse_118%_74%_at_50%_-10%,rgba(248,250,252,0.085)_0%,transparent_74%)]'

const ROOM_DEPTH_NEUTRAL =
  'bg-[radial-gradient(ellipse_140%_88%_at_50%_40%,rgba(148,163,184,0.028)_0%,transparent_72%)]'

/** Tipografía: sin cambio emocional por estado. */
const TEXT_BASE = 'text-slate-200'

/**
 * Paleta de temperatura de luz institucional (Sprint 4.4.1).
 * Prioridad: cristal → marco → surcos → estaciones → header. Fondo reacción mínima.
 */
export const OPERATIONAL_ROOM_VISUAL: Record<
  OperationalRoomState,
  OperationalRoomVisual
> = {
  neutral: {
    backgroundOverlay: ROOM_CEILING_COLD,
    roomDepthAccent:
      'bg-[radial-gradient(ellipse_140%_88%_at_50%_40%,rgba(191,219,254,0.032)_0%,transparent_72%)]',
    frameRing: 'ring-sky-300/18',
    frameGlow:
      'shadow-[0_0_0_1px_rgba(186,230,253,0.28),0_8px_24px_-42px_rgba(0,0,0,0.22),0_0_52px_-40px_rgba(191,219,254,0.08)]',
    frameSurfaceTint:
      'bg-[linear-gradient(180deg,rgba(248,250,252,0.11)_0%,rgba(191,219,254,0.04)_20%,transparent_32%)]',
    crystalTint:
      'bg-[radial-gradient(ellipse_115%_86%_at_50%_-14%,rgba(248,250,252,0.12)_0%,rgba(191,219,254,0.055)_38%,transparent_58%)]',
    crystalSheen:
      'bg-[linear-gradient(180deg,rgba(248,250,252,0.11)_0%,rgba(186,230,253,0.045)_18%,transparent_42%)]',
    mainRail: 'bg-gradient-to-r from-transparent via-sky-300/28 to-transparent',
    deckGradient: 'from-sky-100/6',
    sidePanelAccent:
      'bg-gradient-to-b from-sky-100/34 via-slate-400/18 to-slate-500/13 shadow-[0_0_6px_-4px_rgba(191,219,254,0.12)]',
    sidePanelVeil:
      'bg-[radial-gradient(ellipse_72%_56%_at_100%_5%,rgba(191,219,254,0.034)_0%,transparent_72%)]',
    consoleAccent:
      'bg-gradient-to-b from-sky-100/34 via-slate-400/18 to-slate-500/13 shadow-[0_0_6px_-4px_rgba(191,219,254,0.12)]',
    consoleVeil:
      'bg-[radial-gradient(ellipse_68%_54%_at_0%_10%,rgba(191,219,254,0.03)_0%,transparent_72%)]',
    textIntensity: TEXT_BASE,
    crystalStatePerimeter:
      'ring-1 ring-inset ring-sky-400/30 shadow-[inset_0_1px_0_0_rgba(125,211,252,0.22),inset_0_-1px_0_0_rgba(148,163,184,0.14),inset_1px_0_0_0_rgba(186,230,253,0.14),inset_-1px_0_0_0_rgba(148,163,184,0.1)]',
    crystalStateLowerWash:
      'bg-[linear-gradient(0deg,rgba(186,230,253,0.07)_0%,rgba(191,219,254,0.038)_20%,transparent_44%)]',
    crystalStateEdgeGlow:
      'shadow-[0_0_22px_-12px_rgba(125,211,252,0.09),0_0_40px_-20px_rgba(148,163,184,0.06)]',
    crystalStateStructuralAccent:
      'bg-gradient-to-r from-transparent via-sky-400/26 to-transparent',
  },
  healthy: {
    backgroundOverlay:
      'bg-[radial-gradient(ellipse_118%_74%_at_50%_-10%,rgba(248,250,252,0.09)_0%,rgba(186,230,253,0.03)_24%,transparent_74%)]',
    roomDepthAccent:
      'bg-[radial-gradient(ellipse_140%_88%_at_50%_40%,rgba(186,230,253,0.038)_0%,transparent_70%)]',
    frameRing: 'ring-sky-300/22',
    frameGlow:
      'shadow-[0_0_0_1px_rgba(186,230,253,0.32),0_8px_24px_-42px_rgba(0,0,0,0.2),0_0_56px_-38px_rgba(186,230,253,0.095)]',
    frameSurfaceTint:
      'bg-[linear-gradient(180deg,rgba(248,250,252,0.12)_0%,rgba(186,230,253,0.05)_16%,transparent_30%)]',
    crystalTint:
      'bg-[radial-gradient(ellipse_118%_88%_at_50%_-14%,rgba(248,250,252,0.13)_0%,rgba(167,243,208,0.05)_36%,transparent_56%),radial-gradient(ellipse_90%_38%_at_50%_102%,rgba(94,234,212,0.04)_0%,transparent_58%)]',
    crystalSheen:
      'bg-[linear-gradient(180deg,rgba(248,250,252,0.12)_0%,rgba(153,246,228,0.055)_20%,transparent_40%)]',
    mainRail: 'bg-gradient-to-r from-transparent via-teal-300/32 to-transparent',
    deckGradient: 'from-teal-100/7',
    sidePanelAccent:
      'bg-gradient-to-b from-sky-100/38 via-slate-400/18 to-slate-500/13 shadow-[0_0_6px_-4px_rgba(186,230,253,0.13)]',
    sidePanelVeil:
      'bg-[radial-gradient(ellipse_72%_56%_at_100%_5%,rgba(186,230,253,0.038)_0%,transparent_70%)]',
    consoleAccent:
      'bg-gradient-to-b from-sky-100/38 via-slate-400/18 to-slate-500/13 shadow-[0_0_6px_-4px_rgba(186,230,253,0.13)]',
    consoleVeil:
      'bg-[radial-gradient(ellipse_68%_54%_at_0%_10%,rgba(186,230,253,0.034)_0%,transparent_70%)]',
    textIntensity: TEXT_BASE,
    crystalStatePerimeter:
      'ring-1 ring-inset ring-teal-400/32 shadow-[inset_0_1px_0_0_rgba(94,234,212,0.24),inset_0_-1px_0_0_rgba(45,212,191,0.14),inset_1px_0_0_0_rgba(153,246,228,0.14),inset_-1px_0_0_0_rgba(45,212,191,0.1)]',
    crystalStateLowerWash:
      'bg-[linear-gradient(0deg,rgba(45,212,191,0.08)_0%,rgba(94,234,212,0.042)_22%,transparent_46%)]',
    crystalStateEdgeGlow:
      'shadow-[0_0_24px_-12px_rgba(45,212,191,0.11),0_0_42px_-20px_rgba(94,234,212,0.07)]',
    crystalStateStructuralAccent:
      'bg-gradient-to-r from-transparent via-teal-400/30 to-transparent',
  },
  attention: {
    backgroundOverlay:
      'bg-[radial-gradient(ellipse_118%_74%_at_50%_-10%,rgba(248,250,252,0.08)_0%,rgba(254,243,199,0.032)_24%,transparent_74%)]',
    roomDepthAccent: ROOM_DEPTH_NEUTRAL,
    frameRing: 'ring-amber-200/20',
    frameGlow:
      'shadow-[0_0_0_1px_rgba(253,230,138,0.22),0_8px_24px_-42px_rgba(0,0,0,0.22),0_0_50px_-40px_rgba(251,191,36,0.078)]',
    frameSurfaceTint:
      'bg-[linear-gradient(180deg,rgba(254,243,199,0.08)_0%,rgba(251,191,36,0.025)_14%,transparent_24%)]',
    crystalTint:
      'bg-[radial-gradient(ellipse_115%_86%_at_50%_-14%,rgba(248,250,252,0.1)_0%,rgba(254,215,170,0.05)_32%,transparent_56%)]',
    crystalSheen:
      'bg-[linear-gradient(180deg,rgba(254,249,195,0.065)_0%,rgba(253,230,138,0.03)_14%,transparent_38%)]',
    mainRail: 'bg-gradient-to-r from-transparent via-amber-300/34 to-transparent',
    deckGradient: 'from-amber-100/7',
    sidePanelAccent:
      'bg-gradient-to-b from-amber-100/34 via-slate-400/16 to-slate-500/12 shadow-[0_0_6px_-4px_rgba(251,191,36,0.11)]',
    sidePanelVeil:
      'bg-[radial-gradient(ellipse_72%_56%_at_100%_5%,rgba(254,243,199,0.03)_0%,transparent_70%)]',
    consoleAccent:
      'bg-gradient-to-b from-amber-100/34 via-slate-400/16 to-slate-500/12 shadow-[0_0_6px_-4px_rgba(251,191,36,0.11)]',
    consoleVeil:
      'bg-[radial-gradient(ellipse_68%_54%_at_0%_10%,rgba(254,243,199,0.028)_0%,transparent_70%)]',
    textIntensity: TEXT_BASE,
    crystalStatePerimeter:
      'ring-1 ring-inset ring-amber-400/34 shadow-[inset_0_1px_0_0_rgba(251,191,36,0.24),inset_0_-1px_0_0_rgba(245,158,11,0.16),inset_1px_0_0_0_rgba(253,230,138,0.16),inset_-1px_0_0_0_rgba(245,158,11,0.12)]',
    crystalStateLowerWash:
      'bg-[linear-gradient(0deg,rgba(251,191,36,0.09)_0%,rgba(253,230,138,0.048)_24%,transparent_46%)]',
    crystalStateEdgeGlow:
      'shadow-[0_0_26px_-12px_rgba(251,191,36,0.13),0_0_44px_-18px_rgba(253,230,138,0.08)]',
    crystalStateStructuralAccent:
      'bg-gradient-to-r from-transparent via-amber-400/32 to-transparent',
  },
  risk: {
    backgroundOverlay:
      'bg-[radial-gradient(ellipse_118%_74%_at_50%_-10%,rgba(248,250,252,0.075)_0%,rgba(254,237,213,0.035)_26%,transparent_74%)]',
    roomDepthAccent: ROOM_DEPTH_NEUTRAL,
    frameRing: 'ring-orange-200/18',
    frameGlow:
      'shadow-[0_0_0_1px_rgba(253,186,116,0.2),0_8px_22px_-42px_rgba(0,0,0,0.24),0_0_48px_-40px_rgba(251,146,60,0.065)]',
    frameSurfaceTint:
      'bg-[linear-gradient(180deg,rgba(254,237,213,0.07)_0%,transparent_22%)]',
    crystalTint:
      'bg-[radial-gradient(ellipse_115%_86%_at_50%_-14%,rgba(248,250,252,0.09)_0%,rgba(254,215,170,0.045)_30%,transparent_54%)]',
    crystalSheen:
      'bg-[linear-gradient(180deg,rgba(254,243,199,0.055)_0%,rgba(248,250,252,0.04)_12%,transparent_36%)]',
    mainRail: 'bg-gradient-to-r from-transparent via-orange-200/22 to-transparent',
    deckGradient: 'from-orange-100/6',
    sidePanelAccent:
      'bg-gradient-to-b from-orange-100/28 via-slate-400/15 to-slate-500/12 shadow-[0_0_6px_-4px_rgba(251,146,60,0.09)]',
    sidePanelVeil:
      'bg-[radial-gradient(ellipse_72%_56%_at_100%_5%,rgba(254,237,213,0.028)_0%,transparent_70%)]',
    consoleAccent:
      'bg-gradient-to-b from-orange-100/28 via-slate-400/15 to-slate-500/12 shadow-[0_0_6px_-4px_rgba(251,146,60,0.09)]',
    consoleVeil:
      'bg-[radial-gradient(ellipse_68%_54%_at_0%_10%,rgba(254,237,213,0.024)_0%,transparent_70%)]',
    textIntensity: TEXT_BASE,
    crystalStatePerimeter:
      'ring-1 ring-inset ring-orange-400/32 shadow-[inset_0_1px_0_0_rgba(251,146,60,0.22),inset_0_-1px_0_0_rgba(234,88,12,0.14),inset_1px_0_0_0_rgba(253,186,116,0.14),inset_-1px_0_0_0_rgba(234,88,12,0.1)]',
    crystalStateLowerWash:
      'bg-[linear-gradient(0deg,rgba(251,146,60,0.08)_0%,rgba(253,186,116,0.04)_22%,transparent_45%)]',
    crystalStateEdgeGlow:
      'shadow-[0_0_24px_-12px_rgba(251,146,60,0.11),0_0_40px_-18px_rgba(253,186,116,0.07)]',
    crystalStateStructuralAccent:
      'bg-gradient-to-r from-transparent via-orange-400/28 to-transparent',
  },
  critical: {
    backgroundOverlay:
      'bg-[radial-gradient(ellipse_118%_74%_at_50%_-10%,rgba(248,250,252,0.07)_0%,transparent_64%),radial-gradient(ellipse_92%_68%_at_50%_102%,rgba(254,202,202,0.048)_0%,transparent_56%)]',
    roomDepthAccent:
      'bg-[radial-gradient(ellipse_140%_88%_at_50%_40%,rgba(148,163,184,0.02)_0%,rgba(254,202,202,0.032)_58%,transparent_74%)]',
    frameRing: 'ring-red-300/18',
    frameGlow:
      'shadow-[0_0_0_1px_rgba(252,165,165,0.24),0_10px_26px_-40px_rgba(0,0,0,0.28),0_0_56px_-36px_rgba(248,113,113,0.095)]',
    frameSurfaceTint:
      'bg-[linear-gradient(180deg,rgba(254,202,202,0.075)_0%,rgba(248,113,113,0.03)_12%,transparent_20%)]',
    crystalTint:
      'bg-[radial-gradient(ellipse_115%_86%_at_50%_-14%,rgba(248,250,252,0.08)_0%,transparent_46%),radial-gradient(ellipse_100%_42%_at_50%_102%,rgba(254,202,202,0.034)_0%,transparent_58%)]',
    crystalSheen:
      'bg-[linear-gradient(180deg,rgba(254,226,226,0.05)_0%,rgba(248,250,252,0.035)_14%,transparent_34%)]',
    mainRail: 'bg-gradient-to-r from-transparent via-red-300/32 to-transparent',
    deckGradient: 'from-red-100/7',
    sidePanelAccent:
      'bg-gradient-to-b from-red-100/32 via-slate-400/14 to-slate-500/11 shadow-[0_0_6px_-4px_rgba(248,113,113,0.12)]',
    sidePanelVeil:
      'bg-[radial-gradient(ellipse_72%_56%_at_100%_5%,rgba(254,202,202,0.034)_0%,transparent_68%)]',
    consoleAccent:
      'bg-gradient-to-b from-red-100/32 via-slate-400/14 to-slate-500/11 shadow-[0_0_6px_-4px_rgba(248,113,113,0.12)]',
    consoleVeil:
      'bg-[radial-gradient(ellipse_68%_54%_at_0%_10%,rgba(254,202,202,0.03)_0%,transparent_68%)]',
    textIntensity: TEXT_BASE,
    crystalStatePerimeter:
      'ring-1 ring-inset ring-red-400/38 shadow-[inset_0_1px_0_0_rgba(248,113,113,0.28),inset_0_-1px_0_0_rgba(239,68,68,0.2),inset_1px_0_0_0_rgba(252,165,165,0.18),inset_-1px_0_0_0_rgba(239,68,68,0.14)]',
    crystalStateLowerWash:
      'bg-[linear-gradient(0deg,rgba(248,113,113,0.13)_0%,rgba(254,202,202,0.068)_26%,transparent_48%)]',
    crystalStateEdgeGlow:
      'shadow-[0_0_30px_-10px_rgba(248,113,113,0.16),0_0_52px_-16px_rgba(254,202,202,0.1)]',
    crystalStateStructuralAccent:
      'bg-gradient-to-r from-transparent via-red-400/34 to-transparent',
  },
}
