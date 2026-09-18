import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CoordinationCard } from '@/modules/operational-cards/components/CoordinationCard'
import { CoordinationTable } from '@/modules/operational-cards/components/CoordinationTable'
import { resolveDeckSelectionContext } from '@/modules/operational-cards/data/deckContext'
import { buildTableLayout } from '@/modules/operational-cards/data/tableLayout'
import {
  buildProductTable,
  LEGACY_UNMAPPED_CODES,
  PRODUCT_TOP_LEVEL,
} from '@/modules/operational-cards/data/productHierarchy'
import { resolveCoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'

/**
 * Mesa de PRODUCTO: nueve mazos sobre quince filas técnicas.
 *
 * Se renderiza con `react-dom/server`, que ya es dependencia del proyecto: no
 * hay jsdom ni testing-library instalados. Basta para comprobar estructura,
 * estados y accesibilidad del marcado; la geometría real se mide en e2e.
 */

/** Las quince filas técnicas que devuelve LEVEL 0, tal cual. */
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

/** Los cinco codes que son subordinaciones y NO deben ser nodos principales. */
const CHILD_CODES = [
  'coord-bellas-artes',
  'coord-empresarial',
  'coord-ingenierias',
  'coord-transversales',
  'coord-negocios',
]

/** Estado real observado en la base de datos local. */
const STATUS_BY_CODE: Readonly<Record<string, OperationalIntegrityStatus>> = {
  'coord-b2b': 'CRITICO',
  'coord-especializaciones': 'CRITICO',
  'coord-ingenierias': 'CRITICO',
  'coord-operaciones-academicas': 'CRITICO',
  'coord-homologaciones': 'CRITICO',
  'coord-negocios': 'CRITICO',
  'coord-servicios': 'ALERTA',
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
  const product = buildProductTable(rows)
  const topLevel = product.nodes.map((node) => node.coordination)
  const nodesByCode = Object.fromEntries(
    product.nodes.map((node) => [node.coordination.code, node]),
  )
  const context = resolveDeckSelectionContext({ selectedCode, nodesByCode })

  return renderToStaticMarkup(
    <CoordinationTable
      layout={buildTableLayout(topLevel, { sortByDisplayOrder: false })}
      nodesByCode={nodesByCode}
      /* El contexto se resuelve con el MISMO resolutor que usa la experiencia.
         Si el helper eligiera el modo a mano, la prueba podría afirmar una
         composición que la aplicación real nunca produce. */
      compositionMode={context.mode}
      deckParentCode={context.deckParentCode}
      selectedCode={selectedCode}
      onSelect={() => undefined}
      onHoverChange={() => undefined}
    />,
  )
}

function cardAttributes(html: string, attribute: string): string[] {
  const pattern = new RegExp(
    `data-testid="coordination-card"[^>]*?${attribute}="([^"]*)"`,
    'g',
  )
  return [...html.matchAll(pattern)].map((match) => match[1])
}

function countOf(html: string, needle: string): number {
  return html.split(needle).length - 1
}

describe('CoordinationTable · mesa de producto', () => {
  it('pinta NUEVE mazos, no quince cartas', () => {
    const html = markup(coordinations())
    expect(countOf(html, 'data-testid="coordination-card"')).toBe(9)
    expect(html).toContain('data-count="9"')
    expect(PRODUCT_TOP_LEVEL).toHaveLength(9)
  })

  it('los nueve caben en UN SOLO arco', () => {
    const html = markup(coordinations())
    expect(countOf(html, 'data-arc="0"')).toBe(9)
    expect(countOf(html, 'data-arc="1"')).toBe(0)
  })

  it('respeta el orden de PRODUCTO, no el displayOrder de la base de datos', () => {
    // En la base de datos Bellas Artes es 3 y su padre Operación Académica es
    // 8: ordenar por displayOrder rompería el organigrama.
    expect(cardAttributes(markup(coordinations()), 'data-code')).toEqual(
      PRODUCT_TOP_LEVEL.map((node) => node.code),
    )
  })

  it('el orden sobrevive a una respuesta desordenada', () => {
    const shuffled = [...coordinations()].reverse()
    expect(cardAttributes(markup(shuffled), 'data-code')).toEqual(
      PRODUCT_TOP_LEVEL.map((node) => node.code),
    )
  })

  it('no fabrica cartas para codes que LEVEL 0 no trajo', () => {
    expect(
      countOf(markup(coordinations().slice(0, 3)), 'data-testid="coordination-card"'),
    ).toBeLessThan(9)
    expect(markup([])).not.toContain('data-testid="coordination-card"')
  })
})

describe('CoordinationTable · pares frente a subordinaciones', () => {
  it('las cinco subordinaciones NO aparecen como nodos principales', () => {
    const codes = cardAttributes(markup(coordinations()), 'data-code')
    for (const child of CHILD_CODES) {
      expect(codes).not.toContain(child)
    }
  })

  it('coord-servicios no se pinta: es legacy pendiente de reconciliación', () => {
    const html = markup(coordinations())
    expect(cardAttributes(html, 'data-code')).not.toContain('coord-servicios')
    expect(LEGACY_UNMAPPED_CODES).toContain('coord-servicios')
  })

  it('pero su fila técnica sigue llegando: no se pierde, solo no se pinta', () => {
    const product = buildProductTable(coordinations())
    expect(product.unmapped.map((row) => row.code)).toEqual(['coord-servicios'])
  })

  it('las quince filas se reparten en nueve nodos, cinco hijas y una legacy', () => {
    const product = buildProductTable(coordinations())
    const children = product.nodes.flatMap((node) => node.children)

    expect(product.nodes).toHaveLength(9)
    expect(children).toHaveLength(5)
    expect(product.unmapped).toHaveLength(1)
    expect(product.missingCodes).toEqual([])
    expect(product.nodes.length + children.length + product.unmapped.length).toBe(
      15,
    )
  })
})

describe('CoordinationTable · mazo de Operación Académica', () => {
  it('muestra cinco peeks, uno por subordinación', () => {
    expect(
      countOf(markup(coordinations()), 'data-testid="coordination-deck-peek"'),
    ).toBe(5)
  })

  it('los peeks son de sus cinco hijas declaradas', () => {
    const html = markup(coordinations())
    for (const child of CHILD_CODES) {
      expect(html).toContain(`data-code="${child}"`)
    }
  })

  it('los peeks no añaden controles ni paradas de tabulador', () => {
    const html = markup(coordinations())
    // Nueve botones: uno por mazo. Ningún peek añade un control.
    expect(countOf(html, '<button type="button"')).toBe(9)
    expect(countOf(html, 'class="coordination-deck-stack__peek"')).toBe(5)
    expect(html).not.toContain('coordination-deck-stack__peek" tabindex')
  })

  it('anuncia la estructura por TEXTO, no solo por geometría', () => {
    expect(markup(coordinations())).toContain(
      'Operación Académica. Estado operacional: Crítico. 5 subordinaciones.',
    )
  })

  it('la hija con nombre de producto propio se presenta con ÉL', () => {
    /*
     * La base de datos la llama «Empresarial»; la institución, «Transformación
     * Empresarial», que es además lo que rotula su carta. El nombre de
     * producto se declara junto a su code en la estructura, así que la carta y
     * su nombre accesible dicen lo mismo.
     */
    const html = markup(coordinations(), { selectedCode: 'coord-operaciones-academicas' })

    expect(html).toContain('aria-label="Transformación Empresarial. Estado')
    expect(html).not.toContain('aria-label="Empresarial. Estado')

    // Y no se renombra nada más: el resto de la mano conserva el nombre del
    // DTO, que es el correcto para ellas.
    expect(html).toContain('aria-label="Ingenierías. Estado')
  })

  it('un mazo plano no anuncia subordinaciones', () => {
    const html = markup(coordinations())
    expect(html).toContain('data-subordinations="0"')
    expect(countOf(html, 'data-subordinations="5"')).toBe(1)
  })
})

describe('CoordinationTable · Fábrica preparada como mazo', () => {
  it('usa el mismo componente de mazo, con cero hijas', () => {
    expect(markup(coordinations())).toContain(
      'data-code="coord-fabrica-contenidos" data-children="0"',
    )
  })

  it('no inventa peeks falsos', () => {
    const fabrica = buildProductTable(coordinations()).nodes.find(
      (node) => node.coordination.code === 'coord-fabrica-contenidos',
    )
    expect(fabrica?.children).toEqual([])
  })

  it('todos los nodos son mazos: uno plano es un mazo de cero hijas', () => {
    expect(
      countOf(markup(coordinations()), 'data-testid="coordination-deck-stack"'),
    ).toBe(9)
  })
})

describe('CoordinationTable · Servicio', () => {
  it('el nodo Servicio se apoya en coord-homologaciones', () => {
    const servicio = buildProductTable(coordinations()).nodes.find(
      (node) => node.label === 'Servicio',
    )
    expect(servicio?.coordination.code).toBe('coord-homologaciones')
  })

  it('la carta se lee «Servicio»', () => {
    const html = markup(coordinations())
    expect(html).toContain('Servicio. Estado operacional: Crítico.')
    expect(html).toContain('>Servicio<')
  })

  it('NO pinta el arte de Homologaciones', () => {
    // Es el punto de la fase: una carta rotulada «Servicio» mostrando un PNG
    // que dice «HOMOLOGACIONES» se lee como un error de identidad.
    const html = markup(coordinations())
    expect(html).not.toContain('/CoordCards/Homologaciones.png')
  })

  it('pinta la cara propia de Servicio', () => {
    const html = markup(coordinations())
    expect(html).toContain('/CoordCards/servicio.png')
    // Nueve nodos principales, todos ilustrados.
    expect(countOf(html, 'coordination-card__face')).toBe(9)
    expect(countOf(html, 'coordination-card__island')).toBe(0)
  })

  it('y por eso su nombre queda oculto a la vista, como el resto', () => {
    const html = markup(coordinations())
    expect(countOf(html, 'class="coordination-card__name"')).toBe(0)
    expect(countOf(html, 'coordination-card__name--hidden')).toBe(9)
  })

  it('el arte prestado NO cambia el code técnico', () => {
    // Lo que se toma prestado es color, icono, isla y cara. El `code` sigue
    // siendo el de la fila que aporta estado y problemas, porque es la clave
    // de selección.
    const html = markup(coordinations())
    expect(html).toContain('data-code="coord-homologaciones"')
    expect(cardAttributes(html, 'data-code')).not.toContain('coord-servicios')
  })

  it('conserva el estado técnico de su fila, sin agregar nada', () => {
    const html = markup(coordinations())
    const codes = cardAttributes(html, 'data-code')
    const statuses = cardAttributes(html, 'data-status')
    expect(statuses[codes.indexOf('coord-homologaciones')]).toBe('CRITICO')
  })
})

describe('CoordinationTable · estado operacional', () => {
  it('cada mazo usa el estado técnico de SU fila, sin worst-child', () => {
    const html = markup(coordinations())
    const codes = cardAttributes(html, 'data-code')
    const statuses = cardAttributes(html, 'data-status')

    expect(statuses[codes.indexOf('coord-operaciones-academicas')]).toBe('CRITICO')
    expect(statuses[codes.indexOf('coord-proyeccion-social')]).toBe('ESTABLE')
  })

  it('el estado de una hija NO contamina al padre', () => {
    // Bellas Artes en CRITICO y su padre sin problemas propios: el padre sigue
    // ESTABLE. La agregación es una decisión de dominio que aún no se ha
    // tomado, y ninguna carta puede adelantarla.
    const html = markup(
      coordinations({
        'coord-bellas-artes': 'CRITICO',
        'coord-operaciones-academicas': 'ESTABLE',
      }),
    )
    const codes = cardAttributes(html, 'data-code')
    const statuses = cardAttributes(html, 'data-status')
    expect(statuses[codes.indexOf('coord-operaciones-academicas')]).toBe('ESTABLE')
  })

  it('cubre los cuatro estados, incluido DESCONOCIDO', () => {
    const html = markup(
      coordinations({
        'coord-general': 'ESTABLE',
        'coord-b2b': 'ALERTA',
        'coord-saber-pro': 'CRITICO',
        'coord-especializaciones': 'DESCONOCIDO',
      }),
    )
    expect(html).toContain('data-status="ESTABLE"')
    expect(html).toContain('data-status="ALERTA"')
    expect(html).toContain('data-status="CRITICO"')
    expect(html).toContain('data-status="DESCONOCIDO"')
  })

  it('el estado también es texto visible, no solo aura', () => {
    const html = markup(coordinations())
    expect(countOf(html, 'data-testid="coordination-card-status"')).toBe(9)
    expect(html).toContain('Crítico')
    expect(html).toContain('Estable')
  })

  it('la identidad cromática no sustituye al estado', () => {
    const html = markup(coordinations())
    // Nueve cartas más cinco peeks llevan identidad cromática.
    expect(countOf(html, '--coord-rgb')).toBe(14)

    const statusRgb = ['122 196 138', '240 176 84', '244 96 104', '132 150 176']
    for (const rgb of statusRgb) {
      expect(html).not.toContain(`--coord-rgb: ${rgb}`)
    }
  })

  it('el aura es una capa aparte y decorativa', () => {
    expect(
      countOf(markup(coordinations()), 'class="coordination-card__aura" aria-hidden="true"'),
    ).toBe(9)
  })
})

describe('CoordinationTable · accesibilidad e interacción', () => {
  it('cada mazo es un button real, no un div con onClick', () => {
    const html = markup(coordinations())
    expect(countOf(html, '<button type="button"')).toBe(9)
    expect(html).not.toContain('<div onClick')
    expect(html).not.toContain('role="button"')
  })

  it('sin selección ningún mazo declara aria-pressed=true', () => {
    const html = markup(coordinations())
    expect(countOf(html, 'aria-pressed="false"')).toBe(9)
    expect(html).not.toContain('aria-pressed="true"')
  })
})

describe('CoordinationTable · selección in-place', () => {
  const PARENT = 'coord-operaciones-academicas'

  /** Atributos de los slots, en orden de DOM. */
  function slotAttributes(html: string, attribute: string): string[] {
    const pattern = new RegExp(
      `data-testid="coordination-table-slot"[^>]*?${attribute}="([^"]*)"`,
      'g',
    )
    return [...html.matchAll(pattern)].map((match) => match[1])
  }

  it('la coordinación seleccionada NO sale de la mesa', () => {
    const html = markup(coordinations(), { selectedCode: PARENT })

    // Los nueve slots siguen dibujados, el observado incluido. Antes se
    // quedaban ocho porque la activa se marchaba a un área focal aparte; eso
    // era una segunda escena y es justo lo que la selección in-place elimina.
    expect(countOf(html, 'data-testid="coordination-table-slot"')).toBe(9)
    expect(html).toContain('data-count="9"')
    expect(html).toContain(`data-code="${PARENT}"`)
    // Y con el mazo abierto la escena suma las cinco hijas repartidas: nueve
    // slots de mesa más cinco de mano.
    expect(countOf(html, 'data-testid="coordination-deck-fan-slot"')).toBe(5)
    expect(countOf(html, 'data-testid="coordination-card"')).toBe(14)
  })

  it('observar una coordinación no mueve ni una carta de sitio', () => {
    // La comprobación que protege la memoria espacial. Las variables de
    // posición del slot —x, y, rotación y z— tienen que ser IDÉNTICAS con y
    // sin selección. Si alguna vez observar una coordinación recolocara la
    // mesa, el usuario perdería el mapa en el momento en que más lo necesita:
    // justo cuando está comparando coordinaciones.
    //
    // La mesa de un MAZO ESCOGIDO no entra aquí y tiene su propia prueba: ahí
    // la mesa se retira entera y el padre pasa a ser origen del mazo, que es
    // una composición distinta y declarada, no una selección que desordena.
    const resting = markup(coordinations())
    for (const selectedCode of ['coord-general', 'coord-fabrica-contenidos']) {
      const selected = markup(coordinations(), { selectedCode })
      for (const attribute of ['style', 'data-arc', 'data-arc-index']) {
        expect(
          slotAttributes(selected, attribute),
          `${attribute} con ${selectedCode} seleccionada`,
        ).toEqual(slotAttributes(resting, attribute))
      }
    }
  })

  it('el mazo escogido reparte papeles: un origen y ocho retiradas', () => {
    const html = markup(coordinations(), { selectedCode: PARENT })

    expect(countOf(html, 'data-deck-role="origin"')).toBe(1)
    expect(countOf(html, 'data-deck-role="retired"')).toBe(8)
    // Las retiradas salen del tabulador y del árbol de accesibilidad en el acto.
    // Una carta que no se ve no puede seguir siendo una parada de teclado.
    expect(countOf(html, 'inert=""')).toBe(8)
    // Y siguen montadas: volver a la mesa no tiene que reconstruir nada.
    expect(countOf(html, 'data-testid="coordination-table-slot"')).toBe(9)
  })

  it('el mazo origen recibe OTRA geometría, no una capa que lo empuje', () => {
    // El padre cambia de sitio, y lo hace por las mismas variables que usa el
    // arco: el slot sigue siendo la única autoridad de posición.
    const resting = markup(coordinations())
    const deck = markup(coordinations(), { selectedCode: PARENT })

    const parentIndex = cardAttributes(resting, 'data-code').indexOf(PARENT)
    const restingStyles = slotAttributes(resting, 'style')
    const deckStyles = slotAttributes(deck, 'style')

    // El padre se mueve...
    expect(deckStyles[parentIndex]).not.toEqual(restingStyles[parentIndex])
    expect(deckStyles[parentIndex]).toContain('--x:-1.8')
    // ...y las otras ocho conservan su geometría de arco: lo que las saca de
    // escena es `--exit`, que vive en el CSS, no una x nueva.
    deckStyles.forEach((style, index) => {
      if (index === parentIndex) return
      expect(style).toEqual(restingStyles[index])
    })
  })

  it('tampoco cambia el orden del DOM, que es el del tabulador', () => {
    const resting = cardAttributes(markup(coordinations()), 'data-code')
    const selected = cardAttributes(
      markup(coordinations(), { selectedCode: 'coord-saber-pro' }),
      'data-code',
    )
    expect(selected).toEqual(resting)
  })

  it('exactamente una carta queda presionada, esté abierto el mazo o no', () => {
    const simple = markup(coordinations(), { selectedCode: 'coord-b2b' })
    expect(countOf(simple, '<button')).toBe(9)
    expect(countOf(simple, 'aria-pressed="true"')).toBe(1)
    expect(countOf(simple, 'aria-pressed="false"')).toBe(8)

    // Con el mazo abierto hay catorce controles —nueve de mesa y cinco de
    // mano— y sigue habiendo exactamente uno presionado.
    const deck = markup(coordinations(), { selectedCode: PARENT })
    expect(countOf(deck, '<button')).toBe(14)
    expect(countOf(deck, 'aria-pressed="true"')).toBe(1)
    expect(countOf(deck, 'aria-pressed="false"')).toBe(13)
  })

  it('la presionada es la seleccionada, no otra', () => {
    const html = markup(coordinations(), { selectedCode: 'coord-b2b' })
    const pressed = cardAttributes(html, 'aria-pressed')
    const codes = cardAttributes(html, 'data-code')

    expect(codes[pressed.indexOf('true')]).toBe('coord-b2b')
  })

  it('las ocho restantes se atenúan, no desaparecen', () => {
    const html = markup(coordinations(), { selectedCode: PARENT })
    const states = slotAttributes(html, 'data-state')

    expect(states.filter((state) => state === 'selected')).toHaveLength(1)
    expect(states.filter((state) => state === 'dimmed')).toHaveLength(8)
  })

  it('en estado global no hay ni observada ni atenuadas', () => {
    const states = slotAttributes(markup(coordinations()), 'data-state')

    expect(new Set(states)).toEqual(new Set(['resting']))
    expect(markup(coordinations())).toContain('data-mode="resting"')
  })

  it('la mesa declara el modo, para que el CSS no lo adivine', () => {
    expect(markup(coordinations(), { selectedCode: PARENT })).toContain(
      'data-mode="selected"',
    )
  })

  it('la mesa declara además QUÉ está compuesto, no solo que hay selección', () => {
    // `data-mode` distingue dos situaciones; la composición distingue tres. Es
    // la diferencia entre «hay algo seleccionado» y «lo seleccionado es un
    // mazo», que es la que necesitan las fases de layout.
    expect(markup(coordinations())).toContain(
      'data-composition-mode="GLOBAL"',
    )
    expect(markup(coordinations(), { selectedCode: 'coord-b2b' })).toContain(
      'data-composition-mode="SIMPLE_SELECTED"',
    )
    expect(markup(coordinations(), { selectedCode: PARENT })).toContain(
      'data-composition-mode="DECK_SELECTED"',
    )
  })

  it('la composición simple no altera la geometría de la mesa', () => {
    // Una coordinación simple observada sigue dibujando los nueve slots en los
    // mismos sitios que en reposo: lo único que cambia es qué carta está
    // presionada y qué dice el atributo de composición. La compresión de la
    // mesa es cosa del CSS —el ancho de carta— y no toca ni una x.
    const resting = markup(coordinations())
    const simple = markup(coordinations(), { selectedCode: 'coord-b2b' })

    expect(slotAttributes(simple, 'style')).toEqual(
      slotAttributes(resting, 'style'),
    )
    expect(slotAttributes(simple, 'data-yield')).toEqual(
      slotAttributes(resting, 'data-yield'),
    )
    // Y no reparte papeles de mazo: eso es de la otra composición.
    expect(countOf(simple, 'data-deck-role')).toBe(0)
    expect(countOf(simple, 'inert=""')).toBe(0)
  })

  it('Operación Académica seleccionada conserva su mazo', () => {
    // El nodo sigue siendo un mazo mientras se le observa: sus cinco
    // subordinaciones siguen asomando detrás. Lo que R5 no hace es abrirlas —eso
    // es R7—, pero la noción de mazo no puede perderse al seleccionarlo.
    const html = markup(coordinations(), { selectedCode: PARENT })
    expect(countOf(html, 'data-testid="coordination-deck-peek"')).toBe(5)
  })

  it('cambiar de coordinación solo mueve el énfasis', () => {
    // Cambio directo: de un nodo a otro sin pasar por el estado global. Lo
    // único que se mueve entre los dos renders es qué carta está presionada.
    const first = markup(coordinations(), { selectedCode: 'coord-saber-pro' })
    const second = markup(coordinations(), { selectedCode: 'coord-b2b' })

    expect(cardAttributes(second, 'data-code')).toEqual(
      cardAttributes(first, 'data-code'),
    )
    expect(slotAttributes(second, 'style')).toEqual(slotAttributes(first, 'style'))
    expect(cardAttributes(second, 'aria-pressed')).not.toEqual(
      cardAttributes(first, 'aria-pressed'),
    )
  })
})

describe('CoordinationCard · identidad visual compartida', () => {
  /**
   * `coord-servicios` y `coord-homologaciones` siguen siendo dos coordinaciones
   * técnicas independientes, aunque el producto solo pinte una de las dos.
   * Compartir arte —o dejar de pintarse— no puede fusionar nada.
   */
  function cardOf(code: string, status: OperationalIntegrityStatus): string {
    const entry = CATALOG.find(([candidate]) => candidate === code)
    if (!entry) throw new Error(`code fuera del catálogo de prueba: ${code}`)
    const [, name, shortName] = entry

    return renderToStaticMarkup(
      <CoordinationCard
        identity={resolveCoordinationVisualIdentity({
          id: `uuid-${code}`,
          code,
          name,
          shortName,
          color: '#28C8F4',
          displayOrder: 1,
        })}
        status={status}
      />,
    )
  }

  it('Servicios pinta su cara propia, no la de Homologaciones', () => {
    const servicios = cardOf('coord-servicios', 'ESTABLE')

    expect(servicios).toContain('/CoordCards/servicio.png')
    expect(servicios).toContain('coordination-card__face')
    expect(servicios).not.toContain('/CoordCards/Homologaciones.png')
    expect(servicios).not.toContain('coordination-card__island')
  })

  it('con cara propia, el nombre de Servicios queda oculto a la vista', () => {
    const servicios = cardOf('coord-servicios', 'ESTABLE')

    expect(servicios).toContain('coordination-card__name--hidden')
    expect(servicios).toContain('>Servicios<')
    // El rótulo «Homologaciones» del PNG no llega al DOM de Servicios.
    expect(servicios).not.toContain('>Homologaciones<')
    expect(servicios).not.toContain('data-code="coord-homologaciones"')
  })

  it('Homologaciones sí conserva su cara ilustrada', () => {
    const homologaciones = cardOf('coord-homologaciones', 'CRITICO')

    expect(homologaciones).toContain('/CoordCards/Homologaciones.png')
    expect(homologaciones).toContain('coordination-card__name--hidden')
  })

  it('el estado operacional es independiente en cada una', () => {
    const servicios = cardOf('coord-servicios', 'ESTABLE')
    const homologaciones = cardOf('coord-homologaciones', 'CRITICO')

    expect(servicios).toContain('data-status="ESTABLE"')
    expect(servicios).toContain('Estable')
    expect(homologaciones).toContain('data-status="CRITICO"')
    expect(homologaciones).toContain('Crítico')
  })

  it('cada una conserva su aura y su etiqueta accesible', () => {
    const servicios = cardOf('coord-servicios', 'ESTABLE')

    expect(countOf(servicios, 'coordination-card__aura')).toBe(1)
    expect(servicios).toContain(
      'aria-label="Servicios. Estado operacional: Estable."',
    )
  })

  it('el nombre oculto sigue siendo texto real, no un atributo', () => {
    const ingenierias = cardOf('coord-ingenierias', 'CRITICO')

    // Visualmente oculto, presente en el DOM: es el nombre funcional y lo que
    // queda si la imagen no carga.
    expect(ingenierias).toContain('coordination-card__name--hidden')
    expect(ingenierias).toContain('>Ingenierías<')
    expect(ingenierias).toContain(
      'aria-label="Coordinador Ingenierías. Estado operacional: Crítico."',
    )
  })
})
