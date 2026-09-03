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
    // Las tres formas de sensor y las piezas de postura existen en el marcado;
    // el estado activo decide cuál se ve, no un simple cambio de tono.
    const html = markup({ status: 'CRITICO' })
    expect(countOf(html, 'dc-eye--soft')).toBe(2)
    expect(countOf(html, 'dc-eye--slit')).toBe(2)
    expect(countOf(html, 'dc-eye--hollow')).toBe(2)
    expect(html).toContain('dc-core')
    expect(html).toContain('dc-brace')
    expect(html).toContain('dc-ring__arc')
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
      'aria-label="Dirección de Operaciones. Estado: Crítico."',
    )
    expect(markup()).toContain('role="img"')
  })

  it('el SVG es decorativo: la lectura la da el texto', () => {
    const html = markup()
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('data-testid="direction-character-status"')
  })

  it('renderiza exactamente un personaje', () => {
    const html = markup()
    expect(countOf(html, 'data-testid="direction-character"')).toBe(1)
    expect(countOf(html, '<svg')).toBe(1)
  })
})
