export function AnalysisEmptyState() {
  return (
    <section
      className="cunmark-analysis-state cunmark-analysis-state--empty space-y-3"
      aria-live="polite"
    >
      <header className="space-y-1">
        <h2 className="text-sm font-semibold tracking-tight text-slate-800">
          Análisis no disponible
        </h2>
        <p className="text-[0.8rem] leading-relaxed text-slate-500">
          Aún no hay un análisis de IA para esta situación. El expediente se
          conservó correctamente.
        </p>
      </header>
    </section>
  )
}
