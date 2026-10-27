import { describe, expect, it } from 'vitest'
import {
  formatDossierFolio,
  isDossierClosedStatus,
  resolveDossierCoordinationColor,
  resolveDossierSlaNotice,
  resolveDossierStubStyle,
  resolveDossierTypeBadge,
} from '@/modules/operational-cards/data/problemDossier'

describe('problemDossier helpers', () => {
  it('folio ornamental toma los últimos caracteres del id', () => {
    expect(formatDossierFolio('sit-abcd-1234')).toBe('Nº 1234')
    expect(formatDossierFolio('a1')).toBe('Nº A1')
  })

  it('SLA solo avisa en riesgo o vencido', () => {
    expect(resolveDossierSlaNotice('on_track')).toBeNull()
    expect(resolveDossierSlaNotice('closed')).toBeNull()
    expect(resolveDossierSlaNotice(undefined)).toBeNull()
    expect(resolveDossierSlaNotice('at_risk')).toEqual({
      tone: 'at_risk',
      label: 'SLA en riesgo',
    })
    expect(resolveDossierSlaNotice('overdue')).toEqual({
      tone: 'overdue',
      label: 'SLA vencido',
    })
  })

  it('detecta cierre de historial', () => {
    expect(isDossierClosedStatus('CLOSED')).toBe(true)
    expect(isDossierClosedStatus('OPEN')).toBe(false)
  })

  it('distingue Interno y Dependencia', () => {
    expect(resolveDossierTypeBadge('INTERNAL')).toEqual({
      key: 'internal',
      label: 'Interno',
    })
    expect(resolveDossierTypeBadge('INTER_COORDINATION')).toEqual({
      key: 'dependency',
      label: 'Dependencia',
    })
  })

  it('resuelve color de coordinación desde el catálogo de islas', () => {
    const b2b = resolveDossierCoordinationColor('coord-b2b')
    const saber = resolveDossierCoordinationColor('coord-saber-pro')
    expect(b2b).toMatch(/^#[0-9a-f]{6}$/)
    expect(saber).toMatch(/^#[0-9a-f]{6}$/)
    expect(b2b).not.toBe(saber)
    expect(resolveDossierCoordinationColor(null)).toBeNull()
  })

  it('elige tinta legible sobre el talón', () => {
    const light = resolveDossierStubStyle('#f5e6c8')
    expect(light.background).toBe('#f5e6c8')
    expect(light.ink).toBe('#1a1410')

    const dark = resolveDossierStubStyle('#1a4a5c')
    expect(dark.background).toBe('#1a4a5c')
    expect(dark.ink).toBe('#fff8ef')

    const missing = resolveDossierStubStyle(null)
    expect(missing.background).toBeNull()
  })
})
