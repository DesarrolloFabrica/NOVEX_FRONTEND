import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DirectionCharacter } from '@/modules/operational-cards/components/DirectionCharacter'
import { DEFAULT_CHARACTER_PRESENTATION } from '@/modules/operational-cards/types/character.types'
import type { CharacterPresentation } from '@/modules/operational-cards/types/character.types'
import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'

/**
 * Se renderiza con `react-dom/server`, ya dependencia del proyecto. Se verifica
 * el contrato, la expresión declarada y la accesibilidad; no se verifican
 * fotogramas de animación ni valores de CSS.
 */

function markup(overrides: Partial<CharacterPresentation> = {}): string {
  return renderToStaticMarkup(
    <DirectionCharacter
      presentation={{
        status: 'ESTABLE',
        orientation: 'NEUTRAL',
        interaction: 'IDLE',
        ...overrides,
      }}
    />,
  )
}

function countOf(html: string, needle: string): number {
  return html.split(needle).length - 1
}

const ALL_STATUSES: OperationalIntegrityStatus[] = [
  'ESTABLE',
  'ALERTA',
  'CRITICO',
  'DESCONOCIDO',
]

describe('DirectionCharacter · contrato', () => {
  it('solo consume CharacterPresentation', () => {
    // El default de fase 2 basta para renderizar: no hace falta el DTO.
    const html = renderToStaticMarkup(
      <DirectionCharacter presentation={DEFAULT_CHARACTER_PRESENTATION} />,
    )
    expect(html).toContain('data-status="DESCONOCIDO"')
    expect(html).toContain('data-orientation="NEUTRAL"')
    expect(html).toContain('data-interaction="IDLE"')
  })

  it('el estado recibido llega al atributo que gobierna la expresión', () => {
    for (const status of ALL_STATUSES) {
      expect(markup({ status })).toContain(`data-status="${status}"`)
    }
  })

  it('orientación NEUTRAL e interacción IDLE en reposo', () => {
    const html = markup()
    expect(html).toContain('data-orientation="NEUTRAL"')
    expect(html).toContain('data-interaction="IDLE"')
    expect(html).not.toContain('data-orientation="LEFT"')
    expect(html).not.toContain('data-orientation="RIGHT"')
  })

  it('no expone selección, severidad ni nombre de animación', () => {
    const html = markup({ status: 'CRITICO' })
    for (const field of [
      'selectedCoordination',
      'problemSeverity',
      'emotionName',
      'animationName',
      'assetPath',
      'data-selected',
    ]) {
      expect(html).not.toContain(field)
    }
  })
})

describe('DirectionCharacter · expresión por estado', () => {
  it('cada estado declara su propia lectura textual', () => {
    expect(markup({ status: 'ESTABLE' })).toContain('>Estable<')
    expect(markup({ status: 'ALERTA' })).toContain('>Alerta<')
    expect(markup({ status: 'CRITICO' })).toContain('>Crítico<')
    expect(markup({ status: 'DESCONOCIDO' })).toContain('>Desconocido<')
  })

  it('DESCONOCIDO no se presenta como ESTABLE', () => {
    const unknown = markup({ status: 'DESCONOCIDO' })
    expect(unknown).toContain('data-status="DESCONOCIDO"')
    expect(unknown).not.toContain('Estable')
  })

  it('la diferencia entre estados no depende solo del color', () => {
    // La postura y la expresión las resuelve ahora la State Machine dentro del
    // .riv, así que ya no hay formas de sensor que contar en el marcado. Lo que
    // este componente sigue garantizando —y es lo que la regla pedía— es que el
    // estado NUNCA viaja solo como color: llega como atributo semántico y como
    // lectura textual, las dos cosas legibles sin ver el dibujo.
    const html = markup({ status: 'CRITICO' })
    expect(html).toContain('data-status="CRITICO"')
    expect(html).toContain('>Crítico<')
  })

  it('la expresión sobrevive sin animación: vive en atributos, no en frames', () => {
    // Con prefers-reduced-motion el CSS anula animaciones; la información
    // sigue estando en data-status y en el texto.
    const html = markup({ status: 'ALERTA' })
    expect(html).toContain('data-status="ALERTA"')
    expect(html).toContain('>Alerta<')
  })
})

describe('DirectionCharacter · accesibilidad y unicidad', () => {
  it('se anuncia como imagen con estado en el nombre accesible', () => {
    expect(markup({ status: 'CRITICO' })).toContain(
      'aria-label="Estado: Crítico."',
    )
    expect(markup()).toContain('role="img"')
  })

  it('la figura es decorativa: la lectura la da el texto', () => {
    const html = markup()
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('data-testid="direction-character-status"')
  })

  it('renderiza exactamente un personaje', () => {
    const html = markup()
    expect(countOf(html, 'data-testid="direction-character"')).toBe(1)
    // Una sola figura, y nunca dos: en servidor es la caja de reserva y en
    // cliente el contenedor del canvas de Rive, pero siempre exactamente una.
    expect(countOf(html, 'direction-character__figure')).toBe(1)
  })
})

describe('DirectionCharacter · vidas', () => {
  function withLives(
    lifePoints: number | null,
    status: OperationalIntegrityStatus = 'ALERTA',
  ): string {
    return renderToStaticMarkup(
      <DirectionCharacter
        presentation={{ status, orientation: 'NEUTRAL', interaction: 'SELECTED' }}
        showLives
        lifePoints={lifePoints}
      />,
    )
  }

  function heartStates(html: string): string[] {
    return [...html.matchAll(/data-heart-index="\d" data-state="(\w+)"/g)].map(
      (match) => match[1],
    )
  }

  it('sin showLives no monta CharacterLives, pero conserva la franja reservada', () => {
    const html = markup()
    expect(html).not.toContain('data-testid="character-lives"')
    expect(html).not.toContain('character-lives__heart')
    expect(html).not.toContain('/ 10')
    expect(html).toContain('data-lives="hidden"')
    expect(countOf(html, 'data-testid="direction-character-lives"')).toBe(1)
  })

  it('sin showLives, un lifePoints recibido no basta para mostrar vidas', () => {
    const html = renderToStaticMarkup(
      <DirectionCharacter
        presentation={DEFAULT_CHARACTER_PRESENTATION}
        lifePoints={7}
      />,
    )
    expect(html).not.toContain('character-lives__heart')
    expect(html).toContain('aria-label="Estado: Desconocido."')
  })

  const CASES: readonly [number | null, readonly string[], string][] = [
    [10, ['full', 'full', 'full', 'full', 'full'], '10 / 10'],
    [7, ['full', 'full', 'full', 'half', 'empty'], '7 / 10'],
    [0, ['empty', 'empty', 'empty', 'empty', 'empty'], '0 / 10'],
    [null, ['unknown', 'unknown', 'unknown', 'unknown', 'unknown'], '— / 10'],
  ]

  it.each(CASES)('showLives + %s → corazones y cifra', (lifePoints, states, value) => {
    const html = withLives(lifePoints)
    expect(html).toContain('data-lives="shown"')
    expect(countOf(html, 'data-testid="character-lives"')).toBe(1)
    expect(heartStates(html)).toEqual(states)
    expect(html).toContain(value)
  })

  it('siempre cinco corazones cuando se muestran', () => {
    for (const lifePoints of [10, 9, 5, 1, 0, null]) {
      expect(
        countOf(withLives(lifePoints), 'data-testid="character-lives-heart"'),
      ).toBe(5)
    }
  })

  it('las vidas van entre la figura y el rótulo de estado', () => {
    const html = withLives(7)
    const figure = html.indexOf('direction-character__figure')
    const lives = html.indexOf('data-testid="character-lives"')
    const status = html.indexOf('data-testid="direction-character-status"')
    expect(figure).toBeGreaterThan(-1)
    expect(lives).toBeGreaterThan(figure)
    expect(status).toBeGreaterThan(lives)
  })

  it('usa el tamaño compacto sm y muestra la cifra', () => {
    const html = withLives(7)
    expect(html).toContain('character-lives--sm')
    expect(html).toContain('data-testid="character-lives-value"')
  })
})

describe('DirectionCharacter · vidas y accesibilidad', () => {
  function named(
    status: OperationalIntegrityStatus,
    lifePoints: number | null,
  ): string {
    return renderToStaticMarkup(
      <DirectionCharacter
        presentation={{ status, orientation: 'NEUTRAL', interaction: 'SELECTED' }}
        showLives
        lifePoints={lifePoints}
      />,
    )
  }

  it('el nombre accesible del personaje incluye las vidas', () => {
    expect(named('ESTABLE', 10)).toContain(
      'aria-label="Estado: Estable. Vidas del personaje: 10 de 10 puntos."',
    )
    expect(named('ALERTA', 7)).toContain(
      'aria-label="Estado: Alerta. Vidas del personaje: 7 de 10 puntos."',
    )
    expect(named('ALERTA', null)).toContain(
      'aria-label="Estado: Alerta. Vidas del personaje: estado no disponible."',
    )
  })

  it('sin vidas mantiene exactamente el nombre anterior', () => {
    for (const status of ALL_STATUSES) {
      const html = markup({ status })
      expect(html).toMatch(/aria-label="Estado: [^".]+\."/)
      expect(html).not.toContain('Vidas del personaje')
    }
  })

  it('no hay un segundo role="img" ni un segundo nombre accesible dentro', () => {
    const html = named('ALERTA', 7)
    expect(countOf(html, 'role="img"')).toBe(1)
    expect(countOf(html, 'aria-label=')).toBe(1)
    expect(countOf(html, 'Vidas del personaje')).toBe(1)
  })

  it('las vidas son decorativas: el bloque entero va aria-hidden', () => {
    const html = named('ALERTA', 7)
    expect(html).toMatch(
      /class="direction-character__lives" data-testid="direction-character-lives" aria-hidden="true"/,
    )
    expect(html).toMatch(/data-testid="character-lives"[^>]*aria-hidden="true"/)
  })
})
