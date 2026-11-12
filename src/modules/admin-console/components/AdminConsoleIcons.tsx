import type { SVGProps } from 'react'

/**
 * Iconos de la consola que no existen en `NovexIcon`. Mismo lenguaje: trazo
 * redondeado, `currentColor`, caja 24×24. Decorativos: `aria-hidden`.
 */
export type AdminIconName =
  | 'layers'
  | 'org'
  | 'globe'
  | 'filter'
  | 'more'
  | 'sort'
  | 'sort-asc'
  | 'sort-desc'
  | 'gear'
  | 'refresh'
  | 'check-circle'
  | 'trend'
  | 'minus'
  | 'key'

const PATHS: Record<AdminIconName, React.ReactNode> = {
  layers: (
    <>
      <path d="m12 3.5 8.5 4.5-8.5 4.5L3.5 8 12 3.5Z" />
      <path d="m3.5 12 8.5 4.5 8.5-4.5" />
      <path d="m3.5 16 8.5 4.5 8.5-4.5" />
    </>
  ),
  org: (
    <>
      <rect x="9" y="3.5" width="6" height="5" rx="1.2" />
      <rect x="3.5" y="15.5" width="6" height="5" rx="1.2" />
      <rect x="14.5" y="15.5" width="6" height="5" rx="1.2" />
      <path d="M12 8.5v3.5M6.5 15.5V12h11v3.5" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.2-3.6-8.5S9.6 5.9 12 3.5Z" />
    </>
  ),
  filter: <path d="M4 5.5h16l-6.2 7.3v5.7l-3.6 1.9v-7.6L4 5.5Z" />,
  more: (
    <>
      <circle cx="6" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  sort: <path d="m8 9.5 4-4 4 4M8 14.5l4 4 4-4" />,
  'sort-asc': <path d="m8 13 4-4 4 4" />,
  'sort-desc': <path d="m8 11 4 4 4-4" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" />
      <circle cx="12" cy="12" r="6.6" />
    </>
  ),
  refresh: (
    <>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.5 4.5v4h-4" />
    </>
  ),
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.3 12.2 2.5 2.5 4.9-5.2" />
    </>
  ),
  trend: <path d="M4 16.5 9.5 11l3.5 3.5L20 7.5M15 7.5h5v5" />,
  minus: <path d="M5.5 12h13" />,
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 8.5-8.5M16.5 6.5l2 2M14 9l2 2" />
    </>
  ),
}

export function AdminIcon({
  name,
  size = 18,
  strokeWidth = 1.7,
  ...props
}: { name: AdminIconName; size?: number; strokeWidth?: number } & Omit<
  SVGProps<SVGSVGElement>,
  'name'
>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {PATHS[name]}
    </svg>
  )
}
