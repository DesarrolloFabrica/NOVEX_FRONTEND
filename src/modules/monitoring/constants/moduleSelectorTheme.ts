// Selector de áreas — Módulos Operativos (Sprint 11.1–11.6).
// Paneles mecanizados sobre la misma lámina del Cristal Maestro — sin tarjetas independientes.

import type { EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'
import { CRYSTAL_STATE_TRANSITION } from '@/modules/monitoring/constants/ambientLighting'

/** Franja de módulos — altura mínima, prioriza la Consola Central. */
export const MODULE_SELECTOR_STRIP =
  'relative shrink-0 pt-1.5 pb-0 sm:pt-2 sm:pb-0'

/** Banda continua grabada en el cristal — surcos horizontales de unión. */
export const MODULE_SELECTOR_BAND =
  'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.26),inset_0_-1px_0_0_rgba(100,116,139,0.09)]'

/** Fila de selectores — divisores verticales finos, no cajas. */
export const MODULE_SELECTOR_ROW =
  `${MODULE_SELECTOR_BAND} flex items-stretch divide-x divide-slate-500/[0.11]`

/** Base del botón selector — altura ampliada para nombre en dos líneas (Sprint 11.4 / 11.5). */
export const MODULE_SELECTOR_BUTTON =
  `relative flex min-h-[6rem] w-[7.5rem] shrink-0 flex-col items-center justify-center gap-1.5 px-2.5 pb-1.5 pt-1 text-center sm:min-h-[6.25rem] sm:w-[7.75rem] ${CRYSTAL_STATE_TRANSITION}`

/** Reposo — casi invisible; solo perimetral tenue sobre el cristal (Sprint 11.6). */
export const MODULE_SELECTOR_IDLE_SURFACE = 'bg-transparent'

export const MODULE_SELECTOR_IDLE_ICON =
  'bg-transparent text-slate-500/68 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.16)]'

export const MODULE_SELECTOR_IDLE_ICON_GLOBAL =
  'bg-transparent text-slate-500/70 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.18)]'

export const MODULE_SELECTOR_IDLE_NAME =
  'line-clamp-2 min-h-[3rem] w-full shrink-0 px-1 text-[10px] font-medium leading-normal text-slate-500/66 sm:text-[11px]'

export interface ModuleSelectorActiveVisual {
  surface: string
  glow: string
  icon: string
  iconGlobal: string
  name: string
}

const MODULE_SELECTOR_ACTIVE_NAME_BASE =
  'line-clamp-2 min-h-[3rem] w-full shrink-0 px-1 text-[10px] font-semibold leading-normal sm:text-[11px]'

const MODULE_ACTIVE_ICON: Record<
  EnvironmentStatus,
  { icon: string; iconGlobal: string; name: string }
> = {
  pending: {
    icon: 'bg-sky-400/[0.07] text-sky-800 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.44)]',
    iconGlobal:
      'bg-sky-400/[0.08] text-sky-800 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.46)]',
    name: `${MODULE_SELECTOR_ACTIVE_NAME_BASE} text-sky-900`,
  },
  healthy: {
    icon: 'bg-teal-400/[0.08] text-teal-800 shadow-[inset_0_0_0_1px_rgba(45,212,191,0.44)]',
    iconGlobal:
      'bg-teal-400/[0.09] text-teal-800 shadow-[inset_0_0_0_1px_rgba(45,212,191,0.46)]',
    name: `${MODULE_SELECTOR_ACTIVE_NAME_BASE} text-teal-900`,
  },
  attention: {
    icon: 'bg-amber-400/[0.08] text-amber-900 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.42)]',
    iconGlobal:
      'bg-amber-400/[0.09] text-amber-900 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.44)]',
    name: `${MODULE_SELECTOR_ACTIVE_NAME_BASE} text-amber-950`,
  },
  critical: {
    icon: 'bg-red-400/[0.09] text-red-800 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.46)]',
    iconGlobal:
      'bg-red-400/[0.1] text-red-800 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.48)]',
    name: `${MODULE_SELECTOR_ACTIVE_NAME_BASE} text-red-950`,
  },
}

function buildModuleActiveVisual(
  environment: EnvironmentStatus,
): ModuleSelectorActiveVisual {
  const icons = MODULE_ACTIVE_ICON[environment]

  return {
    surface: 'bg-transparent',
    glow: '',
    icon: icons.icon,
    iconGlobal: icons.iconGlobal,
    name: icons.name,
  }
}

/** Estado activo — iluminación del cristal, no tarjeta (Sprint 11.6). */
export const MODULE_SELECTOR_ACTIVE: Record<
  EnvironmentStatus,
  ModuleSelectorActiveVisual
> = {
  pending: buildModuleActiveVisual('pending'),
  healthy: buildModuleActiveVisual('healthy'),
  attention: buildModuleActiveVisual('attention'),
  critical: buildModuleActiveVisual('critical'),
}

export function getModuleSelectorActive(
  environment: EnvironmentStatus,
): ModuleSelectorActiveVisual {
  return MODULE_SELECTOR_ACTIVE[environment]
}
