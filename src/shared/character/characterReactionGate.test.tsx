import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  BLINK_AFTER_REACTION_MS,
  blinkPauseRemaining,
  playCharacterReaction,
} from '@/shared/character/characterReactionGate'
import type { ReactionLock, ReactionViewModel } from '@/shared/character/characterReactionGate'
import { NovexCharacterHitArea } from '@/shared/character/NovexCharacterHitArea'
import { NOVEX_CHARACTER_REACTIONS } from '@/shared/character/novexCharacterRive'

/** View Model falso: registra qué propiedades se piden y qué triggers se disparan. */
function fakeViewModel() {
  const requested: string[] = []
  const fired: string[] = []
  const viewModel: ReactionViewModel & { number(path: string): null } = {
    trigger(path) {
      requested.push(path)
      return { trigger: () => fired.push(path) }
    },
    number(path) {
      requested.push(path)
      return null
    },
  }
  return { viewModel, requested, fired }
}

const HAPPY_MS = NOVEX_CHARACTER_REACTIONS.happy_1.durationMs

describe('reacción al click · contrato', () => {
  it('happy_1 usa el trigger approve (estado reaction_happy_1 del .riv)', () => {
    expect(NOVEX_CHARACTER_REACTIONS.happy_1.trigger).toBe('approve')
  })

  it('desactivada (sin reacción) no dispara nada', () => {
    const { viewModel, fired } = fakeViewModel()
    const lock: ReactionLock = { current: 0 }
    expect(playCharacterReaction(viewModel, undefined, lock, 1000)).toBe(false)
    expect(fired).toEqual([])
  })

  it('sin runtime cargado no dispara ni bloquea', () => {
    const lock: ReactionLock = { current: 0 }
    expect(playCharacterReaction(null, 'happy_1', lock, 1000)).toBe(false)
    expect(lock.current).toBe(0)
  })

  it('activada dispara approve y solo approve: no toca mood, lookX ni lookY', () => {
    const { viewModel, requested, fired } = fakeViewModel()
    const lock: ReactionLock = { current: 0 }
    expect(playCharacterReaction(viewModel, 'happy_1', lock, 1000)).toBe(true)
    expect(fired).toEqual(['approve'])
    expect(requested).toEqual(['approve'])
  })
})

describe('reacción al click · clicks repetidos', () => {
  it('ignora los clicks mientras la reacción corre y vuelve a estar disponible al terminar', () => {
    const { viewModel, fired } = fakeViewModel()
    const lock: ReactionLock = { current: 0 }
    const results = [0, 80, 160, 240, HAPPY_MS - 1].map((t) =>
      playCharacterReaction(viewModel, 'happy_1', lock, 1000 + t),
    )
    expect(results).toEqual([true, false, false, false, false])
    expect(fired).toEqual(['approve'])

    expect(playCharacterReaction(viewModel, 'happy_1', lock, 1000 + HAPPY_MS)).toBe(true)
    expect(fired).toEqual(['approve', 'approve'])
  })
})

describe('reacción al click · convivencia con el parpadeo', () => {
  it('sin reacción en curso el parpadeo no espera', () => {
    expect(blinkPauseRemaining({ current: 0 }, 5000)).toBe(0)
  })

  it('durante la reacción el parpadeo se aplaza hasta que termine, con margen', () => {
    const lock: ReactionLock = { current: 0 }
    playCharacterReaction(fakeViewModel().viewModel, 'happy_1', lock, 1000)
    expect(blinkPauseRemaining(lock, 1200)).toBe(HAPPY_MS - 200 + BLINK_AFTER_REACTION_MS)
    expect(blinkPauseRemaining(lock, 1000 + HAPPY_MS)).toBe(0)
  })
})

describe('área clickeable', () => {
  const html = renderToStaticMarkup(
    <NovexCharacterHitArea label="Saludar al personaje de NOVEX" onActivate={() => {}} />,
  )

  it('es un botón nativo con nombre accesible', () => {
    expect(html).toContain('<button')
    expect(html).toContain('type="button"')
    expect(html).toContain('aria-label="Saludar al personaje de NOVEX"')
  })

  it('se recorta a la silueta, no a la caja del canvas', () => {
    expect(html).toContain('clip-path:polygon(')
  })
})
