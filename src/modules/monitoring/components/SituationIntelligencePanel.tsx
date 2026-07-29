import { useState } from 'react'
import type { SituationDossier } from '@/modules/api/types/situation-management.types'
import { NovexIcon } from '@/shared/components/NovexIcon'
import {
  SITUATION_SEVERITY_LABEL,
} from '@/modules/monitoring/utils/situation-management.presentation'

interface SituationIntelligencePanelProps {
  dossier: SituationDossier | null
  loading: boolean
  onOpenAnalysis: () => void
}

export function SituationIntelligencePanel({
  dossier,
  loading,
  onOpenAnalysis,
}: SituationIntelligencePanelProps) {
  if (loading) {
    return (
      <aside className="novex-action-outcome novex-action-outcome--empty">
        <NovexIcon name="sparkles" size={24} />
        <h2>Resumen ejecutivo IA</h2>
        <p>Cargando análisis…</p>
      </aside>
    )
  }

  if (!dossier) {
    return (
      <aside className="novex-action-outcome novex-action-outcome--empty">
        <NovexIcon name="sparkles" size={24} />
        <h2>Resumen ejecutivo IA</h2>
        <p>Selecciona una situación para consultar su lectura ejecutiva.</p>
      </aside>
    )
  }

  const analysis = dossier.analysis?.analysis

  if (!analysis) {
    return (
      <aside className="novex-action-outcome novex-action-outcome--empty">
        <NovexIcon name="sparkles" size={24} />
        <h2>Resumen ejecutivo IA</h2>
        <p>Esta situación aún no tiene un análisis IA disponible.</p>
      </aside>
    )
  }

  const sections = [
    {
      id: 'summary',
      label: 'Resumen ejecutivo',
      content: analysis.executiveSummary.summary,
    },
    {
      id: 'impact',
      label: 'Impacto',
      content: dossier.impact?.summary ?? analysis.impactAssessment.summary,
    },
    {
      id: 'hypotheses',
      label: 'Hipótesis',
      content:
        analysis.rootCause.hypotheses
          .map((item) => item.statement)
          .join(' · ') || analysis.rootCause.summary,
    },
    {
      id: 'conclusion',
      label: 'Conclusión',
      content: analysis.executiveConclusion.conclusion,
    },
  ] as const

  return (
    <ExecutiveBrief
      sections={sections}
      severity={
        SITUATION_SEVERITY_LABEL[
          analysis.incidentClassification.operationalSeverity
        ] ?? analysis.incidentClassification.operationalSeverity
      }
      onOpenAnalysis={onOpenAnalysis}
    />
  )
}

interface ExecutiveBriefProps {
  sections: ReadonlyArray<{
    id: string
    label: string
    content: string
  }>
  severity: string
  onOpenAnalysis: () => void
}

function ExecutiveBrief({
  sections,
  severity,
  onOpenAnalysis,
}: ExecutiveBriefProps) {
  const [expanded, setExpanded] = useState('summary')

  return (
    <aside className="novex-action-outcome novex-ops-brief">
      <header>
        <NovexIcon name="sparkles" size={20} />
        <div>
          <p>IA ejecutiva</p>
          <h2>Executive Brief</h2>
        </div>
        <span>{severity}</span>
      </header>
      <div className="novex-ops-brief__accordion">
        {sections.map((section) => {
          const open = expanded === section.id
          return (
            <section key={section.id}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setExpanded(open ? '' : section.id)}
              >
                <span>{section.label}</span>
                <span aria-hidden="true">{open ? '−' : '+'}</span>
              </button>
              {open ? <p>{section.content}</p> : null}
            </section>
          )
        })}
      </div>
      <button
        type="button"
        className="novex-action-outcome__cta"
        onClick={onOpenAnalysis}
      >
        Ver análisis ejecutivo IA
      </button>
    </aside>
  )
}
