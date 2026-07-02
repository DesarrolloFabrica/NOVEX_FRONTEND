// Presentación de los estados de validación de un compromiso (solo UI).
// Sprint 7.2: sellos técnicos con contraste sobre cristal blanco.

import type { CommitmentStatus } from '@/modules/commitments/types/commitment.types'
import { CRYSTAL_STATUS_CHIP_BASE } from '@/modules/monitoring/constants/materialTheme'

/** Marco tipográfico de estado — registro técnico impreso. */
const INK_STATUS_FRAME =
  'px-1 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]'

/** Clases para el estado de validación — acentos operativos legibles. */
export const STATUS_BADGE_CLASSES: Record<CommitmentStatus, string> = {
  'Pendiente de validación':
    `${CRYSTAL_STATUS_CHIP_BASE} ${INK_STATUS_FRAME} text-amber-800 shadow-[inset_0_0_0_1px_rgba(180,83,9,0.45)]`,
  Cumplido:
    `${CRYSTAL_STATUS_CHIP_BASE} ${INK_STATUS_FRAME} text-emerald-800 shadow-[inset_0_0_0_1px_rgba(4,120,87,0.45)]`,
  Incumplido:
    `${CRYSTAL_STATUS_CHIP_BASE} ${INK_STATUS_FRAME} text-red-800 shadow-[inset_0_0_0_1px_rgba(185,28,28,0.45)]`,
}

/** Clase para metadatos de registro en expedientes. */
export const INK_DOSSIER_STATUS = INK_STATUS_FRAME
