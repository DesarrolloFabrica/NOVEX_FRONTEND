import { NovexIcon } from '@/shared/components/NovexIcon'
import type { IslandAffectedBriefing } from './island-focus.selectors'

interface IslandFocusAffectedPanelProps {
  briefing: IslandAffectedBriefing
}

export function IslandFocusAffectedPanel({
  briefing,
}: IslandFocusAffectedPanelProps) {
  return (
    <div className="island-focus-panel island-focus-panel--affected">
      <div className="island-focus-panel__scroll">
        <section className="island-focus-panel__block">
          <h3>Por qué está afectada</h3>
          <p>{briefing.reason}</p>
        </section>

        <section className="island-focus-panel__block">
          <h3>Cadena de propagación</h3>
          <p>{briefing.propagationChain}</p>
        </section>

        <section className="island-focus-panel__block">
          <h3>Dependencias involucradas</h3>
          {briefing.dependencies.length > 0 ? (
            <ul>
              {briefing.dependencies.map((dependency) => (
                <li key={dependency}>{dependency}</li>
              ))}
            </ul>
          ) : (
            <p className="island-focus-panel__empty">
              Sin dependencias específicas para esta área en el análisis
              disponible.
            </p>
          )}
        </section>

        <section className="island-focus-panel__block">
          <h3>Acción sugerida para esta área</h3>
          {briefing.suggestedActions.length > 0 ? (
            <ol className="island-focus-panel__actions">
              {briefing.suggestedActions.map((action, index) => (
                <li key={`${action.action}-${index}`}>
                  <strong>{action.action}</strong>
                  <p>{action.reason}</p>
                  <span>
                    <NovexIcon name="clock" size={11} strokeWidth={1.8} />
                    {action.recommendedTime}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="island-focus-panel__empty">
              Sin acciones recomendadas asignadas a esta coordinación.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
