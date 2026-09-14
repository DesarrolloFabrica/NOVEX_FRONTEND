import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CoordinationDeckFan } from '@/modules/operational-cards/components/CoordinationDeckFan'
import type { ProductTableChild } from '@/modules/operational-cards/data/productHierarchy'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'

/**
 * La mano del mazo abierto. Aquí se comprueba lo que la separa de los cantos
 * decorativos de la mesa global: son CONTROLES, no adornos.
 */

const CHILDREN: readonly [string, string, OperationalIntegrityStatus][] = [
  ['coord-bellas-artes', 'Bellas Artes', 'ALERTA'],
  ['coord-empresarial', 'Empresarial', 'ESTABLE'],
  ['coord-ingenierias', 'Ingenierías', 'CRITICO'],
  ['coord-transversales', 'Transversales', 'ESTABLE'],
  ['coord-negocios', 'Negocios', 'CRITICO'],
]

function children(): ProductTableChild[] {
  return CHILDREN.map(([code, label, status], index) => {
    const coordination: CoordinationOverview = {
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      code,
      name: `Coordinador ${label}`,
      shortName: label,
      color: '#28C8F4',
      displayOrder: index + 1,
      status,
      activeProblemsCount: 0,
      criticalCount: 0,
      affectedCoordinationCount: 0,
    }
    return { code, label, coordination }
  })
}

function markup(options: { selectedCode?: string; childObserved?: boolean } = {}) {
  return renderToStaticMarkup(
    <CoordinationDeckFan
      subordinations={children()}
      stageHeight={1.334}
      selectedCode={options.selectedCode ?? 'coord-operaciones-academicas'}
      childObserved={options.childObserved ?? false}
      onSelect={() => undefined}
    />,
  )
}

function countOf(html: string, needle: string): number {
  return html.split(needle).length - 1
}

function attributes(html: string, attribute: string): string[] {
  const pattern = new RegExp(
    `data-testid="coordination-deck-fan-slot"[^>]*?${attribute}="([^"]*)"`,
    'g',
  )
  return [...html.matchAll(pattern)].map((match) => match[1])
}

describe('CoordinationDeckFan', () => {
  it('reparte una carta REAL por subordinación', () => {
    const html = markup()

    expect(countOf(html, 'data-testid="coordination-deck-fan-slot"')).toBe(5)
    expect(countOf(html, 'data-testid="coordination-card"')).toBe(5)
  })

  it('son controles, no adornos: botones con nombre y sin aria-hidden', () => {
    const html = markup()

    expect(countOf(html, '<button')).toBe(5)
    expect(countOf(html, 'type="button"')).toBe(5)
    // El nombre accesible es el de PRODUCTO, no el cargo del DTO.
    expect(html).toContain('aria-label="Ingenierías. Estado operacional')
    expect(html).not.toContain('Coordinador Ingenierías')
    // Un control jamás se esconde del árbol de accesibilidad.
    expect(html).not.toContain('aria-hidden="true" tabindex')
  })

  it('conserva el orden declarado, que es el del tabulador', () => {
    expect(attributes(markup(), 'data-code')).toEqual(
      CHILDREN.map(([code]) => code),
    )
  })

  it('cada hija lleva su propio estado operacional, no el del padre', () => {
    const html = markup()

    expect(countOf(html, 'data-status="CRITICO"')).toBe(2)
    expect(countOf(html, 'data-status="ESTABLE"')).toBe(2)
    expect(countOf(html, 'data-status="ALERTA"')).toBe(1)
  })

  it('con el PADRE observado la mano entera se mantiene legible', () => {
    // Son las opciones que se acaban de repartir: atenuarlas las convertiría en
    // ruido de fondo justo cuando hay que elegir entre ellas.
    const states = attributes(markup({ childObserved: false }), 'data-state')

    expect(states).toEqual(Array.from({ length: 5 }, () => 'resting'))
    expect(countOf(markup(), 'aria-pressed="true"')).toBe(0)
  })

  it('con una hija observada, solo ella queda al frente', () => {
    const html = markup({
      selectedCode: 'coord-ingenierias',
      childObserved: true,
    })
    const states = attributes(html, 'data-state')

    expect(states).toEqual([
      'dimmed',
      'dimmed',
      'selected',
      'dimmed',
      'dimmed',
    ])
    expect(countOf(html, 'aria-pressed="true"')).toBe(1)
    expect(countOf(html, 'aria-pressed="false"')).toBe(4)
  })

  it('seleccionar NO reordena la mano ni mueve a nadie de sitio', () => {
    // La memoria espacial vale también dentro del mazo: la tercera carta sigue
    // siendo la tercera, esté observada o no.
    const resting = markup()
    const selected = markup({
      selectedCode: 'coord-negocios',
      childObserved: true,
    })

    expect(attributes(selected, 'data-code')).toEqual(
      attributes(resting, 'data-code'),
    )
    expect(attributes(selected, 'style')).toEqual(attributes(resting, 'style'))
  })

  it('un mazo sin hijas no dibuja mano', () => {
    expect(
      renderToStaticMarkup(
        <CoordinationDeckFan
          subordinations={[]}
          stageHeight={1.334}
          childObserved={false}
          onSelect={() => undefined}
        />,
      ),
    ).toBe('')
  })
})
