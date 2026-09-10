import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CoordinationProblemPanel } from '@/modules/operational-cards/components/CoordinationProblemPanel'
import { resolveCoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import { resolvePanelAnchor } from '@/modules/operational-cards/data/panelAnchor'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import type {
  CoordinationProblem,
  OperationalCardsLevel1State,
} from '@/modules/operational-cards/types/operational-cards.state'

/**
 * Panel de LEVEL 1 anclado a la carta.
 *
 * Hereda el contrato de lectura de `ActiveCoordinationCard`, a la que
 * sustituye: nombre de producto, estado en TEXTO, resumen coherente con la
 * lista, y los cuatro estados de carga sin que ninguno se disfrace de otro. Lo
 * que añade es el anclaje, que es lo que lo convierte en «el panel de ESTA
 * carta» y no en un panel genérico.
 */

const COORDINATION: CoordinationOverview = {
  id: 'uuid-homologaciones',
  code: 'coord-homologaciones',
  name: 'Homologaciones',
  shortName: 'Homologaciones',
  color: '#28C8F4',
  displayOrder: 8,
  status: 'CRITICO',
  activeProblemsCount: 4,
  criticalCount: 2,
  affectedCoordinationCount: 1,
}

const ANCHOR = resolvePanelAnchor({
  slotX: 1.5,
  orientation: 'RIGHT',
  stageWidth: 7.215,
  panelWidth: 2.2,
})

function problem(
  id: string,
  severity: CoordinationProblem['severity'],
): CoordinationProblem {
  return {
    id,
    title: `Problema ${id}`,
    severity,
    status: 'OPEN',
    createdAt: '2026-08-01T10:00:00.000Z',
  }
}

function markup(
  level1: OperationalCardsLevel1State,
  options: { productLabel?: string; anchor?: typeof ANCHOR } = {},
): string {
  return renderToStaticMarkup(
    <CoordinationProblemPanel
      coordination={COORDINATION}
      identity={resolveCoordinationVisualIdentity(COORDINATION)}
      productLabel={options.productLabel ?? 'Servicio'}
      anchor={options.anchor ?? ANCHOR}
      level1={level1}
      onProblemSelect={() => undefined}
    />,
  )
}

function level1(
  status: OperationalCardsLevel1State['status'],
  problems: CoordinationProblem[] = [],
): OperationalCardsLevel1State {
  return {
    status,
    coordinationCode: COORDINATION.code,
    problems,
    errorMessage: status === 'error' ? 'boom' : null,
  }
}

function countOf(html: string, needle: string): number {
  return html.split(needle).length - 1
}

describe('CoordinationProblemPanel · identidad de la coordinación', () => {
  it('titula con el nombre de PRODUCTO, no con el técnico', () => {
    // El nodo se llama «Servicio» y se apoya en la fila `coord-homologaciones`.
    // Abrir «Servicio» y leer «Homologaciones» se interpreta como un error de
    // datos, así que el catálogo manda sobre el nombre de la fila.
    const html = markup(level1('ready', [problem('p1', 'CRITICAL')]))

    expect(html).toContain('Servicio')
    expect(html).not.toContain('>Homologaciones<')
  })

  it('el nombre es un encabezado de verdad, y nombra a la región', () => {
    // Sin encabezado, un lector de pantalla no puede saltar al panel ni saber
    // de qué coordinación está hablando.
    const html = markup(level1('ready', [problem('p1', 'HIGH')]))

    expect(html).toContain('<h2')
    expect(html).toContain(`id="coordination-panel-title-${COORDINATION.code}"`)
    expect(html).toContain(
      `aria-labelledby="coordination-panel-title-${COORDINATION.code}"`,
    )
  })

  it('el estado se dice con TEXTO, no solo con color', () => {
    const html = markup(level1('ready'))

    expect(html).toContain('data-testid="coordination-panel-status"')
    expect(html).toContain('Crítico')
    expect(html).toContain('data-status="CRITICO"')
  })

  it('declara a qué coordinación pertenece', () => {
    expect(markup(level1('ready'))).toContain(`data-code="${COORDINATION.code}"`)
  })
})

describe('CoordinationProblemPanel · anclaje a la carta', () => {
  it('publica la geometría del ancla como variables, no como píxeles', () => {
    // En anchos de carta, igual que la mesa: así el panel se alinea con su
    // carta a cualquier resolución sin medir nada en el DOM.
    const html = markup(level1('ready'))

    expect(html).toContain('--panel-x:1.5')
    expect(html).toContain('--panel-notch:0.5')
  })

  it('el posicionador y el panel son nodos DISTINTOS', () => {
    // Uno coloca y el otro anima. Con los dos transforms en el mismo nodo,
    // Motion escribe el suyo en línea y borra la posición: el panel aparecía
    // centrado bajo el personaje para las nueve coordinaciones.
    const html = markup(level1('ready'))

    expect(html).toContain('data-testid="coordination-panel-anchor"')
    expect(html).toContain('data-testid="coordination-problem-panel"')
    expect(html.indexOf('coordination-panel-anchor')).toBeLessThan(
      html.indexOf('coordination-problem-panel'),
    )
  })

  it('expone el lado y si hubo recorte, para que el CSS no lo recalcule', () => {
    const html = markup(level1('ready'))
    expect(html).toContain('data-side="RIGHT"')
    expect(html).toContain('data-clamped="false"')

    const extreme = markup(level1('ready'), {
      anchor: resolvePanelAnchor({
        slotX: -3,
        orientation: 'LEFT',
        stageWidth: 7.215,
        panelWidth: 2.2,
      }),
    })
    expect(extreme).toContain('data-side="LEFT"')
    expect(extreme).toContain('data-clamped="true"')
  })
})

describe('CoordinationProblemPanel · los cuatro estados de LEVEL 1', () => {
  it('mientras carga muestra esqueleto y nada más', () => {
    const html = markup(level1('loading'))

    expect(html).toContain('data-testid="coordination-panel-loading"')
    expect(html).toContain('data-level1="loading"')
    expect(html).not.toContain('data-testid="coordination-panel-empty"')
    expect(html).not.toContain('data-testid="problem-row"')
  })

  it('sin selección resuelta todavía, `idle` también es carga', () => {
    expect(markup(level1('idle'))).toContain(
      'data-testid="coordination-panel-loading"',
    )
  })

  it('sin problemas dice que no los hay', () => {
    const html = markup(level1('ready', []))

    expect(html).toContain('Todo bajo control')
    expect(html).toContain('data-testid="coordination-panel-empty"')
  })

  it('un error NO se disfraza de calma', () => {
    // La distinción que no puede perderse: «no hay problemas» y «no pudimos
    // preguntar» son estados opuestos, y confundirlos hace que una
    // coordinación rota parezca sana.
    const html = markup(level1('error'))

    expect(html).toContain('No pudimos cargar los problemas de esta coordinación.')
    expect(html).toContain('role="alert"')
    expect(html).not.toContain('Todo bajo control')
    expect(html).not.toContain('data-testid="coordination-panel-empty"')
  })

  it('con problemas los pinta como botones', () => {
    const html = markup(
      level1('ready', [
        problem('p1', 'CRITICAL'),
        problem('p2', 'HIGH'),
        problem('p3', 'LOW'),
      ]),
    )

    expect(countOf(html, 'data-testid="problem-row"')).toBe(3)
    // Botones de verdad: es lo que abre la isla con Enter o con Espacio.
    expect(countOf(html, '<button')).toBe(3)
    expect(html).not.toContain('data-testid="coordination-panel-empty"')
  })

  it('la lista tiene scroll propio y se puede recorrer con el teclado', () => {
    const html = markup(level1('ready', [problem('p1', 'CRITICAL')]))

    expect(html).toContain('data-testid="coordination-panel-problems"')
    expect(html).toContain('tabindex="0"')
    expect(html).toContain('role="group"')
  })

  it('no atrapa el foco: no hay diálogo ni modal', () => {
    const html = markup(level1('ready', [problem('p1', 'CRITICAL')]))

    expect(html).not.toContain('role="dialog"')
    expect(html).not.toContain('aria-modal')
  })
})

describe('CoordinationProblemPanel · el resumen no contradice a la lista', () => {
  it('con la lista cargada cuenta lo que se está viendo', () => {
    const html = markup(
      level1('ready', [problem('p1', 'CRITICAL'), problem('p2', 'MEDIUM')]),
    )

    // Dos problemas y un crítico, aunque LEVEL 0 dijera cuatro y dos: la
    // cabecera describe la lista que el usuario tiene delante.
    expect(html).toContain('2 problemas activos')
    expect(html).toContain('1 crítico')
  })

  it('mientras carga se apoya en el conteo de LEVEL 0', () => {
    const html = markup(level1('loading'))

    expect(html).toContain('4 problemas activos')
  })

  it('con la lista vacía la cabecera no puede decir que hay problemas', () => {
    const html = markup(level1('ready', []))

    expect(html).not.toContain('4 problemas activos')
  })
})
