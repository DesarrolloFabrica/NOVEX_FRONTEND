export function AnalysisLoadingState() {
  return (
    <section
      className="cunmark-analysis-state cunmark-analysis-state--loading space-y-4"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="cunmark-analysis-state__spinner" aria-hidden="true" />
      <header className="space-y-1 text-center">
        <h2 className="text-sm font-semibold tracking-tight text-slate-800">
          Analizando situación…
        </h2>
        <p className="text-[0.8rem] leading-relaxed text-slate-500">
          La IA está procesando el expediente. Este paso puede tardar unos
          segundos.
        </p>
      </header>
    </section>
  )
}
