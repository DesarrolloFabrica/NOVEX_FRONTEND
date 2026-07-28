import type { SituationDossier } from '@/modules/api/types/situation-management.types'
import { CunmarkIcon } from '@/shared/components/CunmarkIcon'
import {
  formatManagementDate,
  SITUATION_SEVERITY_LABEL,
} from '@/modules/monitoring/utils/situation-management.presentation'

interface SituationIntelligencePanelProps {
  dossier: SituationDossier | null
  loading: boolean
  onOpenAnalysis: () => void
}

function formatConfidence(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `${Math.round(value * 100)}%`
}

export function SituationIntelligencePanel({
  dossier,
  loading,
  onOpenAnalysis,
}: SituationIntelligencePanelProps) {
  if (loading) {
    return (
      <aside className="cunmark-action-outcome cunmark-action-outcome--empty">
        <CunmarkIcon name="sparkles" size={24} />
        <h2>Resumen ejecutivo IA</h2>
        <p>Cargando análisis…</p>
      </aside>
    )
  }

  if (!dossier) {
    return (
      <aside className="cunmark-action-outcome cunmark-action-outcome--empty">
        <CunmarkIcon name="sparkles" size={24} />
        <h2>Resumen ejecutivo IA</h2>
        <p>Selecciona una situación para consultar su lectura ejecutiva.</p>
      </aside>
    )
  }

  const analysis = dossier.analysis?.analysis

  if (!analysis) {
    return (
      <aside className="cunmark-action-outcome cunmark-action-outcome--empty">
        <CunmarkIcon name="sparkles" size={24} />
        <h2>Resumen ejecutivo IA</h2>
        <p>Esta situación aún no tiene un análisis IA disponible.</p>
      </aside>
    )
  }

  const items = [
    ['Resumen ejecutivo', analysis.executiveSummary.summary],
    ...(analysis.executiveNarrative
      ? [['Lectura ejecutiva', analysis.executiveNarrative] as const]
      : []),
    ...(analysis.executivePriority
      ? [
          [
            'Prioridad',
            `${analysis.executivePriority.level}: ${analysis.executivePriority.justification}`,
          ] as const,
        ]
      : []),
    ['Impacto principal', dossier.impact?.summary ?? analysis.impactAssessment.summary],
    ['Conclusión', analysis.executiveConclusion.conclusion],
    ['Confianza', formatConfidence(analysis.confidence.overall)],
    [
      'Última versión',
      dossier.analysis ? `v${dossier.analysis.analysisVersion}` : '—',
    ],
    [
      'Fecha del análisis',
      formatManagementDate(analysis.analyzedAt),
    ],
  ] as const

  return (
    <aside className="cunmark-action-outcome">
      <header>
        <CunmarkIcon name="sparkles" size={20} />
        <div>
          <p>ANÁLISIS IA</p>
          <h2>Resumen ejecutivo IA</h2>
        </div>
      </header>
      <dl>
        {items.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="cunmark-action-outcome__meta">
        Severidad IA:{' '}
        {SITUATION_SEVERITY_LABEL[analysis.incidentClassification.operationalSeverity] ??
          analysis.incidentClassification.operationalSeverity}
      </p>
      <button
        type="button"
        className="cunmark-action-outcome__cta"
        onClick={onOpenAnalysis}
      >
        Ver análisis ejecutivo IA
      </button>
    </aside>
  )
}
