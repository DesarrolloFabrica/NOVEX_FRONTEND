import { describe, expect, it } from 'vitest'
import * as operationalCards from '@/modules/operational-cards'
import type {
  AnalystRegistryOverview,
  CoordinationOverview,
  OperationalOverview,
} from '@/modules/operational-cards/types/operational-overview.contract'

function coordinationRow(
  overrides: Partial<CoordinationOverview> = {},
): CoordinationOverview {
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

const EMPTY_ANALYST_REGISTRY: AnalystRegistryOverview = {
  status: 'ESTABLE',
  activeProblemsCount: 0,
  criticalCount: 0,
  affectedCoordinationCount: 0,
}

const CRITICAL_ANALYST_REGISTRY: AnalystRegistryOverview = {
  status: 'CRITICO',
  activeProblemsCount: 1,
  criticalCount: 1,
  affectedCoordinationCount: 0,
}

/** 15 coordinaciones estables, tal como llegará el LEVEL 0 en reposo. */
function overview(
  analystRegistry: AnalystRegistryOverview = EMPTY_ANALYST_REGISTRY,
): OperationalOverview {
  const coordinations = Array.from({ length: 15 }, (_unused, index) =>
    coordinationRow({
      id: `00000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`,
      code: `coord-${index + 1}`,
      displayOrder: index + 1,
    }),
  )

  return {
    directionStatus: 'ESTABLE',
    generatedAt: '2026-09-02T12:00:00.000Z',
    totals: { critical: 0, alert: 0, stable: 15 },
    coordinations,
    analystRegistry,
  }
}

describe('LEVEL 0 contract · registro de analista', () => {
  it('analystRegistry vive en la raíz del overview', () => {
    expect(overview()).toHaveProperty('analystRegistry')
    expect(Object.keys(overview())).toEqual([
      'directionStatus',
      'generatedAt',
      'totals',
      'coordinations',
      'analystRegistry',
    ])
  })

  it('analystRegistry NO está dentro de coordinations[]', () => {
    for (const coordination of overview().coordinations) {
      expect(coordination).not.toHaveProperty('analystRegistry')
    }
    expect(
      overview().coordinations.some(
        (coordination) => coordination.code === 'analyst-registry',
      ),
    ).toBe(false)
  })

  it('no es una carta: no altera el número de coordinaciones', () => {
    expect(overview(EMPTY_ANALYST_REGISTRY).coordinations).toHaveLength(15)
    expect(overview(CRITICAL_ANALYST_REGISTRY).coordinations).toHaveLength(15)
  })

  it('no suma en totals, que describen solo las coordinaciones', () => {
    const withCritical = overview(CRITICAL_ANALYST_REGISTRY)
    expect(withCritical.totals).toEqual({ critical: 0, alert: 0, stable: 15 })
    const { critical, alert, stable } = withCritical.totals
    expect(critical + alert + stable).toBe(withCritical.coordinations.length)
    expect(withCritical.analystRegistry.criticalCount).toBe(1)
  })

  it('expone solo los cuatro campos congelados', () => {
    expect(Object.keys(EMPTY_ANALYST_REGISTRY)).toEqual([
      'status',
      'activeProblemsCount',
      'criticalCount',
      'affectedCoordinationCount',
    ])
    for (const field of [
      'highCount',
      'mediumCount',
      'lowCount',
      'violations',
      'triggeredCriticalRules',
      'unknownCoordinationsCount',
    ]) {
      expect(CRITICAL_ANALYST_REGISTRY).not.toHaveProperty(field)
    }
  })

  it('cero problemas activos es la condición de no mostrar nada', () => {
    // Decisión congelada; la UI llega en una fase posterior.
    expect(EMPTY_ANALYST_REGISTRY.activeProblemsCount).toBe(0)
    expect(CRITICAL_ANALYST_REGISTRY.activeProblemsCount).toBeGreaterThan(0)
  })
})

describe('LEVEL 0 contract · identificadores', () => {
  it('las filas del overview llevan uuid en id y el code institucional aparte', () => {
    const row = coordinationRow()
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(row.code).toBe('coord-general')
  })

  it('ninguna coordinación expone desglose de severidades ni metadata interna', () => {
    expect(Object.keys(coordinationRow())).toEqual([
      'id',
      'code',
      'name',
      'shortName',
      'color',
      'displayOrder',
      'status',
      'activeProblemsCount',
      'criticalCount',
      'affectedCoordinationCount',
    ])
  })
})

describe('operational-cards · sin lógica de integridad duplicada', () => {
  it('el módulo solo exporta identidad visual, parseo de estado y el default del personaje', () => {
    // Guarda explícita: si alguien añade aquí una función que calcule
    // ESTABLE/ALERTA/CRITICO, este test falla. El backend es la autoridad.
    // Todo lo exportado es identidad visual, transporte, parseo de contrato,
    // estado de carga o presentación. Ninguna calcula integridad.
    expect(Object.keys(operationalCards).sort()).toEqual([
      'DEFAULT_CHARACTER_PRESENTATION',
      'OPERATIONAL_INTEGRITY_STATUSES',
      'OperationalCardExperience',
      'OperationalOverviewContractError',
      'fetchOperationalOverview',
      'getCoordinationVisualIdentities',
      'getCoordinationVisualIdentity',
      'isOperationalIntegrityStatus',
      'parseOperationalIntegrityStatus',
      'parseOperationalOverview',
      'resolveCoordinationVisualIdentity',
      'useOperationalOverview',
    ])
  })
})
