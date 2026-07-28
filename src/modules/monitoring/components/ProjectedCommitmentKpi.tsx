// Compromiso priorizado — lectura ejecutiva compacta sobre el cristal.

import { INTEL_BODY, INTEL_EMPTY } from '@/modules/monitoring/constants/visualHierarchy'

interface ProjectedCommitmentKpiProps {
  title: string | null
}

export function ProjectedCommitmentKpi({ title }: ProjectedCommitmentKpiProps) {
  if (!title) {
    return (
      <div className="cunmark-subpanel projected-commitment-card is-empty flex items-start gap-2.5 border">
        <span
          aria-hidden="true"
          className="mt-0.5 h-8 w-0.5 shrink-0 rounded-full bg-slate-300"
        />
        <p className={INTEL_EMPTY}>Sin compromiso priorizado</p>
      </div>
    )
  }

  return (
    <div className="cunmark-subpanel projected-commitment-card is-active relative overflow-hidden border">
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-0.5 bg-emerald-500/70"
      />
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-800/80">
        Próximo en validación
      </p>
      <p className={`mt-1.5 line-clamp-3 leading-snug ${INTEL_BODY}`}>{title}</p>
      <svg
        viewBox="0 0 48 8"
        className="mt-2.5 h-1.5 w-full text-emerald-400/55"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <line x1="0" y1="4" x2="44" y2="4" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" />
        <circle cx="46" cy="4" r="1.5" fill="currentColor" />
      </svg>
    </div>
  )
}
