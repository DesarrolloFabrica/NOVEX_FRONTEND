import { describe, expect, it } from 'vitest'
import {
  buildProblemRowAccessibleName,
  resolveCoordinationMarkAsset,
  resolveProblemMark,
} from '@/modules/operational-cards/data/coordinationMark'

/**
 * Marca lateral de las filas de problema: qué coordinación representa, con qué
 * logo y cómo se dice en texto. La regla central: si no se sabe con seguridad,
 * marca NEUTRA; nunca el logo de Coordinación General ni de otra.
 */

const GENERAL_ICON = '/iconos/display/IconoCoordGeneral.jpg'

const LABELS = {
  'coord-saber-pro': 'Saber Pro',
  'coord-fabrica-contenidos': 'Fábrica de Contenidos',
  'coord-especializaciones': 'Especializaciones',
  'coord-homologaciones': 'Servicio',
  'coord-servicios': 'Servicios',
}

describe('resolveCoordinationMarkAsset', () => {
  it('devuelve el logo propio de un code del catálogo', () => {
    expect(resolveCoordinationMarkAsset('coord-fabrica-contenidos')).toBe(
      '/iconos/display/IconoFabrica.png',
    )
  })

  it('respeta el artCode: Homologaciones se presenta con el logo de Servicio', () => {
    expect(resolveCoordinationMarkAsset('coord-homologaciones')).toBe(
      '/iconos/display/IconoServicios.jpg',
    )
  })

  it('un code cuyo arte exhibe otra carta queda neutro (coord-servicios)', () => {
    expect(resolveCoordinationMarkAsset('coord-servicios')).toBeNull()
  })

  it('code desconocido o ausente: null, nunca el logo de General', () => {
    for (const code of ['coord-social-lab', 'coord-inexistente', '', null, undefined]) {
      const asset = resolveCoordinationMarkAsset(code)
      expect(asset).toBeNull()
      expect(asset).not.toBe(GENERAL_ICON)
    }
  })
})

describe('resolveProblemMark', () => {
  it('interno: la coordinación responsable, con su nombre visible', () => {
    const mark = resolveProblemMark({
      reportKind: 'INTERNAL',
      coordinationCode: 'coord-especializaciones',
      affectedCoordinationCode: 'coord-especializaciones',
      viewpointCode: 'coord-especializaciones',
      labelByCode: LABELS,
    })
    expect(mark.code).toBe('coord-especializaciones')
    expect(mark.asset).toBe('/iconos/display/IconoEspecializaciones.png')
    expect(mark.relation).toBe('internal')
    expect(mark.originLine).toBe('Problema interno · Especializaciones')
  })

  it('dependencia vista desde la AFECTADA: representa a la responsable', () => {
    const mark = resolveProblemMark({
      reportKind: 'INTER_COORDINATION',
      coordinationCode: 'coord-fabrica-contenidos',
      affectedCoordinationCode: 'coord-saber-pro',
      viewpointCode: 'coord-saber-pro',
      labelByCode: LABELS,
    })
    expect(mark.code).toBe('coord-fabrica-contenidos')
    expect(mark.asset).toBe('/iconos/display/IconoFabrica.png')
    expect(mark.relation).toBe('affects-us')
    expect(mark.kindLabel).toBe('Dependencia que nos afecta')
    expect(mark.originLine).toBe('Nos afecta desde Fábrica de Contenidos')
    expect(mark.roleLabel).toBe('Coordinación responsable')
  })

  it('dependencia vista desde la RESPONSABLE: representa a la afectada', () => {
    const mark = resolveProblemMark({
      reportKind: 'INTER_COORDINATION',
      coordinationCode: 'coord-fabrica-contenidos',
      affectedCoordinationCode: 'coord-saber-pro',
      viewpointCode: 'coord-fabrica-contenidos',
      labelByCode: LABELS,
    })
    expect(mark.code).toBe('coord-saber-pro')
    expect(mark.asset).toBe('/iconos/display/IconoSaberPro.jpg')
    expect(mark.relation).toBe('we-resolve')
    expect(mark.originLine).toBe('Debemos resolver para Saber Pro')
    expect(mark.roleLabel).toBe('Coordinación afectada')
  })

  it('«Mis reportes» (sin punto de vista): dependencia → la responsable', () => {
    const mark = resolveProblemMark({
      reportKind: 'INTER_COORDINATION',
      coordinationCode: 'coord-fabrica-contenidos',
      affectedCoordinationCode: 'coord-saber-pro',
      viewpointCode: null,
      labelByCode: LABELS,
    })
    expect(mark.code).toBe('coord-fabrica-contenidos')
    expect(mark.relation).toBe('responsible')
    expect(mark.originLine).toBe(
      'Afectada: Saber Pro · Responsable: Fábrica de Contenidos',
    )
  })

  it('carta consultada ajena a las dos partes: neutra, sin adivinar', () => {
    const mark = resolveProblemMark({
      reportKind: 'INTER_COORDINATION',
      coordinationCode: 'coord-fabrica-contenidos',
      affectedCoordinationCode: 'coord-saber-pro',
      viewpointCode: 'coord-b2b',
      labelByCode: LABELS,
    })
    expect(mark.code).toBeNull()
    expect(mark.asset).toBeNull()
    expect(mark.relation).toBe('unresolved')
  })

  it('dependencia sin afectada vista desde la responsable: neutra', () => {
    const mark = resolveProblemMark({
      reportKind: 'INTER_COORDINATION',
      coordinationCode: 'coord-fabrica-contenidos',
      affectedCoordinationCode: null,
      viewpointCode: 'coord-fabrica-contenidos',
    })
    expect(mark.asset).toBeNull()
    expect(mark.relation).toBe('unresolved')
  })

  it('code desconocido: marca neutra, pero el nombre del DTO sigue visible', () => {
    const mark = resolveProblemMark({
      reportKind: 'INTERNAL',
      coordinationCode: 'coord-social-lab',
      affectedCoordinationCode: 'coord-social-lab',
      viewpointCode: null,
      coordinationName: 'Social Lab',
    })
    expect(mark.code).toBe('coord-social-lab')
    expect(mark.asset).toBeNull()
    expect(mark.originLine).toBe('Problema interno · Social Lab')
  })

  it('code desconocido y sin nombre: lo declara, no lo atribuye', () => {
    const mark = resolveProblemMark({
      reportKind: 'INTERNAL',
      coordinationCode: 'coord-inexistente',
      affectedCoordinationCode: 'coord-inexistente',
      viewpointCode: null,
    })
    expect(mark.asset).toBeNull()
    expect(mark.originLine).toBe('Problema interno · coordinación no identificada')
  })

  it('histórico de analista sin coordinación: «Sin coordinación», neutra', () => {
    const mark = resolveProblemMark({
      reportKind: 'INTERNAL',
      coordinationCode: null,
      affectedCoordinationCode: null,
      viewpointCode: null,
    })
    expect(mark.asset).toBeNull()
    expect(mark.originLine).toBe('Problema interno · Sin coordinación')
    expect(mark.roleLabel).toBeNull()
  })

  it('reportKind ausente se trata como interno', () => {
    const mark = resolveProblemMark({
      reportKind: undefined,
      coordinationCode: 'coord-saber-pro',
      affectedCoordinationCode: 'coord-saber-pro',
      viewpointCode: 'coord-saber-pro',
      labelByCode: LABELS,
    })
    expect(mark.relation).toBe('internal')
  })
})

describe('buildProblemRowAccessibleName', () => {
  it('incluye título, tipo, coordinación representada, gravedad y estado', () => {
    const mark = resolveProblemMark({
      reportKind: 'INTER_COORDINATION',
      coordinationCode: 'coord-fabrica-contenidos',
      affectedCoordinationCode: 'coord-saber-pro',
      viewpointCode: 'coord-saber-pro',
      labelByCode: LABELS,
    })
    expect(
      buildProblemRowAccessibleName({
        title: 'Guiones pendientes',
        mark,
        severityLabel: 'Alta',
        statusLabel: 'Abierto',
      }),
    ).toBe(
      'Guiones pendientes. Dependencia que nos afecta. Coordinación responsable: Fábrica de Contenidos. Severidad Alta. Abierto.',
    )
  })

  it('sin coordinación resoluble lo dice en el nombre accesible', () => {
    const mark = resolveProblemMark({
      reportKind: 'INTERNAL',
      coordinationCode: null,
      affectedCoordinationCode: null,
      viewpointCode: null,
    })
    expect(
      buildProblemRowAccessibleName({
        title: 'X',
        mark,
        severityLabel: 'Baja',
        statusLabel: 'Cerrado',
      }),
    ).toBe('X. Problema interno. Sin coordinación. Severidad Baja. Cerrado.')
  })
})
