export function OperationalAnimationSlot() {
  return (
    <section
      className="operational-animation-slot relative min-h-0 min-w-0 overflow-hidden rounded-sm border border-slate-400/30 bg-white/24"
      aria-label="Visualización operativa reservada"
    >
      <header className="absolute inset-x-3 top-3 z-10 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
          Visualización operativa
        </p>
        <span className="font-mono text-[9px] tracking-[0.12em] text-slate-500">
          VIS-01
        </span>
      </header>

      <div className="absolute inset-3 top-9" aria-hidden="true">
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-500/12" />
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-slate-500/12" />
        <span className="absolute left-0 top-0 h-2.5 w-2.5 border-l border-t border-slate-500/30" />
        <span className="absolute right-0 top-0 h-2.5 w-2.5 border-r border-t border-slate-500/30" />
        <span className="absolute bottom-0 left-0 h-2.5 w-2.5 border-b border-l border-slate-500/30" />
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 border-b border-r border-slate-500/30" />
        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-500/45 bg-white/55" />
      </div>

      <p className="absolute inset-x-3 bottom-3 text-center text-[10px] font-medium tracking-wide text-slate-500">
        Módulo interactivo
      </p>
    </section>
  )
}
