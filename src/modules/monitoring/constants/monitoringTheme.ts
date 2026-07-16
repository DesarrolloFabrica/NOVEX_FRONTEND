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

/** Cola entre secciones grabadas contiguas. */
export const CRYSTAL_SECTION_TAIL = 'mt-3'

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

/** Separador vertical de cabecera — trazo de retícula. */
export const HEADER_SEPARATOR =
  'hidden h-3.5 w-px bg-gradient-to-b from-transparent via-slate-500/38 to-transparent sm:inline-block'

/**
 * Panel con caja (solo para pantallas autónomas como Login).
 * En el Centro de Monitoreo NO se usa: las zonas viven en el cristal unificado.
 */
export const PANEL = 'rounded-xl bg-slate-900/25 ring-1 ring-inset ring-slate-800/40'

/** Panel secundario con caja (solo para pantallas autónomas como Login). */
export const PANEL_QUIET = 'rounded-lg bg-slate-900/20 ring-1 ring-inset ring-slate-800/30'

/** Superficie de consola grabada (Centro de Monitoreo — sin caja). */
export const CONSOLE_SURFACE = 'relative bg-transparent shadow-none ring-0'

// --- Foco principal (compromiso seleccionado) -------------------------------

/** Anillo de foco para el elemento principal seleccionado. */
export const FOCUS_RING = 'ring-1 ring-inset ring-indigo-400/55'

/** Riel de acento del foco. */
export const FOCUS_RAIL = 'bg-indigo-400/52'

/** Riel de módulo operativo activado (franja de áreas). */
export const MODULE_ACTIVE_RAIL = 'bg-indigo-400/52'

/** Iluminación interna de módulo activado (fresado grabado, no caja). */
export const MODULE_ACTIVE_GLOW = CRYSTAL_MODULE_ACTIVE_ETCH

/** Iluminación de módulo maestro/global activado. */
export const MODULE_GLOBAL_ACTIVE_GLOW = CRYSTAL_MODULE_GLOBAL_ACTIVE_ETCH

/** Expediente seleccionado (canal grabado, no tarjeta). */
export const DOSSIER_PROJECTED_GLOW = CRYSTAL_DOSSIER_PROJECT_ETCH

/** Riel del expediente seleccionado — canal visible. */
export const DOSSIER_PROJECT_RAIL =
  'bg-gradient-to-b from-indigo-600/68 via-indigo-500/54 to-indigo-600/68'

/** Acento lateral del expediente seleccionado. */
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
  'omega-section-title text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600'
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
