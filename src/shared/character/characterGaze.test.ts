import { describe, expect, it } from 'vitest'
import {
  eyeAnchor,
  gazeTarget,
  nextBlinkDelay,
  smoothingFactor,
} from '@/shared/character/characterGaze'
import type { GazeMapping } from '@/shared/character/characterGaze'

const rect = { left: 600, top: 200, width: 200, height: 200 }
const mapping: GazeMapping = { limit: 18, reachPx: 400, eyeCenter: { x: 0.5, y: 0.46 } }
const anchor = eyeAnchor(rect, mapping.eyeCenter)

describe('characterGaze · ancla', () => {
  it('toma el centro de los ojos, no el centro geométrico del canvas', () => {
    expect(anchor).toEqual({ x: 700, y: 292 })
  })
})

describe('characterGaze · objetivo de mirada', () => {
  it('cursor sobre los ojos → mirada neutral', () => {
    expect(gazeTarget(anchor, rect, mapping)).toEqual({ x: 0, y: 0 })
  })

  it('sigue la dirección: +X derecha, +Y abajo', () => {
    const right = gazeTarget({ x: anchor.x + 300, y: anchor.y }, rect, mapping)
    const up = gazeTarget({ x: anchor.x, y: anchor.y - 300 }, rect, mapping)
    expect(right.x).toBeGreaterThan(0)
    expect(right.y).toBeCloseTo(0)
    expect(up.y).toBeLessThan(0)
    expect(up.x).toBeCloseTo(0)
  })

  it('nunca supera ±limit, ni en las esquinas ni muy lejos', () => {
    const far = [
      { x: -1e6, y: -1e6 },
      { x: 1e6, y: -1e6 },
      { x: -1e6, y: 1e6 },
      { x: 1e6, y: 1e6 },
      { x: 1e6, y: anchor.y },
    ]
    for (const pointer of far) {
      const look = gazeTarget(pointer, rect, mapping)
      expect(Math.abs(look.x)).toBeLessThanOrEqual(18)
      expect(Math.abs(look.y)).toBeLessThanOrEqual(18)
    }
  })

  it('crece con la distancia y se satura sin saltos', () => {
    const near = gazeTarget({ x: anchor.x + 100, y: anchor.y }, rect, mapping).x
    const mid = gazeTarget({ x: anchor.x + 400, y: anchor.y }, rect, mapping).x
    const far = gazeTarget({ x: anchor.x + 4000, y: anchor.y }, rect, mapping).x
    expect(near).toBeLessThan(mid)
    expect(mid).toBeLessThan(far)
    expect(far).toBeLessThanOrEqual(18)
  })
})

describe('characterGaze · suavizado y parpadeo', () => {
  it('el factor de lerp no depende de los fps', () => {
    const oneFrameAt30 = smoothingFactor(33.4, 70)
    const twoFramesAt60 = 1 - (1 - smoothingFactor(16.7, 70)) ** 2
    expect(oneFrameAt30).toBeCloseTo(twoFramesAt60, 5)
  })

  it('la espera del parpadeo queda dentro del rango', () => {
    expect(nextBlinkDelay(3000, 6000, () => 0)).toBe(3000)
    expect(nextBlinkDelay(3000, 6000, () => 0.999999)).toBeCloseTo(6000, 0)
    expect(nextBlinkDelay(3000, 6000, () => 0.5)).toBe(4500)
  })
})
