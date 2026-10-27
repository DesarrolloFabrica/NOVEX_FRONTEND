import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  CharacterLives,
  CharacterLivesView,
} from '@/modules/operational-cards/components/CharacterLives'
import { deriveCharacterLifeTransition } from '@/modules/operational-cards/data/characterLifeTransition'

/**
 * Render con `react-dom/server`, como el resto del módulo. Se verifica el
 * contrato del DOM (estados, accesibilidad, ids), no los colores.
 */

function countOf(html: string, needle: string): number {
  return html.split(needle).length - 1
}

function heartStates(html: string): string[] {
  return [...html.matchAll(/data-heart-index="(\d)" data-state="(\w+)"/g)].map(
    (match) => `${match[1]}:${match[2]}`,
  )
}

describe('CharacterLives · corazones', () => {
  it('renderiza siempre cinco corazones SVG con índices estables 0..4', () => {
    for (const lifePoints of [10, 7, 0, null]) {
      const html = renderToStaticMarkup(<CharacterLives lifePoints={lifePoints} />)
      expect(countOf(html, 'data-testid="character-lives-heart"')).toBe(5)
      expect(countOf(html, '<svg')).toBe(5)
      expect(heartStates(html).map((entry) => entry.split(':')[0])).toEqual([
        '0',
        '1',
        '2',
        '3',
        '4',
      ])
    }
  })

  it('7 puntos: tres llenos, uno a medias y uno vacío, en ese orden', () => {
    const html = renderToStaticMarkup(<CharacterLives lifePoints={7} />)
    expect(heartStates(html)).toEqual([
      '0:full',
      '1:full',
      '2:full',
      '3:half',
      '4:empty',
    ])
  })

  it('HALF recorta el relleno en la mitad exacta (x = 12) y dibuja la costura', () => {
    const html = renderToStaticMarkup(<CharacterLives lifePoints={1} />)
    expect(heartStates(html)[0]).toBe('0:half')
    expect(html).toContain('<rect x="0" y="0" width="12" height="22">')
    expect(countOf(html, 'class="character-lives__seam"')).toBe(1)
    expect(html).toContain('x1="12"')
    expect(html).toContain('x2="12"')
  })

  it('FULL lleva relleno y grano; EMPTY no tiene relleno ni costura', () => {
    const full = renderToStaticMarkup(<CharacterLives lifePoints={10} />)
    expect(countOf(full, 'class="character-lives__fill"')).toBe(5)
    expect(countOf(full, 'class="character-lives__grain"')).toBe(5)
    expect(full).not.toContain('character-lives__seam')

    const empty = renderToStaticMarkup(<CharacterLives lifePoints={0} />)
    expect(heartStates(empty).every((entry) => entry.endsWith(':empty'))).toBe(
      true,
    )
    expect(empty).not.toContain('character-lives__fill')
    expect(empty).not.toContain('character-lives__seam')
  })

  it('UNKNOWN con null y con valores inválidos, distinto de EMPTY', () => {
    for (const lifePoints of [null, 11, -1, 2.5]) {
      const html = renderToStaticMarkup(<CharacterLives lifePoints={lifePoints} />)
      expect(
        heartStates(html).every((entry) => entry.endsWith(':unknown')),
      ).toBe(true)
      expect(html).not.toContain('data-state="empty"')
      expect(html).not.toContain('character-lives__fill')
      expect(html).toContain('data-life-points="unknown"')
    }
  })

  it('no usa emojis ni imágenes rasterizadas', () => {
    const html = renderToStaticMarkup(<CharacterLives lifePoints={5} />)
    expect(html).not.toMatch(/[❤♥\u{1F494}-\u{1F49F}]/u)
    expect(html).not.toContain('<img')
    expect(html).not.toContain('.png')
  })
})

describe('CharacterLives · valor textual', () => {
  it('showValue por defecto: «7 / 10»', () => {
    const html = renderToStaticMarkup(<CharacterLives lifePoints={7} />)
    expect(html).toContain('data-testid="character-lives-value"')
    expect(html).toContain('7 / 10')
  })

  it('sin dato: «— / 10»', () => {
    const html = renderToStaticMarkup(<CharacterLives lifePoints={null} />)
    expect(html).toContain('— / 10')
  })

  it('showValue={false} oculta la lectura pero conserva el nombre accesible', () => {
    const html = renderToStaticMarkup(
      <CharacterLives lifePoints={7} showValue={false} />,
    )
    expect(html).not.toContain('character-lives-value')
    expect(html).not.toContain('7 / 10')
    expect(html).toContain('aria-label="Vidas del personaje: 7 de 10 puntos"')
  })
})

describe('CharacterLives · accesibilidad', () => {
  it('se anuncia como una imagen con los puntos en el nombre', () => {
    const html = renderToStaticMarkup(<CharacterLives lifePoints={7} />)
    expect(countOf(html, 'role="img"')).toBe(1)
    expect(html).toContain('aria-label="Vidas del personaje: 7 de 10 puntos"')
  })

  it('sin dato anuncia «estado no disponible», nunca un número inventado', () => {
    const html = renderToStaticMarkup(<CharacterLives lifePoints={null} />)
    expect(html).toContain(
      'aria-label="Vidas del personaje: estado no disponible"',
    )
  })

  it('corazones y lectura numérica son decorativos', () => {
    const html = renderToStaticMarkup(<CharacterLives lifePoints={7} />)
    expect(countOf(html, '<svg class="character-lives__heart"')).toBe(5)
    expect(countOf(html, 'focusable="false"')).toBe(5)
    expect(html).toMatch(/class="character-lives__hearts" aria-hidden="true"/)
    expect(html).toMatch(
      /class="character-lives__value" data-testid="character-lives-value" aria-hidden="true"/,
    )
  })
})

describe('CharacterLives · API', () => {
  it('size por defecto md; sm y lg cambian solo la clase de tamaño', () => {
    expect(renderToStaticMarkup(<CharacterLives lifePoints={4} />)).toContain(
      'class="character-lives character-lives--md"',
    )
    for (const size of ['sm', 'lg'] as const) {
      const html = renderToStaticMarkup(
        <CharacterLives lifePoints={4} size={size} />,
      )
      expect(html).toContain(`character-lives--${size}`)
      expect(html).toContain(`data-size="${size}"`)
    }
  })

  it('className se añade sin sustituir las clases propias', () => {
    const html = renderToStaticMarkup(
      <CharacterLives lifePoints={4} className="host-slot" />,
    )
    expect(html).toContain('class="character-lives character-lives--md host-slot"')
  })

  it('expone el valor recibido en data-life-points', () => {
    expect(renderToStaticMarkup(<CharacterLives lifePoints={0} />)).toContain(
      'data-life-points="0"',
    )
  })
})

describe('CharacterLives · ids SVG', () => {
  function ids(html: string): string[] {
    return [...html.matchAll(/ id="([^"]+)"/g)].map((match) => match[1])
  }

  it('cada id es único dentro de una instancia y todo url(#…) apunta a uno existente', () => {
    const html = renderToStaticMarkup(<CharacterLives lifePoints={7} />)
    const declared = ids(html)
    expect(declared.length).toBeGreaterThan(0)
    expect(new Set(declared).size).toBe(declared.length)
    for (const id of declared) expect(id).toMatch(/^[a-zA-Z][a-zA-Z0-9_-]*$/)

    const referenced = [...html.matchAll(/url\(#([^)]+)\)/g)].map(
      (match) => match[1],
    )
    expect(referenced.length).toBeGreaterThan(0)
    for (const id of referenced) expect(declared).toContain(id)
  })

  it('dos instancias en la misma página no comparten ids', () => {
    const html = renderToStaticMarkup(
      <>
        <CharacterLives lifePoints={7} />
        <CharacterLives lifePoints={3} />
      </>,
    )
    const declared = ids(html)
    expect(new Set(declared).size).toBe(declared.length)
  })
})

describe('CharacterLives · modo decorativo (accessible={false})', () => {
  it('sin rol ni nombre propios, y el bloque entero aria-hidden', () => {
    const html = renderToStaticMarkup(
      <CharacterLives lifePoints={7} accessible={false} />,
    )
    expect(html).not.toContain('role="img"')
    expect(html).not.toContain('aria-label')
    expect(html).toMatch(/^<div class="character-lives[^"]*"[^>]*aria-hidden="true"/)
  })

  it('el aspecto visual no cambia: mismos corazones y misma cifra', () => {
    const html = renderToStaticMarkup(
      <CharacterLives lifePoints={7} accessible={false} />,
    )
    expect(countOf(html, 'data-testid="character-lives-heart"')).toBe(5)
    expect(heartStates(html)).toEqual([
      '0:full',
      '1:full',
      '2:full',
      '3:half',
      '4:empty',
    ])
    expect(html).toContain('7 / 10')
  })

  it('por defecto sigue siendo accesible por sí mismo', () => {
    expect(renderToStaticMarkup(<CharacterLives lifePoints={7} />)).toContain(
      'role="img"',
    )
  })
})

describe('CharacterLives · transiciones (vista)', () => {
  function view(previous: number | null, next: number | null, generation = 1) {
    return renderToStaticMarkup(
      <CharacterLivesView
        lifePoints={next}
        transition={deriveCharacterLifeTransition(previous, next)}
        generation={generation}
      />,
    )
  }

  function animated(html: string): string[] {
    return [
      ...html.matchAll(
        /data-heart-index="(\d)" data-state="(\w+)" data-previous-state="(\w+)" data-transition="(\w+)"/g,
      ),
    ].map((match) => `${match[1]}:${match[3]}→${match[2]}:${match[4]}`)
  }

  it('sin transición el bloque declara data-transition="none" y ningún corazón animado', () => {
    const html = renderToStaticMarkup(<CharacterLivesView lifePoints={7} />)
    expect(html).toContain('data-transition="none"')
    expect(html).not.toContain('data-previous-state')
    expect(html).not.toContain('character-lives__delta')
  })

  it('8 → 7: solo el corazón 3 anima una pérdida FULL → HALF', () => {
    const html = view(8, 7)
    expect(html).toContain('data-transition="loss"')
    expect(animated(html)).toEqual(['3:full→half:loss'])
    expect(countOf(html, 'character-lives__delta--loss')).toBe(1)
  })

  it('6 → 8: solo el corazón 3 anima una ganancia EMPTY → FULL', () => {
    const html = view(6, 8)
    expect(html).toContain('data-transition="gain"')
    expect(animated(html)).toEqual(['3:empty→full:gain'])
    expect(countOf(html, 'character-lives__delta--gain')).toBe(1)
  })

  it('el estado FINAL se pinta ya: los data-state son los del valor nuevo', () => {
    expect(heartStates(view(10, 7))).toEqual([
      '0:full',
      '1:full',
      '2:full',
      '3:half',
      '4:empty',
    ])
  })

  it('el tramo perdido de FULL → HALF es la mitad derecha', () => {
    const html = view(8, 7)
    const heart3 = html.split('data-heart-index="3"')[1].split('</svg>')[0]
    expect(heart3).toMatch(/class="character-lives__delta character-lives__delta--loss" clip-path="url\(#[^)]*-right-3\)"/)
  })

  it('el escalonado viaja como --cl-delay por corazón', () => {
    const html = view(10, 7)
    const heart4 = html.split('data-heart-index="4"')[1].split('</svg>')[0]
    const heart3 = html.split('data-heart-index="3"')[1].split('</svg>')[0]
    expect(html.split('data-heart-index="4"')[1]).toMatch(/^[^>]*--cl-delay:0ms/)
    expect(heart4).toContain('character-lives__delta--loss')
    expect(html.split('data-heart-index="3"')[1]).toMatch(/^[^>]*--cl-delay:80ms/)
    expect(heart3).toContain('character-lives__delta--loss')
  })

  it('la fase alterna con la generación para reiniciar el pulso', () => {
    expect(view(8, 7, 1)).toContain('data-transition-phase="1"')
    expect(view(8, 7, 2)).toContain('data-transition-phase="0"')
  })

  it('siempre cinco corazones, también durante una transición', () => {
    for (const [from, to] of [
      [10, 0],
      [0, 10],
      [8, 7],
    ]) {
      expect(countOf(view(from, to), 'data-testid="character-lives-heart"')).toBe(5)
    }
  })

  it('el nombre accesible refleja solo el valor final', () => {
    const html = renderToStaticMarkup(
      <CharacterLivesView
        lifePoints={5}
        transition={deriveCharacterLifeTransition(7, 5)}
        generation={1}
      />,
    )
    expect(html).toContain('aria-label="Vidas del personaje: 5 de 10 puntos"')
    expect(countOf(html, 'aria-label=')).toBe(1)
    expect(html).not.toMatch(/perdi|gan[oó]/i)
  })

  it('ids siguen siendo únicos y todo url(#…) resuelve durante la transición', () => {
    const html = view(10, 7)
    const declared = [...html.matchAll(/ id="([^"]+)"/g)].map((match) => match[1])
    expect(new Set(declared).size).toBe(declared.length)
    for (const match of html.matchAll(/url\(#([^)]+)\)/g)) {
      expect(declared).toContain(match[1])
    }
  })
})

describe('CharacterLives · primer render', () => {
  it('al montarse no anima: lo que aparece es el estado actual', () => {
    const html = renderToStaticMarkup(
      <CharacterLives lifePoints={7} ownerKey="coord-saber-pro" />,
    )
    expect(html).toContain('data-transition="none"')
    expect(html).not.toContain('character-lives__delta')
  })
})
