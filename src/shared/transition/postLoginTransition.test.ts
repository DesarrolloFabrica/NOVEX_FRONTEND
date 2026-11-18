import { describe, expect, it } from 'vitest'
import { NOVEX_CHARACTER_REACTIONS } from '@/shared/character/novexCharacterRive'
import {
  COVER_MIN_HOLD_MS,
  POST_LOGIN_REACTION,
  POST_LOGIN_REACTION_MS,
  coverStateForPhase,
  remainingCoverHoldMs,
  postLoginTransitionReducer,
  reactionHoldMs,
} from '@/shared/transition/postLoginTransition'
import { createPostLoginTransitionCue } from '@/shared/transition/postLoginTransitionCue'
import type {
  PostLoginTransitionEvent,
  PostLoginTransitionPhase,
} from '@/shared/transition/postLoginTransition'

const run = (events: PostLoginTransitionEvent[], from: PostLoginTransitionPhase = 'idle') => {
  const phases: PostLoginTransitionPhase[] = []
  let phase = from
  for (const event of events) {
    phase = postLoginTransitionReducer(phase, event)
    phases.push(phase)
  }
  return phases
}

describe('transición post-login · secuencia', () => {
  it('recorre reacción → cierre → cubierto → apertura → reposo', () => {
    expect(
      run(['start', 'reaction-done', 'cover-closed', 'destination-mounted', 'cover-opened']),
    ).toEqual(['reacting', 'closing', 'covered', 'opening', 'idle'])
  })

  it('no navega dos veces: eventos repetidos o fuera de orden no avanzan', () => {
    expect(postLoginTransitionReducer('covered', 'cover-closed')).toBe('covered')
    expect(postLoginTransitionReducer('covered', 'start')).toBe('covered')
    expect(postLoginTransitionReducer('opening', 'destination-mounted')).toBe('opening')
    expect(postLoginTransitionReducer('idle', 'cover-opened')).toBe('idle')
  })

  it('no cierra sin reacción previa ni abre sin destino montado', () => {
    expect(postLoginTransitionReducer('idle', 'reaction-done')).toBe('idle')
    expect(postLoginTransitionReducer('reacting', 'cover-closed')).toBe('reacting')
    expect(postLoginTransitionReducer('closing', 'destination-mounted')).toBe('closing')
  })

  it('abortar (logout) vuelve a reposo desde cualquier fase', () => {
    for (const phase of ['reacting', 'closing', 'covered', 'opening'] as const) {
      expect(postLoginTransitionReducer(phase, 'abort')).toBe('idle')
    }
  })
})

describe('transición post-login · obturador por fase', () => {
  it('en /login sin transición queda abierto (fuera de vista); fuera de /login no existe', () => {
    expect(coverStateForPhase('idle', true)).toBe('open')
    expect(coverStateForPhase('idle', false)).toBeNull()
  })

  it('durante la reacción sigue abierto; cierra antes de navegar y se retira en destino', () => {
    expect(coverStateForPhase('reacting', true)).toBe('open')
    expect(coverStateForPhase('closing', true)).toBe('closed')
    expect(coverStateForPhase('covered', true)).toBe('closed')
    expect(coverStateForPhase('covered', false)).toBe('closed')
    expect(coverStateForPhase('opening', false)).toBe('retracted')
  })
})

describe('transición post-login · tiempo cubierto', () => {
  it('mantiene el sello el mínimo y nunca devuelve una espera negativa', () => {
    expect(remainingCoverHoldMs(1000, 1000)).toBe(COVER_MIN_HOLD_MS)
    expect(remainingCoverHoldMs(1000, 1400)).toBe(COVER_MIN_HOLD_MS - 400)
    expect(remainingCoverHoldMs(1000, 1000 + COVER_MIN_HOLD_MS + 250)).toBe(0)
  })
})

describe('transición post-login · reacción', () => {
  it('celebra con happy_1 y espera la duración del contrato del personaje', () => {
    expect(POST_LOGIN_REACTION).toBe('happy_1')
    expect(POST_LOGIN_REACTION_MS).toBe(NOVEX_CHARACTER_REACTIONS.happy_1.durationMs)
  })
})

describe('transición post-login · personaje no listo', () => {
  it('espera la reacción solo si el personaje la aceptó', () => {
    expect(reactionHoldMs(true)).toBe(POST_LOGIN_REACTION_MS)
    expect(reactionHoldMs(false)).toBe(0)
  })

  it('el canal entrega la espera una sola vez y luego vuelve a 0', () => {
    const cue = createPostLoginTransitionCue()
    cue.holdForReaction(reactionHoldMs(true))
    expect(cue.takeReactionHold()).toBe(POST_LOGIN_REACTION_MS)
    expect(cue.takeReactionHold()).toBe(0)
  })

  it('un personaje sin cargar no deja espera pendiente; valores negativos se ignoran', () => {
    const cue = createPostLoginTransitionCue()
    cue.holdForReaction(reactionHoldMs(false))
    expect(cue.takeReactionHold()).toBe(0)
    cue.holdForReaction(-50)
    expect(cue.takeReactionHold()).toBe(0)
  })
})
