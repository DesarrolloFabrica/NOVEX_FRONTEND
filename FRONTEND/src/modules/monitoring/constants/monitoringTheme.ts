// Sistema visual de la Sala O.M.E.G.A. (solo presentación).
// Responsabilidad: centralizar superficies, paneles, tipografía institucional y
// el tema por estado de entorno, para que toda la pantalla se sienta como una
// sola sala de operaciones, sobria y unificada. No contiene lógica de negocio.

import type { EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'
import {
  CRYSTAL_DOSSIER_DIVIDE,
  CRYSTAL_DOSSIER_PROJECT_ETCH,
  CRYSTAL_MODULE_ACTIVE_ETCH,
  CRYSTAL_MODULE_GLOBAL_ACTIVE_ETCH,
  ETCH_CONSOLE_LIST_BEFORE,
  ETCH_WORKSTATION_PLATE,
  WORKSTATION_CHANNEL_VERTICAL,
} from '@/modules/monitoring/constants/materialTheme'

// --- Superficies de la sala -------------------------------------------------

/**
 * Superficie de pantalla completa autónoma (p. ej. Login).
 * Dentro de la Sala O.M.E.G.A. el "suelo" lo aporta `modules/room`
 * (OmegaRoom/OmegaFrame/MainScreen), por eso el Centro NO la usa.
 */
export const ROOM_SURFACE = 'min-h-screen bg-slate-950 text-slate-200'

/**
 * Deck interno de la Gran Pantalla: continuidad del Cristal Maestro.
 * En desktop expande al volumen disponible del cristal.
 */
export const SCREEN_DECK =
  'text-slate-700 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden'

/** Separación interior del cristal (compacta en desktop para más presencia). */
export const ROOM_CONTAINER =
  'px-3 py-3 sm:px-4 sm:py-4 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden lg:px-4 lg:py-3'

// --- Ritmo y respiración del Cristal ---------------------------------------

/** Padding de estación — zona funcional sobre la placa unificada (sin fresado aislado). */
export const CRYSTAL_ZONE = 'relative px-4 py-4 sm:px-5 sm:py-5'

/** Estaciones laterales — misma placa, mismo plano. */
export const CRYSTAL_ZONE_SUPPORT =
  'relative px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6'

/** Placa de estación de trabajo — losa mecanizada única. */
export const CRYSTAL_WORKSTATION_PLATE = `relative ${ETCH_WORKSTATION_PLATE}`

/** Columna central — canales verticales continuos con laterales. */
export const CRYSTAL_WORKSTATION_MAIN = `relative flex min-h-0 min-w-0 flex-col ${WORKSTATION_CHANNEL_VERTICAL}`

/** Cabecera incrustada: compacta en desktop. */
export const CRYSTAL_HEADER_PAD = 'px-4 py-3.5 sm:px-5 sm:py-4 lg:px-5 lg:py-3'

/** Respiro tras regla grabada antes del contenido. */
export const CRYSTAL_ETCH_GAP = 'pt-4 sm:pt-5'

/** Separación entre título de estación y primer bloque de datos. */
export const CRYSTAL_STATION_LEAD = 'mt-4 sm:mt-5'

/** Bloques relacionados dentro de la misma estación (menor salto). */
export const CRYSTAL_INLINE_BLOCK = 'mt-3'

/** Cola entre secciones grabadas contiguas. */
export const CRYSTAL_SECTION_TAIL = 'mt-3'

/** Respiro entre etiqueta y métrica o dato. */
export const CRYSTAL_LABEL_GAP = 'mt-2'

/** Ritmo entre filas de datos en estaciones. */
export const CRYSTAL_DATA_STACK = 'space-y-2.5'

/** Zona superior: módulos operativos — inicio de la estación central. */
export const CRYSTAL_MODULE_STRIP = 'relative pt-3 pb-0 sm:pt-4 sm:pb-0'

/** Lista de expedientes en consola central (campo grabado, alta densidad). */
export const CRYSTAL_LIST_PAD =
  `relative px-3 py-1.5 sm:px-4 sm:py-2 lg:px-5 ${ETCH_CONSOLE_LIST_BEFORE}`

/** Zona de consola central — continuación de la misma placa. */
export const CRYSTAL_CONSOLE_ZONE = 'relative'

/** Sprint 10.2 — ventana fija de compromisos (~4.5 filas visibles, scroll interno). */
export const CONSOLE_LIST_VIEWPORT =
  'omega-console-list-scroll max-h-[12rem] overflow-x-hidden overflow-y-auto sm:max-h-[13rem] lg:max-h-[14.5rem]'

/** Reserva de scroll al final de la lista (despeje sobre el holograma). */
export const CONSOLE_LIST_SCROLL_END = 'h-28 shrink-0 sm:h-32 lg:h-36'

/** Padding interior de cada módulo operativo. */
export const CRYSTAL_MODULE_PAD = 'px-4 py-3.5 sm:px-5 sm:py-4'

/** Título de franja → regla grabada. */
export const CRYSTAL_STATION_TITLE = 'mb-3'

/** Cabecera de consola tras regla grabada. */
export const CRYSTAL_CONSOLE_HEADER =
  'flex flex-wrap items-center justify-between gap-3 px-4 pb-0 pt-5 sm:px-5 lg:px-6'

/** Padding de registro en consola compacta (Sprint 10.1). */
export const CRYSTAL_DOSSIER_PAD = 'px-4 py-1.5 sm:px-5 sm:py-2'

/** Rejilla de columnas: laterales proporcionales, centro dominante en desktop. */
export const CRYSTAL_GRID =
  'lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[15rem_minmax(0,1fr)_15rem] xl:grid-cols-[16.5rem_minmax(0,1fr)_16.5rem] 2xl:grid-cols-[18rem_minmax(0,1fr)_18rem]'

/** Divisor grabado entre zonas — trazo de ingeniería visible. */
export const CRYSTAL_DIVIDER = 'border-slate-500/28'

/** Divisor grabado entre filas/columnas adyacentes. */
export const CRYSTAL_DIVIDE = 'divide-slate-500/28'

/** Regla vertical de columna (continuidad de superficie). @deprecated Usar CrystalColumnGroove. */
export const CRYSTAL_COLUMN_RULE = 'border-slate-500/28'

/** Riel vertical de título de estación — índice de retícula técnica. */
export const CRYSTAL_RAIL =
  'h-3.5 w-px shrink-0 bg-gradient-to-b from-slate-600/55 via-slate-500/38 to-slate-500/22'

// --- Arquitectura del Cristal (Sprint 3.3) -----------------------------------

/** @deprecated Usar CRYSTAL_SLAB_THICKNESS en crystalMaterial.ts. */
export const CRYSTAL_SLAB_BEVEL =
  'shadow-[inset_0_1px_0_0_rgba(148,163,184,0.08),inset_0_-1px_0_0_rgba(2,6,23,0.55)]'

/**
 * Surco entre filas de expediente: nivel grabado (no borde HTML plano).
 * Requiere `[&>li]:relative` en el contenedor.
 */
export const CRYSTAL_STRUCTURAL_DIVIDE = CRYSTAL_DOSSIER_DIVIDE

/** @deprecated Usar CrystalStructuralRule. */
export const CRYSTAL_ETCH_RULE =
  'h-px w-full bg-gradient-to-r from-transparent via-slate-500/18 to-transparent'

/**
 * Contenedor de superposición del Holograma (Plano 2).
 * @deprecated Sprint 9.1 — la proyección vive en ProjectionStage (OmegaRoom).
 * Antes: posición absoluta sobre el Cristal Maestro.
 */
export const PROJECTION_OVERLAY =
  'max-lg:relative max-lg:mt-3 max-lg:w-full max-lg:pb-3 lg:pointer-events-none lg:absolute lg:inset-x-3 sm:lg:inset-x-5 lg:bottom-3 lg:flex lg:flex-col lg:items-center lg:justify-end lg:overflow-visible'

/** Separación holograma → plataforma (acople sin aplastamiento). */
export const PROJECTION_HOLOGRAM_GAP = 'mb-1 sm:mb-1.5 lg:mb-1.5'

/** Padding interior del volumen proyectado (activo). */
export const PROJECTION_INNER_PAD = 'p-3 sm:p-4 lg:px-3 lg:pt-2.5 lg:pb-3'

/** Padding interior de la zona de proyección en espera. */
export const PROJECTION_INNER_PAD_IDLE =
  'flex flex-col items-center justify-center px-4 py-3 sm:min-h-[3.5rem] sm:py-3.5 lg:min-h-[2.75rem] lg:px-3 lg:py-2.5'

/** Pie de validación: respiro inferior dentro del holograma. */
export const PROJECTION_VALIDATE_FOOTER = 'mt-3 border-t pt-3 pb-1'

/** Superficie en espera: zona de proyección legible sobre cristal (Sprint 12.2). */
export const PROJECTION_SURFACE_IDLE =
  'relative overflow-hidden rounded-lg bg-white/18 bg-gradient-to-b from-indigo-100/28 via-indigo-200/14 to-indigo-300/6 ring-1 ring-inset ring-indigo-300/42 shadow-[0_0_18px_-18px_rgba(129,140,248,0.18),inset_0_1px_0_0_rgba(255,255,255,0.16)]'

/** Superficie activa: volumen proyectado con mayor presencia (Sprint 12.2). */
export const PROJECTION_SURFACE_ACTIVE =
  'relative overflow-hidden rounded-lg bg-white/32 bg-gradient-to-b from-indigo-50/62 via-indigo-100/38 to-indigo-200/16 ring-1 ring-inset ring-indigo-300/58 shadow-[0_0_28px_-20px_rgba(165,180,252,0.32),inset_0_1px_0_0_rgba(255,255,255,0.2)]'

/** @deprecated Usar PROJECTION_SURFACE_ACTIVE o PROJECTION_SURFACE_IDLE. */
export const PROJECTION_SURFACE = PROJECTION_SURFACE_ACTIVE

/** Luz del volumen — expediente proyectado. */
export const PROJECTION_BEAM =
  'pointer-events-none absolute inset-x-[18%] top-0 h-14 bg-[radial-gradient(ellipse_at_top,rgba(196,181,253,0.28)_0%,transparent_62%)]'

/** Luz tenue en espera. */
export const PROJECTION_BEAM_IDLE =
  'pointer-events-none absolute inset-x-[24%] top-0 h-7 bg-[radial-gradient(ellipse_at_top,rgba(165,180,252,0.16)_0%,transparent_68%)]'

/** Halo de borde interior — volumen de vidrio proyectado (activo). */
export const PROJECTION_EDGE_HALO_ACTIVE =
  'pointer-events-none absolute inset-0 rounded-lg shadow-[inset_0_0_0_1px_rgba(196,181,253,0.32),inset_0_2px_28px_-10px_rgba(165,180,252,0.18)]'

/** Halo de borde interior — espera. */
export const PROJECTION_EDGE_HALO_IDLE =
  'pointer-events-none absolute inset-0 rounded-lg shadow-[inset_0_0_0_1px_rgba(165,180,252,0.24),inset_0_1px_20px_-10px_rgba(129,140,248,0.12)]'

/** Acople inferior con la plataforma — proyección activa. */
export const PROJECTION_COUPLE_GLOW_ACTIVE =
  'pointer-events-none absolute inset-x-[22%] bottom-0 h-4 bg-[radial-gradient(ellipse_at_bottom,rgba(129,140,248,0.2)_0%,transparent_62%)]'

/** Acople inferior con la plataforma — espera. */
export const PROJECTION_COUPLE_GLOW_IDLE =
  'pointer-events-none absolute inset-x-[28%] bottom-0 h-3 bg-[radial-gradient(ellipse_at_bottom,rgba(129,140,248,0.1)_0%,transparent_66%)]'

/** Pulso breve tras validación — cumplido (Sprint 12.2). */
export const PROJECTION_FEEDBACK_PULSE_OK =
  'ring-2 ring-inset ring-emerald-400/52 shadow-[0_0_32px_-10px_rgba(45,212,191,0.38),inset_0_0_24px_-8px_rgba(52,211,153,0.14)]'

/** Pulso breve tras validación — incumplido (Sprint 12.2). */
export const PROJECTION_FEEDBACK_PULSE_FAIL =
  'ring-2 ring-inset ring-red-400/52 shadow-[0_0_32px_-10px_rgba(248,113,113,0.36),inset_0_0_24px_-8px_rgba(239,68,68,0.14)]'

/** Pulso de acople inferior — cumplido. */
export const PROJECTION_FEEDBACK_COUPLING_OK =
  'bg-[radial-gradient(ellipse_at_bottom,rgba(45,212,191,0.28)_0%,transparent_62%)]'

/** Pulso de acople inferior — incumplido. */
export const PROJECTION_FEEDBACK_COUPLING_FAIL =
  'bg-[radial-gradient(ellipse_at_bottom,rgba(248,113,113,0.26)_0%,transparent_62%)]'

/** Chip de impacto — etiqueta sobre proyección luminosa. */
export const HOLOGRAM_IMPACT_CHIP =
  'rounded-full bg-indigo-100/58 px-2 py-0.5 font-mono text-[11px] text-indigo-950 ring-1 ring-inset ring-indigo-400/52'

/** Botón de validación — cumplido (grabado luminoso, no control web). */
export const PROJECTION_VALIDATE_BTN_OK =
  'shrink-0 rounded-md bg-emerald-500/14 px-2.5 py-1 text-[11px] font-medium text-emerald-50 ring-1 ring-inset ring-emerald-400/42 transition-all duration-300 hover:bg-emerald-500/22 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:py-1.5 sm:text-xs'

/** Botón de validación — incumplido. */
export const PROJECTION_VALIDATE_BTN_FAIL =
  'shrink-0 rounded-md bg-red-500/14 px-2.5 py-1 text-[11px] font-medium text-red-50 ring-1 ring-inset ring-red-400/42 transition-all duration-300 hover:bg-red-500/24 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:py-1.5 sm:text-xs'

/** Botón de detalle — placeholder activo (Sprint 12.2). */
export const PROJECTION_DETAILS_BTN =
  'shrink-0 rounded-md bg-indigo-500/12 px-2.5 py-1 text-[11px] font-medium text-indigo-100 ring-1 ring-inset ring-indigo-400/38 transition-all duration-300 hover:bg-indigo-500/18 sm:px-3 sm:py-1.5 sm:text-xs'

/** Énfasis posterior a validación — cumplido. */
export const PROJECTION_VALIDATE_BTN_OK_AFFIRMED =
  'bg-emerald-500/24 ring-2 ring-emerald-400/55'

/** Énfasis posterior a validación — incumplido. */
export const PROJECTION_VALIDATE_BTN_FAIL_AFFIRMED =
  'bg-red-500/24 ring-2 ring-red-400/55'

/** Texto de actualización en proyección. */
export const PROJECTION_UPDATING_TEXT = 'font-mono text-[11px] text-slate-300'

/** Separador vertical de cabecera — trazo de retícula. */
export const HEADER_SEPARATOR =
  'hidden h-3.5 w-px bg-gradient-to-b from-transparent via-slate-500/38 to-transparent sm:inline-block'

// --- Plataforma de Proyección ------------------------------------------------
// Tokens base en projectionTheme.ts. Re-export para compatibilidad.

export {
  PLATFORM_DECK_ACTIVE,
  PLATFORM_DECK_IDLE,
  PLATFORM_EMITTER_ACTIVE,
  PLATFORM_EMITTER_IDLE,
  PLATFORM_RAIL_ACTIVE,
  PLATFORM_RAIL_IDLE,
  PROJECTION_SYSTEM,
} from '@/modules/monitoring/constants/projectionTheme'

/**
 * Panel con caja (solo para pantallas autónomas como Login).
 * En el Centro de Monitoreo NO se usa: las zonas viven en el cristal unificado.
 */
export const PANEL = 'rounded-xl bg-slate-900/25 ring-1 ring-inset ring-slate-800/40'

/** Panel secundario con caja (solo para pantallas autónomas como Login). */
export const PANEL_QUIET = 'rounded-lg bg-slate-900/20 ring-1 ring-inset ring-slate-800/30'

/** Superficie de consola grabada (Centro de Monitoreo — sin caja). */
export const CONSOLE_SURFACE = 'relative bg-transparent shadow-none ring-0'

// --- Foco principal (compromiso seleccionado / proyección) ------------------

/** Anillo de foco para el elemento principal (selección / holograma). */
export const FOCUS_RING = 'ring-1 ring-inset ring-indigo-400/55'

/** Riel de acento del foco (proyección inferior). */
export const FOCUS_RAIL = 'bg-indigo-400/52'

/** Riel de módulo operativo activado (franja de áreas). */
export const MODULE_ACTIVE_RAIL = 'bg-indigo-400/52'

/** Iluminación interna de módulo activado (fresado grabado, no caja). */
export const MODULE_ACTIVE_GLOW = CRYSTAL_MODULE_ACTIVE_ETCH

/** Iluminación de módulo maestro/global activado. */
export const MODULE_GLOBAL_ACTIVE_GLOW = CRYSTAL_MODULE_GLOBAL_ACTIVE_ETCH

/** Expediente proyectado al Holograma (canal grabado, no tarjeta). */
export const DOSSIER_PROJECTED_GLOW = CRYSTAL_DOSSIER_PROJECT_ETCH

/** Riel de envío hacia el Holograma (expediente seleccionado) — canal visible. */
export const DOSSIER_PROJECT_RAIL =
  'bg-gradient-to-b from-indigo-600/68 via-indigo-500/54 to-indigo-600/68'

/** Haz lateral de conexión expediente → holograma. */
export const DOSSIER_PROJECT_BEAM =
  'pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-indigo-400/9 to-transparent'

/**
 * Anillo de foco de teclado consistente para elementos interactivos.
 * Mantiene la accesibilidad (focus-visible) sin depender solo del color.
 */
export const FOCUS_VISIBLE =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'

// --- Tipografía institucional ----------------------------------------------

export const TEXT_LABEL =
  'text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600'
export const TEXT_HEADING = 'text-slate-800'
export const TEXT_MUTED = 'text-slate-600'
export const TEXT_METRIC = 'font-mono text-slate-800'

// --- Tema por estado del entorno -------------------------------------------

export interface EnvironmentTheme {
  /** Etiqueta legible del estado. */
  label: string
  /** Punto indicador de estado. */
  dot: string
  /** "Badge" del estado (relleno + texto + anillo). */
  badge: string
  /** Texto de acento del color del entorno. */
  accentText: string
  /** Anillo de acento del entorno. */
  accentRing: string
  /** Riel/línea de acento del entorno. */
  rail: string
  /** Tinte ambiental sutil para teñir la sala (origen del gradiente). */
  ambient: string
}

/**
 * Paleta sobria por entorno. La idea es ambientar la sala sin parecer un
 * videojuego: tintes apagados (950/40) y acentos discretos.
 * - pending  => azul sobrio
 * - healthy  => verde sobrio
 * - attention => ámbar
 * - critical => rojo sobrio
 */
export const ENVIRONMENT_THEME: Record<EnvironmentStatus, EnvironmentTheme> = {
  pending: {
    label: 'En espera',
    dot: 'bg-sky-400 shadow-[0_0_4px_-1px_rgba(56,189,248,0.4)]',
    badge: 'bg-sky-950/35 text-sky-200 ring-1 ring-inset ring-sky-400/38',
    accentText: 'text-sky-200',
    accentRing: 'ring-sky-400/42',
    rail: 'bg-sky-400/45',
    ambient: 'from-sky-950/25',
  },
  healthy: {
    label: 'Estable',
    dot: 'bg-emerald-400 shadow-[0_0_4px_-1px_rgba(52,211,153,0.4)]',
    badge:
      'bg-emerald-950/35 text-emerald-200 ring-1 ring-inset ring-emerald-400/38',
    accentText: 'text-emerald-200',
    accentRing: 'ring-emerald-400/42',
    rail: 'bg-emerald-400/45',
    ambient: 'from-emerald-950/25',
  },
  attention: {
    label: 'Atención',
    dot: 'bg-amber-400 shadow-[0_0_4px_-1px_rgba(251,191,36,0.4)]',
    badge: 'bg-amber-950/35 text-amber-200 ring-1 ring-inset ring-amber-400/38',
    accentText: 'text-amber-200',
    accentRing: 'ring-amber-400/42',
    rail: 'bg-amber-400/45',
    ambient: 'from-amber-950/25',
  },
  critical: {
    label: 'Crítico',
    dot: 'bg-red-400 shadow-[0_0_4px_-1px_rgba(248,113,113,0.4)]',
    badge: 'bg-red-950/35 text-red-200 ring-1 ring-inset ring-red-400/38',
    accentText: 'text-red-200',
    accentRing: 'ring-red-400/42',
    rail: 'bg-red-400/45',
    ambient: 'from-red-950/25',
  },
}
