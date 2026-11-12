import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))

function layoutSource(file: string): string {
  return readFileSync(resolve(here, file), 'utf8')
}

function shellSource(file: string): string {
  return readFileSync(resolve(here, '../shells', file), 'utf8')
}

describe('aislamiento de shells de otros roles', () => {
  it('ANALISTA sigue montando DeckOperationalLayout', () => {
    const source = shellSource('AnalystOperationalShell.tsx')
    expect(source).toContain('DeckOperationalLayout')
    expect(source).toContain("experience=\"analyst\"")
    expect(source).not.toContain('DirectorDirectionLayout')
    expect(source).not.toContain('DirectorOperationalLayout')
    expect(source).not.toContain('useDirectorDirectionKpi')
  })

  it('ADMIN sigue montando DeckOperationalLayout', () => {
    const source = shellSource('AdminOperationalShell.tsx')
    expect(source).toContain('DeckOperationalLayout')
    expect(source).toContain("experience=\"admin\"")
    expect(source).not.toContain('DirectorDirectionLayout')
  })

  it('COORDINADOR sigue montando CoordinatorOperationalLayout', () => {
    const source = shellSource('CoordinatorOperationalShell.tsx')
    expect(source).toContain('CoordinatorOperationalLayout')
    expect(source).not.toContain('DirectorDirectionLayout')
    expect(source).not.toContain('DeckOperationalLayout')
  })

  it('DIRECTOR monta DirectorOperationalLayout con baraja y KPI, no la tabla home', () => {
    const source = shellSource('DirectorOperationalShell.tsx')
    expect(source).toContain('DirectorOperationalLayout')
    expect(source).toContain('useOperationalShellModel')
    expect(source).toContain('useDirectorKpi')
    expect(source).not.toContain('DirectorDirectionLayout')
    expect(source).not.toContain('DeckOperationalLayout')
  })

  it('DirectorOperationalLayout reutiliza baraja y problemas; no monta action panel', () => {
    const source = layoutSource('DirectorOperationalLayout.tsx')
    expect(source).toContain('OperationalCardExperience')
    expect(source).toContain('DirectorProblemPanel')
    expect(source).toContain('AdminKpiDashboard')
    expect(source).not.toContain(
      "from '@/modules/operational-cards/components/OperationalActionPanel'",
    )
    expect(source).not.toContain('MyReportsPanel')
    expect(source).not.toContain('DirectorDirectionView')
  })
})
