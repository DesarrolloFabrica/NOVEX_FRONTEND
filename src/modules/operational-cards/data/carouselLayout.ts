import type { CharacterOrientation } from '@/modules/operational-cards/types/character.types'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'

/**
 * Carrusel circular del modo seleccionado.
 *
 * Sustituye a la mano de 14 cartas: mostrarlas todas a la vez obligaba a
 * miniaturizarlas. Aquí se ven **cinco** alternativas grandes y las 15
 * coordinaciones siguen alcanzables recorriendo el carrusel, sin volver a la
 * Dirección de Operaciones.
 *
 * Función pura: la usan el carrusel para renderizar y la experiencia para
 * orientar al personaje, así que posición visual y reacción no pueden
 * desincronizarse. Referencia visual una galería circular; implementación DOM
 * con Motion, sin WebGL ni dependencias nuevas.
 */

/** Slots visibles. El 0 es el frontal. */
export const CAROUSEL_SLOTS = [-2, -1, 0, 1, 2] as const

export type CarouselSlotIndex = (typeof CAROUSEL_SLOTS)[number]

/** Geometría por slot. Curva continua, sin coverflow ni perspectiva extrema. */
const SLOT_GEOMETRY: Record<
  CarouselSlotIndex,
  { rotate: number; y: number; scale: number; z: number }
> = {
  [-2]: { rotate: -18, y: 16, scale: 0.9, z: 1 },
  [-1]: { rotate: -9, y: 2, scale: 0.95, z: 2 },
  0: { rotate: 0, y: -10, scale: 1, z: 3 },
  1: { rotate: 9, y: 2, scale: 0.95, z: 2 },
  2: { rotate: 18, y: 16, scale: 0.9, z: 1 },
}

/** Avance horizontal entre slots contiguos, en píxeles. */
const SLOT_PITCH = 162

export interface CarouselSlot {
  coordination: CoordinationOverview
  slot: CarouselSlotIndex
  /** Índice dentro de la lista de alternativas, para navegar. */
  index: number
  orientation: CharacterOrientation
  x: number
  y: number
  rotate: number
  scale: number
  zIndex: number
}

export interface CarouselLayout {
  slots: CarouselSlot[]
  /** Alternativas totales: las 15 menos la activa. */
  total: number
  /** Posición 1-based del slot frontal, para el indicador compacto. */
  position: number
  orientationByCode: Readonly<Record<string, CharacterOrientation>>
}

function orientationOf(slot: CarouselSlotIndex): CharacterOrientation {
  if (slot < 0) return 'LEFT'
  if (slot > 0) return 'RIGHT'
  return 'NEUTRAL'
}

/** Índice cíclico: tras la última viene la primera y antes de la primera, la última. */
export function wrapIndex(index: number, total: number): number {
  if (total <= 0) return 0
  return ((index % total) + total) % total
}

/**
 * Alternativas a una coordinación: las demás, en orden institucional.
 * La activa nunca aparece, así que no se duplica en el carrusel.
 */
export function buildAlternatives(
  coordinations: readonly CoordinationOverview[],
  activeCode: string,
): CoordinationOverview[] {
  return [...coordinations]
    .filter((coordination) => coordination.code !== activeCode)
    .sort((left, right) => left.displayOrder - right.displayOrder)
}

/**
 * Centro inicial: la coordinación que sigue institucionalmente a la activa.
 * Así al seleccionar una carta el carrusel se recentra donde el usuario está
 * mirando, en vez de conservar un desplazamiento arbitrario.
 */
export function resolveInitialCenter(
  alternatives: readonly CoordinationOverview[],
  activeDisplayOrder: number,
): number {
  if (alternatives.length === 0) return 0
  const next = alternatives.findIndex(
    (coordination) => coordination.displayOrder > activeDisplayOrder,
  )
  return next === -1 ? 0 : next
}

export function buildCarouselLayout(
  alternatives: readonly CoordinationOverview[],
  center: number,
): CarouselLayout {
  const total = alternatives.length
  const orientationByCode: Record<string, CharacterOrientation> = {}

  if (total === 0) {
    return { slots: [], total: 0, position: 0, orientationByCode }
  }

  const safeCenter = wrapIndex(center, total)

  const slots = CAROUSEL_SLOTS.flatMap((slot) => {
    // Con menos de cinco alternativas no se repite ninguna carta.
    if (Math.abs(slot) * 2 >= total && total < CAROUSEL_SLOTS.length) return []

    const index = wrapIndex(safeCenter + slot, total)
    const coordination = alternatives[index]
    const geometry = SLOT_GEOMETRY[slot]
    const orientation = orientationOf(slot)
    orientationByCode[coordination.code] = orientation

    return [
      {
        coordination,
        slot,
        index,
        orientation,
        x: slot * SLOT_PITCH,
        y: geometry.y,
        rotate: geometry.rotate,
        scale: geometry.scale,
        zIndex: geometry.z,
      },
    ]
  })

  return {
    slots,
    total,
    position: safeCenter + 1,
    orientationByCode,
  }
}
