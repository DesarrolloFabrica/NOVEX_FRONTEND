import type { SVGProps } from 'react'

export type OmegaIconName =
  | 'activity'
  | 'alert'
  | 'arrow-up-right'
  | 'calendar'
  | 'check'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'clock'
  | 'download'
  | 'file'
  | 'grid'
  | 'help'
  | 'log-out'
  | 'plus'
  | 'search'
  | 'settings'
  | 'shield'
  | 'sparkles'
  | 'user'
  | 'users'
  | 'x'

const PATHS: Record<OmegaIconName, React.ReactNode> = {
  activity: <path d="M3.5 12h3l2-6 3.3 12 2.2-7h6.5" />,
  alert: (
    <>
      <path d="m12 3.5 8.5 15H3.5L12 3.5Z" />
      <path d="M12 9v4M12 16.2v.1" />
    </>
  ),
  'arrow-up-right': <path d="M7 17 17 7M9 7h8v8" />,
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14" rx="2" />
      <path d="M8 3.5v4M16 3.5v4M4 9.5h16" />
    </>
  ),
  check: <path d="m5 12.5 4.2 4.2L19 7" />,
  'chevron-down': <path d="m7 9 5 5 5-5" />,
  'chevron-left': <path d="m14 7-5 5 5 5" />,
  'chevron-right': <path d="m10 7 5 5-5 5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v4.5l3 1.5" />
    </>
  ),
  download: <path d="M12 4v10M8 10l4 4 4-4M5 19h14" />,
  file: (
    <>
      <path d="M6 3.5h8l4 4v13H6z" />
      <path d="M14 3.5v4h4M9 12h6M9 15.5h5" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.8 9.2a2.4 2.4 0 0 1 4.7.7c0 1.8-2.5 2.1-2.5 4M12 17.4v.1" />
    </>
  ),
  'log-out': <path d="M10 5H5v14h5M14 8l4 4-4 4M9 12h9" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  settings: (
    <>
      <path d="m12 3 1.2 2.2 2.5.6 2.1-1.1 1.5 1.5-1.1 2.1.6 2.5L21 12l-2.2 1.2-.6 2.5 1.1 2.1-1.5 1.5-2.1-1.1-2.5.6L12 21l-1.2-2.2-2.5-.6-2.1 1.1-1.5-1.5 1.1-2.1-.6-2.5L3 12l2.2-1.2.6-2.5-1.1-2.1 1.5-1.5 2.1 1.1 2.5-.6L12 3Z" />
      <circle cx="12" cy="12" r="2.7" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 19 6v5.1c0 4.3-2.6 7.5-7 9.4-4.4-1.9-7-5.1-7-9.4V6l7-2.5Z" />
      <path d="m8.7 12.2 2.1 2.1 4.5-4.5" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.2 5.8L19 10l-5.8 1.2L12 17l-1.2-5.8L5 10l5.8-1.2L12 3ZM19 15l.6 2.4L22 18l-2.4.6L19 21l-.6-2.4L16 18l2.4-.6L19 15Z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3" />
      <path d="M5.5 20c.7-3.2 2.8-4.8 6.5-4.8s5.8 1.6 6.5 4.8" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="2.6" />
      <path d="M3.8 19c.6-2.6 2.3-3.9 5.2-3.9" />
      <circle cx="16" cy="8.5" r="2.2" />
      <path d="M12.8 19c.5-2.2 2-3.4 4.4-3.4 2.3 0 3.9 1.2 4.4 3.4" />
    </>
  ),
  x: <path d="M7 7l10 10M17 7 7 17" />,
}

export function OmegaIcon({
  name,
  size = 16,
  strokeWidth = 1.7,
  ...props
}: { name: OmegaIconName; size?: number; strokeWidth?: number } & Omit<
  SVGProps<SVGSVGElement>,
  'name'
>) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...props}
    >
      {PATHS[name]}
    </svg>
  )
}
