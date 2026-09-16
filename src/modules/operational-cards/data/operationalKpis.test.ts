import { describe, expect, it } from 'vitest'
import { resolveOperationalKpis } from '@/modules/operational-cards/data/operationalKpis'
import type { OperationalKpisInput } from '@/modules/operational-cards/data/operationalKpis'
import type {
  CoordinationOverview,
  OperationalOverview,
} from '@/modules/operational-cards/types/operational-overview.contract'
import type {
  CoordinationProblem,
  OperationalCardsLevel1State,
} from '@/modules/operational-cards/types/operational-cards.state'

/**
 * Derivación de los indicadores del carril.
 *
 * Lo que se vigila aquí no es la presentación sino la HONESTIDAD de cada cifra:
 * que salga de un campo real, que LEVEL 1 mande sobre LEVEL 0 en cuanto llega,
 * que un dato ausente se declare ausente en vez de aparecer como cero, y que
 * nada de esto se convierta nunca en un índice inventado.
 */

function coordination(
  overrides: Partial<CoordinationOverview> = {},
): CoordinationOverview {
  return {
    id: 'uuid-b2b',
    code: 'coord-b2b',
    name: 'Coordinador B2B',
    shortName: 'B2B',
    color: '#C8324B',
    displayOrder: 2,
    status: 'CRITICO',
    activeProblemsCount: 4,
    criticalCount: 2,
    affectedCoordinationCount: 1,
    ...overrides,
  }
}

function overview(
  overrides: Partial<OperationalOverview> = {},
): OperationalOverview {
  return {
    directionStatus: 'CRITICO',
    generatedAt: '2026-08-01T10:00:00.000Z',
    totals: { critical: 7, alert: 1, stable: 1 },
    coordinations: [coordination()],
    analystRegistry: {
      status: 'ALERTA',
      activeProblemsCount: 3,
      criticalCount: 0,
      affectedCoordinationCount: 0,
    },
    ...overrides,
  }
}

function problem(
  id: string,
  severity: CoordinationProblem['severity'],
  slaHealth?: CoordinationProblem['slaHealth'],
): CoordinationProblem {
  return {
    id,
    title: `Problema ${id}`,
    severity,
    status: 'OPEN',
    createdAt: '2026-08-01T10:00:00.000Z',
    ...(slaHealth ? { slaHealth } : {}),
  }
}

function level1(
  overrides: Partial<OperationalCardsLevel1State> = {},
): OperationalCardsLevel1State {
  return {
    status: 'idle',
    coordinationCode: null,
    problems: [],
    errorMessage: null,
    ...overrides,
  }
}

function resolve(overrides: Partial<OperationalKpisInput> = {}) {
  return resolveOperationalKpis({
    level0: 'ready',
    overview: overview(),
    selectedCoordination: null,
    level1: level1(),
    ...overrides,
  })
}

function counter(kpis: NonNullable<ReturnType<typeof resolve>>, id: string) {
  const found = kpis.counters.find((entry) => entry.id === id)
  expect(found, `falta el indicador ${id}`).toBeDefined()
  return found!
}

describe('resolveOperationalKpis · sin datos todavía', () => {
  it('sin LEVEL 0 resuelto no devuelve indicadores', () => {
    // Cero no es «no lo sé»: mientras no haya overview, no hay nada que decir.
    expect(resolve({ level0: 'loading', overview: null })).toBeNull()
    expect(resolve({ level0: 'error', overview: null })).toBeNull()
  })
})

describe('resolveOperationalKpis · Dirección', () => {
  it('habla de la Dirección cuando no hay coordinación observada', () => {
    const kpis = resolve()!

    expect(kpis.scope).toBe('DIRECTION')
    expect(kpis.contextLabel).toBe('Dirección de Operaciones')
    expect(kpis.status).toBe('CRITICO')
    expect(kpis.statusLabel).toBe('Crítico')
  })

  it('cuenta COORDINACIONES por estado, con los totales del backend', () => {
    const kpis = resolve()!

    expect(counter(kpis, 'critical-coordinations').value).toBe(7)
    expect(counter(kpis, 'alert-coordinations').value).toBe(1)
    expect(counter(kpis, 'stable-coordinations').value).toBe(1)
  })

  it('declara el Registro de analista con su propio estado', () => {
    // Es una fuente operacional aparte: no tiene carta y no suma en totales,
    // así que si no se declara aquí no se ve en ninguna parte.
    const registry = counter(resolve()!, 'analyst-registry')

    expect(registry.value).toBe(3)
    expect(registry.hint).toContain('Alerta')
  })

  it('no inventa un total de problemas de la Dirección', () => {
    // Sumar `coordinations[]` mezclaría filas técnicas que no son cartas y
    // podría contar dos veces a un padre y sus hijas. No existe ese agregado.
    const ids = resolve()!.counters.map((entry) => entry.id)

    expect(ids).not.toContain('active-problems')
  })

  it('no hay reparto por severidad sin lista de problemas', () => {
    expect(resolve()!.severity).toBeNull()
    expect(resolve()!.pending).toBe(false)
  })

  it('con la Dirección estable y todo en cero, las cifras son cero', () => {
    const kpis = resolve({
      overview: overview({
        directionStatus: 'ESTABLE',
        totals: { critical: 0, alert: 0, stable: 9 },
        analystRegistry: {
          status: 'ESTABLE',
          activeProblemsCount: 0,
          criticalCount: 0,
          affectedCoordinationCount: 0,
        },
      }),
    })!

    expect(kpis.statusLabel).toBe('Estable')
    expect(counter(kpis, 'critical-coordinations').value).toBe(0)
    expect(counter(kpis, 'analyst-registry').value).toBe(0)
  })
})

describe('resolveOperationalKpis · coordinación observada', () => {
  it('con LEVEL 1 aún en vuelo se apoya en LEVEL 0 y lo declara', () => {
    const kpis = resolve({
      selectedCoordination: coordination(),
      level1: level1({ status: 'loading', coordinationCode: 'coord-b2b' }),
    })!

    expect(kpis.scope).toBe('COORDINATION')
    expect(counter(kpis, 'active-problems').value).toBe(4)
    expect(counter(kpis, 'critical-problems').value).toBe(2)
    expect(kpis.severity).toBeNull()
    expect(kpis.pending).toBe(true)
  })

  it('con LEVEL 1 resuelto manda la lista que el usuario tiene delante', () => {
    const kpis = resolve({
      selectedCoordination: coordination(),
      level1: level1({
        status: 'ready',
        coordinationCode: 'coord-b2b',
        problems: [
          problem('p1', 'CRITICAL', 'overdue'),
          problem('p2', 'HIGH', 'on_track'),
          problem('p3', 'MEDIUM', 'at_risk'),
        ],
      }),
    })!

    // Tres y uno, aunque LEVEL 0 dijera cuatro y dos.
    expect(counter(kpis, 'active-problems').value).toBe(3)
    expect(counter(kpis, 'critical-problems').value).toBe(1)
    expect(kpis.pending).toBe(false)
  })

  it('usa el nombre de PRODUCTO cuando existe', () => {
    const kpis = resolve({
      selectedCoordination: coordination({
        code: 'coord-homologaciones',
        shortName: 'Homologaciones',
      }),
      productLabel: 'Servicio',
    })!

    expect(kpis.contextLabel).toBe('Servicio')
  })

  it('sin label de producto cae al nombre corto, no al técnico', () => {
    expect(resolve({ selectedCoordination: coordination() })!.contextLabel).toBe(
      'B2B',
    )
  })

  it('cuenta los SLA vencidos por su estado explícito', () => {
    const kpis = resolve({
      selectedCoordination: coordination(),
      level1: level1({
        status: 'ready',
        coordinationCode: 'coord-b2b',
        problems: [
          problem('p1', 'CRITICAL', 'overdue'),
          problem('p2', 'HIGH', 'overdue'),
          problem('p3', 'LOW', 'on_track'),
        ],
      }),
    })!

    expect(counter(kpis, 'sla-overdue').value).toBe(2)
  })

  it('si ningún problema trae SLA, dice SIN DATO y no cero', () => {
    // «Ninguno vencido» y «no sabemos» son afirmaciones distintas, y la
    // segunda no puede disfrazarse de la primera.
    const kpis = resolve({
      selectedCoordination: coordination(),
      level1: level1({
        status: 'ready',
        coordinationCode: 'coord-b2b',
        problems: [problem('p1', 'CRITICAL'), problem('p2', 'HIGH')],
      }),
    })!

    const sla = counter(kpis, 'sla-overdue')
    expect(sla.value).toBeNull()
    expect(sla.hint).toBe('Sin dato de SLA')
  })

  it('reparte por severidad en el orden congelado, incluidos los ceros', () => {
    const kpis = resolve({
      selectedCoordination: coordination(),
      level1: level1({
        status: 'ready',
        coordinationCode: 'coord-b2b',
        problems: [
          problem('p1', 'CRITICAL'),
          problem('p2', 'CRITICAL'),
          problem('p3', 'MEDIUM'),
        ],
      }),
    })!

    expect(kpis.severity).toEqual([
      { severity: 'CRITICAL', label: 'Críticos', value: 2 },
      { severity: 'HIGH', label: 'Altos', value: 0 },
      { severity: 'MEDIUM', label: 'Medios', value: 1 },
      { severity: 'LOW', label: 'Bajos', value: 0 },
    ])
  })

  it('una coordinación sin problemas cuenta cero, y no se calla', () => {
    const kpis = resolve({
      selectedCoordination: coordination({
        status: 'ESTABLE',
        activeProblemsCount: 0,
        criticalCount: 0,
        affectedCoordinationCount: 0,
      }),
      level1: level1({
        status: 'ready',
        coordinationCode: 'coord-b2b',
        problems: [],
      }),
    })!

    expect(counter(kpis, 'active-problems').value).toBe(0)
    expect(counter(kpis, 'affected-areas').value).toBe(0)
    expect(kpis.severity).toEqual([
      { severity: 'CRITICAL', label: 'Críticos', value: 0 },
      { severity: 'HIGH', label: 'Altos', value: 0 },
      { severity: 'MEDIUM', label: 'Medios', value: 0 },
      { severity: 'LOW', label: 'Bajos', value: 0 },
    ])
  })

  it('un LEVEL 1 de OTRA coordinación no contamina las cifras', () => {
    // Protección contra el dato viejo: una respuesta que pertenece a la
    // selección anterior no puede alimentar el carril de la nueva.
    const kpis = resolve({
      selectedCoordination: coordination(),
      level1: level1({
        status: 'ready',
        coordinationCode: 'coord-saber-pro',
        problems: [problem('otro', 'LOW')],
      }),
    })!

    expect(counter(kpis, 'active-problems').value).toBe(4)
    expect(kpis.severity).toBeNull()
  })

  it('con LEVEL 1 en error no se queda esperando para siempre', () => {
    const kpis = resolve({
      selectedCoordination: coordination(),
      level1: level1({
        status: 'error',
        coordinationCode: 'coord-b2b',
        errorMessage: 'boom',
      }),
    })!

    // Se sostiene en LEVEL 0, que sigue siendo un dato real y vigente.
    expect(counter(kpis, 'active-problems').value).toBe(4)
    expect(kpis.pending).toBe(false)
  })

  it('una coordinación DESCONOCIDA se declara como tal', () => {
    const kpis = resolve({
      selectedCoordination: coordination({ status: 'DESCONOCIDO' }),
    })!

    expect(kpis.status).toBe('DESCONOCIDO')
    expect(kpis.statusLabel).toBe('Desconocido')
  })
})

describe('resolveOperationalKpis · sin métricas inventadas', () => {
  it('ningún indicador es un índice, un score ni un porcentaje', () => {
    const direction = resolve()!
    const local = resolve({
      selectedCoordination: coordination(),
      level1: level1({
        status: 'ready',
        coordinationCode: 'coord-b2b',
        problems: [problem('p1', 'CRITICAL', 'overdue')],
      }),
    })!

    for (const kpis of [direction, local]) {
      for (const entry of kpis.counters) {
        // Conteos enteros o ausencia declarada. Nada entre medias.
        expect(entry.value === null || Number.isInteger(entry.value)).toBe(true)
        expect(entry.label).not.toMatch(/score|índice|salud|%/i)
      }
    }
  })
})
