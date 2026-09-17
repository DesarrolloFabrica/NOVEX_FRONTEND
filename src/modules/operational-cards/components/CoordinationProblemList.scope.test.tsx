import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CoordinationProblemList } from '@/modules/operational-cards/components/CoordinationProblemList'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import type {
  CoordinationProblem,
  OperationalCardsLevel1State,
} from '@/modules/operational-cards/types/operational-cards.state'

/**
 * LOS CUATRO ESTADOS DE LA LISTA CENTRAL (fase 2.3).
 *
 * Una lista vacía no significa lo mismo según con qué alcance se leyó, y decir
 * «sin problemas activos» sobre una lectura restringida afirma algo que nadie
 * ha comprobado. Estas pruebas fijan que los cuatro casos se distingan y que el
 * estado de integridad del área NO se degrade por una lista vacía.
 */

/** Área CRÍTICA con doce problemas activos, según el resumen autorizado. */
const AREA_CRITICA = {
  id: 'uuid-esp',
  code: 'coord-especializaciones',
  name: 'Coordinador Especializaciones',
  shortName: 'Especializaciones',
  color: '#f46068',
  displayOrder: 6,
  status: 'CRITICO',
  activeProblemsCount: 12,
  criticalCount: 4,
  affectedCoordinationCount: 2,
} as CoordinationOverview

const IDENTIDAD = {
  name: 'Especializaciones',
  color: '#f46068',
} as never

function nivel1(
  parcial: Partial<OperationalCardsLevel1State>,
): OperationalCardsLevel1State {
  return {
    status: 'ready',
    coordinationCode: 'coord-especializaciones',
    problems: [],
    errorMessage: null,
    scope: 'complete',
    ...parcial,
  }
}

const pintar = (level1: OperationalCardsLevel1State) =>
  renderToStaticMarkup(
    <CoordinationProblemList
      coordination={AREA_CRITICA}
      identity={IDENTIDAD}
      productLabel="Especializaciones"
      level1={level1}
      selectedProblemId={null}
      onRetry={() => {}}
    />,
  )

describe('lectura COMPLETA sin resultados', () => {
  const html = pintar(nivel1({ problems: [], scope: 'complete' }))

  it('afirma que no hay problemas activos', () => {
    expect(html).toContain('Sin problemas activos')
  })

  it('no insinúa que falte contenido por permisos', () => {
    expect(html).not.toContain('visibles para tu usuario')
  })
})

describe('lectura PARCIAL sin resultados', () => {
  const html = pintar(nivel1({ problems: [], scope: 'own-only' }))

  it('dice que no hay ninguno VISIBLE, no que no los haya', () => {
    expect(html).toContain('No hay problemas activos visibles para tu usuario')
    expect(html).not.toContain('Sin problemas activos')
  })

  it('NO convierte el área en estable: conserva su estado del resumen', () => {
    /*
     * Es el caso que motivó la corrección: Especializaciones aparecía CRÍTICO
     * en su carta mientras la lista decía «todo bajo control».
     */
    expect(html).toContain('Crítico')
  })

  it('no presenta su recuento como el total del área', () => {
    // La cabecera sigue hablando de los doce problemas del área, no de cero.
    expect(html).toContain('12 problemas activos')
  })

  it('declara el alcance en el DOM', () => {
    expect(html).toContain('data-scope="own-only"')
  })
})

describe('lectura PARCIAL con resultados', () => {
  const propio: CoordinationProblem = {
    id: 'p-propio',
    title: 'Reporte propio en área ajena',
    severity: 'HIGH',
    status: 'OPEN',
    createdAt: '2026-09-01T10:00:00.000Z',
  }
  const html = pintar(nivel1({ problems: [propio], scope: 'own-only' }))

  it('muestra el reporte propio que el usuario sí puede leer', () => {
    expect(html).toContain('Reporte propio en área ajena')
  })

  it('sigue sin presentar ese recuento como el del área', () => {
    expect(html).toContain('12 problemas activos')
    expect(html).not.toContain('1 problema activo')
  })
})

describe('error de carga', () => {
  const html = pintar(nivel1({ status: 'error', errorMessage: 'boom' }))

  it('es un mensaje distinto del vacío, con reintento', () => {
    expect(html).toContain('No pudimos cargar los problemas')
    expect(html).toContain('Reintentar')
    expect(html).not.toContain('Sin problemas activos')
    expect(html).not.toContain('visibles para tu usuario')
  })
})

describe('carga en curso', () => {
  it('no afirma nada todavía', () => {
    const html = pintar(nivel1({ status: 'loading' }))
    expect(html).not.toContain('Sin problemas activos')
    expect(html).not.toContain('visibles para tu usuario')
    expect(html).not.toContain('No pudimos cargar')
  })
})
