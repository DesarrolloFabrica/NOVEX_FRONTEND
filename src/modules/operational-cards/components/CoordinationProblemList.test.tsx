import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CoordinationProblemList } from '@/modules/operational-cards/components/CoordinationProblemList'
import { resolveCoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import type {
  CoordinationProblem,
  OperationalCardsLevel1State,
} from '@/modules/operational-cards/types/operational-cards.state'

/**
 * Lista de LEVEL 1 de la coordinación observada.
 *
 * Hereda el contrato de lectura de `CoordinationProblemPanel`, a la que
 * sustituye: nombre de producto, estado en TEXTO, resumen coherente con la
 * lista, y los cuatro estados de carga sin que ninguno se disfrace de otro.
 *
 * Lo que NO hereda es el anclaje a la carta. El panel publicaba `--panel-x`,
 * `--panel-notch`, `data-side` y `data-clamped` porque colgaba de un slot de la
 * mesa; la lista vive en una región fija del shell y no cuelga de nada, así que
 * esas pruebas no se han trasladado: comprobarían una geometría que ya no
 * existe.
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
  lifePoints: 4,
}

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
  options: { productLabel?: string } = {},
): string {
  return renderToStaticMarkup(
    <CoordinationProblemList
      coordination={COORDINATION}
      identity={resolveCoordinationVisualIdentity(COORDINATION)}
      productLabel={options.productLabel ?? 'Servicio'}
      level1={level1}
      onProblemSelect={() => undefined}
    />,
  )
}

function level1(
  status: OperationalCardsLevel1State['status'],
  problems: CoordinationProblem[] = [],
  scope: OperationalCardsLevel1State['scope'] = 'complete',
): OperationalCardsLevel1State {
  return {
    status,
    coordinationCode: COORDINATION.code,
    problems,
    errorMessage: status === 'error' ? 'boom' : null,
    scope,
  }
}

function countOf(html: string, needle: string): number {
  return html.split(needle).length - 1
}

describe('CoordinationProblemList · identidad de la coordinación', () => {
  it('el título visible es solo «Problemas de la coordinación»', () => {
    const html = markup(level1('ready', [problem('p1', 'CRITICAL')]))

    expect(html).toMatch(/<h3[^>]*>Problemas de la coordinación<span/)
    expect(html).not.toContain('coordination-panel__eyebrow')
  })

  it('el encabezado nombra el área con el nombre de PRODUCTO, solo para lectores', () => {
    // El nodo se llama «Servicio» y se apoya en la fila `coord-homologaciones`.
    // Leer «Homologaciones» se interpretaría como un error de datos, así que el
    // catálogo manda sobre el nombre de la fila.
    const html = markup(level1('ready', [problem('p1', 'CRITICAL')]))

    expect(html).toContain('<span class="coordination-panel__sr-only">: Servicio</span>')
    expect(html).not.toContain('Homologaciones')
  })

  it('el nombre es un encabezado de verdad, y nombra a la región', () => {
    // Sin encabezado, un lector de pantalla no puede saltar a la lista ni saber
    // de qué coordinación está hablando.
    const html = markup(level1('ready', [problem('p1', 'HIGH')]))

    expect(html).toContain('<h3')
    expect(html).toContain(`id="coordination-list-title-${COORDINATION.code}"`)
    expect(html).toContain(
      `aria-labelledby="coordination-list-title-${COORDINATION.code}"`,
    )
  })

  it('no pinta badge de integridad: el estado queda como dato, sin recalcular', () => {
    // El estado lo cuentan la carta y el personaje; esta región no lo repite.
    const html = markup(level1('ready'))

    expect(html).not.toContain('data-testid="coordination-panel-status"')
    expect(html).not.toContain('Crítico')
    expect(html).toContain('data-status="CRITICO"')
  })

  it('declara a qué coordinación pertenece', () => {
    expect(markup(level1('ready'))).toContain(`data-code="${COORDINATION.code}"`)
  })

  it('no arrastra la geometría del panel anclado', () => {
    // La lista no cuelga de ninguna carta: si volvieran a aparecer estas
    // variables, alguien habría reintroducido el carril por la puerta de atrás.
    const html = markup(level1('ready', [problem('p1', 'CRITICAL')]))

    expect(html).not.toContain('--panel-x')
    expect(html).not.toContain('--panel-notch')
    expect(html).not.toContain('coordination-panel-anchor')
    expect(html).not.toContain('coordination-panel__notch')
  })
})

describe('CoordinationProblemList · los cuatro estados de LEVEL 1', () => {
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

    // VERDAD NUEVA: con lectura COMPLETA, cero resultados sí significa que el
    // área no tiene problemas activos, y se dice sin ambigüedad.
    expect(html).toContain('Sin problemas activos')
    expect(html).toContain('data-testid="coordination-panel-empty"')
  })

  it('un error NO se disfraza de calma', () => {
    // La distinción que no puede perderse: «no hay problemas» y «no pudimos
    // preguntar» son estados opuestos, y confundirlos hace que una
    // coordinación rota parezca sana.
    const html = markup(level1('error'))

    expect(html).toContain('No pudimos cargar los problemas de esta coordinación.')
    expect(html).toContain('role="alert"')
    expect(html).not.toContain('Sin problemas activos')
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
    // Solo las tres filas: el panel ya no tiene Expandir/Contraer.
    expect(countOf(html, '<button')).toBe(3)
    expect(html).not.toContain('data-testid="coordination-problems-expand"')
    expect(html).not.toContain('data-expanded')
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

describe('CoordinationProblemList · la cabecera no cuenta problemas', () => {
  it('ni con la lista cargada, ni cargando, ni vacía', () => {
    // Sin recuento en la cabecera, no puede contradecir a la lista ni presentar
    // un conteo restringido como el del área.
    for (const html of [
      markup(level1('ready', [problem('p1', 'CRITICAL'), problem('p2', 'MEDIUM')])),
      markup(level1('loading')),
      markup(level1('ready', [])),
    ]) {
      expect(html).not.toContain('data-testid="coordination-panel-summary"')
      expect(html).not.toMatch(/\d+ problemas? activos?/)
    }
  })
})
