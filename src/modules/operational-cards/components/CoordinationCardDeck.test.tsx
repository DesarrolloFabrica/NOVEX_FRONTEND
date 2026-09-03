import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { CoordinationCard } from '@/modules/operational-cards/components/CoordinationCard'
import { CoordinationCardDeck } from '@/modules/operational-cards/components/CoordinationCardDeck'
import { buildDeckLayout } from '@/modules/operational-cards/data/deckLayout'
import { resolveCoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'

/**
 * Se renderiza con `react-dom/server`, que ya es dependencia del proyecto: no
 * hay jsdom ni testing-library instalados y esta fase no autoriza añadirlos.
 * Basta para comprobar estructura, estados y accesibilidad del marcado; no se
 * verifican valores de CSS.
 */

const CATALOG: readonly [string, string, string][] = [
  ['coord-general', 'Coordinación General', 'General'],
  ['coord-b2b', 'Coordinación Supervisor B2B', 'B2B'],
  ['coord-bellas-artes', 'Coordinador Bellas Artes', 'Bellas Artes'],
  [
    'coord-desarrollo-profesional',
    'Coordinador Desarrollo Profesional',
    'Desarrollo Prof.',
  ],
  ['coord-empresarial', 'Coordinador Empresarial', 'Empresarial'],
  [
    'coord-especializaciones',
    'Coordinador Especializaciones',
    'Especializaciones',
  ],
  ['coord-ingenierias', 'Coordinador Ingenierías', 'Ingenierías'],
  [
    'coord-operaciones-academicas',
    'Coordinador Operaciones Académicas',
    'Op. Académicas',
  ],
  [
    'coord-proyeccion-social',
    'Coordinador Proyección Social',
    'Proyección Social',
  ],
  ['coord-saber-pro', 'Coordinador Saber Pro', 'Saber Pro'],
  ['coord-transversales', 'Coordinador Transversales', 'Transversales'],
  ['coord-homologaciones', 'Homologaciones', 'Homologaciones'],
  ['coord-negocios', 'Negocios', 'Negocios'],
  ['coord-fabrica-contenidos', 'Fabrica de contenidos', 'Fábrica'],
  ['coord-servicios', 'Servicios', 'Servicios'],
]

/** Estado real observado en la BD local: 7 críticas, 1 en alerta, 7 estables. */
const STATUS_BY_CODE: Readonly<Record<string, OperationalIntegrityStatus>> = {
  'coord-b2b': 'CRITICO',
  'coord-especializaciones': 'CRITICO',
  'coord-ingenierias': 'CRITICO',
  'coord-operaciones-academicas': 'CRITICO',
  'coord-homologaciones': 'CRITICO',
  'coord-negocios': 'CRITICO',
  'coord-servicios': 'CRITICO',
  'coord-bellas-artes': 'ALERTA',
}

function coordinations(
  statusOverrides: Readonly<Record<string, OperationalIntegrityStatus>> = STATUS_BY_CODE,
): CoordinationOverview[] {
  return CATALOG.map(([code, name, shortName], index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    code,
    name,
    shortName,
    // Identidad cromática deliberadamente azul en TODAS: si el estado usara el
    // color de identidad, o al revés, se vería aquí.
    color: '#28C8F4',
    displayOrder: index + 1,
    status: statusOverrides[code] ?? 'ESTABLE',
    activeProblemsCount: 0,
    criticalCount: 0,
    affectedCoordinationCount: 0,
  }))
}

function markup(
  rows: CoordinationOverview[],
  options: { selectedCode?: string | null } = {},
): string {
  const selectedCode = options.selectedCode ?? null

  return renderToStaticMarkup(
    <CoordinationCardDeck
      layout={buildDeckLayout(rows, { excludeCode: selectedCode })}
      selectedCode={selectedCode}
      compressed={selectedCode !== null}
      onSelect={() => undefined}
      onHoverChange={() => undefined}
    />,
  )
}

function cardAttributes(html: string, attribute: string): string[] {
  const pattern = new RegExp(`data-testid="coordination-card"[^>]*?${attribute}="([^"]*)"`, 'g')
  return [...html.matchAll(pattern)].map((match) => match[1])
}

function countOf(html: string, needle: string): number {
  return html.split(needle).length - 1
}

describe('CoordinationCardDeck · composición', () => {
  it('renderiza las 15 cartas', () => {
    const html = markup(coordinations())
    expect(countOf(html, 'data-testid="coordination-card"')).toBe(15)
    expect(html).toContain('data-count="15"')
  })

  it('respeta displayOrder', () => {
    const shuffled = [...coordinations()].reverse()
    expect(cardAttributes(markup(shuffled), 'data-code')).toEqual(
      CATALOG.map(([code]) => code),
    )
  })

  it('incluye Coordinación General como una carta más', () => {
    const html = markup(coordinations())
    expect(html).toContain('data-code="coord-general"')
    expect(html).toContain('General')
  })

  it('usa el code como clave de la carta, no el uuid', () => {
    const html = markup(coordinations())
    expect(cardAttributes(html, 'data-code').every((code) => code.startsWith('coord-'))).toBe(true)
    expect(html).not.toContain('00000000-0000-4000-8000')
  })

  it('reparte 15 cartas en dos bandas, la más ancha arriba', () => {
    const html = markup(coordinations())
    expect(countOf(html, 'data-testid="coordination-card-band"')).toBe(2)

    const bands = html
      .split('data-testid="coordination-card-band"')
      .slice(1)
      .map((band) => countOf(band, 'data-testid="coordination-card"'))
    expect(bands).toEqual([8, 7])
  })

  it('no crea una carta 16 ni deja huecos', () => {
    expect(countOf(markup(coordinations().slice(0, 9)), 'data-testid="coordination-card"')).toBe(9)
    expect(markup([])).not.toContain('data-testid="coordination-card"')
  })

  it('cada carta lleva nombre visible', () => {
    const html = markup(coordinations())
    for (const [, , shortName] of CATALOG) {
      expect(html).toContain(shortName)
    }
  })
})

describe('CoordinationCardDeck · estado operacional', () => {
  it('aplica el estado visual de cada carta en data-status', () => {
    const statuses = cardAttributes(markup(coordinations()), 'data-status')
    expect(statuses.filter((status) => status === 'CRITICO')).toHaveLength(7)
    expect(statuses.filter((status) => status === 'ALERTA')).toHaveLength(1)
    expect(statuses.filter((status) => status === 'ESTABLE')).toHaveLength(7)
  })

  it('cubre los cuatro estados, incluido DESCONOCIDO', () => {
    const html = markup(
      coordinations({
        'coord-general': 'ESTABLE',
        'coord-b2b': 'ALERTA',
        'coord-bellas-artes': 'CRITICO',
        'coord-empresarial': 'DESCONOCIDO',
      }),
    )

    expect(html).toContain('data-status="ESTABLE"')
    expect(html).toContain('data-status="ALERTA"')
    expect(html).toContain('data-status="CRITICO"')
    expect(html).toContain('data-status="DESCONOCIDO"')
  })

  it('el estado también es texto visible, no solo aura', () => {
    const html = markup(
      coordinations({ 'coord-b2b': 'CRITICO', 'coord-general': 'DESCONOCIDO' }),
    )
    expect(countOf(html, 'data-testid="coordination-card-status"')).toBe(15)
    expect(html).toContain('Crítico')
    expect(html).toContain('Desconocido')
    expect(html).toContain('Estable')
  })

  it('DESCONOCIDO no se presenta como ESTABLE', () => {
    const unknown = renderToStaticMarkup(
      <CoordinationCard
        identity={resolveCoordinationVisualIdentity(coordinations()[0])}
        status="DESCONOCIDO"
      />,
    )
    expect(unknown).toContain('data-status="DESCONOCIDO"')
    expect(unknown).toContain('Desconocido')
    expect(unknown).not.toContain('Estable')
  })

  it('la identidad cromática no sustituye al estado', () => {
    const html = markup(coordinations())
    const identityColors = [...html.matchAll(/--coord-rgb:\s*([\d ]+)/g)].map(
      (match) => match[1],
    )

    // 15 identidades cromáticas propias frente a 3 estados: el color no está
    // haciendo de estado, ni el estado de identidad.
    expect(identityColors).toHaveLength(15)
    expect(new Set(identityColors).size).toBe(15)
    expect(new Set(cardAttributes(html, 'data-status')).size).toBe(3)

    // Ninguna carta usa los rgb de estado como identidad.
    const statusRgb = ['122 196 138', '240 176 84', '244 96 104', '132 150 176']
    for (const rgb of statusRgb) {
      expect(identityColors).not.toContain(rgb)
    }
  })

  it('las coordinaciones críticas conservan su identidad cromática', () => {
    const critical = coordinations().find((row) => row.code === 'coord-ingenierias')
    expect(critical?.status).toBe('CRITICO')

    const html = renderToStaticMarkup(
      <CoordinationCard
        identity={resolveCoordinationVisualIdentity(critical!)}
        status="CRITICO"
      />,
    )
    // Ingenierías es naranja (#FF8A2A) y sigue siéndolo estando en crítico.
    expect(html).toMatch(/--coord-rgb:\s*255 138 42/)
    expect(html).toContain('data-status="CRITICO"')
  })

  it('el aura es una capa aparte y decorativa', () => {
    const html = markup(coordinations())
    expect(countOf(html, 'coordination-card__aura')).toBe(15)
    expect(countOf(html, 'class="coordination-card__aura" aria-hidden="true"')).toBe(15)
  })
})

describe('CoordinationCardDeck · identidad visual', () => {
  it('cada carta usa la isla y el icono de su coordinación', () => {
    const html = markup(coordinations())
    expect(html).toContain('/islas/CoordGeneral.webp')
    expect(html).toContain('/islas/CoordBellasArtes.webp')
    expect(html).toContain('/iconos/display/IconoB2B.png')
    expect(countOf(html, 'coordination-card__island')).toBe(15)
  })

  it('las imágenes son decorativas: el nombre lo da el texto', () => {
    const html = markup(coordinations())
    expect(countOf(html, 'alt=""')).toBe(30)
  })
})

describe('CoordinationCardDeck · accesibilidad e interacción', () => {
  it('cada carta es un button real con aria-label útil', () => {
    const html = markup(coordinations())
    expect(countOf(html, '<button type="button"')).toBe(15)
    expect(html).toContain(
      'aria-label="Coordinador Bellas Artes. Estado operacional: Alerta."',
    )
    expect(html).not.toContain('<div onClick')
  })

  it('onSelect está preparado pero no se conecta si no se pasa', () => {
    const identity = resolveCoordinationVisualIdentity(coordinations()[0])

    const withoutHandler = CoordinationCard({ identity, status: 'ESTABLE' })
    expect(withoutHandler.props.onClick).toBeUndefined()

    const onSelect = vi.fn()
    const withHandler = CoordinationCard({ identity, status: 'ESTABLE', onSelect })
    expect(withHandler.props.onClick).toBeTypeOf('function')

    withHandler.props.onClick()
    expect(onSelect).toHaveBeenCalledWith('coord-general')
  })

  it('sin selección todas las cartas declaran aria-pressed=false', () => {
    const html = markup(coordinations())
    expect(countOf(html, 'aria-pressed="false"')).toBe(15)
    expect(html).not.toContain('aria-pressed="true"')
  })
})

describe('CoordinationCardDeck · selección', () => {
  it('la carta activa sale de la baraja y quedan 14', () => {
    const html = markup(coordinations(), { selectedCode: 'coord-ingenierias' })
    expect(countOf(html, 'data-testid="coordination-card"')).toBe(14)
    expect(html).toContain('data-count="14"')
    expect(html).not.toContain('data-code="coord-ingenierias"')
  })

  it('las 14 restantes siguen mostrando nombre y estado', () => {
    const html = markup(coordinations(), { selectedCode: 'coord-ingenierias' })
    expect(countOf(html, 'data-testid="coordination-card-status"')).toBe(14)
    for (const [code, , shortName] of CATALOG) {
      if (code === 'coord-ingenierias') continue
      expect(html).toContain(shortName)
    }
  })

  it('las 14 restantes siguen siendo botones no presionados', () => {
    const html = markup(coordinations(), { selectedCode: 'coord-negocios' })
    expect(countOf(html, '<button')).toBe(14)
    expect(countOf(html, 'aria-pressed="false"')).toBe(14)
  })

  it('la baraja se marca comprimida, sin ocultar cartas', () => {
    const html = markup(coordinations(), { selectedCode: 'coord-negocios' })
    expect(html).toContain('data-compressed="true"')
    expect(html).not.toContain('data-compressed="false"')
  })

  it('sin selección la baraja no está comprimida', () => {
    expect(markup(coordinations())).toContain('data-compressed="false"')
  })

  it('Coordinación General también puede ser la activa', () => {
    const html = markup(coordinations(), { selectedCode: 'coord-general' })
    expect(countOf(html, 'data-testid="coordination-card"')).toBe(14)
    expect(html).not.toContain('data-code="coord-general"')
  })

  it('con 14 cartas el reparto pasa a 7 + 7', () => {
    const html = markup(coordinations(), { selectedCode: 'coord-servicios' })
    const bands = html
      .split('data-testid="coordination-card-band"')
      .slice(1)
      .map((band) => countOf(band, 'data-testid="coordination-card"'))
    expect(bands).toEqual([7, 7])
  })
})
