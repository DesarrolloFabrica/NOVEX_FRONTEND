// Microdetalle geométrico de identidad por área (solo presentación).
// Sin iconos externos — geometría mínima institucional.

import type { AreaGlyphVariant } from '@/modules/monitoring/constants/areaIdentity'

interface AreaIdentityGlyphProps {
  variant: AreaGlyphVariant
}

/** Marca geométrica grabada detrás del monograma. */
export function AreaIdentityGlyph({ variant }: AreaIdentityGlyphProps) {
  switch (variant) {
    case 'global':
      return (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-1 rounded-full border border-slate-600/35"
        >
          <span className="absolute inset-[3px] rounded-full border border-slate-600/20" />
        </span>
      )
    case 'academic':
      return (
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-2 bottom-1.5 top-2">
          <span className="absolute left-0 right-0 top-0 h-px bg-slate-500/32" />
          <span className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-slate-500/24" />
          <span className="absolute bottom-0 left-0 right-0 h-px bg-slate-500/32" />
        </span>
      )
    case 'factory':
      return (
        <span aria-hidden="true" className="pointer-events-none absolute inset-2 grid grid-cols-2 grid-rows-2 gap-px">
          <span className="border border-slate-500/18" />
          <span className="border border-slate-500/18" />
          <span className="border border-slate-500/18" />
          <span className="border border-slate-500/18" />
        </span>
      )
    case 'innovation':
      return (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-2 rotate-45 border-l border-slate-600/28"
        />
      )
    case 'b2b':
      return (
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-2 top-1/2 -translate-y-1/2">
          <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-slate-500/20" />
          <span className="absolute left-0 top-1/2 h-0.5 w-0.5 -translate-y-1/2 rounded-full bg-slate-500/28" />
          <span className="absolute right-0 top-1/2 h-0.5 w-0.5 -translate-y-1/2 rounded-full bg-slate-500/28" />
        </span>
      )
    case 'service':
      return (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-2 bottom-1.5 top-2 rounded-t-full border border-b-0 border-slate-600/28"
        />
      )
    case 'assessment':
      return (
        <span aria-hidden="true" className="pointer-events-none absolute inset-2">
          <span className="absolute bottom-1 left-1 h-2 w-px origin-bottom rotate-[38deg] bg-slate-500/36" />
          <span className="absolute bottom-1 left-1 h-1.5 w-px origin-bottom -rotate-[52deg] bg-slate-500/36" />
        </span>
      )
    case 'social':
      return (
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-1.5 bottom-1 h-3 overflow-hidden">
          <span className="absolute inset-x-0 bottom-0 h-2 rounded-t-full border border-b-0 border-slate-600/22" />
          <span className="absolute inset-x-1 bottom-0 h-1.5 rounded-t-full border border-b-0 border-slate-600/16" />
        </span>
      )
    case 'professional':
      return (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-2 bottom-1.5 flex items-end justify-between gap-0.5"
        >
          <span className="h-1 w-px bg-slate-500/34" />
          <span className="h-1.5 w-px bg-slate-500/38" />
          <span className="h-2 w-px bg-slate-500/42" />
        </span>
      )
  }
}

interface AreaModuleMonogramProps {
  monogram: string
  glyph: AreaGlyphVariant
  isGlobal: boolean
  /** Tamaño del icono — selector (Sprint 11.1) o legacy. */
  size?: 'default' | 'selector'
  /** Clases de tono (reposo o estado activo). */
  className?: string
}

/** Monograma con microdetalle de identidad de área. */
export function AreaModuleMonogram({
  monogram,
  glyph,
  isGlobal,
  size = 'default',
  className = '',
}: AreaModuleMonogramProps) {
  const sizeClass =
    size === 'selector'
      ? 'h-[3rem] w-[3rem] text-[13px] font-semibold'
      : 'h-9 w-9 text-[10px] font-semibold'

  return (
    <span
      className={`relative flex items-center justify-center font-mono tracking-wide transition-all duration-300 ease-out ${sizeClass} ${className} ${isGlobal ? 'rounded-full' : ''}`}
    >
      <AreaIdentityGlyph variant={glyph} />
      <span className="relative z-10">{monogram}</span>
    </span>
  )
}
