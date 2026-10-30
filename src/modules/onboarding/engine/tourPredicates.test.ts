// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  evaluateTourPredicate,
  legacyAdvancePredicate,
} from './tourPredicates'

describe('evaluateTourPredicate', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('present exige que el ancla exista', () => {
    expect(
      evaluateTourPredicate({ type: 'present', selector: '[data-tour="x"]' }),
    ).toBe(false)
    document.body.innerHTML = '<div data-tour="x"></div>'
    expect(
      evaluateTourPredicate({ type: 'present', selector: '[data-tour="x"]' }),
    ).toBe(true)
  })

  it('attribute confirma el ESTADO, no solo la presencia del nodo', () => {
    document.body.innerHTML =
      '<section data-tour="director-reading" data-scope="direction"></section>'
    const coordinationScope = {
      type: 'attribute' as const,
      selector: '[data-tour="director-reading"]',
      name: 'data-scope',
      value: 'coordination',
    }

    // El ancla existe, pero el estado todavía no se cumple.
    expect(evaluateTourPredicate(coordinationScope)).toBe(false)

    document
      .querySelector('[data-tour="director-reading"]')
      ?.setAttribute('data-scope', 'coordination')
    expect(evaluateTourPredicate(coordinationScope)).toBe(true)
  })

  it('attribute es falso si el ancla no existe', () => {
    expect(
      evaluateTourPredicate({
        type: 'attribute',
        selector: '[data-tour="ausente"]',
        name: 'data-scope',
        value: 'coordination',
      }),
    ).toBe(false)
  })

  it('all y any combinan predicados', () => {
    document.body.innerHTML =
      '<div data-tour="a" data-state="ok"></div><div data-tour="b"></div>'
    const ok = {
      type: 'attribute' as const,
      selector: '[data-tour="a"]',
      name: 'data-state',
      value: 'ok',
    }
    const missing = { type: 'present' as const, selector: '[data-tour="c"]' }

    expect(evaluateTourPredicate({ type: 'all', predicates: [ok, missing] })).toBe(false)
    expect(evaluateTourPredicate({ type: 'any', predicates: [ok, missing] })).toBe(true)
    expect(evaluateTourPredicate({ type: 'all', predicates: [] })).toBe(true)
    expect(evaluateTourPredicate({ type: 'any', predicates: [] })).toBe(false)
  })
})

describe('legacyAdvancePredicate', () => {
  it('traduce los campos heredados a presencia', () => {
    expect(legacyAdvancePredicate({ advanceOnTarget: '[data-tour="x"]' })).toEqual({
      type: 'present',
      selector: '[data-tour="x"]',
    })
    expect(
      legacyAdvancePredicate({ advanceOnVisibleTarget: '[data-tour="y"]' }),
    ).toEqual({ type: 'present', selector: '[data-tour="y"]' })
  })

  it('devuelve null cuando el paso no declara avance', () => {
    expect(legacyAdvancePredicate({})).toBeNull()
  })
})
