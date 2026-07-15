// Compromiso priorizado — lectura ejecutiva compacta sobre el cristal.

import { INTEL_BODY, INTEL_EMPTY } from '@/modules/monitoring/constants/visualHierarchy'

interface ProjectedCommitmentKpiProps {
  title: string | null
}

export function ProjectedCommitmentKpi({ title }: ProjectedCommitmentKpiProps) {
  if (!title) {
    return (
      <div className="flex items-start gap-2.5 rounded-sm border border-dashed border-slate-300/70 bg-slate-50/40 px-2.5 py-2.5">
        <span
          aria-hidden="true"
          className="mt-0.5 h-8 w-0.5 shrink-0 rounded-full bg-slate-300"
        />
        <p className={INTEL_EMPTY}>Sin compromiso priorizado</p>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-sm border border-slate-200/80 bg-gradient-to-r from-indigo-50/50 via-white to-white px-2.5 py-2.5">
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-0.5 bg-indigo-500/70"
      />
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-indigo-800/80">
        Próximo en validación
      </p>
      <p className={`mt-1.5 line-clamp-3 leading-snug ${INTEL_BODY}`}>{title}</p>
      <svg
        viewBox="0 0 48 8"
        className="mt-2.5 h-1.5 w-full text-indigo-400/55"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <line x1="0" y1="4" x2="44" y2="4" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" />
        <circle cx="46" cy="4" r="1.5" fill="currentColor" />
      </svg>
    </div>
  )
}
