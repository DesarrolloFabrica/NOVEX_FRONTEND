import { findCoordinationIconAsset } from '@/modules/impact-network/data/coordination-icons.config'
import { PRODUCT_TOP_LEVEL } from '@/modules/operational-cards/data/productHierarchy'
import {
  resolveSituationViewpointLabel,
  type SituationViewpointLabel,
} from '@/modules/operational-cards/data/situationViewpoint'
import type { SituationReportKind } from '@/modules/situations/types/situation.types'

/**
 * MARCA LATERAL de una fila de problema: qué coordinación representa y cómo se
 * dice en texto.
 *
 *   INTERNAL                        → la responsable (`coordinationCode`).
 *   INTER vista desde una carta     → LA OTRA respecto de la carta consultada:
 *                                     si la carta es la afectada, la
 *                                     responsable; si es la responsable, la
 *                                     afectada.
 *   INTER en «Mis reportes»         → logo de la responsable; el texto declara
 *                                     afectada y responsable cuando ambas
 *                                     existen.
 *
 * Cuando el significado no se puede resolver con seguridad —falta el code, la
 * carta consultada no es ninguna de las dos partes, o el code no tiene logo
 * propio— la marca es NEUTRA (`asset: null`). Nunca se sustituye por el logo de
 * Coordinación General ni de ninguna otra.
 */

/**
 * `artCode` de producto: el nodo que toma prestado el arte de otro code
 * (Servicio → `coord-servicios` sobre la fila `coord-homologaciones`).
 */
const ART_CODE_BY_CODE: ReadonlyMap<string, string> = new Map(
  PRODUCT_TOP_LEVEL.flatMap((node) =>
    node.artCode ? [[node.code, node.artCode] as const] : [],
  ),
)

/**
 * Codes cuyo arte propio lo exhibe OTRA carta. Su logo identificaría a quien
 * lo tomó prestado —el problema de `coord-servicios` se leería como de
 * «Servicio»/Homologaciones—, así que se presentan con marca neutra y su nombre
 * en texto.
 */
const ART_LENT_TO_OTHER: ReadonlySet<string> = new Set(
  [...ART_CODE_BY_CODE.values()].filter((code) => !ART_CODE_BY_CODE.has(code)),
)

/** Logo de fila para un code, respetando `artCode`; `null` = marca neutra. */
export function resolveCoordinationMarkAsset(
  code: string | null | undefined,
): string | null {
  if (!code) return null
  if (ART_LENT_TO_OTHER.has(code)) return null
  return findCoordinationIconAsset(ART_CODE_BY_CODE.get(code) ?? code)
}

/**
 * Relación de la coordinación representada con el problema.
 *
 *   internal     problema interno: la representada es la responsable.
 *   affects-us   INTER desde la afectada: la representada es la responsable.
 *   we-resolve   INTER desde la responsable: la representada es la afectada.
 *   responsible  INTER en «Mis reportes»: la representada es la responsable.
 *   unresolved   no se puede decir con seguridad cuál representar.
 */
export type ProblemMarkRelation =
  | 'internal'
  | 'affects-us'
  | 'we-resolve'
  | 'responsible'
  | 'unresolved'

export interface ProblemMarkInput {
  reportKind: SituationReportKind | null | undefined
  coordinationCode: string | null | undefined
  affectedCoordinationCode: string | null | undefined
  /**
   * Carta o coordinación consultada. `null` en «Mis reportes», que no tiene
   * punto de vista.
   */
  viewpointCode: string | null
  /** Nombres de presentación por code (producto o `shortName`). */
  labelByCode?: Readonly<Record<string, string>>
  /** Nombres del DTO, solo como último recurso para el texto. */
  coordinationName?: string | null
  affectedCoordinationName?: string | null
}

export interface ProblemMark {
  /** Code de la coordinación representada; `null` si no se pudo resolver. */
  code: string | null
  /** Logo; `null` pinta la marca neutra. */
  asset: string | null
  relation: ProblemMarkRelation
  kindLabel: SituationViewpointLabel
  /** Nombre legible de la representada. */
  coordinationLabel: string
  /** Línea VISIBLE bajo el título: tipo y coordinación. */
  originLine: string
  /** Rol de la representada, para el nombre accesible. */
  roleLabel: 'Coordinación responsable' | 'Coordinación afectada' | null
}

const SIN_COORDINACION = 'Sin coordinación'
const NO_IDENTIFICADA = 'coordinación no identificada'

function labelFor(
  code: string | null,
  input: ProblemMarkInput,
): string | null {
  if (!code) return null
  const product = input.labelByCode?.[code]
  if (product) return product
  if (code === input.coordinationCode && input.coordinationName) {
    return input.coordinationName
  }
  if (code === input.affectedCoordinationCode && input.affectedCoordinationName) {
    return input.affectedCoordinationName
  }
  return null
}

export function resolveProblemMark(input: ProblemMarkInput): ProblemMark {
  const kind = input.reportKind ?? 'INTERNAL'
  const responsible = input.coordinationCode ?? null
  const affected = input.affectedCoordinationCode ?? null
  const viewpoint = input.viewpointCode
  const kindLabel = resolveSituationViewpointLabel({
    reportKind: kind,
    selectedCoordinationCode: viewpoint,
    responsibleCode: responsible,
    affectedCode: affected,
  })

  const build = (
    code: string | null,
    relation: ProblemMarkRelation,
    line: (label: string) => string,
    roleLabel: ProblemMark['roleLabel'],
  ): ProblemMark => {
    const coordinationLabel =
      labelFor(code, input) ?? (code ? NO_IDENTIFICADA : SIN_COORDINACION)
    return {
      code,
      asset: resolveCoordinationMarkAsset(code),
      relation,
      kindLabel,
      coordinationLabel,
      originLine: line(coordinationLabel),
      roleLabel,
    }
  }

  if (kind !== 'INTER_COORDINATION') {
    return build(
      responsible,
      'internal',
      (label) => `Problema interno · ${label}`,
      responsible ? 'Coordinación responsable' : null,
    )
  }

  if (viewpoint === null) {
    const responsibleLabel =
      labelFor(responsible, input) ??
      (responsible ? NO_IDENTIFICADA : SIN_COORDINACION)
    const affectedLabel =
      labelFor(affected, input) ??
      (affected ? NO_IDENTIFICADA : SIN_COORDINACION)
    return {
      code: responsible,
      asset: resolveCoordinationMarkAsset(responsible),
      relation: 'responsible',
      kindLabel,
      coordinationLabel: responsibleLabel,
      originLine:
        affected && responsible
          ? `Afectada: ${affectedLabel} · Responsable: ${responsibleLabel}`
          : `Dependencia · Coordinación responsable: ${responsibleLabel}`,
      roleLabel: 'Coordinación responsable',
    }
  }

  if (viewpoint === affected && viewpoint !== responsible && responsible) {
    return build(
      responsible,
      'affects-us',
      (label) => `Nos afecta desde ${label}`,
      'Coordinación responsable',
    )
  }

  if (viewpoint === responsible && viewpoint !== affected && affected) {
    return build(
      affected,
      'we-resolve',
      (label) => `Debemos resolver para ${label}`,
      'Coordinación afectada',
    )
  }

  // La carta no es ninguna de las dos partes o falta la otra: no se adivina.
  return {
    code: null,
    asset: null,
    relation: 'unresolved',
    kindLabel,
    coordinationLabel: NO_IDENTIFICADA,
    originLine: `Dependencia · ${NO_IDENTIFICADA}`,
    roleLabel: null,
  }
}

/** Nombre accesible común a las filas: título, tipo, coordinación, gravedad, estado. */
export function buildProblemRowAccessibleName(input: {
  title: string
  mark: ProblemMark
  severityLabel: string
  statusLabel: string
}): string {
  const { mark } = input
  const coordination = mark.roleLabel
    ? `${mark.roleLabel}: ${mark.coordinationLabel}`
    : mark.coordinationLabel.charAt(0).toUpperCase() +
      mark.coordinationLabel.slice(1)
  return `${input.title}. ${mark.kindLabel}. ${coordination}. Severidad ${input.severityLabel}. ${input.statusLabel}.`
}
