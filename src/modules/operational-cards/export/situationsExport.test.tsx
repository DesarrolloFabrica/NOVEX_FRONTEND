// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseContentDispositionFilename } from '@/shared/api/http'
import {
  buildSituationsExportQuery,
  fallbackExportFilename,
  type SituationsExportOptions,
} from './situationsExport.api'
import { SituationsExportDialog } from './SituationsExportDialog'
import { canExportSituations } from './exportAccess'

const ALL: SituationsExportOptions = {
  coordinationIds: [],
  statuses: ['OPEN', 'IN_PROGRESS'],
  severities: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
  reportKinds: ['INTERNAL', 'INTER_COORDINATION'],
  sheets: ['summary', 'situations', 'consequences', 'related'],
}

describe('buildSituationsExportQuery', () => {
  it('sin filtros parciales no envía parámetros', () => {
    expect(buildSituationsExportQuery(ALL)).toBe('')
  })

  it('envía solo los filtros que acotan', () => {
    const query = buildSituationsExportQuery({
      ...ALL,
      coordinationIds: ['c-1', 'c-2'],
      severities: ['CRITICAL'],
      sheets: ['summary'],
    })
    const params = new URLSearchParams(query.slice(1))
    expect(params.get('coordinationIds')).toBe('c-1,c-2')
    expect(params.get('severities')).toBe('CRITICAL')
    expect(params.get('statuses')).toBeNull()
    expect(params.get('reportKinds')).toBeNull()
    expect(params.get('sheets')).toBe('situations,summary')
  })
})

describe('nombre del archivo', () => {
  it('lee Content-Disposition simple y codificado', () => {
    expect(
      parseContentDispositionFilename('attachment; filename="NOVEX_x.xlsx"'),
    ).toBe('NOVEX_x.xlsx')
    expect(
      parseContentDispositionFilename("attachment; filename*=UTF-8''Situaci%C3%B3n.xlsx"),
    ).toBe('Situación.xlsx')
    expect(parseContentDispositionFilename(null)).toBeNull()
  })

  it('tiene un nombre de respaldo con fecha y hora', () => {
    expect(fallbackExportFilename(new Date(2026, 10, 18, 8, 5))).toBe(
      'NOVEX_situaciones_activas_2026-11-18_0805.xlsx',
    )
  })
})

describe('canExportSituations', () => {
  const user = (roleCode: string, permissions = ['SITUATIONS_VIEW']) => ({
    roleCode,
    permissions,
  })

  it('ofrece la exportación a ADMIN, DIRECTOR y ANALISTA', () => {
    expect(canExportSituations(user('ADMIN') as never)).toBe(true)
    expect(canExportSituations(user('DIRECTOR') as never)).toBe(true)
    expect(canExportSituations(user('ANALISTA') as never)).toBe(true)
  })

  it('no la ofrece al COORDINADOR ni sin SITUATIONS_VIEW', () => {
    expect(canExportSituations(user('COORDINADOR') as never)).toBe(false)
    expect(canExportSituations(user('ADMIN', []) as never)).toBe(false)
    expect(canExportSituations(null)).toBe(false)
  })
})

describe('SituationsExportDialog', () => {
  let container: HTMLDivElement
  let root: Root

  const coordinations = [
    { id: 'c-b', name: 'Bienestar', activeCount: 4 },
    { id: 'c-a', name: 'Académica', activeCount: 3 },
  ]

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  function render(props: Partial<Parameters<typeof SituationsExportDialog>[0]> = {}) {
    const onDownload = vi.fn()
    const onClose = vi.fn()
    act(() => {
      root.render(
        <SituationsExportDialog
          coordinations={coordinations}
          observedCoordinationId="c-a"
          isDownloading={false}
          error={null}
          onClose={onClose}
          onDownload={onDownload}
          {...props}
        />,
      )
    })
    const q = <T extends Element>(selector: string) =>
      document.body.querySelector<T>(selector) as T
    return { onDownload, onClose, q }
  }

  it('descarga todo por defecto y muestra el total activo', () => {
    const { onDownload, q } = render()
    expect(q('[data-testid="situations-export-estimate"]').textContent).toContain('7')
    act(() => q<HTMLButtonElement>('[data-testid="situations-export-submit"]').click())
    expect(onDownload).toHaveBeenCalledWith({
      coordinationIds: [],
      statuses: ['OPEN', 'IN_PROGRESS'],
      severities: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      reportKinds: ['INTERNAL', 'INTER_COORDINATION'],
      sheets: ['situations', 'summary', 'consequences', 'related'],
    })
  })

  it('al elegir coordinaciones propone la observada y respeta los filtros', () => {
    const { onDownload, q } = render()
    act(() => q<HTMLInputElement>('[data-testid="export-coordinations-pick"]').click())
    expect(q<HTMLInputElement>('[data-testid="export-coordination-c-a"]').checked).toBe(true)
    act(() => q<HTMLInputElement>('[data-testid="export-severity-LOW"]').click())
    act(() => q<HTMLInputElement>('[data-testid="export-sheet-related"]').click())
    act(() => q<HTMLButtonElement>('[data-testid="situations-export-submit"]').click())
    expect(onDownload).toHaveBeenCalledWith(
      expect.objectContaining({
        coordinationIds: ['c-a'],
        severities: ['CRITICAL', 'HIGH', 'MEDIUM'],
        sheets: ['situations', 'summary', 'consequences'],
      }),
    )
  })

  it('no permite descargar sin estado elegido', () => {
    const { onDownload, q } = render()
    act(() => q<HTMLInputElement>('[data-testid="export-status-OPEN"]').click())
    act(() => q<HTMLInputElement>('[data-testid="export-status-IN_PROGRESS"]').click())
    const submit = q<HTMLButtonElement>('[data-testid="situations-export-submit"]')
    expect(submit.disabled).toBe(true)
    expect(q('[data-testid="situations-export-estimate"]').textContent).toContain(
      'al menos un estado',
    )
    act(() => submit.click())
    expect(onDownload).not.toHaveBeenCalled()
  })

  it('muestra el error del servidor y bloquea el cierre mientras genera', () => {
    const { onClose, q } = render({ isDownloading: true, error: null })
    expect(q<HTMLButtonElement>('[data-testid="situations-export-close"]').disabled).toBe(true)
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(onClose).not.toHaveBeenCalled()

    render({ error: 'Su rol no tiene permiso para exportar situaciones.' })
    expect(q('[role="alert"]').textContent).toContain('permiso')
  })
})

describe('SituationsExportDialog sin resumen de la mesa', () => {
  it('no afirma «0 situaciones» ni permite elegir coordinaciones', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    act(() => {
      root.render(
        <SituationsExportDialog
          coordinations={[]}
          isDownloading={false}
          error={null}
          onClose={vi.fn()}
          onDownload={vi.fn()}
        />,
      )
    })
    const estimate = document.body.querySelector('[data-testid="situations-export-estimate"]')
    expect(estimate?.textContent).toContain('todas las situaciones activas')
    expect(
      document.body.querySelector<HTMLInputElement>('[data-testid="export-coordinations-pick"]')
        ?.disabled,
    ).toBe(true)
    act(() => root.unmount())
    container.remove()
  })
})
