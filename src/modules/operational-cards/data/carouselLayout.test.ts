import { describe, expect, it } from 'vitest'
import {
  buildAlternatives,
  buildCarouselLayout,
  resolveInitialCenter,
  wrapIndex,
} from '@/modules/operational-cards/data/carouselLayout'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'

const CODES = [
  'coord-general',
  'coord-b2b',
  'coord-bellas-artes',
  'coord-desarrollo-profesional',
  'coord-empresarial',
  'coord-especializaciones',
  'coord-ingenierias',
  'coord-operaciones-academicas',
  'coord-proyeccion-social',
  'coord-saber-pro',
  'coord-transversales',
  'coord-homologaciones',
  'coord-negocios',
  'coord-fabrica-contenidos',
  'coord-servicios',
] as const

const COORDINATIONS: CoordinationOverview[] = CODES.map((code, index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  code,
  name: code,
  shortName: code,
  color: '#28C8F4',
  displayOrder: index + 1,
  status: 'ESTABLE',
  activeProblemsCount: 0,
  criticalCount: 0,
  affectedCoordinationCount: 0,
}))

const orderOf = (code: string) =>
  COORDINATIONS.find((item) => item.code === code)!.displayOrder

function layoutFor(activeCode: string, centerDelta = 0) {
  const alternatives = buildAlternatives(COORDINATIONS, activeCode)
  const center =
    resolveInitialCenter(alternatives, orderOf(activeCode)) + centerDelta
  return { alternatives, layout: buildCarouselLayout(alternatives, center) }
}

describe('carouselLayout · alternativas', () => {
  it('excluye la coordinación activa: no se duplica en el carrusel', () => {
    const alternatives = buildAlternatives(COORDINATIONS, 'coord-transversales')
    expect(alternatives).toHaveLength(14)
    expect(
      alternatives.some((item) => item.code === 'coord-transversales'),
    ).toBe(false)
  })

  it('conserva el orden institucional', () => {
    const alternatives = buildAlternatives(COORDINATIONS, 'coord-general')
    const orders = alternatives.map((item) => item.displayOrder)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })

  it('las 14 restantes siguen accesibles aunque no estén visibles', () => {
    const { alternatives } = layoutFor('coord-transversales')
    const seen = new Set<string>()
    for (let step = 0; step < alternatives.length; step += 1) {
      for (const slot of buildCarouselLayout(alternatives, step).slots) {
        seen.add(slot.coordination.code)
      }
    }
    expect(seen.size).toBe(14)
  })
})

describe('carouselLayout · cinco slots', () => {
  it('muestra como máximo cinco cartas, nunca catorce', () => {
    const { layout } = layoutFor('coord-transversales')
    expect(layout.slots).toHaveLength(5)
    expect(layout.total).toBe(14)
  })

  it('usa los slots -2, -1, 0, +1, +2', () => {
    const { layout } = layoutFor('coord-ingenierias')
    expect(layout.slots.map((slot) => slot.slot)).toEqual([-2, -1, 0, 1, 2])
  })

  it('el frontal manda: mayor escala, elevado y por encima', () => {
    const { layout } = layoutFor('coord-ingenierias')
    const front = layout.slots.find((slot) => slot.slot === 0)!
    const near = layout.slots.find((slot) => slot.slot === 1)!
    const far = layout.slots.find((slot) => slot.slot === 2)!

    expect(front.scale).toBe(1)
    expect(front.scale).toBeGreaterThan(near.scale)
    expect(near.scale).toBeGreaterThan(far.scale)
    expect(front.zIndex).toBeGreaterThan(near.zIndex)
    expect(near.zIndex).toBeGreaterThan(far.zIndex)
    expect(front.y).toBeLessThan(near.y)
    expect(front.rotate).toBe(0)
  })

  it('no miniaturiza los extremos', () => {
    const { layout } = layoutFor('coord-ingenierias')
    for (const slot of layout.slots) {
      expect(slot.scale).toBeGreaterThanOrEqual(0.88)
    }
  })

  it('la curva es simétrica y no exagerada', () => {
    const { layout } = layoutFor('coord-ingenierias')
    const left = layout.slots.find((slot) => slot.slot === -2)!
    const right = layout.slots.find((slot) => slot.slot === 2)!
    expect(left.rotate).toBe(-right.rotate)
    expect(left.x).toBe(-right.x)
    expect(Math.abs(left.rotate)).toBeLessThanOrEqual(20)
  })

  it('con pocas alternativas no repite cartas', () => {
    const three = COORDINATIONS.slice(0, 4)
    const alternatives = buildAlternatives(three, 'coord-general')
    const layout = buildCarouselLayout(alternatives, 0)
    const codes = layout.slots.map((slot) => slot.coordination.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('sin alternativas no hay carrusel', () => {
    expect(buildCarouselLayout([], 0).slots).toEqual([])
  })
})

describe('carouselLayout · navegación cíclica', () => {
  it('avanza y retrocede una posición', () => {
    const { alternatives } = layoutFor('coord-general')
    const front = (center: number) =>
      buildCarouselLayout(alternatives, center).slots.find(
        (slot) => slot.slot === 0,
      )!.coordination.code

    expect(front(3)).toBe(alternatives[3].code)
    expect(front(4)).toBe(alternatives[4].code)
    expect(front(2)).toBe(alternatives[2].code)
  })

  it('tras la última vuelve a la primera', () => {
    const { alternatives } = layoutFor('coord-general')
    const last = alternatives.length - 1
    expect(wrapIndex(last + 1, alternatives.length)).toBe(0)
    const layout = buildCarouselLayout(alternatives, last + 1)
    expect(layout.slots.find((slot) => slot.slot === 0)!.coordination.code).toBe(
      alternatives[0].code,
    )
  })

  it('antes de la primera va a la última', () => {
    const { alternatives } = layoutFor('coord-general')
    expect(wrapIndex(-1, alternatives.length)).toBe(alternatives.length - 1)
    const layout = buildCarouselLayout(alternatives, -1)
    expect(layout.slots.find((slot) => slot.slot === 0)!.coordination.code).toBe(
      alternatives.at(-1)!.code,
    )
  })

  it('el indicador es compacto y 1-based', () => {
    const { alternatives } = layoutFor('coord-general')
    expect(buildCarouselLayout(alternatives, 0).position).toBe(1)
    expect(buildCarouselLayout(alternatives, 13).position).toBe(14)
    expect(buildCarouselLayout(alternatives, 14).position).toBe(1)
  })
})

describe('carouselLayout · recentrado al cambiar de coordinación', () => {
  it('centra en la coordinación siguiente a la activa', () => {
    const alternatives = buildAlternatives(COORDINATIONS, 'coord-transversales')
    const center = resolveInitialCenter(alternatives, orderOf('coord-transversales'))
    expect(alternatives[center].code).toBe('coord-homologaciones')
  })

  it('con la última activa, vuelve al principio', () => {
    const alternatives = buildAlternatives(COORDINATIONS, 'coord-servicios')
    const center = resolveInitialCenter(alternatives, orderOf('coord-servicios'))
    expect(center).toBe(0)
    expect(alternatives[center].code).toBe('coord-general')
  })

  it('al cambiar de activa el conjunto visible cambia con ella', () => {
    const before = layoutFor('coord-transversales').layout.slots.map(
      (slot) => slot.coordination.code,
    )
    const after = layoutFor('coord-fabrica-contenidos').layout.slots.map(
      (slot) => slot.coordination.code,
    )
    expect(after).not.toEqual(before)
    // La que estaba activa vuelve al conjunto de alternativas.
    expect(
      buildAlternatives(COORDINATIONS, 'coord-fabrica-contenidos').some(
        (item) => item.code === 'coord-transversales',
      ),
    ).toBe(true)
  })
})

describe('carouselLayout · orientación del personaje', () => {
  it('los slots negativos miran a la izquierda y los positivos a la derecha', () => {
    const { layout } = layoutFor('coord-ingenierias')
    for (const slot of layout.slots) {
      if (slot.slot < 0) expect(slot.orientation).toBe('LEFT')
      if (slot.slot === 0) expect(slot.orientation).toBe('NEUTRAL')
      if (slot.slot > 0) expect(slot.orientation).toBe('RIGHT')
    }
  })

  it('expone la orientación por code para el personaje', () => {
    const { layout } = layoutFor('coord-ingenierias')
    const front = layout.slots.find((slot) => slot.slot === 0)!
    expect(layout.orientationByCode[front.coordination.code]).toBe('NEUTRAL')
  })
})
