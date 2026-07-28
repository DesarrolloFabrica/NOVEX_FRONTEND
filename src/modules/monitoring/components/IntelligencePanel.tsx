import type { ExecutionAction } from '@/modules/execution-actions/types/execution-action.types'
import { CunmarkIcon } from '@/shared/components/CunmarkIcon'

export function IntelligencePanel({ action, onOpenAnalysis }: { action: ExecutionAction | null; onOpenAnalysis: () => void }) {
  if (!action) {
    return <aside className="cunmark-action-outcome cunmark-action-outcome--empty"><CunmarkIcon name="sparkles" size={24} /><h2>Resumen ejecutivo IA</h2><p>Selecciona una situación para consultar su lectura ejecutiva.</p></aside>
  }
  const items = [
    ['Riesgo actual', action.riskIfNotExecuted],
    ['Impacto principal', action.expectedImpact.indicatorToImprove],
    ['Consecuencia si continúa', action.riskIfNotExecuted],
    ['Beneficio esperado', action.expectedImpact.benefitExpected],
  ] as const
  return <aside className="cunmark-action-outcome"><header><CunmarkIcon name="sparkles" size={20} /><div><p>ANÁLISIS IA</p><h2>Resumen ejecutivo IA</h2></div></header><dl>{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><button type="button" className="cunmark-action-outcome__cta" onClick={onOpenAnalysis}>Ver análisis ejecutivo IA</button></aside>
}
