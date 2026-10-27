import { describe, expect, it } from 'vitest'
import {
  CHARACTER_HEART_COUNT,
  LIFE_POINTS_PER_HEART,
  MAX_CHARACTER_LIFE_POINTS,
  deriveCharacterHeartStates,
  describeCharacterLives,
  formatCharacterLivesValue,
  isValidLifePoints,
} from '@/modules/operational-cards/data/characterLivesModel'
import { MAX_LIFE_POINTS } from '@/modules/operational-cards/services/operational-overview.service'

/** Notación compacta de la tabla de producto: F full, H half, E empty, U unknown. */
function compact(lifePoints: number | null): string {
  const letter = { full: 'F', half: 'H', empty: 'E', unknown: 'U' } as const
  return deriveCharacterHeartStates(lifePoints)
    .map((state) => letter[state])
    .join(' ')
}

describe('characterLivesModel · geometría', () => {
  it('5 corazones × 2 puntos = 10, igual que el máximo que acepta el parser', () => {
    expect(CHARACTER_HEART_COUNT).toBe(5)
    expect(LIFE_POINTS_PER_HEART).toBe(2)
    expect(MAX_CHARACTER_LIFE_POINTS).toBe(10)
    expect(MAX_CHARACTER_LIFE_POINTS).toBe(MAX_LIFE_POINTS)
  })
})

describe('deriveCharacterHeartStates · tabla de producto', () => {
  const TABLE: readonly [number | null, string][] = [
    [10, 'F F F F F'],
    [9, 'F F F F H'],
    [8, 'F F F F E'],
    [7, 'F F F H E'],
    [6, 'F F F E E'],
    [5, 'F F H E E'],
    [4, 'F F E E E'],
    [3, 'F H E E E'],
    [2, 'F E E E E'],
    [1, 'H E E E E'],
    [0, 'E E E E E'],
    [null, 'U U U U U'],
  ]

  it.each(TABLE)('%s → %s', (lifePoints, expected) => {
    expect(compact(lifePoints)).toBe(expected)
  })

  it('siempre devuelve exactamente cinco corazones', () => {
    for (const [lifePoints] of TABLE) {
      expect(deriveCharacterHeartStates(lifePoints)).toHaveLength(5)
    }
  })

  it('como mucho un corazón está a medias, y solo con valores impares', () => {
    for (let value = 0; value <= 10; value += 1) {
      const halves = deriveCharacterHeartStates(value).filter(
        (state) => state === 'half',
      )
      expect(halves).toHaveLength(value % 2)
    }
  })
})

describe('deriveCharacterHeartStates · entradas inválidas', () => {
  it('fuera de rango, decimales, NaN e Infinity → cinco unknown, sin saturar', () => {
    for (const value of [
      -1,
      11,
      100,
      1.5,
      9.99,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]) {
      expect(compact(value)).toBe('U U U U U')
    }
  })

  it('tipos ajenos que se cuelen en runtime → cinco unknown', () => {
    for (const value of ['7', undefined, true, {}]) {
      expect(compact(value as unknown as number)).toBe('U U U U U')
    }
  })

  it('isValidLifePoints solo acepta enteros 0..10', () => {
    expect(isValidLifePoints(0)).toBe(true)
    expect(isValidLifePoints(10)).toBe(true)
    for (const value of [-1, 11, 1.5, Number.NaN, '7', null, undefined]) {
      expect(isValidLifePoints(value)).toBe(false)
    }
  })
})

describe('characterLivesModel · textos', () => {
  it('valor visible discreto', () => {
    expect(formatCharacterLivesValue(7)).toBe('7 / 10')
    expect(formatCharacterLivesValue(0)).toBe('0 / 10')
    expect(formatCharacterLivesValue(null)).toBe('— / 10')
    expect(formatCharacterLivesValue(11)).toBe('— / 10')
  })

  it('nombre accesible con dato y sin dato', () => {
    expect(describeCharacterLives(7)).toBe(
      'Vidas del personaje: 7 de 10 puntos',
    )
    expect(describeCharacterLives(0)).toBe(
      'Vidas del personaje: 0 de 10 puntos',
    )
    expect(describeCharacterLives(null)).toBe(
      'Vidas del personaje: estado no disponible',
    )
    expect(describeCharacterLives(-1)).toBe(
      'Vidas del personaje: estado no disponible',
    )
  })
})
