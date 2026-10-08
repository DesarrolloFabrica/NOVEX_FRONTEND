import type { AnalysisPeriod } from '@/modules/operational-cards/domain/analysis-period'
import '@/styles/director-kpi-panel.css'

/**
 * APRENDIZAJES (placeholder). Ya recibe el AnalysisPeriod común para que el
 * componente futuro no nazca con otro sistema temporal.
 *
 * Intención: aprendizajes de situaciones CERRADAS durante el periodo
 * (situation_resolutions.learning de situaciones con closed_at ∈ periodo).
 * Sin endpoint todavía: no consulta datos.
 */
export function DirectorAprendizajesPanel({
  coordinationId,
  analysisPeriod,
}: {
  coordinationId: string | null
  analysisPeriod: AnalysisPeriod
}) {
  return (
    <div
      className="director-aprendizajes director-reading__placeholder"
      data-testid="director-reading-aprendizajes"
      data-coordination={coordinationId ?? ''}
      data-period-kind={analysisPeriod.kind}
      data-period-from={analysisPeriod.from}
      data-period-to={analysisPeriod.to}
    >
      <p className="director-block__title">Últimos aprendizajes</p>
      <p>
        Aprendizajes registrados al cerrar situaciones. Cada entrada
        mostrará categoría, fecha de cierre y extracto — sin barras.
      </p>
      <p className="director-internos__hint">
        Filtro previsto: Todos · Internet · Aplicativos · …
      </p>
      <p className="director-reading__phase-note">
        Diseño preparado · datos en la siguiente fase
      </p>
    </div>
  )
}
