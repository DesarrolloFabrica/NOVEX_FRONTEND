import { describe, expect, it } from 'vitest'
import {
  LIFE_GAIN_DURATION_MS,
  LIFE_LOSS_DURATION_MS,
  LIFE_SEQUENCE_MAX_MS,
  LIFE_STAGGER_MS,
  NO_LIFE_TRANSITION,
  advanceCharacterLifeSnapshot,
  deriveCharacterLifeTransition,
  initialCharacterLifeSnapshot,
  lifeStaggerStep,
  lifeTransitionTotalMs,
  type CharacterLifeTransition,
} from '@/modules/operational-cards/data/characterLifeTransition'

/** `índice:from→to` de los corazones que cambian, en orden de índice. */
function changes(transition: CharacterLifeTransition): string[] {
  return transition.hearts
    .filter((heart) => heart !== null)
    .map((heart) => `${heart!.index}:${heart!.from}→${heart!.to}`)
}

describe('deriveCharacterLifeTransition · casos de producto', () => {
  it('8 → 7: pérdida de 1 punto, FULL → HALF', () => {
    const transition = deriveCharacterLifeTransition(8, 7)
    expect(transition.kind).toBe('loss')
    expect(changes(transition)).toEqual(['3:full→half'])
  })

  it('7 → 6: pérdida de 1 punto, HALF → EMPTY', () => {
    const transition = deriveCharacterLifeTransition(7, 6)
    expect(transition.kind).toBe('loss')
    expect(changes(transition)).toEqual(['3:half→empty'])
  })

  it('6 → 8: ganancia de 2 puntos, EMPTY → FULL', () => {
    const transition = deriveCharacterLifeTransition(6, 8)
    expect(transition.kind).toBe('gain')
    expect(changes(transition)).toEqual(['3:empty→full'])
  })

  it('10 → 8: pérdida de 2 puntos, un corazón FULL → EMPTY', () => {
    const transition = deriveCharacterLifeTransition(10, 8)
    expect(transition.kind).toBe('loss')
    expect(changes(transition)).toEqual(['4:full→empty'])
  })

  it('10 → 7: tres puntos repartidos en dos corazones', () => {
    const transition = deriveCharacterLifeTransition(10, 7)
    expect(transition.kind).toBe('loss')
    expect(changes(transition)).toEqual(['3:full→half', '4:full→empty'])
  })

  it('7 → 9: ganancia que completa un corazón y empieza el siguiente', () => {
    const transition = deriveCharacterLifeTransition(7, 9)
    expect(transition.kind).toBe('gain')
    expect(changes(transition)).toEqual(['3:half→full', '4:empty→half'])
  })

  it('0 → 0 y cualquier valor sin cambio: ninguna transición', () => {
    for (const value of [0, 5, 10]) {
      expect(deriveCharacterLifeTransition(value, value)).toBe(NO_LIFE_TRANSITION)
    }
  })

  it('null → 7: aparición, no ganancia', () => {
    expect(deriveCharacterLifeTransition(null, 7)).toBe(NO_LIFE_TRANSITION)
  })

  it('7 → null: pasa a no disponible, sin pérdida', () => {
    expect(deriveCharacterLifeTransition(7, null)).toBe(NO_LIFE_TRANSITION)
  })

  it('valores fuera de contrato no animan', () => {
    expect(deriveCharacterLifeTransition(11, 7)).toBe(NO_LIFE_TRANSITION)
    expect(deriveCharacterLifeTransition(7, -1)).toBe(NO_LIFE_TRANSITION)
    expect(deriveCharacterLifeTransition(7.5, 7)).toBe(NO_LIFE_TRANSITION)
  })
})

describe('deriveCharacterLifeTransition · tramo animado', () => {
  it('pérdida FULL → HALF anima la mitad derecha', () => {
    const heart = deriveCharacterLifeTransition(8, 7).hearts[3]!
    expect(heart.stableUnits).toBe(1)
    expect(heart.changedUntil).toBe(2)
  })

  it('pérdida HALF → EMPTY anima la mitad izquierda', () => {
    const heart = deriveCharacterLifeTransition(7, 6).hearts[3]!
    expect(heart.stableUnits).toBe(0)
    expect(heart.changedUntil).toBe(1)
  })

  it('ganancia EMPTY → FULL anima el corazón entero', () => {
    const heart = deriveCharacterLifeTransition(6, 8).hearts[3]!
    expect(heart.stableUnits).toBe(0)
    expect(heart.changedUntil).toBe(2)
  })

  it('los corazones que no cambian quedan sin transición', () => {
    const transition = deriveCharacterLifeTransition(8, 7)
    expect(transition.hearts).toHaveLength(5)
    expect([0, 1, 2, 4].map((index) => transition.hearts[index])).toEqual([
      null,
      null,
      null,
      null,
    ])
  })
})

describe('deriveCharacterLifeTransition · secuencia', () => {
  it('la pérdida se vacía de derecha a izquierda', () => {
    const transition = deriveCharacterLifeTransition(10, 7)
    expect(transition.hearts[4]!.delayMs).toBe(0)
    expect(transition.hearts[3]!.delayMs).toBe(LIFE_STAGGER_MS)
  })

  it('la ganancia se rellena de izquierda a derecha', () => {
    const transition = deriveCharacterLifeTransition(7, 9)
    expect(transition.hearts[3]!.delayMs).toBe(0)
    expect(transition.hearts[4]!.delayMs).toBe(LIFE_STAGGER_MS)
  })

  it('un solo corazón no espera', () => {
    expect(deriveCharacterLifeTransition(8, 7).hearts[3]!.delayMs).toBe(0)
  })

  it('el escalón está entre 60 y 100 ms en los casos habituales', () => {
    expect(LIFE_STAGGER_MS).toBeGreaterThanOrEqual(60)
    expect(LIFE_STAGGER_MS).toBeLessThanOrEqual(100)
    expect(lifeStaggerStep(2, LIFE_LOSS_DURATION_MS)).toBe(80)
    expect(lifeStaggerStep(3, LIFE_GAIN_DURATION_MS)).toBe(80)
  })

  it('ninguna secuencia supera ~700 ms, ni siquiera 10 → 0 o 0 → 10', () => {
    for (const [from, to] of [
      [10, 0],
      [0, 10],
      [10, 7],
      [3, 9],
      [8, 7],
    ]) {
      const total = lifeTransitionTotalMs(deriveCharacterLifeTransition(from, to))
      expect(total).toBeLessThanOrEqual(LIFE_SEQUENCE_MAX_MS)
    }
  })

  it('duraciones dentro del rango de diseño', () => {
    expect(LIFE_LOSS_DURATION_MS).toBeGreaterThanOrEqual(300)
    expect(LIFE_LOSS_DURATION_MS).toBeLessThanOrEqual(450)
    expect(LIFE_GAIN_DURATION_MS).toBeGreaterThanOrEqual(350)
    expect(LIFE_GAIN_DURATION_MS).toBeLessThanOrEqual(500)
  })
})

describe('advanceCharacterLifeSnapshot · misma coordinación vs cambio de carta', () => {
  const A = 'coord-saber-pro'
  const B = 'coord-especializaciones'

  function step(
    from: [string | null | undefined, number | null],
    to: [string | null | undefined, number | null],
  ) {
    return advanceCharacterLifeSnapshot(
      initialCharacterLifeSnapshot(from[0], from[1]),
      to[0],
      to[1],
    )
  }

  it('misma coordinación: 8 → 7 loss, 7 → 6 loss, 6 → 8 gain, 0 → 0 none', () => {
    expect(step([A, 8], [A, 7]).transition.kind).toBe('loss')
    expect(step([A, 7], [A, 6]).transition.kind).toBe('loss')
    expect(step([A, 6], [A, 8]).transition.kind).toBe('gain')
    expect(step([A, 0], [A, 0]).transition.kind).toBe('none')
  })

  it('cambio de coordinación 7 (A) → 4 (B): reemplazo sin delta', () => {
    const next = step([A, 7], [B, 4])
    expect(next.transition).toBe(NO_LIFE_TRANSITION)
    expect(next.lifePoints).toBe(4)
    expect(next.ownerKey).toBe(B)
  })

  it('null → 7 y 7 → null en la misma coordinación: none', () => {
    expect(step([A, null], [A, 7]).transition.kind).toBe('none')
    expect(step([A, 7], [A, null]).transition.kind).toBe('none')
  })

  it('sin coordinación → coordinación, y al revés: none', () => {
    expect(step([null, null], [A, 7]).transition.kind).toBe('none')
    expect(step([A, 7], [null, null]).transition.kind).toBe('none')
  })

  it('sin dueño rastreable (ownerKey undefined) nunca anima', () => {
    expect(step([undefined, 8], [undefined, 7]).transition.kind).toBe('none')
  })

  it('una lectura idéntica devuelve la misma instancia (sin renders de más)', () => {
    const snapshot = initialCharacterLifeSnapshot(A, 7)
    expect(advanceCharacterLifeSnapshot(snapshot, A, 7)).toBe(snapshot)
  })

  it('cada lectura distinta avanza la generación', () => {
    const first = initialCharacterLifeSnapshot(A, 8)
    const second = advanceCharacterLifeSnapshot(first, A, 7)
    const third = advanceCharacterLifeSnapshot(second, A, 6)
    expect([first.generation, second.generation, third.generation]).toEqual([
      0, 1, 2,
    ])
    expect(third.transition.kind).toBe('loss')
  })

  it('A 7 → B 4 → A 4: volver a A tampoco se lee como pérdida', () => {
    const onB = step([A, 7], [B, 4])
    const backOnA = advanceCharacterLifeSnapshot(onB, A, 4)
    expect(backOnA.transition).toBe(NO_LIFE_TRANSITION)
  })
})
