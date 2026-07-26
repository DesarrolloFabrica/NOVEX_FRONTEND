// Jerarquía visual del recorrido del operador (Sprint 4.5).
// Sprint 7.2: tinta técnica sobre cristal blanco — grafito, petróleo, contraste fuerte.

import {
  CRYSTAL_HEADER_ACTION,
  CRYSTAL_HEADER_ACTION_QUIET,
} from '@/modules/monitoring/constants/materialTheme'

// --- Paleta de tinta sobre cristal blanco -----------------------------------

/** Tinta principal — títulos y datos críticos (grafito, no blanco). */
export const INK_PRIMARY = 'text-slate-800'

/** Tinta secundaria — cuerpo legible sobre luminancia alta. */
export const INK_SECONDARY = 'text-slate-600'

/** Tinta de registro — códigos, referencias, metadatos técnicos. */
export const INK_REGISTRY =
  'font-mono text-[10px] tracking-[0.12em] text-slate-600'

/** Tinta de cuerpo — información secundaria impresa. */
export const INK_BODY = 'text-sm text-slate-600'

/** Tinta de leyenda — etiquetas, subtítulos, pies de campo. */
export const INK_CAPTION =
  'omega-section-title omega-type-meta font-medium tracking-normal text-slate-400'

/** Tinta auxiliar — contadores, apoyo, metadata menor. */
export const INK_AUXILIARY = 'font-mono text-[10px] text-slate-600'

/** Tinta petróleo — acentos técnicos neutros sobre blanco. */
export const INK_PETROLEUM = 'text-[#3d5563]'

/** Tinta de acento operativo — proyección y selección sobre cristal claro. */
export const INK_OPERATIVE = 'text-indigo-700'

// --- Nivel 2: Consola central -----------------------------------------------

export const CONSOLE_ZONE = ''

export const CONSOLE_CONTROLS = ''

export const CONSOLE_STATION_TITLE = INK_CAPTION

export const CONSOLE_META = INK_AUXILIARY

export const CONSOLE_FILTER = 'text-[11px] font-medium text-slate-600'

export const DOSSIER_IDLE = ''

export const DOSSIER_PROJECTED = 'opacity-100'

/** Sprint 10.1 — fila seleccionada (acento de registro, no tarjeta). */
export const DOSSIER_ROW_SELECTED =
  'bg-indigo-500/[0.07] shadow-[inset_0_1px_0_0_rgba(99,102,241,0.18)]'

/** Sprint 10.1 — layout de fila compacta en consola. */
export const CONSOLE_DOSSIER_ROW = 'flex min-h-[1.75rem] items-center gap-2 sm:min-h-[2rem] sm:gap-2.5'

export const DOSSIER_REF_IDLE =
  'hidden shrink-0 font-mono text-[9px] tracking-[0.1em] text-slate-500 sm:inline sm:w-11'

export const DOSSIER_REF_PROJECTED =
  'hidden shrink-0 font-mono text-[9px] tracking-[0.1em] text-indigo-700 sm:inline sm:w-11'

/** @deprecated Sprint 10.1 — eliminado de la lista compacta. */
export const DOSSIER_SIGNAL_IDLE =
  'shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-600'

/** @deprecated Sprint 10.1 — eliminado de la lista compacta. */
export const DOSSIER_SIGNAL_PROJECTED =
  'shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] text-indigo-700'

export const DOSSIER_TITLE_IDLE =
  'min-w-0 flex-1 truncate text-sm font-normal text-slate-700'

export const DOSSIER_TITLE_PROJECTED =
  `min-w-0 flex-1 truncate text-sm font-semibold ${INK_PRIMARY}`

export const DOSSIER_DUE_IDLE =
  'shrink-0 font-mono text-[10px] tabular-nums text-slate-600'

export const DOSSIER_DUE_PROJECTED =
  'shrink-0 font-mono text-[10px] tabular-nums text-indigo-700'

// --- Nivel 3: Módulos operativos --------------------------------------------

export const MODULE_IDLE = ''

export const MODULE_STATION_TITLE = INK_CAPTION

export const MODULE_IDLE_CODE =
  'font-mono text-[11px] tracking-wider text-slate-600'

export const MODULE_IDLE_NAME =
  'mt-0.5 truncate text-xs font-medium text-slate-600'

export const MODULE_SELECTED_CODE =
  'font-mono text-[11px] tracking-wider text-indigo-700'

export const MODULE_SELECTED_NAME =
  `mt-0.5 truncate text-xs font-semibold ${INK_PRIMARY}`

// --- Nivel 4: Inteligencia operativa ----------------------------------------

export const INTEL_ZONE = ''

export const INTEL_STATION_TITLE = INK_CAPTION

export const INTEL_METRIC = `font-mono text-lg font-semibold ${INK_PRIMARY}`

export const INTEL_BODY = `text-sm font-medium ${INK_SECONDARY}`

export const INTEL_ALERT_VALUE = 'font-mono text-sm font-semibold'

export const INTEL_EMPTY = 'text-sm italic text-slate-600/90'

// --- Nivel 5: Contexto operativo --------------------------------------------

export const CONTEXT_ZONE = ''

export const CONTEXT_STATION_TITLE = INK_CAPTION

export const CONTEXT_SUBTITLE =
  'omega-section-label text-[11px] font-medium uppercase tracking-[0.16em] text-slate-600'

export const CONTEXT_AREA_NAME =
  `text-sm font-semibold leading-snug ${INK_PRIMARY}`

export const CONTEXT_ROW_LABEL = 'text-sm text-slate-600'

// --- Nivel 6: Header --------------------------------------------------------

export const HEADER_ZONE = ''

export const HEADER_BRAND =
  'text-xs font-semibold tracking-[0.28em] text-slate-600'

export const HEADER_SUBTITLE =
  'text-[10px] font-medium uppercase tracking-[0.16em] text-slate-600'

export const HEADER_SESSION_NAME =
  'text-xs font-medium leading-tight text-slate-700'

export const HEADER_SESSION_ROLE =
  'text-[10px] uppercase tracking-[0.16em] text-slate-600'

export const HEADER_ACTION_QUIET = CRYSTAL_HEADER_ACTION_QUIET

export const HEADER_ACTION = CRYSTAL_HEADER_ACTION
