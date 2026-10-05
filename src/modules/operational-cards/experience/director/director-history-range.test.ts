import { describe, expect, it } from 'vitest'
import { buildDefaultHistoryRange } from '@/modules/operational-cards/utils/kpi-history-range'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const shellCss = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../../styles/operational-shell.css',
  ),
  'utf8',
)

describe('buildDefaultHistoryRange', () => {
  it('semana ancla en lunes Bogotá hacia atrás', () => {
    // 2026-01-21 es miércoles Bogotá
    const range = buildDefaultHistoryRange(
      'week',
      new Date('2026-01-21T15:00:00.000Z'),
    )
    expect(range.to).toBe('2026-01-21')
    expect(range.from).toBe('2025-11-03')
  })

  it('ciclo cubre H1/H2 recientes', () => {
    const range = buildDefaultHistoryRange(
      'cycle',
      new Date('2026-03-10T15:00:00.000Z'),
    )
    expect(range.from).toBe('2025-07-01')
    expect(range.to).toBe('2026-03-10')
  })
})

describe('layout DIRECTOR', () => {
  it('ensancha lectura y acota baraja/cartas sin tocar ANALISTA', () => {
    expect(shellCss).toContain(
      ".operational-shell[data-shell-layout='director']",
    )
    expect(shellCss).toMatch(/--shell-action-w:\s*38%/)
    expect(shellCss).toContain('minmax(300px, 1.95fr) minmax(170px, 1fr)')
    expect(shellCss).toContain('clamp(140px, 9.6vw, 188px)')
    const directorBlock = shellCss.slice(
      shellCss.indexOf("[data-shell-layout='director']"),
      shellCss.indexOf("[data-shell-layout='director-direction']"),
    )
    expect(directorBlock).toContain('--shell-action-w: 38%')
  })
})
