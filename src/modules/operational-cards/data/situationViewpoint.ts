import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import type { SituationReportKind } from '@/modules/situations/types/situation.types'

/**
 * Etiqueta de un problema según el punto de vista de la carta observada.
 *
 *   INTERNAL                         → «Problema interno»
 *   INTER + carta = afectada         → «Dependencia que nos afecta»
 *   INTER + carta = responsable      → «Problema que debemos resolver para otra coordinación»
 *   Mis reportes / sin carta         → etiqueta neutra por kind
 */
export type SituationViewpointLabel =
  | 'Problema interno'
  | 'Dependencia que nos afecta'
  | 'Problema que debemos resolver para otra coordinación'
  | 'Dependencia entre coordinaciones'

export function resolveSituationViewpointLabel(input: {
  reportKind: SituationReportKind | null | undefined
  selectedCoordinationCode: string | null | undefined
  responsibleCode: string | null | undefined
  affectedCode: string | null | undefined
}): SituationViewpointLabel {
  const kind = input.reportKind ?? 'INTERNAL'
  if (kind !== 'INTER_COORDINATION') return 'Problema interno'

  const selected = input.selectedCoordinationCode
  if (selected && input.affectedCode === selected) {
    return 'Dependencia que nos afecta'
  }
  if (selected && input.responsibleCode === selected) {
    return 'Problema que debemos resolver para otra coordinación'
  }
  return 'Dependencia entre coordinaciones'
}

/**
 * Clave de borrador unificado por coordinación.
 * INTERNAL e INTER comparten el mismo texto común; el tipo vive en
 * `reportFormKind` y no fragmenta el borrador.
 */
export function reportDraftKey(
  code: CoordinationId | null,
  _kind?: SituationReportKind,
): string {
  return `${code ?? 'none'}:unified`
}

/**
 * Clave de idempotencia: incluye el tipo para no reutilizar un intento
 * INTERNAL como INTER (o al revés) con la misma huella.
 */
export function reportRequestKey(
  code: CoordinationId | null,
  kind: SituationReportKind,
): string {
  return `${reportDraftKey(code)}:${kind}`
}

/** Claves legadas pre-02F (`:INTERNAL` / `:INTER_COORDINATION`). */
export function legacyReportDraftKeys(
  code: CoordinationId | null,
): readonly string[] {
  const base = code ?? 'none'
  return [`${base}:INTERNAL`, `${base}:INTER_COORDINATION`] as const
}
