import { NOVEX_EYE_CENTER, NOVEX_LOOK_LIMIT } from '@/shared/character/novexCharacterRive'

/**
 * Matemática de la mirada y del parpadeo, sin React ni Rive: se prueba sola.
 */

export interface Point {
  x: number
  y: number
}

export interface RectLike {
  left: number
  top: number
  width: number
  height: number
}

export interface GazeMapping {
  /** Límite por eje en unidades del `.riv`. */
  limit: number
  /**
   * Distancia (px) a la que la mirada alcanza ~76 % del límite (tanh(1)).
   * Cerca del personaje responde rápido; lejos se satura sin pasar del límite.
   */
  reachPx: number
  /** Centro de los ojos en fracciones de la caja del canvas. */
  eyeCenter: Point
}

export const DEFAULT_GAZE_MAPPING: Omit<GazeMapping, 'reachPx'> = {
  limit: NOVEX_LOOK_LIMIT,
  eyeCenter: NOVEX_EYE_CENTER,
}

/** Fracción de la dimensión mayor del viewport usada como alcance por defecto. */
export const DEFAULT_REACH_VIEWPORT_RATIO = 0.3

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Punto de referencia: los ojos del personaje, no el centro geométrico del aro. */
export function eyeAnchor(rect: RectLike, eyeCenter: Point): Point {
  return {
    x: rect.left + rect.width * eyeCenter.x,
    y: rect.top + rect.height * eyeCenter.y,
  }
}

/**
 * cursor global → vector desde los ojos → magnitud saturada (tanh) → rango Rive.
 *
 * Se conserva la dirección del vector y solo se comprime su longitud, así las
 * diagonales no se aplastan contra las esquinas. El clamp final por eje es la
 * garantía de que jamás sale un valor fuera de ±limit.
 */
export function gazeTarget(pointer: Point, rect: RectLike, mapping: GazeMapping): Point {
  const anchor = eyeAnchor(rect, mapping.eyeCenter)
  const dx = pointer.x - anchor.x
  const dy = pointer.y - anchor.y
  const distance = Math.hypot(dx, dy)
  if (distance === 0 || mapping.reachPx <= 0) return { x: 0, y: 0 }

  const magnitude = Math.tanh(distance / mapping.reachPx) * mapping.limit
  return {
    x: clamp((dx / distance) * magnitude, -mapping.limit, mapping.limit),
    y: clamp((dy / distance) * magnitude, -mapping.limit, mapping.limit),
  }
}

/**
 * Factor de lerp independiente de los fps: `current += (target - current) * f`
 * con f = 1 - e^(-dt/τ). A 60 fps y τ = 70 ms, f ≈ 0,21 por frame.
 */
export function smoothingFactor(dtMs: number, timeConstantMs: number): number {
  if (timeConstantMs <= 0) return 1
  return 1 - Math.exp(-Math.max(0, dtMs) / timeConstantMs)
}

/** Siguiente espera del parpadeo, uniforme en [min, max]. */
export function nextBlinkDelay(minMs: number, maxMs: number, random: () => number = Math.random): number {
  const low = Math.min(minMs, maxMs)
  const high = Math.max(minMs, maxMs)
  return low + (high - low) * random()
}
