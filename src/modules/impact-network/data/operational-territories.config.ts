/**
 * Territorios operacionales del mapa ejecutivo.
 *
 * MOCK VISUAL: las agrupaciones son una herramienta de composición cartográfica,
 * no una clasificación institucional. El backend todavía no expone sectores, así
 * que los nombres viven aquí (y solo aquí) para poder sustituirlos sin tocar
 * componentes ni CSS. Al llegar la clasificación real basta con reemplazar
 * OPERATIONAL_TERRITORIES y COORDINATION_PLACEMENTS.
 *
 * El mapa es UN terreno continuo. Los cuatro territorios son subdivisiones
 * internas de esa superficie, no plataformas independientes.
 */

import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'

/** Lienzo de referencia del mapa. El SVG se estira sobre el escenario real. */
export const OPERATIONAL_MAP_VIEWBOX = { width: 1200, height: 760 } as const

export type TerritoryPoint = readonly [number, number]

/** Tonos cartográficos. Nunca comunican gravedad, solo pertenencia territorial. */
export type OperationalTerritoryTone = 'cyan' | 'green' | 'violet' | 'deep'

export interface OperationalTerritoryLabelAnchor {
  /** Fracción 0..1 del ancho del escenario. */
  x: number
  /** Fracción 0..1 del alto del escenario. */
  y: number
  align: 'left' | 'right'
}

export interface OperationalTerritory {
  id: string
  sectorCode: string
  label: string
  tone: OperationalTerritoryTone
  /**
   * Contorno semántico de la región, teselado con las vecinas.
   * No se pinta como isla: sirve para anclar etiquetas y validar pertenencia.
   */
  outline: readonly TerritoryPoint[]
  labelAnchor: OperationalTerritoryLabelAnchor
}

export interface CoordinationMapPlacement {
  coordinationId: CoordinationId
  territoryId: string
  /** Fracción 0..1 del ancho del escenario. */
  x: number
  /** Fracción 0..1 del alto del escenario. */
  y: number
}

/**
 * Costa del mapa institucional. Una sola superficie irregular detrás de todas
 * las coordinaciones: el terreno continúa de una región a otra.
 */
export const OPERATIONAL_TERRAIN_OUTLINE: readonly TerritoryPoint[] = [
  [48, 400],
  [42, 300],
  [58, 190],
  [110, 110],
  [220, 62],
  [360, 48],
  [600, 50],
  [740, 44],
  [880, 62],
  [1020, 88],
  [1120, 140],
  [1168, 230],
  [1164, 400],
  [1170, 500],
  [1130, 600],
  [1040, 680],
  [900, 722],
  [600, 728],
  [440, 736],
  [280, 710],
  [140, 640],
  [64, 520],
]

/** Cruce interno: divide el terreno sin romperlo. */
const DIVIDER_NORTH_SOUTH: readonly TerritoryPoint[] = [
  [600, 50],
  [572, 130],
  [618, 210],
  [588, 300],
  [600, 400],
  [632, 500],
  [578, 600],
  [600, 728],
]

const DIVIDER_WEST_EAST: readonly TerritoryPoint[] = [
  [48, 400],
  [150, 382],
  [270, 418],
  [400, 388],
  [600, 400],
  [760, 418],
  [900, 378],
  [1040, 412],
  [1164, 400],
]

/** Fronteras internas: polilíneas abiertas, nunca conexiones entre islas. */
export const OPERATIONAL_INTERNAL_BORDERS: readonly (readonly TerritoryPoint[])[] =
  [DIVIDER_NORTH_SOUTH, DIVIDER_WEST_EAST]

export const OPERATIONAL_TERRITORIES: readonly OperationalTerritory[] = [
  {
    id: 'territory-academic',
    sectorCode: '01',
    label: 'Operación académica',
    tone: 'cyan',
    outline: [
      [48, 400],
      [42, 300],
      [58, 190],
      [110, 110],
      [220, 62],
      [360, 48],
      [600, 50],
      [572, 130],
      [618, 210],
      [588, 300],
      [600, 400],
      [400, 388],
      [270, 418],
      [150, 382],
    ],
    labelAnchor: { x: 0.38, y: 0.28, align: 'left' },
  },
  {
    id: 'territory-development',
    sectorCode: '02',
    label: 'Desarrollo y servicios',
    tone: 'green',
    outline: [
      [600, 50],
      [740, 44],
      [880, 62],
      [1020, 88],
      [1120, 140],
      [1168, 230],
      [1164, 400],
      [1040, 412],
      [900, 378],
      [760, 418],
      [600, 400],
      [588, 300],
      [618, 210],
      [572, 130],
    ],
    labelAnchor: { x: 0.94, y: 0.24, align: 'right' },
  },
  {
    id: 'territory-production',
    sectorCode: '03',
    label: 'Apoyo y soporte',
    tone: 'violet',
    outline: [
      [48, 400],
      [64, 520],
      [140, 640],
      [280, 710],
      [440, 736],
      [600, 728],
      [578, 600],
      [632, 500],
      [600, 400],
      [400, 388],
      [270, 418],
      [150, 382],
    ],
    labelAnchor: { x: 0.36, y: 0.86, align: 'left' },
  },
  {
    id: 'territory-schools',
    sectorCode: '04',
    label: 'Transversales',
    tone: 'deep',
    outline: [
      [1164, 400],
      [1170, 500],
      [1130, 600],
      [1040, 680],
      [900, 722],
      [600, 728],
      [578, 600],
      [632, 500],
      [600, 400],
      [760, 418],
      [900, 378],
      [1040, 412],
    ],
    labelAnchor: { x: 0.92, y: 0.7, align: 'right' },
  },
]

/**
 * Posición base de cada coordinación. Sostiene la memoria espacial del usuario:
 * "Homologaciones siempre está aquí". El estado cambia la apariencia, jamás esto.
 *
 * Fábrica queda cerca del centro visual; el resto se reparte con irregularidad
 * controlada sobre el mismo terreno, no en cuatro grupos aislados.
 */
export const COORDINATION_PLACEMENTS: readonly CoordinationMapPlacement[] = [
  // Operación académica
  {
    coordinationId: 'coord-homologaciones',
    territoryId: 'territory-academic',
    x: 0.14,
    y: 0.18,
  },
  {
    coordinationId: 'coord-saber-pro',
    territoryId: 'territory-academic',
    x: 0.4,
    y: 0.16,
  },
  {
    coordinationId: 'coord-operaciones-academicas',
    territoryId: 'territory-academic',
    x: 0.28,
    y: 0.38,
  },
  {
    coordinationId: 'coord-especializaciones',
    territoryId: 'territory-academic',
    x: 0.1,
    y: 0.4,
  },

  // Desarrollo y servicios
  {
    coordinationId: 'coord-b2b',
    territoryId: 'territory-development',
    x: 0.62,
    y: 0.16,
  },
  {
    coordinationId: 'coord-desarrollo-profesional',
    territoryId: 'territory-development',
    x: 0.8,
    y: 0.16,
  },
  {
    coordinationId: 'coord-empresarial',
    territoryId: 'territory-development',
    x: 0.9,
    y: 0.38,
  },
  {
    coordinationId: 'coord-negocios',
    territoryId: 'territory-development',
    x: 0.7,
    y: 0.38,
  },

  // Apoyo y soporte · Fábrica como ancla visual del panorama
  {
    coordinationId: 'coord-fabrica-contenidos',
    territoryId: 'territory-production',
    x: 0.47,
    y: 0.54,
  },
  {
    coordinationId: 'coord-servicios',
    territoryId: 'territory-production',
    x: 0.2,
    y: 0.6,
  },
  {
    coordinationId: 'coord-proyeccion-social',
    territoryId: 'territory-production',
    x: 0.14,
    y: 0.82,
  },

  // Transversales y especializados
  {
    coordinationId: 'coord-ingenierias',
    territoryId: 'territory-schools',
    x: 0.65,
    y: 0.6,
  },
  {
    coordinationId: 'coord-bellas-artes',
    territoryId: 'territory-schools',
    x: 0.88,
    y: 0.62,
  },
  {
    coordinationId: 'coord-transversales',
    territoryId: 'territory-schools',
    x: 0.78,
    y: 0.82,
  },
]

/** Reserva para catálogos que crezcan más allá del mock: reparte sin solapar. */
export const FALLBACK_PLACEMENTS: readonly Omit<
  CoordinationMapPlacement,
  'coordinationId'
>[] = [
  { territoryId: 'territory-academic', x: 0.4, y: 0.24 },
  { territoryId: 'territory-development', x: 0.78, y: 0.24 },
  { territoryId: 'territory-production', x: 0.38, y: 0.68 },
  { territoryId: 'territory-schools', x: 0.82, y: 0.68 },
  { territoryId: 'territory-production', x: 0.36, y: 0.8 },
  { territoryId: 'territory-academic', x: 0.2, y: 0.12 },
]

const territoryById = new Map(
  OPERATIONAL_TERRITORIES.map((territory) => [territory.id, territory]),
)

const placementByCoordinationId = new Map(
  COORDINATION_PLACEMENTS.map((placement) => [
    placement.coordinationId,
    placement,
  ]),
)

export function getOperationalTerritory(
  territoryId: string,
): OperationalTerritory | null {
  return territoryById.get(territoryId) ?? null
}

export function getCoordinationPlacement(
  coordinationId: CoordinationId,
): CoordinationMapPlacement | null {
  return placementByCoordinationId.get(coordinationId) ?? null
}

export function territoryOutlinePath(
  outline: readonly TerritoryPoint[],
): string {
  if (outline.length === 0) return ''
  const [start, ...rest] = outline
  const segments = rest.map(([x, y]) => `L${x} ${y}`).join(' ')
  return `M${start[0]} ${start[1]} ${segments} Z`.replace(/\s+/g, ' ').trim()
}

export function territoryPolylinePath(
  points: readonly TerritoryPoint[],
): string {
  if (points.length === 0) return ''
  const [start, ...rest] = points
  const segments = rest.map(([x, y]) => `L${x} ${y}`).join(' ')
  return `M${start[0]} ${start[1]} ${segments}`.replace(/\s+/g, ' ').trim()
}

export interface TerritoryBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function territoryBounds(
  outline: readonly TerritoryPoint[],
): TerritoryBounds {
  return outline.reduce<TerritoryBounds>(
    (bounds, [x, y]) => ({
      minX: Math.min(bounds.minX, x),
      minY: Math.min(bounds.minY, y),
      maxX: Math.max(bounds.maxX, x),
      maxY: Math.max(bounds.maxY, y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  )
}

function territoryCentroid(
  outline: readonly TerritoryPoint[],
): TerritoryPoint {
  const total = outline.reduce(
    (sum, [x, y]) => ({ x: sum.x + x, y: sum.y + y }),
    { x: 0, y: 0 },
  )
  return [total.x / outline.length, total.y / outline.length]
}

const round = (value: number) => Math.round(value * 10) / 10

/**
 * Curvas de nivel del terreno continuo. Explican el relieve sin insinuar
 * conexiones entre coordinaciones: siempre transversales y recortadas a la costa.
 */
export function territoryContourPaths(
  outline: readonly TerritoryPoint[],
  lines: number,
): readonly string[] {
  const { minX, minY, maxX, maxY } = territoryBounds(outline)
  const width = maxX - minX
  const height = maxY - minY
  const midX = minX + width / 2

  return Array.from({ length: lines }, (_, index) => {
    const ratio = (index + 1) / (lines + 1)
    const y = minY + height * ratio
    const amplitude = height * 0.045 * (index % 2 === 0 ? 1 : -1)

    return [
      `M${round(minX - width * 0.02)} ${round(y + amplitude * 0.5)}`,
      `C${round(minX + width * 0.24)} ${round(y + amplitude)}`,
      `${round(midX - width * 0.12)} ${round(y - amplitude)}`,
      `${round(midX)} ${round(y)}`,
      `S${round(maxX - width * 0.16)} ${round(y + amplitude * 1.15)}`,
      `${round(maxX + width * 0.02)} ${round(y - amplitude * 0.35)}`,
    ].join(' ')
  })
}

/** Pequeños nodos cartográficos derivados de la costa del terreno. */
export function territoryMarkerPoints(
  outline: readonly TerritoryPoint[],
): readonly TerritoryPoint[] {
  const [centerX, centerY] = territoryCentroid(outline)

  return outline
    .map(([x, y], index) => {
      const [nextX, nextY] = outline[(index + 1) % outline.length]
      const midX = (x + nextX) / 2
      const midY = (y + nextY) / 2
      return [
        round(midX + (centerX - midX) * 0.08),
        round(midY + (centerY - midY) * 0.08),
      ] as TerritoryPoint
    })
    .filter((_, index) => index % 2 === 0)
}

/** Validación de composición: la coordinación debe caer dentro de su territorio. */
export function isPointInsideTerritory(
  outline: readonly TerritoryPoint[],
  normalizedX: number,
  normalizedY: number,
): boolean {
  const x = normalizedX * OPERATIONAL_MAP_VIEWBOX.width
  const y = normalizedY * OPERATIONAL_MAP_VIEWBOX.height
  let inside = false

  for (
    let current = 0, previous = outline.length - 1;
    current < outline.length;
    previous = current++
  ) {
    const [currentX, currentY] = outline[current]
    const [previousX, previousY] = outline[previous]
    const crossesRay = currentY > y !== previousY > y
    if (!crossesRay) continue

    const intersectionX =
      currentX +
      ((y - currentY) * (previousX - currentX)) / (previousY - currentY)
    if (x < intersectionX) inside = !inside
  }

  return inside
}
