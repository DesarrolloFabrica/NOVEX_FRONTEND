import type {
  SituationReportKind,
  SituationSeverity,
} from '@/modules/situations/types/situation.types'
import {
  resolveIslandColor,
  type CoordinationId,
} from '@/modules/impact-network/data/coordination-islands.config'

/**
 * Presentación compartida de fichas de problema (Mis reportes / coordinación).
 * Solo etiquetas y avisos; no recalcula SLA ni inventa severidad.
 */

export const DOSSIER_SEVERITY_LABEL = {
  CRITICAL: 'Crítica',
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
} as const satisfies Record<SituationSeverity, string>

/** Estados de bandeja activa (LEVEL 1). */
export const DOSSIER_ACTIVE_STATUS_LABEL = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En atención',
} as const

/** Historial «Mis reportes»: incluye cierre. */
export const DOSSIER_HISTORY_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En atención',
  RESOLVED: 'En atención',
  CLOSED: 'Cerrado',
}

export type DossierSlaHealth = 'on_track' | 'at_risk' | 'overdue' | 'closed'

export type DossierTypeKey = 'internal' | 'dependency'

/** Distintivo breve de tipo; independiente del color de coordinación. */
export function resolveDossierTypeBadge(
  reportKind: SituationReportKind | null | undefined,
): { key: DossierTypeKey; label: string } {
  if (reportKind === 'INTER_COORDINATION') {
    return { key: 'dependency', label: 'Dependencia' }
  }
  return { key: 'internal', label: 'Interno' }
}

/** Solo aviso cuando hay riesgo o vencimiento; en plazo no se pinta alerta. */
export function resolveDossierSlaNotice(
  slaHealth: DossierSlaHealth | null | undefined,
): { tone: 'at_risk' | 'overdue'; label: string } | null {
  if (slaHealth === 'overdue') {
    return { tone: 'overdue', label: 'SLA vencido' }
  }
  if (slaHealth === 'at_risk') {
    return { tone: 'at_risk', label: 'SLA en riesgo' }
  }
  return null
}

/** Fragmento ornamental del id (talón), sin exponer el UUID completo. */
export function formatDossierFolio(id: string): string {
  const compact = id.replace(/[^a-zA-Z0-9]/g, '')
  const tail = compact.slice(-4).toUpperCase() || '····'
  return `Nº ${tail}`
}

export function isDossierClosedStatus(status: string): boolean {
  return status === 'CLOSED'
}

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

function normalizeHex(hex: string): string | null {
  const trimmed = hex.trim()
  if (!HEX.test(trimmed)) return null
  if (trimmed.length === 4) {
    const [, r, g, b] = trimmed
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return trimmed.toLowerCase()
}

function channelToLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(hex: string): number {
  const full = normalizeHex(hex)?.slice(1)
  if (!full) return 0
  const value = Number.parseInt(full, 16)
  const r = channelToLinear((value >> 16) & 255)
  const g = channelToLinear((value >> 8) & 255)
  const b = channelToLinear(value & 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function mixTowardBlack(hex: string, amount: number): string {
  const full = normalizeHex(hex)?.slice(1)
  if (!full) return hex
  const value = Number.parseInt(full, 16)
  const mix = (channel: number) =>
    Math.round(channel * (1 - amount))
      .toString(16)
      .padStart(2, '0')
  const r = mix((value >> 16) & 255)
  const g = mix((value >> 8) & 255)
  const b = mix(value & 255)
  return `#${r}${g}${b}`
}

/**
 * Color de identidad de la coordinación representada (la del logo/mark).
 * Fuente: catálogo de islas + color de overview si hace falta. Null = talón neutro.
 */
export function resolveDossierCoordinationColor(
  code: string | null | undefined,
  backendColor?: string | null,
): string | null {
  if (!code) return null
  const resolved = resolveIslandColor(
    code as CoordinationId,
    backendColor?.trim() || '',
  )
  return normalizeHex(resolved)
}

export interface DossierStubStyle {
  /** Hex de fondo del talón; null → CSS neutro. */
  background: string | null
  /** Tinta del número vertical. */
  ink: string
  /** Si el fondo se profundizó para ganar contraste. */
  deepened: boolean
}

/**
 * Estilo del talón: identidad de coordinación, nunca severidad.
 * El número debe quedar legible (tinta clara u oscura; si hace falta, fondo más profundo).
 */
export function resolveDossierStubStyle(
  coordinationColor: string | null | undefined,
): DossierStubStyle {
  const background = coordinationColor
    ? normalizeHex(coordinationColor)
    : null
  if (!background) {
    return { background: null, ink: '#5c4a38', deepened: false }
  }

  const darkInk = '#1a1410'
  const lightInk = '#fff8ef'
  const lum = relativeLuminance(background)

  if (lum >= 0.62) {
    return { background, ink: darkInk, deepened: false }
  }
  if (lum <= 0.28) {
    return { background, ink: lightInk, deepened: false }
  }

  return {
    background: mixTowardBlack(background, 0.28),
    ink: lightInk,
    deepened: true,
  }
}
