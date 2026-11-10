import type { ReactNode, SVGProps } from 'react'

/**
 * Iconos de línea del Centro Operacional.
 *
 * Sustituyen a los emojis de los paneles: un emoji cambia de dibujo según el
 * sistema operativo y no hereda el color de la tinta del ticket. Estos trazos
 * usan `currentColor`, así que cada panel decide su tono desde CSS.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function LineIcon({
  size = 18,
  children,
  ...rest
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconBarChart = (p: IconProps) => (
  <LineIcon {...p}>
    <path d="M5 20V12" />
    <path d="M10 20V6" />
    <path d="M15 20v-9" />
    <path d="M20 20V9" />
  </LineIcon>
)

export const IconCheckCircle = (p: IconProps) => (
  <LineIcon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.5 2.8 2.8L16.5 9.5" />
  </LineIcon>
)

export const IconTarget = (p: IconProps) => (
  <LineIcon {...p}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <circle cx="12" cy="12" r="3.2" />
  </LineIcon>
)

export const IconInfo = (p: IconProps) => (
  <LineIcon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 7.6v.2" />
  </LineIcon>
)

export const IconDocument = (p: IconProps) => (
  <LineIcon {...p}>
    <path d="M7 3h7l4 4v14H7z" />
    <path d="M14 3v4h4" />
    <path d="M10 12h5" />
    <path d="M10 16h5" />
  </LineIcon>
)

export const IconLayers = (p: IconProps) => (
  <LineIcon {...p}>
    <path d="m12 3 9 5-9 5-9-5z" />
    <path d="m3 12.5 9 5 9-5" />
    <path d="m3 17 9 5 9-5" />
  </LineIcon>
)

export const IconSwap = (p: IconProps) => (
  <LineIcon {...p}>
    <path d="M4 8h14" />
    <path d="m15 4 4 4-4 4" />
    <path d="M20 16H6" />
    <path d="m9 12-4 4 4 4" />
  </LineIcon>
)

export const IconClipboard = (p: IconProps) => (
  <LineIcon {...p}>
    <rect x="5" y="4.5" width="14" height="17" rx="2" />
    <path d="M9 3h6v3H9z" />
    <path d="M9 11h6" />
    <path d="M9 14.5h6" />
    <path d="M9 18h4" />
  </LineIcon>
)

export const IconGear = (p: IconProps) => (
  <LineIcon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </LineIcon>
)

export const IconBook = (p: IconProps) => (
  <LineIcon {...p}>
    <path d="M3 5.5c3-1.2 6-1.2 9 .8 3-2 6-2 9-.8V19c-3-1.2-6-1.2-9 .8-3-2-6-2-9-.8z" />
    <path d="M12 6.3v13.5" />
  </LineIcon>
)

export const IconCrown = (p: IconProps) => (
  <LineIcon {...p}>
    <path d="M3.5 8 8 12l4-6 4 6 4.5-4-2 10h-13z" />
    <path d="M5.5 21h13" />
  </LineIcon>
)

export const IconPen = (p: IconProps) => (
  <LineIcon {...p}>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
    <path d="m13.5 6.5 4 4" />
  </LineIcon>
)

export const IconSearch = (p: IconProps) => (
  <LineIcon {...p}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m20 20-4.8-4.8" />
  </LineIcon>
)

export const IconChevronLeft = (p: IconProps) => (
  <LineIcon {...p}>
    <path d="m14.5 6-6 6 6 6" />
  </LineIcon>
)

export const IconChevronRight = (p: IconProps) => (
  <LineIcon {...p}>
    <path d="m9.5 6 6 6-6 6" />
  </LineIcon>
)

export const IconBan = (p: IconProps) => (
  <LineIcon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m5.7 5.7 12.6 12.6" />
  </LineIcon>
)
