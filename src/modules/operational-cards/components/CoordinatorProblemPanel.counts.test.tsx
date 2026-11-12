import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CoordinatorProblemPanel } from '@/modules/operational-cards/components/CoordinatorProblemPanel'
import type { CoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import type {
  CoordinationProblem,
  OperationalCardsLevel1State,
} from '@/modules/operational-cards/types/operational-cards.state'

/**
 * Fase 01B.2 · K-03. La cabecera del panel del coordinador usa los conteos
 * oficiales del backend (los de la carta y la integridad), no los recalcula
 * sobre la lista, y nombra aparte lo que AFECTA al área sin sumarlo.
 */
const OWN = 'coord-ingenierias'

const coordination = {
  id: '00000000-0000-4000-8000-000000000007',
  code: OWN,
  name: 'Ingenierías',
  shortName: 'Ingenierías',
  color: '#335577',
  displayOrder: 1,
  status: 'ALERTA',
  activeProblemsCount: 4,
  criticalCount: 1,
  affectedCoordinationCount: 0,
  incomingDependencyCount: 3,
  lifePoints: 8,
} as CoordinationOverview

const identity = {
  code: OWN,
  uuid: coordination.id,
  name: 'Ingenierías',
  shortName: 'Ingenierías',
  displayOrder: 1,
  color: '#335577',
  iconAsset: 'x',
  islandAsset: 'x',
} as CoordinationVisualIdentity

function problem(
  id: string,
  overrides: Partial<CoordinationProblem>,
): CoordinationProblem {
  return {
    id,
    title: id,
    severity: 'CRITICAL',
    status: 'OPEN',
    createdAt: '2026-11-01T10:00:00.000Z',
    reportKind: 'INTERNAL',
    coordinationCode: OWN,
    affectedCoordinationCode: null,
    ...overrides,
  } as CoordinationProblem
}

/** Lista PARCIAL (own-only): 2 propios y 3 que afectan, todos críticos. */
const level1: OperationalCardsLevel1State = {
  status: 'ready',
  coordinationCode: OWN as never,
  scope: 'own-only',
  errorMessage: null,
  problems: [
    problem('own-1', {}),
    problem('own-2', {}),
    ...['in-1', 'in-2', 'in-3'].map((id) =>
      problem(id, {
        reportKind: 'INTER_COORDINATION',
        coordinationCode: 'coord-otra',
        affectedCoordinationCode: OWN,
      }),
    ),
  ],
}

function summaryText(html: string): string {
  const match = html.match(/data-testid="coordination-summary"[^>]*>([^<]*(?:<!-- -->[^<]*)*)</)
  return (match?.[1] ?? '').replace(/<!-- -->/g, '')
}

describe('CoordinatorProblemPanel · conteos oficiales (K-03)', () => {
  it('la cabecera usa activeProblemsCount y criticalCount del backend', () => {
    const html = renderToStaticMarkup(
      <CoordinatorProblemPanel
        coordination={coordination}
        identity={identity}
        level1={level1}
        labelByCode={{}}
      />,
    )
    const summary = summaryText(html)

    expect(summary).toContain('4 situaciones activas')
    expect(summary).toContain('1 crítica')
    expect(summary).toContain('3 dependencias externas afectan mi área')
    // Antes: 2 + 3 = 5 activas y 5 críticas contadas sobre la lista.
    expect(summary).not.toContain('5 situaciones activas')
    expect(summary).not.toContain('5 críticas')
  })
})
