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
  const directorBlock = shellCss.slice(
    shellCss.indexOf(".operational-shell[data-shell-layout='director']"),
    shellCss.indexOf('.operational-shell__region--director-kpi,'),
  )

  it('variante analítica: Lectura ≈50 %, baraja algo más baja, carta seleccionada destacada', () => {
    expect(directorBlock).toContain('--shell-action-w: 50%')
    expect(directorBlock).toContain('minmax(300px, 2.35fr) minmax(170px, 1fr)')
    expect(directorBlock).toContain('minmax(0, 0.365fr) minmax(0, 0.635fr)')
    expect(directorBlock).toContain('clamp(112px, 8.6vw, 172px)')
    expect(directorBlock).toContain('--selected-scale: 1.08')
    // Problemas compactos (títulos a una línea), siempre bajo el scope DIRECTOR.
    expect(directorBlock).toContain('.operational-shell__region--coordination-problems')
  })

  it('todo selector de la variante está bajo data-shell-layout=director', () => {
    const rules = directorBlock
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('}')
      .map((rule) => rule.split('{')[0].trim())
      .filter(Boolean)
    expect(rules.length).toBeGreaterThan(4)
    for (const selector of rules) {
      expect(selector.startsWith(".operational-shell[data-shell-layout='director']")).toBe(true)
    }
  })

  it('ANALISTA/ADMIN conservan su rejilla base (panel de acción 30 %)', () => {
    const base = shellCss.slice(shellCss.indexOf("[data-shell-layout='director-direction']"))
    expect(base).toMatch(/--shell-action-w:\s*30%/)
    expect(base).not.toContain('--shell-action-w: 50%')
  })
})
