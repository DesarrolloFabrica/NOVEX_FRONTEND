import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DirectionCharacter } from '@/modules/operational-cards/components/DirectionCharacter'
import { buildCharacterPresentation } from '@/modules/operational-cards/data/characterReaction'
import { buildTableLayout } from '@/modules/operational-cards/data/tableLayout'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'

/**
 * INTEGRACIÓN geometría → presentación → personaje.
 *
 * `DirectionCharacter` no conoce coordinaciones: recibe una orientación que
 * sale de `orientationByCode`, el mapa que produce la geometría de la mesa. Es
 * un acoplamiento silencioso: si una geometría futura dejara de exportar ese
 * mapa, o lo devolviera todo en NEUTRAL, el personaje dejaría de girarse hacia
 * la carta señalada y NINGUNA prueba de las dos piezas por separado fallaría.
 *
 * Esta prueba recorre la cadena entera —mesa, presentación y SVG renderizado—
 * para que esa regresión sea imposible de introducir en silencio.
 *
 * Lo que NO cubre: que la experiencia siga cableando el mapa al personaje. Eso
 * necesita DOM y lo cubren los recorridos de `e2e/operational-cards.spec.ts`.
 */

function coordinations(count: number): CoordinationOverview[] {
  return Array.from({ length: count }, (_unused, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    code: `coord-${index + 1}`,
    name: `Coordinación ${index + 1}`,
    shortName: `C${index + 1}`,
    color: '#28C8F4',
    displayOrder: index + 1,
    status: 'ESTABLE' as const,
    activeProblemsCount: 0,
    criticalCount: 0,
    affectedCoordinationCount: 0,
  }))
}

/** Cadena completa: mesa -> orientación de esa carta -> personaje renderizado. */
function characterFacing(code: string): string {
  const { orientationByCode } = buildTableLayout(coordinations(15))
  const orientation = orientationByCode[code]

  return renderToStaticMarkup(
    <DirectionCharacter
      presentation={buildCharacterPresentation({
        directionStatus: 'ALERTA',
        orientation: orientation ?? 'NEUTRAL',
        hovering: true,
        selecting: false,
      })}
    />,
  )
}

describe('mesa -> personaje · orientación', () => {
  it('señalar una carta de la izquierda gira al personaje a la izquierda', () => {
    expect(characterFacing('coord-1')).toContain('data-orientation="LEFT"')
  })

  it('señalar una carta de la derecha lo gira a la derecha', () => {
    expect(characterFacing('coord-8')).toContain('data-orientation="RIGHT"')
  })

  it('señalar el centro del arco lo deja de frente', () => {
    // En un arco de 8, las posiciones centrales caen dentro de la banda
    // neutra: el personaje mira al frente en vez de dar un giro mínimo.
    const { orientationByCode } = buildTableLayout(coordinations(15))
    const neutral = Object.entries(orientationByCode).find(
      ([, orientation]) => orientation === 'NEUTRAL',
    )

    expect(neutral).toBeDefined()
    expect(characterFacing(neutral![0])).toContain('data-orientation="NEUTRAL"')
  })

  it('la mesa cubre las 15 y ninguna deja al personaje sin orientación', () => {
    const { orientationByCode } = buildTableLayout(coordinations(15))

    for (const row of coordinations(15)) {
      expect(orientationByCode[row.code]).toBeDefined()
      expect(characterFacing(row.code)).toMatch(
        /data-orientation="(LEFT|NEUTRAL|RIGHT)"/,
      )
    }
  })

  it('el personaje sigue mostrando el estado de la DIRECCIÓN, no el de la carta', () => {
    // La coordinación va en ESTABLE y la Dirección en CRÍTICO: el personaje
    // debe leer CRÍTICO. La geometría solo aporta el lado.
    const { orientationByCode } = buildTableLayout(coordinations(15))
    const html = renderToStaticMarkup(
      <DirectionCharacter
        presentation={buildCharacterPresentation({
          directionStatus: 'CRITICO',
          orientation: orientationByCode['coord-1'] ?? 'NEUTRAL',
          hovering: true,
          selecting: false,
        })}
      />,
    )

    expect(html).toContain('data-status="CRITICO"')
    expect(html).toContain('data-orientation="LEFT"')
  })
})
