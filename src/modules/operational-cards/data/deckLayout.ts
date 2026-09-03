import { deriveCharacterOrientation } from '@/modules/operational-cards/data/characterReaction'
import type { CharacterOrientation } from '@/modules/operational-cards/types/character.types'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'

/**
 * Geometría de la baraja, como función pura.
 *
 * La usan a la vez el deck —para renderizar— y la experiencia —para saber a
 * qué lado queda una carta y orientar al personaje—, de modo que la posición
 * visual y la reacción del personaje no pueden desincronizarse.
 *
 * El orden es siempre el `displayOrder` institucional: la posición de cada
 * coordinación es estable y da memoria espacial.
 */

/** Máximo de cartas por banda. Con 15 da 8 + 7; con 14, 7 + 7. */
const MAX_PER_BAND = 8

/** Desplazamiento vertical de los extremos de cada banda, en píxeles. */
const BAND_LIFT = 14

/** Inclinación de los extremos de cada banda, en grados. */
const BAND_TILT = 5

export interface DeckSlot {
  coordination: CoordinationOverview
  indexInBand: number
  bandSize: number
  /** Lado de la pantalla en el que cae la carta. */
  orientation: CharacterOrientation
  /** Elevación del extremo, en píxeles negativos hacia arriba. */
  lift: number
  /** Inclinación del extremo, en grados. */
  tilt: number
}

export interface DeckLayout {
  bands: DeckSlot[][]
  /** Orientación por `code`, para no recorrer las bandas en cada render. */
  orientationByCode: Readonly<Record<string, CharacterOrientation>>
}

function splitIntoBands<T>(items: readonly T[]): T[][] {
  if (items.length === 0) return []

  const bandCount = Math.ceil(items.length / MAX_PER_BAND)
  const bands: T[][] = []
  let cursor = 0

  for (let band = 0; band < bandCount; band += 1) {
    // Las bandas superiores se quedan con la carta extra: 15 -> 8 + 7.
    const size = Math.ceil((items.length - cursor) / (bandCount - band))
    bands.push(items.slice(cursor, cursor + size))
    cursor += size
  }

  return bands
}

export function buildDeckLayout(
  coordinations: readonly CoordinationOverview[],
  options: { excludeCode?: string | null } = {},
): DeckLayout {
  const ordered = [...coordinations]
    .filter((coordination) => coordination.code !== options.excludeCode)
    .sort((left, right) => left.displayOrder - right.displayOrder)

  const orientationByCode: Record<string, CharacterOrientation> = {}

  const bands = splitIntoBands(ordered).map((band) =>
    band.map((coordination, indexInBand) => {
      const bandSize = band.length
      const offset =
        bandSize <= 1
          ? 0
          : (indexInBand - (bandSize - 1) / 2) / ((bandSize - 1) / 2)
      const orientation = deriveCharacterOrientation(indexInBand, bandSize)
      orientationByCode[coordination.code] = orientation

      return {
        coordination,
        indexInBand,
        bandSize,
        orientation,
        lift: Number((-BAND_LIFT * offset * offset).toFixed(2)),
        tilt: Number((BAND_TILT * offset).toFixed(2)),
      }
    }),
  )

  return { bands, orientationByCode }
}
