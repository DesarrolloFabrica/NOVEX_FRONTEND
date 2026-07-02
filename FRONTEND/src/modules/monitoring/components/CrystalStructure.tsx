// Primitivas arquitectónicas del Cristal Maestro (solo presentación).
// Sprint 7.3: estación de trabajo unificada — retícula, canales y reglas continuas.
// Sprint 10.5C: sobreimpresión cromática de estado en tema claro.

import type { ReactNode } from 'react'
import type { OperationalRoomVisual } from '@/modules/monitoring/constants/operationalRoomState'
import { CRYSTAL_STATE_TRANSITION } from '@/modules/monitoring/constants/ambientLighting'
import {
  CRYSTAL_CORNER_MACHINED_LIGHT,
  CRYSTAL_CORNER_MACHINED_SHADOW,
  CRYSTAL_CHAMFER_CLIP,
  CRYSTAL_CHAMFER_CLIP_INNER,
  CRYSTAL_EXTERIOR_BEVEL,
  CRYSTAL_FACE_PLANE_RELIEF,
  CRYSTAL_GROOVE_BED,
  CRYSTAL_GROOVE_LIP,
  CRYSTAL_GROOVE_SHADOW,
  CRYSTAL_INNER_CAVITY_SHADOW,
  CRYSTAL_INNER_REVEAL_LINE,
  CRYSTAL_SLAB_THICKNESS,
} from '@/modules/monitoring/constants/crystalMaterial'
import {
  INK_REGISTRY_TICK,
  INK_TECHNICAL_RULE_H,
  INK_TECHNICAL_RULE_V,
  WORKSTATION_LATTICE_GRID,
  WORKSTATION_MODULE_CONSOLE_CHANNEL,
} from '@/modules/monitoring/constants/materialTheme'

/** Retícula y regla superior de la estación — una sola losa tecnológica. */
export function CrystalWorkstationLattice() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden="true">
      <div className={`absolute inset-0 opacity-65 ${WORKSTATION_LATTICE_GRID}`} />
      <CrystalWorkstationTransverseRule className="absolute inset-x-0 top-0" />
    </div>
  )
}

/** Regla horizontal continua — atraviesa toda la estación con marcas de retícula. */
export function CrystalWorkstationTransverseRule({
  className = '',
}: {
  className?: string
}) {
  return (
    <div className={`relative h-px w-full shrink-0 ${className}`} aria-hidden="true">
      <div className={`absolute inset-x-0 top-0 h-px ${INK_TECHNICAL_RULE_H}`} />
      <span
        className={`absolute left-3 top-0 h-1.5 w-px -translate-y-1/2 ${INK_REGISTRY_TICK} sm:left-5`}
      />
      <span
        className={`absolute right-3 top-0 h-1.5 w-px -translate-y-1/2 ${INK_REGISTRY_TICK} sm:right-5`}
      />
      <span
        className={`absolute left-[15rem] top-0 hidden h-2 w-px -translate-y-1/2 ${INK_REGISTRY_TICK} lg:block xl:left-[16.5rem] 2xl:left-[18rem]`}
      />
      <span
        className={`absolute right-[15rem] top-0 hidden h-2 w-px -translate-y-1/2 ${INK_REGISTRY_TICK} lg:block xl:right-[16.5rem] 2xl:right-[18rem]`}
      />
    </div>
  )
}

/** Canal mecanizado entre módulos y consola — transición continua. */
export function CrystalModuleConsoleChannel() {
  return (
    <div className="relative shrink-0 px-0" aria-hidden="true">
      <div className={WORKSTATION_MODULE_CONSOLE_CHANNEL} />
      <span
        className={`absolute left-4 top-0 h-2 w-px -translate-y-1/2 ${INK_REGISTRY_TICK} sm:left-5`}
      />
      <span
        className={`absolute right-4 top-0 h-2 w-px -translate-y-1/2 ${INK_REGISTRY_TICK} sm:right-5`}
      />
    </div>
  )
}

/** Bracket de encabezado — vincula título con la arquitectura de la placa. */
export function CrystalStationHeaderBracket() {
  return (
    <span
      aria-hidden="true"
      className="relative flex h-3.5 w-3 shrink-0 items-stretch"
    >
      <span className={`absolute left-0 top-0 h-full w-px ${INK_TECHNICAL_RULE_V}`} />
      <span className={`absolute left-0 top-0 h-px w-full ${INK_TECHNICAL_RULE_H}`} />
      <span className={`absolute bottom-0 left-0 h-1.5 w-px ${INK_REGISTRY_TICK}`} />
    </span>
  )
}

/** Regla horizontal de retícula técnica — trazo de ingeniería. */
export function CrystalStructuralRule({
  className = '',
  accentClass,
}: {
  className?: string
  accentClass?: string
}) {
  return (
    <div
      className={`relative h-px w-full shrink-0 ${className}`}
      aria-hidden="true"
    >
      <div className={`absolute inset-x-0 top-0 h-px ${INK_TECHNICAL_RULE_H}`} />
      {accentClass ? (
        <div
          className={`absolute inset-x-0 top-0 h-px opacity-80 ${CRYSTAL_STATE_TRANSITION} ${accentClass}`}
        />
      ) : null}
      <span
        className={`absolute left-3 top-0 h-1.5 w-px -translate-y-1/2 ${INK_REGISTRY_TICK} sm:left-5`}
      />
      <span
        className={`absolute right-3 top-0 h-1.5 w-px -translate-y-1/2 ${INK_REGISTRY_TICK} sm:right-5`}
      />
    </div>
  )
}

/** Surco entre filas de expediente dentro de la consola. */
export function CrystalExpedienteGroove() {
  return (
    <div
      className="pointer-events-none absolute inset-x-4 top-0 sm:inset-x-5"
      aria-hidden="true"
    >
      <CrystalStructuralRule />
    </div>
  )
}

/** Riel superior del cristal: acento ambiental + bisel de losa en el material. */
export function CrystalTopRail({
  accentClass,
  structuralAccentClass,
}: {
  accentClass?: string
  structuralAccentClass?: string
}) {
  return (
    <div className="relative z-[1] h-[3px] w-full shrink-0" aria-hidden="true">
      {accentClass ? (
        <div
          className={`absolute inset-x-0 top-0 h-px opacity-90 ${CRYSTAL_STATE_TRANSITION} ${accentClass}`}
        />
      ) : null}
      {structuralAccentClass ? (
        <div
          className={`absolute inset-x-0 top-0 h-px opacity-70 ${CRYSTAL_STATE_TRANSITION} ${structuralAccentClass}`}
        />
      ) : null}
      <div className={`absolute inset-x-0 top-0 h-px ${CRYSTAL_GROOVE_LIP}`} />
      <div className={`absolute inset-x-0 top-px h-px ${CRYSTAL_GROOVE_BED}`} />
      <div className={`absolute inset-x-0 top-[3px] h-px ${CRYSTAL_GROOVE_SHADOW}`} />
    </div>
  )
}

/** Regla vertical de retícula entre columnas apiladas (móvil). */
export function CrystalColumnGroove({ className = '' }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-0 ${className}`}
      aria-hidden="true"
    >
      <div className={`absolute inset-y-0 right-0 h-full w-px ${INK_TECHNICAL_RULE_V}`} />
      <span
        className={`absolute right-0 top-4 h-1.5 w-px ${INK_REGISTRY_TICK}`}
      />
      <span
        className={`absolute bottom-4 right-0 h-1.5 w-px ${INK_REGISTRY_TICK}`}
      />
    </div>
  )
}

/** Surco horizontal entre filas apiladas (móvil) — regla de estación completa. */
export function CrystalRowGroove({ className = '' }: { className?: string }) {
  return <CrystalWorkstationTransverseRule className={className} />
}

/** Regla vertical entre módulos operativos adyacentes. */
export function CrystalModuleGroove() {
  return (
    <div
      className="pointer-events-none absolute bottom-3 left-0 top-3 z-10 w-0"
      aria-hidden="true"
    >
      <div className={`absolute inset-y-0 left-0 w-px ${INK_TECHNICAL_RULE_V}`} />
    </div>
  )
}

/** Esquinas técnicas superiores — fresado en el material, no bordes CSS. */
export function CrystalSurfaceCorners() {
  return (
    <>
      <MachinedCorner className="left-3 top-2.5 sm:left-4" />
      <MachinedCorner className="right-3 top-2.5 scale-x-[-1] sm:right-4" />
    </>
  )
}

/**
 * Sobreimpresión cromática del estado — borde perimetral y lavado inferior (Sprint 10.5C).
 * La pantalla sigue blanca; el color contamina bordes y luz ambiental.
 */
export function CrystalStateEnvelope({ visual }: { visual: OperationalRoomVisual }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[4]" aria-hidden="true">
      <div
        className={`absolute inset-0 ${CRYSTAL_CHAMFER_CLIP} ${visual.crystalStatePerimeter} ${CRYSTAL_STATE_TRANSITION}`}
      />
      <div
        className={`absolute inset-x-0 bottom-0 h-[46%] ${CRYSTAL_CHAMFER_CLIP} ${visual.crystalStateLowerWash} ${CRYSTAL_STATE_TRANSITION}`}
      />
    </div>
  )
}

/** Regla inferior estructural con acento de estado — anclaje de la losa. */
export function CrystalBottomStateRule({
  structuralAccentClass,
}: {
  structuralAccentClass: string
}) {
  return (
    <div
      className="pointer-events-none absolute inset-x-4 bottom-2 z-[2] hidden sm:inset-x-5 lg:block"
      aria-hidden="true"
    >
      <CrystalStructuralRule
        className="absolute inset-x-6 bottom-0 opacity-60"
        accentClass={structuralAccentClass}
      />
    </div>
  )
}

/**
 * Perímetro mecanizado del cristal — tres planos (Sprint 10.5B).
 * Bisel exterior → cara frontal elevada → borde interior de superficie útil.
 * Solo capas absolutas; no altera layout ni tamaño del Cristal Maestro.
 */
export function CrystalMachinedPerimeter() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[3]" aria-hidden="true">
      <div className={`absolute inset-0 ${CRYSTAL_CHAMFER_CLIP} ${CRYSTAL_EXTERIOR_BEVEL}`} />
      <div
        className={`absolute inset-[9px] sm:inset-[10px] ${CRYSTAL_CHAMFER_CLIP_INNER} ${CRYSTAL_FACE_PLANE_RELIEF}`}
      />
      <div
        className={`absolute inset-[11px] sm:inset-[12px] ${CRYSTAL_CHAMFER_CLIP_INNER} ${CRYSTAL_INNER_REVEAL_LINE}`}
      />
      <div
        className={`absolute inset-[12px] sm:inset-[13px] ${CRYSTAL_CHAMFER_CLIP_INNER} ${CRYSTAL_INNER_CAVITY_SHADOW}`}
      />
    </div>
  )
}

function MachinedCorner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute h-3 w-3 ${className}`}
      aria-hidden="true"
    >
      <div className={`absolute inset-0 ${CRYSTAL_CORNER_MACHINED_LIGHT}`} />
      <div className={`absolute inset-0 ${CRYSTAL_CORNER_MACHINED_SHADOW}`} />
    </div>
  )
}

/** Remates inferiores del campo de estaciones (anclaje de la losa). */
export function CrystalFieldAnchors() {
  return (
    <div
      className="pointer-events-none absolute inset-x-4 bottom-2 hidden sm:inset-x-5 lg:block"
      aria-hidden="true"
    >
      <MachinedCorner className="bottom-0 left-0 scale-y-[-1]" />
      <MachinedCorner className="bottom-0 right-0 scale-x-[-1] scale-y-[-1]" />
    </div>
  )
}

/** Envoltorio de la losa: espesor físico del material. */
export function CrystalSlab({
  children,
  edgeGlowClass,
}: {
  children: ReactNode
  edgeGlowClass?: string
}) {
  return (
    <div
      className={`relative ${CRYSTAL_SLAB_THICKNESS} ${edgeGlowClass ?? ''} ${edgeGlowClass ? CRYSTAL_STATE_TRANSITION : ''}`}
    >
      {children}
    </div>
  )
}
