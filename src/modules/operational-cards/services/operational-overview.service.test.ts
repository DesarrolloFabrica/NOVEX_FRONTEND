import { describe, expect, it } from 'vitest'
import {
  MAX_LIFE_POINTS,
  OperationalOverviewContractError,
  parseLifePoints,
  parseOperationalOverview,
} from '@/modules/operational-cards/services/operational-overview.service'

function coordinationPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    code: 'coord-general',
    name: 'Coordinación General',
    shortName: 'General',
    color: '#28C8F4',
    displayOrder: 1,
    status: 'ESTABLE',
    activeProblemsCount: 0,
    criticalCount: 0,
    affectedCoordinationCount: 0,
    ...overrides,
  }
}

function overviewPayload(overrides: Record<string, unknown> = {}) {
  return {
    directionStatus: 'CRITICO',
    generatedAt: '2026-09-02T14:50:27.703Z',
    totals: { critical: 7, alert: 1, stable: 7 },
    coordinations: Array.from({ length: 15 }, (_unused, index) =>
      coordinationPayload({
        id: `00000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`,
        code: `coord-${index + 1}`,
        displayOrder: index + 1,
      }),
    ),
    analystRegistry: {
      status: 'ESTABLE',
      activeProblemsCount: 0,
      criticalCount: 0,
      affectedCoordinationCount: 0,
    },
    ...overrides,
  }
}

describe('parseOperationalOverview · contrato válido', () => {
  it('conserva las 15 filas y los identificadores tal como llegan', () => {
    const overview = parseOperationalOverview(overviewPayload())

    expect(overview.coordinations).toHaveLength(15)
    expect(overview.directionStatus).toBe('CRITICO')
    expect(overview.totals).toEqual({ critical: 7, alert: 1, stable: 7 })
    expect(overview.generatedAt).toBe('2026-09-02T14:50:27.703Z')
    expect(overview.coordinations[0].code).toBe('coord-1')
    expect(overview.coordinations[0].id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('acepta un registro de analista con problemas activos', () => {
    const overview = parseOperationalOverview(
      overviewPayload({
        analystRegistry: {
          status: 'CRITICO',
          activeProblemsCount: 2,
          criticalCount: 1,
          affectedCoordinationCount: 3,
        },
      }),
    )

    expect(overview.analystRegistry).toEqual({
      status: 'CRITICO',
      activeProblemsCount: 2,
      criticalCount: 1,
      affectedCoordinationCount: 3,
    })
    expect(overview.coordinations).toHaveLength(15)
  })
})

describe('parseOperationalOverview · vocabulario inesperado', () => {
  it('directionStatus desconocido degrada a DESCONOCIDO, no a ESTABLE', () => {
    for (const value of ['stable', 'CRÍTICO', '', null, undefined, 3]) {
      const overview = parseOperationalOverview(
        overviewPayload({ directionStatus: value }),
      )
      expect(overview.directionStatus).toBe('DESCONOCIDO')
    }
  })

  it('coordination.status desconocido degrada a DESCONOCIDO', () => {
    const overview = parseOperationalOverview(
      overviewPayload({
        coordinations: [coordinationPayload({ status: 'attention' })],
      }),
    )
    expect(overview.coordinations[0].status).toBe('DESCONOCIDO')
  })

  it('analystRegistry.status desconocido degrada a DESCONOCIDO', () => {
    const overview = parseOperationalOverview(
      overviewPayload({
        analystRegistry: {
          status: 'unknown',
          activeProblemsCount: 0,
          criticalCount: 0,
          affectedCoordinationCount: 0,
        },
      }),
    )
    expect(overview.analystRegistry.status).toBe('DESCONOCIDO')
  })
})

describe('parseOperationalOverview · contrato inutilizable', () => {
  it('rechaza una respuesta que no es objeto', () => {
    for (const value of [null, undefined, 'ok', 42, []]) {
      expect(() => parseOperationalOverview(value)).toThrow(
        OperationalOverviewContractError,
      )
    }
  })

  it('rechaza coordinations ausente o no lista', () => {
    expect(() =>
      parseOperationalOverview(overviewPayload({ coordinations: undefined })),
    ).toThrow(/coordinations/)
    expect(() =>
      parseOperationalOverview(overviewPayload({ coordinations: {} })),
    ).toThrow(/coordinations/)
  })

  it('rechaza una coordinación sin id o sin code', () => {
    expect(() =>
      parseOperationalOverview(
        overviewPayload({
          coordinations: [coordinationPayload({ id: undefined })],
        }),
      ),
    ).toThrow(/id/)
    expect(() =>
      parseOperationalOverview(
        overviewPayload({
          coordinations: [coordinationPayload({ code: '' })],
        }),
      ),
    ).toThrow(/code/)
  })

  it('rechaza conteos que no son enteros no negativos', () => {
    for (const value of [-1, 1.5, Number.NaN, '3', null, undefined]) {
      expect(() =>
        parseOperationalOverview(
          overviewPayload({
            coordinations: [
              coordinationPayload({ activeProblemsCount: value }),
            ],
          }),
        ),
      ).toThrow(OperationalOverviewContractError)
    }
  })

  it('rechaza totals ausente o con conteos inválidos', () => {
    expect(() =>
      parseOperationalOverview(overviewPayload({ totals: undefined })),
    ).toThrow(/totals/)
    expect(() =>
      parseOperationalOverview(
        overviewPayload({ totals: { critical: 1, alert: 1 } }),
      ),
    ).toThrow(/totals.stable/)
  })

  it('rechaza generatedAt ausente o inválido', () => {
    expect(() =>
      parseOperationalOverview(overviewPayload({ generatedAt: undefined })),
    ).toThrow(/generatedAt/)
    expect(() =>
      parseOperationalOverview(overviewPayload({ generatedAt: 'ayer' })),
    ).toThrow(/generatedAt/)
  })

  it('rechaza analystRegistry ausente', () => {
    expect(() =>
      parseOperationalOverview(overviewPayload({ analystRegistry: undefined })),
    ).toThrow(/analystRegistry/)
    expect(() =>
      parseOperationalOverview(
        overviewPayload({
          analystRegistry: { status: 'ESTABLE', activeProblemsCount: 0 },
        }),
      ),
    ).toThrow(/analystRegistry.criticalCount/)
  })

  it('no devuelve nunca un overview parcial: o parsea entero o lanza', () => {
    let parsed: unknown = 'no asignado'
    try {
      parsed = parseOperationalOverview(
        overviewPayload({ coordinations: [coordinationPayload({ color: 5 })] }),
      )
    } catch {
      // esperado
    }
    expect(parsed).toBe('no asignado')
  })
})

/** Parsea un overview con UNA coordinación y devuelve su `lifePoints`. */
function lifePointsOf(coordination: Record<string, unknown>): number | null {
  return parseOperationalOverview(
    overviewPayload({ coordinations: [coordination] }),
  ).coordinations[0].lifePoints
}

describe('parseLifePoints · valores válidos', () => {
  it('acepta todos los enteros de 0 a 10 tal cual, sin redondear ni saturar', () => {
    expect(MAX_LIFE_POINTS).toBe(10)
    for (let value = 0; value <= 10; value += 1) {
      expect(parseLifePoints(value)).toBe(value)
    }
  })

  it('los valores representativos llegan intactos a la coordinación parseada', () => {
    for (const value of [0, 1, 5, 9, 10]) {
      expect(lifePointsOf(coordinationPayload({ lifePoints: value }))).toBe(
        value,
      )
    }
  })

  it('null explícito del backend (snapshot no interpretable) se conserva como null', () => {
    expect(parseLifePoints(null)).toBeNull()
    expect(lifePointsOf(coordinationPayload({ lifePoints: null }))).toBeNull()
  })
})

describe('parseLifePoints · degradación a null', () => {
  it('campo ausente (backend anterior) → null, nunca 10', () => {
    const payload = coordinationPayload()
    expect(payload).not.toHaveProperty('lifePoints')
    expect(lifePointsOf(payload)).toBeNull()
  })

  it('fuera de rango → null, sin clamp a 0 ni a 10', () => {
    for (const value of [-1, 11, 100, -0.5]) {
      expect(parseLifePoints(value)).toBeNull()
      expect(lifePointsOf(coordinationPayload({ lifePoints: value }))).toBeNull()
    }
  })

  it('decimal → null, sin redondear', () => {
    for (const value of [1.5, 9.99, 0.1]) {
      expect(parseLifePoints(value)).toBeNull()
    }
    expect(lifePointsOf(coordinationPayload({ lifePoints: 1.5 }))).toBeNull()
  })

  it('tipos no numéricos → null, sin coerción', () => {
    for (const value of ['7', '', true, false, {}, [], [7], undefined]) {
      expect(parseLifePoints(value)).toBeNull()
    }
    expect(lifePointsOf(coordinationPayload({ lifePoints: '7' }))).toBeNull()
  })

  it('NaN e Infinity → null', () => {
    for (const value of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]) {
      expect(parseLifePoints(value)).toBeNull()
      expect(lifePointsOf(coordinationPayload({ lifePoints: value }))).toBeNull()
    }
  })
})

describe('parseOperationalOverview · lifePoints no es estructural', () => {
  it('un lifePoints inválido NO tumba el overview ni altera los demás campos', () => {
    const coordinations = [
      coordinationPayload({
        id: '00000000-0000-0000-0000-000000000001',
        code: 'coord-a',
        displayOrder: 1,
        status: 'CRITICO',
        activeProblemsCount: 6,
        criticalCount: 2,
        affectedCoordinationCount: 3,
        incomingDependencyCount: 1,
        lifePoints: 'roto',
      }),
      coordinationPayload({
        id: '00000000-0000-0000-0000-000000000002',
        code: 'coord-b',
        displayOrder: 2,
        lifePoints: 7,
      }),
    ]

    const overview = parseOperationalOverview(overviewPayload({ coordinations }))

    expect(overview.directionStatus).toBe('CRITICO')
    expect(overview.totals).toEqual({ critical: 7, alert: 1, stable: 7 })
    expect(overview.analystRegistry).not.toHaveProperty('lifePoints')
    expect(overview.coordinations).toEqual([
      {
        id: '00000000-0000-0000-0000-000000000001',
        code: 'coord-a',
        name: 'Coordinación General',
        shortName: 'General',
        color: '#28C8F4',
        displayOrder: 1,
        status: 'CRITICO',
        activeProblemsCount: 6,
        criticalCount: 2,
        affectedCoordinationCount: 3,
        incomingDependencyCount: 1,
        lifePoints: null,
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        code: 'coord-b',
        name: 'Coordinación General',
        shortName: 'General',
        color: '#28C8F4',
        displayOrder: 2,
        status: 'ESTABLE',
        activeProblemsCount: 0,
        criticalCount: 0,
        affectedCoordinationCount: 0,
        incomingDependencyCount: 0,
        lifePoints: 7,
      },
    ])
  })

  it('cada coordinación degrada su lifePoints por separado', () => {
    const overview = parseOperationalOverview(
      overviewPayload({
        coordinations: [
          coordinationPayload({ code: 'coord-a', lifePoints: 11 }),
          coordinationPayload({ code: 'coord-b', lifePoints: 4 }),
          coordinationPayload({ code: 'coord-c' }),
        ],
      }),
    )
    expect(overview.coordinations.map((item) => item.lifePoints)).toEqual([
      null,
      4,
      null,
    ])
  })
})
