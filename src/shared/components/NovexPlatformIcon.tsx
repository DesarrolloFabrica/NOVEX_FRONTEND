import type { ReactNode } from 'react'
import type { PlatformNavIcon } from '@/shared/constants/platformNavigation'

/**
 * Iconografía de la navegación de plataforma.
 *
 * Extraído de `NovexSystemRail` en R2 sin cambiar ni un path: el carril
 * vertical y el menú compacto del Centro Operacional pintan exactamente los
 * mismos glifos, así que el mismo enlace se reconoce en las dos superficies.
 */

const PATHS: Record<PlatformNavIcon, ReactNode> = {
  intelligence: (
    <>
      <path d="M12 3.25 19.2 7.4v8.3L12 19.85 4.8 15.7V7.4L12 3.25Z" />
      <path d="m8.7 9.1 3.3-2 3.3 2v3.8l-3.3 2-3.3-2V9.1Z" />
    </>
  ),
  impact: (
    <>
      <path d="M12 4.75v4M5.25 8.25l3.65 2.1M18.75 8.25l-3.65 2.1M5.25 15.75l3.65-2.1M18.75 15.75l-3.65-2.1M12 15.25v4" />
      <circle cx="12" cy="12" r="3.25" />
      <circle cx="12" cy="3.5" r="1.25" />
      <circle cx="4.5" cy="7.75" r="1.25" />
      <circle cx="19.5" cy="7.75" r="1.25" />
      <circle cx="4.5" cy="16.25" r="1.25" />
      <circle cx="19.5" cy="16.25" r="1.25" />
      <circle cx="12" cy="20.5" r="1.25" />
    </>
  ),
  events: (
    <>
      <path d="M5 4.5h14v15H5z" />
      <path d="M8 8h5M8 12h8M8 16h6" />
      <path d="M16.75 6.25v3.5M15 8h3.5" />
    </>
  ),
  monitoring: (
    <>
      <path d="M4 18.5V11h4v7.5M10 18.5V5.5h4v13M16 18.5V8h4v10.5" />
      <path d="M3 20h18" />
    </>
  ),
  admin: (
    <>
      <path d="M4.5 6.5h15v12h-15z" />
      <path d="M8 10h3M8 14h5M16.5 9.5v5" />
    </>
  ),
  command: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4v2M12 18v2M4 12h2M18 12h2" />
    </>
  ),
  logout: (
    <>
      <path d="M10 5H5v14h5M14 8l4 4-4 4M9 12h9" />
    </>
  ),
  grid: (
    <>
      <path d="M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z" />
    </>
  ),
}

export function NovexPlatformIcon({ name }: { name: PlatformNavIcon }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </svg>
  )
}
