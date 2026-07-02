// Material cromático del Holograma Operativo (Sprint 12.2B / 12.3).
// Superficie oscura translúcida — el estado del compromiso define el color permanente.

import type { CommitmentStatus } from '@/modules/commitments/types/commitment.types'

const HOLOGRAM_CHROMATIC_TRANSITION = 'transition-all duration-500 ease-out'

export interface HologramChromaticVisual {
  surface: string
  beam: string
  edgeHalo: string
  coupleGlow: string
  volumeHalo: string
  innerReveal: string
  innerCavity: string
  eyebrow: string
  title: string
  statusBadge: string
  impactChip: string
  actionsDivider: string
  detailsBtn: string
  validateBtnOk: string
  validateBtnFail: string
  validateBtnOkAffirmed: string
  validateBtnFailAffirmed: string
  transitionBoost: string
  updatingText: string
}

/** Zona de proyección en espera — índigo tenue, sin blanco dominante. */
export const HOLOGRAM_CHROMATIC_IDLE: HologramChromaticVisual = {
  surface:
    'relative bg-gradient-to-b from-slate-950/55 via-indigo-950/42 to-slate-950/62 ring-1 ring-inset ring-indigo-500/32 shadow-[0_0_24px_-16px_rgba(99,102,241,0.28),inset_0_1px_0_0_rgba(129,140,248,0.14)]',
  beam: 'pointer-events-none absolute inset-x-[22%] top-0 h-8 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.2)_0%,transparent_68%)]',
  edgeHalo:
    'pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(129,140,248,0.22),inset_0_1px_18px_-10px_rgba(99,102,241,0.12)]',
  coupleGlow:
    'pointer-events-none absolute inset-x-[26%] bottom-0 h-3 bg-[radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.16)_0%,transparent_66%)]',
  volumeHalo:
    'pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_68%_48%_at_50%_6%,rgba(99,102,241,0.12)_0%,transparent_58%)]',
  innerReveal:
    'pointer-events-none absolute shadow-[inset_0_0_0_1px_rgba(129,140,248,0.2)]',
  innerCavity:
    'pointer-events-none absolute shadow-[inset_0_0_0_1px_rgba(99,102,241,0.11)]',
  eyebrow:
    'text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-300/88',
  title: 'line-clamp-2 text-center text-lg font-bold leading-snug text-slate-200 sm:text-xl',
  statusBadge:
    'rounded-full bg-indigo-950/50 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-indigo-200 ring-1 ring-inset ring-indigo-400/35',
  impactChip:
    'rounded-full bg-indigo-950/55 px-2 py-0.5 font-mono text-[11px] text-indigo-200 ring-1 ring-inset ring-indigo-400/38',
  actionsDivider: 'border-indigo-500/22',
  detailsBtn:
    'shrink-0 rounded-md bg-indigo-950/45 px-2.5 py-1 text-[11px] font-medium text-indigo-200/75 ring-1 ring-inset ring-indigo-500/32 sm:px-3 sm:py-1.5 sm:text-xs',
  validateBtnOk:
    'shrink-0 rounded-md bg-emerald-950/40 px-2.5 py-1 text-[11px] font-medium text-emerald-200/70 ring-1 ring-inset ring-emerald-500/32 sm:px-3 sm:py-1.5 sm:text-xs',
  validateBtnFail:
    'shrink-0 rounded-md bg-red-950/40 px-2.5 py-1 text-[11px] font-medium text-red-200/70 ring-1 ring-inset ring-red-500/32 sm:px-3 sm:py-1.5 sm:text-xs',
  validateBtnOkAffirmed: '',
  validateBtnFailAffirmed: '',
  transitionBoost: '',
  updatingText: 'font-mono text-[11px] text-indigo-200/80',
}

/** Pendiente de validación — azul / índigo operativo. */
const HOLOGRAM_CHROMATIC_PENDING: HologramChromaticVisual = {
  surface:
    'relative bg-gradient-to-b from-indigo-950/82 via-indigo-900/68 to-indigo-950/58 ring-1 ring-inset ring-indigo-400/62 shadow-[0_0_38px_-12px_rgba(99,102,241,0.52),inset_0_1px_0_0_rgba(129,140,248,0.28)]',
  beam: 'pointer-events-none absolute inset-x-[14%] top-0 h-12 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.42)_0%,transparent_62%)]',
  edgeHalo:
    'pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(129,140,248,0.42),inset_0_2px_34px_-8px_rgba(99,102,241,0.26)]',
  coupleGlow:
    'pointer-events-none absolute inset-x-[18%] bottom-0 h-5 bg-[radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.42)_0%,transparent_62%)]',
  volumeHalo:
    'pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_72%_52%_at_50%_6%,rgba(99,102,241,0.26)_0%,transparent_58%)]',
  innerReveal:
    'pointer-events-none absolute shadow-[inset_0_0_0_1px_rgba(129,140,248,0.26)]',
  innerCavity:
    'pointer-events-none absolute shadow-[inset_0_0_0_1px_rgba(99,102,241,0.14)]',
  eyebrow:
    'text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-300',
  title:
    'line-clamp-2 text-center text-lg font-bold leading-snug text-indigo-50 sm:text-xl',
  statusBadge:
    'rounded-full bg-indigo-900/55 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-indigo-100 ring-1 ring-inset ring-indigo-300/48',
  impactChip:
    'rounded-full bg-indigo-950/62 px-2 py-0.5 font-mono text-[11px] text-indigo-100 ring-1 ring-inset ring-indigo-400/52',
  actionsDivider: 'border-indigo-400/28',
  detailsBtn:
    'shrink-0 rounded-md bg-indigo-950/55 px-2.5 py-1 text-[11px] font-medium text-indigo-100 ring-1 ring-inset ring-indigo-400/45 transition-all duration-500 hover:bg-indigo-900/62 sm:px-3 sm:py-1.5 sm:text-xs',
  validateBtnOk:
    'shrink-0 rounded-md bg-emerald-950/48 px-2.5 py-1 text-[11px] font-medium text-emerald-100 ring-1 ring-inset ring-emerald-500/38 transition-all duration-500 hover:bg-emerald-900/55 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:py-1.5 sm:text-xs',
  validateBtnFail:
    'shrink-0 rounded-md bg-red-950/48 px-2.5 py-1 text-[11px] font-medium text-red-100 ring-1 ring-inset ring-red-500/38 transition-all duration-500 hover:bg-red-900/55 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:py-1.5 sm:text-xs',
  validateBtnOkAffirmed: 'bg-emerald-900/55 ring-2 ring-emerald-400/55',
  validateBtnFailAffirmed: 'bg-red-900/55 ring-2 ring-red-400/55',
  transitionBoost:
    'ring-2 ring-indigo-300/70 shadow-[0_0_44px_-8px_rgba(129,140,248,0.58),inset_0_0_28px_-6px_rgba(99,102,241,0.18)]',
  updatingText: 'font-mono text-[11px] text-indigo-200',
}

/** Cumplido — verde / teal confirmado. */
const HOLOGRAM_CHROMATIC_FULFILLED: HologramChromaticVisual = {
  surface:
    'relative bg-gradient-to-b from-emerald-950/84 via-teal-900/70 to-emerald-950/60 ring-1 ring-inset ring-emerald-400/62 shadow-[0_0_40px_-12px_rgba(45,212,191,0.5),inset_0_1px_0_0_rgba(52,211,153,0.28)]',
  beam: 'pointer-events-none absolute inset-x-[14%] top-0 h-12 bg-[radial-gradient(ellipse_at_top,rgba(45,212,191,0.4)_0%,transparent_62%)]',
  edgeHalo:
    'pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.42),inset_0_2px_34px_-8px_rgba(45,212,191,0.24)]',
  coupleGlow:
    'pointer-events-none absolute inset-x-[18%] bottom-0 h-5 bg-[radial-gradient(ellipse_at_bottom,rgba(45,212,191,0.4)_0%,transparent_62%)]',
  volumeHalo:
    'pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_72%_52%_at_50%_6%,rgba(45,212,191,0.24)_0%,transparent_58%)]',
  innerReveal:
    'pointer-events-none absolute shadow-[inset_0_0_0_1px_rgba(52,211,153,0.26)]',
  innerCavity:
    'pointer-events-none absolute shadow-[inset_0_0_0_1px_rgba(45,212,191,0.14)]',
  eyebrow:
    'text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300',
  title:
    'line-clamp-2 text-center text-lg font-bold leading-snug text-emerald-50 sm:text-xl',
  statusBadge:
    'rounded-full bg-emerald-900/58 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-100 ring-1 ring-inset ring-emerald-300/52',
  impactChip:
    'rounded-full bg-emerald-950/62 px-2 py-0.5 font-mono text-[11px] text-emerald-100 ring-1 ring-inset ring-emerald-400/52',
  actionsDivider: 'border-emerald-400/28',
  detailsBtn:
    'shrink-0 rounded-md bg-emerald-950/50 px-2.5 py-1 text-[11px] font-medium text-emerald-100/90 ring-1 ring-inset ring-emerald-500/38 transition-all duration-500 hover:bg-emerald-900/58 sm:px-3 sm:py-1.5 sm:text-xs',
  validateBtnOk:
    'shrink-0 rounded-md bg-emerald-900/62 px-2.5 py-1 text-[11px] font-medium text-emerald-50 ring-1 ring-inset ring-emerald-400/52 transition-all duration-500 hover:bg-emerald-800/68 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:py-1.5 sm:text-xs',
  validateBtnFail:
    'shrink-0 rounded-md bg-slate-950/45 px-2.5 py-1 text-[11px] font-medium text-slate-300 ring-1 ring-inset ring-slate-500/32 transition-all duration-500 hover:bg-slate-900/55 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:py-1.5 sm:text-xs',
  validateBtnOkAffirmed: 'bg-emerald-800/72 ring-2 ring-emerald-300/65 shadow-[0_0_16px_-6px_rgba(45,212,191,0.45)]',
  validateBtnFailAffirmed: '',
  transitionBoost:
    'ring-2 ring-emerald-300/72 shadow-[0_0_44px_-8px_rgba(45,212,191,0.55),inset_0_0_28px_-6px_rgba(52,211,153,0.2)]',
  updatingText: 'font-mono text-[11px] text-emerald-200',
}

/** Incumplido — rojo de alerta. */
const HOLOGRAM_CHROMATIC_BREACHED: HologramChromaticVisual = {
  surface:
    'relative bg-gradient-to-b from-red-950/86 via-red-900/72 to-red-950/62 ring-1 ring-inset ring-red-400/64 shadow-[0_0_42px_-12px_rgba(248,113,113,0.52),inset_0_1px_0_0_rgba(248,113,113,0.3)]',
  beam: 'pointer-events-none absolute inset-x-[14%] top-0 h-12 bg-[radial-gradient(ellipse_at_top,rgba(248,113,113,0.42)_0%,transparent_62%)]',
  edgeHalo:
    'pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.44),inset_0_2px_34px_-8px_rgba(239,68,68,0.26)]',
  coupleGlow:
    'pointer-events-none absolute inset-x-[18%] bottom-0 h-5 bg-[radial-gradient(ellipse_at_bottom,rgba(248,113,113,0.42)_0%,transparent_62%)]',
  volumeHalo:
    'pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_72%_52%_at_50%_6%,rgba(248,113,113,0.26)_0%,transparent_58%)]',
  innerReveal:
    'pointer-events-none absolute shadow-[inset_0_0_0_1px_rgba(248,113,113,0.26)]',
  innerCavity:
    'pointer-events-none absolute shadow-[inset_0_0_0_1px_rgba(239,68,68,0.14)]',
  eyebrow:
    'text-[10px] font-semibold uppercase tracking-[0.22em] text-red-300',
  title: 'line-clamp-2 text-center text-lg font-bold leading-snug text-red-50 sm:text-xl',
  statusBadge:
    'rounded-full bg-red-900/60 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-red-100 ring-1 ring-inset ring-red-300/54',
  impactChip:
    'rounded-full bg-red-950/64 px-2 py-0.5 font-mono text-[11px] text-red-100 ring-1 ring-inset ring-red-400/54',
  actionsDivider: 'border-red-400/30',
  detailsBtn:
    'shrink-0 rounded-md bg-red-950/50 px-2.5 py-1 text-[11px] font-medium text-red-100/90 ring-1 ring-inset ring-red-500/38 transition-all duration-500 hover:bg-red-900/58 sm:px-3 sm:py-1.5 sm:text-xs',
  validateBtnOk:
    'shrink-0 rounded-md bg-slate-950/45 px-2.5 py-1 text-[11px] font-medium text-slate-300 ring-1 ring-inset ring-slate-500/32 transition-all duration-500 hover:bg-slate-900/55 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:py-1.5 sm:text-xs',
  validateBtnFail:
    'shrink-0 rounded-md bg-red-900/64 px-2.5 py-1 text-[11px] font-medium text-red-50 ring-1 ring-inset ring-red-400/54 transition-all duration-500 hover:bg-red-800/72 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:py-1.5 sm:text-xs',
  validateBtnOkAffirmed: '',
  validateBtnFailAffirmed:
    'bg-red-800/74 ring-2 ring-red-300/68 shadow-[0_0_16px_-6px_rgba(248,113,113,0.48)]',
  transitionBoost:
    'ring-2 ring-red-300/72 shadow-[0_0_44px_-8px_rgba(248,113,113,0.58),inset_0_0_28px_-6px_rgba(239,68,68,0.22)]',
  updatingText: 'font-mono text-[11px] text-red-200',
}

const HOLOGRAM_CHROMATIC_BY_STATUS: Record<CommitmentStatus, HologramChromaticVisual> =
  {
    'Pendiente de validación': HOLOGRAM_CHROMATIC_PENDING,
    Cumplido: HOLOGRAM_CHROMATIC_FULFILLED,
    Incumplido: HOLOGRAM_CHROMATIC_BREACHED,
  }

export function getHologramChromaticVisual(
  status: CommitmentStatus,
): HologramChromaticVisual {
  return HOLOGRAM_CHROMATIC_BY_STATUS[status]
}

export { HOLOGRAM_CHROMATIC_TRANSITION }
