import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ProblemIsland } from '@/modules/operational-cards/components/ProblemIsland'
import { initialProblemSectionsState } from '@/modules/operational-cards/types/problem-detail.types'
import type { OperationalCardsLevel2State } from '@/modules/operational-cards/types/operational-cards.state'
import type {
  ProblemDetail,
  ProblemSectionId,
} from '@/modules/operational-cards/types/problem-detail.types'

/**
 * Render de servidor, como el resto de componentes del módulo: no hay jsdom ni
 * testing-library en el proyecto. Comprueba marcado, accesibilidad y ausencia
 * de acciones mutables; no verifica CSS ni animación.
 */

const DETAIL: ProblemDetail = {
  id: 'p1',
  title: 'Aulas sin conectividad',
  severity: 'CRITICAL',
  status: 'OPEN',
  slaHealth: 'overdue',
  dueAt: '2026-08-10T10:00:00.000Z',
  summary: 'La sede norte perdió conectividad en seis aulas.',
  coordinationName: 'Coordinador Ingenierías',
  createdAt: '2026-08-01T10:00:00.000Z',
  impact: {
    summary: 'Afecta la operación docente de dos áreas.',
    areas: [
      {
        coordinationCode: 'coord-transversales',
        impactLevel: 'HIGH',
        description: 'Clases compartidas sin red.',
      },
    ],
    propagationDepth: 2,
  },
  intelligence: {
    headline: 'Riesgo concentrado en la sede norte',
    summary: 'La indisponibilidad afecta la continuidad docente.',
    keyPoints: ['Seis aulas sin red', 'Sin fecha de restablecimiento'],
    rootCause: 'Falla del enlace principal.',
    risks: [{ title: 'Incumplimiento de SLA', severity: 'HIGH' }],
  },
}

function level2(
  overrides: Partial<OperationalCardsLevel2State> = {},
): OperationalCardsLevel2State {
  return {
    status: 'ready',
    problemId: 'p1',
    detail: DETAIL,
    errorMessage: null,
    sections: initialProblemSectionsState,
    expanded: [],
    ...overrides,
  }
}

function markup(state: OperationalCardsLevel2State = level2()): string {
  return renderToStaticMarkup(
    <ProblemIsland
      level2={state}
      onClose={() => undefined}
      onToggleSection={() => undefined}
    />,
  )
}

function countOf(html: string, needle: string): number {
  return html.split(needle).length - 1
}

const SECTIONS: ProblemSectionId[] = [
  'impact',
  'ai',
  'recommendations',
  'evidences',
  'timeline',
]

describe('ProblemIsland · estructura', () => {
  it('muestra título, severidad, estado y SLA como texto', () => {
    const html = markup()
    expect(html).toContain('Aulas sin conectividad')
    expect(html).toContain('>Crítica<')
    expect(html).toContain('>Registrada<')
    expect(html).toContain('SLA vencido')
  })

  it('muestra el resumen real recibido', () => {
    expect(markup()).toContain(
      'La sede norte perdió conectividad en seis aulas.',
    )
  })

  it('presenta las cinco secciones en el orden congelado', () => {
    const html = markup()
    const order = SECTIONS.map((section) =>
      html.indexOf(`data-section="${section}"`),
    )
    expect(order.every((index) => index >= 0)).toBe(true)
    expect(order).toEqual([...order].sort((left, right) => left - right))
    expect(countOf(html, 'data-testid="island-section-toggle"')).toBe(5)
  })

  it('todas las secciones nacen cerradas', () => {
    const html = markup()
    expect(countOf(html, 'aria-expanded="false"')).toBe(5)
    expect(html).not.toContain('aria-expanded="true"')
    expect(html).not.toContain('data-testid="island-section-panel"')
  })

  it('la coordinación aparece como contexto secundario', () => {
    const html = markup()
    expect(html).toContain('problem-island__context')
    expect(html).toContain('Coordinador Ingenierías')
  })
})

describe('ProblemIsland · secciones desplegadas', () => {
  it('Impacto muestra áreas afectadas y propagación, sin pedir nada', () => {
    const html = markup(level2({ expanded: ['impact'] }))
    expect(html).toContain('data-testid="island-impact-areas"')
    expect(html).toContain('coord-transversales')
    expect(html).toContain('Propagación hasta 2 nivel')
  })

  it('Inteligencia IA muestra el análisis ya cargado', () => {
    const html = markup(level2({ expanded: ['ai'] }))
    expect(html).toContain('data-testid="island-ai"')
    expect(html).toContain('Riesgo concentrado en la sede norte')
    expect(html).toContain('Falla del enlace principal.')
  })

  it('sin análisis, IA declara la ausencia y no finge un resumen', () => {
    const html = markup(
      level2({
        detail: { ...DETAIL, intelligence: null, impact: null },
        expanded: ['ai', 'impact'],
      }),
    )
    expect(html).toContain('data-testid="island-ai-absent"')
    expect(html).toContain('Sin evaluación de impacto registrada.')
  })

  it('una sección perezosa en carga muestra su propio estado', () => {
    const html = markup(
      level2({
        expanded: ['evidences'],
        sections: {
          ...initialProblemSectionsState,
          evidences: { status: 'loading', items: [], errorMessage: null },
        },
      }),
    )
    expect(html).toContain('data-testid="island-section-loading"')
  })

  it('el error de una sección no reemplaza la isla', () => {
    const html = markup(
      level2({
        expanded: ['evidences'],
        sections: {
          ...initialProblemSectionsState,
          evidences: { status: 'error', items: [], errorMessage: 'boom' },
        },
      }),
    )
    expect(html).toContain('data-testid="island-section-error"')
    // La isla sigue mostrando su cabecera y su resumen.
    expect(html).toContain('Aulas sin conectividad')
    expect(html).toContain('data-testid="island-summary"')
    expect(html).not.toContain('data-testid="island-error"')
  })
})

describe('ProblemIsland · carga y error', () => {
  it('en carga muestra esqueleto y ya el título disponible', () => {
    const html = markup(level2({ status: 'loading', detail: null }))
    expect(html).toContain('data-testid="island-loading"')
    expect(html).toContain('Detalle del problema')
  })

  it('en error la isla sigue abierta con su aviso y su botón cerrar', () => {
    const html = markup(
      level2({ status: 'error', detail: null, errorMessage: 'sin red' }),
    )
    expect(html).toContain('data-testid="island-error"')
    expect(html).toContain('data-testid="island-close"')
    expect(html).not.toContain('data-testid="island-summary"')
  })
})

describe('ProblemIsland · accesibilidad', () => {
  it('es un diálogo con nombre accesible', () => {
    const html = markup()
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('aria-labelledby="problem-island-title"')
    expect(html).toContain('id="problem-island-title"')
    expect(html).toContain('<h2')
  })

  it('cada sección enlaza su botón con su panel', () => {
    const html = markup(level2({ expanded: ['impact'] }))
    expect(html).toContain('aria-controls="problem-section-panel-impact"')
    expect(html).toContain('id="problem-section-panel-impact"')
    expect(html).toContain('aria-labelledby="problem-section-toggle-impact"')
  })

  it('ofrece cerrar por botón y por velo, ambos etiquetados', () => {
    const html = markup()
    expect(html).toContain('data-testid="island-close"')
    expect(html).toContain('data-testid="problem-island-veil"')
    expect(countOf(html, 'aria-label="Cerrar el detalle del problema"')).toBe(2)
  })
})

describe('ProblemIsland · solo lectura', () => {
  it('no renderiza ninguna acción mutable', () => {
    const html = markup(
      level2({ expanded: ['impact', 'ai', 'recommendations', 'evidences', 'timeline'] }),
    )

    for (const forbidden of [
      'Reanalizar',
      'Analizar',
      'Editar',
      'Guardar',
      'Eliminar',
      'Cerrar situación',
      'Cambiar estado',
      'Simular',
      'Completar',
      'Aceptar',
      'Rechazar',
      'Subir',
    ]) {
      expect(html).not.toContain(forbidden)
    }
  })

  it('los únicos botones son cerrar, el velo y los cinco desplegables', () => {
    const html = markup()
    expect(countOf(html, '<button')).toBe(7)
  })

  it('no contiene formularios ni campos de entrada', () => {
    const html = markup(level2({ expanded: SECTIONS }))
    expect(html).not.toContain('<form')
    expect(html).not.toContain('<input')
    expect(html).not.toContain('<textarea')
    expect(html).not.toContain('<select')
  })
})
